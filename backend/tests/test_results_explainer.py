"""Results day, explained — real DSE figures from the fixtures' shape."""
from datetime import date

from backend.services import portfolio_watch as W
from backend.services.results_explainer import explain


def _interim(**kw):
    base = {"quarter": 2, "months": 6, "period_end": date(2026, 6, 30), "post_date": date(2026, 7, 29),
            "eps_cum": 5.07, "eps_cum_prev": 3.09, "eps_q": 2.55, "eps_q_prev": 1.34,
            "nocfps_cum": None, "nocfps_cum_prev": None}
    base.update(kw)
    return base


def test_profit_up_with_price_and_score_lines():
    row = {"ltp": 67.8, "eps": 11.1, "eps_basis": "ttm", "fy_eps": 9.16, "score": 80.4}
    ex = explain(_interim(), row, score_before=76.2, sector_class="BANK")
    assert ex["headline_en"] == "Q2 results: profit up 64% on last year"
    assert ex["level"] == "good"
    keys = [l["key"] for l in ex["lines"]]
    assert keys == ["profit", "quarter", "price", "score"]  # no cash line for a bank
    assert "6.1× its profit over the last 12 months (7.4× on last year's audited profit)" in ex["lines"][2]["en"]
    assert "from 76 to 80 (Excellent)" in ex["lines"][3]["en"]


def test_profit_up_but_cash_out_is_a_watch():
    ex = explain(_interim(nocfps_cum=-1.2, nocfps_cum_prev=0.8), {}, None, "GENERAL")
    assert ex["level"] == "watch"
    assert ex["lines"][-1]["key"] == "cash" and ex["lines"][-1]["tone"] == "bad"
    assert "cash didn't come in" in ex["meaning_en"]


def test_big_drop_matches_the_value_trap_line():
    ex = explain(_interim(eps_cum=2.0, eps_cum_prev=3.0, eps_q=1.0, eps_q_prev=1.5))
    assert ex["level"] == "bad"
    assert "Buy rules hold off" in ex["meaning_en"]


def test_loss_years_read_in_words():
    ex = explain(_interim(eps_cum=-0.5, eps_cum_prev=0.4))
    assert ex["headline_en"] == "Q2 results: turned to a loss"
    ex = explain(_interim(eps_cum=0.3, eps_cum_prev=-0.4))
    assert ex["headline_en"] == "Q2 results: back to a profit"
    assert ex["level"] == "good"


def test_unreadable_report_is_none():
    assert explain(_interim(eps_cum=None)) is None


def test_watcher_results_event_uses_the_explainer():
    facts = {"results": {"BRACBANK": _interim()}}
    (ev,) = W.build_events({}, facts, "2026-07-30", watched={"BRACBANK"})
    assert ev["kind"] == "results" and ev["level"] == "good"
    assert ev["title_en"] == "BRACBANK Q2 results: profit up 64% on last year"
    p = W.push_payload([ev], "en")
    assert p["url"] == "/stock/BRACBANK?src=watch#results"


def test_watched_only_stocks_get_no_price_events():
    facts = {"prices": {"GP": {"ltp": 250, "change": -15, "change_pct": -6}}}
    assert W.build_events({}, facts, "2026-10-25", watched={"GP"}) == []


def test_feed_row_carries_only_the_free_part():
    from backend.services.results_explainer import feed_row

    ex = explain(_interim(nocfps_cum=-1.2, nocfps_cum_prev=0.8), {"ltp": 67.8, "eps": 11.1, "eps_basis": "ttm", "score": 80})
    row = feed_row("BRACBANK", ex, {"company_name": "BRAC Bank PLC.", "sector": "Bank"},
                   {"ltp": 68.2, "change_pct": 0.59}, 80.0)
    assert row["headline_en"] == "Q2 results: profit up 64% on last year"
    assert row["profit_en"].startswith("Profit in the 6 months to Jun 2026")
    assert row["post_date"] == "2026-07-29" and row["name"] == "BRAC Bank PLC."
    assert row["eps_cum"] == ex["eps_cum"] and row["eps_cum_prev"] == ex["eps_cum_prev"]
    # What it means, the cash and price lines stay on the (locked) stock page.
    assert not any(k.startswith("meaning") or k == "lines" for k in row)


