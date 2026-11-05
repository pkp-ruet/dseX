"""Notifications — pure builders (2026-11-06, replaced the Desk).

One list, newest first, of everything we noticed for the reader in the last
30 days, built from what the jobs already store (no new writes):

- the watcher's events on their shares (`portfolio_watch_events`: results, a
  grade change, a red flag, a record date, a category change, a big fall, a
  yearly low, back to their price) — free facts, every reader;
- price alerts that hit (`price_alerts.triggered_at`);
- the 9 AM brief (`morning_briefs`, Premium readers only — the job builds it
  for nobody else), one row with its items;
- the Friday letter (`weekly_letters`), one row with its parts.

A row is `new` when it came after the reader last opened the page
(`users.notifications_seen_at`). Pushes open this page (several things at
once) or the right stock card (one thing), so it doubles as the push history.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

WINDOW_DAYS = 30
MAX_ROWS = 80
# Buy / Sell news stays off every list but the stock report and the portfolio
# (2026-11-01, user decision) — the watcher still stores these two kinds.
SKIP_KINDS = {"answer", "buylist"}
# Where a watcher event opens on its stock page (the anchors the pushes use).
STOCK_ANCHOR = {"results": "results", "grade": "ch-analysis", "red_flag": "an-safety",
                "breakeven": "ch-conclusion", "record": "dividends", "category": "an-safety",
                "drop": "", "low52": ""}


def _iso(v: Any) -> Optional[str]:
    if isinstance(v, datetime):
        if v.tzinfo is None:
            v = v.replace(tzinfo=timezone.utc)
        return v.isoformat()
    return v if isinstance(v, str) and v else None


def _ts(iso: Optional[str]) -> float:
    if not iso:
        return 0.0
    try:
        dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    except ValueError:
        return 0.0
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.timestamp()


def event_row(e: dict) -> Optional[dict]:
    """A watcher event as a row; None for kinds that stay off the list."""
    kind = e.get("kind")
    if not kind or kind in SKIP_KINDS:
        return None
    code = (e.get("code") or "").upper() or None
    anchor = STOCK_ANCHOR.get(kind, "")
    url = (f"/stock/{code}" + (f"#{anchor}" if anchor else "")) if code else "/portfolio"
    return {
        "id": f"ev-{e.get('id')}",
        "kind": kind,
        "code": code,
        "level": e.get("level") or "neutral",
        "at": _iso(e.get("created_at")),
        "title_en": e.get("title_en") or "",
        "title_bn": e.get("title_bn") or e.get("title_en") or "",
        "body_en": e.get("body_en") or None,
        "body_bn": e.get("body_bn") or e.get("body_en") or None,
        "url": url,
    }


def _price(v: Any) -> str:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    return f"৳{f:,.0f}" if f >= 100 else f"৳{f:,.1f}"


def alert_row(a: dict) -> Optional[dict]:
    """A price alert that hit (`price_alert_service._normalize` shape)."""
    at = a.get("triggered_at")
    code = (a.get("trading_code") or "").upper()
    if not at or not code:
        return None
    target, hit = _price(a.get("target_price")), _price(a.get("triggered_price"))
    up = a.get("direction") != "below"
    return {
        "id": f"alert-{a.get('id')}",
        "kind": "alert",
        "code": code,
        "level": "watch",
        "at": _iso(at),
        "title_en": f"{code} reached your price of {target}",
        "title_bn": f"{code} আপনার ঠিক করা দাম {target} {'ছুঁয়েছে' if up else 'নেমে ছুঁয়েছে'}",
        "body_en": f"It closed at {hit}." if hit else None,
        "body_bn": f"দিন শেষে দাম ছিল {hit}।" if hit else None,
        "url": f"/stock/{code}",
    }


def brief_row(doc: dict) -> Optional[dict]:
    """One stored morning brief: "Before the bell" + its items."""
    items = [i for i in (doc.get("items") or []) if i.get("title_en")]
    if not items:
        return None
    n = len(items)
    return {
        "id": f"brief-{doc.get('day')}",
        "kind": "brief",
        "code": None,
        "level": "neutral",
        "at": _iso(doc.get("created_at")),
        "title_en": "Before the bell: " + (items[0]["title_en"] if n == 1 else f"{n} things on your shares today"),
        "title_bn": "বাজার খোলার আগে: " + ((items[0].get("title_bn") or items[0]["title_en"]) if n == 1
                                           else f"আজ আপনার শেয়ারে {n}টি বিষয়"),
        "body_en": None,
        "body_bn": None,
        "url": items[0].get("url") or "/",
        "items": [{"title_en": i["title_en"], "title_bn": i.get("title_bn") or i["title_en"],
                   "url": i.get("url") or "/", "level": i.get("level") or "neutral"} for i in items] if n > 1 else [],
    }


def letter_row(doc: dict) -> Optional[dict]:
    """One Friday letter: the first line of the reader's own part as the
    preview, the parts to read in place."""
    parts = doc.get("parts") or []
    if not parts:
        return None
    shares = next((p for p in parts if p.get("key") == "shares"), None)
    first = (shares or {}).get("lines") or []
    week = doc.get("week")
    return {
        "id": f"letter-{week}",
        "kind": "letter",
        "code": None,
        "level": "neutral",
        "at": _iso(doc.get("created_at")),
        "week": week,
        "title_en": "Your weekly letter",
        "title_bn": "আপনার সাপ্তাহিক চিঠি",
        "body_en": first[0].get("en") if first else None,
        "body_bn": (first[0].get("bn") or first[0].get("en")) if first else None,
        "url": f"/notifications#letter-{week}",
        "parts": parts,
    }


def build_feed(events: list[dict], alerts: list[dict], briefs: list[dict],
               letters: list[dict], seen_at: Optional[str]) -> dict:
    """{items (newest first, ≤ MAX_ROWS, each with `new`), unread}. Pure."""
    rows: list[dict] = []
    for fn, docs in ((event_row, events), (alert_row, alerts), (brief_row, briefs), (letter_row, letters)):
        for d in docs:
            r = fn(d)
            if r and r.get("at"):
                rows.append(r)
    rows.sort(key=lambda r: _ts(r["at"]), reverse=True)
    rows = rows[:MAX_ROWS]
    seen = _ts(seen_at)
    for r in rows:
        r["new"] = _ts(r["at"]) > seen
    return {"items": rows, "unread": sum(1 for r in rows if r["new"])}
