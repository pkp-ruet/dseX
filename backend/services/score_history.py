"""
Score history — how a company's DSEF score and grade moved, and why.

The daily ``signal_snapshots`` rows (one per company per trading day, written
by ``signal_service.snapshot_signals_today`` since 2026-07-09) already carry
the score, grade and Buy/Sell signal. Since 2026-10-25 they also carry the five
pillar scores, so a change can be put down to the pillar that moved it.

Pure functions only — the reads live in ``score_history_service``.

Two things are deliberately NOT read as news about a company:

* **Days we changed the scoring rules.** When a large share of the market
  changes grade (or score) between two snapshots, that is our method moving, not the
  companies. Those changes are labelled as such and never pushed.
* **A score parked on a grade line.** A grade only moves once the score is a
  point past the line (``settle``), so 59.9 / 60.1 isn't a change every day.
* **Rows without pillars** (before 2026-10-25): the change is shown, but with
  no "why" — we don't guess.

The Buy/Sell signal is not part of the history: it moves with the price and
already has its own alerts.
"""
from __future__ import annotations

from typing import Optional

from backend.services.tiers import TIER_WORDS, TIER_WORDS_BN, tier_key

# (key, weight in the final score, English name, Bengali name) — the order and
# weights of scoring_service's final sum.
PILLARS: list[tuple[str, float, str, str]] = [
    ("p1_biz", 0.30, "Profit", "মুনাফা"),
    ("p2_health", 0.20, "Finances", "আর্থিক অবস্থা"),
    ("p3_moat", 0.20, "Business", "ব্যবসার শক্তি"),
    ("p4_val", 0.15, "Price", "দাম"),
    ("p5_div", 0.15, "Dividend", "ডিভিডেন্ড"),
]
PILLAR_KEYS = [p[0] for p in PILLARS]

# What a move in each pillar means, in plain words: (up_en, up_bn, down_en, down_bn).
_PILLAR_MOVES = {
    "p1_biz": ("Profit became stronger", "মুনাফা আরও শক্ত হয়েছে",
               "Profit became weaker", "মুনাফা দুর্বল হয়েছে"),
    "p2_health": ("Its finances improved", "আর্থিক অবস্থার উন্নতি হয়েছে",
                  "Its finances became weaker (debt, cash or interest)", "আর্থিক অবস্থা দুর্বল হয়েছে (ঋণ, নগদ বা সুদ)"),
    "p3_moat": ("The business looks stronger", "ব্যবসা আরও শক্ত দেখাচ্ছে",
                "The business looks weaker", "ব্যবসা দুর্বল দেখাচ্ছে"),
    "p4_val": ("The price became lower compared with profit", "মুনাফার তুলনায় দাম কমেছে",
               "The price became higher compared with profit", "মুনাফার তুলনায় দাম বেড়েছে"),
    "p5_div": ("Dividends look more reliable", "ডিভিডেন্ড আরও নির্ভরযোগ্য দেখাচ্ছে",
               "Dividends look less reliable", "ডিভিডেন্ড কম নির্ভরযোগ্য দেখাচ্ছে"),
}

# A pillar move smaller than this many score points is not worth a line.
DRIVER_MIN_POINTS = 1.0
# A day we changed the scoring rules, not a day the companies changed. On the
# real history (Jul–Oct 2026) a normal day moves at most ~2% of grades and
# ≤2% of scores by 3+ points; the three rule changes moved 4–10% of grades
# and 21–33% of scores by 3+ points.
METHOD_TIER_SHARE = 0.04
METHOD_SCORE_SHARE = 0.10
METHOD_SCORE_POINTS = 3.0
# The fewest companies two snapshots must share before those shares mean anything.
METHOD_MIN_COMPANIES = 50
MAX_CHANGES = 12

