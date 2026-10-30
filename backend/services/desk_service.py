"""Your Desk (`GET /api/user/desk`, 2026-10-31, the Premium Desk plan).

One page that is Premium: today's edition of what happened and what is coming
on the reader's shares, by time of day —

- **Before the bell** — today's morning brief (`morning_briefs`, Premium job).
- **After the close** — the watcher's events from the latest day it found
  anything (`portfolio_watch_events`) plus Buy more / Sell flips on holdings
  (`portfolio_signals`), worst first.
- **Friday letter** — the newest `weekly_letters` row.
- **Watching** — what the reader has set up: armed price alerts, dividend
  reminders and rank alerts (read defensively — other features add them).
- **This month** — how many things the Desk flagged in 30 days, by kind.

Every reader gets the whole payload; the page shows a free reader the first
item of each section and the counts (screen-only, like every lock).
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Optional, TypeVar

from backend.services import portfolio_watch as watch
from backend.services.db_service import get_db

log = logging.getLogger(__name__)
T = TypeVar("T")

AFTER_CLOSE_LOOKBACK_DAYS = 5
MONTH_DAYS = 30
_LEVEL = {"bad": 0, "watch": 1, "good": 2, "neutral": 3}
_FLIP = {
    "sell": ("bad", "Now marked Sell", "এখন বিক্রির সংকেত"),
    "buy_more": ("good", "Now marked Buy more", "এখন আরও কেনার সংকেত"),
}
_USER_FIELDS = {"_id": 0, "user_id": 1, "portfolio": 1, "extra_portfolios": 1, "watchlist": 1,
                "premium_until": 1, "email": 1, "email_verified": 1, "created_at": 1,
                "dividend_reminders": 1, "rank_alerts": 1}


def _safe(label: str, fn: Callable[[], T], default: T) -> T:
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 — one section failing never blanks the Desk
        log.warning("desk: %s failed: %s", label, e, exc_info=True)
        return default


def _dhaka_day(dt: Any) -> Optional[str]:
    from backend.services.auth_service import _DHAKA_TZ

    if isinstance(dt, str):
        try:
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            return dt[:10]
    if not isinstance(dt, datetime):
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(_DHAKA_TZ).date().isoformat()


def _event_item(e: dict) -> dict:
    code = (e.get("code") or "").upper()
    anchor = watch._STOCK_ANCHOR.get(e.get("kind"))
    return {
        "id": e.get("id"),
        "kind": e.get("kind"),
        "code": code or None,
        "level": e.get("level") or "neutral",
        "title_en": e.get("title_en") or "",
        "title_bn": e.get("title_bn") or e.get("title_en") or "",
        "body_en": e.get("body_en"),
        "body_bn": e.get("body_bn"),
        "url": (f"/stock/{code}" + (f"#{anchor}" if anchor else "")) if code else "/portfolio",
    }


def flip_items(flips: list[dict], day: Optional[str]) -> list[dict]:
    """Buy more / Sell flips from `day` as Desk items. Pure."""
    out = []
    for f in flips:
        sig = f.get("signal")
        if sig not in _FLIP or not day or _dhaka_day(f.get("changed_at")) != day:
            continue
        code = (f.get("trading_code") or "").upper()
        level, en, bn = _FLIP[sig]
        out.append({"id": f"flip-{code}-{day}", "kind": "signal", "code": code, "level": level,
                    "title_en": f"{code}: {en}", "title_bn": f"{code}: {bn}",
                    "body_en": None, "body_bn": None, "url": "/portfolio#pf-shares"})
    return out


def after_close(events: list[dict], flips: list[dict]) -> Optional[dict]:
    """The latest day the watcher found anything, its events + that day's
    flips, worst first. Pure (events newest first, as `recent_events` gives)."""
    days = [e.get("day") for e in events if e.get("day")]
    day = max(days) if days else None
    flip_days = [_dhaka_day(f.get("changed_at")) for f in flips if f.get("signal") in _FLIP]
    flip_days = [d for d in flip_days if d]
    if flip_days and (day is None or max(flip_days) > day):
        day = max(flip_days)
    if not day:
        return None
    items = [_event_item(e) for e in events if e.get("day") == day and e.get("kind") in watch.KIND_WORDS]
    items += flip_items(flips, day)
    if not items:
        return None
    items.sort(key=lambda i: _LEVEL.get(i["level"], 3))
    return {"day": day, "items": items}


def month_summary(events: list[dict]) -> dict:
    """{total, kinds, phrase_en, phrase_bn} for the last 30 days. Pure."""
    d = watch.digest(events)
    return {"total": d["total"], "kinds": d["kinds"],
            "phrase_en": watch.kinds_phrase(d["kinds"], "en") if d["total"] else "",
            "phrase_bn": watch.kinds_phrase(d["kinds"], "bn") if d["total"] else ""}


def _user(user_id: str) -> dict:
    return get_db()["users"].find_one({"user_id": user_id}, _USER_FIELDS) or {"user_id": user_id}


def _codes(u: dict) -> tuple[dict[str, int], set[str]]:
    from backend.services.morning_brief_service import _codes_of

    return _codes_of(u)


def desk(user_id: str) -> dict:
    """The whole Desk for one reader."""
    from backend.services import entitlements, price_alert_service
    from backend.services.morning_brief_service import _dhaka_today, today_brief
    from backend.services.portfolio_daily import recent_events
    from backend.services.portfolio_signal_service import list_recent_events
    from backend.services.weekly_letter_service import latest_letter

    u = _safe("user", lambda: _user(user_id), {"user_id": user_id})
    held, watched = _safe("codes", lambda: _codes(u), ({}, set()))
    events = _safe("events", lambda: recent_events(user_id, days=MONTH_DAYS, limit=200), [])
    since = datetime.now(timezone.utc) - timedelta(days=AFTER_CLOSE_LOOKBACK_DAYS)
    recent = [e for e in events if _dhaka_day(e.get("created_at")) and
              _dhaka_day(e.get("created_at")) >= since.date().isoformat()]
    flips = _safe("flips", lambda: list_recent_events(user_id), [])
    alerts = _safe("alerts", lambda: price_alert_service.list_alerts(user_id), [])
    return {
        "day": _dhaka_today().isoformat(),
        "premium": entitlements.is_premium(u),
        "has_shares": bool(held or watched),
        "brief": _safe("brief", lambda: today_brief(user_id), None),
        "after_close": _safe("after_close", lambda: after_close(recent, flips), None),
        "letter": _safe("letter", lambda: latest_letter(user_id), None),
        "watching": {
            "holdings": len(held),
            "watchlist": len(watched),
            "alerts": sum(1 for a in alerts if a.get("is_active")),
            "dividend_reminders": len(u.get("dividend_reminders") or []),
            "rank_alerts": len(u.get("rank_alerts") or []),
        },
        "month": _safe("month", lambda: month_summary(events), {"total": 0, "kinds": []}),
    }


def desk_summary(user_id: str, brief: Optional[dict], week_events: list[dict],
                 flips: list[dict]) -> dict:
    """The dashboard's Desk card — three lines from data the home bundle has
    already loaded (`brief`, the week's watcher events, the flips) plus the
    newest letter's first line."""
    from backend.services.weekly_letter_service import latest_letter

    ac = _safe("after_close", lambda: after_close(week_events, flips), None)
    letter = _safe("letter", lambda: latest_letter(user_id), None)
    first = None
    if letter:
        shares = next((p for p in letter.get("parts") or [] if p.get("key") == "shares"), None)
        if shares and shares.get("lines"):
            first = {"en": shares["lines"][0]["en"], "bn": shares["lines"][0]["bn"]}
    return {
        "brief_n": len((brief or {}).get("items") or []),
        "brief_first": ((brief or {}).get("items") or [None])[0],
        "after_close_n": len((ac or {}).get("items") or []),
        "after_close_day": (ac or {}).get("day"),
        "after_close_first": ((ac or {}).get("items") or [None])[0],
        "letter_week": (letter or {}).get("week"),
        "letter_first": first,
    }
