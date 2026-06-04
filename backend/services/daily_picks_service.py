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

N_PICKS = 6
POOL_SIZE = 25
POP_WEIGHT = 8.0      # max popularity bonus added to the 0..100 match score
SECTOR_BONUS = 6.0    # bonus when a candidate sits in a sector the user favours


# ---------------------------------------------------------------------------
# Taste profile
# ---------------------------------------------------------------------------

def _owned_codes(user: dict) -> set[str]:
    wl = [(c or "").upper() for c in (user.get("watchlist") or [])]
    pf = [(h.get("trading_code") or "").upper() for h in (user.get("portfolio") or [])]
    return {c for c in (wl + pf) if c}


def build_taste_profile(user: dict, rows_by_code: dict) -> dict:
    """Derive pseudo quiz-answers from the user's owned stocks. Saved quiz
    answers (last_recommendation.answers) take precedence where present."""
    owned = _owned_codes(user)
    owned_rows = [rows_by_code[c] for c in owned if c in rows_by_code]

    sectors_count: dict[str, int] = {}
    dys, vals, growths, scores = [], [], [], []
    for r in owned_rows:
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

    # Defaults: leave sectors/budget unconstrained (sector affinity is a soft
    # bonus, not a hard filter), lean long/fundamental.
    answers: dict = {
        "timeline": "long",
        "strategy": "fundamental_strong",
        "sectors": [],
        "dividend": "doesnt_matter",
        "valuation": "any",
        "budget": "any",
    }

    if dys and statistics.mean(dys) >= 4.0:
        answers["dividend"] = "income_focused"

    if vals and statistics.mean(vals) >= 6.0:
        answers["valuation"] = "value"
    elif growths and statistics.mean(growths) >= 12.0:
        answers["valuation"] = "growth"

    if owned_rows and scores and statistics.mean(scores) < 55:
        answers["timeline"] = "short"
        answers["strategy"] = "market_trending"

    saved = (user.get("last_recommendation") or {}).get("answers") or {}
    for k in ("timeline", "strategy", "dividend", "valuation", "budget"):
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


def _pick_dict(row: dict, answers: dict, match: float, personal_reason: str | None = None) -> dict:
    score = row.get("score")
    reasons = _reasons_for_pick(row, answers)
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


def compute_daily_picks(user: dict) -> dict:
    """Build today's picks for `user`. Pure — caller persists the result."""
    user_id = user.get("user_id")
    universe = _build_universe()
    rows = universe["rows"]
    vol_median = universe["vol_median"]
    rows_by_code = {r["trading_code"]: r for r in rows}

    visits = load_stock_visit_counts()
    max_visits = max(visits.values()) if visits else 0

    profile = build_taste_profile(user, rows_by_code)
    owned = profile["owned"]
    answers = profile["answers"]
    affinity = profile["sector_affinity"]
    has_signal = bool(owned) or bool((user.get("last_recommendation") or {}).get("answers"))

    today = _today()
    now_iso = datetime.now(timezone.utc).isoformat()

    def pop_boost(code: str) -> float:
        if max_visits <= 0:
            return 0.0
        return (visits.get(code, 0) / max_visits) * POP_WEIGHT

    seed = abs(hash(f"{today}|{user_id}")) % (2 ** 31)
    rng = random.Random(seed)

    # ---- Cold start: top-rated + trending blend ----
    if not has_signal:
        cands = [r for r in rows if (r.get("score") or 0) >= 55 and not r.get("stale_data")]

        def cold_rank(r: dict) -> float:
            chg = r.get("change_pct") or 0
            return (r.get("score") or 0) + max(0.0, chg) * 1.5 + pop_boost(r["trading_code"])

        cands.sort(key=cold_rank, reverse=True)
        pool = cands[:POOL_SIZE]
        rng.shuffle(pool)
        picks = []
        for r in pool[:N_PICKS]:
            chg = r.get("change_pct")
            reason = (
                f"Trending — up {chg:.1f}% today."
                if chg and chg > 0
                else f"Top-rated stock (grade {round(r.get('score') or 0)}/100)."
            )
            picks.append(_pick_dict(r, answers, r.get("score") or 0, personal_reason=reason))
        return {"date": today, "generated_at": now_iso, "personalized": False, "picks": picks}

    # ---- Personalized ----
    scored = []
    for r in rows:
        code = r["trading_code"]
        if code in owned:
            continue
        score = r.get("score")
        if score is None or r.get("stale_data") or score < 35:
            continue
        base = _match_score(r, answers, vol_median)
        sec = (r.get("sector") or "").strip().lower()
        bonus = SECTOR_BONUS if sec and sec in affinity else 0.0
        final = base + bonus + pop_boost(code)
        scored.append((final, base, r))

    scored.sort(key=lambda t: (-t[0], -(t[2].get("score") or 0), t[2]["trading_code"]))
    pool = scored[:POOL_SIZE]
    rng.shuffle(pool)

    # Name an owned stock per favoured sector for the personal reason line.
    owned_by_sector: dict[str, str] = {}
    for orow in profile["owned_rows"]:
        sec = (orow.get("sector") or "").strip().lower()
        if sec and sec not in owned_by_sector:
            owned_by_sector[sec] = orow["trading_code"]

    picks = []
    for _final, base, r in pool[:N_PICKS]:
        sec = (r.get("sector") or "").strip().lower()
        personal = None
        if sec and sec in owned_by_sector:
            personal = f"{r.get('sector')} — like {owned_by_sector[sec]} you follow."
        picks.append(_pick_dict(r, answers, base, personal_reason=personal))

    return {"date": today, "generated_at": now_iso, "personalized": True, "picks": picks}


def get_or_compute_daily_picks(user: dict) -> dict:
    """Return today's cached picks if fresh, else compute + persist."""
    from backend.services.auth_service import get_daily_picks, save_daily_picks

    user_id = user.get("user_id")
    today = _today()
    cached = get_daily_picks(user_id) if user_id else None
    if cached and cached.get("date") == today and cached.get("picks"):
        return cached
    fresh = compute_daily_picks(user)
    if user_id:
        save_daily_picks(user_id, fresh)
    return fresh
