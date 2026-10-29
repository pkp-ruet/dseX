"""Report keys: three full stock reports a month for a free reader."""
from datetime import datetime, timedelta, timezone

from backend.services.report_keys import keys_state, month_of, use_key

NOW = datetime(2026, 10, 29, 9, 0, tzinfo=timezone.utc)


def _k(code, days_ago):
    return {"code": code, "opened_at": NOW - timedelta(days=days_ago)}


def test_a_fresh_month_has_three_keys():
    s = keys_state([], NOW)
    assert s == {"month": "2026-10", "per_month": 3, "used": 0, "left": 3, "open": []}


def test_a_key_opens_a_report_for_seven_days():
    s = keys_state([_k("gp", 2), _k("ACI", 8)], NOW)
    assert s["used"] == 2 and s["left"] == 1
    assert [o["code"] for o in s["open"]] == ["GP"]


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
    assert use_key([_k("A", 1), _k("B", 2), _k("C", 20)], "D", NOW) == ("none_left", None)
    status, key = use_key([_k("A", 1)], "brac", NOW)
    assert status == "ok" and key == {"code": "BRAC", "opened_at": NOW}


def test_month_is_dhaka_time():
    assert month_of(datetime(2026, 10, 31, 19, 0, tzinfo=timezone.utc)) == "2026-11"
