"""Buy List — the pure rules (backend/services/buy_list.py) and the service's
pure parts (backend/services/buy_list_service.py)."""
import re

from backend.services import buy_list as bl

PHARMA, BANK, TELECOM, FOOD, IT, FINANCE = (
    "Pharmaceuticals & Chemicals", "Bank", "Telecommunication", "Food & Allied", "IT Sector",
    "Financial Institutions")


def C(code, **kw):
    """A gate passer as the engine's pool carries it."""
    c = {"code": code, "name": f"{code} Ltd", "sector": PHARMA, "sector_class": "GENERAL",
         "score": 80.0, "checks_group": "excellent", "ltp": 80.0, "conviction": 80.0,
         "fair_value": {"low": 80.0, "high": 120.0, "center": 100.0, "estimates_disagree": False,
                        "methods": {"own_history_pe": 100.0, "book_own": 100.0, "peer_pe": 150.0}},
         "eps_yoy_pct": 12.0, "div_yield_pct": 3.0, "pct_in_range": 50.0, "turnover_med30_mn": 8.0}
    c.update(kw)
    return c


def M(pe, pb, **extra):
    """A fair-value block with these own-history prices (the stock page's
    centre and "disagree" flag set to values the list must ignore)."""
    return {"fair_value": {"center": 999.0, "estimates_disagree": True,
                           "methods": {"own_history_pe": pe, "book_own": pb, **extra}}}


STEADY = dict(eps=5.0, payout_pct=40.0, payout_latest_pct=40.0, p5_consist=10.0)


def codes(rows):
    return [r["code"] for r in rows]


# --- the questions ---------------------------------------------------------

def test_margin_join_and_leave_lines():
    c = C("A", ltp=93.0)  # 7% under its usual price
    assert round(bl.margin_pct(c)) == 7
    assert not bl.price_ok(c)              # a newcomer needs 10%
    assert bl.price_ok(c, member=True)     # a member stays until 5%
    assert not bl.price_ok(C("B", ltp=96.0), member=True)


def test_usual_price_is_its_own_history_only():
    # The similar-companies figure and the stock page's "disagree" flag don't count.
    c = C("A", ltp=80.0, **M(120.0, 60.0, peer_pe=300.0))
    u = bl.usual_price(c)
    assert u["low"] == 60.0 and u["high"] == 120.0
    assert round(u["mid"]) == 100  # profit weighs twice the assets for a general company
    assert round(bl.margin_pct(c)) == 20
    bank = C("B", sector_class="BANK", ltp=80.0, **M(120.0, 60.0))
    assert bl.usual_price(bank)["mid"] == 82.5  # assets first for a lender
    assert bl.usual_price(C("C", fair_value={"methods": {"own_history_pe": 100.0}})) is None
    assert bl.margin_pct(C("D", fair_value=None)) is None


def test_a_newcomer_must_be_under_both_measures():
    # 20% under the middle, but above its usual price for what it owns.
    c = C("A", ltp=80.0, **M(120.0, 60.0))
    assert not bl.under_both(c) and not bl.price_ok(c)
    assert bl.price_ok(c, member=True)  # a member only needs the leave margin
    assert bl.price_ok(C("B", ltp=80.0, **M(120.0, 90.0)))
    above = C("C", ltp=104.0)
    assert bl.margin_pct(above) < 0 and bl.first_miss(above) == 4


def test_profit_join_and_leave_lines():
    c = C("A", eps_yoy_pct=-12.0)
    assert not bl.profit_ok(c) and bl.profit_ok(c, member=True)
    assert not bl.profit_ok(C("B", eps_yoy_pct=-16.0), member=True)
    # The latest quarter wins over the last full year.
    assert not bl.profit_ok(C("C", eps_yoy_pct=20.0, interim_eps_yoy_pct=-14.0))
    # No figure to compare is not a fall.
    assert bl.profit_ok(C("D", eps_yoy_pct=None))


def test_latest_quarter_alone():
    q = C("A", interim_q_yoy_pct=-22.5, interim_eps_q_prev=1.2)
    assert bl.quarter_change(q) == -22.5
    assert not bl.quarter_ok(q) and bl.quarter_ok(q, member=True)
    assert not bl.quarter_ok(C("B", interim_q_yoy_pct=-31.0, interim_eps_q_prev=1.2), member=True)
    assert bl.miss_keys(q) == ["quarter"] and bl.first_miss(q) == 5
    # A tiny or missing quarter a year ago is not compared.
    assert bl.quarter_change(C("C", interim_q_yoy_pct=-60.0, interim_eps_q_prev=0.04)) is None
    assert bl.quarter_change(C("D", interim_q_yoy_pct=-60.0)) is None
    assert bl.quarter_ok(C("E", interim_q_yoy_pct=745.0, interim_eps_q_prev=0.2))


