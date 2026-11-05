"""The second batch of research reports: who is buying, is the profit real,
dividends you can count on."""
from datetime import date

from backend.services import research_dividends as rd
from backend.services import research_owners as ro
from backend.services import research_quality as rq

INFO = {c: {"name": f"{c} Ltd", "sector": "Textile", "tier": "good", "price": 10.0, "mcap_mn": 1000.0,
            "graded": True, "sector_class": "GENERAL"} for c in ("AAA", "BBB", "CCC", "DDD")}
INFO["FUND"] = {"name": "A Fund", "graded": False}
INFO["BANK1"] = {**INFO["AAA"], "sector_class": "BANK"}
TODAY = date(2026, 11, 5)


# ---------------------------------------------------------------- owners

def _trade(side, shares, done=None, declared=None, status="done"):
    return {"side": side, "role": "sponsor", "name": "X", "shares": shares,
            "declared": declared, "done": done, "status": status, "by_date": None, "market": "public"}


def test_trades_net_per_company_and_split_open_declarations():
    trades = {
        "AAA": [_trade("buy", 1000, date(2026, 10, 1)), _trade("buy", 500, date(2026, 9, 1)),
                _trade("sell", 200, date(2026, 8, 1))],
        "BBB": [_trade("sell", 3000, date(2026, 10, 2)),
                _trade("sell", 100, declared=date(2026, 10, 30), status="declared"),
                _trade("buy", 100, declared=date(2026, 6, 1), status="declared")],
        "FUND": [_trade("sell", 9999, date(2026, 10, 1))],
    }
    t = ro.trade_rows(trades, INFO, TODAY)
    assert [(r["code"], r["net_shares"], r["net_tk"]) for r in t["buying"]] == [("AAA", 1300, 13000)]
    assert [(r["code"], r["net_shares"]) for r in t["selling"]] == [("BBB", -3000)]
    assert [r["code"] for r in t["pending"]] == ["BBB"] and t["pending"][0]["side"] == "sell"
    assert [r["code"] for r in t["lapsed"]] == ["BBB"] and t["lapsed"][0]["side"] == "buy"


def _hold(day, sponsor, inst, foreign, govt=0.0):
    return {"as_of_date": day, "sponsor_director_pct": sponsor, "institute_pct": inst,
            "foreign_pct": foreign, "govt_pct": govt}


def test_moves_read_month_quarter_and_year():
    rows = [_hold("2026-09-30", 31, 20, 2), _hold("2026-08-31", 31, 18, 2),
            _hold("2026-06-30", 30, 16, 1), _hold("2025-09-30", 29, 10, 1)]
    mv = ro.moves(rows)
    assert mv["month"] == {"sponsor": 0, "institute": 2, "foreign": 0}
    assert mv["quarter"] == {"sponsor": 1, "institute": 4, "foreign": 1}
    assert mv["year"]["institute"] == 10
    assert ro.moves([_hold("2026-09-30", 31, 20, 2)])["month"] is None


def test_ownership_lists_money_agreement_and_the_30_rule():
    holdings = {
        "AAA": [_hold("2026-09-30", 40, 20, 2), _hold("2026-08-31", 40, 18, 2), _hold("2026-06-30", 39, 15, 1)],
        "BBB": [_hold("2026-09-30", 25, 5, 0), _hold("2026-08-31", 25, 6, 0), _hold("2025-09-30", 27, 6, 0)],
        "CCC": [_hold("2026-09-30", 0, 5, 0), _hold("2026-08-31", 0, 5, 0)],      # 0 = missing, not "under 30"
        "DDD": [_hold("2026-09-30", 10, 5, 0, govt=60), _hold("2026-08-31", 10, 5, 0, govt=60)],  # govt-owned
        "FUND": [_hold("2026-09-30", 10, 90, 0), _hold("2026-08-31", 10, 50, 0)],
    }
    o = ro.ownership_lists(holdings, INFO)
    assert [(r["code"], r["pp"], r["tk"]) for r in o["institute"]["in"]] == [("AAA", 2, 20_000_000)]
    assert [r["code"] for r in o["institute"]["out"]] == ["BBB"]
    assert [(r["code"], r["groups"]) for r in o["agree"]["buying"]] == [("AAA", ["sponsor", "institute", "foreign"])]
    assert [(r["code"], r["trend"]) for r in o["under30"]] == [("BBB", "down")]
    assert o["month"] == "2026-09"


# ---------------------------------------------------------------- earnings quality

def _yr(y, profit, ocf, capex=-10.0, ebit=None, revenue=1000.0, debt=100.0, assets=2000.0, doubt=False):
    return {"year": y, "profit": profit, "ocf": ocf, "capex": capex, "ebit": ebit if ebit is not None else profit,
            "revenue": revenue, "debt": debt, "assets": assets, "doubt": doubt}


