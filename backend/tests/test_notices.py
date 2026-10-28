"""DSE notices read by backend/services/notices.py — the year's figures in a
dividend notice (and the provisional row they become), insider trades, credit
ratings, board meetings, DSE inspections / queries / category changes.
Fixtures are real posts from `company_news` (backend/tests/notice_fixtures.py)."""
from datetime import date

import pytest

from backend.services.notices import (
    annual_record, company_notices, newest_annual, pair_insider_trades, parse_annual_results,
    parse_board_meeting, parse_category_change, parse_credit_rating, parse_date, parse_inspection,
    parse_insider, parse_query_response, provisional_fin_row,
)
from backend.tests.notice_fixtures import NOTICES


def n(key):
    return NOTICES[key]


@pytest.mark.parametrize("text,expected", [
    ("June 30, 2026", date(2026, 6, 30)),
    ("30-Jun-2026", date(2026, 6, 30)),
    ("31 December 2025", date(2025, 12, 31)),
    ("30 June, 2026", date(2026, 6, 30)),
    ("5.01.2026", date(2026, 1, 5)),
    ("20.01.2026", date(2026, 1, 20)),
    ("2026-10-28", date(2026, 10, 28)),
    ("31st December, 2025", date(2025, 12, 31)),
    ("no date here", None),
])
def test_parse_date(text, expected):
    assert parse_date(text) == expected


# --- the year's figures in a dividend notice ---------------------------------

@pytest.mark.parametrize("key,fy,eps,eps_prev,nav,nocfps,nocfps_prev,consolidated", [
    # "Consolidated EPS … as against Tk. 27.04, Tk. 157.88 and Tk. 19.52 respectively"
    ("annual_squr", 2026, 31.24, 27.04, 178.99, 18.65, 19.52, True),
    # "for the year ended 30-Jun-2026 as against Consolidated EPS of Tk. 19.36, …" (labelled)
    ("annual_renata", 2026, 31.76, 19.36, 329.19, 49.88, 41.16, True),
    # labelled last year with a negative NOCFPS "Tk. (0.76)"
    ("annual_hwawell", 2026, 3.71, 3.64, 41.89, 0.09, -0.76, False),
    # "Tk. 4.97 (restated)" … "Tk. (0.37) (restated)"
    ("annual_dbh", 2025, 4.69, 4.97, 49.55, 7.46, -0.37, False),
    # a loss year, "EPS of Tk. (0.91)"
    ("annual_bbs", 2026, -0.91, -0.59, 10.69, 0.09, 1.13, False),
    # "Basic and Diluted EPS of Tk. 10.00"
    ("annual_olympic", 2026, 10.00, 10.06, 69.35, 11.79, 11.45, False),
    # cut off mid last-year: "as against Consolidated Tk. 6.18, Consolidated Tk. 39.38 and (cont.1)"
    ("annual_bracbank", 2025, 9.12, 6.18, 51.56, 72.72, None, True),
    # "Regarding Audited Financials of Year 2024" — not a dividend notice, same figures
    ("annual_unionbank", 2024, -248.91, -2.82, -237.44, -22.09, -0.27, False),
])
def test_annual_results(key, fy, eps, eps_prev, nav, nocfps, nocfps_prev, consolidated):
    r = parse_annual_results(*n(key))
    assert r["fy"] == fy
    assert r["eps"] == eps and r["eps_prev"] == eps_prev
    assert r["nav"] == nav
    assert r["nocfps"] == nocfps and r["nocfps_prev"] == nocfps_prev
    assert r["consolidated"] is consolidated


def test_annual_prefers_nav_with_revaluation():
    # "NAV per share without revaluation of Tk. 18.36, NAV per share with revaluation of Tk. 19.91"
    r = parse_annual_results(*n("annual_eil"))
    assert r["nav"] == 19.91 and r["eps"] == 1.18 and r["eps_prev"] is None  # last year cut off


