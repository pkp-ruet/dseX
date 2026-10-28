"""The stock report (services/stock_report.py) — pure builders on real-shaped
inputs: a Square Pharma-like company (figures from the DSE notices of FY2026),
a bank, a red-flag company like ACTIVEFINE, and a rumour rally."""
from datetime import date, datetime, timedelta

from backend.services import stock_report as sr
from backend.services.stock_report_service import new_red_flags

TODAY = date(2026, 10, 28)


def _trading_days(start: date, end: date):
    d = start
    while d <= end:
        if d.weekday() not in (4, 5):  # Fri, Sat
            yield d
        d += timedelta(days=1)


def _prices(base=213.0, drop_on=date(2025, 11, 17), after=203.2, recent=218.8):
    rows = []
    for d in _trading_days(date(2025, 10, 1), TODAY):
        if d < drop_on:
            p = base
        elif d < date(2026, 1, 1):
            p = after
        else:
            p = recent
        rows.append({"date": d.isoformat(), "ltp": p})
    return rows


def square() -> dict:
    """Square Pharmaceuticals as of 28 Oct 2026 (June fiscal year)."""
    fin = [
        {"year": 2021, "eps": 17.99, "nav_per_share": 102.54, "cash_dividend_pct": 60.0, "pe_ratio_basic": 11.98},
        {"year": 2022, "eps": 20.51, "nav_per_share": 116.70, "cash_dividend_pct": 100.0, "pe_ratio_basic": 10.57},
        {"year": 2023, "eps": 21.41, "nav_per_share": 129.95, "cash_dividend_pct": 105.0, "pe_ratio_basic": 9.80},
        {"year": 2024, "eps": 23.61, "nav_per_share": 142.05, "cash_dividend_pct": 110.0, "pe_ratio_basic": 8.93},
        {"year": 2025, "eps": 27.04, "nav_per_share": 157.88, "cash_dividend_pct": 120.0, "pe_ratio_basic": 7.73},
    ]
    ext = [  # ৳ — revenue, net profit, operating cash flow, equity (FY2021–FY2025)
        {"year": y, "revenue": r * 1e7, "net_profit": n * 1e7, "operating_cf": o * 1e7, "total_equity": e * 1e7,
         "total_assets": e * 1.05e7, "nocfps": None}
        for y, r, n, o, e in [(2021, 5835, 1479, 1098, 9000), (2022, 6641, 1615, 1287, 10300),
                              (2023, 6071, 1646, 855, 11500), (2024, 7010, 1833, 1853, 12600),
                              (2025, 7629, 2078, 1730, 13996)]
    ]
    interims = [
        {"quarter": 1, "period_start": date(2025, 7, 1), "period_end": date(2025, 9, 30), "months": 3,
         "eps_cum": 8.35, "eps_cum_prev": 6.87, "eps_q": 8.35, "eps_q_prev": 6.87,
         "nocfps_cum": 7.55, "nocfps_cum_prev": 3.89, "post_date": date(2025, 11, 13)},
        {"quarter": 2, "period_start": date(2025, 7, 1), "period_end": date(2025, 12, 31), "months": 6,
         "eps_cum": 16.56, "eps_cum_prev": 14.32, "eps_q": 8.20, "eps_q_prev": 7.45,
         "nocfps_cum": 13.16, "nocfps_cum_prev": 8.28, "post_date": date(2026, 2, 1)},
        {"quarter": 3, "period_start": date(2025, 7, 1), "period_end": date(2026, 3, 31), "months": 9,
         "eps_cum": 23.29, "eps_cum_prev": 21.15, "eps_q": 6.73, "eps_q_prev": 6.83,
         "nocfps_cum": 17.54, "nocfps_cum_prev": 11.90, "post_date": date(2026, 4, 30)},
    ]
    notices = {
        "annual": [{"fy_end": date(2026, 6, 30), "fy_year": 2026, "eps": 31.24, "eps_prev": 27.04,
                    "nav": 178.99, "nav_prev": 157.88, "nocfps": 18.65, "nocfps_prev": 19.52,
                    "post_date": date(2026, 10, 27)}],
        "interims": interims,
        "insider_trades": [
            {"side": "buy", "role": "managing director", "name": "Mr. Tapan Chowdhury", "shares": 2_000_000,
             "declared": date(2026, 1, 5), "done": date(2026, 2, 5), "status": "done"},
            {"side": "buy", "role": "director", "name": "Mrs. Ratna Patra", "shares": 1_000_000,
             "declared": date(2026, 1, 15), "done": date(2026, 2, 5), "status": "done"},
            {"side": "buy", "role": "chairman", "name": "Mr. Samuel S Chowdhury", "shares": 2_000_000,
             "declared": date(2026, 1, 20), "done": date(2026, 2, 23), "status": "done"},
        ],
        "ratings": [{"agency": "CRISL", "long_term": "AAA", "short_term": "ST-1", "outlook": "Stable",
                     "post_date": date(2025, 12, 14)}],
        "board_meetings": [
            {"meeting_date": date(2025, 11, 12), "purpose": "q1", "postponed": False},
            {"meeting_date": date(2026, 1, 29), "purpose": "q2", "postponed": False},
            {"meeting_date": date(2026, 4, 29), "purpose": "q3", "postponed": False},
            {"meeting_date": date(2026, 10, 26), "purpose": "annual", "postponed": False},
        ],
        "inspections": [], "queries": [], "category_changes": [],
    }
    holdings = [
        {"as_of_date": "2025-06-30", "sponsor_director_pct": 43.59, "institute_pct": 14.05, "foreign_pct": 15.14, "govt_pct": 0.0, "public_pct": 27.22},
        {"as_of_date": "2026-02-28", "sponsor_director_pct": 44.15, "institute_pct": 13.40, "foreign_pct": 15.50, "govt_pct": 0.0, "public_pct": 26.95},
        {"as_of_date": "Mar 31, 2026", "sponsor_director_pct": 44.15, "institute_pct": 13.61, "foreign_pct": 15.33, "govt_pct": 0.0, "public_pct": 26.91},
        {"as_of_date": "2026-09-30", "sponsor_director_pct": 44.15, "institute_pct": 13.94, "foreign_pct": 14.13, "govt_pct": 0.0, "public_pct": 27.78},
    ]
    ledger = [
        {"declaration_date": "2026-10-27", "record_date": "2026-11-16", "agm_date": "2026-12-15",
         "cash_pct": 130.0, "stock_pct": 0.0, "dividend_type": "Final", "period_end": "2026-06-30"},
        {"declaration_date": "2025-10-23", "record_date": "2025-11-16", "cash_pct": 120.0,
         "dividend_type": "Final", "period_end": "2025-06-30"},
    ]
    return {
        "code": "SQURPHARMA", "name": "Square Pharmaceuticals PLC.", "sector": "Pharmaceuticals & Chemicals",
        "sector_bn": "ওষুধ ও রসায়ন", "sector_class": "GENERAL", "category": "A", "face_value": 10.0,
        "loan_mn": 825.5, "reserve_mn": 129050.4, "today": TODAY, "as_of": "2026-10-28", "ltp": 218.8,
        "company": {"cash_dividends": [[2016, 40.0], [2017, 35.0], [2018, 36.0], [2019, 42.0], [2020, 47.0],
                                       [2021, 60.0], [2022, 100.0], [2023, 105.0], [2024, 110.0], [2025, 120.0]]},
        "score_row": {"score": 86.7, "p1_biz": 8.14, "p2_health": 7.92, "p3_moat": 9.4, "p4_val": 8.82, "p5_div": 9.58,
                      "current_pe": 7.5, "own_avg_pe": 9.8, "sector_median_pe": 22.17, "eps": 29.18,
                      "overall_rank": 3, "total_scored": 362, "market_cat": "A", "debt_level": "ok",
                      "data_age_years": 0, "mcap_mn": 193960.0},
        "momentum": {"avg_turnover_7d_mn": 58.68},
        "financials": fin, "extended_financials": ext, "holdings": holdings, "prices": _prices(),
        "news": [], "ledger": ledger,
        "calendar_row": {"record_date": "2026-11-16", "buy_by": "2026-11-11", "spot_starts": "2026-11-12",
                         "agm_date": "2026-12-15", "cash_pct": 130.0, "stock_pct": 0.0, "dividend_type": "Final",
                         "period_end": "2026-06-30", "declaration_date": "2026-10-27", "yield_pct": 5.94,
                         "cash_per_share": 13.0},
        "fair_value": {"low": 229.0, "high": 343.0, "center": 286.0, "estimates_disagree": False,
                       "methods": [{"label_en": "The dividend it pays", "label_bn": "এর দেওয়া ডিভিডেন্ড", "price": 217.0},
                                   {"label_en": "Its usual price compared with assets", "label_bn": "সম্পদ", "price": 273.0},
                                   {"label_en": "Its usual price compared with profit", "label_bn": "মুনাফা", "price": 286.0},
                                   {"label_en": "Similar companies, compared with profit", "label_bn": "তুলনা", "price": 429.0}]},
        "fair_value_fall": {"center": 251.0},
        "notices": notices, "notices_ok": True, "governance": [], "watch_items": [],
        "score_history": {"changes": []},
        "sector_rows": [
            {"trading_code": "SQURPHARMA", "score": 86.7, "current_pe": 7.5, "roe_pct": 17.1, "eps_yoy_pct": 14.5, "market_cat": "A"},
            {"trading_code": "BXPHARMA", "score": 70.0, "current_pe": 8.0, "roe_pct": 12.0, "eps_yoy_pct": 5.0, "market_cat": "A"},
            {"trading_code": "RENATA", "score": 55.0, "current_pe": 20.0, "roe_pct": 8.0, "eps_yoy_pct": -10.0, "market_cat": "A"},
            {"trading_code": "ACI", "score": 30.0, "current_pe": None, "roe_pct": -1.0, "eps_yoy_pct": -50.0, "market_cat": "A"},
        ],
        "sector_ext": {"SQURPHARMA": {"revenue": 7629e7, "net_profit": 2078e7}, "ACI": {"revenue": 13790e7, "net_profit": -40e7},
                       "BXPHARMA": {"revenue": 4439e7, "net_profit": 586e7}, "RENATA": {"revenue": 3771e7, "net_profit": 362e7}},
        "company_names": {"BXPHARMA": "Beximco Pharma"},
    }


