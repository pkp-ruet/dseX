"""#9 dividend ledger parsing and #16 peer note. (The Bengali summary tests left
with summaries_service, 2026-11-05.)"""
from datetime import datetime, timezone

from backend.services.sub_industry import peer_note
from scrapers.news import build_declaration_doc, is_declaration_news

NOW = datetime(2026, 3, 12, tzinfo=timezone.utc)


def news(title, body):
    return {"trading_code": "X", "title": title, "body": body, "post_date": NOW, "scraped_at": NOW}


def test_lhb_final_including_interim_is_not_double_counted():
    final = build_declaration_doc(news(
        "LHB: Dividend Declaration",
        "The Board of Directors has recommended 40% Final Cash Dividend (including 18% interim cash dividend "
        "which has already been paid in December 2025) for the year ended December 31, 2025. Record Date: 09.04.2026."))
    interim = build_declaration_doc(news(
        "LHB: Interim Dividend Declaration",
        "The company has informed that the Board of Directors has declared interim cash dividend @ 18% (i.e., Tk. "
        "1.80 per share of Tk. 10.00 each) for the year ending on December 31, 2025. Record Date: 11.11.2025."))
    assert final["cash_pct"] == 22.0 and final["declared_total_cash_pct"] == 40.0
    assert interim["cash_pct"] == 18.0 and interim["dividend_type"] == "Interim"
    assert final["cash_pct"] + interim["cash_pct"] == 40.0          # FY2025 total, not 58


def test_gp_interim_title_is_a_declaration():
    item = news("GP: Declaration of Interim Dividend and Audited Q2 Financials",
                "The Board of Directors of the company has declared Interim Cash Dividend for the year 2026 at the "
                "rate of 105% of the paid-up capital of the Company")
    assert is_declaration_news(item)
    doc = build_declaration_doc(item)
    assert doc["dividend_type"] == "Interim" and doc["cash_pct"] == 105.0


def test_disbursement_and_follow_ups_are_not_declarations():
    assert not is_declaration_news(news("GP: Interim Dividend Disbursement", "has disbursed the Interim Cash Dividend"))
    assert not is_declaration_news(news("X: Dividend Declaration (Additional Information)", "Disclosure ..."))


def test_peer_note():
    assert "tobacco" in peer_note("BATBC", "Food & Allied", 0)["en"]
    assert "Miscellaneous" in peer_note("BSC", "Miscellaneous", 0)["en"]
    assert peer_note("SQURPHARMA", "Pharmaceuticals & Chemicals", 4) is None


def test_bracketed_code_declaration_is_not_a_follow_up():
    # "AMCL(PRAN): …" — the "(" in the code read as "(Additional Information)".
    item = {**news("AMCL(PRAN): Dividend Declaration",
                   "The Board of Directors has recommended 30% Cash Dividend for the year ended June 30, 2026."),
            "trading_code": "AMCL(PRAN)"}
    assert is_declaration_news(item)
    follow_up = {**news("AMCL(PRAN): Dividend Declaration (Additional Information)", "Disclosure ..."),
                 "trading_code": "AMCL(PRAN)"}
    assert not is_declaration_news(follow_up)


def test_continued_notice_parts_are_joined_in_order():
    # Round 3 (DT3): DSE posts a long notice as parts under one title and date.
    from scrapers.news import merge_continued
    when = datetime(2026, 1, 26, tzinfo=timezone.utc)
    part2 = {"trading_code": "JAMUNAOIL", "title": "JAMUNAOIL: Q2 Financials", "post_date": when,
             "body": "(cont.1): NOCFPS was Tk. 12.10 for July-December 2025."}
    part1 = {"trading_code": "JAMUNAOIL", "title": "JAMUNAOIL: Q2 Financials", "post_date": when,
             "body": "EPS was Tk. 34.04. NAV per share was Tk. 291.67. (cont.1)"}
    other = {"trading_code": "JAMUNAOIL", "title": "JAMUNAOIL: Dividend Declaration", "post_date": when, "body": "x"}
    out = merge_continued([part2, other, part1])
    assert len(out) == 2
    q2 = next(o for o in out if o["title"].endswith("Q2 Financials"))
    assert q2["body"].startswith("EPS was Tk. 34.04") and "NOCFPS was Tk. 12.10" in q2["body"]
    assert "(cont" not in q2["body"].lower() and q2["parts"] == 2