@pytest.mark.parametrize("key", [
    "annual_reliance1",    # a mutual fund: EPU / NAV per unit
    "annual_lhb_interim",  # an interim dividend on "the period ended September 30, 2026"
    "annual_midland",      # declaration only, the figures were in the cut-off continuation
    "annual_phoenixfin",   # cut off before "for the year ended"
])
def test_annual_none(key):
    assert parse_annual_results(*n(key)) is None


def test_annual_record_carries_the_dividend():
    r = annual_record(*n("annual_squr"))
    assert (r["cash_pct"], r["stock_pct"]) == (130.0, 0.0)
    assert annual_record(*n("annual_bracbank"))["stock_pct"] == 15.0
    assert annual_record(*n("annual_unionbank"))["cash_pct"] is None  # not a dividend notice


def test_revised_eps_keeps_the_rest():
    fix = parse_annual_results(*n("annual_janatains_fix"))
    assert fix["eps"] == 1.10 and fix["fy"] == 2025
    first = {**fix, "eps": 1.30, "nav": 24.0, "nocfps": 2.1, "post_date": date(2026, 5, 1)}
    best = newest_annual([fix, first])
    assert best["eps"] == 1.10 and best["nav"] == 24.0 and best["nocfps"] == 2.1


# --- the provisional row ------------------------------------------------------

AUDITED = [{"year": 2024, "eps_cont_basic": 23.61, "nav_per_share": 142.05},
           {"year": 2025, "eps_cont_basic": 27.04, "nav_per_share": 157.88, "cash_dividend_pct": 120.0}]


def test_provisional_row():
    row = provisional_fin_row(annual_record(*n("annual_squr")), AUDITED)
    assert row["year"] == 2026 and isinstance(row["year"], int)
    assert row["eps"] == row["eps_cont_basic"] == 31.24 and row["eps_basic"] is None
    assert row["nav_per_share"] == 178.99 and row["nocfps"] == 18.65
    assert row["cash_dividend_pct"] == 130.0 and row["stock_dividend_pct"] == 0.0
    assert row["provisional"] is True and row["source"] == "notice"
    assert row["post_date"] == "2026-10-27" and row["fy_end"] == "2026-06-30"
    assert "pe_ratio_basic" not in row and "profit_mn" not in row


def test_provisional_only_when_newer():
    assert provisional_fin_row(annual_record(*n("annual_squr")),
                               AUDITED + [{"year": 2026, "eps_cont_basic": 31.24}]) is None
    # an audited row with no EPS doesn't count as having the year
    assert provisional_fin_row(annual_record(*n("annual_squr")),
                               AUDITED + [{"year": 2026, "eps_cont_basic": None}]) is not None
    # a company with no audited rows yet still gets its year
    assert provisional_fin_row(annual_record(*n("annual_squr")), [])["year"] == 2026
    assert provisional_fin_row(None, AUDITED) is None


def test_provisional_dividend_takes_the_ledger_total():
    # A notice that names only the final: the ledger's interim + final is the year.
    rec = {**annual_record(*n("annual_squr")), "cash_pct": 30.0}
    assert provisional_fin_row(rec, AUDITED, ledger_cash_pct=55.0)["cash_dividend_pct"] == 55.0
    # "40% including 18% interim": the notice's total beats the ledger's remainder.
    rec = {**rec, "cash_pct": 40.0}
    assert provisional_fin_row(rec, AUDITED, ledger_cash_pct=22.0)["cash_dividend_pct"] == 40.0


# --- insider trades ------------------------------------------------------------

