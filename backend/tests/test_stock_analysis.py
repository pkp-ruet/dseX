"""The stock page's analysis (services/stock_analysis.py, 2026-11-05): six parts
in one shape, each check part's word the grade's own, every line plain."""
import re

from backend.services import grade_rules as gr
from backend.services import stock_report as sr
from backend.tests.test_stock_report import _MARKET_WORDS, _RATIO_SPEAK, _all_bi, _sig, red_flag_company, square


def _bank():
    inp = square()
    inp.update({"code": "BRACBANK", "sector_class": "BANK", "sector": "Bank",
                "extended_financials": [{"year": 2025, "total_equity": 9.98e10, "total_assets": 1e12,
                                         "revenue": None, "net_profit": 1e10, "operating_cf": 9e10}]})
    return inp


def _falling():
    """A Renata-like company: profit fell from 2022, recovering this year;
    profit check weak, business strong."""
    inp = square()
    inp["extended_financials"] = [
        {"year": y, "revenue": r * 1e7, "net_profit": n * 1e7, "operating_cf": o * 1e7, "total_equity": 3000e7,
         "total_assets": 6000e7, "nocfps": None}
        for y, r, n, o in [(2021, 2925, 504, 420), (2022, 3107, 511, 300), (2023, 3297, 234, 210), (2024, 3771, 362, 210)]
    ]
    inp["score_row"] = {**inp["score_row"], "score": 59.3, "p1_biz": 3.56, "p2_health": 6.76, "p3_moat": 8.4,
                        "p4_val": 5.36, "p5_div": 8.12, "overall_rank": 81, "total_scored": 353}
    return inp


def _report(inp, signal=("buy", "quality_cheap")):
    inp["signal"] = _sig(*signal)
    return sr.build_report(inp)


def _texts(a):
    yield "summary", a["summary"]
    for k in ("line", "checks"):
        if a["grade"].get(k):
            yield f"grade.{k}", a["grade"][k]
    for p in a["parts"]:
        for f in ("answer", "tile", "watch", "callout", "note"):
            if p.get(f):
                yield f"{p['key']}.{f}", p[f]
        for i, c in enumerate(p["checks"]):
            yield f"{p['key']}.checks[{i}]", c["text"]
        for i, s in enumerate(p["stats"]):
            yield f"{p['key']}.stats[{i}].label", s["label"]


def test_six_parts_in_order_and_filled():
    a = _report(square())["analysis"]
    assert [p["key"] for p in a["parts"]] == ["profit", "finances", "business", "dividend", "price", "safety"]
    for p in a["parts"]:
        assert p["answer"]["en"] and p["tile"]["en"]
        assert len(p["stats"]) <= 3 and len(p["checks"]) <= 4
        assert not [k for k in p if k.startswith("_")]
    _all_bi(a)


def test_a_check_part_never_disagrees_with_the_grade():
    for inp in (square(), _falling(), red_flag_company(), _bank()):
        rep = _report(inp)
        vals = gr.check_values(inp["score_row"])
        for p in rep["analysis"]["parts"]:
            check = {"profit": "p1_biz", "finances": "p2_health", "business": "p3_moat", "dividend": "p5_div"}.get(p["key"])
            if not check or check not in vals:
                continue
            want = {"strong": "Strong", "fair": "Fair", "weak": "Weak"}[gr.word(vals[check])]
            assert p["word"]["en"] == want, (inp["code"], p["key"], p["word"]["en"], want)


def test_falling_profit_says_both_the_fall_and_this_year():
    a = _report(_falling())["analysis"]
    profit = a["parts"][0]
    assert profit["word"]["en"] == "Weak" and profit["tone"] == "bad"
    assert profit["tile"]["en"] == "Down since 2022"
    assert profit["answer"]["en"].startswith("Profit has fallen since 2022.")
    assert [s["label"]["en"] for s in profit["stats"]][:2] == ["profit in 2024", "since 2022"]
    assert a["summary"]["en"].startswith("Its profit fell after 2022")
    assert a["grade"]["word"]["en"] == "Mixed"


