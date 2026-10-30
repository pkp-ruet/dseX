"""The company ranking page's extras in one bundle (2026-10-31, the ranking
redesign https://claude.ai/artifact/VMiz9Wst4vwpznfshy2vnU). Pure: plain dicts
in, plain dicts out (tests/test_rank_today.py).

Free on the page: which companies carry a serious warning in their stock
report (the red flag is named free everywhere), and who moved to a better or
a lower group this week. Premium: where each company stood on the first day
of the rank history. The score rows themselves come from `/api/scores`.
"""
from __future__ import annotations

from typing import Optional

from backend.services import rank_history as rh
from backend.services import score_history as sh
from backend.services.tiers import tier_key


def group_moves(prev: dict[str, dict], cur: dict[str, dict]) -> dict:
    """{up: [codes], down: [codes]} — companies whose settled grade changed
    between the two days (`rank_history.grade_changes`), split by direction."""
    up, down = [], []
    for code in rh.grade_changes(prev, cur):
        a = tier_key(sh._n((prev.get(code) or {}).get("score")))
        b = sh.settle(a, sh._n((cur.get(code) or {}).get("score")))
        if a not in sh._ORDER or b not in sh._ORDER:
            continue
        (up if sh._ORDER.index(b) > sh._ORDER.index(a) else down).append(code)
    return {"up": up, "down": down}


def first_ranks(table: dict) -> Optional[dict]:
    """{date, total, ranks: {code: rank}} on the first day of the rank history
    (`rank_history_service.rank_table`), or None without one."""
    dates = table.get("dates") or []
    if len(dates) < 2:
        return None
    ranks: dict[str, int] = {}
    for code, (idx, rk) in (table.get("by_code") or {}).items():
        if len(idx) and idx[0] == 0:
            ranks[code] = int(rk[0])
    return {"date": dates[0], "total": (table.get("totals") or [None])[0], "ranks": ranks}


def warnings(snapshots: dict[str, dict]) -> dict[str, list[str]]:
    """{code: [red check keys]} for companies whose newest report snapshot has
    a red flag (`stock_report` red checks: audit, category, loans, stale,
    owners_30, factory, rally …). Keys only — the page words them, so 228
    companies cost a few KB instead of 90 KB of sentences."""
    out: dict[str, list[str]] = {}
    for code, d in snapshots.items():
        keys = [k for k in (d.get("red_keys") or []) if k]
        if keys:
            out[code] = keys
    return out
