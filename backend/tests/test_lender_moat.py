"""Business strength (P3) for banks and NBFIs, 2026-11-05.

A DSE bank's net interest income leaves out its treasury-bill and bond income,
so it collapsed for banks that moved into government securities while their
whole income rose. The check now reads lenders on total assets (size), gross
interest income (steadiness) and, for banks, operating profit per ৳100 of
assets (margin); capex is not applicable to them.

Figures are the real Amarstock rows in `company_financials_ext` (৳bn).
"""
import pytest

from backend.services.scoring_service import (
    _a2_pillar3, _bank_earning_power, _lender_size, _lender_top_line, _sector_rank_scores,
)


def _row(year, nii=None, ii=None, ebit=None, ta=None, ea=None, capex=None, rev=None, gp=None, np_=None):
    return {"year": year, "net_interest_income": nii, "interest_income": ii, "ebit": ebit,
            "total_assets": ta, "earning_assets": ea, "capex": capex, "revenue": rev,
            "gross_profit": gp, "net_profit": np_}


# CITYBANK: net interest income 12.3 → 2.9 in 2025 while gross interest income
# rose every year and operating profit went 12.1 → 27.3.
CITYBANK = [
    _row(2021, nii=12.327, ii=21.053, ebit=12.085, ta=424.914, ea=372.066, capex=-1.098, np_=9.544),
    _row(2022, nii=12.607, ii=25.833, ebit=12.367, ta=514.912, ea=455.568, capex=-1.416, np_=9.378),
    _row(2023, nii=16.076, ii=34.065, ebit=13.906, ta=564.929, ea=501.722, capex=-1.358, np_=11.086),
    _row(2024, nii=14.941, ii=45.244, ebit=23.514, ta=711.288, ea=629.325, capex=-1.198, np_=17.229),
    _row(2025, nii=2.909, ii=54.836, ebit=27.272, ta=847.202, ea=733.480, capex=-2.657, np_=19.118),
]

# IDLC (an NBFI): no operating-profit line; net interest income flat-to-down,
# gross interest income up.
IDLC = [
    _row(2021, nii=5.1, ii=10.5, ta=142.9, ea=138.4, np_=2.1),
    _row(2022, nii=5.1, ii=11.2, ta=148.2, ea=143.4, np_=1.9),
    _row(2023, nii=5.0, ii=12.6, ta=147.1, ea=142.4, np_=1.5),
    _row(2024, nii=4.8, ii=14.8, ta=148.9, ea=143.4, np_=2.0),
]


def test_citybank_is_read_on_its_whole_business():
    score, sub = _a2_pillar3("CITYBANK", CITYBANK, {"CITYBANK": 9.2}, is_financial=True)
    # Gross interest income +23 / +22 / +32 / +33 / +21% a year: steady (was 0
    # on net interest income, which fell 80% in 2025).
    assert sub["p3_rev_vol"] == pytest.approx(9.91, abs=0.01)
    # Operating profit per ৳100 of assets: 2.84, 2.40, 2.46, 3.31, 3.22 —
    # average 2.85 (7.5) and rising (+1). Was 3.9 on net interest margin.
    assert sub["p3_margin"] == pytest.approx(8.54, abs=0.01)
    # Capex is not applicable to a lender: left out, not scored 2.0 against
    # net interest income (91% of it in 2025).
    assert sub["p3_capex"] is None
    assert sub["p3_coverage"] == 1.0
    assert score >= 7.0                     # a strong check (was 2.4)


def test_bank_margin_is_operating_profit_on_assets():
    vals = _bank_earning_power(CITYBANK)
    assert [round(v, 2) for v in vals] == [2.84, 2.40, 2.46, 3.31, 3.22]


