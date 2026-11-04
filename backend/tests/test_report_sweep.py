"""A sweep over unusual report inputs (2026-11-05, audit T4). The report
tests used one company (Square) plus a few made-up cases; most of the report
bugs the audit found came from rows that look nothing like Square: a swing
from loss to profit, a March year-end, CRAB grades, a lender's cushion, an
insurer's sales line, old accounts, negative reserves with loans, quarters
that have to be worked out from the year so far, a share that stopped
trading. Every variant must build, read plainly and agree with itself."""
import copy
import re
from datetime import date, timedelta

import pytest

from backend.services import stock_report as sr
from backend.services.stock_facts import build_items
from backend.tests.test_stock_report import TODAY, _MARKET_WORDS, _RATIO_SPEAK, _sig, _trading_days, square

_NUM = re.compile(r"\d[\d,.]*")
# Text that means a builder printed a missing or broken value. "None" only
# inside a sentence ("under None"): the red-flag word "None" and "None of the
# people …" are real words.
_JUNK = re.compile(r"\b(?:nan|NaN|inf)\b|(?<=\s)None\b(?! of)|-0%|\bits its\b|\.\.(?!\.)|৳-|\(\)|\s,"
                   r"|\b0 of every 100\b")


# ---------------------------------------------------------------- variants

def _loss_to_profit(inp):
    inp["financials"][-2]["eps"] = -3.1
    inp["financials"][-1]["eps"] = 1.2
    for r in inp["extended_financials"]:
        if r["year"] == 2024:
            r["net_profit"] = -40e7
    inp["notices"]["annual"] = [{"fy_end": date(2026, 6, 30), "fy_year": 2026, "eps": 4.1, "eps_prev": -0.8,
                                 "nav": 60.0, "nav_prev": 55.0, "nocfps": 2.0, "nocfps_prev": -1.0,
                                 "post_date": date(2026, 10, 27)}]
    inp["score_row"].update({"eps": 4.1, "eps_yoy_pct": None, "score": 52.0})


def _march_year_end(inp):
    fy = date(2026, 3, 31)
    inp["notices"]["annual"] = [{"fy_end": fy, "fy_year": 2026, "eps": 30.0, "eps_prev": 27.0, "nav": 170.0,
                                 "nav_prev": 158.0, "nocfps": 20.0, "nocfps_prev": 18.0, "post_date": date(2026, 6, 20)}]
    inp["notices"]["interims"] = [
        {"quarter": 1, "period_start": date(2026, 4, 1), "period_end": date(2026, 6, 30), "months": 3,
         "eps_cum": 8.0, "eps_cum_prev": 7.0, "eps_q": 8.0, "eps_q_prev": 7.0, "nocfps_cum": 5.0,
         "nocfps_cum_prev": 4.0, "post_date": date(2026, 7, 28)},
        {"quarter": 2, "period_start": date(2026, 4, 1), "period_end": date(2026, 9, 30), "months": 6,
         "eps_cum": 15.0, "eps_cum_prev": 14.5, "eps_q": None, "eps_q_prev": None, "nocfps_cum": 9.0,
         "nocfps_cum_prev": 9.5, "post_date": date(2026, 10, 30)},
    ]
    inp["ledger"] = [
        {"declaration_date": "2026-06-20", "record_date": "2026-07-15", "cash_pct": 150.0, "stock_pct": 0.0,
         "dividend_type": "Final", "period_end": "2026-03-31"},
        {"declaration_date": "2025-11-10", "record_date": "2025-12-01", "cash_pct": 60.0, "stock_pct": 0.0,
         "dividend_type": "Interim", "period_end": "2025-09-30"},
    ]
    inp["calendar_row"] = None


def _crab_rating(inp):
    inp["notices"]["ratings"] = [
        {"agency": "CRAB", "long_term": "AA2", "short_term": "ST-2", "outlook": "Stable", "post_date": date(2026, 6, 1)},
        {"agency": "CRAB", "long_term": "AA1", "short_term": "ST-1", "outlook": "Negative", "post_date": date(2025, 6, 1)},
    ]
    inp["loan_mn"] = 0.0


