"""The buy signals page in one bundle (2026-10-31, the buy list redesign
https://claude.ai/artifact/5j5zWBpDKULp8Qx5fExbiK). Pure: every function takes
plain dicts, so the rules are tested on fixtures (tests/test_signal_today.py).

Free on the page: the funnel (how many were graded, how many are good, how
many passed every check, and why the other good companies were left out), the
change since the last trading day, and each Buy's price word. Premium (screen-
only, like every lock): three plain facts on why each Buy is here, and the
good companies "almost on the list" with the price where each would come in.

Plain-reading rules match the stock report: no bare market words, no ratios,
P/E said as "years of its profit", at most three numbers a sentence. Never a
past-return or "since we picked it" figure.
"""
from __future__ import annotations

import math
from typing import Iterable, Optional

# Reasons a Good or Excellent company has no Buy, grouped the way the page
# says them. Order = how the page lists them (biggest group is sorted first
# by the caller; ties keep this order).
LEFT_OUT = {
    "price": ("Price too high", "দাম বেশি"),
    "near_52w_high": ("Price near its yearly top", "দাম বছরের সর্বোচ্চের কাছে"),
    "red_flag": ("A serious warning in its report", "রিপোর্টে গুরুতর সতর্কতা"),
    "heavy_debt": ("Loans bigger than the company's value", "ঋণ কোম্পানির বাজারমূল্যের চেয়েও বেশি"),
    "thin_trading": ("Trades too little", "লেনদেন খুব কম"),
    "earnings_dropped": ("Profit fell a quarter or more", "মুনাফা এক-চতুর্থাংশ বা তার বেশি কমেছে"),
    "stale_financials": ("Accounts are old", "হিসাব পুরোনো"),
    "z_category": ("In Z category", "Z ক্যাটাগরিতে"),
}
_GROUP = {"good_wait_price": "price", "quality_expensive": "price"}

# Why a share left the list since the last trading day: the left-out words,
# plus a grade that fell.
_LEFT_EXTRA = {
    "average_fundamentals": ("Grade fell to Average", "গ্রেড নেমে মাঝারি হয়েছে"),
    "weak_fundamentals": ("Grade fell to Weak", "গ্রেড নেমে দুর্বল হয়েছে"),
    "not_rated": ("No longer rated", "এখন রেটিং নেই"),
}

PRICE_WORDS = {
    "very_low": ("Very low price", "খুব কম দাম"),
    "low": ("Low price", "কম দাম"),
    "fair": ("Fair price", "ন্যায্য দাম"),
}

# A day where this many codes moved in or out of the list is a rule change
# (or a fresh rescore), not news: the page says so instead of naming them.
REBUILT_MIN = 8
REBUILT_SHARE = 0.4

LENDERS = ("BANK", "NBFI", "INSURANCE")


