"""Recommendation engine — the pure rules (backend/services/recommend.py)."""
from backend.services import recommend as rc
from backend.services import research_lists as rl

PHARMA, BANK, TELECOM, CEMENT, IT = "Pharmaceuticals & Chemicals", "Bank", "Telecommunication", "Cement", "IT Sector"
LV = {"quality": 2, "price": 2, "dividends": 1, "growth": 1, "safety": 1, "trading": 2}


def F(code, **kw):
    f = {"code": code, "name": f"{code} Ltd", "sector": PHARMA, "sector_class": "GENERAL",
         "score": 80.0, "p4_val": 8.0, "pct_in_range": 40.0, "cat": "A", "signal": "buy", "eps": 5.0,
         "data_completeness": 0.95, "debt_level": "ok", "p5_consist": 10.0, "mcap_mn": 20000.0,
         "ltp": 100.0, "eps_yoy_pct": 10.0, "div_yield_pct": 3.0}
    f.update(kw)
    return f


def gated(facts, gov=None):
    return rl.run_list(rc.gate_list(), facts, rl.Ctx(governance=gov or (lambda code: [])))


def with_conviction(fs, levels=None):
    for f in fs:
        f["conviction"] = rc.conviction(f, (levels or {}).get(f["code"], LV))
    return fs


def profile(held=(), watched=(), facts=None, levels=None, sig="buy_more", pool=None, stated=None):
    """held = [(code, value)]; watched = [code]."""
    mine = [{"code": c, "held": True, "watched": False, "value": v, "holding_signal": sig} for c, v in held]
    mine += [{"code": c, "held": False, "watched": True, "value": 0.0, "holding_signal": None} for c in watched]
    return rc.build_profile(mine, facts or {}, levels or {}, stated, pool)


# ---------------------------------------------------------------------------
# Gate
# ---------------------------------------------------------------------------

def test_gate_needs_a_buy_a_profit_clean_news_loans_under_savings_and_enough_data():
    facts = [
        F("OK"),
        F("NOBUY", signal="none"),
        F("LOSS", eps=-0.5),
        F("WARNED"),
        F("LOANS", debt_level="over_reserve"),
        F("BANKLOANS", sector=BANK, sector_class="BANK", debt_level="over_reserve"),
        F("THIN", data_completeness=0.4),
        F("UNRATED", score=None),
    ]
    run = gated(facts, gov=lambda code: [{"en": "Qualified opinion", "bn": "x"}] if code == "WARNED" else [])
    assert sorted(f["code"] for f in run["passed"]) == ["BANKLOANS", "OK"]
    summary = rc.funnel_summary(run)
    assert summary["rated"] == 7 and summary["buys"] == 6 and summary["passed"] == 2
    assert [c["left"] for c in summary["checks"]] == [6, 5, 4, 3, 2]


def test_a_poor_stock_of_the_readers_never_comes_back_as_a_pick():
    facts = [F("GOOD"), F("WEAKONE", score=30.0, signal="sell")]
    cands = with_conviction(gated(facts)["passed"])
    prof = profile(watched=["WEAKONE"], facts={f["code"]: f for f in facts}, levels={"WEAKONE": LV})
    codes = [i["code"] for i in rc.recommend(cands, {"GOOD": LV}, prof, {f["code"]: f for f in facts})]
    assert codes == ["GOOD"]


# ---------------------------------------------------------------------------
# Conviction
# ---------------------------------------------------------------------------

def test_conviction_rewards_quality_price_and_safety():
    base = rc.conviction(F("A"), LV)
    assert rc.conviction(F("A", score=90.0), LV) > base
    assert rc.conviction(F("A", p4_val=9.5), LV) > base
    assert rc.conviction(F("A", cat="B"), LV) < base
    assert rc.conviction(F("A", strength="strong"), LV) == round(base + 3, 1)
    assert rc.conviction(F("A", interim_nocfps=-1.0), LV) == round(base - 5, 1)
    # A bank's cash line is its deposits moving — no penalty.
    bank = F("B", sector_class="BANK")
    assert rc.conviction({**bank, "interim_nocfps": -1.0}, LV) == rc.conviction(bank, LV)


