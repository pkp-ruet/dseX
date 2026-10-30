"""Premium plan + free-account limits — the one place that decides who is premium.

There is no free month (removed 2026-10-25): readers buy days by bKash /
Nagad or bank transfer (`payments.py` — the days start at once, an admin accepts or revokes
later), and admins can grant or revoke days by hand. A user is premium while
`users.premium_until` is in the future (admins always are). Accounts that
started the old free month keep its days until they run out
(`premium_source="trial"`).

Limits are enforced server-side for the watchlist, portfolio holdings and
price alerts; the
TopStock AI cap is counted by the frontend (the assistant runs in the browser).
The stock-page and portfolio locks are screen-only by design — the data still
ships, the UI hides it (see CLAUDE.md "Premium").
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

# Watchlist 5 and holdings 7 since 2026-10-30 (were 10 and unlimited). An
# account already past either keeps what it has; it just can't add a new code.
FREE_LIMITS = {
    "watchlist": 5, "holdings": 7, "alerts": 3, "ai_daily": 10, "portfolios": 1, "custom_lists": 0,
}

# Ceilings for every account, Premium included. Not a plan feature — a size cap
# on what one account can store (the watchlist and holdings live on the user
# document, which every signed-in request reads).
HARD_LIMITS = {"watchlist": 200, "alerts": 50, "holdings": 300}

# HTTPException detail strings the frontend matches (`lib/premium.ts:isLimitError`).
LIMIT_WATCHLIST = "limit_reached:watchlist"
LIMIT_HOLDINGS = "limit_reached:holdings"
LIMIT_ALERTS = "limit_reached:alerts"
LIMIT_PORTFOLIOS = "limit_reached:portfolios"
LIMIT_CUSTOM_LISTS = "limit_reached:custom_lists"


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


# Accounts created before this moment keep admin on their email alone; any later
# one needs a verified email (Google sign-in). Register never verifies an email,
# so before 2026-10-28 anyone could register an ADMIN_EMAILS address that had no
# account yet and become admin.
ADMIN_UNVERIFIED_BEFORE = datetime(2026, 10, 28, 18, 0, tzinfo=timezone.utc)


def is_admin(user: Optional[dict]) -> bool:
    """THE admin rule (admin routes, scores refresh, /me `is_admin`, premium)."""
    from backend.config import ADMIN_EMAILS

    if not user or (user.get("email") or "").lower() not in ADMIN_EMAILS:
        return False
    if user.get("email_verified") is True:
        return True
    created = _as_utc(user.get("created_at"))
    return bool(created and created < ADMIN_UNVERIFIED_BEFORE)


def is_premium(user: Optional[dict], now: Optional[datetime] = None) -> bool:
    if not user:
        return False
    if is_admin(user):
        return True
    until = _as_utc(user.get("premium_until"))
    return bool(until and until > (now or datetime.now(timezone.utc)))


def limits_for(user: Optional[dict], now: Optional[datetime] = None) -> dict:
    """{limit: max} — None means unlimited."""
    if is_premium(user, now):
        return {k: None for k in FREE_LIMITS}
    return dict(FREE_LIMITS)


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


def holdings_add_blocked(count: int, is_new_code: bool, limit: Optional[int]) -> bool:
    """True when a new code would push a portfolio past the limit. Buying more
    of a share already held always works, and so does a portfolio already over
    the cap (it just can't take a new share)."""
    return is_new_code and limit is not None and count >= limit


def alerts_blocked(active_count: int, limit: Optional[int]) -> bool:
    return limit is not None and active_count >= limit


def plan_fields(user: dict) -> dict:
    """What `public_user` adds for the browser."""
    from backend.services.payments import offer_open, offer_state
    from backend.services.report_keys import keys_state

    now = datetime.now(timezone.utc)
    until = _as_utc(user.get("premium_until"))
    started = _as_utc(user.get("trial_started_at"))
    return {
        "is_premium": is_premium(user),
        "premium_until": until.isoformat() if until else None,
        "trial_started_at": started.isoformat() if started else None,
        "premium_source": user.get("premium_source"),
        "paid_plan": user.get("paid_plan"),
        "limits": limits_for(user),
        # Three full stock reports a month for a free reader (report_keys.py).
        "report_keys": keys_state(user.get("report_keys"), now),
        # The reader's own ৳99 month (payments.offer_state), or None.
        "offer": offer_state(user, now, is_premium(user), offer_open()),
    }


# ---------------------------------------------------------------------------
# Writes
# ---------------------------------------------------------------------------

def _users():
    from backend.services.db_service import get_db

    return get_db()["users"]


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
