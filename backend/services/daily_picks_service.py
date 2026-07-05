"""
Daily personalized stock picks — "Picked for you today".

Builds a per-user taste profile from the stocks they already watch / own (plus
any saved quiz answers), reuses the recommendation engine's weighting + reasons,
adds a global-popularity boost, excludes stocks the user already holds, and
rotates a fresh set of 5 each day via a date+user seeded shuffle. Cold-start
users (nothing saved) get a top-rated + trending mix.

Logic lives here; the router stays thin. Per-day caching is on the user doc via
auth_service (mirrors save/get_last_recommendation).
"""
import random
import statistics
from datetime import datetime, timezone

from backend.services.recommendation_service import (
    _build_universe,
    _match_score,
    _reasons_for_pick,
    _tier_of,
)
from backend.services.db_service import load_stock_visit_counts

N_PICKS = 5           # unified with recommendation_service.N_RECOMMEND
POOL_SIZE = 25
POP_WEIGHT = 8.0      # max popularity bonus added to the 0..100 match score
SECTOR_BONUS = 6.0    # bonus when a candidate sits in a sector the user favours

# Bump whenever the pick shape or scoring logic changes — a cached doc with a
# different version is treated as stale and recomputed (no waiting for tomorrow).
PICKS_VERSION = 2


# ---------------------------------------------------------------------------
# Taste profile
# ---------------------------------------------------------------------------

def _owned_codes(user: dict) -> set[str]:
    wl = [(c or "").upper() for c in (user.get("watchlist") or [])]
    pf = [(h.get("trading_code") or "").upper() for h in (user.get("portfolio") or [])]
    return {c for c in (wl + pf) if c}


def build_taste_profile(user: dict, rows_by_code: dict,
                        mcap_terc: tuple[float, float] = (0.0, 0.0),
                        liked_codes: set[str] | None = None) -> dict:
    """Derive pseudo quiz-answers from the user's owned (and liked) stocks. Saved
    quiz answers (last_recommendation.answers) take precedence where present."""
    owned = _owned_codes(user)
    # Liked stocks count toward taste even if not owned ("up = boost only").
    taste_codes = owned | {c for c in (liked_codes or set())}
    owned_rows = [rows_by_code[c] for c in owned if c in rows_by_code]
    taste_rows = [rows_by_code[c] for c in taste_codes if c in rows_by_code]

    sectors_count: dict[str, int] = {}
    dys, vals, growths, scores, healths, mcaps = [], [], [], [], [], []
    for r in taste_rows:
        sec = (r.get("sector") or "").strip()
        if sec:
            sectors_count[sec] = sectors_count.get(sec, 0) + 1
        if r.get("div_yield_pct") is not None:
            dys.append(r["div_yield_pct"])
        if r.get("p4_val") is not None:
            vals.append(r["p4_val"])
        if r.get("eps_yoy_pct") is not None:
            growths.append(r["eps_yoy_pct"])
        if r.get("score") is not None:
            scores.append(r["score"])
        if r.get("p2_health") is not None:
            healths.append(r["p2_health"])
        if r.get("mcap_mn"):
            mcaps.append(r["mcap_mn"])

    # Defaults: leave sectors/budget unconstrained (sector affinity is a soft
    # bonus, not a hard filter), lean long/fundamental.
    answers: dict = {
        "timeline": "long",
        "strategy": "fundamental_strong",
        "sectors": [],
        "dividend": "doesnt_matter",
        "valuation": "any",
        "budget": "any",
        "risk": "balanced",
        "size": "any",
    }

    if dys and statistics.mean(dys) >= 4.0:
        answers["dividend"] = "income_focused"

    if vals and statistics.mean(vals) >= 6.0:
        answers["valuation"] = "value"
    elif growths and statistics.mean(growths) >= 12.0:
        answers["valuation"] = "growth"

    if taste_rows and scores and statistics.mean(scores) < 55:
        answers["timeline"] = "short"
        answers["strategy"] = "market_trending"

    # Risk: solid + decent score → steady; weak quality → aggressive.
    if scores and healths:
        avg_score, avg_health = statistics.mean(scores), statistics.mean(healths)
        if avg_score >= 65 and avg_health >= 7.0:
            answers["risk"] = "steady"
        elif avg_score < 50:
            answers["risk"] = "aggressive"

    # Size: average owned/liked mcap vs market terciles.
    p33, p66 = mcap_terc
    if mcaps and p66 > 0:
        avg_mcap = statistics.mean(mcaps)
        if avg_mcap >= p66:
            answers["size"] = "large"
        elif p33 and avg_mcap <= p33:
            answers["size"] = "small"

    saved = (user.get("last_recommendation") or {}).get("answers") or {}
    for k in ("timeline", "strategy", "dividend", "valuation", "budget", "risk", "size"):
        if saved.get(k):
            answers[k] = saved[k]
    if saved.get("sectors"):
        answers["sectors"] = saved["sectors"]

    sector_affinity = {s.lower() for s in sectors_count}
    return {
        "answers": answers,
        "sector_affinity": sector_affinity,
        "owned": owned,
        "owned_rows": owned_rows,
    }


