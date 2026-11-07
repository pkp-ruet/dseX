"""
Report keys (2026-10-29, the Free vs Premium plan, step 6): every signed-in
free reader may open REPORT_KEYS_PER_MONTH full stock analyses a month. Since
2026-11-08 (user: "auto-open 10 a month") the stock page spends one by itself
the first time a free reader opens a share in the month — no button — and the
share stays open for the rest of that Dhaka month, at least REPORT_KEY_DAYS
days. Before that it was 3 a month, spent by a button, open 7 days: 23 readers
used one in 30 days out of ~350 who opened stock pages. The free analysis of
the day stays for guests and search.

Stored on the user as `report_keys: [{code, opened_at}]` (newest last, capped).
A month is the Dhaka calendar month the key was used in. Pure rules here;
the endpoint is `POST /api/user/report-keys/{code}` (routers/user.py).
Screen-only like every lock: a key decides what the page shows, not what the
API sends.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

REPORT_KEYS_PER_MONTH = 10
REPORT_KEY_DAYS = 7
# How many past keys the user document keeps (several months' worth).
KEEP = 60
LIMIT_REPORT_KEYS = "limit_reached:report_keys"

_DHAKA = timezone(timedelta(hours=6))


def _utc(v) -> Optional[datetime]:
    if not isinstance(v, datetime):
        try:
            v = datetime.fromisoformat(str(v))
        except (TypeError, ValueError):
            return None
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


def month_of(when: datetime) -> str:
    """The Dhaka calendar month, "2026-10"."""
    return when.astimezone(_DHAKA).strftime("%Y-%m")


def _month_end(when: datetime) -> datetime:
    """The first moment of the next Dhaka month, in UTC."""
    d = when.astimezone(_DHAKA)
    y, m = (d.year + 1, 1) if d.month == 12 else (d.year, d.month + 1)
    return datetime(y, m, 1, tzinfo=_DHAKA).astimezone(timezone.utc)


def key_until(at: datetime) -> datetime:
    """A key stays open to the end of its Dhaka month, and at least
    REPORT_KEY_DAYS days (one used on the 30th still gets its week)."""
    return max(_month_end(at), at + timedelta(days=REPORT_KEY_DAYS))


def keys_state(keys: Optional[list], now: datetime) -> dict:
    """{month, per_month, used, left, read, open: [{code, until}]} — `read`
    are this month's shares in the order they were opened; `open` are the
    keys still inside their days (a key used last month can still be open)."""
    month = month_of(now)
    used = 0
    read: list[str] = []
    open_: dict[str, datetime] = {}
    for k in keys or []:
        at = _utc(k.get("opened_at"))
        code = str(k.get("code") or "").upper()
        if not at or not code:
            continue
        if month_of(at) == month:
            used += 1
            if code not in read:
                read.append(code)
        until = key_until(at)
        if until > now and (code not in open_ or until > open_[code]):
            open_[code] = until
    return {
        "month": month,
        "per_month": REPORT_KEYS_PER_MONTH,
        "used": used,
        "left": max(0, REPORT_KEYS_PER_MONTH - used),
        "read": read,
        "open": [{"code": c, "until": u.isoformat()} for c, u in sorted(open_.items(), key=lambda x: x[1])],
    }


def use_key(keys: Optional[list], code: str, now: datetime) -> tuple[str, Optional[dict]]:
    """("open", None) when the code is already open · ("none_left", None) when
    the month's keys are spent · ("ok", new_key) to store."""
    code = code.upper()
    state = keys_state(keys, now)
    if any(o["code"] == code for o in state["open"]):
        return "open", None
    if state["left"] <= 0:
        return "none_left", None
    return "ok", {"code": code, "opened_at": now}
