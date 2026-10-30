from datetime import date

from backend.services.z_risk import OVERDUE_DAYS, assess, year_after

TODAY = date(2026, 10, 31)


def test_a_year_with_no_decision_six_months_on_is_red():
    r = assess(today=TODAY, category="A", last_decided=date(2024, 12, 31))
    assert r["level"] == "red"
    assert r["reasons"][0]["key"] == "late_year"
    assert "31 Dec 2025" in r["reasons"][0]["en"] and "10 months" in r["reasons"][0]["en"]


def test_a_june_company_in_results_season_is_not_flagged():
    # FY ended 30 Jun 2026; four months on is normal in October.
    assert assess(today=TODAY, category="A", last_decided=date(2025, 6, 30)) is None


def test_getting_late_is_amber():
    last = date(2025, 5, 31)  # year after = 31 May 2026, 153 days before TODAY
    r = assess(today=TODAY, category="B", last_decided=last)
    assert r["level"] == "amber" and (TODAY - year_after(last)).days < OVERDUE_DAYS


def test_companies_already_in_z_are_skipped():
    assert assess(today=TODAY, category="Z", last_decided=date(2023, 12, 31)) is None


def test_closed_factory_and_losses_beyond_capital_are_red():
    r = assess(today=TODAY, category="B", closed_visit=date(2026, 5, 5))
    assert r["level"] == "red" and r["reasons"][0]["key"] == "factory_closed"
    assert assess(today=TODAY, category="B", closed_visit=date(2025, 6, 1)) is None  # over a year old
    r = assess(today=TODAY, category="A", reserve_mn=-400, paid_up_mn=300)
    assert r["reasons"][0]["key"] == "losses"
    assert assess(today=TODAY, category="A", reserve_mn=-100, paid_up_mn=300) is None


def test_old_accounts_alone_never_list_a_company():
    assert assess(today=TODAY, category="A", data_age_years=2, last_reported_year=2024) is None
    r = assess(today=TODAY, category="A", last_decided=date(2024, 12, 31), data_age_years=2, last_reported_year=2024)
    assert [x["key"] for x in r["reasons"]] == ["late_year", "old_accounts"]


def test_every_reason_is_bilingual_and_never_says_will():
    r = assess(today=TODAY, category="A", last_decided=date(2024, 12, 31), closed_visit=date(2026, 9, 1),
               reserve_mn=-500, paid_up_mn=100, data_age_years=3, last_reported_year=2023)
    assert len(r["reasons"]) == 4
    for x in r["reasons"]:
        assert x["en"] and x["bn"]
        assert " will " not in x["en"]
