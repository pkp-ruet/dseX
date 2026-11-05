from backend.services.notifications import alert_row, brief_row, build_feed, event_row, letter_row

EV = {"id": "results-GP-1", "kind": "results", "code": "gp", "level": "good",
      "created_at": "2026-11-04T09:00:00+00:00", "title_en": "GP results", "title_bn": "GP ফল",
      "body_en": "Profit up", "body_bn": "মুনাফা বেড়েছে"}


def test_event_opens_its_card_and_signal_news_stays_off():
    r = event_row(EV)
    assert r["code"] == "GP" and r["url"] == "/stock/GP#results"
    assert event_row({**EV, "kind": "answer"}) is None
    assert event_row({**EV, "kind": "buylist"}) is None
    assert event_row({**EV, "kind": "drop"})["url"] == "/stock/GP"


def test_alert_only_when_hit():
    a = {"id": "a1", "trading_code": "aci", "target_price": 250, "direction": "above",
         "triggered_at": "2026-11-05T09:00:00+00:00", "triggered_price": 251.2}
    r = alert_row(a)
    assert r["title_en"] == "ACI reached your price of ৳250" and r["body_en"] == "It closed at ৳251."
    assert alert_row({**a, "triggered_at": None}) is None


def test_brief_one_item_reads_as_that_item():
    one = brief_row({"day": "2026-11-05", "created_at": "2026-11-05T03:00:00+00:00",
                     "items": [{"title_en": "GP: board meets today", "url": "/stock/GP#results"}]})
    assert one["title_en"] == "Before the bell: GP: board meets today" and one["items"] == []
    two = brief_row({"day": "2026-11-05", "created_at": "2026-11-05T03:00:00+00:00",
                     "items": [{"title_en": "a", "url": "/x"}, {"title_en": "b", "url": "/y"}]})
    assert two["title_en"].endswith("2 things on your shares today") and len(two["items"]) == 2
    assert brief_row({"day": "x", "items": []}) is None


def test_letter_previews_the_readers_own_part():
    r = letter_row({"week": "2026-11-01", "created_at": "2026-11-06T04:00:00+00:00",
                    "parts": [{"key": "shares", "free": True, "lines": [{"en": "3 of 5 rose", "bn": "5টির 3টি বেড়েছে"}]},
                              {"key": "market", "free": False, "lines": []}]})
    assert r["body_en"] == "3 of 5 rose" and r["url"] == "/notifications#letter-2026-11-01"


def test_feed_is_newest_first_and_marks_new_after_seen():
    alert = {"id": "a1", "trading_code": "ACI", "target_price": 250,
             "triggered_at": "2026-11-05T09:00:00+00:00", "triggered_price": 251}
    out = build_feed([EV], [alert], [], [], seen_at="2026-11-04T12:00:00+00:00")
    assert [r["kind"] for r in out["items"]] == ["alert", "results"]
    assert [r["new"] for r in out["items"]] == [True, False]
    assert out["unread"] == 1
    assert build_feed([EV], [], [], [], None)["unread"] == 1
