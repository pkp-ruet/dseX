"""Scoring-side fixes: #5 TTM in P/E, #6 latest NAV in P/B, #7 debt load, #8 cash
cap, #9 FY dividend totals, #14 median own-history P/E, #15 ROE = EPS / NAV."""
import pytest

from backend.services.scoring_service import (
    DEBT_OVER_MCAP_P2_CAP, NEG_INTERIM_CFO_CAP, _a2_pillar2, _a2_pillar4, _a2_pillar5,
    _roe_series, debt_load,
)
from backend.tests.fixtures import fin_rows


def test_p4_uses_ttm_eps_and_latest_nav():
    _, fy = _a2_pillar4(fin_rows("JAMUNAOIL"), 175.0, 19.7, 0.75)
    _, ttm = _a2_pillar4(fin_rows("JAMUNAOIL"), 175.0, 19.7, 0.75, eps_override=48.62, nav_override=281.28)
    assert fy["current_pe"] == pytest.approx(175 / 58.70, abs=0.01)
    assert ttm["current_pe"] == pytest.approx(3.6, abs=0.01)
    assert ttm["current_pb"] == pytest.approx(175 / 281.28, abs=0.01)


def test_p4_loss_on_ttm_has_no_pe():
    s, sub = _a2_pillar4(fin_rows("BSC"), 110.0, 7.0, 1.0, eps_override=-0.5)
    assert sub["current_pe"] is None and sub["p4_pe"] == 0.0


def test_own_history_pe_is_a_median():
    # ENVOYTEX P/Es 52.04, 14.79, 22.50, 9.95, 4.76 — the mean was 20.8.
    _, sub = _a2_pillar4(fin_rows("ENVOYTEX"), 58.4, 15.0, 1.0)
    # FY2023's year-end (June 2023) fell in the floor-price period and is left
    # out (audit GR5); the median of the other four is 12.37.
    assert sub["own_avg_pe"] == 12.37
    assert sub["own_avg_pe_years"] == 4


def test_own_history_years_for_a_young_listing():
    _, sub = _a2_pillar4(fin_rows("NAVANAPHAR"), 75.1, 25.0, 2.0)
    assert sub["own_avg_pe_years"] == 3


def test_roe_is_eps_over_nav():
    vals, _ = _roe_series(fin_rows("EBL")[-1:])
    assert vals[0] == pytest.approx(16.7, abs=0.05)        # 5.23 / 31.38, not Amarstock's 28.2


@pytest.mark.parametrize("loan,res,mcap,level", [
    (15100.5, 9818.5, 19280.4, "over_reserve"),   # BSC: 1,510 Cr loan vs 982 Cr reserve
    (10399.59, 7009.7, 9795.7, "over_mcap"),      # ENVOYTEX: loan above market cap too
    (24810.11, 19496.4, 16500.0, "over_mcap"),    # ACMELAB: 2,481 Cr loan vs 1,650 Cr market cap
    (825.5, 129050.4, 199451.0, "ok"),            # SQURPHARMA
    (None, 1000.0, 2000.0, None),
])
def test_debt_load(loan, res, mcap, level):
    assert debt_load(loan, res, mcap)["debt_level"] == level


def test_negative_interim_cash_caps_cash_from_profit():
    ext = [{"year": y, "operating_cf": 130.0, "net_profit": 100.0, "total_debt": 0.0, "total_equity": 1000.0,
            "ebit": 150.0, "interest_expense": 0.0, "total_assets": 2000.0, "cash_and_equivalents": 300.0}
           for y in (2022, 2023, 2024, 2025)]
    _, ok = _a2_pillar2(ext)
    _, neg = _a2_pillar2(ext, interim_nocfps=-134.34)
    assert ok["p2_cfo"] == 10.0
    assert neg["p2_cfo"] == NEG_INTERIM_CFO_CAP
    _, bank = _a2_pillar2(ext, is_financial=True, interim_nocfps=-5.0)
    assert bank["p2_cfo"] != NEG_INTERIM_CFO_CAP          # lenders' cash swings with the loan book
    _, ins = _a2_pillar2(ext, is_insurance=True, interim_nocfps=-1.08)
    assert ins["p2_cfo"] == ok["p2_cfo"]                  # insurers: claims timing (NORTHRNINS)