def test_price_part_shows_the_fair_range_or_says_why_not():
    a = _report(square())["analysis"]
    price = next(p for p in a["parts"] if p["key"] == "price")
    assert price["stats"][1]["label"]["en"] == "our fair price"
    assert price["note"] is None
    inp = square()
    inp["fair_value"] = {**inp["fair_value"], "estimates_disagree": True}
    price = next(p for p in _report(inp)["analysis"]["parts"] if p["key"] == "price")
    assert price["note"]["en"].startswith("We give a fair price only when")
    assert "fair price" not in " ".join(s["label"]["en"] for s in price["stats"])


def test_buy_under_is_never_above_the_price_sections_line():
    rep = _report(square())
    price = next(p for p in rep["analysis"]["parts"] if p["key"] == "price")
    buy = next((s for s in price["stats"] if s["label"]["en"] == "we would buy under"), None)
    want = rep["sections"]["price"].get("buy_below")
    assert (buy is None) == (want is None)
    if buy:
        assert buy["value"]["en"] == sr.money(want)


def test_lender_asks_about_its_own_money():
    a = _report(_bank())["analysis"]
    fin = next(p for p in a["parts"] if p["key"] == "finances")
    assert fin["question"]["en"] == "Does it keep enough of its own money?"
    assert fin["stats"][0]["value"]["en"].endswith("%")


def test_safety_part_counts_the_red_flags():
    a = _report(red_flag_company(), ("sell", "weak"))["analysis"]
    s = next(p for p in a["parts"] if p["key"] == "safety")
    assert s["tone"] == "bad" and s["word"]["en"].endswith("serious")
    assert s["answer"]["en"].startswith("Yes, 5 serious problems.")
    assert "serious problem" in a["summary"]["en"]


def test_a_loss_is_said_once():
    inp = square()
    inp["extended_financials"] = [{**r, "net_profit": -abs(r["net_profit"])} if r["year"] == 2025 else r
                                  for r in inp["extended_financials"]]
    profit = _report(inp)["analysis"]["parts"][0]
    assert profit["answer"]["en"].count("loss") <= 1 or "latest year" not in profit["answer"]["en"]


def test_profit_falls_back_to_profit_a_share():
    inp = square()
    inp["extended_financials"] = []
    profit = _report(inp)["analysis"]["parts"][0]
    assert profit["unit"] == "share"
    assert profit["stats"][0]["label"]["en"].startswith("profit a share in ")
    assert profit["stats"][0]["value"]["en"].startswith("৳") and "." in profit["stats"][0]["value"]["en"]


def test_insurer_finances_follow_the_check_not_the_rating():
    inp = square()
    inp.update({"code": "DELTALIFE", "sector_class": "INSURANCE", "sector": "Insurance"})
    inp["score_row"] = {**inp["score_row"], "p2_health": 2.5}
    fin = next(p for p in _report(inp)["analysis"]["parts"] if p["key"] == "finances")
    assert fin["word"]["en"] == "Weak"
    assert fin["answer"]["en"] == "Its finances are weak on our checks."
    assert any("rating agency" in c["text"]["en"] for c in fin["checks"])


_NUM = re.compile(r"\d[\d,.]*")


def test_the_analysis_reads_plainly():
    for inp in (square(), _falling(), red_flag_company(), _bank()):
        a = _report(inp)["analysis"]
        for where, b in _texts(a):
            for half in (b["en"], b["bn"]):
                assert not _MARKET_WORDS.search(half), f"{inp['code']} {where}: {half}"
            assert not _RATIO_SPEAK.search(b["en"]), f"{inp['code']} {where}: {b['en']}"
        for p in a["parts"]:
            # One idea a sentence: an answer sentence carries two numbers at most.
            for sentence in re.split(r"(?<=\.)\s+", p["answer"]["en"]):
                assert len(_NUM.findall(sentence)) <= 2, f"{inp['code']} {p['key']}: {sentence}"