def test_a_loss_making_bank_still_reads_weak():
    # FIRSTSBANK 2024 / NBL: operating profit below zero.
    rows = [
        _row(2021, nii=1.4, ii=30.9, ebit=2.4, ta=575.7, ea=533.5),
        _row(2022, nii=-9.9, ii=18.4, ebit=-35.0, ta=522.1, ea=453.1),
        _row(2023, nii=-14.6, ii=15.9, ebit=-21.3, ta=567.3, ea=449.3),
        _row(2024, nii=-22.6, ii=15.0, ebit=-25.9, ta=574.8, ea=451.6),
    ]
    score, sub = _a2_pillar3("NBL", rows, {"NBL": 7.6}, is_financial=True)
    assert sub["p3_margin"] == 0.0
    # Gross interest income shrinking 40% / 14% / 6% a year → the shrinking floor.
    assert sub["p3_rev_vol"] == 0.0
    assert score < 4.0                      # still weak, even as a big bank


def test_nbfi_without_operating_profit_keeps_nim():
    score, sub = _a2_pillar3("IDLC", IDLC, {"IDLC": 10.0}, is_financial=True)
    # NIM 3.69, 3.56, 3.51, 3.35 → average 3.53; down 0.19 points, inside the
    # ±0.2 band, so no nudge. Same as before the change.
    assert sub["p3_margin"] == pytest.approx(9.05, abs=0.01)
    # Steady sales on gross interest income (+6.7 / +12.5 / +17.5%), not on
    # net interest income (−0.2 / −2 / −4% read as a shrinking business, 2.4).
    assert sub["p3_rev_vol"] == 10.0
    assert sub["p3_capex"] is None and sub["p3_coverage"] == 1.0


def test_top_line_is_gross_interest_income():
    assert _lender_top_line(IDLC) == [(2021, 10.5), (2022, 11.2), (2023, 12.6), (2024, 14.8)]


def test_top_line_never_mixes_gross_and_net():
    # A year missing the gross line is a gap — never filled with the net line,
    # which is a fraction of it and would read as a crash and a jump.
    rows = [_row(2021, nii=5.0, ii=20.0), _row(2022, nii=5.5, ii=None), _row(2023, nii=6.0, ii=24.0)]
    assert _lender_top_line(rows) == [(2021, 20.0), (2023, 24.0)]
    # A year at or below zero is a gap too.
    rows = [_row(2021, ii=-0.7), _row(2022, ii=0.2), _row(2023, ii=0.5)]
    assert _lender_top_line(rows) == [(2022, 0.2), (2023, 0.5)]


def test_top_line_falls_back_to_net_only_without_any_gross_line():
    rows = [_row(2021, nii=2.0), _row(2022, nii=2.2), _row(2023, nii=-0.1)]
    assert _lender_top_line(rows) == [(2021, 2.0), (2022, 2.2)]
    assert _lender_top_line([_row(2021)]) == []


def test_lender_size_is_total_assets():
    assert _lender_size(CITYBANK[-1]) == 847.202
    assert _lender_size(_row(2024, ta=None)) is None
    assert _lender_size(_row(2024, ta=0.0)) is None


def test_sector_rank_by_size():
    sizes = {"Bank": [("CITYBANK", 847.2, 2025), ("JAMUNABANK", 366.5, 2024),
                      ("MIDLANDBNK", 102.8, 2024), ("OLDBANK", 900.0, 2021)]}
    ranks = _sector_rank_scores(sizes)
    # OLDBANK's 2021 figure is 4 years behind the sector's freshest: left out.
    assert "OLDBANK" not in ranks
    assert ranks == {"CITYBANK": 10.0, "JAMUNABANK": 6.0, "MIDLANDBNK": 2.0}
    # A solo company and DSE's catch-all sector get the neutral 5.
    assert _sector_rank_scores({"Cement": [("X", 1.0, 2024)]}) == {"X": 5.0}
    assert _sector_rank_scores({"Miscellaneous": [("A", 9.0, 2024), ("B", 1.0, 2024)]}) == {"A": 5.0, "B": 5.0}


def test_industrials_keep_capex_and_revenue():
    rows = [_row(y, rev=r, gp=r * 0.35, capex=-r * 0.08, np_=r * 0.1)
            for y, r in ((2021, 100.0), (2022, 110.0), (2023, 121.0), (2024, 133.0))]
    score, sub = _a2_pillar3("X", rows, {"X": 6.0})
    assert sub["p3_capex"] == 10.0          # 8% of sales: the sweet spot
    assert sub["p3_rev_vol"] == 10.0        # +10% every year
    assert sub["p3_coverage"] == 1.0