def test_debt_cap_value_is_weak_band():
    assert DEBT_OVER_MCAP_P2_CAP < 4.0


def test_p5_latest_payout_and_newer_fy_yield():
    # LHB FY2025: audited total 40% (৳4.0) on EPS 4.40 -> payout 90.9%, yield at ৳60.7 = 6.6%
    _, sub = _a2_pillar5(fin_rows("LHB"), 60.7, 10.0)
    assert sub["payout_latest_pct"] == pytest.approx(90.9, abs=0.1)
    assert sub["div_yield_pct"] == pytest.approx(6.6, abs=0.05)
    # WALTONHIL: FY2026 declared (180%) before the audited table has FY2026.
    _, w = _a2_pillar5(fin_rows("WALTONHIL"), 340.0, 10.0, ledger_cash_pct={2025: 175.0, 2026: 180.0})
    assert w["div_latest_fy"] == 2026
    assert w["div_yield_pct"] == pytest.approx(18.0 / 340 * 100, abs=0.05)


# --------------------------------------------------------------------------- #
# 2026-11-04 audit, round 1 (GR1, GR2, GR4, RP2, DT2)
# --------------------------------------------------------------------------- #

def test_a_high_margin_that_slipped_is_not_scored_like_a_tiny_one():
    from backend.services.scoring_service import _a2_gm_score
    # BATBC-like: 49.8% gross margin, down 1.3 points — fell to 2.0 before.
    slipped = _a2_gm_score(49.8, -1.3)
    assert slipped > 8.0
    assert _a2_gm_score(5.0, 0.0) < 3.0
    # Still ordered: a falling margin scores below the same steady margin.
    assert _a2_gm_score(35.0, -3.0) < _a2_gm_score(35.0, 0.0) < _a2_gm_score(35.0, 3.0)
    # No cliffs: nearby inputs give nearby scores.
    assert abs(_a2_gm_score(30.5, -1.1) - _a2_gm_score(30.5, -0.9)) < 0.01


def test_negative_nav_has_no_pb():
    rows = [dict(r) for r in fin_rows("JAMUNAOIL")]
    rows[-1]["nav_per_share"] = -21.8            # equity wiped out this year
    _, sub = _a2_pillar4(rows, 9.0, 10.0, 1.0)
    assert sub["p4_pb"] == 0.0 and sub["current_pb"] is None
    # A negative interim NAV counts as the latest too.
    _, sub2 = _a2_pillar4(fin_rows("JAMUNAOIL"), 175.0, 19.7, 0.75, nav_override=-14.65)
    assert sub2["p4_pb"] == 0.0


def test_sector_median_needs_five_peers():
    from backend.services.scoring_service import peer_median
    market = [(f"M{i}", float(v)) for i, v in enumerate([8, 10, 12, 14, 16, 18, 20])]
    tiny = [("SELF", 9.0), ("A", 136.0)]               # Ceramics: one profitable peer
    assert peer_median(tiny, "SELF", market) == 14.0   # the market's median stands in
    five = [("SELF", 9.0)] + [(c, v) for c, v in [("A", 10.0), ("B", 11.0), ("C", 12.0), ("D", 13.0), ("E", 14.0)]]
    assert peer_median(five, "SELF", market) == 12.0


def test_lender_cushion_of_100_percent_is_bad_data():
    ext = [{"year": 2024, "total_equity": 5e9, "total_assets": 5e9, "operating_cf": 1e8, "net_profit": 1e8}]
    _, sub = _a2_pillar2(ext, is_financial=True)
    assert sub["p2_capital"] is None                    # FASFIN read as a strong lender
    ext[0]["total_assets"] = 5e10                       # a real 10% cushion still scores
    _, sub = _a2_pillar2(ext, is_financial=True)
    assert sub["p2_capital"] is not None


