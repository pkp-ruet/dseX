"""Premium v1 — who is premium, what a free account may do."""
from datetime import datetime, timedelta, timezone

import pytest

from backend.services import entitlements as ent
from backend.services.entitlements import (
    FREE_LIMITS,
    alerts_blocked,
    is_premium,
    limits_for,
    plan_fields,
    holdings_add_blocked,
    watchlist_add_blocked,
)

NOW = datetime(2026, 10, 23, 8, 0, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def no_admins(monkeypatch):
    import backend.config as cfg

    monkeypatch.setattr(cfg, "ADMIN_EMAILS", ["boss@example.com"], raising=False)


def test_free_user_is_not_premium():
    assert not is_premium({"email": "a@example.com"}, NOW)
    assert not is_premium(None, NOW)


def test_premium_until_future_vs_past():
    assert is_premium({"premium_until": NOW + timedelta(days=1)}, NOW)
    assert not is_premium({"premium_until": NOW - timedelta(seconds=1)}, NOW)


def test_naive_mongo_datetime_and_iso_string():
    naive = (NOW + timedelta(days=3)).replace(tzinfo=None)
    assert is_premium({"premium_until": naive}, NOW)
    assert is_premium({"premium_until": (NOW + timedelta(days=3)).isoformat()}, NOW)
    assert not is_premium({"premium_until": "garbage"}, NOW)


def test_admin_is_always_premium():
    assert is_premium({"email": "Boss@Example.com", "email_verified": True}, NOW)


def test_admin_needs_a_verified_email_on_new_accounts():
    # Register never verifies an email: a new account on an admin address
    # (nobody proved they own it) is not admin until Google verifies it.
    new = {"email": "boss@example.com", "created_at": "2026-11-02T10:00:00+00:00"}
    assert not ent.is_admin(new)
    assert not is_premium(new, NOW)
    assert ent.is_admin({**new, "email_verified": True})
    # Accounts that already existed keep admin on their email.
    assert ent.is_admin({"email": "boss@example.com", "created_at": datetime(2025, 1, 5)})
    assert not ent.is_admin({"email": "someone@example.com", "email_verified": True})
    assert not ent.is_admin(None)


def test_limits():
    assert limits_for({}, NOW) == FREE_LIMITS
    assert limits_for({"premium_until": NOW + timedelta(days=1)}, NOW) == {
        "watchlist": None, "holdings": None, "alerts": None, "ai_daily": None, "portfolios": None,
        "custom_lists": None,
    }


def test_watchlist_cap():
    nine = [f"C{i}" for i in range(9)]
    ten = nine + ["C9"]
    assert not watchlist_add_blocked(nine, ten, 10)            # 10th fits
    assert watchlist_add_blocked(ten, ten + ["NEW"], 10)       # 11th blocked
    assert not watchlist_add_blocked(ten, ten + ["c0"], 10)    # re-adding an existing code
    assert not watchlist_add_blocked(ten, ten + ["NEW"], None)  # premium


def test_free_caps():
    assert FREE_LIMITS["watchlist"] == 5
    assert FREE_LIMITS["holdings"] == 7


def test_holdings_cap():
    assert not holdings_add_blocked(6, True, 7)     # 7th share fits
    assert holdings_add_blocked(7, True, 7)         # 8th blocked
    assert not holdings_add_blocked(7, False, 7)    # buying more of one held
    assert holdings_add_blocked(9, True, 7)         # over the cap already: no new share
    assert not holdings_add_blocked(9, False, 7)    # ...but buying more still works
    assert not holdings_add_blocked(50, True, None)  # premium


def test_watchlist_grandfathered_over_cap():
    twelve = [f"C{i}" for i in range(12)]
    assert not watchlist_add_blocked(twelve, twelve[:-1], 10)   # removing works
    assert not watchlist_add_blocked(twelve, twelve, 10)        # reorder / no-op works
    assert watchlist_add_blocked(twelve, twelve[:-1] + ["NEW"], 10)  # swap = add → blocked


def test_alert_cap():
    assert not alerts_blocked(2, 3)
    assert alerts_blocked(3, 3)
    assert not alerts_blocked(50, None)


def test_plan_fields_shape(monkeypatch):
    monkeypatch.setattr(ent, "is_premium", lambda u, now=None: False)
    out = plan_fields({"user_id": "u"})
    assert out["is_premium"] is False
    assert "trial_available" not in out
    assert out["premium_until"] is None
    assert set(out["limits"]) == {"watchlist", "holdings", "alerts", "ai_daily", "portfolios", "custom_lists"}
