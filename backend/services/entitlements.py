"""Premium plan + free-account limits — the one place that decides who is premium.

There is no free month (removed 2026-10-25): readers buy days by bKash /
Nagad or bank transfer (`payments.py` — the days start at once, an admin accepts or revokes
later), and admins can grant or revoke days by hand. A user is premium while
`users.premium_until` is in the future (admins always are). Accounts that
started the old free month keep its days until they run out
(`premium_source="trial"`).

Limits are enforced server-side for the watchlist and price alerts (holdings
have no free cap since 2026-11-02, only the hard ceiling). The stock-page and portfolio locks are screen-only by design — the data still
ships, the UI hides it (see CLAUDE.md "Premium").
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.services.premium_line import free_n

# The numbers come from THE Premium line (`premium_line.AREAS`, 2026-11-22);
# change them there, together with their pages. Watchlist 5 since 2026-10-30
# (was 10); an account already past it keeps what it has, it just can't add a
# new code. Holdings: no free cap since 2026-11-02 — None here;
# HARD_LIMITS["holdings"] (100) applies to everyone. Compare is screen-only (the
# page caps it; the API sends up to HARD_LIMITS["compare"] to anyone). Alerts =
# the line's watch rules (price alerts today).
FREE_LIMITS = {
    "watchlist": free_n("watchlist"),
    "holdings": None,
    "alerts": free_n("watch_rules"),
    "portfolios": free_n("portfolios"),
    "custom_lists": free_n("saved_screens"),
    "compare": free_n("compare"),
}

# Ceilings for every account, Premium included. Not a plan feature — a size cap
# on what one account can store (the watchlist and holdings live on the user
# document, which every signed-in request reads).
# Holdings: 100 shares a portfolio since 2026-11-02 (user: "set a generic cap of
# 100"; was 300) — the only cap on shares, free or Premium.
HARD_LIMITS = {"watchlist": 200, "alerts": 50, "holdings": 100, "compare": 10}

# HTTPException detail strings the frontend matches (`lib/premium.ts:isLimitError`).
LIMIT_WATCHLIST = "limit_reached:watchlist"
LIMIT_HOLDINGS = "limit_reached:holdings"
LIMIT_ALERTS = "limit_reached:alerts"
LIMIT_PORTFOLIOS = "limit_reached:portfolios"
LIMIT_CUSTOM_LISTS = "limit_reached:custom_lists"
# "Remind me" on the dividend calendar (2026-10-31): Premium only, up to 50 codes.
LIMIT_DIVIDEND_REMINDERS = "limit_reached:dividend_reminders"
DIVIDEND_REMINDERS_MAX = 50


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


def shares_open(user: Optional[dict], now: Optional[datetime] = None) -> bool:
    """THE Premium line's "your shares" layer is open: Premium, or the 7-day
    taste (`taste.py`). Updates in full, same-evening pushes, the 9 AM brief,
    the whole Friday letter, dividend reminders and watch rules past 3."""
    from backend.services import taste

    return is_premium(user, now) or taste.active(user, now)


def limits_for(user: Optional[dict], now: Optional[datetime] = None) -> dict:
    """{limit: max} — None means unlimited."""
    if is_premium(user, now):
        return {k: None for k in FREE_LIMITS}
    out = dict(FREE_LIMITS)
    if shares_open(user, now):
        # The taste: watch rules (and price alerts) are a "your shares" thing.
        out["alerts"] = None
    return out


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
        # The 7-day taste of the "your shares" layer (taste.py), or None.
        "taste": _taste_state(user, now),
        "shares_open": shares_open(user, now),
        # Ten full stock analyses a month for a free reader, opened by the page (report_keys.py).
        "report_keys": keys_state(user.get("report_keys"), now),
        # The portfolio builder's one free plan (portfolio_builder.builder_state).
        "builder": _builder_state(user),
        # The reader survey: should the browser ask the server about it (survey.me_state).
        "survey": _survey_state(user, now),
    }


def _builder_state(user: dict) -> dict:
    from backend.services.portfolio_builder import builder_state

    return builder_state(user)


def _survey_state(user: dict, now: datetime) -> Optional[dict]:
    from backend.services import survey

    try:
        return survey.me_state(user, now, admin=is_admin(user))
    except Exception:  # noqa: BLE001 — never fail /me over the survey
        return None


def _taste_state(user: dict, now: datetime) -> Optional[dict]:
    from backend.services import taste

    return taste.state(user, now)


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
