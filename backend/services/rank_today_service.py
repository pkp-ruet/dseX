"""`GET /api/rankings/today` — the ranking page's extras (2026-10-31). Rules
live in `rank_today.py` (pure); this module reads what they need. Cached 30
minutes; every piece is guarded and degrades to its empty value."""
from __future__ import annotations

import logging

from backend.services import rank_today as rt
from backend.services.db_service import _ttl_cache

log = logging.getLogger(__name__)


@_ttl_cache(1800, max_entries=2)
def rankings_today() -> dict:
    """{warnings: {CODE: [red keys]}, week: {from, to, up, down} | None,
    then: {date, total, ranks} | None}."""
    from backend.services import rank_history as rh
    from backend.services.rank_history_service import _rows_on, rank_table
    from backend.services.scoring_service import build_scores_df
    from backend.services.stock_report_service import latest_snapshots

    out: dict = {"warnings": {}, "week": None, "then": None}
    try:
        df = build_scores_df()
        codes = [str(c).upper() for c in df["trading_code"].tolist()] if df is not None and not df.empty else []
        out["warnings"] = rt.warnings(latest_snapshots(codes))
    except Exception:  # noqa: BLE001
        log.exception("rankings_today: warnings failed")
    try:
        table = rank_table()
        out["then"] = rt.first_ranks(table)
        try:
            from backend.services.score_history_service import method_days

            mdays = set(method_days())
        except Exception:  # noqa: BLE001
            mdays = set()
        start, end, method = rh.week_window(table["dates"], mdays)
        if start and end:
            out["week"] = {"from": start, "to": end, **rt.group_moves(_rows_on(start), _rows_on(end))}
        elif method:
            out["week"] = {"from": None, "to": end, "up": [], "down": [], "method": True}
    except Exception:  # noqa: BLE001
        log.exception("rankings_today: history failed")
    return out