def test_an_interim_alone_does_not_replace_the_full_years_yield():
    # GP: FY2025 audited 215%; FY2026 so far only a 105% interim.
    rows = [{"year": y, "eps": e, "cash_dividend_pct": c}
            for y, e, c in [(2021, 25.6, 275.0), (2022, 22.9, 250.0), (2023, 22.9, 125.0),
                            (2024, 24.6, 330.0), (2025, 27.0, 215.0)]]
    _, sub = _a2_pillar5(rows, 231.0, 10.0, ledger_cash_pct={2025: 105.0, 2026: 105.0},
                         ledger_complete={2025})
    assert sub["div_yield_pct"] == pytest.approx(21.5 / 231.0 * 100, abs=0.05)
    assert sub["div_latest_fy"] == 2025
    # Once the final is declared the newer year stands in.
    _, done = _a2_pillar5(rows, 231.0, 10.0, ledger_cash_pct={2026: 230.0}, ledger_complete={2026})
    assert done["div_latest_fy"] == 2026


def test_lender_cushion_falls_back_to_dse_nav():
    from backend.services.scoring_service import lender_equity
    # IDLC: Amarstock equity = assets (৳148.9bn); DSE NAV ৳49.96 × 458.3m shares.
    own = lender_equity(148.9e9, 148.9e9, 49.96, 458_307_579)
    assert own == pytest.approx(22.9e9, rel=0.01)
    assert lender_equity(148.9e9, 148.9e9, None, None) is None
    assert lender_equity(15e9, 150e9, 49.96, 458_307_579) == 15e9      # a believable figure stays
    assert lender_equity(5e9, 5e9, -125.6, 100_000_000) < 0           # FASFIN: negative equity is real
    ext = [{"year": 2024, "total_equity": 148.9e9, "total_assets": 148.9e9, "operating_cf": 1.9e9}]
    _, sub = _a2_pillar2(ext, is_financial=True, lender_nav=(49.96, 458_307_579))
    assert sub["p2_capital"] is not None



# --------------------------------------------------------------------------- #
# Round 3 (2026-11-05): bonus restatement, ceilings, loans (the settled
# grade moved to grade_rules, tests in test_grade_rules.py)
# --------------------------------------------------------------------------- #

def test_bonus_shares_restate_eps_history():
    from backend.services.scoring_service import bonus_adjust_rows
    rows = [{"year": 2023, "eps": 2.0, "nav_per_share": 20.0, "cash_dividend_pct": 10.0, "stock_dividend_pct": 10.0,
             "profit_mn": 200.0, "pe_ratio_basic": 10.0},
            {"year": 2024, "eps": 2.0, "nav_per_share": 22.0, "cash_dividend_pct": 10.0, "stock_dividend_pct": 0.0,
             "profit_mn": 220.0, "pe_ratio_basic": 9.0}]
    out = bonus_adjust_rows(rows)
    assert out[0]["eps"] == pytest.approx(2.0 / 1.1)          # 2023 on 2024's share count
    assert out[0]["pe_ratio_basic"] == 10.0                    # year-end P/E unchanged
    assert out[1]["eps"] == 2.0
    # Today's count is 10% above what 2024's profit / EPS implies: a bonus has gone ex.
    out2 = bonus_adjust_rows(rows, total_shares=121_000_000)  # implied 110m
    assert out2[1]["eps"] == pytest.approx(2.0 / 1.1, rel=1e-6)


def test_absolute_pe_ceiling():
    rows = [{"year": y, "eps": 1.0, "nav_per_share": 10.0, "pe_ratio_basic": 900.0} for y in (2020, 2021, 2024, 2025)]
    _, sub = _a2_pillar4(rows, 612.0, 900.0, 60.0)           # P/E 612 against its own 900
    assert sub["p4_pe"] <= 1.0


def test_dse_loan_figure_wins_when_larger():
    ext = [{"year": 2025, "total_debt": 2.3e6, "total_equity": 1e10, "ebit": 3e9, "interest_expense": 1e6,
            "operating_cf": 2e9, "net_profit": 1.5e9}]
    _, low = _a2_pillar2(ext)
    _, real = _a2_pillar2(ext, dse_loan_mn=42000.0)            # DESCO: ৳42bn on DSE's page
    assert real["p2_de"] < low["p2_de"]