def test_conviction_reads_this_years_quarter_before_the_last_full_year():
    up = rc.conviction(F("A", eps_yoy_pct=-5.0, interim_eps_yoy_pct=20.0), LV)
    down = rc.conviction(F("A", eps_yoy_pct=20.0, interim_eps_yoy_pct=-5.0), LV)
    assert up > down


# ---------------------------------------------------------------------------
# Fit — each kind names the reader's own stock
# ---------------------------------------------------------------------------

def _one(cand, prof, facts, levels=None):
    cands = with_conviction([cand])
    return rc.recommend(cands, levels or {cand["code"]: LV}, prof, facts)


def test_a_followed_stock_with_a_buy_comes_back_as_on_your_watchlist():
    c = F("SQUR")
    [it] = _one(c, profile(watched=["SQUR"], facts={"SQUR": c}), {"SQUR": c})
    assert it["kind"] == "watched" and it["tag_en"] == "On your watchlist"


def test_add_more_only_for_a_buy_more_holding_under_a_fifth_of_the_money():
    c, other = F("SQUR"), F("ROBI", sector=TELECOM)
    facts = {"SQUR": c, "ROBI": other, "CEM": F("CEM", sector=CEMENT)}
    small = profile(held=[("SQUR", 1000.0), ("ROBI", 3000.0), ("CEM", 6000.0)], facts=facts)
    assert _one(c, small, facts)[0]["kind"] == "add_more"
    big = profile(held=[("SQUR", 3000.0), ("ROBI", 3500.0), ("CEM", 3500.0)], facts=facts)
    assert _one(c, big, facts) == []
    no_signal = profile(held=[("SQUR", 1000.0), ("ROBI", 3000.0), ("CEM", 6000.0)], facts=facts, sig="none")
    assert _one(c, no_signal, facts) == []


def test_a_stronger_company_in_the_same_business_as_a_weak_one_names_it():
    weak = F("ACI", score=29.0, signal="sell")
    c = F("SQUR", score=87.0)
    [it] = _one(c, profile(watched=["ACI"], facts={"ACI": weak, "SQUR": c}), {"ACI": weak, "SQUR": c})
    assert it["kind"] == "upgrade" and it["anchor"] == "ACI"
    assert it["tag_en"] == "Stronger than ACI"
    # Said in group words, not bare scores: theirs, then this one.
    assert it["why_en"] == ("It is in the same business as ACI, which we grade mostly weak. "
                            "This one we grade strong all round.")
    assert "ACI" in it["why_bn"] and "সব দিকে শক্তিশালী" in it["why_bn"]


def test_same_business_as_a_good_stock_reads_like_it():
    mine = F("BXP", score=70.0, signal="none")
    c = F("SQUR")
    [it] = _one(c, profile(watched=["BXP"], facts={"BXP": mine, "SQUR": c}), {"BXP": mine, "SQUR": c})
    assert it["kind"] == "similar" and it["anchor"] == "BXP" and it["tag_en"] == "Like BXP"
    assert "you follow" in it["why_en"]


def test_a_sector_holding_too_much_of_their_money_gets_no_more_picks():
    mine = F("SQUR")
    facts = {"SQUR": mine}
    prof = profile(held=[("SQUR", 5000.0)], facts=facts, sig="none")
    assert _one(F("IBN"), prof, facts) == []
    [it] = _one(F("CEM", sector=CEMENT), prof, facts)
    assert it["kind"] == "new_area" and "Cement" in it["why_en"]


def test_banks_finance_and_insurers_count_as_one_group_when_over_half():
    facts = {"EBL": F("EBL", sector=BANK, sector_class="BANK"),
             "CITY": F("CITY", sector="Insurance", sector_class="INSURANCE"),
             "SQUR": F("SQUR")}
    prof = profile(held=[("EBL", 4000.0), ("CITY", 3000.0), ("SQUR", 3000.0)], facts=facts, sig="none")
    assert prof["fin_heavy"]
    assert _one(F("IDLC", sector="Financial Institutions", sector_class="NBFI"), prof, facts) == []