def _nbfi_cushion(inp):
    inp.update({"code": "FASFIN", "sector": "Financial Institutions", "sector_class": "NBFI", "category": "Z"})
    inp["extended_financials"] = [{"year": y, "total_equity": 5e9, "total_assets": 5e9, "revenue": None,
                                   "net_profit": -9e8, "operating_cf": 1e8} for y in (2023, 2024, 2025)]
    inp["score_row"].update({"score": 12.0, "eps": -6.0, "current_pe": None, "p4_val": 0.0, "market_cat": "Z"})


def _insurer(inp):
    inp.update({"code": "PURABIGEN", "sector": "Insurance", "sector_class": "INSURANCE"})
    inp["extended_financials"] = [{"year": y, "revenue": 1.2e5, "net_profit": 9e7, "operating_cf": 6e7,
                                   "total_equity": 2e9, "total_assets": 4e9, "ebit": 2e8} for y in (2022, 2023, 2024, 2025)]


def _old_accounts(inp):
    inp["financials"] = [r for r in inp["financials"] if r["year"] <= 2022]
    inp["extended_financials"] = [r for r in inp["extended_financials"] if r["year"] <= 2022]
    inp["notices"].update({"annual": [], "interims": [], "board_meetings": []})
    inp["ledger"] = []
    inp["calendar_row"] = None
    inp["score_row"].update({"data_age_years": 3, "score": 40.0, "eps": 21.0})


def _negative_reserve_with_loans(inp):
    inp.update({"code": "BDSERVICE", "reserve_mn": -27340.0, "loan_mn": 9080.0})
    inp["score_row"].update({"score": 20.0, "eps": -3.5, "current_pe": None, "p4_val": 0.0, "mcap_mn": 1500.0,
                             "debt_level": "over_mcap"})


def _stopped_trading(inp):
    stop = TODAY - timedelta(days=75)
    inp["prices"] = [r for r in inp["prices"] if date.fromisoformat(r["date"]) <= stop]
    inp["momentum"] = {}


def _thin_trading(inp):
    inp["momentum"] = {"avg_turnover_7d_mn": 0.06}
    inp["holdings"][-1].update({"sponsor_director_pct": 85.0, "public_pct": 10.0, "institute_pct": 5.0, "foreign_pct": 0.0})


def _profit_from_deposits(inp):
    # PADMAOIL: the business made ৳5m of a ৳5.6bn profit.
    for r in inp["extended_financials"]:
        r["ebit"] = 5e6 if r["year"] == 2025 else r["net_profit"] * 0.3
    inp["sector_class"] = "GENERAL"


def _business_lost_money(inp):
    for r in inp["extended_financials"]:
        r["ebit"] = -2e8 if r["year"] == 2025 else r["net_profit"] * 1.2


def _one_off_gain(inp):
    for r in inp["extended_financials"]:
        r["ebit"] = 1500e7
        if r["year"] == 2025:
            r["net_profit"] = 3600e7


def _going_concern_z(inp):
    inp.update({"category": "Z"})
    inp["score_row"].update({"market_cat": "Z", "score": 30.0})
    inp["governance"] = [{"key": "going_concern", "tone": "watch", "en": "x.", "bn": "x।"}]
    inp["audit_opinion"] = {"year": 2025, "severity": "serious", "going_concern": True, "reasons": ["going_concern"],
                            "minor": [], "posted": "2025-12-22", "title": "Going concern", "url": None}


def _no_owner_data(inp):
    inp["holdings"] = []
    inp["notices"]["insider_trades"] = []


def _answer_flips(inp):
    days = [d for d in _trading_days(TODAY - timedelta(days=40), TODAY - timedelta(days=1))]
    inp["answer_days"] = [{"date": d.isoformat(), "decision": "buy" if i % 3 else "wait",
                           "answer_word": sr.bi("Buy", "কেনা যায়") if i % 3 else sr.bi("Not yet", "এখন নয়")}
                          for i, d in enumerate(reversed(days))]


def _bare_minimum(inp):
    for k in ("financials", "extended_financials", "holdings", "news", "ledger", "sector_rows"):
        inp[k] = []
    inp["notices"] = {}
    inp["notices_ok"] = False
    inp["momentum"] = {}
    inp["fair_value"] = inp["fair_value_fall"] = inp["calendar_row"] = None
    inp["score_row"] = {"score": None}
    inp["company"] = {}