def test_trading_floor_reads_a_normal_day():
    thin = C("A", turnover_med30_mn=2.2, turnover_mn=9.0)  # one big week can't lift it
    assert bl.trading_mn(thin) == 2.2
    assert not bl.trading_ok(thin) and bl.trading_ok(thin, member=True)
    assert not bl.trading_ok(C("B", turnover_med30_mn=1.5), member=True)
    assert bl.trading_ok(C("C", turnover_med30_mn=None, turnover_mn=4.0))
    assert bl.trading_ok(C("D", turnover_med30_mn=None, turnover_mn=None))
    assert bl.miss_keys(thin) == ["trading"] and bl.first_miss(thin) == 3


def test_banks_need_cash_dividends_each_year():
    bank = dict(sector=BANK, sector_class="BANK")
    assert bl.cash_years_ok(C("A", **bank, cash_years=[[2025, 20.0], [2024, 15.0], [2023, 10.0]]))
    skipped = C("B", **bank, cash_years=[[2025, 10.0], [2024, None], [2023, 10.0]])
    assert not bl.cash_years_ok(skipped) and bl.skipped_year(skipped) == 2024
    assert bl.miss_keys(skipped) == ["bank_cash"]
    assert bl.cash_years_ok(C("C", **bank))                            # no records: not held against it
    assert bl.cash_years_ok(C("D", cash_years=[[2025, 0.0]]))          # only banks and finance companies
    assert bl.cash_years_ok(C("E", sector_class="INSURANCE", cash_years=[[2025, 0.0]]))


def test_strong_on_todays_figures_only():
    held = C("A", score=65.0, checks_group="average")  # kept "Mostly strong" by settling
    assert not bl.strong_today(held) and bl.first_miss(held) == 1
    assert bl.strong_today(C("B", score=65.0, checks_group="good"))
    assert not bl.strong_today(C("C", score=50.0, checks_group="good"))
    assert bl.strong_today(C("D", checks_group=None))  # rows from before the group rules


# --- the list --------------------------------------------------------------

def test_two_closes_in_a_row():
    a, b = C("A"), C("B")
    res = bl.choose([a, b], prev_members=[], prev_passed=["A"])
    assert codes(res["members"]) == ["A"]
    assert codes(res["unsettled"]) == ["B"]
    assert set(res["passed"]) == {"A", "B"}
    # A share already on the list doesn't need yesterday's pass.
    assert codes(bl.choose([b], prev_members=["B"], prev_passed=[])["members"]) == ["B"]


def test_first_day_reads_yesterdays_buys():
    res = bl.choose([C("A"), C("B")], prev_members=[], prev_passed=None, prev_buys=["B"])
    assert codes(res["members"]) == ["B"]


def test_caps_by_sector_financials_and_size():
    pharma = [C(f"P{i}", conviction=90 - i) for i in range(3)]
    banks = [C(f"B{i}", sector=BANK, sector_class="BANK", conviction=85 - i) for i in range(3)]
    fin = [C("F0", sector=FINANCE, sector_class="NBFI", conviction=70)]
    res = bl.choose(pharma + banks + fin, [], [c["code"] for c in pharma + banks + fin])
    got = codes(res["members"])
    assert got == ["P0", "P1", "B0", "B1", "F0"]
    caps = {c["code"]: c["cap"] for c in res["also"]}
    assert caps == {"P2": "sector", "B2": "sector"}
    # Three financials at most, across banks + finance + insurers.
    banks2 = [C(f"X{i}", sector=s, sector_class=k, conviction=80 - i)
              for i, (s, k) in enumerate([(BANK, "BANK"), (BANK, "BANK"), (FINANCE, "NBFI"), ("Insurance", "INSURANCE")])]
    res2 = bl.choose(banks2, [], codes(banks2))
    assert len(res2["members"]) == 3 and res2["also"][0]["cap"] == "financial"
    many = [C(f"S{i}", sector=f"Sector {i}", conviction=90 - i) for i in range(12)]
    res3 = bl.choose(many, [], codes(many))
    assert len(res3["members"]) == bl.MAX_ROWS
    assert {c["cap"] for c in res3["also"]} == {"full"}


