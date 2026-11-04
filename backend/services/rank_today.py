"""The company ranking's rank arrows (2026-10-31; since the simple ranking of
2026-11-01 the page reads only these, and the warnings, group moves and
first-day ranks were deleted 2026-11-05, audit EL11). Pure: plain dicts in,
plain dicts out (tests/test_rank_today.py). The score rows themselves come
from `/api/scores`.
"""
from __future__ import annotations

from bisect import bisect_left
from typing import Optional



def rank_moves(table: dict, start: Optional[str], end: Optional[str]) -> Optional[dict]:
    """{from, to, places: {code: places}, new: [codes]} between two days of the
    rank table (`rank_history_service.rank_table`). + = climbed. A company
    ranked on ``end`` but not on ``start`` is new; one that kept its place is
    left out of ``places``. None when either day isn't in the table."""
    dates = table.get("dates") or []
    if not start or not end or start == end or start not in dates or end not in dates:
        return None
    i0, i1 = dates.index(start), dates.index(end)
    places: dict[str, int] = {}
    new: list[str] = []
    for code, (idx, rk) in (table.get("by_code") or {}).items():
        now = _rank_on(idx, rk, i1)
        if now is None:
            continue
        before = _rank_on(idx, rk, i0)
        if before is None:
            new.append(code)
        elif before != now:
            places[code] = before - now
    return {"from": start, "to": end, "places": places, "new": sorted(new)}


def _rank_on(idx, rk, day: int) -> Optional[int]:
    pos = bisect_left(idx, day)
    return int(rk[pos]) if pos < len(idx) and idx[pos] == day else None
