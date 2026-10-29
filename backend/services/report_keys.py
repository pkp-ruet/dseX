"""
Report keys (2026-10-29, the Free vs Premium plan, step 6): every signed-in
free reader may open REPORT_KEYS_PER_MONTH full stock reports a month, on
shares they pick, each open for REPORT_KEY_DAYS days. It shows Premium on a
stock they hold or want instead of the day's rotation (the free report of the
day stays for guests and search).

Stored on the user as `report_keys: [{code, opened_at}]` (newest last, capped).
A month is the Dhaka calendar month the key was used in. Pure rules here;
the endpoint is `POST /api/user/report-keys/{code}` (routers/user.py).
Screen-only like every lock: a key decides what the page shows, not what the
API sends.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

REPORT_KEYS_PER_MONTH = 3
REPORT_KEY_DAYS = 7
# How many past keys the user document keeps (several months' worth).
KEEP = 36
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


def keys_state(keys: Optional[list], now: datetime) -> dict:
    """{month, per_month, used, left, open: [{code, until}]} — `open` are the
    keys still inside their days (a key used last month can still be open)."""
    month = month_of(now)
    used = 0
    open_: dict[str, datetime] = {}
    for k in keys or []:
        at = _utc(k.get("opened_at"))
        code = str(k.get("code") or "").upper()
        if not at or not code:
            continue
        if month_of(at) == month:
            used += 1
        until = at + timedelta(days=REPORT_KEY_DAYS)
        if until > now and (code not in open_ or until > open_[code]):
            open_[code] = until
    return {
        "month": month,
        "per_month": REPORT_KEYS_PER_MONTH,
        "used": used,
        "left": max(0, REPORT_KEYS_PER_MONTH - used),
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
