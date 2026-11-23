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
    from backend.services.signal_service import BUY_P4 as CHEAP_P4

    for row in _row_variants():
        if row["p4_val"] < CHEAP_P4:
            continue
        row = {**row, "score": 70.0}   # a strong company: the Buy line (the fair centre) decides
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
    from backend.services.signal_service import BUY_P4
    from backend.services.signal_today import entry_price

    for row in _row_variants():
        row = {**row, "p4_val": max(2.0, row["p4_val"] - 3.5)}   # priced out today
        for tier, line in (("good", BUY_P4), ("excellent", BUY_P4)):
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
    assert 'sig.reason_key === "excellent_fair_price" || sig.reason_key === "fair_price_buy") return "fair"' in body
    assert price_word({"signal": "buy", "strength": "strong"}) == "very_low"
    assert price_word({"signal": "buy", "reason_key": "excellent_fair_price"}) == "fair"
    assert price_word({"signal": "buy", "reason_key": "quality_cheap"}) == "low"
    assert price_word({"signal": "none"}) is None


def test_frontend_premium_line_matches_the_backend():
    """THE Premium line (2026-11-22): the frontend's table is the backend's."""
    from backend.services import premium_line as pl

    src = _front("lib/premium-line.ts")
    m = re.search(r"export const AREAS = (\{.*?\n\}) satisfies", src, re.S)
    assert m, "AREAS literal not found"
    assert json.loads(m.group(1)) == pl.AREAS
    words = re.search(r"export const LAYER_WORDS[^=]*= (\{.*?\n\});", src, re.S).group(1)
    for layer, w in pl.LAYER_WORDS.items():
        assert f'{layer}: {{ en: "{w["en"]}", bn: "{w["bn"]}" }}' in words, layer


def test_frontend_showcase_matches_the_backend():
    from backend.services import premium_line as pl

    src = _front("lib/premium-line.ts")
    m = re.search(r"export const SHOWCASE = (\[.*?\]);", src)
    assert json.loads(m.group(1)) == list(pl.SHOWCASE)


def test_frontend_limits_and_plans_match_the_backend():
    from backend.services.entitlements import FREE_LIMITS, HARD_LIMITS
    from backend.services.payments import PAID_PLANS

    src = _front("lib/premium.ts")
    m = re.search(r"export const FREE_LIMITS = (\{.*?\}) satisfies", src, re.S)
    # Each limit reads the same area of the line on both sides.
    front = dict(re.findall(r'(\w+): (?:freeN\("(\w+)"\)|null)', m.group(1)))
    ent = (ROOT / "backend/services/entitlements.py").read_text(encoding="utf-8")
    block = re.search(r"FREE_LIMITS = \{(.*?)\n\}", ent, re.S).group(1)
    back = dict(re.findall(r'"(\w+)": (?:free_n\("(\w+)"\)|None)', block))
    assert front == back
    assert set(front) == set(FREE_LIMITS)
    assert int(re.search(r"export const MAX_HOLDINGS = (\d+);", src).group(1)) == HARD_LIMITS["holdings"]
    cmp_src = _front("lib/compare.ts")
    assert re.search(r'export const FREE_COMPARE = freeN\("compare"\)', cmp_src)
    assert int(re.search(r"export const MAX_COMPARE = (\d+);", cmp_src).group(1)) == HARD_LIMITS["compare"]

    plans = _front("lib/premium-plans.ts")
    for key, p in PAID_PLANS.items():
        m = re.search(r'key: "' + key + r'",.*?amount: (\d+),.*?days: (\d+),', plans, re.S)
        assert m, key
        assert (int(m.group(1)), int(m.group(2))) == (p["amount"], p["days"]), key


def test_frontend_portfolio_lines_match_the_backend():
    """One set of portfolio lines (2026-11-05): the frontend's grade, lights and
    next move draw them where the per-share advice and the recommendation
    engine do."""
    from backend.services import recommend, signal_service as ss

    src = _front("lib/portfolio-limits.ts")
    num = lambda name: float(re.search(r"export const " + name + r" = (\d+(?:\.\d+)?);", src).group(1))
    assert num("ONE_SHARE_FAIR_PCT") == ss.TRIM_WEIGHT_PCT
    assert num("BUY_MORE_MAX_PCT") == ss.BUY_MORE_MAX_WEIGHT_PCT
    assert num("SECTOR_FAIR_PCT") == ss.HEAVY_SECTOR_PCT == recommend.HEAVY_PCT
    assert num("FIN_HEAVY_PCT") == ss.FIN_HEAVY_PCT == recommend.FIN_HEAVY_PCT


