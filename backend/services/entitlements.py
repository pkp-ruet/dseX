"""Premium plan + free-account limits — the one place that decides who is premium.

Every account can start ONE free month (`start_trial`), buy days by bKash /
Nagad (`payments.py` — the days start at once, an admin accepts or revokes
later), and admins can grant or revoke days by hand. A user is premium while
`users.premium_until` is in the future (admins always are, so locked screens
can be checked without a trial).

Limits are enforced server-side for the watchlist and price alerts; the
TopStock AI cap is counted by the frontend (the assistant runs in the browser).
The stock-page and portfolio locks are screen-only by design — the data still
ships, the UI hides it (see CLAUDE.md "Premium").
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

FREE_LIMITS = {"watchlist": 10, "alerts": 3, "ai_daily": 10, "portfolios": 1}
TRIAL_DAYS = 30

# HTTPException detail strings the frontend matches (`lib/premium.ts:isLimitError`).
LIMIT_WATCHLIST = "limit_reached:watchlist"
LIMIT_ALERTS = "limit_reached:alerts"
LIMIT_PORTFOLIOS = "limit_reached:portfolios"


def _as_utc(value) -> Optional[datetime]:
    """Mongo hands back naive UTC datetimes; sanitize_user turns them into ISO
    strings. Accept either."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            value = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def _is_admin(user: dict) -> bool:
    from backend.config import ADMIN_EMAILS

    return (user.get("email") or "").lower() in ADMIN_EMAILS


def is_premium(user: Optional[dict], now: Optional[datetime] = None) -> bool:
    if not user:
        return False
    if _is_admin(user):
        return True
    until = _as_utc(user.get("premium_until"))
    return bool(until and until > (now or datetime.now(timezone.utc)))


def limits_for(user: Optional[dict], now: Optional[datetime] = None) -> dict:
    """{limit: max} — None means unlimited."""
    if is_premium(user, now):
        return {k: None for k in FREE_LIMITS}
    return dict(FREE_LIMITS)


def trial_available(user: Optional[dict]) -> bool:
    return bool(user) and not user.get("trial_started_at")


def watchlist_add_blocked(current: list[str], new: list[str], limit: Optional[int]) -> bool:
    """True when `new` adds a code AND ends up over the limit. Removing always
    works, and a list already over the cap (followed before limits existed)
    stays as it is — it just can't grow."""
    if limit is None:
        return False
    have = {c.upper() for c in current if c}
    wanted = list(dict.fromkeys(c.upper() for c in new if c))
    adds = [c for c in wanted if c not in have]
    return bool(adds) and len(wanted) > limit


def alerts_blocked(active_count: int, limit: Optional[int]) -> bool:
    return limit is not None and active_count >= limit


def plan_fields(user: dict) -> dict:
    """What `public_user` adds for the browser."""
    until = _as_utc(user.get("premium_until"))
    started = _as_utc(user.get("trial_started_at"))
    return {
        "is_premium": is_premium(user),
        "premium_until": until.isoformat() if until else None,
        "trial_started_at": started.isoformat() if started else None,
        "premium_source": user.get("premium_source"),
        "paid_plan": user.get("paid_plan"),
        "trial_available": trial_available(user),
        "limits": limits_for(user),
    }


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

def _users():
    from backend.services.db_service import get_db

    return get_db()["users"]


def start_trial(user_id: str) -> bool:
    """Start the one free month. Atomic: a second call (double tap, second tab)
    matches nothing and returns False."""
    now = datetime.now(timezone.utc)
    doc = _users().find_one({"user_id": user_id}, {"premium_until": 1, "premium_source": 1})
    current = _as_utc((doc or {}).get("premium_until"))
    # Someone who paid first keeps their paid days; the month goes on top.
    paid_ahead = bool(current and current > now and (doc or {}).get("premium_source") == "paid")
    base = current if paid_ahead else now
    res = _users().update_one(
        {"user_id": user_id, "trial_started_at": {"$exists": False}},
        {"$set": {
            "trial_started_at": now,
            "premium_until": base + timedelta(days=TRIAL_DAYS),
            "premium_source": "paid" if paid_ahead else "trial",
            "updated_at": now,
        }},
    )
    return res.modified_count > 0


def grant_premium(user_id: str, days: int) -> Optional[datetime]:
    """Admin: give `days` of premium from now (or from the current end date if
    later). days <= 0 revokes. Returns the new end, or None when revoked."""
    now = datetime.now(timezone.utc)
    if days <= 0:
        _users().update_one(
            {"user_id": user_id},
            {"$set": {"premium_until": now, "updated_at": now}},
        )
        return None
    doc = _users().find_one({"user_id": user_id}, {"premium_until": 1})
    current = _as_utc((doc or {}).get("premium_until"))
    base = current if current and current > now else now
    until = base + timedelta(days=days)
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"premium_until": until, "premium_source": "admin", "updated_at": now}},
    )
    return until
