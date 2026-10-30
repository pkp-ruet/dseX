"""
Rank history — the reads. Rules live in ``rank_history.py`` (pure).

One streamed pass over a year of ``signal_snapshots`` (date order, 1000 rows a
batch — never the whole year in a list) ranks every day as it completes and
keeps only small integer arrays: ~360 companies × ~250 days × 2 bytes.
"""
from __future__ import annotations

import logging
from array import array
from datetime import datetime, timedelta
from typing import Optional

from backend.services import rank_history as rh
from backend.services import score_history as sh
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

_COLLECTION = "signal_snapshots"
HISTORY_DAYS = 366
_MOVER_FIELDS = {"_id": 0, "trading_code": 1, "score": 1, "tier": 1,
                 "market_cat": 1, "stale_data": 1, **{k: 1 for k in sh.PILLAR_KEYS}}


@_ttl_cache(3600, max_entries=2)
def rank_table() -> dict:
    """{dates, totals, by_code: {code: (day_idx array, rank array)}} for the
    last year. Cached an hour (snapshots are written once a day)."""
    since = (datetime.utcnow() - timedelta(days=HISTORY_DAYS)).strftime("%Y-%m-%d")
    dates: list[str] = []
    totals: list[int] = []
    by_code: dict[str, tuple[array, array]] = {}

    def close_day(day: str, scores: dict) -> None:
        ranks = rh.ranks_for_day(scores)
        if not ranks:
            return
        idx = len(dates)
        dates.append(day)
        totals.append(len(ranks))
        for code, r in ranks.items():
            pair = by_code.get(code)
            if pair is None:
                pair = by_code[code] = (array("H"), array("H"))
            pair[0].append(idx)
            pair[1].append(min(r, 65535))

    cur_day, scores = None, {}
    cursor = get_db()[_COLLECTION].find(
        {"date": {"$gte": since}}, {"_id": 0, "date": 1, "trading_code": 1, "score": 1},
    ).sort([("date", 1)]).batch_size(1000)
    for d in cursor:
        day = str(d.get("date") or "")[:10]
        code = d.get("trading_code")
        if not day or not code:
            continue
        if day != cur_day:
            if cur_day is not None:
                close_day(cur_day, scores)
            cur_day, scores = day, {}
        scores[str(code).upper()] = d.get("score")
    if cur_day is not None:
        close_day(cur_day, scores)
    return {"dates": dates, "totals": totals, "by_code": by_code}


def company_ranks(code: str) -> Optional[dict]:
    """One company's year of ranks + today's signal reason (the Premium part of
    the rankings page's quick view). None when it was never ranked."""
    t = rank_table()
    pair = t["by_code"].get(code.upper())
    if not pair:
        return None
    points = rh.series(t["dates"], pair[0], pair[1], t["totals"])
    ranks = [p["r"] for p in points]
    out = {
        "code": code.upper(),
        "points": points,
        "best": min(ranks),
        "worst": max(ranks),
        "first": points[0]["d"],
        "signal": None,
    }
    try:
        from backend.services.signal_service import get_signal

        s = get_signal(code)
        if s and s.get("signal") != "unrated":
            out["signal"] = {k: s.get(k) for k in ("signal", "strength", "reason_en", "reason_bn")}
    except Exception:  # noqa: BLE001 — the reason is a side line
        logger.warning("signal read failed for %s", code, exc_info=True)
    return out


def _rows_on(day: str) -> dict[str, dict]:
    return {str(d["trading_code"]).upper(): d
            for d in get_db()[_COLLECTION].find({"date": day}, _MOVER_FIELDS).batch_size(1000)
            if d.get("trading_code")}


@_ttl_cache(1800, max_entries=2)
def week_movers() -> dict:
    """The week's biggest rank moves with the reason for each
    (``rank_history.movers``), measured from after any rule-change day."""
    t = rank_table()
    try:
        from backend.services.score_history_service import method_days

        mdays = set(method_days())
    except Exception:  # noqa: BLE001
        mdays = set()
    start, end, method = rh.week_window(t["dates"], mdays)
    if not start or not end:
        return {"from": None, "to": end, "method": method, "total": 0, "climbed_n": 0, "fell_n": 0,
                "climbed": [], "fell": [], "grade_changes": 0}
    out = rh.movers(_rows_on(start), _rows_on(end), start, end)
    out["method"] = method
    return out
