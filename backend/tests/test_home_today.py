from datetime import date

from backend.services import home_today as ht

WED = date(2026, 11, 25)  # a Wednesday


def _label(purpose):
    return {"q1": ("Q1 results", "প্রথম প্রান্তিকের ফল")}.get(purpose, ("Results", "আর্থিক ফল"))


def test_trading_days_skip_friday_and_saturday():
    days = ht.trading_days(WED)
    assert [d.isoformat() for d in days] == ["2026-11-25", "2026-11-26", "2026-11-29", "2026-11-30", "2026-12-01"]
    # A Friday starts on Sunday.
    assert ht.trading_days(date(2026, 11, 27), 2) == [date(2026, 11, 29), date(2026, 11, 30)]


def test_week_strip_places_dividends_and_meetings_on_their_days():
    records = [
        {"trading_code": "GP", "company_name": "Grameenphone", "record_date": "2026-11-30",
         "cash_per_share": 12.5, "stock_pct": None, "buy_by": "2026-11-26", "yield_pct": 3.9},
        {"trading_code": "LHB", "company_name": "LafargeHolcim", "record_date": "2026-11-30",
         "cash_per_share": 1.75, "buy_by": "2026-11-26"},
        # A notice of no dividend: left out.
        {"trading_code": "XYZ", "record_date": "2026-11-30", "cash_per_share": None, "stock_pct": None,
         "is_no_dividend": True},
        # The same company twice on one day: once.
        {"trading_code": "GP", "company_name": "Grameenphone", "record_date": "2026-11-30", "cash_per_share": 12.5},
        # Past the strip.
        {"trading_code": "BATBC", "record_date": "2026-12-02", "cash_per_share": 5.0},
    ]
    meetings = [{"code": "RENATA", "date": date(2026, 11, 26), "purpose": "q1"},
                {"code": "ACI", "date": date(2026, 11, 26), "purpose": "x"}]
    strip = ht.week_strip(WED, records, meetings, {"RENATA": "Renata"}, _label)
    assert [d["date"] for d in strip] == ["2026-11-25", "2026-11-26", "2026-11-29", "2026-11-30", "2026-12-01"]
    mon = strip[3]["items"]
    assert [i["code"] for i in mon] == ["GP", "LHB"]  # most cash first
    assert mon[0]["cash_ps"] == 12.5 and mon[0]["buy_by"] == "2026-11-26"
    thu = strip[1]["items"]
    assert [(i["kind"], i["code"]) for i in thu] == [("results", "ACI"), ("results", "RENATA")]
    assert thu[1]["name"] == "Renata" and thu[1]["label_en"] == "Q1 results"
    assert thu[0]["name"] == "ACI" and thu[0]["label_en"] == "Results"


def test_week_strip_never_shows_a_record_date_past_the_free_week():
    # From a Sunday the strip ends on Thursday (4 days), inside the free week;
    # a strip that started on a Thursday ends the next Wednesday (6 days).
    thu = date(2026, 11, 26)
    days = ht.trading_days(thu)
    assert (days[-1] - thu).days <= ht.FREE_WEEK_DAYS
    rec = [{"trading_code": "GP", "record_date": days[-1].isoformat(), "cash_per_share": 1.0}]
    assert ht.week_strip(thu, rec, [], {}, _label)[-1]["items"][0]["code"] == "GP"


def test_bonus_only_dividend_counts():
    it = ht.dividend_item({"trading_code": "ABC", "record_date": "2026-11-30", "cash_per_share": None, "stock_pct": 10})
    assert it and it["cash_ps"] is None and it["stock_pct"] == 10


def test_results_week_counts_the_last_seven_days_by_level():
    rows = [
        {"code": "A", "post_date": "2026-11-25", "level": "good"},
        {"code": "B", "post_date": "2026-11-19", "level": "bad"},
        {"code": "C", "post_date": "2026-11-18", "level": "good"},  # 8 days ago
        {"code": "D", "post_date": "2026-11-24T10:00:00", "level": "odd"},
    ]
    out = ht.results_week(rows, WED)
    assert out["total"] == 3
    assert out["levels"] == {"good": 1, "watch": 0, "bad": 1, "neutral": 1}
    assert out["codes"] == ["A", "B", "D"]


def test_ranking_top_three_and_climbers_inside_the_top_fifty():
    rows = [{"trading_code": c, "company_name": c.title(), "score": s}
            for c, s in [("AAA", 90), ("BBB", 88), ("CCC", 88), ("DDD", 70), ("EEE", None)]]
    rows += [{"trading_code": f"Z{i:02d}", "score": 40 - i * 0.1} for i in range(60)]
    moves = {"places": {"DDD": 3, "CCC": 1, "Z55": 30, "AAA": -1}}
    out = ht.ranking_part(rows, moves)
    assert out["total"] == 64
    assert [t["code"] for t in out["top"]] == ["AAA", "BBB", "CCC"]  # ties by code
    assert out["climbers"] == [{"rank": 4, "code": "DDD", "name": "Ddd", "places": 3},
                               {"rank": 3, "code": "CCC", "name": "Ccc", "places": 1}]
    assert ht.ranking_part(rows, None)["climbers"] == []


def test_build_keeps_a_failed_part_empty():
    out = ht.build(WED, record_dates=None, meetings=None, names={}, label_of=_label, results_rows=None,
                   score_rows=[], moves=None, buy_summary={"count": 9, "universe": 353, "week_joined": 2,
                                                            "top": [{"code": "EBL", "name": "Eastern Bank"}],
                                                            "free_pick": {"code": "EBL", "name": "Eastern Bank"}})
    assert out["days"] is None and out["results"] is None
    assert out["ranking"] == {"total": 0, "top": [], "climbers": []}
    assert out["buy_list"]["free_pick"] == {"code": "EBL", "name": "Eastern Bank"}
    assert out["buy_list"]["week_joined"] == 2