# ---------------------------------------------------------------------------
# Pick assembly
# ---------------------------------------------------------------------------

def _today() -> str:
    from backend.services.auth_service import _dhaka_day
    return _dhaka_day(datetime.now(timezone.utc))


def _pick_dict(row: dict, answers: dict, match: float, personal_reason: str | None = None,
               ctx: dict | None = None) -> dict:
    score = row.get("score")
    reasons = _reasons_for_pick(row, answers, ctx)
    if personal_reason:
        reasons = [personal_reason] + [r for r in reasons if r != personal_reason]
    return {
        "trading_code": row["trading_code"],
        "company_name": row.get("company_name"),
        "sector": row.get("sector"),
        "score": score,
        "tier": _tier_of(score),
        "ltp": row.get("ltp"),
        "change_pct": row.get("change_pct"),
        "div_yield_pct": row.get("div_yield_pct"),
        "eps_yoy_pct": row.get("eps_yoy_pct"),
        "p1_biz": row.get("p1_biz"),
        "p3_moat": row.get("p3_moat"),
        "p4_val": row.get("p4_val"),
        "p5_div": row.get("p5_div"),
        "match_score": round(float(match), 1),
        "reasons": reasons[:2],
    }


# ---------------------------------------------------------------------------
# Shared scoring context (used by the daily feed and by skip-backfill)
# ---------------------------------------------------------------------------

def _prepare(user: dict) -> dict:
    """Assemble everything needed to score candidates for `user`: universe,
    taste profile (incorporating liked stocks), popularity boost, feedback."""
    from backend.services.auth_service import get_pick_feedback

    user_id = user.get("user_id")
    universe = _build_universe()
    rows = universe["rows"]
    mcap_terc = (universe["mcap_p33"], universe["mcap_p66"])
    ctx = {"mcap_p33": universe["mcap_p33"], "mcap_p66": universe["mcap_p66"]}
    rows_by_code = {r["trading_code"]: r for r in rows}

    visits = load_stock_visit_counts()
    max_visits = max(visits.values()) if visits else 0

    fb = get_pick_feedback(user_id) if user_id else {"liked": [], "disliked": []}
    liked = {c.upper() for c in fb["liked"]}
    disliked = {c.upper() for c in fb["disliked"]}

    profile = build_taste_profile(user, rows_by_code, mcap_terc, liked)
    has_signal = (
        bool(profile["owned"]) or bool(liked)
        or bool((user.get("last_recommendation") or {}).get("answers"))
    )

    def pop_boost(code: str) -> float:
        if max_visits <= 0:
            return 0.0
        return (visits.get(code, 0) / max_visits) * POP_WEIGHT

    return {
        "user_id": user_id,
        "rows": rows,
        "vol_median": universe["vol_median"],
        "mcap_terc": mcap_terc,
        "ctx": ctx,
        "profile": profile,
        "owned": profile["owned"],
        "answers": profile["answers"],
        "affinity": profile["sector_affinity"],
        "disliked": disliked,
        "has_signal": has_signal,
        "pop_boost": pop_boost,
    }


