"""Amarstock total-debt line picking (scrapers/cash_flow_scraper.py)."""
from scrapers.cash_flow_scraper import _find_total_debt

BS = "balance-sheet"


def lines(*pairs):
    return [{"r": BS, "k": k, "l": v} for k, v in pairs]


def test_long_and_short_legs_are_summed():
    # "Long term borrowings" used to be taken as the total (generic "borrowings").
    yr = lines(("Long term borrowings", 700.0), ("Trade payables", 50.0), ("Short term borrowings", 1800.0))
    assert _find_total_debt(yr) == 2500.0


def test_explicit_total_wins():
    yr = lines(("Long term borrowings", 700.0), ("Short term borrowings", 1800.0), ("Total borrowings", 2500.0))
    assert _find_total_debt(yr) == 2500.0


def test_non_current_and_current_are_not_double_counted():
    yr = lines(("Non-current borrowings", 300.0), ("Current borrowings", 200.0))
    assert _find_total_debt(yr) == 500.0


def test_short_term_loan_listed_first_stays_short():
    yr = lines(("Short term loan", 120.0), ("Long term loan", 80.0))
    assert _find_total_debt(yr) == 200.0


def test_generic_lines_under_both_sections_are_added():
    yr = lines(("Loans and borrowings", 400.0), ("Deferred tax", 30.0), ("Loans and borrowings", 150.0))
    assert _find_total_debt(yr) == 550.0


def test_financial_facility_alone_and_no_debt():
    assert _find_total_debt(lines(("Other Financial Facility", 90.0))) == 90.0
    assert _find_total_debt(lines(("Trade payables", 50.0))) is None