@pytest.mark.parametrize("key,kind,side,role,name,shares,market", [
    ("ins_squr_md_decl", "declaration", "buy", "md", "Mr. Tapan Chowdhury", 2_000_000, "block"),
    ("ins_squr_chair_conf", "confirmation", "buy", "chairman", "Mr. Samuel S Chowdhury", 2_000_000, None),
    ("ins_squr_dir_decl", "declaration", "buy", "director", "Mrs. Ratna Patra", 1_000_000, "both"),
    ("ins_ncc_decl", "declaration", "sell", "sponsor", "Mr. M. A. Quasem", 92_000, "both"),
    # Indian grouping "15,00,000", "completed its selling of"
    ("ins_rdfood_conf", "confirmation", "sell", "corporate_director", "Bidisha International Limited", 1_500_000, None),
    ("ins_rdfood_decl", "declaration", "sell", "corporate_director", "Bidisha International Limited", 1_500_000, "public"),
    # "Corporate Sponsor" is a sponsor
    ("ins_nhfil", "confirmation", "sell", "sponsor", "United Commercial Bank PLC", 563_562, None),
    # "Buy Confirmation" with no role: a company linked to a director
    ("ins_pubali", "confirmation", "buy", "other", "Trouser Line Limited", None, None),
])
def test_parse_insider(key, kind, side, role, name, shares, market):
    r = parse_insider(*n(key))
    assert (r["kind"], r["side"], r["role"], r["name"]) == (kind, side, role, name)
    if shares is not None:
        assert r["shares"] == shares
    assert r["market"] == market


def test_insider_dates():
    decl = parse_insider(*n("ins_ncc_decl"))
    assert decl["by_date"] == date(2026, 10, 29)      # "within October 29, 2026"
    conf = parse_insider(*n("ins_squr_md_conf"))
    assert conf["declared_on"] == date(2026, 1, 5)    # "as per declaration disseminated on 5.01.2026"
    assert parse_insider(*n("ins_rdfood_decl"))["by_date"] is None  # "within next 30 working days"


@pytest.mark.parametrize("key", ["ins_tosrifa_swap", "ins_nrbc_gift", "ins_prime_fix"])
def test_insider_skips(key):
    # a swap inside the owner group, a gift outside the trading system, a correction
    assert parse_insider(*n(key)) is None


def test_pair_insider_trades():
    keys = ["ins_squr_md_decl", "ins_squr_md_conf", "ins_squr_dir_decl", "ins_squr_dir_conf",
            "ins_squr_chair_decl", "ins_squr_chair_conf"]
    trades = pair_insider_trades([parse_insider(*n(k)) for k in keys])
    assert [(t["role"], t["shares"], t["status"]) for t in trades] == [
        ("chairman", 2_000_000, "done"), ("director", 1_000_000, "done"), ("md", 2_000_000, "done")]
    chair = trades[0]
    assert chair["declared"] == date(2026, 1, 20) and chair["done"] == date(2026, 2, 23)
    assert chair["market"] == "both"   # the declaration's market carries over


def test_pair_open_declaration_and_lone_confirmation():
    decl = parse_insider(*n("ins_ncc_decl"))
    only = pair_insider_trades([decl])
    assert only[0]["status"] == "declared" and only[0]["done"] is None
    lone = pair_insider_trades([parse_insider(*n("ins_nhfil"))])
    assert lone[0]["status"] == "done" and lone[0]["declared"] == date(2026, 8, 18)


# --- credit ratings ------------------------------------------------------------

@pytest.mark.parametrize("key,agency,lt,st,outlook", [
    ("cr_rupali", "NCR", "BBB+", "ST-3", "Developing"),
    ("cr_squr", "CRISL", "AAA", "ST-1", "Stable"),
    ("cr_envoy", "CRAB", "AA1", "ST-1", "Positive"),
    ("cr_jhrml", "Alpha", "A+", "ST-2", "Stable"),
    ("cr_paramount", "ARGUS", "AAA", "ST-1", "Stable"),  # an insurer's claim-paying-ability rating
])
def test_credit_rating(key, agency, lt, st, outlook):
    r = parse_credit_rating(*n(key))
    assert (r["agency"], r["long_term"], r["short_term"], r["outlook"]) == (agency, lt, st, outlook)


def test_credit_rating_follow_up_is_skipped():
    assert parse_credit_rating(*n("cr_heidel_fix")) is None


# --- board meetings ------------------------------------------------------------