def test_a_member_keeps_its_seat_unless_clearly_beaten():
    old, new = C("OLD", conviction=80), C("NEW", conviction=83)
    other = C("TOP", conviction=95)
    res = bl.choose([old, new, other], prev_members=["OLD", "TOP"], prev_passed=["NEW", "OLD", "TOP"])
    assert set(codes(res["members"])) == {"TOP", "OLD"}
    beaten = C("NEW", conviction=86)
    res2 = bl.choose([old, beaten, other], prev_members=["OLD", "TOP"], prev_passed=["NEW", "OLD", "TOP"])
    assert set(codes(res2["members"])) == {"TOP", "NEW"}


def test_two_closes_to_leave_on_a_soft_miss():
    near = C("A", ltp=96.0)  # under 5%: a member's price miss
    res = bl.choose([near], prev_members=["A"], prev_passed=["A"])
    assert codes(res["members"]) == ["A"] and res["grace"] == ["A"]
    assert res["members"][0]["grace"] == "value"
    assert res["passed"] == []  # on grace is not a pass for question 6
    # A second miss in a row takes it off.
    res2 = bl.choose([near], prev_members=["A"], prev_passed=[], prev_grace=["A"])
    assert res2["members"] == [] and res2["grace"] == []
    # A member that lost its Buy only on the price gets the same second close.
    soft = C("B", soft_fail=True)
    assert codes(bl.choose([soft], ["B"], ["B"])["members"]) == ["B"]
    # A serious miss leaves at once, and a newcomer never gets grace.
    falling = C("C", eps_yoy_pct=-20.0)
    assert bl.choose([falling], ["C"], ["C"])["members"] == []
    assert bl.choose([C("D", ltp=96.0)], [], ["D"])["members"] == []
    mixed = C("E", ltp=96.0, eps_yoy_pct=-20.0)  # soft and serious together: serious wins
    assert bl.choose([mixed], ["E"], ["E"])["members"] == []
    assert bl.soft_signal_miss(["buy"], "near_52w_high")
    assert not bl.soft_signal_miss(["buy"], "red_flag")
    assert not bl.soft_signal_miss(["buy", "profitable"], "near_52w_high")


def test_a_graced_member_squeezed_out_is_not_called_a_pass():
    others = [C(f"P{i}", conviction=95 - i) for i in range(2)]
    graced = C("G", ltp=96.0, conviction=70)
    res = bl.choose(others + [graced], ["P0", "P1", "G"], ["P0", "P1", "G"])
    assert codes(res["members"]) == ["P0", "P1"] and res["also"] == []


def test_join_price_is_the_lowest_line():
    c = C("A", ltp=80.0, **M(120.0, 90.0))
    # usual middle 110 → 99 at 10% under; its assets measure 90; the signal 95.
    assert bl.join_price(c, 95.0) == 90.0
    assert bl.join_price(C("B", ltp=80.0, **M(120.0, 120.0)), 95.0) == 95.0
    assert bl.join_price(C("C", ltp=80.0, **M(120.0, 120.0)), None) == 108.0
    assert bl.join_price(C("D", fair_value=None), None) is None


def test_list_is_in_conviction_order_and_never_filled():
    res = bl.choose([C("A", conviction=70), C("B", conviction=90), C("Z", ltp=99.0)], [], ["A", "B", "Z"])
    assert codes(res["members"]) == ["B", "A"]  # Z misses question 4 and nothing replaces it


def test_since_and_free_pick():
    since = bl.since_map(["A", "B"], ["A"], {"A": "2026-10-01"}, "2026-11-05")
    assert since == {"A": "2026-10-01", "B": "2026-11-05"}
    members = ["A", "B", "C"]
    picks = {bl.free_pick(members, f"2026-11-{d:02d}") for d in range(1, 8)}
    assert picks == set(members)
    assert bl.free_pick(members, "2026-11-05") == bl.free_pick(members, "2026-11-05")
    assert bl.free_pick([], "2026-11-05") is None


def test_week_starts_on_sunday():
    assert bl.week_start("2026-11-05") == "2026-11-01"  # Thursday
    assert bl.week_start("2026-11-08") == "2026-11-08"  # Sunday
    assert bl.week_start("2026-11-07") == "2026-11-01"  # Saturday


# --- words -----------------------------------------------------------------

_BN_DIGITS = re.compile(r"[০-৯]")


