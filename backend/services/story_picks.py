"""
"Three stocks worth knowing" — the daily story picker.

A faithful Python port of ``frontend/lib/home-stories.ts`` so the daily email
tells the same three stories the homepage does, with the same rotation. Keep
the two in step: if the floors or the pool size change on one side, change
them on the other.

Each slot answers a different question a beginner actually asks — which is the
strongest? which pays the most cash? which is growing fastest? — so the three
never read as clones. The headline always carries the slot's OWN number, which
is what keeps the three lines unique even when the signal service hands back
the same templated reason for all of them.

The three rotate one step per calendar day out of each slot's top handful, so
a reader who opens tomorrow's email sees different companies without us ever
featuring something we would not stand behind.
"""
from typing import Callable, Optional

STORY_META: dict[str, dict] = {
    "strongest": {"label": "The strongest", "glyph": "★"},
    "dividend": {"label": "Biggest dividend", "glyph": "৳"},
    "growth": {"label": "Fastest growing", "glyph": "▲"},
}

STORY_ORDER = ("strongest", "dividend", "growth")

# Quality floor for the dividend + growth slots. Without it "fastest growing"
# goes to whatever micro-cap posted a freak jump — which would contradict our
# own ranking two blocks later. 60 is the thin-day fallback.
QUALITY_FLOOR = 70.0
QUALITY_FLOOR_FALLBACK = 60.0

# How many candidates each slot rotates through, and the floor below which we
# relax rather than pin the same stock every day.
ROTATION_POOL = 6
MIN_ROTATION = 3

# Per-slot offsets so the three don't all turn over on the same day.
DAY_OFFSET = {"strongest": 0, "dividend": 2, "growth": 4}


def _num(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f  # NaN


def market_day_index(now=None) -> int:
    """Days since the epoch on the market's own calendar (Dhaka is UTC+6, no
    DST), so every reader lands on the same rotation step."""
    from datetime import datetime, timezone

    now = now or datetime.now(timezone.utc)
    return int((now.timestamp() + 6 * 3600) // 86400)


def _pick_for_day(items: list, day: int, offset: int):
    if not items:
        return None
    n = len(items)
    return items[((day + offset) % n + n) % n]


def _eligible(r: dict) -> bool:
    """Only featurable if we can stand behind it: real score, a live price,
    financials that aren't years stale, and not in DSE's junk Z category."""
    return (
        _num(r.get("score")) is not None
        and _num(r.get("ltp")) is not None
        and not r.get("stale_data")
        and (r.get("market_category") or "").strip().upper() != "Z"
    )


def _pool_by(pool: list[dict], metric: Callable[[dict], Optional[float]],
             taken: set, floor: float) -> list[dict]:
    out = [
        r for r in pool
        if r.get("trading_code") not in taken
        and (_num(r.get("score")) or 0.0) >= floor
        and (metric(r) or 0.0) > 0
    ]
    out.sort(key=lambda r: metric(r) or 0.0, reverse=True)
    return out[:ROTATION_POOL]


def _pool_relaxed(pool: list[dict], metric: Callable[[dict], Optional[float]],
                  taken: set) -> list[dict]:
    strict = _pool_by(pool, metric, taken, QUALITY_FLOOR)
    if len(strict) >= MIN_ROTATION:
        return strict
    return _pool_by(pool, metric, taken, QUALITY_FLOOR_FALLBACK)


def _pct(n: float) -> str:
    """One decimal only when it says something (10.9% but 5% not 5.0%)."""
    return str(int(n)) if float(n).is_integer() else f"{n:.1f}"


def _growth_headline(yoy: float) -> str:
    if yoy >= 200:
        return "Earnings tripled in a single year."
    if yoy >= 100:
        return "Earnings more than doubled in a single year."
    return f"Earnings jumped {round(yoy)}% in a single year."


def pick_story_stocks(rows: list[dict], total_count: int,
                      day: Optional[int] = None) -> list[dict]:
    """Pick the three story stocks, in slot order, never repeating a stock (the
    top-scoring name is often also the top dividend payer).

    Returns ``[]`` when all three can't be filled — the block then renders
    nothing rather than a lopsided row.
    """
    day = market_day_index() if day is None else day
    pool = [r for r in rows if _eligible(r)]
    if not pool:
        return []

    taken: set = set()
    out: list[dict] = []

    by_score = sorted(pool, key=lambda r: _num(r.get("score")) or 0.0,
                      reverse=True)[:ROTATION_POOL]
    strongest = _pick_for_day(by_score, day, DAY_OFFSET["strongest"])
    if strongest:
        rank = by_score.index(strongest)
        taken.add(strongest["trading_code"])
        out.append({
            "key": "strongest",
            "row": strongest,
            "headline": (
                f"The highest score of all {total_count} companies we track."
                if rank == 0 else
                f"Ranked #{rank + 1} for overall strength out of {total_count} companies."
            ),
            "metric_label": "Score",
            "metric_value": f"{round(_num(strongest.get('score')) or 0)}",
        })

    div_pool = _pool_relaxed(pool, lambda r: _num(r.get("div_yield_pct")), taken)
    dividend = _pick_for_day(div_pool, day, DAY_OFFSET["dividend"])
    if dividend:
        is_top = div_pool.index(dividend) == 0
        dy = _num(dividend.get("div_yield_pct")) or 0.0
        taken.add(dividend["trading_code"])
        out.append({
            "key": "dividend",
            "row": dividend,
            "headline": (
                f"Pays {_pct(dy)}% a year in cash — "
                + ("the biggest of any strong company."
                   if is_top else "one of the biggest among strong companies.")
            ),
            "metric_label": "Cash a year",
            "metric_value": f"{_pct(dy)}%",
        })

    growth_pool = _pool_relaxed(pool, lambda r: _num(r.get("eps_yoy_pct")), taken)
    growth = _pick_for_day(growth_pool, day, DAY_OFFSET["growth"])
    if growth:
        yoy = _num(growth.get("eps_yoy_pct")) or 0.0
        taken.add(growth["trading_code"])
        out.append({
            "key": "growth",
            "row": growth,
            "headline": _growth_headline(yoy),
            "metric_label": "Profit growth",
            "metric_value": f"+{round(yoy)}%",
        })

    if len(out) < 3:
        return []

    # Attach the signal reason, dropping any sentence an earlier card already
    # used so the three never print the same line twice.
    used: set = set()
    for card in out:
        sig = card["row"].get("signal") or {}
        en = (sig.get("reason_en") or "").strip()
        card["reason_en"] = None
        card["reason_bn"] = None
        if en and en not in used:
            used.add(en)
            card["reason_en"] = en
            card["reason_bn"] = (sig.get("reason_bn") or "").strip() or None

    return out