def _all_bi(obj, path="report"):
    """Every {en, bn} pair has both halves filled."""
    if isinstance(obj, dict):
        if set(obj) == {"en", "bn"}:
            assert obj["en"], f"empty en at {path}"
            assert obj["bn"], f"empty bn at {path}"
            return
        for k, v in obj.items():
            _all_bi(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            _all_bi(v, f"{path}[{i}]")


def test_square_report_shape_and_numbers():
    rep = sr.build_report(square())
    assert rep["version"] == 1
    assert rep["updated"] == {"date": "2026-10-27", "reason": {"en": "after the FY2026 results",
                                                                "bn": "2026 অর্থবছরের ফল প্রকাশের পর"}}
    assert [c["key"] for c in rep["scorecard"]] == ["red_flags", "price", "dividend", "this_year",
                                                     "owners", "cash", "safety", "quality"]
    words = {c["key"]: c["word"]["en"] for c in rep["scorecard"]}
    assert words == {"red_flags": "None", "price": "Low", "dividend": "Rising", "this_year": "Growing",
                     "owners": "Buying", "cash": "Fair", "safety": "Very safe", "quality": "Excellent"}
    secs = rep["sections"]
    # The scorecard says the same thing as each section.
    for c in rep["scorecard"]:
        if c["key"] in secs:
            assert secs[c["key"]]["word"] == c["word"] and secs[c["key"]]["tone"] == c["tone"]
    assert len(rep["summary"]) == 3
    _all_bi(rep)
    # No private working fields ship.
    for s in secs.values():
        assert not [k for k in s if k.startswith("_")]


def test_square_this_year_quarters():
    ty = sr.build_report(square())["sections"]["this_year"]
    bars = {q["q"]: (q["cur"], q["prev"]) for q in ty["quarters"]}
    assert bars[1] == (8.35, 6.87) and bars[2] == (8.20, 7.45) and bars[3] == (6.73, 6.83)
    assert bars[4] == (round(31.24 - 23.29, 2), round(27.04 - 21.15, 2))
    assert ty["headline"]["en"] == "Three of four quarters beat last year. Only January to March slipped, ৳6.73 against ৳6.83."
    assert ty["latest"]["headline"]["en"] == "FY2026: profit up 16% to ৳31.24 a share"
    assert ty["next"]["date"] == "2026-11-12" and ty["next"]["approx"] is True and ty["next"]["beat"] == 8.35
    assert [q["label"]["en"] for q in ty["quarters"]] == ["Jul–Sep", "Oct–Dec", "Jan–Mar", "Apr–Jun"]


def test_square_cash_and_dividend():
    rep = sr.build_report(square())
    cash = rep["sections"]["cash"]
    assert [(y["year"], y["ratio"], y["basis"]) for y in cash["years"]][-2:] == [(2025, 83, "accounts"), (2026, 60, "notice")]
    assert cash["usual"] == 80
    assert any("April to June" in m["en"] for m in cash["meaning"])
    dv = rep["sections"]["dividend"]
    assert dv["latest"]["cash_ps"] == 13.0 and dv["latest"]["buy_by"] == "2026-11-11" and dv["latest"]["upcoming"]
    assert dv["payout_pct"] == round(13 / 31.24 * 100, 1)
    assert dv["cash_cover"] == round(18.65 / 13, 2)
    assert dv["on_10k"] == {"shares": 45, "gross": 585.0, "net": 526.5}
    r = dv["record_dates"][0]
    assert r["date"] == "2025-11-16" and r["price_before"] == 213.0 and r["price_after"] == 203.2
    assert r["net_ps"] == 10.8 and r["move"] == -9.8 and r["kept_ps"] == 1.0
    assert dv["history"][-1] == {"year": 2026, "cash_ps": 13.0}


def test_square_owners_and_red_flags():
    rep = sr.build_report(square())
    ow = rep["sections"]["owners"]
    assert ow["trade_counts"] == {"buys": 3, "sells": 0}
    assert ow["headline"]["en"].startswith("The chairman, the managing director and a director bought 5,000,000 shares in January and February")
    assert ow["rule30"] == {"pct": 44.15, "ok": True}
    rf = rep["sections"]["red_flags"]
    assert rf["counts"]["checks"] == len(rf["checks"]) == 16
    assert rf["counts"]["red"] == 0
    assert rf["counts"]["red"] + rf["counts"]["amber"] + rf["counts"]["pass"] == rf["counts"]["checks"]
    assert {c["key"] for c in rf["checks"] if c["level"] == "amber"} == {"cash", "investors"}
    # Red rows come first, then amber, then pass.
    order = [c["level"] for c in rf["checks"]]
    assert order == sorted(order, key={"red": 0, "amber": 1, "pass": 2}.get)


def test_price_section_and_scenarios():
    pr = sr.build_report(square())["sections"]["price"]
    assert pr["fair"] == {"low": 229.0, "high": 343.0, "center": 286.0}
    assert pr["gap_pct"] == -23 and pr["buy_below"] == 229
    assert pr["profit_fall"] == {"pct": 20, "center": 251.0}
    assert len(pr["scenarios"]) == 3
    bear, base, bull = (s["price"] for s in pr["scenarios"])
    assert bear < base < bull
    assert pr["headline"]["en"] == "Our fair range is ৳229 to ৳343. Today's ৳219 is 23% below its middle."


def test_offer_never_gives_the_answer():
    rep = sr.build_report(square())
    text = " ".join(o["en"] for o in rep["offer"])
    for answer in ("229", "343", "286", "107", "108", "Chairman", "chairman", "60"):
        assert answer not in text
    assert 4 <= len(rep["offer"]) <= 6
    # The "Premium shows you" lines never carry the answer either.
    for s in rep["sections"].values():
        for line in s["inside"]:
            assert "৳229" not in line["en"] and "৳343" not in line["en"]


def test_estimates_disagree_hides_the_range():
    inp = square()
    inp["fair_value"]["estimates_disagree"] = True
    pr = sr.build_report(inp)["sections"]["price"]
    assert pr["fair"] is None and pr["buy_below"] is None and pr["methods"] == []


def red_flag_company() -> dict:
    inp = square()
    inp.update({
        "code": "ACTIVEFINE", "category": "Z", "loan_mn": 4000.0, "reserve_mn": 2400.0, "ltp": 4.3,
        "score_row": {"score": 5.0, "p1_biz": 1.0, "p2_health": 0.5, "p3_moat": 2.0, "p4_val": 1.0, "p5_div": 0.5,
                      "current_pe": 39.1, "own_avg_pe": 14.6, "eps": 0.11, "market_cat": "Z",
                      "debt_level": "over_mcap", "data_age_years": 3, "stale_data": True,
                      "overall_rank": 339, "total_scored": 362},
        "momentum": {"avg_turnover_7d_mn": 1.2},
        "holdings": [{"as_of_date": "2024-02-29", "sponsor_director_pct": 12.04, "institute_pct": 10.0,
                      "foreign_pct": 0.0, "govt_pct": 0.0, "public_pct": 77.96}],
        "fair_value": None, "fair_value_fall": None, "calendar_row": None, "ledger": [],
        "company": {"cash_dividends": [[2021, 0.5], [2022, 0.3]]},
        "financials": [{"year": 2021, "eps": 0.16}, {"year": 2022, "eps": 0.11}],
        "extended_financials": [],
        "notices": {"interims": [], "insider_trades": [], "ratings": [], "board_meetings": [],
                    "inspections": [{"status": "closed", "visit_date": date(2026, 6, 25),
                                     "post_date": date(2026, 10, 28), "title": "Inspection of the factory premises"}],
                    "queries": [], "category_changes": []},
    })
    return inp


def test_red_flags_are_named_and_counted():
    rep = sr.build_report(red_flag_company())
    rf = rep["sections"]["red_flags"]
    reds = {c["key"] for c in rf["checks"] if c["level"] == "red"}
    assert {"factory", "category", "owners_30", "loans", "stale"} <= reds
    assert rf["word"]["en"] == f"{len(reds)} red flags" and rf["tone"] == "bad"
    assert rf["headline"]["en"].startswith(f"{len(reds)} red flags. The first: DSE found the factory closed")
    assert rep["updated"]["reason"]["en"] == "after a DSE factory inspection"
    # The cover's watch-out leads with the first red flag, its acronym intact.
    assert rep["summary"][-1]["en"].startswith("Watch: DSE found the factory closed")
    # No strength to report on a company this weak.
    assert rep["summary"][0]["en"].startswith("We found no clear strength")
    _all_bi(rep)


def test_lender_skips_loans_and_cash():
    inp = square()
    inp.update({"code": "BRACBANK", "sector_class": "BANK", "sector": "Bank",
                "extended_financials": [{"year": 2025, "total_equity": 9.98e10, "total_assets": 1e12,
                                         "revenue": None, "net_profit": 1e10, "operating_cf": 9e10}]})
    rep = sr.build_report(inp)
    assert "cash" not in rep["sections"]
    cash = next(c for c in rep["scorecard"] if c["key"] == "cash")
    assert cash["word"]["en"] == "Not used for banks" and cash["tone"] == "neutral"
    keys = {c["key"] for c in rep["sections"]["red_flags"]["checks"]}
    assert "loans" not in keys and "cash" not in keys
    safety = rep["sections"]["safety"]
    assert safety["facts"][0]["label"]["en"] == "Its own money behind its lending"
    assert rep["sections"]["dividend"]["cash_cover"] is None


def test_rumour_rally_warning():
    inp = square()
    rows = _prices()
    # The last 20 trading days climb 60% with no news.
    for i, r in enumerate(rows[-21:]):
        r["ltp"] = round(100 * (1 + 0.6 * i / 20), 2)
    inp["prices"] = rows
    inp["score_row"] = {**inp["score_row"], "score": 40.0}
    inp["notices"]["queries"] = [{"no_undisclosed": True, "post_date": TODAY - timedelta(days=5)}]
    w = sr.build_warning(inp)
    assert w["level"] == "red"
    assert w["headline"]["en"] == "The price rose 60% in 20 trading days with no news from the company."
    assert any("DSE asked about the unusual price move" in l["en"] for l in w["lines"])
    rf = sr.build_report(inp)["sections"]["red_flags"]
    q = next(c for c in rf["checks"] if c["key"] == "dse_query")
    assert q["level"] == "red"


def test_no_rally_when_the_company_posted_news():
    inp = square()
    rows = _prices()
    for i, r in enumerate(rows[-21:]):
        r["ltp"] = round(100 * (1 + 0.6 * i / 20), 2)
    inp["prices"] = rows
    inp["news"] = [{"title": "SQURPHARMA: Q1 Financials", "post_date": datetime(2026, 10, 20)}]
    assert sr.build_warning(inp) is None


def test_new_red_flags_diff():
    prev = {"GP": ["category"], "BATBC": []}
    cur = {"GP": {"keys": ["category", "factory"], "lines": {"factory": {"en": "DSE found the factory closed.", "bn": "ক"}}},
           "BATBC": {"keys": [], "lines": {}},
           "NEWCO": {"keys": ["stale"], "lines": {}}}
    assert new_red_flags(prev, cur) == {"GP": [{"key": "factory", "en": "DSE found the factory closed.", "bn": "ক"}]}


def test_money_formats():
    assert sr.money(218.8) == "৳219" and sr.money(45.62) == "৳45.6" and sr.money(1234.4) == "৳1,234"
    assert sr.tk2(13) == "৳13.00"
    assert sr._crore(1075.0) == ("৳108 crore", "৳108 কোটি")
    assert sr._crore(58.68) == ("৳5.9 crore", "৳5.9 কোটি")
    assert sr._crore(1.2) == ("৳12 lakh", "৳12 লাখ")


def test_watcher_red_flag_event():
    from backend.services.portfolio_watch import build_events, digest, kinds_phrase, push_payload

    facts = {"red_flags": {"GP": {"day": "2026-10-28", "items": [
        {"key": "factory", "en": "DSE found the factory closed or not producing (visited 25 Jun 2026).",
         "bn": "ডিএসই কারখানা বন্ধ পেয়েছে।"},
        {"key": "category", "en": "Category Z: it missed a dividend or an AGM.", "bn": "Z ক্যাটাগরি।"}]}}}
    # A followed (watch-only) stock gets the event too.
    events = build_events({}, facts, "2026-10-28", watched={"GP"})
    assert len(events) == 1
    e = events[0]
    assert e["kind"] == "red_flag" and e["level"] == "bad" and e["code"] == "GP"
    assert e["id"] == "redflag-GP-category-factory-2026-10-28"
    assert e["body_en"].endswith("1 more on its report.")
    d = digest(events)
    assert d["kinds"] == [{"kind": "red_flag", "count": 1}]
    assert kinds_phrase(d["kinds"], "en") == "1 red flag"
    assert push_payload(events, "en")["url"] == "/stock/GP?src=watch#red-flags"


# A free reader sees each closed Premium panel as its "Premium shows you"
# lines (ReportSection's PremiumPanel), so every section carries one to three,
# each a plain sentence pair.
def test_every_section_says_what_premium_shows():
    for inp in (square(), red_flag_company()):
        rep = sr.build_report(inp)
        for key, sec in rep["sections"].items():
            assert 1 <= len(sec["inside"]) <= 3, key
            for line in sec["inside"]:
                assert set(line) == {"en", "bn"} and line["en"] and line["bn"], (key, line)