VARIANTS = {
    "loss_to_profit": _loss_to_profit,
    "march_year_end": _march_year_end,
    "crab_rating": _crab_rating,
    "nbfi_cushion": _nbfi_cushion,
    "insurer": _insurer,
    "old_accounts": _old_accounts,
    "negative_reserve_with_loans": _negative_reserve_with_loans,
    "stopped_trading": _stopped_trading,
    "thin_trading": _thin_trading,
    "profit_from_deposits": _profit_from_deposits,
    "business_lost_money": _business_lost_money,
    "one_off_gain": _one_off_gain,
    "going_concern_z": _going_concern_z,
    "no_owner_data": _no_owner_data,
    "answer_flips": _answer_flips,
    "bare_minimum": _bare_minimum,
}
SIGNALS = {
    "buy": _sig("buy", "quality_cheap"),
    "not_yet": _sig("none", "fair_price", tier="good"),
    "avoid": _sig("sell", "weak_business", tier="weak"),
}


def _build(name: str, sig: str) -> dict:
    inp = copy.deepcopy(square())
    VARIANTS[name](inp)
    inp["signal"] = SIGNALS[sig]
    inp["range52"] = {"hi": 260.0, "lo": 180.0}
    # The old watch-out lines, as the service builds them (they can reach the risks section).
    try:
        inp["watch_items"] = [i for i in build_items(inp.get("score_row"), inp.get("holdings") or [],
                                                     inp.get("financials") or [], inp.get("company") or {},
                                                     inp.get("news") or [], inp.get("sector_class") or "GENERAL")
                              if i.get("tone") == "watch"]
    except Exception:  # noqa: BLE001 — the service guards this too
        inp["watch_items"] = []
    return sr.build_report(inp)


# ---------------------------------------------------------------- what a reader sees

def _shown(rep):
    """(where, {en, bn}) for every sentence a reader reads in the report."""
    for k, s in (rep.get("sections") or {}).items():
        for f in ("headline", "free_line", "word", "watch"):
            if s.get(f):
                yield f"{k}.{f}", s[f]
        for f in ("meaning", "inside"):
            for i, m in enumerate(s.get(f) or []):
                yield f"{k}.{f}[{i}]", m
        for i, sc in enumerate(s.get("scenarios") or []):
            yield f"{k}.scenarios[{i}]", sc["label"]
        for i, r in enumerate(s.get("ranks") or []):
            yield f"{k}.ranks[{i}]", r["label"]
        for i, a in enumerate(s.get("items") or []):
            if isinstance(a, dict):
                for f in ("why", "text", "trigger", "label", "expect"):
                    if isinstance(a.get(f), dict):
                        yield f"{k}.items[{i}].{f}", a[f]
        for i, c in enumerate(s.get("checks") or [] if isinstance(s.get("checks"), list) else []):
            yield f"{k}.checks[{i}].detail", c["detail"]
        for i, l in enumerate((s.get("deposit") or {}).get("lines") or []):
            yield f"{k}.deposit[{i}]", l
    ans = rep.get("answer") or {}
    if ans.get("line"):
        yield "answer.line", ans["line"]
    if (ans.get("history") or {}).get("line"):
        yield "answer.history", ans["history"]["line"]
    for l in ans.get("lights") or []:
        for f in ("word", "why", "note"):
            if l.get(f):
                yield f"answer.{l['key']}.{f}", l[f]
    v = rep.get("view") or {}
    if v.get("headline"):
        yield "view.headline", v["headline"]
    for f in ("for", "against", "change", "inside"):
        for i, b in enumerate(v.get(f) or []):
            yield f"view.{f}[{i}]", b
    for i, b in enumerate(rep.get("offer") or []):
        yield f"offer[{i}]", b


