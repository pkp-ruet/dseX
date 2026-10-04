"""#9 dividend ledger parsing, #16 peer note, and the Bengali summary agreeing
with the numeric sections."""
from datetime import datetime, timezone

from backend.services.sub_industry import peer_note
from backend.services.summaries_service import _render_bengali
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


def facts(**kw):
    base = {"name": "Test PLC", "sector": "Fuel & Power", "quality": "strong", "score": 83, "rank": None,
            "total": None, "eps": 58.7, "eps_yoy_pct": 47, "area_value": 9.2, "div_yield_pct": 9.7,
            "area_dividend": 8.7, "area_health": 8.5, "stale_data": False}
    base.update(kw)
    return base


def test_summary_says_this_year_is_down():
    text = _render_bengali(facts(interim_eps_yoy_pct=-28, interim_label_bn="মার্চ 2026 পর্যন্ত 9 মাস"))
    assert "28% কম" in text
    assert "মুনাফা বেড়েছে।" not in text


def test_summary_debt_warning_survives_the_sentence_cap():
    text = _render_bengali(facts(debt_level="over_reserve", area_health=8.3))
    assert "ঋণ এর জমানো মুনাফার চেয়ে বেশি" in text
    assert "ঋণের চাপ তুলনামূলক কম" not in text


def test_summary_valuation_follows_p4():
    assert "তুলনামূলক বেশি" in _render_bengali(facts(area_value=3.99))
    assert "তুলনামূলক কম" in _render_bengali(facts(area_value=9.2))


def test_bank_summary_has_no_loan_pressure_line():
    text = _render_bengali(facts(sector="Bank", is_lender=True, area_health=9.3))
    assert "ঋণের চাপ" not in text