def _n(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f


def _tier(row: dict) -> str:
    t = row.get("tier")
    if t and t != "unknown":
        return t
    return tier_key(_n(row.get("score")))


def tier_words(tier: str) -> tuple[str, str]:
    return TIER_WORDS.get(tier, TIER_WORDS["unknown"]), TIER_WORDS_BN.get(tier, TIER_WORDS_BN["unknown"])


# ---------------------------------------------------------------------------
# Days the rules changed
# ---------------------------------------------------------------------------

def _shift(a: dict[str, dict], b: dict[str, dict]) -> bool:
    """True when two {code: {tier, score}} maps differ market-wide."""
    common = [c for c in b if c in a]
    if len(common) < METHOD_MIN_COMPANIES:
        return False
    tiers = [c for c in common if (a[c].get("tier") or "unknown") != "unknown"
             and (b[c].get("tier") or "unknown") != "unknown"]
    moved = sum(1 for c in tiers if a[c]["tier"] != b[c]["tier"])
    pairs = [(_n(a[c].get("score")), _n(b[c].get("score"))) for c in common]
    pairs = [(x, y) for x, y in pairs if x is not None and y is not None]
    jumped = sum(1 for x, y in pairs if abs(y - x) >= METHOD_SCORE_POINTS)
    return ((bool(tiers) and moved / len(tiers) >= METHOD_TIER_SHARE)
            or (bool(pairs) and jumped / len(pairs) >= METHOD_SCORE_SHARE))


def method_change_days(by_date: dict[str, dict[str, dict]]) -> set[str]:
    """Dates on which the whole market's grades or scores moved at once.

    ``by_date`` = {date: {code: {tier, score}}}; each date is compared with the
    snapshot before it."""
    dates = sorted(by_date)
    return {d for prev_d, d in zip(dates, dates[1:]) if _shift(by_date[prev_d], by_date[d])}


def is_method_change(prev_map: dict[str, dict], cur_map: dict[str, dict]) -> bool:
    """The same test for two {code: {tier, score}} maps (the daily push's state diff)."""
    return _shift(prev_map, cur_map)


# ---------------------------------------------------------------------------
# Why a score moved
# ---------------------------------------------------------------------------

def drivers(prev: dict, cur: dict) -> list[dict]:
    """The pillar moves behind a score change, biggest first.

    Each pillar's move is turned into score points (pillar 0–10 × its weight ×
    10), the same arithmetic as the final score before the category and
    staleness multipliers. Empty when either row has no pillars."""
    out = []
    for key, weight, name_en, name_bn in PILLARS:
        a, b = _n(prev.get(key)), _n(cur.get(key))
        if a is None or b is None:
            continue
        pts = round((b - a) * weight * 10, 1)
        if abs(pts) < DRIVER_MIN_POINTS:
            continue
        up_en, up_bn, down_en, down_bn = _PILLAR_MOVES[key]
        out.append({
            "pillar": key, "name_en": name_en, "name_bn": name_bn,
            "points": pts, "from": round(a, 1), "to": round(b, 1),
            "en": up_en if pts > 0 else down_en,
            "bn": up_bn if pts > 0 else down_bn,
        })
    out.sort(key=lambda d: abs(d["points"]), reverse=True)
    return out


def _multiplier_notes(prev: dict, cur: dict) -> list[dict]:
    """Category and old-accounts cuts, which move the score without any pillar."""
    notes = []
    a_cat = (prev.get("market_cat") or "").strip().upper()
    b_cat = (cur.get("market_cat") or "").strip().upper()
    if a_cat and b_cat and a_cat != b_cat:
        if b_cat == "Z":
            notes.append({"key": "to_z", "en": "It moved to category Z, which lowers the score",
                          "bn": "Z ক্যাটাগরিতে গেছে, তাই স্কোর কমেছে"})
        elif a_cat == "Z":
            notes.append({"key": "from_z", "en": f"It left category Z (now {b_cat})",
                          "bn": f"Z ক্যাটাগরি থেকে বেরিয়েছে (এখন {b_cat})"})
        else:
            notes.append({"key": "category", "en": f"Its category changed from {a_cat} to {b_cat}",
                          "bn": f"ক্যাটাগরি {a_cat} থেকে {b_cat} হয়েছে"})
    if prev.get("stale_data") is False and cur.get("stale_data") is True:
        notes.append({"key": "stale", "en": "Its yearly accounts are now out of date, which lowers the score",
                      "bn": "বার্ষিক হিসাব পুরোনো হয়ে গেছে, তাই স্কোর কমেছে"})
    elif prev.get("stale_data") is True and cur.get("stale_data") is False:
        notes.append({"key": "fresh", "en": "New yearly accounts have been published", "bn": "নতুন বার্ষিক হিসাব প্রকাশিত হয়েছে"})
    return notes


def explain(prev: dict, cur: dict, from_tier: Optional[str] = None, to_tier: Optional[str] = None) -> dict:
    """One change between two rows: grade, score and the reasons. The grades
    default to the rows' own; callers pass the settled ones (see ``settle``)."""
    a, b = _n(prev.get("score")), _n(cur.get("score"))
    has_pillars = all(_n(prev.get(k)) is not None for k in PILLAR_KEYS) and         all(_n(cur.get(k)) is not None for k in PILLAR_KEYS)
    return {
        "from_score": round(a, 1) if a is not None else None,
        "to_score": round(b, 1) if b is not None else None,
        "from_tier": from_tier or _tier(prev), "to_tier": to_tier or _tier(cur),
        "drivers": drivers(prev, cur)[:3] if has_pillars else [],
        "notes": _multiplier_notes(prev, cur),
        "explained": has_pillars,
    }


def change_text(ch: dict) -> tuple[str, str]:
    """One plain sentence: 'Grade fell from Good to Average (64 → 58)'."""
    f_en, f_bn = tier_words(ch["from_tier"])
    t_en, t_bn = tier_words(ch["to_tier"])
    nums = ""
    if ch.get("from_score") is not None and ch.get("to_score") is not None:
        nums = f" ({ch['from_score']:.0f} → {ch['to_score']:.0f})"
    rose = _ORDER.index(ch["to_tier"]) > _ORDER.index(ch["from_tier"])         if ch["to_tier"] in _ORDER and ch["from_tier"] in _ORDER else (ch.get("to_score") or 0) > (ch.get("from_score") or 0)
    return (f"Grade {'rose' if rose else 'fell'} from {f_en} to {t_en}{nums}",
            f"গ্রেড {f_bn} থেকে {t_bn} হয়েছে{nums}")


# ---------------------------------------------------------------------------
# Settling a grade (no flicker on a boundary)
# ---------------------------------------------------------------------------

_ORDER = ["weak", "average", "good", "excellent"]
# A score has to clear a grade line by this much before the grade moves. On
# the real history a score parked at 60 flipped Good ↔ Average four times in
# a week (59.9 / 60.1) — that is rounding, not news.
SETTLE_POINTS = 1.0


def settle(prev_tier: Optional[str], score: Optional[float]) -> str:
    """The grade to show after ``score``, given the grade it had: it moves only
    once the score is ``SETTLE_POINTS`` past the line it crossed."""
    raw = tier_key(score)
    if not prev_tier or prev_tier not in _ORDER or raw not in _ORDER:
        return raw
    if _ORDER.index(raw) > _ORDER.index(prev_tier):
        cand = tier_key(score - SETTLE_POINTS)
        return cand if cand in _ORDER and _ORDER.index(cand) > _ORDER.index(prev_tier) else prev_tier
    if _ORDER.index(raw) < _ORDER.index(prev_tier):
        cand = tier_key(score + SETTLE_POINTS)
        return cand if cand in _ORDER and _ORDER.index(cand) < _ORDER.index(prev_tier) else prev_tier
    return prev_tier


# ---------------------------------------------------------------------------
# One company's timeline
# ---------------------------------------------------------------------------

def timeline(rows: list[dict], method_days: Optional[set[str]] = None) -> dict:
    """``rows`` = one company's snapshots (any order). Returns

        {points: [{date, score, tier}], first_date, last_date,
         changes: [newest first: {date, since, …explain(), en, bn, method}],
         grade_changes: n (not counting the days we changed the rules)}

    Only grade changes are listed — the Buy/Sell signal moves with the price
    and would flood the list (GP flipped four times in a week in August)."""
    method_days = method_days or set()
    rows = sorted((r for r in rows if r.get("date") and _n(r.get("score")) is not None),
                  key=lambda r: str(r["date"]))
    points, changes = [], []
    tier, anchor = None, None  # the grade, and the row on which it began
    for r in rows:
        s = _n(r.get("score"))
        new_tier = settle(tier, s)
        day = str(r["date"])[:10]
        if tier and new_tier != tier and tier != "unknown" and new_tier != "unknown":
            # Measured from the day the old grade began: a grade usually moves
            # on a slow drift, and yesterday-vs-today would read "59 → 59".
            ch = explain(anchor, r, tier, new_tier)
            en, bn = change_text(ch)
            changes.append({"date": day, "since": str(anchor["date"])[:10], **ch,
                            "en": en, "bn": bn, "method": day in method_days})
        if new_tier != tier:
            anchor = r
        tier = new_tier
        points.append({"date": day, "score": round(s, 1), "tier": tier})
    changes.reverse()
    return {
        "points": points,
        "first_date": points[0]["date"] if points else None,
        "last_date": points[-1]["date"] if points else None,
        "changes": changes[:MAX_CHANGES],
        "grade_changes": sum(1 for c in changes if not c["method"]),
    }


# ---------------------------------------------------------------------------
# The daily push (state diff, see portfolio_daily)
# ---------------------------------------------------------------------------

def state_row(row: dict) -> dict:
    """What the daily job remembers per company to explain tomorrow's change."""
    out = {"score": _n(row.get("score")), "tier": tier_key(_n(row.get("score"))),
           "market_cat": row.get("market_cat"), "stale_data": row.get("stale_data")}
    for k in PILLAR_KEYS:
        out[k] = _n(row.get(k))
    sd = out["stale_data"]
    out["stale_data"] = None if sd is None or (isinstance(sd, float) and sd != sd) else bool(sd)
    return out


def _bare(row: dict) -> dict:
    return {k: v for k, v in row.items() if k != "anchor"}


def grade_changes(prev_state: dict[str, dict], cur_state: dict[str, dict]) -> dict[str, dict]:
    """{code: explain()} for every company whose settled grade changed since
    the last run, measured from the day the old grade began (each state row
    keeps that day's figures under ``anchor``).

    Settles ``cur_state`` in place and sets each row's anchor — the caller
    stores it as the next baseline. Empty on the first run, and empty when the
    move is market-wide: we changed the rules, nobody gets a push for that,
    and every anchor restarts."""
    if not prev_state:
        for cur in cur_state.values():
            cur["anchor"] = _bare(cur)
        return {}
    for code, cur in cur_state.items():
        prev = prev_state.get(code)
        if prev:
            cur["tier"] = settle(prev.get("tier"), cur.get("score"))
    if is_method_change(prev_state, cur_state):
        for cur in cur_state.values():
            cur["anchor"] = _bare(cur)
        return {}
    out = {}
    for code, cur in cur_state.items():
        prev = prev_state.get(code)
        if not prev:
            cur["anchor"] = _bare(cur)
            continue
        anchor = prev.get("anchor") or _bare(prev)
        a, b = prev.get("tier") or "unknown", cur.get("tier") or "unknown"
        if a == b:
            cur["anchor"] = anchor
            continue
        cur["anchor"] = _bare(cur)
        if a == "unknown" or b == "unknown":
            continue
        out[code] = explain(anchor, cur, a, b)
    return out


def grade_event(code: str, ch: dict, day: str) -> dict:
    """A watcher event (portfolio_watch shape) for one grade change."""
    en, bn = change_text(ch)
    better = ch.get("to_tier") in _ORDER and ch.get("from_tier") in _ORDER and         _ORDER.index(ch["to_tier"]) > _ORDER.index(ch["from_tier"])
    why = (ch.get("notes") or []) + (ch.get("drivers") or [])
    body_en = f"Main reason: {why[0]['en'].lower()}." if why else "See what changed on the stock page."
    body_bn = f"মূল কারণ: {why[0]['bn']}।" if why else "কী বদলেছে, তা শেয়ারের পেজে দেখুন।"
    # The company ranking's group name for the new grade (2026-10-31).
    from backend.services.tiers import GROUP_WORDS
    group = GROUP_WORDS.get(ch.get("to_tier") or "")
    if group:
        body_en = f"It is now in “{group[0]}”. {body_en}"
        body_bn = f"এখন “{group[1]}” দলে। {body_bn}"
    return {
        "id": f"grade-{code}-{day}", "kind": "grade", "code": code,
        "level": "good" if better else ("bad" if ch.get("to_tier") == "weak" else "watch"),
        "title_en": f"{code}: {en[0].lower()}{en[1:]}",
        "title_bn": f"{code}: {bn}",
        "body_en": body_en, "body_bn": body_bn,
    }
