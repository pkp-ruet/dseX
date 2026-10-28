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
