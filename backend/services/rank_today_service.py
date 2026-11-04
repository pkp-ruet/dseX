"""`GET /api/rankings/today` — the ranking page's rank arrows (2026-10-31,
trimmed to `moves` 2026-11-05). Rules live in `rank_today.py` (pure); this
module reads what they need. Cached 30 minutes."""
from __future__ import annotations

import logging

from backend.services import rank_today as rt
from backend.services.db_service import _ttl_cache

log = logging.getLogger(__name__)


def rankings_today() -> dict:
    """{moves: {from, to, places, new} | None} — each company's rank change
    over the week's window (the ranking page's arrows). The red-flag keys,
    group moves and first-day ranks it used to carry left on 2026-11-05
    (audit EL11): the simple ranking page reads only `moves`."""
    try:
        return {"moves": week_rank_moves()}
    except Exception:  # noqa: BLE001
        log.exception("rankings_today: moves failed")
        return {"moves": None}


@_ttl_cache(1800, max_entries=2)
def week_rank_moves() -> dict | None:
    """Each company's rank change this week — the ranking page's arrows and the
    homepage's ranking card (home bundle)."""
    from backend.services import rank_history as rh
    from backend.services.rank_history_service import rank_table

    table = rank_table()
    try:
        from backend.services.score_history_service import method_days

        mdays = set(method_days())
    except Exception:  # noqa: BLE001
        mdays = set()
    start, end, _method = rh.week_window(table["dates"], mdays)
    return rt.rank_moves(table, start, end)
