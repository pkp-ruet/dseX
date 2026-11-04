"""Agreement tests (2026-11-05, audit T3): the pieces that must give the same
answer stay in step — the buy price and the Buy rule, the "almost on the
list" price and the Buy line, the report's dividend safety and the
calendar's, and every threshold that lives in two places (backend copies and
the frontend mirrors). A rule change in one place without the other fails
here instead of on a reader's screen."""
import json
import pathlib
import re

import pytest

from backend.services import stock_report as sr
from backend.tests.test_stock_report import _sig, square

ROOT = pathlib.Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"


def _front(rel: str) -> str:
    p = FRONTEND / rel
    if not p.exists():
        pytest.skip(f"frontend file not here: {rel}")
    return p.read_text(encoding="utf-8")


# ---------------------------------------------------------------- the buy price and the Buy rule

def _row_variants():
    """A Square-like row at several prices and valuation scores."""
    base = square()["score_row"]
    for ltp in (150.0, 190.0, 218.8, 260.0):
        k = ltp / 218.8
        for p4 in (7.0, 7.4, 8.1, 9.2):
            yield {**base, "ltp": ltp, "current_pe": base["current_pe"] * k,
                   "current_pb": base["current_pb"] * k, "p4_val": p4}


def test_a_fresh_buy_has_a_buy_price_at_or_over_todays_price():
    # PR1: the buy price is where the Buy rule turns, so a share whose price
    # score already clears the line can't have a buy price under today's.
    from backend.services.scoring_service import p4_at_price
    from backend.services.signal_service import CHEAP_P4

    for row in _row_variants():
        if row["p4_val"] < CHEAP_P4:
            continue
        row = {**row, "score": 70.0}   # mostly strong: the cheap line decides
        price = sr.buy_price_for(row, row["ltp"], near_top=None)
        assert price is not None, row
        # Rounded to ৳1 from ৳100, ৳0.1 below.
        assert price >= row["ltp"] - (1 if row["ltp"] >= 100 else 0.1), (row["ltp"], row["p4_val"], price)
        assert p4_at_price(row, price) >= CHEAP_P4 - 0.05


def test_the_answer_never_shows_a_buy_price_under_todays_price():
    # (price, price score, grade score, signal) — each signal what the rule gives that row.
    for ltp, p4, score, sig in ((218.8, 8.82, 86.7, _sig("buy", "quality_cheap")),
                                (218.8, 6.7, 86.7, _sig("buy", "quality_cheap")),
                                (240.0, 7.1, 70.0, _sig("buy", "quality_cheap", tier="good")),
                                (218.8, 5.0, 70.0, _sig("none", "fair_price", tier="good"))):
        inp = square()
        k = ltp / inp["ltp"]
        inp["ltp"] = ltp
        inp["score_row"].update({"ltp": ltp, "p4_val": p4, "score": score,
                                 "current_pe": inp["score_row"]["current_pe"] * k,
                                 "current_pb": inp["score_row"]["current_pb"] * k})
        inp["signal"] = sig
        inp["range52"] = {"hi": 280.0, "lo": 170.0}
        rep = sr.build_report(inp)
        ans = rep["answer"]
        if ans["decision"] == "buy" and ans["buy_price"] is not None:
            assert ans["buy_price"] >= ltp
        # "Not yet" on the price: a buy price, when one exists, is under today's
        # (none = the price alone won't bring it back).
        if ans["decision"] == "wait" and ans["blocker"] == "price" and ans["buy_price"] is not None:
            assert ans["buy_price"] < ltp
        # One buy price everywhere: the answer, the price section, Our view.
        assert rep["sections"]["price"]["buy_below"] == ans["buy_price"]
        assert rep["view"]["buy_price"] == ans["buy_price"]


def test_almost_on_the_list_price_reaches_the_buy_line():
    # PR3: the buy list's "comes back under ৳X" is the solved price, so the
    # price score at X is on the Buy line, and a little higher is under it.
    from backend.services.scoring_service import p4_at_price
    from backend.services.signal_service import CHEAP_P4, EXPENSIVE_P4
    from backend.services.signal_today import entry_price

    for row in _row_variants():
        row = {**row, "p4_val": max(2.0, row["p4_val"] - 3.5)}   # priced out today
        for tier, line in (("good", CHEAP_P4), ("excellent", EXPENSIVE_P4)):
            p = entry_price(row, tier)
            if p is None:
                continue
            assert p4_at_price(row, p) >= line - 0.05, (tier, p)
            assert p4_at_price(row, p * 1.02) < line, (tier, p)


# ---------------------------------------------------------------- dividend safety

def test_report_dividend_safety_matches_the_calendar_on_every_kind_of_row():
    from backend.services.dividend_safety import dividend_safety

    cases = [
        {"eps": 29.18},                                                  # steady payer
        {"eps": -0.5, "payout_latest_pct": None},                        # a loss
        {"eps_yoy_pct": -40.0},                                          # profit fell a lot
        {"interim_eps_yoy_pct": -30.0},                                  # this year down
        {"payout_latest_pct": 120.0, "payout_pct": 120.0},               # pays more than it earns
        {"payout_latest_pct": 85.0, "payout_pct": 85.0},                 # most of it
        {"p5_consist": 4.0},                                             # paid in few years
    ]
    for extra in cases:
        inp = square()
        inp["score_row"].update(extra)
        dv = sr.build_report(inp)["sections"].get("dividend")
        ds = dividend_safety(inp["score_row"], inp["sector_class"])
        if dv is None or ds is None:
            assert (dv or {}).get("safety") is None or ds is None
            continue
        assert (dv.get("safety") or {}).get("level") == ds["level"], extra


