"""Report keys: ten full stock analyses a month for a free reader, each open to the month's end."""
from datetime import datetime, timedelta, timezone

from backend.services.report_keys import key_until, keys_state, month_of, use_key

NOW = datetime(2026, 10, 29, 9, 0, tzinfo=timezone.utc)


def _k(code, days_ago):
    return {"code": code, "opened_at": NOW - timedelta(days=days_ago)}


def test_a_fresh_month_has_ten_keys():
    s = keys_state([], NOW)
    assert s == {"month": "2026-10", "per_month": 10, "used": 0, "left": 10, "read": [], "open": []}


def test_a_key_stays_open_to_the_end_of_its_month():
    # ACI on 21 Oct is past 7 days on 29 Oct but still open: it is October.
    s = keys_state([_k("gp", 2), _k("ACI", 8)], NOW)
    assert s["used"] == 2 and s["left"] == 8
    assert s["read"] == ["GP", "ACI"]
    assert {o["code"] for o in s["open"]} == {"GP", "ACI"}
    # On 2 Nov (Dhaka) October's keys are closed and don't count.
    s = keys_state([_k("gp", 2), _k("ACI", 8)], datetime(2026, 11, 7, tzinfo=timezone.utc))
    assert s["used"] == 0 and s["open"] == [] and s["read"] == []


def test_a_key_used_at_the_month_end_still_gets_seven_days():
    at = datetime(2026, 10, 30, tzinfo=timezone.utc)
    assert key_until(at) == at + timedelta(days=7)
    # Mid-month: open to 1 Nov 00:00 Dhaka = 31 Oct 18:00 UTC.
    assert key_until(datetime(2026, 10, 5, tzinfo=timezone.utc)) == datetime(2026, 10, 31, 18, 0, tzinfo=timezone.utc)


def test_last_months_key_can_still_be_open_but_does_not_count():
    # 30 Sep 20:00 UTC is 1 Oct 02:00 in Dhaka: it counts towards October.
    early = {"code": "SQURPHARMA", "opened_at": datetime(2026, 9, 30, 20, 0, tzinfo=timezone.utc)}
    s = keys_state([early], datetime(2026, 10, 3, tzinfo=timezone.utc))
    assert s["used"] == 1  # Dhaka month is October
    # A September key still inside its 7 days on 2 Oct: open, but not October's.
    late = {"code": "BATBC", "opened_at": datetime(2026, 9, 28, tzinfo=timezone.utc)}
    s = keys_state([late], datetime(2026, 10, 2, tzinfo=timezone.utc))
    assert s["used"] == 0 and [o["code"] for o in s["open"]] == ["BATBC"]


def test_use_key():
    assert use_key([_k("GP", 1)], "gp", NOW) == ("open", None)
    ten = [_k(c, 1) for c in "ABCDEFGHIJ"]
    assert use_key(ten, "Z", NOW) == ("none_left", None)
    # A share read twice in the month costs one key.
    assert use_key(ten, "c", NOW) == ("open", None)
    status, key = use_key([_k("A", 1)], "brac", NOW)
    assert status == "ok" and key == {"code": "BRAC", "opened_at": NOW}


def test_month_is_dhaka_time():
    assert month_of(datetime(2026, 10, 31, 19, 0, tzinfo=timezone.utc)) == "2026-11"