def _n(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def group_key(reason_key: Optional[str]) -> Optional[str]:
    """The page's left-out group for a signal reason; None when it isn't one."""
    k = _GROUP.get(reason_key or "", reason_key or "")
    return k if k in LEFT_OUT else None


def reason_words(reason_key: Optional[str]) -> Optional[dict]:
    g = group_key(reason_key)
    if g:
        return bi(*LEFT_OUT[g])
    if reason_key in _LEFT_EXTRA:
        return bi(*_LEFT_EXTRA[reason_key])
    return None


def price_word(sig: Optional[dict]) -> Optional[str]:
    """very_low | low | fair for a Buy, else None (mirrors frontend
    `priceWordKey`). "Very low" = the signal's old "strong" conviction."""
    if not sig or sig.get("signal") != "buy":
        return None
    if sig.get("strength") == "strong":
        return "very_low"
    if sig.get("reason_key") == "excellent_fair_price":
        return "fair"
    return "low"


def _good(sig: dict) -> bool:
    return (sig or {}).get("tier") in ("good", "excellent")


def funnel(signals: dict[str, dict]) -> dict:
    """{graded, good, buys, left_out: [{key, n, en, bn}]} — biggest group first."""
    graded = good = buys = 0
    counts: dict[str, int] = {}
    for sig in signals.values():
        tier = (sig or {}).get("tier")
        if tier in (None, "unknown"):
            continue
        graded += 1
        if not _good(sig):
            continue
        good += 1
        if sig.get("signal") == "buy":
            buys += 1
            continue
        g = group_key(sig.get("reason_key"))
        if g:
            counts[g] = counts.get(g, 0) + 1
    order = list(LEFT_OUT)
    left = sorted(counts.items(), key=lambda kv: (-kv[1], order.index(kv[0])))
    return {
        "graded": graded, "good": good, "buys": buys,
        "left_out": [{"key": k, "n": n, **bi(*LEFT_OUT[k])} for k, n in left],
    }


def changes(today: dict[str, dict], prev: dict[str, Optional[str]], prev_day: Optional[str]) -> Optional[dict]:
    """Who joined and who left the Buy list since `prev_day`.

    `today` = live signals by code, `prev` = {code: signal} from that day's
    snapshot. A leaver carries today's reason in words. None without a previous
    day; `rebuilt` when so much moved at once that it was a rule change."""
    if not prev_day or not prev:
        return None
    now = {c for c, s in today.items() if (s or {}).get("signal") == "buy"}
    before = {c for c, s in prev.items() if s == "buy"}
    joined = sorted(now - before)
    left = []
    for c in sorted(before - now):
        sig = today.get(c) or {}
        left.append({"code": c, "reason_key": sig.get("reason_key"), "reason": reason_words(sig.get("reason_key"))})
    moved = len(joined) + len(left)
    rebuilt = moved >= REBUILT_MIN and moved >= REBUILT_SHARE * max(len(now), len(before), 1)
    return {"since": prev_day, "joined": joined, "left": left, "rebuilt": rebuilt}


# ------------------------------------------------------------------ why (Premium)

def _pct(v: float) -> str:
    return f"{round(v)}"


def _years(v: float) -> str:
    return f"{round(v)}"


def why_facts(row: dict, sig: dict, sector_class: str = "GENERAL",
              safety: Optional[dict] = None, limit: int = 3) -> list[dict]:
    """Up to three plain facts on why this Buy is here, strongest first, built
    from the score row. Each fact is one short sentence in both languages."""
    facts: list[tuple[int, dict]] = []
    lender = sector_class in LENDERS
    score = _n(row.get("score"))

    # 1 · the price, in years of profit (the reason a Buy is a Buy).
    pe, own, sec = _n(row.get("current_pe")), _n(row.get("own_avg_pe")), _n(row.get("sector_median_pe"))
    if pe and pe > 0:
        if own and own > 0 and pe <= own * 0.9 and round(pe) < round(own):
            facts.append((100, bi(
                f"You pay about {_years(pe)} years of its profit. It usually costs {_years(own)}.",
                f"দাম এখন এর প্রায় {_years(pe)} বছরের মুনাফার সমান। সাধারণত লাগে {_years(own)} বছরের।")))
        elif sec and sec > 0 and pe <= sec * 0.8 and round(pe) < round(sec):
            facts.append((95, bi(
                f"You pay about {_years(pe)} years of its profit. Similar companies cost {_years(sec)}.",
                f"দাম এখন এর প্রায় {_years(pe)} বছরের মুনাফার সমান। একই ধরনের কোম্পানিতে লাগে {_years(sec)} বছরের।")))

    # 2 · profit: this year's results first, else the last audited year.
    yoy, interim = _n(row.get("interim_eps_yoy_pct")), True
    if yoy is None:
        yoy, interim = _n(row.get("eps_yoy_pct")), False
    if yoy is not None:
        if yoy >= 100:
            facts.append((90, bi(
                "Profit has more than doubled " + ("so far this year." if interim else "in its latest year."),
                "মুনাফা দ্বিগুণের বেশি হয়েছে, " + ("এ বছর এখন পর্যন্ত।" if interim else "সর্বশেষ বছরে।"))))
        elif yoy >= 10:
            facts.append((90, bi(
                f"Profit is up {_pct(yoy)}% " + ("so far this year." if interim else "in its latest year."),
                ("এ বছর এখন পর্যন্ত" if interim else "সর্বশেষ বছরে") + f" মুনাফা {_pct(yoy)}% বেড়েছে।")))
        elif yoy > -10:
            facts.append((40, bi("Profit is holding steady.", "মুনাফা স্থির আছে।")))

    # 3 · cash dividend.
    y = _n(row.get("div_yield_pct"))
    if y and y >= 3:
        safe = (safety or {}).get("level") == "safe"
        ys = f"{y:.1f}".removesuffix(".0")
        facts.append((85 if y >= 5 else 70 if y >= 4 else 45, bi(
            f"Pays about {ys}% a year in cash" + (", and it looks able to keep paying." if safe else "."),
            f"বছরে প্রায় {ys}% নগদ ডিভিডেন্ড দেয়" + (", আর তা চালিয়ে যেতে পারবে বলে মনে হয়।" if safe else "।"))))

    # 4 · loans (not for lenders / insurers: borrowing is their business).
    ltr = _n(row.get("loan_to_reserve"))
    if not lender and ltr is not None and ltr <= 0.2:
        facts.append((75, bi("Almost no loans next to the money it has kept.",
                             "জমানো টাকার তুলনায় ঋণ প্রায় নেই।")))

    # 5 · how much it earns on its owners' money.
    roe = _n(row.get("roe_pct"))
    if roe and roe >= 20:
        facts.append((65, bi(f"Earns about ৳{round(roe)} a year on every ৳100 its owners have in it.",
                             f"মালিকদের প্রতি ৳100-এ বছরে প্রায় ৳{round(roe)} আয় করে।")))

    # 6 · size in its sector, and the grade.
    rank = _n(row.get("p3_sector_rank"))
    if rank and rank >= 9:
        facts.append((55, bi("One of the biggest companies in its sector.", "নিজের সেক্টরের সবচেয়ে বড় কোম্পানিগুলোর একটি।")))
    if score and score >= 85:
        facts.append((60, bi("One of the strongest companies on the DSE.", "ডিএসইর সবচেয়ে শক্তিশালী কোম্পানিগুলোর একটি।")))
    elif sig.get("reason_key") == "excellent_fair_price" or (score and score >= 75):
        facts.append((50, bi("Graded Excellent: strong on almost every check.", "চমৎকার গ্রেড: প্রায় প্রতিটি যাচাইয়ে ভালো।")))

    facts.sort(key=lambda f: -f[0])
    return [f for _, f in facts[:limit]]


# ------------------------------------------------------------------ almost (Premium)

def almost_row(code: str, sig: dict, row: dict, ltp: Optional[float],
               buy_below: Optional[float], stop: Optional[float],
               red_line: Optional[dict] = None) -> Optional[dict]:
    """One good company with no Buy: its reason in words and, where it is the
    price that keeps it off, the price where it would come in. None for a
    company that isn't Good / Excellent or has a Buy."""
    if not _good(sig) or sig.get("signal") == "buy":
        return None
    g = group_key(sig.get("reason_key"))
    if not g:
        return None
    price = _n(ltp)
    line, under = None, None
    if g == "near_52w_high" and stop and price and stop < price:
        under = stop
        line = bi(f"Comes back on the list under ৳{_money(stop)}.",
                  f"৳{_money(stop)}-এর নিচে নামলে আবার তালিকায় আসবে।")
    elif g == "price" and buy_below and price and buy_below < price:
        under = buy_below
        gap = round((price - buy_below) / price * 100)
        line = bi(f"Our buy price is ৳{_money(buy_below)}, {gap}% below today.",
                  f"আমাদের কেনার দাম ৳{_money(buy_below)}, আজকের চেয়ে {gap}% কম।")
    elif g == "red_flag" and red_line:
        line = red_line
    elif g == "earnings_dropped":
        yoy = _n(row.get("interim_eps_yoy_pct"))
        if yoy is None:
            yoy = _n(row.get("eps_yoy_pct"))
        if yoy is not None and yoy > -100:
            line = bi(f"Profit is down {round(abs(yoy))}% on last year.",
                      f"মুনাফা আগের বছরের চেয়ে {round(abs(yoy))}% কম।")
    gap_pct = round((price - under) / price * 100, 1) if (under and price) else None
    return {"code": code, "reason_key": sig.get("reason_key"), "group": g,
            "reason": bi(*LEFT_OUT[g]), "line": line, "under": under, "gap_pct": gap_pct,
            "score": _n(row.get("score")), "tier": sig.get("tier")}


def sort_almost(rows: Iterable[dict]) -> list[dict]:
    """Closest to coming in first: price-blocked rows by how far the price must
    fall, then everyone else by grade score."""
    rows = [r for r in rows if r]
    priced = sorted((r for r in rows if r.get("gap_pct") is not None), key=lambda r: r["gap_pct"])
    rest = sorted((r for r in rows if r.get("gap_pct") is None), key=lambda r: -(r.get("score") or 0))
    return priced + rest


def _money(v: float) -> str:
    """৳ amounts the way `formatters.money` prints them: no decimals from 100."""
    return f"{v:,.0f}" if v >= 100 else f"{v:.1f}"
