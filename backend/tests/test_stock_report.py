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
                     "owners": "Buying", "cash": "Mostly", "safety": "Easily", "quality": "Excellent"}
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
    assert ty["headline"]["en"] == ("It made 16% more profit this year than a year before. "
                                   "Only January to March was a little weaker than last year.")
    assert ty["latest"]["headline"]["en"] == "It made 16% more profit in the year to Jun 2026 than a year before."
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
    assert ow["headline"]["en"].startswith("The people who run it are buying. The chairman, the managing director and a director bought more shares in January and February")
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
    assert pr["headline"]["en"] == "We think a fair price is between ৳229 and ৳343. At ৳219 today, it is cheaper than that."


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
    assert rf["headline"]["en"].startswith(f"Yes, {len(reds)} serious problems. The biggest: DSE visited the factory")
    assert rep["updated"]["reason"]["en"] == "after a DSE factory inspection"
    # The cover's watch-out leads with the first red flag, its acronym intact.
    assert rep["summary"][-1]["en"].startswith("Watch: DSE visited the factory")
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
    assert w["headline"]["en"] == "The price rose 60% in about a month, with no news from the company."
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


def test_story_skips_a_last_year_without_sales():
    # METROSPIN, 2026-10-29: the newest year had a profit line but no revenue,
    # and `None * 10` took the whole report down.
    from backend.services.stock_report import build_story

    ext = [{"year": y, "revenue": 1.0e9 * (1 + i / 10), "net_profit": 5.0e7, "total_equity": 8.0e8}
           for i, y in enumerate(range(2020, 2025))]
    ext.append({"year": 2025, "revenue": None, "net_profit": 4.0e7, "total_equity": 8.0e8})
    story = build_story({"sector_class": "GENERAL", "extended_financials": ext})
    assert story is not None
    # Measured from 2020 to 2024, the newest year with sales.
    assert story["growth"]["years"] == 4


# ---------------------------------------------------------------- the answer card

def _sig(signal, reason, tier="excellent", strength="normal"):
    return {"signal": signal, "reason_key": reason, "tier": tier, "strength": strength,
            "reason_en": "Reason.", "reason_bn": "কারণ।"}


def _answer(inp, sig):
    inp["signal"] = sig
    ans = sr.build_report(inp)["answer"]
    _all_bi(ans)
    return ans, {l["key"]: l for l in ans["lights"]}


def test_answer_buy_has_no_red_light():
    ans, lights = _answer(square(), _sig("buy", "quality_cheap", strength="strong"))
    assert ans["decision"] == "buy" and ans["word"]["en"] == "Buy" and ans["tone"] == "good"
    assert ans["blocker"] is None
    assert all(l["tone"] != "bad" for l in lights.values())
    assert lights["company"]["word"]["en"] == "Excellent"
    assert lights["price"]["word"]["en"] == "Very low"
    assert ans["line"]["en"] == "An excellent company at a very low price, and nothing serious is wrong."
    # The free line carries no figures; the buy price is a separate (Premium) field.
    assert not any(ch.isdigit() for ch in ans["line"]["en"])
    assert ans["buy_price"] == 229


def test_answer_waits_on_the_price():
    inp = square()
    inp["score_row"]["p4_val"] = 2.0
    ans, lights = _answer(inp, _sig("none", "quality_expensive", tier="good"))
    assert ans["decision"] == "wait" and ans["word"]["en"] == "Not yet" and ans["blocker"] == "price"
    assert lights["price"]["tone"] in ("fair", "bad")
    assert ans["line"]["en"] == "A good company, but the price is high right now."


def test_answer_near_yearly_top():
    ans, lights = _answer(square(), _sig("none", "near_52w_high"))
    assert ans["blocker"] == "price" and lights["price"]["word"]["en"] == "Near its yearly top"
    assert lights["price"]["tone"] == "fair"


def test_answer_names_the_blocking_risk():
    ans, lights = _answer(square(), _sig("none", "thin_trading"))
    assert ans["decision"] == "wait" and ans["blocker"] == "risks"
    assert lights["risks"]["tone"] == "bad" and lights["risks"]["word"]["en"] == "Yes: hard to sell"
    assert "selling can be hard" in ans["line"]["en"]


