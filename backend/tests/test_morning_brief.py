"""The results calendar + the before-the-bell brief (services/morning_brief.py)."""
from datetime import date

from backend.services import morning_brief as mb

TODAY = date(2026, 10, 29)  # a Thursday


def _meeting(md, purpose="q3", pe=date(2026, 9, 30), posted=date(2026, 10, 20), postponed=False):
    return {"meeting_date": md, "purpose": purpose, "period_end": pe, "postponed": postponed, "post_date": posted}


# --------------------------------------------------------------------------- #
# Calendar
# --------------------------------------------------------------------------- #

def test_scheduled_meetings_in_window_soonest_first():
    rows = mb.scheduled_meetings({
        "ACI": [_meeting(date(2026, 11, 2))],
        "GP": [_meeting(TODAY)],
        "OLD": [_meeting(date(2026, 10, 20))],              # already held
        "FAR": [_meeting(date(2026, 12, 30))],              # past the horizon
        "OTHER": [_meeting(date(2026, 11, 1), purpose="other")],  # not a results meeting
    }, TODAY)
    assert [(r["code"], r["days"]) for r in rows] == [("GP", 0), ("ACI", 4)]


def test_a_second_notice_moves_the_meeting():
    rows = mb.scheduled_meetings({"ACI": [
        _meeting(date(2026, 11, 2), posted=date(2026, 10, 15)),
        _meeting(date(2026, 11, 5), posted=date(2026, 10, 25)),
    ]}, TODAY)
    assert [r["date"] for r in rows] == [date(2026, 11, 5)]


def test_a_postponement_cancels_until_a_new_date():
    called_off = {"ACI": [
        _meeting(date(2026, 11, 2), posted=date(2026, 10, 15)),
        _meeting(date(2026, 11, 2), pe=None, posted=date(2026, 10, 28), postponed=True),
    ]}
    assert mb.scheduled_meetings(called_off, TODAY) == []
    called_off["ACI"].append(_meeting(date(2026, 11, 9), posted=date(2026, 10, 29)))
    assert [r["date"] for r in mb.scheduled_meetings(called_off, TODAY)] == [date(2026, 11, 9)]