def test_a_shared_strength_counts_only_when_todays_picks_dont_all_have_it():
    a, b = F("A", sector=CEMENT), F("B", sector=CEMENT)
    payers = {"dividends": 2}
    levels = {"A": payers, "B": payers}
    rare = profile(watched=["A", "B"], facts={"A": a, "B": b}, levels=levels, pool=[{}, {}, {}, payers])
    assert [t["en"] for t in rare["traits"]] == ["Pays 4%+ a year"]
    common = profile(watched=["A", "B"], facts={"A": a, "B": b}, levels=levels, pool=[payers] * 4)
    assert common["traits"] == []

    c = F("X", sector=TELECOM)
    [it] = _one(c, rare, {"A": a, "B": b, "X": c}, levels={"X": {"dividends": 2}})
    assert it["kind"] == "style" and it["why_en"] == (
        "Pays 4%+ a year, like 2 of your 2 stocks. We grade it strong all round, and its price is low.")


def test_quiz_answers_are_strengths_the_reader_asked_for():
    prof = profile(stated={"dividend": "income_focused", "sectors": [CEMENT]})
    assert prof["traits"][0]["asked"] and prof["traits"][0]["key"] == "dividends"
    assert prof["asked_sectors"] == {CEMENT}
    [it] = _one(F("CEM", sector=CEMENT), prof, {})
    assert it["kind"] == "asked" and it["tag_en"] == "Your sector"
    # Asking for a sector lifts its cap: five banks when banks were asked for.
    banks = with_conviction([F(f"BK{i}", sector=BANK, sector_class="BANK", score=85.0 - i) for i in range(5)])
    asked = profile(stated={"sectors": [BANK]})
    assert len(rc.recommend(banks, {}, asked, {})) == 5
    assert len(rc.recommend(banks, {}, rc.empty_profile(), {})) == 3


def test_a_reader_with_no_stocks_gets_reasons_from_what_stands_out():
    payer = F("PAY", div_yield_pct=6.0)
    grower = F("GROW", sector=TELECOM, interim_eps_yoy_pct=30.0, interim_label_en="6 months to Jun 2026",
               interim_label_bn="জুন 2026 পর্যন্ত 6 মাস")
    cands = with_conviction([payer, grower], {"PAY": {**LV, "dividends": 2}, "GROW": LV})
    items = rc.recommend(cands, {"PAY": {**LV, "dividends": 2}, "GROW": LV}, rc.empty_profile(), {})
    why = {i["code"]: i["why_en"] for i in items}
    assert {i["kind"] for i in items} == {"top"}
    assert why["PAY"].endswith("and it pays 6% a year in cash.")
    assert "profit up 30%" in why["GROW"]
    # The fact the reason already says is not repeated in the number lines.
    pay = next(i for i in items if i["code"] == "PAY")
    assert not any("a year in cash" in p["en"] for p in pay["points"])


def test_add_more_says_how_much_of_their_money_it_is():
    c, other = F("SQUR"), F("ROBI", sector=TELECOM)
    facts = {"SQUR": c, "ROBI": other, "CEM": F("CEM", sector=CEMENT)}
    prof = profile(held=[("SQUR", 1000.0), ("ROBI", 3000.0), ("CEM", 6000.0)], facts=facts)
    [it] = _one(c, prof, facts)
    assert it["why_en"].startswith("You already own it, and it is only 10% of your money.")
    assert "5 of our checks" in it["why_en"] and "10%" in it["why_bn"]


def test_a_new_sector_names_where_their_money_sits_now():
    mine = F("SQUR")
    prof = profile(held=[("SQUR", 5000.0)], facts={"SQUR": mine}, sig="none")
    [it] = _one(F("CEM", sector=CEMENT), prof, {"SQUR": mine})
    assert it["why_en"] == f"100% of your money is in {PHARMA}. This one adds Cement, a business none of your stocks are in."


# ---------------------------------------------------------------------------
# The case — the same parts for every pick (the "Picked for you" page)
# ---------------------------------------------------------------------------

def _pick(c, levels=None):
    [it] = rc.recommend(with_conviction([c]), {c["code"]: levels or LV}, rc.empty_profile(), {})
    return it