def test_report_red_flag_overrides_a_stale_buy():
    # The signal reads yesterday's snapshot; a red flag found today still
    # turns the card to "Not yet".
    inp = red_flag_company()
    inp["score_row"].update({"score": 80.0})
    ans, lights = _answer(inp, _sig("buy", "quality_cheap"))
    assert ans["decision"] == "wait" and ans["blocker"] == "risks"
    assert lights["risks"]["tone"] == "bad"
    assert ans["line"]["en"].startswith("An excellent company, but we found a serious problem: DSE visited the factory")


def test_answer_weak_and_average():
    ans, lights = _answer(red_flag_company(), _sig("sell", "weak_fundamentals", tier="weak"))
    assert ans["decision"] == "avoid" and ans["tone"] == "bad" and lights["company"]["tone"] == "bad"
    inp = square()
    inp["score_row"]["score"] = 50.0
    ans, _ = _answer(inp, _sig("none", "average_fundamentals", tier="average"))
    assert ans["decision"] == "no_reason" and ans["blocker"] == "company"


def test_safety_measures_for_the_loans_meter():
    m = sr.build_report(square())["sections"]["safety"]["measures"]
    assert m["saved_pct"] == 1 and m["mcap_pct"] == 0 and m["no_loans"] is False


# ---------------------------------------------------------------- the text diet

import re  # noqa: E402

# Bare market words the page must not show in an answer: the plain name leads
# (the frontend's lib/glossary.ts explains the word on a tap where it is shown).
_MARKET_WORDS = re.compile(r"\b(EPS|NOCFPS|NAV|P/E|ROE|TTM|YoY|CAGR)\b|ইপিএস|পিই|এনএভি")


def _texts(rep):
    for k, s in rep["sections"].items():
        for f in ("headline", "free_line", "word", "watch"):
            if s.get(f):
                yield f"{k}.{f}", s[f]
        for i, m in enumerate(s.get("meaning") or []):
            yield f"{k}.meaning[{i}]", m
        for i, m in enumerate(s.get("inside") or []):
            yield f"{k}.inside[{i}]", m
        for i, sc in enumerate(s.get("scenarios") or []):
            yield f"{k}.scenarios[{i}]", sc["label"]
        for i, r in enumerate(s.get("ranks") or []):
            yield f"{k}.ranks[{i}]", r["label"]
        for i, a in enumerate(s.get("items") or []):
            if isinstance(a, dict) and isinstance(a.get("why"), dict):
                yield f"{k}.items[{i}].why", a["why"]
    ans = rep.get("answer") or {}
    yield "answer.line", ans.get("line") or {"en": "", "bn": ""}
    for l in ans.get("lights") or []:
        yield f"answer.{l['key']}.word", l["word"]


def test_no_bare_market_words_on_screen():
    bank = square()
    bank.update({"code": "BRACBANK", "sector_class": "BANK", "sector": "Bank",
                 "extended_financials": [{"year": 2025, "total_equity": 9.98e10, "total_assets": 1e12,
                                          "revenue": None, "net_profit": 1e10, "operating_cf": 9e10}]})
    for inp in (square(), red_flag_company(), bank):
        rep = sr.build_report(inp)
        for where, b in _texts(rep):
            assert not _MARKET_WORDS.search(b["en"]), f"{where}: {b['en']}"
            assert not _MARKET_WORDS.search(b["bn"]), f"{where}: {b['bn']}"


# Plain reading (2026-10-30, user: "hard words and numbers"): an answer says
# what it means in everyday words — no ratio-speak, no ranks out of hundreds,
# and at most three figures in one answer.
_RATIO_SPEAK = re.compile(
    r"times (its|their) profit|out of 10\b|out of 100\b|\b\d+(st|nd|rd|th) of \d{2,}|\bpayout\b|\bmargin\b"
    r"|saved profit|covered \d|\d×|a share against|\bcheck(s)? (is|are)\b|\bQ[1-4]\b|\bFY\d{4}\b"
)
_NUM = re.compile(r"\d[\d,.]*")


