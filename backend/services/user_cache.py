"""
Per-user TTL cache for auth-gated reads (watchlist, notes, portfolio).

Auth endpoints can't share the public TTL cache in `db_service` because every
response is user-scoped. This module gives each (namespace, user_id) pair its
own short-TTL entry. Writes invalidate the affected user's namespace, so users
never see their own stale data after a mutation.

Module-level dict, single-process. On Render free tier the backend runs in one
worker so this is safe. If the deployment ever scales to multiple workers,
replace with Redis or accept eventual consistency within the TTL window.
"""
from __future__ import annotations

import time
from collections import OrderedDict
from threading import Lock
from typing import Any, Optional

_DEFAULT_TTL_SECONDS = 30
# Hard ceiling on cached users. Expired entries are only purged when their own
# key is read again, so without this bound `_store` would grow once per distinct
# (namespace, user_id) and never shrink as users churn. LRU-evict the oldest.
_MAX_ENTRIES = 5000

_store: "OrderedDict[tuple[str, str], dict[str, Any]]" = OrderedDict()
_lock = Lock()


def get(namespace: str, user_id: str, ttl_seconds: int = _DEFAULT_TTL_SECONDS) -> Optional[Any]:
    """Return the cached value, or None if missing/expired."""
    key = (namespace, user_id)
    with _lock:
        entry = _store.get(key)
        if not entry:
            return None
        if time.time() - entry["at"] > ttl_seconds:
            _store.pop(key, None)
            return None
        _store.move_to_end(key)
        return entry["val"]


def set(namespace: str, user_id: str, value: Any) -> None:
    key = (namespace, user_id)
    with _lock:
        _store[key] = {"val": value, "at": time.time()}
        _store.move_to_end(key)
        while len(_store) > _MAX_ENTRIES:
            _store.popitem(last=False)


def invalidate(namespace: str, user_id: str) -> None:
    with _lock:
        _store.pop((namespace, user_id), None)


def invalidate_user(user_id: str) -> None:
    """Drop every cached entry for a user across all namespaces."""
    with _lock:
        for key in [k for k in _store if k[1] == user_id]:
            _store.pop(key, None)


def clear() -> None:
    with _lock:
        _store.clear()


# Namespace constants — keep stable, never reuse.
NS_WATCHLIST = "watchlist"
NS_PORTFOLIO = "portfolio"
NS_TRANSACTIONS = "transactions"