def test_frontend_watch_rules_match_the_backend():
    """Watch rules (THE Premium line, step 4): the sheet's kinds, their order,
    values, words and the suggested set are the backend's."""
    from backend.services import watch_rules as wr

    src = _front("lib/watch-rules.ts")
    rows = re.findall(r'\{ key: "(\w+)", label: \{ en: "([^"]+)", bn: "([^"]+)" \}(?:, value: (\d+), values: \[([\d, ]+)\])?', src)
    assert [r[0] for r in rows] == list(wr.KINDS)
    for key, en, bn, value, values in rows:
        k = wr.KINDS[key]
        assert (en, bn) == (k["en"], k["bn"]), key
        if "values" in k:
            assert int(value) == k["value"] and [int(v) for v in values.split(",")] == k["values"], key
        else:
            assert not value, key
    sugg = re.search(r"export const SUGGESTED = \[(.*?)\];", src).group(1)
    assert [s.strip().strip('"') for s in sugg.split(",")] == list(wr.SUGGESTED)


def test_frontend_portfolio_builder_matches_the_backend():
    """Portfolio builder (2026-11-23): the answer keys, jobs, limits and the
    shares-for-the-money steps are the backend's."""
    from backend.services import portfolio_builder as pb

    src = _front("lib/portfolio-builder.ts")

    def keys(name: str) -> list[str]:
        body = re.search(rf"export const {name} = \[(.*?)\] as const;", src).group(1)
        return [s.strip().strip('"') for s in body.split(",") if s.strip()]

    assert keys("PURPOSES") == list(pb.PURPOSES)
    assert keys("STARTS") == list(pb.STARTS)
    assert keys("HORIZONS") == list(pb.HORIZONS)
    assert keys("LIKES") == list(pb.LIKES)
    assert keys("LEAVE_OUT") == list(pb.LEAVE_OUT)
    assert keys("JOBS") == list(pb.JOBS)
    num = lambda name: int(re.search(rf"export const {name} = ([\d_]+);", src).group(1).replace("_", ""))  # noqa: E731
    assert num("MIN_AMOUNT") == pb.MIN_AMOUNT
    assert num("MAX_AMOUNT") == pb.MAX_AMOUNT
    assert num("MAX_LIKES") == pb.MAX_LIKES
    for amount in (10_000, 24_999, 25_000, 74_999, 75_000, 299_999, 300_000, 999_999, 1_000_000):
        steps = re.findall(r"if \(amount < ([\d_]+)\) return (\d+);", src)
        n = next((int(k) for under, k in steps if amount < int(under.replace("_", ""))), None)
        n = n if n is not None else int(re.search(r"\n  return (\d+);\n}\n\nexport const AMOUNT_CHIPS", src).group(1))
        assert n == pb.share_count(amount), amount
    for job, (en, bn) in pb.JOB_WORDS.items():
        assert f'{job}: {{ en: "{en}", bn: "{bn}" }}' in src, job


def test_fair_price_copies_match():
    """The valuation score from the fair price (fair_context) uses the signal's
    lines, the score's P/E ceilings and the stock report's deposit (2026-11-22)."""
    from backend.services import fair_context as fc
    from backend.services import scoring_service, signal_service, stock_report
    assert fc.P4_AT_CENTRE - fc.P4_PER_RANGE == signal_service.EXPENSIVE_P4
    assert fc.P4_AT_CENTRE + fc.P4_PER_RANGE == signal_service.CHEAP_P4
    assert fc.DEPOSIT_CAP_P4 < signal_service.CHEAP_P4
    assert fc.PE_CEILINGS == scoring_service.PE_CEILINGS
    assert stock_report.FDR_RATE_PCT == fc.FDR_RATE_PCT
    assert stock_report.DIV_TAX_PCT == fc.DIV_TAX_PCT


def test_buy_list_profit_lines_are_the_signals():
    """One profit check (2026-11-22): the Buy List reads the signal's lines."""
    from backend.services import buy_list, signal_service
    assert buy_list.PROFIT_JOIN_PCT == signal_service.PROFIT_BUY_PCT
    assert buy_list.PROFIT_LEAVE_PCT == signal_service.PROFIT_LEAVE_PCT
    assert buy_list.QUARTER_JOIN_PCT == signal_service.QUARTER_BUY_PCT
    assert buy_list.QUARTER_LEAVE_PCT == signal_service.QUARTER_LEAVE_PCT