def _all_text(*parts):
    out = []
    for p in parts:
        if isinstance(p, dict):
            out += [v for k, v in p.items() if k in ("en", "bn") and isinstance(v, str)]
            for k in ("miss", "fix"):
                if isinstance(p.get(k), dict):
                    out += _all_text(p[k])
    return out


def test_why_line_names_the_gap_and_one_standout():
    w = bl.why_line(C("A", ltp=78.0, div_yield_pct=5.9, **STEADY))
    assert w["en"] == "A company strong all round, priced 22% under its usual price, and it pays 5.9% a year in cash."
    assert "22% কম" in w["bn"] and "5.9%" in w["bn"]
    g = bl.why_line(C("B", score=70.0, ltp=80.0, div_yield_pct=2.0, eps_yoy_pct=26.0))
    assert g["en"].startswith("A mostly strong company, priced 20% under") and "profit up 26%" in g["en"]
    # The yield only when the dividend looks steady.
    risky = bl.why_line(C("R", ltp=78.0, div_yield_pct=7.8, eps=5.0, payout_pct=101.0, payout_latest_pct=101.0))
    assert "7.8%" not in risky["en"]


def test_dividend_watch_follows_the_calendar():
    risk = bl.dividend_watch(C("A", div_yield_pct=7.8, eps=5.0, payout_latest_pct=101.0))
    assert risk["level"] == "red" and risk["en"].startswith("Its dividend: at risk.")
    assert bl.dividend_watch(C("B", div_yield_pct=7.8, **STEADY)) is None
    assert bl.dividend_watch(C("C", div_yield_pct=0.0, eps=5.0, payout_latest_pct=150.0)) is None


def test_almost_rows_say_what_would_bring_it_in():
    above = bl.almost_row(C("A", ltp=104.0), 4)
    assert above["miss"]["en"] == "Its price, ৳104, is above its usual price of ৳100."
    assert above["fix"]["en"] == "It comes in under ৳90.0."
    near = bl.almost_row(C("B", ltp=97.0), 4)
    assert near["miss"]["en"].startswith("Only 3% under")
    split = bl.almost_row(C("C", fair_value={"center": 100, "methods": {"own_history_pe": 100.0}}), 4)
    assert "can't work out its usual price" in split["miss"]["en"]
    both = bl.almost_row(C("S", ltp=80.0, **M(120.0, 70.0)), 4)
    assert "not under its usual price for what it owns (৳70.0)" in both["miss"]["en"]
    assert both["fix"]["en"] == "It comes in under ৳70.0."
    thin = bl.almost_row(C("T", turnover_med30_mn=2.2), 3, None, "trading")
    assert "৳22 lakh" in thin["miss"]["en"] and "৳30 lakh" in thin["miss"]["en"]
    qtr = bl.almost_row(C("Q", interim_q_yoy_pct=-22.5, interim_eps_q_prev=1.2,
                          interim_period_end="2026-09-30"), 5, {"date": "2026-11-25"}, "quarter")
    assert qtr["miss"]["en"] == "Profit in the 3 months to Sep 2026 alone is down 22% on the same months last year."
    assert qtr["fix"]["date"] == "2026-11-25"
    meeting = {"date": "2026-11-08", "better_above": 1.01}
    falling = bl.almost_row(C("D", eps_yoy_pct=-14.1), 5, meeting)
    assert falling["miss"]["en"] == "Profit is down 14% (last full year)."
    assert falling["fix"]["date"] == "2026-11-08"
    assert "৳0.92" in falling["fix"]["en"] and "৳0.83 or more" in falling["fix"]["en"]
    assert bl.almost_row(C("E"), 6)["question"] == 6


def test_also_and_left_lines():
    assert "2 companies from its sector" in bl.also_line({"cap": "sector"})["en"]
    assert "3 banks" in bl.also_line({"cap": "financial"})["en"]
    assert "Its price came too close" in bl.left_reason(C("A", ltp=97.0), "value", None)["en"]
    sig = {"en": "Its price is near the top of its range for the year.", "bn": "দাম বছরের সর্বোচ্চের কাছে।"}
    assert bl.left_reason(None, None, sig) == sig
    assert bl.left_reason(None, None, sig, ["profitable"])["en"] == "Its latest results showed a loss."
    second = bl.left_reason(C("B", soft_fail=True), "price_signal", sig, second=True)
    assert second["en"].endswith("It missed at two closes in a row.")
    bank = C("K", sector_class="BANK", cash_years=[[2025, 10.0], [2024, 0.0]])
    assert bl.left_reason(bank, "bank_cash", None)["en"] == "It paid no cash dividend for 2024."
    assert bl.left_reason(C("N"), None, None)["en"].startswith("A newcomer")
    assert "next close" in bl.grace_line("value")["en"] and bl.grace_line(None) is None