def test_every_pick_carries_the_same_four_facts():
    it = _pick(F("A", p1_biz=8.0, p2_health=7.5, p3_moat=5.0, p5_div=3.0, current_pe=9.0, own_avg_pe=13.0,
                 sector_median_pe=15.0, interim_eps_yoy_pct=18.0, interim_label_en="6 months to Jun 2026",
                 interim_label_bn="জুন 2026 পর্যন্ত 6 মাসে", div_yield_pct=5.9, cash_per_10k=590, paid_years=5))
    rows = {r["key"]: r for r in it["facts"]}
    assert list(rows) == ["company", "price", "profit", "cash"]
    assert rows["company"]["value"]["en"] == "Strong all round"
    assert rows["company"]["note"]["en"] == "Strong on profit and finances; fair on business strength; weaker on dividends."
    assert rows["price"]["value"]["en"] == "Low price"
    assert rows["price"]["note"]["en"] == "You pay 9 years of its profit. It usually costs 13; similar companies cost 15."
    assert rows["profit"]["value"]["en"] == "Up 18%"
    assert rows["profit"]["note"]["en"] == "In the 6 months to Jun 2026, against the same months a year before."
    assert rows["cash"]["value"]["en"] == "5.9% a year"
    assert rows["cash"]["note"]["en"] == "About ৳590 a year on every ৳10,000, before tax. Paid cash in each of the last 5 years."
    for r in it["facts"]:
        assert r["label"]["bn"] and r["value"]["bn"]
        assert not any(d in (r["value"]["bn"] + ((r["note"] or {}).get("bn") or "")) for d in "০১২৩৪৫৬৭৮৯")


def test_a_pick_with_no_new_profit_figure_or_dividend_still_shows_the_row():
    it = _pick(F("A", eps_yoy_pct=None, div_yield_pct=None))
    rows = {r["key"]: r for r in it["facts"]}
    assert rows["profit"]["value"]["en"] == "No new figure" and rows["profit"]["tone"] == "neutral"
    assert rows["cash"]["value"]["en"] == "None lately"


def test_keywords_say_group_price_and_what_stands_out():
    it = _pick(F("A", div_yield_pct=6.0, strength="strong"))
    assert [k["en"] for k in it["keywords"]] == ["Strong all round", "Very low price", "Pays 6% a year"]
    grower = _pick(F("B", score=65.0, div_yield_pct=1.0, interim_eps_yoy_pct=30.0))
    assert [k["en"] for k in grower["keywords"]] == ["Mostly strong", "Low price", "Profit up 30%"]
    fair = _pick(F("C", reason_key="excellent_fair_price", div_yield_pct=1.0, eps_yoy_pct=2.0))
    assert fair["keywords"][1]["en"] == "Fair price" and fair["price_word"] == "fair"


def test_fair_range_only_when_it_agrees_with_the_pick():
    ok = _pick(F("A", fair_value={"low": 90.0, "high": 140.0, "estimates_disagree": False}))
    assert ok["fair"] == {"low": 90.0, "high": 140.0}
    assert _pick(F("B", fair_value={"low": 60.0, "high": 80.0}))["fair"] is None  # price 100 is over it
    assert _pick(F("C", fair_value={"low": 90.0, "high": 140.0, "estimates_disagree": True}))["fair"] is None


def test_check_lines_give_each_passed_check_its_own_figure():
    c = F("A", turnover_mn=24.0, pct_below_high=35.0)
    vals = rl.check_values(rc.gate_list(), c, rl.Ctx(governance=lambda code: []))
    lines = rc.check_lines(c, vals)
    assert [l["key"] for l in lines] == ["buy", "profitable", "no_governance", "debt_ok", "enough_data"]
    assert len(lines) == rc.N_CHECKS
    assert lines[0]["value"]["en"] == ("Strong all round, and its price is low. "
                                       "৳2.4 crore traded a day, 35% under its 1-year high.")
    assert lines[1]["value"]["en"] == "Earns ৳5 a share"
    # A failed check is never listed.
    loss = F("L", eps=-1.0)
    assert "profitable" not in [l["key"] for l in rc.check_lines(loss, rl.check_values(rc.gate_list(), loss, rl.Ctx(governance=lambda code: [])))]


def test_counts_describe_the_whole_list():
    items = [{"kind": "add_more", "strong": True, "new": True}, {"kind": "top", "strong": False, "new": False},
             {"kind": "watched", "strong": False, "new": True}]
    assert rc.counts(items) == {"total": 3, "new": 2, "own": 2, "strong": 1}


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

