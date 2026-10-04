"""#1 #2 #3 #7 #8 #9 #13 #14 #15 #17 #18 — Good signs / Watch-outs, ownership,
Health Check overrides, in English and Bengali."""
from datetime import datetime

import pytest

from backend.services.stock_facts import (
    _CONTRADICTS, build_flags, build_items, governance_items, health_overrides,
    own_pe_label, ownership_caption, ownership_change, profit_years_item, valuation_verdict,
)
from backend.tests.fixtures import NEWS, NOW, PROFILE, SHARES, fin_rows


def keys(items, tone=None):
    return {i["key"] for i in items if tone is None or i["tone"] == tone}


def assert_bilingual(items):
    for i in items:
        assert i["en"] and i["bn"], i
        assert any("ঀ" <= ch <= "৿" for ch in i["bn"]), i   # real Bengali script


def assert_no_contradiction(items):
    watch = keys(items, "watch")
    for i in items:
        if i["tone"] == "good":
            assert not (_CONTRADICTS.get(i["key"], set()) & watch), i["key"]


# --- #1 profit-years count -------------------------------------------------------

@pytest.mark.parametrize("code", ["JAMUNAOIL", "GP", "BSC", "WALTONHIL", "EBL"])
def test_profit_years_says_every_year_not_4_of_5(code):
    it = profit_years_item(fin_rows(code))
    assert it["en"] == "Made a profit every year for 5 years"
    assert "4 out of" not in it["en"]
    assert "5" in it["bn"]


def test_profit_years_with_a_loss_year():
    rows = fin_rows("BSC")
    rows[1]["eps"] = -1.0
    assert profit_years_item(rows)["en"] == "Made a profit in 4 of the last 5 years"


# --- #2 government ownership ---------------------------------------------------------

@pytest.mark.parametrize("code,pct", [("MPETROLEUM", 59), ("BSC", 52), ("JAMUNAOIL", 60)])
def test_government_is_the_controlling_owner(code, pct):
    cap = ownership_caption(SHARES[code][0])
    assert "limited alignment" not in cap["en"]
    assert "only 0%" not in cap["en"]
    assert f"government owns {pct}%" in cap["en"]
    assert "সরকার" in cap["bn"]
    items = build_items({}, list(SHARES[code]), fin_rows("JAMUNAOIL"), {"market_category": "A"}, now=NOW)
    assert "govt_controlled" in keys(items, "good")


# --- #3 sponsor-change interpretation ----------------------------------------------

def test_acmelab_sponsors_down_is_not_insider_buying():
    cur, prev = SHARES["ACMELAB"]
    chg = ownership_change(cur, prev, "Jun 2025", "জুন 2025")
    assert chg["tone"] == "watch"
    assert "close to the company are buying" not in chg["en"]
    assert "42.4% to 40.4%" in chg["en"]
    assert "institutions raised theirs to 32.4%" in chg["en"]
    assert "উদ্যোক্তারা" in chg["bn"]


def test_navanaphar_big_jump_is_flagged_for_verification():
    cur, prev = SHARES["NAVANAPHAR"]
    chg = ownership_change(cur, prev, "Jun 2025", "জুন 2025")
    assert chg["key"] == "sponsor_jump" and chg["tone"] == "watch"
    assert "buying" in chg["en"] and "not buying" in chg["en"]   # says it is not (necessarily) buying
    items = build_items({}, [cur, prev], fin_rows("NAVANAPHAR"), {"market_category": "A"}, now=NOW)
    assert "sponsor_jump" in keys(items, "watch")


def test_sponsor_rise_is_insider_buying():
    cur = {"sponsor_director_pct": 45.0, "institute_pct": 10.0}
    prev = {"sponsor_director_pct": 43.0, "institute_pct": 10.0}
    chg = ownership_change(cur, prev)
    assert chg["tone"] == "positive" and "close to the company are buying" in chg["en"]


def test_institutions_rise_alone_is_not_called_insiders():
    cur = {"sponsor_director_pct": 45.0, "institute_pct": 14.0}
    prev = {"sponsor_director_pct": 45.0, "institute_pct": 10.0}
    chg = ownership_change(cur, prev)
    assert chg["tone"] == "positive"
    assert "close to the company" not in chg["en"]


# --- #4 / #8 interim trend + negative cash ---------------------------------------