def test_answers_read_plainly():
    bank = square()
    bank.update({"code": "BRACBANK", "sector_class": "BANK", "sector": "Bank",
                 "extended_financials": [{"year": 2025, "total_equity": 9.98e10, "total_assets": 1e12,
                                          "revenue": None, "net_profit": 1e10, "operating_cf": 9e10}]})
    for inp in (square(), red_flag_company(), bank):
        rep = sr.build_report(inp)
        for where, b in _texts(rep):
            assert not _RATIO_SPEAK.search(b["en"]), f"{where}: {b['en']}"
        for k, s in rep["sections"].items():
            assert len(_NUM.findall(s["headline"]["en"])) <= 3, f"{k}.headline: {s['headline']['en']}"
            for c in s.get("checks") or [] if isinstance(s.get("checks"), list) else []:
                assert not _RATIO_SPEAK.search(c["detail"]["en"]), f"{k}.{c['key']}: {c['detail']['en']}"
        for l in rep["answer"]["lights"]:
            if l["why"]:
                assert not _RATIO_SPEAK.search(l["why"]["en"]), f"answer.{l['key']}.why: {l['why']['en']}"


# ---------------------------------------------------------------- the full report (reads + Our view)

def test_reads_put_each_chapter_together():
    inp = square()
    inp["signal"] = _sig("buy", "quality_cheap")
    reads = sr.build_report(inp)["reads"]
    assert set(reads) == {"ch-company", "ch-price", "ch-risks", "ch-next"}
    _all_bi(reads)
    # The company read joins profit with cash, then loans and size.
    assert reads["ch-company"]["en"] == ("Its profit is growing, and most of it comes in as real money. "
                                         "It can pay its loans easily. It is one of the biggest companies in its sector.")
    assert "fair price is ৳229 to ৳343" in reads["ch-price"]["en"]
    # The next read follows the sentence that names the date.
    assert "this day" not in reads["ch-next"]["en"] and "by then" in reads["ch-next"]["en"]


def test_risks_read_names_the_serious_problem_first():
    inp = red_flag_company()
    inp["signal"] = _sig("none", "red_flag", tier="good")
    read = sr.build_report(inp)["reads"]["ch-risks"]["en"]
    assert read.startswith("We found 5 serious problems. The biggest: DSE visited the factory")


def test_view_buy_turns_the_signal_lines_into_prices():
    inp = square()
    inp["signal"] = _sig("buy", "quality_cheap")
    inp["range52"] = {"hi": 260.0, "lo": 180.0}
    v = sr.build_report(inp)["view"]
    _all_bi(v)
    # 180 + 85% of the 80-taka range = 248, the signal's near-the-top line.
    assert v["change"][0]["en"].startswith("If the price climbs past ৳248")
    assert v["buy_price"] == 229
    assert v["headline"]["en"].startswith("Our answer: Buy.")
    assert 1 <= len(v["for"]) <= 3 and 1 <= len(v["against"]) <= 3
    assert len(v["inside"]) == 4


def test_view_waits_on_a_red_flag():
    inp = red_flag_company()
    inp["signal"] = _sig("none", "red_flag", tier="good")
    v = sr.build_report(inp)["view"]
    assert v["change"] == [sr.bi("If the serious problem we found is resolved.", "যে গুরুতর সমস্যা পেয়েছি, তা মিটে গেলে।")]
    assert v["against"][0]["en"].startswith("DSE visited the factory")


def test_full_report_reads_plainly():
    for f, sig in ((square, _sig("buy", "quality_cheap")), (red_flag_company, _sig("none", "red_flag", tier="good"))):
        inp = f()
        inp["signal"] = sig
        inp["range52"] = {"hi": 260.0, "lo": 180.0}
        rep = sr.build_report(inp)
        texts = list(rep["reads"].values())
        v = rep["view"]
        texts += [v["headline"], *v["for"], *v["against"], *v["change"], *v["inside"]]
        for b in texts:
            for half in (b["en"], b["bn"]):
                assert not _MARKET_WORDS.search(half), half
            assert not _RATIO_SPEAK.search(b["en"]), b["en"]
            for sentence in re.split(r"(?<=[.;])\s", b["en"]):
                assert len(_NUM.findall(sentence)) <= 3, sentence


