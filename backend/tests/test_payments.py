"""Premium payments — the pure rules."""
from datetime import datetime, timedelta, timezone

from backend.services.payments import (
    PAID_PLANS,
    accepted_payload,
    extend_until,
    normalize_sender,
    ref_code,
    renewal_payload,
    revoke_until,
    revoked_payload,
)

NOW = datetime(2026, 10, 25, 6, 0, tzinfo=timezone.utc)


def test_plans_are_the_advertised_prices():
    assert {k: (v["amount"], v["days"]) for k, v in PAID_PLANS.items()} == {
        "monthly": (199, 30), "quarterly": (499, 90), "yearly": (1499, 365),
    }


def test_sender_number_forms():
    assert normalize_sender("01712345678") == "01712345678"
    assert normalize_sender("+880 1712-345678") == "01712345678"
    assert normalize_sender("8801712345678") == "01712345678"
    assert normalize_sender("০১৭১২৩৪৫৬৭৮") == "01712345678"
    assert normalize_sender("01212345678") is None   # no 012 operator
    assert normalize_sender("0171234567") is None    # too short
    assert normalize_sender("") is None


def test_ref_code_is_six_upper_chars():
    assert ref_code("3f2a9c1e-77b0-4c1d-9e0a-1b2c3d4e5f60") == "3F2A9C"


def test_paid_days_start_after_days_left():
    assert extend_until(None, 30, NOW) == NOW + timedelta(days=30)
    assert extend_until(NOW - timedelta(days=3), 30, NOW) == NOW + timedelta(days=30)
    left = NOW + timedelta(days=10)
    assert extend_until(left, 90, NOW) == left + timedelta(days=90)
    # Mongo hands back naive UTC.
    assert extend_until(left.replace(tzinfo=None), 30, NOW) == left + timedelta(days=30)


def test_revoke_takes_the_days_back_but_not_past_now():
    assert revoke_until(NOW + timedelta(days=40), 30, NOW) == NOW + timedelta(days=10)
    assert revoke_until(NOW + timedelta(days=20), 30, NOW) == NOW
    assert revoke_until(None, 30, NOW) == NOW


def test_payloads_are_bilingual_and_link_to_premium():
    for build in (revoked_payload, accepted_payload):
        assert build("en")["url"].startswith("/premium")
        assert build("en")["title"] != build("bn")["title"]
    assert "1 day" in renewal_payload(1, "en")["title"]
    assert "3 days" in renewal_payload(3, "en")["title"]
    assert renewal_payload(3, "bn")["url"].endswith("#pay")
