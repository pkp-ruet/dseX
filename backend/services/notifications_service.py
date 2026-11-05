"""Notifications — Mongo reads + the read mark (2026-11-06, replaced the Desk).

`feed(uid)` reads the last 30 days of what the jobs already stored for the
reader and hands it to the pure `notifications.build_feed`. `unread(uid)` is
the navbar bell's count, cached briefly per reader; `mark_seen(uid)` stores
the time they opened the page.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Callable, Optional, TypeVar

from backend.services import notifications as nt
from backend.services.db_service import get_db

log = logging.getLogger(__name__)
T = TypeVar("T")

COUNT_TTL_S = 120
_count_cache: dict[str, tuple[float, int]] = {}
_count_lock = threading.Lock()
_COUNT_CACHE_MAX = 5000


def _safe(label: str, fn: Callable[[], T], default: T) -> T:
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 — one source failing never blanks the list
        log.warning("notifications: %s failed: %s", label, e, exc_info=True)
        return default


def _since() -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=nt.WINDOW_DAYS)


def _events(uid: str) -> list[dict]:
    return list(get_db()["portfolio_watch_events"].find(
        {"user_id": uid, "created_at": {"$gte": _since()}},
        {"_id": 0, "id": 1, "kind": 1, "code": 1, "level": 1, "created_at": 1,
         "title_en": 1, "title_bn": 1, "body_en": 1, "body_bn": 1},
    ).sort("created_at", -1).limit(200))


def _alerts(uid: str) -> list[dict]:
    from backend.services.price_alert_service import _normalize

    docs = get_db()["price_alerts"].find(
        {"user_id": uid, "triggered_at": {"$gte": _since()}},
        {"_id": 0},
    ).limit(100)
    return [_normalize(d) for d in docs]


def _briefs(uid: str) -> list[dict]:
    return list(get_db()["morning_briefs"].find(
        {"user_id": uid, "created_at": {"$gte": _since()}},
        {"_id": 0, "day": 1, "items": 1, "created_at": 1},
    ).sort("created_at", -1).limit(40))


def _letters(uid: str) -> list[dict]:
    return list(get_db()["weekly_letters"].find(
        {"user_id": uid, "created_at": {"$gte": _since()}},
        {"_id": 0, "week": 1, "parts": 1, "created_at": 1},
    ).sort("week", -1).limit(6))


def _user(uid: str) -> dict:
    return get_db()["users"].find_one(
        {"user_id": uid},
        {"_id": 0, "notifications_seen_at": 1, "portfolio": 1, "extra_portfolios": 1, "watchlist": 1,
         "premium_until": 1, "email": 1, "email_verified": 1, "created_at": 1},
    ) or {}


def _has_shares(u: dict) -> bool:
    if u.get("portfolio") or u.get("watchlist"):
        return True
    return any(p.get("holdings") for p in u.get("extra_portfolios") or [])


def _seen_iso(u: dict) -> Optional[str]:
    v = u.get("notifications_seen_at")
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return None


def _build(uid: str) -> tuple[dict, dict]:
    u = _safe("user", lambda: _user(uid), {})
    out = nt.build_feed(
        _safe("events", lambda: _events(uid), []),
        _safe("alerts", lambda: _alerts(uid), []),
        _safe("briefs", lambda: _briefs(uid), []),
        _safe("letters", lambda: _letters(uid), []),
        _seen_iso(u),
    )
    return out, u


def feed(uid: str) -> dict:
    """{items, unread, seen_at, has_shares, premium} — the page."""
    from backend.services import entitlements

    out, u = _build(uid)
    _remember(uid, out["unread"])
    return {**out, "seen_at": _seen_iso(u), "has_shares": _has_shares(u),
            "premium": bool(_safe("is_premium", lambda: entitlements.is_premium(u), False))}


def _remember(uid: str, n: int) -> None:
    with _count_lock:
        if len(_count_cache) >= _COUNT_CACHE_MAX:
            _count_cache.clear()
        _count_cache[uid] = (time.monotonic(), n)


def unread(uid: str) -> int:
    """The navbar bell's number (cached COUNT_TTL_S per reader)."""
    with _count_lock:
        hit = _count_cache.get(uid)
    if hit and time.monotonic() - hit[0] < COUNT_TTL_S:
        return hit[1]
    out, _ = _build(uid)
    _remember(uid, out["unread"])
    return out["unread"]


def mark_seen(uid: str) -> str:
    """Everything up to now has been seen. Returns the stored time."""
    now = datetime.now(timezone.utc)
    get_db()["users"].update_one({"user_id": uid}, {"$set": {"notifications_seen_at": now}})
    _remember(uid, 0)
    return now.isoformat()