def sr_jamuna():
    return {"interim_eps_yoy_pct": -27.5, "eps_yoy_pct": 46.8, "interim_q_yoy_pct": -45.5,
            "interim_label_en": "9 months to Mar 2026", "interim_label_bn": "মার্চ 2026 পর্যন্ত 9 মাস",
            "interim_nocfps": -134.34, "interim_nocfps_prev": 88.26, "p2_cfo": 10.0, "p5_consist": 10.0,
            "p4_pe": 10.0, "own_avg_pe_years": 5, "listing_year": 2007, "fy_eps_year": 2025}


def test_jamunaoil_last_year_up_this_year_slowing():
    items = build_items(sr_jamuna(), list(SHARES["JAMUNAOIL"]), fin_rows("JAMUNAOIL"),
                        {"market_category": "A", "sector": "Fuel & Power"}, now=NOW)
    k = keys(items)
    assert "slowing_this_year" in k
    slow = next(i for i in items if i["key"] == "slowing_this_year")
    assert "27.5%" in slow["en"] and "9 months to Mar 2026" in slow["en"]
    # #8: negative cash drops the cash good sign and adds a watch-out
    assert "negative_cash_this_year" in keys(items, "watch")
    assert "cash_from_business" not in k
    assert_bilingual(items)
    assert_no_contradiction(items)


def test_lhb_negative_cash_this_year():
    sr = {"interim_eps_yoy_pct": -7.9, "eps_yoy_pct": 33.7, "interim_label_en": "6 months to Jun 2026",
          "interim_label_bn": "জুন 2026 পর্যন্ত 6 মাস", "interim_nocfps": -2.59, "interim_nocfps_prev": 1.64,
          "p2_cfo": 6.0}
    items = build_items(sr, [], fin_rows("LHB"), {"market_category": "A"}, now=NOW)
    neg = next(i for i in items if i["key"] == "negative_cash_this_year")
    assert "−৳2.59" in neg["en"] and "৳1.64" in neg["en"]
    assert "cash_from_business" not in keys(items)


@pytest.mark.parametrize("iy,fy,key", [(-8.8, 22.8, None), (-27.5, 46.8, "slowing_this_year"),
                                        (-27.5, -5.0, "profit_down_this_year"), (31.5, 20.4, "profit_up_this_year")])
def test_interim_wording(iy, fy, key):
    sr = {"interim_eps_yoy_pct": iy, "eps_yoy_pct": fy, "interim_label_en": "x", "interim_label_bn": "x"}
    k = keys(build_items(sr, [], fin_rows("BSC"), {"market_category": "A"}, now=NOW))
    for kk in ("slowing_this_year", "profit_down_this_year", "profit_up_this_year"):
        assert (kk in k) == (kk == key)


def test_latest_quarter_drop_flagged_when_ytd_is_flat():
    sr = {"interim_eps_yoy_pct": -2.3, "interim_q_yoy_pct": -36.9, "eps_yoy_pct": 134.6,
          "interim_label_en": "9 months to Mar 2026", "interim_label_bn": "x"}
    assert "latest_quarter_down" in keys(build_items(sr, [], fin_rows("ENVOYTEX"), {"market_category": "A"}, now=NOW))


# --- #7 / #15 debt ---------------------------------------------------------------------

@pytest.mark.parametrize("code,level,key", [
    ("BSC", "over_reserve", "loan_over_reserve"),
    ("ENVOYTEX", "over_reserve", "loan_over_reserve"),
    ("ACMELAB", "over_mcap", "loan_over_mcap"),
])
def test_debt_watch_outs(code, level, key):
    p = PROFILE[code]
    sr = {"debt_level": level, "mcap_mn": p["mcap_mn"], "p2_health": 8.3}
    items = build_items(sr, [], fin_rows("BSC"), p, sector_class="GENERAL", now=NOW)
    assert key in keys(items, "watch")
    over = health_overrides(sr, fin_rows("BSC"), "GENERAL")["p2_health"]
    assert over["status"] != "strong"
    assert "Low loans" not in over["oneLine"]


def test_bank_has_no_loan_flags_and_capital_wording():
    p = PROFILE["EBL"]
    sr = {"debt_level": None, "mcap_mn": p["mcap_mn"], "p2_health": 9.29}
    items = build_items(sr, [], fin_rows("EBL"), p, sector_class="BANK", now=NOW)
    assert not {k for k in keys(items) if "loan" in k or "debt" in k}
    over = health_overrides(sr, fin_rows("EBL"), "BANK")["p2_health"]
    assert over["headline"] == "Strong Capital Cushion"
    assert "loan" not in over["oneLine"].lower() or "lending" in over["oneLine"].lower()