def test_caps_per_sector_and_for_banks_finance_and_insurers():
    cands = [F(f"PH{i}", score=90.0 - i) for i in range(5)]
    cands += [F(f"BK{i}", sector=BANK, sector_class="BANK", score=85.0 - i) for i in range(3)]
    cands += [F(f"IN{i}", sector="Insurance", sector_class="INSURANCE", score=84.0 - i) for i in range(3)]
    cands += [F(f"FI{i}", sector="Financial Institutions", sector_class="NBFI", score=83.0 - i) for i in range(3)]
    items = rc.recommend(with_conviction(cands), {}, rc.empty_profile(), {})
    sectors = [i["sector"] for i in items]
    assert sectors.count(PHARMA) == 3
    assert sum(1 for i in items if i["sector"] != PHARMA) == rc.FINANCIAL_CAP


def test_at_most_two_picks_lean_on_the_same_stock_of_theirs():
    mine = F("BXP", score=70.0, signal="none")
    cands = with_conviction([F("P1", score=85.0), F("P2", score=84.0), F("P3", score=83.0)])
    prof = profile(watched=["BXP"], facts={"BXP": mine})
    items = rc.recommend(cands, {}, prof, {"BXP": mine})
    assert [i["code"] for i in items] == ["P1", "P2"]


def test_a_label_that_would_repeat_down_the_list_turns_into_a_plain_top_pick():
    mine = F("SQUR")
    prof = profile(held=[("SQUR", 5000.0)], facts={"SQUR": mine}, sig="none")
    sectors = [CEMENT, TELECOM, IT, "Engineering", "Jute", "Textile"]
    cands = with_conviction([F(f"S{i}", sector=s, score=80.0 - i) for i, s in enumerate(sectors)])
    kinds = [i["kind"] for i in rc.recommend(cands, {}, prof, {"SQUR": mine})]
    assert kinds == ["new_area"] * 3 + ["top"] * 3


def test_same_inputs_give_the_same_order_ties_by_score_then_code():
    cands = [F("BBB", sector=CEMENT), F("AAA", sector=TELECOM), F("CCC", sector=IT, score=81.0)]
    for c in cands:
        c["conviction"] = 70.0
    first = [i["code"] for i in rc.recommend(cands, {}, rc.empty_profile(), {})]
    again = [i["code"] for i in rc.recommend(list(reversed(cands)), {}, rc.empty_profile(), {})]
    assert first == again == ["CCC", "AAA", "BBB"]


# ---------------------------------------------------------------------------
# "New today" + notes
# ---------------------------------------------------------------------------

def test_new_marks_only_against_the_previous_days_list():
    doc, prev = rc.seen_update(None, "2026-10-28", ["A", "B"])
    assert doc == {"day": "2026-10-28", "codes": ["A", "B"], "prev": None} and prev is None
    assert rc.mark_new([{"code": "A", "new": False}], prev) == []

    doc, prev = rc.seen_update(doc, "2026-10-29", ["A", "C"])
    assert prev == ["A", "B"] and doc["prev"] == ["A", "B"]
    items = [{"code": "A", "new": False}, {"code": "C", "new": False}]
    assert rc.mark_new(items, prev) == ["C"] and items[1]["new"]

    # Later the same day: nothing to write, still diffed against yesterday.
    same, prev2 = rc.seen_update(doc, "2026-10-29", ["A", "C"])
    assert same is None and prev2 == ["A", "B"]
    moved, prev3 = rc.seen_update(doc, "2026-10-29", ["C", "D"])
    assert moved["prev"] == ["A", "B"] and prev3 == ["A", "B"]


def test_note_says_when_few_pass_and_never_lowers_the_bar():
    assert rc.note(0)["en"].startswith("No stock passes")
    assert "Only 6 stocks" in rc.note(6)["en"]
    assert rc.note(rc.FEW_PASS) is None


# ---------------------------------------------------------------------------
# Portfolio — what to buy next
# ---------------------------------------------------------------------------

def _rows(spec, facts):
    return rc.holding_rows([{"trading_code": c, "qty": q, "ltp": p} for c, q, p in spec], facts)


