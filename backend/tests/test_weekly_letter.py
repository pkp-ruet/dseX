from datetime import date

from backend.services import weekly_letter as wl

TODAY = date(2026, 10, 30)  # a Friday


def test_week_moves_skips_missing_and_zero_prices():
    moves = wl.week_moves({"GP": 300.0, "ACI": 0.0}, {"GP": 312.0, "ACI": 200.0, "NEW": 10.0})
    assert moves == {"GP": 4.0}


def test_shares_part_counts_and_leads_with_the_biggest_moves():
    part = wl.shares_part({"GP": 100}, {"ACI", "BXPHARMA"}, {"GP": 4.2, "ACI": -6.0, "BXPHARMA": 0.3},
                          None, {"GP": "Grameenphone Ltd."})
    en = [ln["en"] for ln in part["lines"]]
    assert en[0] == "Of your 3 shares, 2 rose and 1 fell this week."
    assert en[1].startswith("ACI fell 6.0%")
    assert en[2] == "Grameenphone rose 4.2% this week. You own it."
    assert all("BXPHARMA" not in e for e in en)  # under 1%: not a line of its own


def test_shares_part_says_when_nothing_moved():
    part = wl.shares_part({}, {"GP"}, {"GP": 0.2}, None, {})
    assert any("moved more than 1%" in ln["en"] for ln in part["lines"])


def test_shares_part_carries_the_watcher_digest():
    digest = {"total": 2, "kinds": [{"kind": "results", "count": 2}],
              "items": [{"code": "GP", "kind": "results", "level": "bad",
                         "title_en": "GP Q3 results: profit down 30%", "title_bn": "GP"}]}
    part = wl.shares_part({"GP": 10}, set(), {}, digest, {})
    en = [ln["en"] for ln in part["lines"]]
    assert en[0] == "We spotted 2 results reports on your shares."
    assert part["lines"][1]["url"] == "/stock/GP#results"
    assert part["lines"][1]["tone"] == "bad"


def test_market_part_keeps_to_five_lines():
    state = {
        "mood": {"label": "Steady", "label_bn": "স্থির", "sentence2": "Most shares cost less than usual."},
        "stats": {"week_change_pct": -0.61, "dsex": 5417.4},
        "now": {"sectors": [{"name": "Banks", "ret_1w": 2.0}, {"name": "Jute", "ret_1w": -5.4}],
                "quality": {"total": 362, "strong": 19, "good": 54, "trend": {"healthy_delta_1w": 3}}},
    }
    lines = wl.market_part(state)["lines"]
    assert len(lines) == 5
    assert lines[1]["en"] == "DSEX fell 0.6% this week, to 5,417."
    assert lines[4]["en"] == "73 of 362 companies are graded Good or Excellent, 3 more than a week ago."


def test_new_on_lists_needs_a_baseline():
    joined = wl.new_on_lists({"a": ["GP", "ACI"], "b": ["X"]}, {"a": ["GP"]})
    assert joined == {"a": ["ACI"]}


def test_lists_part_names_the_readers_own():
    lists = [{"id": "a", "slug": "a-list", "title_en": "Pays cash every year", "title_bn": "ক"}]
    part = wl.lists_part({"a": ["ACI", "GP"]}, lists, {"GP"})
    assert part["lines"][1]["en"] == "Pays cash every year: ACI, GP. GP is one of yours."
    assert part["lines"][1]["url"] == "/stock-insights/a-list"


def test_lists_part_without_history_says_so():
    part = wl.lists_part({}, [], set(), tracked=False)
    assert "next Friday" in part["lines"][0]["en"]


def test_dates_part_keeps_next_week_on_the_readers_shares():
    meetings = [{"code": "GP", "date": "2026-11-03", "label_en": "Q3 results", "label_bn": "তৃতীয় প্রান্তিকের ফল"},
                {"code": "ACI", "date": "2026-11-20", "label_en": "Q3 results", "label_bn": ""},
                {"code": "OTHER", "date": "2026-11-02", "label_en": "Q3 results", "label_bn": ""}]
    record = [{"trading_code": "BATBC", "record_date": "2026-10-31", "cash_per_share": 10.0}]
    part = wl.dates_part({"GP", "ACI", "BATBC"}, {"BATBC": 50}, meetings, record, TODAY)
    en = [ln["en"] for ln in part["lines"]]
    assert en == [
        "BATBC: record date tomorrow. Your 50 shares get about ৳500.",
        "GP: the board meets on Tue 3 Nov on its Q3 results.",
    ]


def test_free_reader_push_points_at_the_desk():
    letter = wl.build_letter("2026-10-25", [
        {"key": "shares", "title_en": "", "title_bn": "", "lines": [wl.line("One.", "এক।")]},
        {"key": "market", "title_en": "", "title_bn": "", "lines": []},
    ])
    assert [p["free"] for p in letter["parts"]] == [True, False]
    free = wl.push_payload(letter, "en", premium=False)
    assert free["body"] == "One. 3 more parts on your Desk."
    assert free["url"].startswith("/desk")
    assert wl.push_payload(letter, "en", premium=True)["body"] == "One."
    assert wl.worth_sending(letter)
