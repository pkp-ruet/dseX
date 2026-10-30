from datetime import date, timedelta

from backend.services.caution_list import adjusted_series, caution_item, sort_items
from backend.services.stock_report import rally_run, rally_warning


def _series(prices, start=date(2026, 7, 1)):
    return [(start + timedelta(days=i), p) for i, p in enumerate(prices)]


def test_a_30_percent_month_with_no_news_is_a_run():
    s = _series([10.0] * 41 + [13.5] * 20)
    run = rally_run(s, [])
    assert run and run["days"] == 20 and round(run["pct"]) == 35


def test_company_news_inside_the_run_explains_it():
    s = _series([10.0] * 41 + [13.5] * 20)
    since = s[-21][0]
    assert rally_run(s, [(since + timedelta(days=2), "XYZ: Q1 Financials")]) is None
    # news from before the run began doesn't count
    assert rally_run(s, [(since - timedelta(days=5), "XYZ: Dividend Declaration")]) is not None


def test_a_slow_rise_is_not_a_run():
    s = _series([10.0 + i * 0.05 for i in range(61)])
    assert rally_run(s, []) is None


def test_a_bonus_record_date_inside_the_window_is_put_on_todays_footing():
    # 20 at the start, a 100% bonus halves the price, then a real 60% run.
    raw = [((date(2026, 7, 1) + timedelta(days=i)).isoformat(), 20.0) for i in range(30)]
    raw += [((date(2026, 7, 31) + timedelta(days=i)).isoformat(), 16.0) for i in range(31)]
    act = [{"record_date": "2026-07-30", "cash_ps": 0.0, "stock_pct": 100.0}]
    s = adjusted_series(raw, act)
    assert s[0][1] == 10.0 and s[-1][1] == 16.0
    assert rally_run(s, []) is not None
    assert rally_run(adjusted_series(raw, []), []) is None  # unadjusted, it looks like a fall


def test_red_when_dse_asked_or_the_company_is_weak():
    run = {"days": 20, "pct": 40.0, "since": date(2026, 9, 1)}
    calm = rally_warning(run, score=80, category="A", public_pct=40, queries=[])
    assert calm["level"] == "amber"
    asked = rally_warning(run, score=80, category="A", public_pct=40,
                          queries=[{"post_date": date(2026, 9, 20), "no_undisclosed": True}])
    assert asked["level"] == "red" and "no undisclosed" in asked["lines"][0]["en"]
    assert rally_warning(run, score=40, category="A", public_pct=40, queries=[])["level"] == "red"
    assert rally_warning(run, score=80, category="Z", public_pct=40, queries=[])["level"] == "red"
    assert rally_warning(run, score=80, category="A", public_pct=10, queries=[])["level"] == "red"


def test_items_sort_red_first_then_the_biggest_run():
    run = {"days": 20, "pct": 40.0, "since": date(2026, 9, 1)}
    w_red = {"level": "red", "headline": {"en": "", "bn": ""}, "lines": []}
    w_amb = {"level": "amber", "headline": {"en": "", "bn": ""}, "lines": []}
    a = caution_item("A", "A Ltd", None, {**run, "pct": 90.0}, w_amb, 10)
    b = caution_item("B", "B Ltd", None, run, w_red, 10)
    c = caution_item("C", "C Ltd", None, {**run, "pct": 60.0}, w_red, 10)
    assert [i["code"] for i in sort_items([a, b, c])] == ["C", "B", "A"]
    assert b["since"] == "2026-09-01"