def _pairs(obj, path="report"):
    """Every {en, bn} pair anywhere in the report."""
    if isinstance(obj, dict):
        if set(obj) == {"en", "bn"}:
            yield path, obj
            return
        for k, v in obj.items():
            yield from _pairs(v, f"{path}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from _pairs(v, f"{path}[{i}]")


CASES = [(n, s) for n in VARIANTS for s in SIGNALS]


@pytest.mark.parametrize("name,sig", CASES)
def test_every_unusual_row_builds_a_report_that_reads_plainly(name, sig):
    rep = _build(name, sig)
    assert rep["version"] == 1 and isinstance(rep["sections"], dict)
    for where, b in _pairs(rep):
        assert isinstance(b["en"], str) and b["en"].strip(), f"{name}/{sig} empty en at {where}"
        assert isinstance(b["bn"], str) and b["bn"].strip(), f"{name}/{sig} empty bn at {where}"
        for half in (b["en"], b["bn"]):
            assert not _JUNK.search(half), f"{name}/{sig} {where}: {half}"
    for where, b in _shown(rep):
        for half in (b["en"], b["bn"]):
            assert not _MARKET_WORDS.search(half), f"{name}/{sig} {where}: {half}"
        assert not _RATIO_SPEAK.search(b["en"]), f"{name}/{sig} {where}: {b['en']}"
        for sentence in re.split(r"(?<=[.;?])\s", b["en"]):
            assert len(_NUM.findall(sentence)) <= 3, f"{name}/{sig} {where}: {sentence}"
    for k, s in rep["sections"].items():
        assert s["tone"] in ("good", "fair", "bad", "neutral"), (name, k)
        assert len(_NUM.findall(s["headline"]["en"])) <= 3, f"{name}/{sig} {k}.headline: {s['headline']['en']}"


@pytest.mark.parametrize("name,sig", CASES)
def test_every_unusual_row_agrees_with_itself(name, sig):
    rep = _build(name, sig)
    ans = rep["answer"]
    ltp = 218.8
    # One buy price: the answer, the price section and Our view.
    price = rep["sections"].get("price") or {}
    if price:
        assert price.get("buy_below") == ans["buy_price"], (name, sig)
    assert (rep.get("view") or {}).get("buy_price") == ans["buy_price"], (name, sig)
    if ans["decision"] == "buy" and ans["buy_price"] is not None:
        assert ans["buy_price"] >= ltp, (name, sig)
    if ans["decision"] in ("avoid", "no_reason", "unrated"):
        assert ans["buy_price"] is None, (name, sig)
    # The red-flag counts add up, and a serious one never reads "nothing serious".
    rf = rep["sections"].get("red_flags")
    if rf:
        c = rf["counts"]
        assert c["checks"] == c["red"] + c["amber"] + c["pass"] == len(rf["checks"]), name
        risks = next(l for l in ans["lights"] if l["key"] == "risks")
        if c["red"]:
            assert risks["word"]["en"] != "Nothing serious", name


def test_the_new_rows_answer_the_unusual_rows():
    # N2: deposits make the profit — amber check, "Very little"; a business that lost money — "No".
    rep = _build("profit_from_deposits", "not_yet")
    core = rep["sections"]["core"]
    assert core["word"]["en"] == "Very little" and core["share"] < 25
    assert {c["key"]: c["level"] for c in rep["sections"]["red_flags"]["checks"]}["core"] == "amber"
    assert _build("business_lost_money", "not_yet")["sections"]["core"]["word"]["en"] == "No"
    assert _build("one_off_gain", "not_yet")["sections"]["core"]["one_off"] is True
    # Not for lenders and insurers; not on accounts this old.
    for name in ("nbfi_cushion", "insurer", "old_accounts"):
        assert "core" not in _build(name, "not_yet")["sections"], name
    # N6: thin and stopped trading.
    assert _build("thin_trading", "not_yet")["sections"]["liquidity"]["word"]["en"] == "Hard"
    stopped = _build("stopped_trading", "not_yet")["sections"]["liquidity"]
    assert stopped["word"]["en"] == "No" and "has not traded since" in stopped["headline"]["en"]
    # N8: a price near our line flips the answer, and the card says so.
    hist = _build("answer_flips", "buy")["answer"]["history"]
    assert hist["changes"] >= sr.ANSWER_FLIPS_NOTE and "changed" in hist["line"]["en"]