def test_portfolio_gaps_in_both_languages():
    facts = {"EBL": F("EBL", sector=BANK, sector_class="BANK", p5_div=3.0),
             "CITY": F("CITY", sector=BANK, sector_class="BANK", p5_div=3.0),
             "WEAK": F("WEAK", sector="Insurance", sector_class="INSURANCE", score=30.0, p5_div=2.0)}
    g = rc.gaps(_rows([("EBL", 100, 50.0), ("CITY", 100, 40.0), ("WEAK", 100, 10.0)], facts))
    assert [x["key"] for x in g["gaps"]] == ["few", "heavy_sector", "financials", "swap", "dividend"]
    assert all(x["en"] and x["bn"] for x in g["gaps"])
    assert g["heavy"] == BANK and g["fin_heavy"]


def test_swap_idea_is_a_stronger_company_in_the_same_sector_sized_to_the_holding():
    weak = F("WEAK", score=40.0, signal="sell", p5_div=8.0)
    others = {c: F(c, sector=s, p5_div=8.0) for c, s in
              [("CEM", CEMENT), ("TEL", TELECOM), ("ITX", IT), ("ENG", "Engineering")]}
    facts = {"WEAK": weak, **others}
    rows = _rows([("WEAK", 100, 20.0)] + [(c, 10, 100.0) for c in others], facts)
    cands = with_conviction([F("SQUR", score=85.0, ltp=50.0), F("JUTE", sector="Jute", ltp=10.0)])
    prof = profile(held=[(r["code"], r["value"]) for r in rows], facts=facts, sig="none")
    plan = rc.portfolio_plan(rows, cands, {}, prof, facts, buys=30)
    swap = plan["picks"][0]
    assert swap["kind"] == "swap" and swap["code"] == "SQUR" and swap["replaces"] == "WEAK"
    assert swap["suggest"] == {"shares": 40, "amount": 2000.0, "target_pct": 0.0}
    assert swap["tag_en"] == "Instead of WEAK"


def test_a_portfolio_with_no_gaps_gets_its_best_fitting_picks():
    held = {c: F(c, sector=s, p5_div=8.0) for c, s in
            [("A1", CEMENT), ("A2", TELECOM), ("A3", IT), ("A4", "Engineering"), ("A5", "Jute")]}
    rows = _rows([(c, 10, 100.0) for c in held], held)
    prof = profile(held=[(c, 1000.0) for c in held], facts=held, sig="none")
    cands = with_conviction([F("SQUR")])
    plan = rc.portfolio_plan(rows, cands, {}, prof, held, buys=30)
    assert plan["gaps"] == [] and [p["kind"] for p in plan["picks"]] == ["fit"]
    assert plan["picks"][0]["suggest"]["target_pct"] == 10.0


def test_gaps_with_nothing_passing_say_so():
    facts = {"EBL": F("EBL", sector=BANK, sector_class="BANK")}
    rows = _rows([("EBL", 10, 100.0)], facts)
    prof = profile(held=[("EBL", 1000.0)], facts=facts, sig="none")
    plan = rc.portfolio_plan(rows, [], {}, prof, facts, buys=0)
    assert plan["picks"] == [] and plan["none_reason"]["en"].startswith("No stock passes")


def test_example_size_is_an_equal_share_under_five_stocks_in_whole_shares():
    # 20% of the new total: ৳10,000 now -> ৳2,500 more makes it 20% of ৳12,500.
    assert rc.size(100.0, 10_000.0, 3) == {"shares": 25, "amount": 2500.0, "target_pct": 20.0}
    assert rc.size(100.0, 10_000.0, 6)["target_pct"] == 10.0
    assert rc.size(None, 10_000.0, 3) is None


# ---------------------------------------------------------------------------
# Explore mode — "Picked for you" (2026-11-08): no Buy check, no price words
# ---------------------------------------------------------------------------

def explored(facts, gov=None):
    return rl.run_list(rc.gate_list(explore=True), facts, rl.Ctx(governance=gov or (lambda code: [])))


def test_explore_gate_takes_a_strong_company_at_any_price_but_keeps_the_safety_checks():
    facts = [
        F("CHEAP"),
        F("PRICEY", signal="none", p4_val=2.0, turnover_mn=5.0),
        F("MIXED", score=50.0, signal="none"),
        F("LOSS", eps=-0.5),
        F("LOANS", debt_level="over_reserve"),
        F("QUIET", turnover_mn=0.2),
    ]
    for f in facts:
        f.setdefault("turnover_mn", 5.0)
    run = explored(facts)
    assert sorted(f["code"] for f in run["passed"]) == ["CHEAP", "PRICEY"]
    assert [c["key"] for c in run["funnel"]] == [c.key for c in rc.EXPLORE_GATE]