def test_feed_is_newest_first_then_biggest_move(monkeypatch):
    from backend.services import results_explainer as RE

    rows = [{"code": "A", "post_date": "2026-10-15", "eps_yoy_pct": 5},
            {"code": "B", "post_date": "2026-10-19", "eps_yoy_pct": 1},
            {"code": "C", "post_date": "2026-10-15", "eps_yoy_pct": -40}]
    assert [r["code"] for r in RE.sort_feed(rows)] == ["B", "C", "A"]

    monkeypatch.setattr(RE, "all_results", lambda: RE.sort_feed(rows))
    got = RE.results_for(["a", "c", "B"], days=7, today=date(2026, 10, 25))
    assert [r["code"] for r in got] == ["B"]
    got = RE.results_for(["A", "C"], days=21, today=date(2026, 10, 25))
    assert [r["code"] for r in got] == ["C", "A"]


# --- Full years from the yearly notice (2026-10-28) ---------------------------
# SQURPHARMA: the 27 Oct 2026 dividend notice (FY to 30 Jun 2026) and its
# 9-month report posted 30 Apr 2026.

def _sq_annual(**kw):
    base = {"fy_end": date(2026, 6, 30), "fy": 2026, "eps": 31.24, "eps_prev": 27.04,
            "nav": 178.99, "nav_prev": 157.88, "nocfps": 18.65, "nocfps_prev": 19.52,
            "consolidated": True, "post_date": date(2026, 10, 27)}
    base.update(kw)
    return base


def _sq_q3(**kw):
    return _interim(quarter=3, months=9, period_start=date(2025, 7, 1), period_end=date(2026, 3, 31),
                    post_date=date(2026, 4, 30), eps_cum=23.29, eps_cum_prev=21.15,
                    eps_q=6.73, eps_q_prev=6.83, nocfps_cum=17.54, nocfps_cum_prev=11.90, **kw)


def test_full_year_reads_like_a_report_with_the_fourth_quarter_alone():
    from backend.services.results_explainer import full_year_result

    rec = full_year_result(_sq_annual(), _sq_q3())
    assert rec["months"] == 12 and rec["quarter"] is None and rec["full_year"] is True
    assert rec["period_start"] == date(2025, 7, 1)
    assert (rec["eps_q"], rec["eps_q_prev"]) == (7.95, 5.89)       # 31.24 − 23.29, 27.04 − 21.15

    ex = explain(rec, {"ltp": 218.8, "score": 89.2}, None, "GENERAL")
    assert ex["headline_en"] == "FY2026 results: profit up 16% on last year"
    assert ex["headline_bn"].startswith("2026 অর্থবছরের ফল")
    assert ex["full_year"] is True
    by_key = {l["key"]: l for l in ex["lines"]}
    assert "in the year to Jun 2026 was ৳31.24 a share" in by_key["profit"]["en"]
    assert "latest 3 months alone, it was ৳7.95" in by_key["quarter"]["en"]
    assert by_key["cash"]["en"].startswith("Cash from the business over the year: ৳18.65")
    assert "7× the year's profit (8.1× on the year before)" in by_key["price"]["en"]


def test_a_quarter_from_another_year_gives_no_fourth_quarter():
    from backend.services.results_explainer import full_year_result

    old_q3 = {**_sq_q3(), "period_start": date(2024, 7, 1)}
    assert full_year_result(_sq_annual(), old_q3)["eps_q"] is None
    assert full_year_result(_sq_annual(eps_prev=None)) is None


def test_the_newest_result_wins():
    from backend.services.results_explainer import newest_result

    assert newest_result(_sq_q3(), _sq_annual())["months"] == 12
    # The next year's first quarter beats last year's full year.
    q1 = _interim(quarter=1, months=3, period_end=date(2026, 9, 30), post_date=date(2026, 11, 12))
    assert newest_result(q1, _sq_annual())["quarter"] == 1
    assert newest_result(None, _sq_annual())["full_year"] is True
    assert newest_result(_sq_q3(), None)["quarter"] == 3


def test_newest_word_rules():
    from backend.services.results_explainer import full_year_result, is_newest_word

    year = full_year_result(_sq_annual())
    assert is_newest_word(year, {"last_reported_year": 2025})
    assert is_newest_word(year, {"last_reported_year": 2026})     # the provisional row itself
    assert not is_newest_word(year, {"last_reported_year": 2027})
    assert is_newest_word(_sq_q3(), {"interim_label_en": "9 months to Mar 2026"})
    assert not is_newest_word(_sq_q3(), {})


def test_a_loss_year_reads_as_a_year():
    from backend.services.results_explainer import full_year_result

    ex = explain(full_year_result(_sq_annual(eps=-1.2, eps_prev=0.8)), {"ltp": 20.0}, None, "GENERAL")
    assert ex["level"] == "bad"
    assert ex["meaning_en"].startswith("The company made a loss for the year.")
    assert next(l for l in ex["lines"] if l["key"] == "price")["en"].startswith("It made a loss for the year")
