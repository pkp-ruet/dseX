"""utils/dividend_years.py — which fiscal year a declaration belongs to, whether
that year is complete, and another group company's dividend left out (audit
DT1 / DT2, 2026-11-04). Rows are shaped like real ledger docs."""
from datetime import datetime

from scrapers.news import is_declaration_news
from utils.dividend_years import (
    fiscal_year, is_other_company_dividend, ledger_cash_by_year, ledger_years, own_rows, year_end_month,
)


def row(title, period_end, cash, kind="Final", code="X"):
    return {"trading_code": code, "title": f"{code}: {title}", "period_end": period_end,
            "cash_pct": cash, "dividend_type": kind}


def test_subsidiary_and_associate_titles():
    assert is_other_company_dividend("UPGDCL: Dividend declaration of a Subsidiary")
    assert is_other_company_dividend("KPCL: Declaration of Dividend by Associate Company")
    assert is_other_company_dividend("MALEKSPIN: Declaration of Interim Cash Dividend by a Subsidiary Company")
    assert not is_other_company_dividend("GP: Declaration of Interim Dividend and Audited Q2 Financials")
    assert not is_other_company_dividend("LHB: Dividend Declaration")


def test_scraper_does_not_store_a_subsidiarys_dividend():
    item = {"trading_code": "KPCL", "title": "KPCL: Declaration of Dividend by Associate Company",
            "body": "The associate company has declared 35% cash dividend for the year ended June 30, 2026.",
            "post_date": datetime(2026, 10, 26)}
    assert not is_declaration_news(item)


def test_own_rows_drop_other_companies():
    rows = [row("Dividend Declaration", "2026-06-30", 7.5, code="KPCL"),
            row("Declaration of Dividend by Associate Company", "2026-06-30", 35.0, code="KPCL")]
    assert [r["cash_pct"] for r in own_rows(rows)] == [7.5]
    assert ledger_cash_by_year(rows) == {2026: 7.5}          # not 42.5 (a 39% yield)


def test_year_end_month_from_finals():
    marico = [row("Interim", "2025-09-30", 500.0, "Interim"), row("Final", "2026-03-31", 500.0)]
    assert year_end_month(marico) == 3
    assert year_end_month([row("Interim", "2025-09-30", 500.0, "Interim")]) is None


def test_fiscal_year_follows_the_year_end():
    assert fiscal_year("2025-09-30", 3) == 2026      # MARICO: quarter to Sep 2025 is FY2026
    assert fiscal_year("2026-03-31", 3) == 2026
    assert fiscal_year("2026-06-30", 3) == 2027
    assert fiscal_year("2025-12-31", 6) == 2026      # June year-end, half-year interim
    assert fiscal_year("2026-06-30", 6) == 2026
    assert fiscal_year("2026-06-30", 12) == 2026     # GP (December)
    assert fiscal_year("2026-06-30", None) == 2026   # unknown year end: the old rule


def test_marico_years_sum_by_fiscal_year():
    rows = [row("Interim", "2025-09-30", 500.0, "Interim"), row("Interim", "2025-12-31", 475.0, "Interim"),
            row("Final", "2026-03-31", 500.0), row("Interim", "2026-06-30", 500.0, "Interim"),
            row("Interim", "2026-09-30", 350.0, "Interim")]
    years = ledger_years(rows)
    assert years[2026] == {"cash_pct": 1475.0, "complete": True}
    assert years[2027] == {"cash_pct": 850.0, "complete": False}


def test_an_interim_alone_is_not_a_complete_year():
    gp = [row("Dividend Declaration", datetime(2025, 12, 31), 105.0),
          row("Declaration of Interim Dividend", datetime(2026, 6, 30), 105.0, "Interim")]
    assert ledger_cash_by_year(gp) == {2025: 105.0, 2026: 105.0}
    assert ledger_cash_by_year(gp, complete_only=True) == {2025: 105.0}