def _interim(pe, months, cum, prev):
    return {"period_end": pe, "months": months, "eps_cum": cum, "eps_cum_prev": prev, "quarter": months // 3}


def test_expectation_for_a_quarter():
    m = {"code": "ACI", "date": date(2026, 11, 2), "purpose": "q3", "period_end": date(2026, 9, 30)}
    interims = [
        _interim(date(2026, 6, 30), 6, 2.20, 2.00),   # this year so far: +10%
        _interim(date(2025, 9, 30), 9, 3.00, 2.70),   # last year's Q3: the base
    ]
    e = mb.expectation(m, interims, [])
    assert e["base_eps"] == 3.00 and e["so_far_pct"] == 10.0 and e["so_far_months"] == 6
    assert e["better_above"] == 3.30 and e["weaker_below"] == 2.25
    en, bn = mb.expect_lines(m, e)
    assert en == [
        "A year ago, over the same 9 months, it earned ৳3.00 a share.",
        "So far this year (6 months) profit is up 10% on last year.",
        "EPS of ৳3.30 or more would read Better; under ৳2.25 would read Weaker.",
    ]
    assert len(bn) == 3 and "৳3.30" in bn[2]


def test_expectation_for_a_year_falls_back_to_the_audited_table():
    m = {"code": "SQ", "date": date(2026, 11, 2), "purpose": "annual", "period_end": date(2026, 6, 30)}
    e = mb.expectation(m, [_interim(date(2026, 3, 31), 9, 7.5, 6.0)], [], {2025: 10.0})
    assert e["base_eps"] == 10.0 and e["base_kind"] == "table" and e["so_far_pct"] == 25.0


def test_a_loss_a_year_ago_has_no_lines_but_a_profit_reads_better():
    m = {"code": "X", "date": date(2026, 11, 2), "purpose": "q3", "period_end": date(2026, 9, 30)}
    e = mb.expectation(m, [_interim(date(2025, 9, 30), 9, -1.37, -0.5)], [])
    assert e["better_above"] is None
    en, _ = mb.expect_lines(m, e)
    assert en[0] == "A year ago it made a loss over the same 9 months, ৳1.37 a share."
    assert en[-1] == "A profit this time would read Better."


def test_nothing_to_say_without_history():
    m = {"code": "X", "date": date(2026, 11, 2), "purpose": "q3", "period_end": date(2026, 9, 30)}
    assert mb.expectation(m, [], []) is None
    assert mb.expect_lines(m, None) == ([], [])


# --------------------------------------------------------------------------- #
# Brief
# --------------------------------------------------------------------------- #

def _brief(**kw):
    args = {"today": TODAY, "meetings": [], "record_rows": [], "results": [], "names": {}}
    args.update(kw)
    return mb.build_brief({"ACI": 100}, {"GP"}, **args)


def test_brief_orders_results_then_today():
    items = _brief(
        meetings=[{"code": "GP", "date": TODAY, "days": 0, "purpose": "q3", "period_end": None},
                  {"code": "ACI", "date": date(2026, 11, 2), "days": 4, "purpose": "annual", "period_end": None},
                  {"code": "NOTMINE", "date": TODAY, "days": 0, "purpose": "q1", "period_end": None}],
        record_rows=[{"trading_code": "ACI", "buy_by": "2026-10-29", "record_date": "2026-11-02", "cash_per_share": 2.5}],
        results=[{"code": "ACI", "kind": "results", "level": "good", "title_en": "ACI: profit up 17%", "title_bn": "এসিআই"}],
    )
    assert [i["kind"] for i in items] == ["results", "board_today", "buy_by", "board_week"]
    assert items[1]["title_en"] == "GP: board meets today on its Q3 results"
    assert items[2]["title_en"] == "ACI: last day to buy more before the record date (৳2.50 a share)"
    assert items[3]["title_en"] == "Results due this week: ACI (yearly, Mon 2 Nov)"


def test_record_date_today_counts_the_cash():
    items = _brief(record_rows=[{"trading_code": "ACI", "buy_by": "2026-10-26", "record_date": "2026-10-29",
                                 "cash_per_share": 2.5}])
    assert items[0]["title_en"] == "ACI: record date today, ৳250 on your 100 shares"


def test_watched_stock_last_day_to_buy():
    items = _brief(record_rows=[{"trading_code": "GP", "buy_by": "2026-10-29", "cash_per_share": 12.5}])
    assert items[0]["title_en"] == "GP: last day to buy and get its ৳12.50 dividend"


def test_a_dividend_reminder_on_any_share_gets_its_last_day_to_buy():
    rows = [{"trading_code": "BATBC", "buy_by": "2026-10-29", "cash_per_share": 10.0},
            {"trading_code": "ACI", "buy_by": "2026-10-29", "cash_per_share": 2.5},
            {"trading_code": "ZZZ", "buy_by": "2026-10-29", "cash_per_share": 1.0}]
    items = _brief(record_rows=rows, reminders=["batbc", "ACI"])
    titles = [i["title_en"] for i in items]
    assert "BATBC: last day to buy and get its ৳10.00 dividend" in titles
    # A held share keeps its own line, once.
    assert sum(t.startswith("ACI:") for t in titles) == 1
    assert not any(t.startswith("ZZZ") for t in titles)


def test_only_the_weeks_meetings_is_sent_on_sunday_only():
    week = [{"kind": "board_week"}]
    assert not mb.worth_sending(week, TODAY)
    assert mb.worth_sending(week, date(2026, 11, 1))  # Sunday
    assert mb.worth_sending([{"kind": "buy_by"}], TODAY)


def test_push_payload_links():
    one = [{"kind": "results", "url": "/stock/ACI#results", "title_en": "ACI: profit up", "title_bn": "এ"}]
    p = mb.push_payload(one, "en")
    assert p["title"] == "Before the bell" and p["url"] == "/stock/ACI?src=brief#results"
    two = one + [{"kind": "buy_by", "url": "/stock/GP#dividends", "title_en": "GP: last day", "title_bn": "জি"}]
    p = mb.push_payload(two, "bn")
    assert p["url"] == "/?src=brief" and "2টি" in p["title"]
    assert mb.push_payload([], "en") is None


def test_a_long_brief_keeps_eight_and_the_week():
    held = {f"C{i}": 10 for i in range(12)}
    meetings = [{"code": c, "date": TODAY, "days": 0, "purpose": "q3", "period_end": None} for c in held]
    meetings.append({"code": "C0", "date": date(2026, 11, 2), "days": 4, "purpose": "annual", "period_end": None})
    items = mb.build_brief(held, set(), today=TODAY, meetings=meetings, record_rows=[], results=[], names={})
    assert len(items) == mb.MAX_ITEMS and items[-1]["kind"] == "board_week"
