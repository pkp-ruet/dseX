"""What Premium adds to each Buy on `/buy-sell-signals` (2026-10-31, the
Premium Desk plan): the list itself is free in full; Premium shows why, our buy
price, the price where it would stop being a Buy and how long it has been one.

Pure helpers + one cached reader. The buy price is the stock report's own
(`stock_report_snapshots.buy_below`), the stop line the signal's own near-the-
top rule (`NEAR_HIGH_PCT` of the yearly range — the same line the report's
"Our view" names), and the run start comes from `signal_snapshots`.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable, Optional

from backend.services.db_service import _ttl_cache

# How far back to look for the start of a Buy run. Older runs say "over N days".
LOOKBACK_DAYS = 120


def stop_line(hi: Optional[float], lo: Optional[float], pct: float) -> Optional[float]:
    """The price past which the near-the-high dampener turns a Buy off."""
    try:
        hi, lo = float(hi), float(lo)
    except (TypeError, ValueError):
        return None
    if not (hi > lo > 0):
        return None
    v = lo + (hi - lo) * pct / 100.0
    return round(v, 1) if v < 100 else round(v)


def run_start(days: Iterable[tuple[str, Optional[str]]]) -> tuple[Optional[str], bool]:
    """(first day of the current Buy run, whether it reaches past the window).

    `days` = (date, signal) pairs for one code, any order. The run is the newest
    unbroken stretch of "buy"; a newest day that isn't a Buy means no run."""
    rows = sorted(((d, s) for d, s in days if d), key=lambda r: r[0], reverse=True)
    if not rows or rows[0][1] != "buy":
        return None, False
    start = rows[0][0]
    for d, s in rows[1:]:
        if s != "buy":
            return start, False
        start = d
    return start, True


@_ttl_cache(900)
def signal_details() -> dict:
    """{as_of, items: {CODE: {since, since_floor, buy_below, stop_above}}} for
    every code whose signal is a Buy today. Cached 900s (cleared with every
    other cache after a scrape)."""
    from backend.services.db_service import get_db, load_52w_ranges
    from backend.services.signal_service import build_signals, NEAR_HIGH_PCT

    signals = build_signals() or {}
    buys = sorted(c for c, s in signals.items() if (s or {}).get("signal") == "buy")
    db = get_db()

    since = (datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)).strftime("%Y-%m-%d")
    hist: dict[str, list] = {c: [] for c in buys}
    if buys:
        cur = db["signal_snapshots"].find(
            {"trading_code": {"$in": buys}, "date": {"$gte": since}},
            {"_id": 0, "trading_code": 1, "date": 1, "signal": 1},
        ).batch_size(1000)
        for d in cur:
            hist.setdefault(d["trading_code"], []).append((str(d.get("date"))[:10], d.get("signal")))

    buy_below: dict[str, float] = {}
    if buys:
        recent = (datetime.utcnow() - timedelta(days=10)).strftime("%Y-%m-%d")
        for d in db["stock_report_snapshots"].find(
            {"trading_code": {"$in": buys}, "date": {"$gte": recent}},
            {"_id": 0, "trading_code": 1, "date": 1, "buy_below": 1},
        ).sort("date", -1):
            c = d["trading_code"]
            if c not in buy_below and d.get("buy_below"):
                buy_below[c] = d["buy_below"]

    ranges = load_52w_ranges()
    items = {}
    for c in buys:
        start, floor = run_start(hist.get(c, []))
        rng = ranges.get(c) or {}
        stop = stop_line(rng.get("hi"), rng.get("lo"), NEAR_HIGH_PCT)
        bb = buy_below.get(c)
        if bb is not None and stop is not None:
            bb = min(bb, stop)  # the report caps it the same way
        items[c] = {"since": start, "since_floor": floor, "buy_below": bb, "stop_above": stop}

    return {"as_of": datetime.utcnow().strftime("%Y-%m-%d"), "items": items}