# ---------------------------------------------------------------- copied constants (backend)

def test_backend_copies_of_the_signal_lines_match():
    from backend.services import (dividend_forecast, dividend_safety, morning_brief, portfolio_watch,
                                  research_lists, results_explainer, signal_service, stock_facts, top20_service)

    # The price lines the Buy rule uses.
    assert stock_facts.CHEAP_P4 == signal_service.CHEAP_P4
    assert stock_facts.EXPENSIVE_P4 == signal_service.EXPENSIVE_P4 == research_lists.EXPENSIVE_P4
    # Near the yearly top.
    assert sr.NEAR_HIGH_PCT == signal_service.NEAR_HIGH_PCT
    # The value-trap line ("profit down a quarter").
    assert (research_lists.EARNINGS_DROP_PCT == signal_service.EARNINGS_DROP_PCT
            == morning_brief.WEAKER_PCT == dividend_safety.PROFIT_DROP_PCT)
    # "Better" on the results page and in the morning brief; the report's growth band.
    assert morning_brief.BETTER_PCT == results_explainer.MOVE_PCT == sr.GROWING_PCT
    # Thin trading (৳10 lakh a day) for the Buy rule, the report and the screener.
    assert sr.THIN_TURNOVER_MN == top20_service.MIN_AVG_TURNOVER_MN
    from backend.services.screener import TRADED
    assert TRADED["min"] == sr.THIN_TURNOVER_MN * 10      # the screener counts in lakh
    # Tax on cash dividends and the broker fee, a side.
    assert sr.DIV_TAX_PCT / 100 == dividend_forecast.DIVIDEND_TAX
    assert sr.FEE_PCT / 100 == dividend_forecast.FEE_PER_SIDE == portfolio_watch.FEE_SIDE
    # A deposit's interest is taxed like a dividend.
    assert sr.FDR_TAX_PCT == sr.DIV_TAX_PCT


# ---------------------------------------------------------------- frontend mirrors

def test_frontend_tier_cut_offs_and_words_match_the_backend():
    from backend.services import tiers

    src = _front("lib/constants.ts")
    block = re.search(r"TIER_THRESHOLDS\s*=\s*\{(.*?)\}", src, re.S).group(1)
    nums = dict(re.findall(r"(EXCELLENT|GOOD|AVERAGE):\s*([\d.]+)", block))
    assert float(nums["EXCELLENT"]) == tiers.EXCELLENT
    assert float(nums["GOOD"]) == tiers.GOOD
    assert float(nums["AVERAGE"]) == tiers.AVERAGE
    labels = re.search(r"export const TIER_LABELS\s*=\s*\{(.*?)\}", src, re.S).group(1)
    words = dict(re.findall(r"(\w+):\s*\"([^\"]+)\"", labels))
    for k in ("excellent", "good", "average", "weak"):
        assert words.get(k) == tiers.TIER_WORDS[k], k


def test_frontend_group_meanings_are_the_rules():
    from backend.services.grade_rules import GROUP_RULES

    src = _front("lib/constants.ts")
    for name, i in (("TIER_MEANINGS", 0), ("TIER_MEANINGS_BN", 1)):
        body = re.search(rf"export const {name}[^=]*=\s*\{{(.*?)\}};", src, re.S).group(1)
        lines = dict(re.findall(r"(\w+):\s*\"([^\"]+)\"", body))
        for k in ("excellent", "good", "average", "weak"):
            assert lines.get(k) == GROUP_RULES[k][i], (name, k)


def test_frontend_strong_and_weak_words_use_the_reports_lines():
    src = _front("components/stock/HealthCheck.tsx")
    m = re.search(r"v >= ([\d.]+) \? \{ en: \"Strong\".*?v >= ([\d.]+) \? \{ en: \"Fair\"", src, re.S)
    assert m, "pillarWord changed shape"
    assert (float(m.group(1)), float(m.group(2))) == (sr.STRONG_AT, sr.WEAK_BELOW)


def test_frontend_price_words_follow_the_buy_list():
    from backend.services.signal_today import price_word

    src = _front("lib/constants.ts")
    body = re.search(r"export function priceWordKey\((.*?)\n\}", src, re.S).group(1)
    assert 'sig.strength === "strong") return "very_low"' in body
    assert 'sig.reason_key === "excellent_fair_price") return "fair"' in body
    assert price_word({"signal": "buy", "strength": "strong"}) == "very_low"
    assert price_word({"signal": "buy", "reason_key": "excellent_fair_price"}) == "fair"
    assert price_word({"signal": "buy", "reason_key": "quality_cheap"}) == "low"
    assert price_word({"signal": "none"}) is None


def test_frontend_limits_and_plans_match_the_backend():
    from backend.services.entitlements import FREE_LIMITS, HARD_LIMITS
    from backend.services.payments import PAID_PLANS

    src = _front("lib/premium.ts")
    m = re.search(r"export const FREE_LIMITS = (\{.*?\}) as const;", src)
    front = json.loads(re.sub(r"(\w+):", r'"\1":', m.group(1)))
    assert front == FREE_LIMITS
    assert int(re.search(r"export const MAX_HOLDINGS = (\d+);", src).group(1)) == HARD_LIMITS["holdings"]

    plans = _front("lib/premium-plans.ts")
    for key, p in PAID_PLANS.items():
        m = re.search(r'key: "' + key + r'",.*?amount: (\d+),.*?days: (\d+),', plans, re.S)
        assert m, key
        assert (int(m.group(1)), int(m.group(2))) == (p["amount"], p["days"]), key