def test_explore_never_suggests_a_stock_the_reader_owns_or_follows():
    held, watched, new = F("SQUR"), F("ROBI", sector=TELECOM), F("CEM", sector=CEMENT)
    facts = {f["code"]: f for f in (held, watched, new)}
    prof = profile(held=[("SQUR", 1000.0)], watched=["ROBI"], facts=facts)
    cands = with_conviction([held, watched, new])
    items = rc.recommend(cands, {k: LV for k in facts}, prof, facts, explore=True)
    assert [i["code"] for i in items] == ["CEM"]
    assert all(i["kind"] not in ("add_more", "watched") for i in items)


def test_explore_conviction_leans_on_the_company_not_the_price():
    strong_pricey = F("A", score=85.0, p4_val=2.0)
    weaker_cheap = F("B", score=62.0, p4_val=9.0)
    assert rc.conviction(weaker_cheap, LV) > rc.conviction(strong_pricey, LV)
    assert rc.conviction(strong_pricey, LV, explore=True) > rc.conviction(weaker_cheap, LV, explore=True)


def test_an_explore_pick_says_nothing_about_buying_or_the_price_being_good():
    c = F("A", strength="strong", div_yield_pct=6.0, paid_years=5, current_pe=9.0, own_avg_pe=13.0,
          sector_median_pe=15.0, fair_value={"low": 90.0, "high": 140.0}, pct_below_high=30.0)
    [it] = rc.recommend(with_conviction([c]), {"A": LV}, rc.empty_profile(), {}, explore=True)
    assert it["price_word"] is None and it["fair"] is None
    assert it["tag_en"] == "Worth a look"
    assert [k["en"] for k in it["keywords"]] == ["Strong all round", "Pays 6% a year", "Pays every year"]
    price = next(r for r in it["facts"] if r["key"] == "price")
    assert price["value"]["en"] == "9 years of profit" and price["tone"] == "neutral"
    assert price["note"]["en"] == "It usually costs 13; similar companies cost 15."
    text = " ".join([it["why_en"], *(p["en"] for p in it["points"]), *(k["en"] for k in it["keywords"])]).lower()
    for word in ("low price", "fair price", "cheap", "buy", "fair-value", "below its 1-year high"):
        assert word not in text, word


def test_explore_reasons_tied_to_their_stocks_say_the_group_without_a_price():
    mine, other, third = F("GP", sector=TELECOM), F("SQUR"), F("CEM", sector=CEMENT)
    facts = {"GP": mine, "SQUR": other, "CEM": third}
    prof = profile(held=[("GP", 3000.0), ("SQUR", 3500.0), ("CEM", 3500.0)], facts=facts, sig="none")
    [it] = rc.recommend(with_conviction([F("ROBI", sector=TELECOM, score=65.0)]), {"ROBI": LV}, prof, facts,
                        explore=True)
    assert it["kind"] == "similar"
    assert it["why_en"] == "It is in the same business as GP, which you own. We grade it mostly strong."
    assert "দাম" not in it["why_bn"]


def test_explore_note_speaks_of_companies_not_cheaper_prices():
    assert "cheaper" not in rc.note(0, explore=True)["en"]
    assert rc.note(4, explore=True)["en"].startswith("Only 4 companies")
    assert rc.note(40, explore=True) is None


def test_picked_for_you_never_repeats_the_buy_list_and_names_the_ones_that_fit(monkeypatch):
    from backend.services import recommend_service as rs
    cands = with_conviction([F("SQUR"), F("ROBI", sector=TELECOM), F("CEM", sector=CEMENT), F("IT1", sector=IT)])
    p = {"cands": cands, "levels": {c["code"]: LV for c in cands}, "facts": {c["code"]: c for c in cands}}
    monkeypatch.setattr(rs, "_buy_list", lambda: [{"code": "SQUR"}, {"code": "ROBI"}, {"code": "ZZZ"}])
    items, bl = rs._explore(p, rc.empty_profile(), 15)
    assert sorted(i["code"] for i in items) == ["CEM", "IT1"]
    assert bl["count"] == 3 and sorted(f["code"] for f in bl["fits"]) == ["ROBI", "SQUR"]
    assert bl["fits_total"] == 2