# --- #9 dividends ----------------------------------------------------------------------

def test_paid_more_than_earned():
    items = build_items({"payout_latest_pct": 132.0, "p5_consist": 10.0}, [], fin_rows("LHB"),
                        {"market_category": "A"}, now=NOW)
    assert "paid_more_than_earned" in keys(items, "watch")
    assert "dividend_every_year" not in keys(items)          # contradiction resolved


def test_lhb_real_payout_is_91pct_not_132():
    # FY2025: "40% Final Cash Dividend (including 18% interim ...)" -> ৳4.0 on EPS 4.40
    payout = 4.0 / 4.40 * 100
    items = build_items({"payout_latest_pct": round(payout, 1)}, [], fin_rows("LHB"), {"market_category": "A"}, now=NOW)
    assert "high_payout" in keys(items) and "paid_more_than_earned" not in keys(items)


# --- #13 label tiers ------------------------------------------------------------------

def test_walton_not_weak_profit_when_profitable_every_year():
    over = health_overrides({"p1_biz": 3.5}, fin_rows("WALTONHIL"), "GENERAL")["p1_biz"]
    assert over["status"] == "fair"
    assert "Loses money" not in over["oneLine"] and "breaks even" not in over["oneLine"]
    assert over["headlineBn"]


def test_loss_maker_keeps_weak_profit():
    rows = fin_rows("WALTONHIL")
    rows[-1]["eps"] = -2.0
    assert "p1_biz" not in health_overrides({"p1_biz": 2.0}, rows, "GENERAL")


def test_navanaphar_strong_dividend_needs_a_real_yield():
    over = health_overrides({"p5_div": 7.4, "div_yield_pct": 2.2}, fin_rows("NAVANAPHAR"), "GENERAL")["p5_div"]
    assert over["status"] == "fair" and "2.2%" in over["oneLine"]
    assert "p5_div" not in health_overrides({"p5_div": 8.9, "div_yield_pct": 5.3}, [], "GENERAL")


# --- #14 own-history P/E label ----------------------------------------------------------

def test_own_pe_label_since_listing():
    assert own_pe_label(3, 2022, 2025)["en"] == "average since listing (2022)"
    assert own_pe_label(5, 2007, 2025)["en"] == "5-year average"
    assert own_pe_label(4, 1995, 2025)["en"] == "4-year average"


# --- #12 one valuation verdict ------------------------------------------------------------

@pytest.mark.parametrize("p4,v", [(9.2, "cheap"), (7.0, "cheap"), (5.05, "fair"), (3.99, "expensive"), (None, None)])
def test_valuation_verdict_bands(p4, v):
    assert valuation_verdict(p4) == v


# --- #17 governance ---------------------------------------------------------------------------

def test_navanaphar_bsec_directive():
    items = governance_items([NEWS["NAVANAPHAR_BSEC"]], now=NOW)
    assert keys(items) == {"bsec_action"}            # the postponement is the same event
    assert "27 Aug 2026" in items[0]["en"]


@pytest.mark.parametrize("n", ["JAMUNAOIL_QO", "MPETROLEUM_QO"])
def test_qualified_opinion(n):
    assert keys(governance_items([NEWS[n]], now=NOW)) == {"qualified_opinion"}


@pytest.mark.parametrize("n", ["EBL_CONSENT", "WALTON_NOC"])
def test_routine_regulator_news_is_not_a_red_flag(n):
    assert governance_items([NEWS[n]], now=NOW) == []


def test_old_governance_news_expires():
    old = dict(NEWS["JAMUNAOIL_QO"], post_date=datetime(2024, 12, 22))
    assert governance_items([old], now=NOW) == []


def test_governance_reaches_the_signal_board():
    flags = build_flags({}, [], fin_rows("JAMUNAOIL"), {"market_category": "A"}, [NEWS["JAMUNAOIL_QO"]], now=NOW)
    assert any("qualified opinion" in r for r in flags["red"])
    assert_bilingual(flags["items"])


# --- #18 data freshness -------------------------------------------------------------------------

def test_dividend_year_ahead_of_eps_is_flagged():
    items = build_items({"newer_dividend_fy": 2026.0, "fy_eps_year": 2025.0}, [], fin_rows("WALTONHIL"),
                        {"market_category": "A"}, now=NOW)
    d = next(i for i in items if i["key"] == "data_behind")
    assert "FY2026" in d["en"] and "FY2025 " in d["en"] and "2025.0" not in d["en"]
