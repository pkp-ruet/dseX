"""The 7-day taste (THE Premium line, step 6)."""
from datetime import datetime, timedelta, timezone

from backend.services import entitlements, taste

NOW = datetime(2026, 11, 22, 10, 0, tzinfo=timezone.utc)


def test_who_gets_it():
    held = {"portfolio": [{"trading_code": "GP"}]}
    assert taste.eligible(held, premium=False)
    assert taste.eligible({"watchlist": ["A", "B", "C"]}, premium=False)
    assert not taste.eligible({"watchlist": ["A", "B"]}, premium=False)
    assert not taste.eligible(held, premium=True)
    assert not taste.eligible({**held, "premium_until": NOW - timedelta(days=3)}, premium=False)  # lapsed
    assert not taste.eligible({**held, "trial_started_at": NOW}, premium=False)  # old free month
    assert not taste.eligible({**held, "taste_started_at": NOW}, premium=False)  # once per account
    assert taste.eligible({"extra_portfolios": [{"holdings": [{"trading_code": "GP"}]}]}, premium=False)


def test_it_lasts_seven_days():
    u = {"taste_started_at": NOW}
    assert taste.active(u, NOW + timedelta(days=6, hours=23))
    assert not taste.active(u, NOW + timedelta(days=7))
    s = taste.state(u, NOW + timedelta(hours=1))
    assert s["active"] and s["days_left"] == 7
    assert taste.state(u, NOW + timedelta(days=6, hours=2))["days_left"] == 1
    assert taste.state(u, NOW + timedelta(days=8))["days_left"] == 0
    assert taste.state({}, NOW) is None


def test_recap_on_day_six_once():
    u = {"taste_started_at": NOW}
    assert not taste.recap_due(u, NOW + timedelta(days=4))
    assert taste.recap_due(u, NOW + timedelta(days=5, hours=1))
    assert not taste.recap_due({**u, "taste_recap_sent_at": NOW}, NOW + timedelta(days=5, hours=1))
    p = taste.recap_payload("2 results reports", 2, "en")
    assert "closes tomorrow" in p["body"] and p["url"].startswith("/premium")
    assert taste.recap_payload("", 0, "bn")["body"]


def test_the_taste_opens_the_shares_layer_and_its_rules_but_not_premium():
    u = {"taste_started_at": datetime.now(timezone.utc) - timedelta(days=1), "portfolio": [{"trading_code": "GP"}]}
    assert not entitlements.is_premium(u)
    assert entitlements.shares_open(u)
    assert entitlements.limits_for(u)["alerts"] is None  # watch rules past 3 during the taste
    assert entitlements.limits_for(u)["portfolios"] == 1  # your money's extras stay Premium
    ended = {"taste_started_at": datetime.now(timezone.utc) - timedelta(days=9)}
    assert not entitlements.shares_open(ended)
    assert entitlements.limits_for(ended)["alerts"] == 3