def test_answer_change_needs_two_days():
    from backend.services.stock_report_service import settled_answer_change

    buy, wait = sr.bi("Buy", "কেনা যায়"), sr.bi("Not yet", "এখন নয়")
    row = lambda d, dec, w: {"date": d, "decision": dec, "answer_word": w, "answer_line": sr.bi("x", "ক")}  # noqa: E731
    # Held two days after the change: news.
    ch = settled_answer_change([row("2026-10-29", "wait", wait), row("2026-10-28", "wait", wait), row("2026-10-27", "buy", buy)])
    assert ch and ch["from"] == buy and ch["to"] == wait and ch["day"] == "2026-10-29"
    # One day only, or no change: not news.
    assert settled_answer_change([row("2026-10-29", "wait", wait), row("2026-10-28", "buy", buy), row("2026-10-27", "buy", buy)]) is None
    assert settled_answer_change([row("2026-10-29", "buy", buy), row("2026-10-28", "buy", buy), row("2026-10-27", "buy", buy)]) is None
    assert settled_answer_change([row("2026-10-29", "wait", wait), row("2026-10-28", "wait", wait)]) is None


def test_watcher_answer_event():
    from backend.services.portfolio_watch import build_events, push_payload

    facts = {"answers": {"GP": {"day": "2026-10-29", "decision": "wait", "from": sr.bi("Buy", "কেনা যায়"),
                                "to": sr.bi("Not yet", "এখন নয়"),
                                "line": sr.bi("A good company, but the price is high right now.", "ক।")}}}
    events = build_events({}, facts, "2026-10-29", watched={"GP"})
    assert len(events) == 1 and events[0]["kind"] == "answer" and events[0]["level"] == "watch"
    assert events[0]["title_en"] == "Our answer on GP changed: Not yet"
    assert events[0]["body_en"] == "It was Buy. A good company, but the price is high right now."
    assert push_payload(events, "en")["url"] == "/stock/GP?src=watch#ch-answer"


def test_buy_price_never_above_the_stop_buy_line():
    # 2026-10-30: SQURPHARMA read "buy under ৳234" beside "past ৳227 we'd stop
    # calling it a Buy". The buy price is capped at the near-the-top line.
    inp = square()
    inp["signal"] = _sig("buy", "quality_cheap")
    inp["range52"] = {"hi": 230.0, "lo": 200.0}
    rep = sr.build_report(inp)
    # 200 + 85% of 30 = 225.5 → ৳226, under the ৳229 the fair price gives.
    assert rep["sections"]["price"]["buy_below"] == 226
    assert rep["answer"]["buy_price"] == 226 and rep["view"]["buy_price"] == 226
    assert rep["view"]["change"][0]["en"].startswith("If the price climbs past ৳226")


def test_next_questions_pair_each_free_answer_with_its_question():
    inp = square()
    inp["signal"] = _sig("buy", "quality_cheap")
    inp["range52"] = {"hi": 260.0, "lo": 180.0}
    rows = sr.build_report(inp)["next_questions"]
    _all_bi([{k: r[k] for k in ("word", "ask", "hint", "answer")} for r in rows])
    assert [r["key"] for r in rows] == ["answer", "price", "red_flags", "owners", "next"]
    assert rows[0]["word"]["en"] == "Buy" and rows[0]["ask"]["en"] == "Up to what price?"
    assert rows[0]["answer"]["en"].startswith("We would buy under ৳229.")
    assert rows[1]["word"]["en"] == "Low" and rows[1]["hint"]["en"] == "Our fair price, worked out 4 ways"
    assert rows[4]["word"]["en"] == "Results around 12 Nov"

    bad = red_flag_company()
    bad["signal"] = _sig("none", "red_flag", tier="good")
    rows = sr.build_report(bad)["next_questions"]
    assert rows[0]["ask"]["en"] == "What would change it?"
    assert [r["key"] for r in rows][:3] == ["answer", "price", "red_flags"]
    assert len(rows) <= 5
    # The card's words never use a bare market word or ratio-speak, and the
    # free half (word, ask, hint) carries no figure the free page doesn't show.
    for f, sig in ((square, _sig("buy", "quality_cheap")), (red_flag_company, _sig("none", "red_flag", tier="good"))):
        inp = f()
        inp["signal"] = sig
        for r in sr.build_report(inp)["next_questions"]:
            for k in ("ask", "hint", "answer"):
                b = r[k]
                if not b:
                    continue
                for half in (b["en"], b["bn"]):
                    assert not _MARKET_WORDS.search(half), half
                assert not _RATIO_SPEAK.search(b["en"]), b["en"]