def test_labels_follow_cash_per_100_of_profit():
    assert [rq.label_for(v) for v in (120, 90, 89, 50, 49, 0, -1)] == \
        ["backed", "backed", "partly", "partly", "paper", "paper", "none"]


def test_company_quality_reads_cash_dividends_and_loans():
    ys = [_yr(2021, 100, 40, debt=100, revenue=1000), _yr(2022, 100, 40), _yr(2023, 100, 40, ebit=30),
          _yr(2024, 100, 40, ebit=30, debt=400, revenue=1050)]
    q = rq.company_quality(ys, {2021: 50, 2022: 50, 2023: 50, 2024: 50})
    assert (q["label"], q["cash_per_100"], q["core_per_100"]) == ("paper", 40, 30)
    assert q["flags"] == ["paper", "outside", "dividend_unfunded", "debt_up"]
    assert rq.company_quality(ys[:2], {}) is None                   # too few years


def test_misread_cash_lines_are_left_out_not_guessed():
    burning = [_yr(y, 20, -200) for y in (2021, 2022, 2023)]
    assert rq.company_quality(burning, {})["label"] == "doubtful"
    every_year = [_yr(y, 100, -10) for y in (2021, 2022, 2023)]
    assert rq.company_quality(every_year, {2021: 5, 2022: 5, 2023: 5})["label"] == "doubtful"
    assert rq.company_quality(every_year, {2021: 5})["label"] == "none"
    # A year whose two cash figures disagree is dropped.
    mixed = [_yr(2021, 100, 95), _yr(2022, 100, 95), _yr(2023, 100, -500, doubt=True), _yr(2024, 100, 95)]
    q = rq.company_quality(mixed, {})
    assert (q["n_years"], q["label"]) == (3, "backed")


def test_quality_report_skips_lenders_funds_and_stale():
    rows = {"AAA": [_yr(y, 1e9, 1.2e9) for y in (2022, 2023, 2024)],
            "BBB": [_yr(y, 100, 120) for y in (2019, 2020, 2021)],
            "BANK1": [_yr(y, 100, 120) for y in (2022, 2023, 2024)],
            "FUND": [_yr(y, 100, 120) for y in (2022, 2023, 2024)]}
    r = rq.quality_report(rows, {}, INFO)
    assert [i["code"] for i in r["items"]] == ["AAA"]
    assert r["skipped"]["lenders"] == 1 and r["skipped"]["stale"] == 1
    assert r["counts"]["backed"] == 1 and r["lists"]["best"] == ["AAA"]


# ---------------------------------------------------------------- dividends

def test_dividend_moves_and_bonus_restatement():
    rec = rd.record({2021: {"cash_pct": 20, "stock_pct": 10}, 2022: {"cash_pct": 15, "stock_pct": 10},
                     2023: {"cash_pct": 10, "stock_pct": 0}})
    assert rd.latest_move(rec) == "cut"
    assert rd.bonus_instead(rec)
    orig = rd.per_original_share(rec)
    # ৳2.00 on one share; the 10% bonuses make it 1.21 shares by 2023: ৳1 × 1.21.
    assert [o["tk"] for o in orig] == [2.0, 1.65, 1.21]
    assert rd.latest_move(rd.record({2024: {"cash_pct": 10}, 2025: {"cash_pct": 0}})) == "skipped"
    assert rd.latest_move(rd.record({2024: {"cash_pct": 0}, 2025: {"cash_pct": 5}})) == "back"
    assert rd.latest_move(rd.record({2024: {"cash_pct": 10}, 2025: {"cash_pct": 10.05}})) == "same"


def test_dividend_report_lists():
    five = lambda pct: {y: {"cash_pct": pct, "stock_pct": 0} for y in range(2021, 2026)}  # noqa: E731
    years = {"AAA": five(30), "BBB": five(30), "CCC": {**five(30), 2025: {"cash_pct": 10, "stock_pct": 0}},
             "FUND": five(50)}
    safe = {"level": "safe", "word_en": "Looks steady", "word_bn": "স্থিতিশীল", "line_en": "x", "line_bn": "x"}
    risk = {**safe, "level": "risk", "word_en": "At risk"}
    r = rd.dividend_report(years, {"AAA": safe, "BBB": safe, "CCC": risk}, {"AAA": 5.0, "BBB": 8.0, "CCC": 4.0},
                           {"BBB": "paper"}, INFO, {})
    assert r["lists"]["steady"] == ["AAA"]                       # BBB's profit is mostly on paper
    assert r["lists"]["at_risk"] == ["CCC"] and r["lists"]["cut"] == ["CCC"]
    assert r["counts"]["every_year"] == 3
    aaa = next(i for i in r["items"] if i["code"] == "AAA")
    assert aaa["yield_after_tax"] == 4.5 and len(aaa["per_original"]) == 2
