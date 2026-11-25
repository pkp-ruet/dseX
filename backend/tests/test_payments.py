"""Premium payments — the pure rules."""
from datetime import datetime, timedelta, timezone

from backend.services.payments import (
    PAID_PLANS,
    accepted_payload,
    bank_details,
    extend_until,
    gift_payload,
    manual_spec,
    normalize_sender,
    ref_code,
    revoke_until,
    revoked_payload,
    user_search_query,
)

NOW = datetime(2026, 10, 25, 6, 0, tzinfo=timezone.utc)


def test_plans_are_the_advertised_prices():
    assert {k: (v["amount"], v["days"]) for k, v in PAID_PLANS.items()} == {
        "quarterly": (299, 90), "yearly": (999, 365),
    }


def test_only_the_year_shows_a_cut_price():
    # Two plans since 2026-11-26: the year is shown as cut from ৳1,499.
    assert PAID_PLANS["yearly"]["list_amount"] == 1499
    assert "list_amount" not in PAID_PLANS["quarterly"]


def test_sender_number_forms():
    assert normalize_sender("01712345678") == "01712345678"
    assert normalize_sender("+880 1712-345678") == "01712345678"
    assert normalize_sender("8801712345678") == "01712345678"
    assert normalize_sender("০১৭১২৩৪৫৬৭৮") == "01712345678"
    assert normalize_sender("01212345678") is None   # no 012 operator
    assert normalize_sender("0171234567") is None    # too short
    assert normalize_sender("") is None


def test_bank_transfer_details():
    import pytest

    assert bank_details("NPSB", " 12 34 ", "") == {
        "transfer": "npsb", "account_last4": "1234", "reference": None}
    assert bank_details("beftn", "০৫৬৭", "  Rahim   premium ") == {
        "transfer": "beftn", "account_last4": "0567", "reference": "Rahim premium"}
    assert len(bank_details("npsb", "1234", "x" * 200)["reference"]) == 50
    for args, err in ((("rtgs", "1234"), "bad_transfer"), (("", "1234"), "bad_transfer"),
                      (("npsb", "123"), "bad_account_last4"), (("npsb", "12345"), "bad_account_last4"),
                      (("npsb", "12a4"), "bad_account_last4"), (("npsb", ""), "bad_account_last4")):
        with pytest.raises(ValueError, match=err):
            bank_details(*args)


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



def test_plan_change_moves_the_end_date_by_the_difference():
    from backend.services.payments import shift_until

    # Picked a year, paid for a month: 335 days come back off.
    until = NOW + timedelta(days=365)
    assert shift_until(until, 30 - 365, NOW) == NOW + timedelta(days=30)
    # Picked a month, paid for a year: 335 more days.
    assert shift_until(NOW + timedelta(days=30), 335, NOW) == NOW + timedelta(days=365)
    # Never past now; an expired date grows from now.
    assert shift_until(NOW + timedelta(days=10), -335, NOW) == NOW
    assert shift_until(NOW - timedelta(days=5), 60, NOW) == NOW + timedelta(days=60)


def test_account_search_reads_phone_email_or_name():
    assert user_search_query("a") is None
    full = user_search_query("01712-345678")["$or"]
    assert {"phone": {"$regex": "1712345678$"}} in full
    part = user_search_query("345678")["$or"]
    assert {"phone": {"$regex": "345678"}} in part
    words = user_search_query("Rahim.k@")["$or"]
    assert {"email": {"$regex": "Rahim\.k@", "$options": "i"}} in words
    assert any("display_name" in c for c in words)
    assert {"user_id": "Rahim.k@"} in words


def test_manual_payment_spec():
    import pytest

    assert manual_spec("quarterly", None, None) == {"plan": "quarterly", "days": 90, "amount": 299}
    assert manual_spec("yearly", None, 1500) == {"plan": "yearly", "days": 365, "amount": 1500}
    assert manual_spec("custom", 45, 0) == {"plan": "custom", "days": 45, "amount": 0}
    for args in (("custom", None, 100), ("weekly", 7, 50), ("monthly", None, None), ("quarterly", 0, None), ("quarterly", None, -1)):
        with pytest.raises(ValueError):
            manual_spec(*args)


def test_gift_push_does_not_mention_a_payment():
    assert "payment" not in gift_payload("en")["body"].lower()
    assert gift_payload("bn")["url"].startswith("/premium")


# --- the ৳99 first month is gone (2026-11-26) ---------------------------------

from backend.services.payments import ALL_PLANS  # noqa: E402


def test_the_99_offer_can_no_longer_be_bought():
    assert "offer" not in ALL_PLANS and "offer" not in PAID_PLANS
    assert ALL_PLANS == PAID_PLANS
