"""The Premium banner's event rows and the admin summary (pure parts)."""
from datetime import datetime, timezone

import pytest

from backend.services import banner_events as be


def test_row_key_is_per_reader_action_and_dhaka_day():
    # 20:00 UTC on 12 Nov is 02:00 on 13 Nov in Dhaka.
    k = be.row_key("u1", "home", "view", datetime(2026, 11, 12, 20, 0, tzinfo=timezone.utc))
    assert k == {"user_id": "u1", "banner": "home", "action": "view", "day": "2026-11-13"}


@pytest.mark.parametrize("banner,action", [("home", "click"), ("stock", "view")])
def test_row_key_refuses_unknown_names(banner, action):
    with pytest.raises(ValueError):
        be.row_key("u1", banner, action, datetime.now(timezone.utc))


def test_every_button_the_banner_sends_is_known():
    # PremiumBanner.tsx sends these; the router's Literal must match.
    assert set(be.ACTIONS) == {"view", "pay", "more", "later", "never"}


def test_figures_from_an_empty_window():
    f = be.banner_figures(None, 30)
    assert f["seen"] == 0 and f["avg_days"] == 0.0
    assert f["pay_pct"] == 0.0 and f["paid_after_tap_of_taps_pct"] == 0.0


def test_figures_are_shares_of_readers_who_saw_it():
    f = be.banner_figures({
        "seen": 200, "view_days": 500, "views": 640, "pay": 20, "more": 10, "later": 50,
        "never": 30, "paid_after_view": 8, "paid_after_tap": 5, "paid_year_after_view": 3,
    }, 30)
    assert f["avg_days"] == 2.5
    assert f["pay_pct"] == 10.0 and f["never_pct"] == 15.0
    assert f["paid_after_view_pct"] == 4.0
    assert f["paid_after_tap_of_taps_pct"] == 25.0
    assert f["paid_year_after_view"] == 3


def test_pipeline_leaves_admins_out_and_reads_the_window():
    start = datetime(2026, 10, 15, tzinfo=timezone.utc)
    match = be.summary_pipeline("home", start, ["admin1"])[0]["$match"]
    assert match == {"banner": "home", "first_at": {"$gte": start}, "user_id": {"$nin": ["admin1"]}}
