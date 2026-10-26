"""
Score history — the reads. Rules live in ``score_history.py`` (pure).

Every row comes from ``signal_snapshots`` (one per company per trading day);
see that module's docstring for what is and isn't read as a change.
"""
from __future__ import annotations

import logging
from typing import Optional

from backend.services import score_history as sh
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

_COLLECTION = "signal_snapshots"
_ROW_FIELDS = {"_id": 0, "date": 1, "score": 1, "tier": 1, "signal": 1,
               "market_cat": 1, "stale_data": 1, **{k: 1 for k in sh.PILLAR_KEYS}}


@_ttl_cache(21600)
def method_days() -> frozenset[str]:
    """Dates we changed the scoring rules (a market-wide grade or score shift).
    One small read of every snapshot's grade and score, cached for six hours."""
    by_date: dict[str, dict[str, dict]] = {}
    for d in get_db()[_COLLECTION].find(
            {}, {"_id": 0, "date": 1, "trading_code": 1, "tier": 1, "score": 1}).batch_size(1000):
        day, code = d.get("date"), d.get("trading_code")
        if day and code:
            by_date.setdefault(str(day)[:10], {})[code] = {"tier": d.get("tier"), "score": d.get("score")}
    return frozenset(sh.method_change_days(by_date))


def _rows(code: str) -> list[dict]:
    return list(get_db()[_COLLECTION].find({"trading_code": code.upper()}, _ROW_FIELDS).sort("date", 1))


@_ttl_cache(900)
def company_history(code: str) -> Optional[dict]:
    """``score_history.timeline`` for one company, or None with no snapshots."""
    try:
        rows = _rows(code)
    except Exception:  # noqa: BLE001 — history is a side panel, never a blocker
        logger.exception("score history read failed for %s", code)
        return None
    if not rows:
        return None
    try:
        days = set(method_days())
    except Exception:  # noqa: BLE001
        days = set()
    return sh.timeline(rows, days)


def score_before(code: str, day: str) -> Optional[float]:
    """The score on the last snapshot before ``day`` — what the results
    explainer compares today's score with."""
    try:
        doc = get_db()[_COLLECTION].find_one(
            {"trading_code": code.upper(), "date": {"$lt": day}, "score": {"$ne": None}},
            {"_id": 0, "score": 1}, sort=[("date", -1)])
    except Exception:  # noqa: BLE001
        return None
    return sh._n((doc or {}).get("score"))