def _exclude_set(prep: dict, extra: set[str] | None = None) -> set[str]:
    ex = set(prep["owned"]) | set(prep["disliked"])
    if extra:
        ex |= {c.upper() for c in extra}
    return ex


def _personalized_scored(prep: dict, exclude: set[str]) -> list[tuple]:
    rows, answers, affinity = prep["rows"], prep["answers"], prep["affinity"]
    vol_median, mcap_terc, pop_boost = prep["vol_median"], prep["mcap_terc"], prep["pop_boost"]
    scored = []
    for r in rows:
        code = r["trading_code"]
        if code in exclude:
            continue
        score = r.get("score")
        if score is None or r.get("stale_data") or score < 45:
            continue
        base = _match_score(r, answers, vol_median, mcap_terc)
        sec = (r.get("sector") or "").strip().lower()
        bonus = SECTOR_BONUS if sec and sec in affinity else 0.0
        final = base + bonus + pop_boost(code)
        scored.append((final, base, r))
    scored.sort(key=lambda t: (-t[0], -(t[2].get("score") or 0), t[2]["trading_code"]))
    return scored


def _cold_scored(prep: dict, exclude: set[str]) -> list[dict]:
    rows, pop_boost = prep["rows"], prep["pop_boost"]
    cands = [
        r for r in rows
        if (r.get("score") or 0) >= 60 and not r.get("stale_data")
        and r["trading_code"] not in exclude
    ]

    def cold_rank(r: dict) -> float:
        chg = r.get("change_pct") or 0
        return (r.get("score") or 0) + max(0.0, chg) * 1.5 + pop_boost(r["trading_code"])

    cands.sort(key=cold_rank, reverse=True)
    return cands


def _owned_by_sector(prep: dict) -> dict[str, str]:
    out: dict[str, str] = {}
    for orow in prep["profile"]["owned_rows"]:
        sec = (orow.get("sector") or "").strip().lower()
        if sec and sec not in out:
            out[sec] = orow["trading_code"]
    return out


def _cold_pick(r: dict, prep: dict) -> dict:
    chg = r.get("change_pct")
    reason = (
        f"Trending — up {chg:.1f}% today."
        if chg and chg > 0
        else f"Top-rated stock (grade {round(r.get('score') or 0)}/100)."
    )
    return _pick_dict(r, prep["answers"], r.get("score") or 0, personal_reason=reason, ctx=prep["ctx"])


def _personal_pick(base: float, r: dict, prep: dict, owned_by_sector: dict[str, str]) -> dict:
    sec = (r.get("sector") or "").strip().lower()
    personal = None
    if sec and sec in owned_by_sector:
        personal = f"{r.get('sector')} — like {owned_by_sector[sec]} you follow."
    return _pick_dict(r, prep["answers"], base, personal_reason=personal, ctx=prep["ctx"])


# ---------------------------------------------------------------------------
# Daily feed
# ---------------------------------------------------------------------------