def test_no_bengali_numerals_anywhere():
    rows = [bl.why_line(C("A", ltp=78.0, div_yield_pct=5.9, **STEADY)), bl.profit_chip(C("B", eps_yoy_pct=-7.0)),
            bl.almost_row(C("T", turnover_med30_mn=22.0), 3, None, "trading"),
            bl.almost_row(C("Q", interim_q_yoy_pct=-40.0, interim_eps_q_prev=1.0, interim_period_end="2026-09-30"),
                          5, None, "quarter"),
            bl.grace_line("trading"), bl.left_reason(C("G"), "strong", None, second=True),
            bl.dividend_watch(C("W", div_yield_pct=7.0, eps=5.0, payout_latest_pct=120.0)),
            bl.also_line({"cap": "full"}), bl.almost_row(C("C", ltp=104.0), 4),
            bl.almost_row(C("D", eps_yoy_pct=-20.0), 5, {"date": "2026-11-10", "better_above": 9.19}),
            bl.almost_row(C("E"), 6), bl.left_reason(C("F"), "profit", None)]
    for text in _all_text(*rows):
        assert not _BN_DIGITS.search(text), text


# --- the service's pure parts ------------------------------------------------

def test_close_pending_while_trading():
    from backend.services.buy_list_service import close_pending
    today = "2026-11-18"
    trading = {f"S{i}": {"date": today, "ltp": 10.0, "close_price": None} for i in range(250)}
    assert close_pending(trading, today)
    closed = {f"S{i}": {"date": today, "ltp": 10.0, "close_price": 10.0} for i in range(250)}
    assert not close_pending(closed, today)
    assert not close_pending({"A": {"date": "2026-11-17", "ltp": 10.0}}, today)  # no prices today yet
    early = {f"S{i}": {"date": today, "ltp": 10.0, "close_price": None} for i in range(40)}
    assert close_pending(early, today)


def test_stored_list_takes_todays_prices():
    from backend.services.buy_list_service import with_prices
    payload = {"items": [{"code": "A", "price": 80.0, "change_pct": 0.0, "fair": {"mid": 100.0},
                          "margin_pct": 20, "buy_below": 85.0, "held": False},
                         {"code": "B", "price": 50.0, "fair": None, "buy_below": None}]}
    out = with_prices(payload, {"A": {"ltp": 90.0, "change_pct": 12.5}, "B": {"ltp": None}})
    a, b = out["items"]
    assert (a["price"], a["change_pct"], a["margin_pct"], a["held"]) == (90.0, 12.5, 10, True)
    assert b["price"] == 50.0 and out["live_prices"] is True


def test_record_date_waits_for_a_trade():
    from backend.services.db_service import _only_traded_since
    acts = {"SQURPHARMA": [{"record_date": "2025-11-16"}, {"record_date": "2026-11-16"}],
            "GP": [{"record_date": "2026-10-20"}],
            "OLD": [{"record_date": "2026-03-01"}]}
    # SQURPHARMA's last trade was the day before its record date: the new one waits.
    out = _only_traded_since(acts, {"SQURPHARMA": "2026-11-15", "GP": "2026-11-17"})
    assert out["SQURPHARMA"] == [{"record_date": "2025-11-16"}]
    assert out["GP"] == [{"record_date": "2026-10-20"}]
    assert out["OLD"] == [{"record_date": "2026-03-01"}]  # not checked: kept as before
    assert _only_traded_since(acts, {"SQURPHARMA": "2026-11-17"})["SQURPHARMA"][-1]["record_date"] == "2026-11-16"


def test_insurers_data_check_leaves_out_their_business_part():
    from backend.services.recommend import completeness
    ins = {"sector_class": "INSURANCE", "data_completeness": 0.486, "p1_coverage": 1.0, "p2_coverage": 0.2}
    assert completeness(ins) == 0.68
    assert completeness({"sector_class": "GENERAL", "data_completeness": 0.486,
                         "p1_coverage": 1.0, "p2_coverage": 0.2}) == 0.486
    assert completeness({"sector_class": "INSURANCE", "data_completeness": 0.5}) == 0.5