@pytest.mark.parametrize("key,meeting,purpose,period_end,postponed", [
    ("bm_squr_q1", date(2025, 11, 12), "q1", date(2025, 9, 30), False),
    ("bm_squr_annual", date(2026, 10, 26), "annual", date(2026, 6, 30), False),
    # "will be held on July 27, 2026 … instead of earlier declared July 26" — the new date
    ("bm_city_resched", date(2026, 7, 27), "q2", date(2026, 6, 30), False),
    # postponed: the date that was called off
    ("bm_aamra_postpone", date(2026, 10, 28), "annual", date(2026, 6, 30), True),
])
def test_board_meeting(key, meeting, purpose, period_end, postponed):
    r = parse_board_meeting(*n(key))
    assert (r["meeting_date"], r["purpose"], r["period_end"], r["postponed"]) == (meeting, purpose, period_end, postponed)


def test_board_decision_is_not_a_schedule():
    assert parse_board_meeting(*n("bm_ail_decision")) is None


# --- DSE's own checks ------------------------------------------------------------

def test_inspection():
    r = parse_inspection(*n("insp_activefine"))
    assert (r["status"], r["partly"], r["visit_date"]) == ("closed", False, date(2026, 6, 25))
    # "on November 03 and 04, 2025 … Ashulia unit was operational … Narsingdi unit … closed"
    r = parse_inspection(*n("insp_dominage"))
    assert (r["status"], r["partly"], r["visit_date"]) == ("closed", True, date(2025, 11, 3))


@pytest.mark.parametrize("key", ["q_aziz", "q_material"])  # "no undisclosed (material or) price sensitive"
def test_query_response(key):
    r = parse_query_response(*n(key))
    assert r["no_undisclosed"] is True and r["move"] == "rise"


@pytest.mark.parametrize("key,frm,to,reason,effective", [
    ("cat_shashad", "A", "B", "dividend", date(2025, 12, 24)),
    ("cat_alara", "A", "Z", "no_dividend", date(2026, 5, 3)),
    ("cat_ktl", "B", "Z", "no_agm", date(2026, 1, 4)),
    ("cat_unpaid", "B", "Z", "dividend_unpaid", date(2026, 3, 30)),
])
def test_category_change(key, frm, to, reason, effective):
    r = parse_category_change(*n(key))
    assert (r["from"], r["to"], r["reason"], r["effective"]) == (frm, to, reason, effective)


def test_category_unchanged_notice():
    assert parse_category_change(*n("cat_amcl")) is None


# --- one company's notices --------------------------------------------------------

def doc(key, **over):
    title, body, when = n(key)
    return {"title": title, "body": body, "post_date": when, **over}


def test_company_notices_bundle():
    news = [doc(k) for k in (
        "annual_squr", "q1_squr", "q2_squr", "q3_squr", "cr_squr", "bm_squr_q1", "bm_squr_annual",
        "ins_squr_md_decl", "ins_squr_md_conf", "ins_squr_chair_decl", "ins_squr_chair_conf",
    )]
    # DSE re-posts the same factory visit daily — one per visit
    news += [doc("insp_activefine"), doc("insp_activefine", post_date="2026-10-27")]
    # an "(Additional Information)" re-post of a quarter loses to the original
    t, b, d = n("q3_squr")
    news.append({"title": t + " (Additional Information)", "body": b, "post_date": "2026-05-02"})
    news.append({"title": "SQURPHARMA: Daily NAV", "body": "NAV …", "post_date": "2026-10-28"})

    out = company_notices(news)
    assert out["annual"][0]["eps"] == 31.24
    assert [(i["quarter"], i["months"]) for i in out["interims"]] == [(3, 9), (2, 6), (1, 3)]
    assert out["interims"][0]["post_date"] == date(2026, 4, 30)
    assert [t["role"] for t in out["insider_trades"]] == ["chairman", "md"]
    assert len(out["insider_raw"]) == 4
    assert out["ratings"][0]["long_term"] == "AAA"
    assert [m["purpose"] for m in out["board_meetings"]] == ["annual", "q1"]
    assert len(out["inspections"]) == 1 and out["inspections"][0]["post_date"] == date(2026, 10, 28)
    assert out["queries"] == [] and out["category_changes"] == [] and out["ipo_proceeds"] == []
