"""The watcher's summaries — dashboard "this week on your stocks" + renewal recap."""
from backend.services.portfolio_watch import digest, kinds_phrase, pick_free, teaser_payload, week_start


def test_digest_counts_by_kind_worst_first():
    events = [
        {"kind": "record", "code": "GP", "level": "good"},
        {"kind": "results", "code": "BATBC", "level": "bad"},
        {"kind": "results", "code": "GP", "level": "good"},
        {"kind": "unknown", "code": "X", "level": "bad"},
    ]
    d = digest(events)
    assert d["total"] == 3
    assert d["kinds"] == [{"kind": "results", "count": 2}, {"kind": "record", "count": 1}]
    assert d["codes"] == ["BATBC", "GP"]
    assert d["bad"] == 1
    assert d["items"][0]["code"] == "BATBC"


def test_digest_empty():
    assert digest([]) == {"total": 0, "kinds": [], "codes": [], "bad": 0, "items": [], "free_items": []}


def test_digest_keeps_free_items_past_the_cut():
    events = [{"kind": "drop", "code": f"C{i}", "level": "bad"} for i in range(10)]
    events.append({"kind": "record", "code": "GP", "level": "good", "free": True})
    d = digest(events)
    assert len(d["items"]) == 8 and all(not e.get("free") for e in d["items"])
    assert [e["code"] for e in d["free_items"]] == ["GP"]


def test_kinds_phrase():
    k = [{"kind": "grade", "count": 1}, {"kind": "results", "count": 2}, {"kind": "record", "count": 1}]
    assert kinds_phrase(k, "en") == "2 quarterly results, 1 grade change and 1 record date"
    assert kinds_phrase(k[:1], "en") == "1 grade change"
    assert kinds_phrase(k, "bn").startswith("2টি প্রান্তিকের ফল")
    assert kinds_phrase([], "en") == ""


# --------------------------------------------------------------------------- #
# Free readers — the week's free event + the teaser push
# --------------------------------------------------------------------------- #

def _ev(id_, kind, code, level):
    return {"id": id_, "kind": kind, "code": code, "level": level,
            "title_en": f"{code} {kind}", "title_bn": f"{code} {kind} bn",
            "body_en": f"{code} body.", "body_bn": f"{code} বডি।"}


def test_week_start_is_the_sunday_before():
    assert week_start("2026-10-25") == "2026-10-25"  # a Sunday
    assert week_start("2026-10-29") == "2026-10-25"  # Thursday
    assert week_start("2026-10-31") == "2026-10-25"  # Saturday
    assert week_start("2026-11-01") == "2026-11-01"


def test_pick_free_takes_the_most_serious_then_the_first():
    a, b, c = _ev("a", "record", "GP", "good"), _ev("b", "drop", "ACI", "bad"), _ev("c", "low52", "X", "bad")
    assert pick_free([a, b, c])["id"] == "b"
    assert pick_free([a])["id"] == "a"
    assert pick_free([]) is None


def test_teaser_tells_the_free_event_and_counts_the_rest():
    free = _ev("a", "results", "GP", "bad")
    p = teaser_payload([free, _ev("b", "record", "ACI", "good")], free, "en", "/portfolio#pf-premium")
    assert p["title"] == "GP results"
    assert p["body"].startswith("GP body.") and "1 more update" in p["body"] and "Premium" in p["body"]
    assert p["url"] == "/portfolio#pf-premium"


def test_teaser_lone_free_result_opens_its_card():
    free = _ev("a", "results", "GP", "bad")
    p = teaser_payload([free], free, "en")
    assert p["body"] == "GP body."
    assert p["url"] == "/stock/GP?src=watch-teaser#results"


def test_teaser_without_free_names_count_kinds_and_codes_only():
    evs = [_ev("a", "results", "GP", "bad"), _ev("b", "record", "ACI", "good")]
    p = teaser_payload(evs, None, "en", "/x")
    assert p["title"] == "2 updates on your shares today"
    assert p["body"].startswith("1 quarterly result and 1 record date on ACI, GP.")
    assert "GP body." not in p["body"]
    one = teaser_payload(evs[:1], None, "bn", "/x")
    assert one["title"] == "আজ GP-এ একটি আপডেট" and "প্রিমিয়াম" in one["body"]
    assert teaser_payload([], None) is None
