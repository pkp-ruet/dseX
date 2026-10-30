from backend.services.desk_service import after_close, flip_items, month_summary

EVENTS = [
    {"id": "results-GP-1", "day": "2026-10-29", "kind": "results", "code": "GP", "level": "good",
     "title_en": "GP results", "title_bn": "GP"},
    {"id": "drop-ACI-1", "day": "2026-10-29", "kind": "drop", "code": "ACI", "level": "bad",
     "title_en": "ACI fell", "title_bn": "ACI"},
    {"id": "record-X-1", "day": "2026-10-27", "kind": "record", "code": "X", "level": "neutral",
     "title_en": "X record", "title_bn": "X"},
]


def test_after_close_is_the_latest_day_worst_first():
    ac = after_close(EVENTS, [])
    assert ac["day"] == "2026-10-29"
    assert [i["code"] for i in ac["items"]] == ["ACI", "GP"]
    assert ac["items"][1]["url"] == "/stock/GP#results"


def test_after_close_folds_in_that_days_flips():
    flips = [{"trading_code": "gp", "signal": "sell", "changed_at": "2026-10-29T09:00:00+00:00"},
             {"trading_code": "ACI", "signal": "none", "changed_at": "2026-10-29T09:00:00+00:00"}]
    ac = after_close(EVENTS, flips)
    assert "GP: Now marked Sell" in [i["title_en"] for i in ac["items"][:2]]
    assert len(ac["items"]) == 3


def test_a_newer_flip_moves_the_day():
    flips = [{"trading_code": "GP", "signal": "buy_more", "changed_at": "2026-10-30T09:00:00+00:00"}]
    ac = after_close(EVENTS, flips)
    assert ac["day"] == "2026-10-30" and len(ac["items"]) == 1


def test_nothing_is_none():
    assert after_close([], []) is None
    assert flip_items([], "2026-10-29") == []


def test_month_summary_counts_by_kind():
    m = month_summary(EVENTS)
    assert m["total"] == 3
    assert m["phrase_en"].startswith("1 ")