def test_buy_line_sits_inside_the_fair_range():
    """The Buy line is the fair centre, between the range's two edges."""
    from backend.services import fair_context as fc
    from backend.services import signal_service as sg
    assert sg.BUY_P4 == fc.P4_AT_CENTRE
    assert sg.EXPENSIVE_P4 < sg.BUY_LEAVE_P4 < sg.BUY_P4 < sg.CHEAP_P4 <= sg.STRONG_CHEAP_P4 < sg.FAR_UNDER_P4
    assert sg.FAR_UNDER_P4 == fc.P4_AT_CENTRE + 2 * fc.P4_PER_RANGE


# ---------------------------------------------------------------- one price ruler (2026-11-22, phase 4)

def test_price_word_and_fair_range_always_say_the_same():
    """The valuation score reads the fair range, so its word (low / fair /
    high) is the range's own answer at every price, for every confidence."""
    from backend.services import fair_context as fc
    from backend.services.stock_facts import valuation_verdict
    centre = 100.0
    for half in fc.RANGE_BASE.values():
        low, high = centre * (1 - half), centre * (1 + half)
        for price in [40 + i * 0.5 for i in range(200)]:
            p4, cap = fc.p4_on_fair(price, centre, half)
            assert cap is None
            word = valuation_verdict(p4)
            if price < low - 1e-6:
                assert word == "cheap", (half, price, p4)
            elif price > high + 1e-6:
                assert word == "expensive", (half, price, p4)
            elif low + 1e-6 < price < high - 1e-6:
                assert word == "fair", (half, price, p4)


def test_buy_signal_buy_price_and_list_price_agree_on_the_fair_range():
    """For a strong company priced on its fair range: the Buy signal is on
    exactly when today's price is at or under the buy price the stock page
    shows, and the Buy List joins at that same price."""
    from backend.services import buy_list as bl
    from backend.services.signal_service import _signal_for_row
    mom = {"momentum_grade": "healthy", "pct_in_52w_range": 40.0}
    for ltp in (70.0, 85.0, 95.0, 99.0, 100.5, 104.0, 112.0, 130.0):
        row = {"score": 70.0, "ltp": ltp, "market_cat": "A", "stale_data": False, "eps": 8.0,
               "eps_yoy_pct": 5.0, "p4_basis": "fair", "fair_center": 100.0, "fair_half_width": 0.12,
               "fair_eps_used": 8.0, "div_latest_dps": 4.0, "p1_eps_cagr": 6.0}
        from backend.services import fair_context as fc
        row["p4_val"] = fc.p4_on_fair(ltp, 100.0, 0.12, 8.0, 8.0, 4.0, 6.0)[0]
        buy = sr.buy_price_for(row, ltp, near_top=None)
        sig = _signal_for_row(row, mom)
        assert buy is not None and abs(buy - 100.0) <= 1.0           # the fair middle
        assert (sig["signal"] == "buy") == (ltp <= buy), (ltp, buy, sig["reason_key"])
        assert bl.join_price({"code": "X"}, buy) == bl.round_price(buy)


def test_confidence_reasons_all_have_plain_words():
    import re
    from backend.services import fair_context as fc
    keys = set()
    for args in [(1, 0, 0, False, None, False, None, False), (3, 0.1, 5, True, 0.9, True, 0.3, True),
                 (2, 0.4, 3, False, 0.2, False, 0.9, False), (3, 0.9, 4, True, 0.5, False, 0.9, False)]:
        keys |= set(fc.confidence(*args)[1])
    assert keys <= set(fc.CONF_REASONS)
    market = re.compile(r"\b(EPS|NAV|P/E|ROE|TTM|YoY|CAGR)\b|ইপিএস|পিই|এনএভি")
    bn_digits = re.compile(r"[০-৯]")
    for level in fc.CONF_WORDS:
        w = fc.confidence_words(level, list(fc.CONF_REASONS))
        for txt in (w["line"]["en"], w["line"]["bn"], w["word"]["en"], w["word"]["bn"]):
            assert txt and not market.search(txt) and not bn_digits.search(txt)
        assert w["line"]["en"].count(",") + w["line"]["en"].count(" and ") <= 3   # three reasons at most
    assert fc.confidence_words("nonsense", []) is None