def compute_daily_picks(user: dict) -> dict:
    """Build today's picks for `user`. Pure — caller persists the result."""
    prep = _prepare(user)
    today = _today()
    now_iso = datetime.now(timezone.utc).isoformat()
    exclude = _exclude_set(prep)

    # "tuned" = the user actually took the quiz. Watchlist/portfolio signal makes
    # picks personalized but is NOT tuning — keep nudging them to the quiz.
    tuned = bool((user.get("last_recommendation") or {}).get("answers"))

    def _meta(personalized: bool, picks: list) -> dict:
        return {
            "date": today,
            "generated_at": now_iso,
            "v": PICKS_VERSION,
            "personalized": personalized,
            "tuned": tuned,
            "picks": picks,
        }

    seed = abs(hash(f"{today}|{prep['user_id']}")) % (2 ** 31)
    rng = random.Random(seed)

    # ---- Cold start: top-rated + trending blend ----
    if not prep["has_signal"]:
        pool = _cold_scored(prep, exclude)[:POOL_SIZE]
        rng.shuffle(pool)
        return _meta(False, [_cold_pick(r, prep) for r in pool[:N_PICKS]])

    # ---- Personalized ----
    pool = _personalized_scored(prep, exclude)[:POOL_SIZE]
    rng.shuffle(pool)
    owned_by_sector = _owned_by_sector(prep)
    picks = [_personal_pick(base, r, prep, owned_by_sector) for _final, base, r in pool[:N_PICKS]]
    return _meta(True, picks)


def get_or_compute_daily_picks(user: dict) -> dict:
    """Return today's cached picks if fresh, else compute + persist."""
    from backend.services.auth_service import get_daily_picks, save_daily_picks

    user_id = user.get("user_id")
    today = _today()
    cached = get_daily_picks(user_id) if user_id else None
    if (
        cached
        and cached.get("date") == today
        and cached.get("v") == PICKS_VERSION
        and cached.get("picks")
    ):
        return cached
    fresh = compute_daily_picks(user)
    # "New since you last looked": the stale doc from the user's previous
    # visit is still on the user at this point, so diff before overwriting.
    # Omitted on the first-ever feed (everything would be "new").
    prev_codes = {
        (p.get("trading_code") or "").upper()
        for p in ((cached or {}).get("picks") or [])
    }
    if prev_codes:
        fresh["new_codes"] = [
            code
            for code in (
                (p.get("trading_code") or "").upper() for p in fresh["picks"]
            )
            if code not in prev_codes
        ]
    if user_id:
        save_daily_picks(user_id, fresh)
    return fresh


# ---------------------------------------------------------------------------
# Feedback (like / skip) — skip drops the card and backfills the next best one
# ---------------------------------------------------------------------------

def apply_pick_feedback(user: dict, code: str, vote: str) -> dict:
    """Record a like/skip/clear and, on skip, drop the stock from today's cached
    feed and append the next-best replacement so the feed stays full. Like/clear
    only record the signal — it tunes the next recompute (boost only)."""
    from backend.services.auth_service import (
        set_pick_feedback, get_daily_picks, save_daily_picks,
    )

    user_id = user.get("user_id")
    code_u = (code or "").upper().strip()
    fb = set_pick_feedback(user_id, code_u, vote) if user_id else {"liked": [], "disliked": []}
    replacement = None

    if vote == "down" and user_id:
        cached = get_daily_picks(user_id)
        if cached and cached.get("date") == _today() and cached.get("picks"):
            picks = [p for p in cached["picks"] if (p.get("trading_code") or "").upper() != code_u]
            # _prepare re-reads feedback from the DB, so `disliked` already
            # excludes code_u; also exclude codes still on screen to avoid dupes.
            prep = _prepare(user)
            shown = {(p.get("trading_code") or "").upper() for p in picks}
            exclude = _exclude_set(prep, shown | {code_u})
            if prep["has_signal"]:
                scored = _personalized_scored(prep, exclude)
                if scored:
                    _final, base, r = scored[0]
                    replacement = _personal_pick(base, r, prep, _owned_by_sector(prep))
            else:
                cands = _cold_scored(prep, exclude)
                if cands:
                    replacement = _cold_pick(cands[0], prep)
            if replacement:
                picks.append(replacement)
            cached["picks"] = picks
            save_daily_picks(user_id, cached)

    return {"feedback": fb, "replacement": replacement}
