"""
Trimming a free account's watchlist to the free cap (2026-10-30, user
decision: free readers who follow more than ``FREE_LIMITS["watchlist"]``
shares keep the first ones they added; the rest are removed).

Pure — the run itself is ``scripts/trim_free_watchlists.py`` (dry run by
default, a backup row per account, an undo). Tests:
``backend/tests/test_watchlist_trim.py``.

"First added" = the order of ``watchlist_meta.added_at``. Codes followed
before that field existed (2026-09-06) have no date and are the oldest; among
equal dates the ``watchlist`` array's own order decides (adds are appended,
so it is the add order too). The date wins over the array because an undo
after a remove puts the code back at the end of the array with its original
date.
"""
from __future__ import annotations

from typing import Optional


def add_order(codes: list[str], meta: Optional[dict]) -> list[str]:
    """The codes, first added first."""
    meta = meta or {}

    def key(item: tuple[int, str]) -> tuple[str, int]:
        i, code = item
        added = (meta.get(code) or {}).get("added_at")
        return (str(added) if added else "", i)

    return [c for _, c in sorted(enumerate(codes), key=key)]


def trim_plan(codes: list[str], meta: Optional[dict], limit: int) -> Optional[dict]:
    """What a trim would do to one account, or None when it is within the cap.

    ``keep`` stays in the account's own array order (only the removed codes
    leave); ``meta`` is the meta for the kept codes; ``removed_meta`` is what
    an undo puts back."""
    seen: list[str] = []
    for c in codes or []:
        c = str(c or "").strip().upper()
        if c and c not in seen:
            seen.append(c)
    if len(seen) <= limit:
        return None
    meta = {str(k).upper(): v for k, v in (meta or {}).items()}
    first = set(add_order(seen, meta)[:limit])
    keep = [c for c in seen if c in first]
    removed = [c for c in seen if c not in first]
    return {
        "keep": keep,
        "removed": removed,
        "meta": {c: meta[c] for c in keep if c in meta},
        "removed_meta": {c: meta[c] for c in removed if c in meta},
        # The plain array order disagrees with the dates (an undo-restore,
        # or a whole-list save) — reported, so a person can look.
        "order_differs": [c for c in seen[:limit]] != add_order(seen, meta)[:limit],
    }


def restore_list(current: list[str], removed: list[str]) -> list[str]:
    """Undo: the removed codes come back after whatever the account has now."""
    out = list(dict.fromkeys(str(c).upper() for c in current or [] if c))
    for c in removed or []:
        c = str(c).upper()
        if c not in out:
            out.append(c)
    return out
