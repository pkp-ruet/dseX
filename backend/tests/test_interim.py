"""#4 #5 #6 #8 — quarterly results parsed from DSE posts: TTM EPS, latest NAV,
this-year trend and operating cash."""
from datetime import date

import pytest

from backend.services.interim_service import (
    interim_facts, latest_interim, parse_interim_post, parse_period,
)
from backend.tests.fixtures import Q, fin_rows, post


def facts(code, q_key=None):
    raw = parse_interim_post(*Q[q_key or code])
    return interim_facts(raw, fin_rows(code))


@pytest.mark.parametrize("text,expected", [
    ("July 2025-March 2026", (date(2025, 7, 1), date(2026, 3, 31), 9)),
    ("January-June 2026", (date(2026, 1, 1), date(2026, 6, 30), 6)),
    ("July-December 2025", (date(2025, 7, 1), date(2025, 12, 31), 6)),
    ("Jan-March 2026", (date(2026, 1, 1), date(2026, 3, 31), 3)),
    ("January-September, 2025", (date(2025, 1, 1), date(2025, 9, 30), 9)),
])
def test_parse_period(text, expected):
    assert parse_period(text) == expected


# --- #5 TTM EPS = last FY EPS - last year's YTD + this year's YTD ----------

@pytest.mark.parametrize("code,ttm,ltp,pe", [
    ("JAMUNAOIL", 48.62, 175.0, 3.6),    # 58.70 - 36.65 + 26.57 (site showed P/E 3.0 on FY EPS)
    ("EBL", 5.76, 23.0, 4.0),            # 5.23 - 2.14 + 2.67
    ("BRACBANK", 11.10, 64.4, 5.8),      # 9.12 - 3.09 + 5.07
    ("NAVANAPHAR", 5.64, 63.7, 11.3),    # 4.54 - 3.49 + 4.59
])
def test_ttm_eps_and_pe(code, ttm, ltp, pe):
    f = facts(code)
    assert f["ttm_eps"] == pytest.approx(ttm, abs=0.005)
    assert round(ltp / f["ttm_eps"], 1) == pe


# --- #6 latest NAV from the quarterly report --------------------------------

@pytest.mark.parametrize("code,nav,ltp,pb", [
    ("BSC", 115.45, 110.0, 0.95),
    ("NAVANAPHAR", 49.53, 63.7, 1.29),
    ("BATBC", 107.15, 225.0, 2.10),
    ("ACMELAB", 132.27, 85.3, 0.64),     # ACMELAB's own reported NAV — see the report on the ৳102 figure
])
def test_latest_nav(code, nav, ltp, pb):
    f = facts(code)
    assert f["nav"] == nav
    assert round(ltp / f["nav"], 2) == pytest.approx(pb, abs=0.01)


# --- #4 this year's trend -----------------------------------------------------

@pytest.mark.parametrize("code,cum,cum_prev,q_yoy", [
    ("BSC", 13.11, 14.38, -15.6),        # 9M -9%, Q3 -16%
    ("JAMUNAOIL", 26.57, 36.65, -45.5),  # 9M -27%, Q3 -45%
    ("ENVOYTEX", 5.89, 6.03, -36.9),     # 9M -2%, Q3 -37%
    ("LHB", 1.87, 2.03, 8.4),            # H1 -8%
])
def test_interim_trend(code, cum, cum_prev, q_yoy):
    f = facts(code)
    assert (f["eps_cum"], f["eps_cum_prev"]) == (cum, cum_prev)
    assert f["eps_q_yoy_pct"] == pytest.approx(q_yoy, abs=0.1)
    assert f["eps_cum_yoy_pct"] == pytest.approx((cum - cum_prev) / cum_prev * 100, abs=0.1)


# --- #8 operating cash ----------------------------------------------------------

def test_negative_nocfps_parsed():
    assert facts("JAMUNAOIL")["nocfps_cum"] == -134.34
    assert facts("JAMUNAOIL")["nocfps_cum_prev"] == 88.26
    assert facts("LHB")["nocfps_cum"] == -2.59
    assert facts("LHB")["nocfps_cum_prev"] == 1.64


def test_diluted_only_post_still_reads():
    raw = parse_interim_post(*Q["NAVANAPHAR_Q2"])
    assert (raw["eps_cum"], raw["eps_cum_prev"], raw["months"]) == (3.35, 2.25, 6)


def test_q1_cumulative_is_the_quarter():
    f = facts("GP")
    assert f["months"] == 3 and f["ttm_eps"] == pytest.approx(22.11, abs=0.005)
    assert f["eps_q_yoy_pct"] is None   # Q1: the quarter IS the year to date


def test_latest_post_wins_and_superseded_interim_is_ignored():
    older = {"title": "BSC: Q2 Financials", "post_date": None,
             "body": "EPS was Tk. 8.93 for July-December 2025 as against Tk. 9.35 for July-December 2024."}
    assert latest_interim([older, post("BSC")])["months"] == 9
    # Once FY2026 is in the audited table, a 9M-to-Mar-2026 report is old news.
    rows = fin_rows("BSC") + [{"year": 2026, "eps": 18.0, "nav_per_share": 120.0}]
    assert interim_facts(parse_interim_post(*Q["BSC"]), rows) is None


def test_label_bilingual():
    f = facts("JAMUNAOIL")
    assert f["label_en"] == "9 months to Mar 2026"
    assert "মার্চ 2026" in f["label_bn"]
