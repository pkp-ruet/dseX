"""When an admin last looked at the feedback inbox (feedback_service.since_for)."""
from datetime import datetime, timedelta, timezone

from backend.services.feedback_service import NEW_SINCE_DAYS, since_for

NOW = datetime(2026, 11, 24, 10, 0, tzinfo=timezone.utc)


def test_first_look_counts_the_last_week():
    assert since_for(None, "reviews", NOW) == NOW - timedelta(days=NEW_SINCE_DAYS)
    assert since_for({}, "survey", NOW) == NOW - timedelta(days=NEW_SINCE_DAYS)
    assert since_for({"reviews": "garbage"}, "reviews", NOW) == NOW - timedelta(days=NEW_SINCE_DAYS)


def test_each_kind_has_its_own_mark():
    seen = {"reviews": NOW - timedelta(hours=2), "survey": datetime(2026, 11, 20, 8, 0)}  # naive = UTC
    assert since_for(seen, "reviews", NOW) == NOW - timedelta(hours=2)
    assert since_for(seen, "survey", NOW) == datetime(2026, 11, 20, 8, 0, tzinfo=timezone.utc)
