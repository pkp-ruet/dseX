"""The watcher's summaries — dashboard "this week on your stocks" + renewal recap."""
from backend.services.portfolio_watch import digest, kinds_phrase


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
    assert digest([]) == {"total": 0, "kinds": [], "codes": [], "bad": 0, "items": []}


def test_kinds_phrase():
    k = [{"kind": "grade", "count": 1}, {"kind": "results", "count": 2}, {"kind": "record", "count": 1}]
    assert kinds_phrase(k, "en") == "2 quarterly results, 1 grade change and 1 record date"
    assert kinds_phrase(k[:1], "en") == "1 grade change"
    assert kinds_phrase(k, "bn").startswith("2টি ত্রৈমাসিক ফল")
    assert kinds_phrase([], "en") == ""
