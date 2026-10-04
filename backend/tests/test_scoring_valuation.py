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
    assert sub["own_avg_pe"] == 14.79
    assert sub["own_avg_pe_years"] == 5


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
