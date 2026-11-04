"""Round 4 of the stock-analysis audit (2026-11-05): the pure helpers behind
the written-analysis note (SP2), the writing checks of save_analysis (SP2),
the research cards' watch-out from the report snapshot (EL11), our answer
over time (N8) and the bank-deposit line (N11)."""
import pathlib
import sys
from datetime import date

from backend.services import stock_report as sr
from backend.services.deep_analysis_service import written_before_results
from backend.services.research_lists_service import snapshot_risk
from backend.tests.test_stock_report import square

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "scripts" / "deep_analysis"))
from save_analysis import writing_issues  # noqa: E402


# ---------------------------------------------------------------- SP2

def test_written_before_results_only_when_results_came_after():
    assert written_before_results("2026-07-16", {"post_date": date(2026, 10, 27), "full_year": True}) == {
        "posted": "2026-10-27", "full_year": True}
    assert written_before_results("2026-07-16", {"post_date": "2026-07-10T09:00:00"}) is None
    assert written_before_results(None, {"post_date": date(2026, 10, 27)}) is None
    assert written_before_results("2026-07-16", None) is None


def _doc(**over):
    sec = {"key": "story", "title_en": "What does it do?", "takeaway_en": "It makes medicine.",
           "body_en": "It sells medicine across Bangladesh.", "title_bn": "কী করে?",
           "takeaway_bn": "ওষুধ তৈরি করে।", "body_bn": "সারা দেশে ওষুধ বিক্রি করে, 9টি কারখানায়।"}
    sec.update(over)
    return {"headline_en": "A steady medicine maker.", "headline_bn": "স্থির ওষুধ প্রস্তুতকারক।",
            "bottom_line_en": "It suits patient investors.", "bottom_line_bn": "ধৈর্যশীল বিনিয়োগকারীদের জন্য।",
            "sections": [sec]}


def test_writing_checks_pass_a_clean_report():
    assert writing_issues(_doc()) == []
    # A range with an en dash is fine.
    assert writing_issues(_doc(body_en="Sales grew every year from 2021–2025.")) == []


def test_writing_checks_catch_each_rule():
    cases = {
        "em dash": _doc(body_en="A strong company — but debt is rising."),
        "Bengali numerals": _doc(body_bn="মুনাফা ১২% বেড়েছে।"),
        "idiom": _doc(body_en="It has a fortress balance sheet and real skin in the game."),
        "page that isn't there": _doc(body_en="Check the live value today box beside this report."),
        "market word": _doc(takeaway_en="Its EPS and P/E look fine."),
    }
    for want, doc in cases.items():
        issues = writing_issues(doc)
        assert any(want in i for i in issues), (want, issues)
    # "Buy/Sell signal" and "Strong buy" point at things the page no longer shows.
    assert writing_issues(_doc(body_en="See the current Buy/Sell signal.")) != []
    assert writing_issues(_doc(body_en="It reads Strong buy today.")) != []


# ---------------------------------------------------------------- EL11

def test_snapshot_risk_takes_the_serious_problem_first():
    snap = {"red_keys": ["audit"], "red_lines": {"audit": {"en": "The auditor did not fully approve it.", "bn": "ক"}},
            "amber_keys": ["trading", "payout"],
            "amber_lines": {"trading": {"en": "Few of its shares trade.", "bn": "খ"},
                            "payout": {"en": "It paid more than it earned.", "bn": "গ"}}}
    r = snapshot_risk(snap)
    assert r["en"].startswith("The auditor") and r["more"] == 2 and r["level"] == "red"
    snap["red_keys"] = []
    r = snapshot_risk(snap)
    assert r["en"] == "Few of its shares trade." and r["more"] == 1 and r["level"] == "amber"
    assert snapshot_risk({"red_keys": [], "amber_keys": [], "amber_lines": {}}) is None
    assert snapshot_risk(None) is None


def test_snapshot_fields_keep_the_smaller_things_too():
    f = sr.snapshot_fields(sr.build_report(square()))
    assert "amber_keys" in f and "amber_lines" in f
    assert set(f["amber_lines"]) == set(f["amber_keys"])


# ---------------------------------------------------------------- N8

def _day(d, dec, en, bn):
    return {"date": d, "decision": dec, "answer_word": sr.bi(en, bn)}


def test_answer_since_names_the_run_and_what_came_before():
    buy, wait = sr.bi("Buy", "কেনা যায়"), sr.bi("Not yet", "এখন নয়")
    days = [_day("2026-11-04", "buy", "Buy", "কেনা যায়"), _day("2026-11-03", "buy", "Buy", "কেনা যায়"),
            _day("2026-11-02", "wait", "Not yet", "এখন নয়")]
    h = sr.answer_since(days, "buy", buy, date(2026, 11, 5))
    assert h["since"] == "2026-11-03" and h["before"] == wait and h["first_record"] is None
    assert h["line"]["en"] == "Our answer has been “Buy” since 3 Nov. Before that it was “Not yet”."
    # Changed today (the live answer isn't stored yet).
    h = sr.answer_since(days, "wait", wait, date(2026, 11, 5))
    assert h["since"] == "2026-11-05" and h["line"]["en"].startswith("Our answer changed to “Not yet” today.")
    # The run reaches the first stored day.
    h = sr.answer_since(days[:2], "buy", buy, date(2026, 11, 5))
    assert h["first_record"] == "2026-11-03" and "started keeping a record" in h["line"]["en"]
    assert sr.answer_since([], "buy", buy, date(2026, 11, 5)) is None


# ---------------------------------------------------------------- N11

def test_deposit_line_puts_the_price_beside_a_bank_deposit():
    rep = sr.build_report(square())
    d = rep["sections"]["price"]["deposit"]
    # Square: profit ৳29.18 a share at ৳218.8 → ৳13 a year on every ৳100.
    assert d["profit_per_100"] == round(29.18 / 218.8 * 100, 1)
    assert d["fdr_net_per_100"] == round(sr.FDR_RATE_PCT * 0.9, 1)
    assert d["lines"][0]["en"].startswith("For every ৳100 you pay today, the company earns about ৳13 of profit a year")
    assert "after tax" in d["lines"][1]["en"]
    # A loss-maker that pays nothing has no line.
    inp = square()
    inp["score_row"]["eps"] = -1.0
    assert sr.build_deposit(inp, None) is None
