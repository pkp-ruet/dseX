"""
Compare stocks — the rules (pure, so tests can call them). The data side is
``compare_service.py``; the page is ``frontend/app/compare-stocks``.

The page puts up to ``MAX_CODES`` shares side by side and answers the same
seven questions for each. Every share is a row, never a column: one card a
question, one figure a share, sorted best first, the leader named in one
sentence (2026-11-12, user: the first mockup with a column per share was
"complex, messy and hard to understand").

Facts only. The leader on a card is the share that leads on that one figure,
never "the better buy", and nothing here says buy or sell. Our analysis of
each company (strong / fair / weak on each check, the price word, the safety
count) rides along under ``analysis``; the page shows it to Premium readers
only (screen-only lock, like every other).
"""
from __future__ import annotations

import re
from typing import Any, Optional

MAX_CODES = 10          # = entitlements.HARD_LIMITS["compare"]; Premium compares up to 10
FREE_CODES = 3          # = entitlements.FREE_LIMITS["compare"]
SIMILAR_MAX = 6
DATE_DAYS = 60          # dates ahead on the page: the next two months
_CODE_RX = re.compile(r"^[A-Z0-9&.\-]{1,20}$")

_MONTHS_EN = ("Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec")
_MONTHS_BN = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")

# The four business checks behind the grade (grade_rules.CHECKS), in the
# stock page's words (stock_analysis.NAMES).
CHECK_NAMES = {
    "p1_biz": ("profit", "মুনাফা"),
    "p2_health": ("finances", "আর্থিক অবস্থা"),
    "p3_moat": ("business", "ব্যবসা"),
    "p5_div": ("dividend", "ডিভিডেন্ড"),
}

# The stock report's price word (its scorecard "price" word) in Bengali.
PRICE_WORDS_BN = {"Very low": "খুব কম", "Low": "কম", "Fair": "ন্যায্য", "High": "বেশি",
                  "Can't judge": "বলা যায় না", "Not rated": "রেটিং নেই"}
PRICE_TONES = {"Very low": "good", "Low": "good", "Fair": "neutral", "High": "fair",
               "Can't judge": "neutral", "Not rated": "neutral"}

_LENDER_WORDS = {
    "BANK": ("Not used for banks", "ব্যাংকের জন্য প্রযোজ্য নয়"),
    "NBFI": ("Not used for finance companies", "আর্থিক প্রতিষ্ঠানের জন্য প্রযোজ্য নয়"),
    "INSURANCE": ("Not used for insurers", "বিমা কোম্পানির জন্য প্রযোজ্য নয়"),
}


def _as_list(v: Any) -> list:
    """A stored list column (a list, a tuple, a numpy array or None)."""
    if v is None or isinstance(v, (str, float)):
        return []
    try:
        return list(v)
    except TypeError:
        return []


def bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _n(v: Any) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if x != x else x


# --------------------------------------------------------------------------- #
# Words and numbers
# --------------------------------------------------------------------------- #

def parse_codes(raw: Optional[str], limit: int = MAX_CODES) -> list[str]:
    """"gp, robi,GP" → ["GP", "ROBI"]: upper case, no repeats, URL order,
    at most ``limit``. Anything that can't be a trading code is dropped."""
    out: list[str] = []
    for part in (raw or "").split(","):
        c = part.strip().upper()
        if c and _CODE_RX.match(c) and c not in out:
            out.append(c)
        if len(out) >= limit:
            break
    return out


def money(v: Optional[float]) -> str:
    """৳1,234 at 100 and above, ৳45.6 below (frontend formatters.money)."""
    x = _n(v)
    if x is None:
        return "—"
    s = f"{abs(x):,.0f}" if abs(x) >= 100 else f"{abs(x):,.1f}"
    return ("−৳" if x < 0 else "৳") + s


def per_share(v: Optional[float]) -> str:
    """Cash or profit a share: ৳13, ৳1.10, ৳31.24 (two decimals unless whole)."""
    x = _n(v)
    if x is None:
        return "—"
    s = f"{abs(x):,.0f}" if abs(x - round(x)) < 1e-9 else f"{abs(x):,.2f}"
    return ("−৳" if x < 0 else "৳") + s


def crore(v: Optional[float]) -> dict:
    """৳ crore from a crore figure: "৳19,378 cr" / "৳19,378 কোটি"."""
    x = _n(v)
    if x is None:
        return bi("—", "—")
    s = f"{x:,.0f}" if abs(x) >= 100 else f"{x:,.1f}"
    return bi(f"৳{s} cr", f"৳{s} কোটি")


def lakh_or_crore(lakh: Optional[float]) -> dict:
    """A daily turnover in lakh: "৳28.3 lakh" under a crore, "৳10.0 cr" above."""
    x = _n(lakh)
    if x is None:
        return bi("—", "—")
    if x >= 100:
        return bi(f"৳{x / 100:,.1f} cr", f"৳{x / 100:,.1f} কোটি")
    return bi(f"৳{x:,.1f} lakh", f"৳{x:,.1f} লাখ")


def signed(v: Optional[float], d: int = 0) -> str:
    """+15% / −39% / 0% (a real minus sign, like the frontend's changePct)."""
    x = _n(v)
    if x is None:
        return "—"
    r = round(x, d)
    body = f"{abs(r):.{d}f}" if d else f"{abs(r):.0f}"
    if r > 0:
        return f"+{body}%"
    if r < 0:
        return f"−{body}%"
    return f"{body}%"


def tone_of(v: Optional[float]) -> str:
    x = _n(v)
    return "pos" if x is not None and x > 0 else "neg" if x is not None and x < 0 else ""


def day(iso: Optional[str]) -> dict:
    """"16 Nov" / "16 নভেম্বর" for an ISO date."""
    try:
        y, m, d = (int(x) for x in str(iso)[:10].split("-"))
        return bi(f"{d} {_MONTHS_EN[m - 1]}", f"{d} {_MONTHS_BN[m - 1]}")
    except (ValueError, IndexError, TypeError):
        return bi(str(iso or ""), str(iso or ""))


def join_words(words: list[str], bn: bool = False) -> str:
    """"a, b and c" / "a, b ও c"."""
    words = [w for w in words if w]
    if len(words) < 2:
        return "".join(words)
    return ", ".join(words[:-1]) + (" ও " if bn else " and ") + words[-1]


def poss(name: str) -> str:
    """English possessive: "Renata's", "Beacon Pharmaceuticals'"."""
    return name + ("'" if name.endswith("s") else "'s")


def _of(name: str) -> str:
    """Bengali possessive for any name, Latin or Bengali: "Renata-এর"."""
    return f"{name}-এর"


# --------------------------------------------------------------------------- #
# One share
# --------------------------------------------------------------------------- #

def share_row(f: dict, *, short: str, ret_1y: Optional[float], reserve_mn: Optional[float],
              snap: Optional[dict], signal: Optional[dict], total: Optional[int],
              group_words: dict[str, tuple[str, str]], sector_bn: Optional[str]) -> dict:
    """Everything the page shows for one share. ``f`` = the research-list facts
    (score row + price, 52-week range, turnover); ``snap`` = its newest stock
    report snapshot (price word, red / amber counts and lines)."""
    from backend.services.research_lists import profit_trend
    from backend.services.tiers import tier_key

    code = f.get("code") or f.get("trading_code")
    score = _n(f.get("score"))
    tier = tier_key(score) if score is not None else "unknown"
    g_en, g_bn = group_words.get(tier, ("Unrated", "রেটিং নেই"))
    eps = _n(f.get("eps"))
    loss = eps is not None and eps <= 0
    pct, per_en, per_bn = profit_trend(f)
    sector_class = (f.get("sector_class") or "").upper()
    lender = sector_class in _LENDER_WORDS

    pe = _n(f.get("current_pe"))
    pe = round(pe, 1) if pe and pe > 0 and not loss else None
    usual = _n(f.get("own_avg_pe"))
    usual_years = _n(f.get("own_avg_pe_years")) or 0
    sector_pe = _n(f.get("sector_median_pe"))
    pb = _n(f.get("current_pb"))

    # Loans against savings from the DSE company page's own two figures (the
    # score row's ratio is rounded to 2 decimals: Square's 0.6% read 1%).
    loan_mn = _n(f.get("total_loan_mn"))
    l2r = (loan_mn / reserve_mn if loan_mn is not None and reserve_mn and reserve_mn > 0
           else _n(f.get("loan_to_reserve")))
    l2m = _n(f.get("loan_to_mcap"))
    mcap_mn = _n(f.get("mcap_mn"))

    record = None
    paid = f.get("paid_years")
    dps = _n(f.get("div_latest_dps"))
    if dps is None and _n(f.get("div_yield_pct")) and _n(f.get("ltp")):
        dps = _n(f.get("div_yield_pct")) * _n(f.get("ltp")) / 100.0

    checks = {}
    for k, (en, bn_) in CHECK_NAMES.items():
        w = (f.get("grade_checks") or {}).get(k)
        if w in ("strong", "fair", "weak"):
            checks[en] = w

    return {
        "code": code,
        "name": f.get("name") or code,
        "short": short,
        "sector": f.get("sector"),
        "sector_bn": sector_bn or f.get("sector"),
        "sector_class": sector_class or None,
        "category": (f.get("cat") or "").strip().upper() or None,
        "price": _n(f.get("ltp")),
        "change_pct": _n(f.get("change_pct")),
        "score": round(score) if score is not None else None,
        "tier": tier,
        "group": bi(g_en, g_bn),
        "rank": int(f["overall_rank"]) if _n(f.get("overall_rank")) else None,
        "total": total,
        "mcap_cr": round(mcap_mn / 10.0, 1) if mcap_mn is not None else None,
        "turnover_lakh": round(_n(f.get("turnover_mn")) * 10.0, 1) if _n(f.get("turnover_mn")) is not None else None,
        "eps": eps,
        "loss": loss,
        "profit_pct": None if loss or pct is None else round(pct, 1),
        "profit_period": bi(per_en, per_bn),
        "fy_change": _n(f.get("eps_yoy_pct")),
        "yield": round(_n(f.get("div_yield_pct")) or 0.0, 1),
        "dps": dps,
        "paid": int(paid) if paid else None,
        "record": record,
        "pe": pe,
        "usual_pe": round(usual) if usual and usual > 0 and usual_years >= 3 else None,
        "sector_pe": round(sector_pe) if sector_pe and sector_pe > 0 else None,
        "pb": round(pb, 2) if pb and pb > 0 else None,
        "lender": lender,
        "loans_cr": round(loan_mn / 10.0, 1) if loan_mn is not None else None,
        "savings_cr": round(reserve_mn / 10.0, 1) if reserve_mn is not None else None,
        "loans_pct": None if lender or l2r is None or (reserve_mn is not None and reserve_mn <= 0)
                     else round(l2r * 100.0, 1),
        "no_savings": bool(not lender and reserve_mn is not None and reserve_mn <= 0 and (loan_mn or 0) > 0),
        "loans_mcap_pct": None if lender or l2m is None else round(l2m * 100.0, 1),
        "ret_1y": round(ret_1y, 1) if _n(ret_1y) is not None else None,
        "lo52": _n(f.get("lo52")),
        "hi52": _n(f.get("hi52")),
        "analysis": analysis_row(checks, f, snap, signal, loss),
        "problems": _as_list(f.get("grade_problems")),
    }


def analysis_row(checks: dict[str, str], f: dict, snap: Optional[dict],
                 signal: Optional[dict], loss: bool) -> dict:
    """Our read of one company in the stock page's words: which checks are
    strong / fair / weak, the price word, and what the safety checks found."""
    names_bn = {en: bn for en, bn in CHECK_NAMES.values()}
    lists = {}
    for w in ("strong", "fair", "weak"):
        en = [k for k, v in checks.items() if v == w]
        lists[w] = bi(join_words(en), join_words([names_bn[k] for k in en], True)) if en else None

    sig = signal or {}
    # The stock page's price word: "Very low" for what the signal calls a
    # strong Buy (the answer card's light), else the report's own word.
    if sig.get("signal") == "buy" and sig.get("strength") == "strong":
        word = "Very low"
    else:
        word = ((snap or {}).get("words") or {}).get("price")
        if word not in PRICE_WORDS_BN:
            word = _price_word_from_p4(f.get("p4_val"), loss)
    price = bi(word, PRICE_WORDS_BN[word]) | {"tone": PRICE_TONES[word]} if word else None

    safety = None
    if snap is not None:
        red, amber = int(snap.get("red") or 0), int(snap.get("amber") or 0)
        first = None
        for k in snap.get("red_keys") or []:
            t = (snap.get("red_lines") or {}).get(k) or {}
            if t.get("en") and t.get("bn"):
                first = bi(t["en"], t["bn"])
                break
        if red:
            word_s = (bi("1 serious problem", "1টি গুরুতর সমস্যা") if red == 1
                      else bi(f"{red} serious problems", f"{red}টি গুরুতর সমস্যা"))
            safety = {"word": word_s, "tone": "bad", "line": first}
        elif amber:
            word_s = (bi("1 smaller thing to check", "যাচাই করার মতো 1টি ছোট বিষয়") if amber == 1
                      else bi(f"{amber} smaller things to check", f"যাচাই করার মতো {amber}টি ছোট বিষয়"))
            safety = {"word": word_s, "tone": "fair", "line": None}
        else:
            safety = {"word": bi("Nothing found", "কোনো সমস্যা পাওয়া যায়নি"), "tone": "good", "line": None}
    return {"checks": checks, "strong": lists["strong"], "fair": lists["fair"], "weak": lists["weak"],
            "price": price, "safety": safety}


def _price_word_from_p4(p4: Any, loss: bool) -> Optional[str]:
    """The stock report's price word when no snapshot carries it
    (stock_facts.valuation_verdict bands: ≥ 7 low, < 4 high)."""
    if loss:
        return "Can't judge"
    v = _n(p4)
    if v is None:
        return None
    return "Low" if v >= 7 else "High" if v < 4 else "Fair"


# --------------------------------------------------------------------------- #
# The seven questions
# --------------------------------------------------------------------------- #

def _bar(code: str, value: Optional[float], label: dict, sub: Optional[dict] = None, tone: str = "") -> dict:
    return {"code": code, "value": value, "label": label, "sub": sub, "tone": tone}


def _rank(bars: list[dict], best: str) -> list[dict]:
    """Best first; shares without the figure last, in the order they came."""
    have = [b for b in bars if b["value"] is not None]
    none = [b for b in bars if b["value"] is None]
    have.sort(key=lambda b: b["value"], reverse=(best == "max"))
    return have + none


def _leaders(ranked: list[dict]) -> list[dict]:
    have = [b for b in ranked if b["value"] is not None]
    if not have:
        return []
    top = have[0]["value"]
    return [b for b in have if b["value"] == top]


def _names(rows: dict[str, dict], bars: list[dict]) -> tuple[str, str]:
    names = [rows[b["code"]]["short"] for b in bars]
    return join_words(names), join_words(names, True)


def _more(cols: list[dict], rows: list[dict], cell) -> dict:
    return {"cols": cols, "rows": [{"code": r["code"], "cells": cell(r)} for r in rows]}


def questions(shares: list[dict]) -> list[dict]:
    """The seven cards, each: what it asks, the answer, the sorted bars, what
    the figure means and a few more figures (one row a share)."""
    by = {r["code"]: r for r in shares}
    out = []

    def card(key: str, topic: dict, question: dict, best: str, bars: list[dict],
             answer, meaning: dict, more: dict, diverge: bool = False, glance: dict = None) -> None:
        ranked = _rank(bars, best)
        lead = _leaders(ranked)
        out.append({
            "key": key, "topic": topic, "question": question, "best": best, "diverge": diverge,
            "glance": glance, "bars": ranked,
            "leaders": [b["code"] for b in lead],
            "answer": answer(ranked, lead) if lead else bi("None of these shares has this figure yet.",
                                                         "এই শেয়ারগুলোর কোনোটির এই হিসাব এখনো নেই।"),
            "meaning": meaning, "more": more,
        })

    # 1 · our grade
    def grade_answer(ranked, lead):
        en, bn = _names(by, lead)
        r = by[lead[0]["code"]]
        if len(lead) > 1:
            return bi(f"{en} share our highest grade here: {r['score']} out of 100.",
                      f"{bn} এখানে আমাদের সর্বোচ্চ গ্রেড পেয়েছে: 100-এর মধ্যে {r['score']}।")
        return bi(f"{en} gets our highest grade: {r['score']} out of 100, “{r['group']['en'].lower()}”.",
                  f"আমাদের সর্বোচ্চ গ্রেড পেয়েছে {bn}: 100-এর মধ্যে {r['score']}, “{r['group']['bn']}”।")
    card("grade", bi("Our grade", "আমাদের গ্রেড"),
         bi("Which is the strongest company?", "কোন কোম্পানি সবচেয়ে শক্তিশালী?"), "max",
         [_bar(r["code"], r["score"], bi(str(r["score"]), str(r["score"])) if r["score"] is not None
               else bi("Not graded", "গ্রেড নেই"), r["group"]) for r in shares],
         grade_answer,
         bi("Our grade looks at the business only: its profit, finances, strength against rivals and dividend record. It is free on every stock page.",
            "আমাদের গ্রেড শুধু ব্যবসা দেখে: মুনাফা, আর্থিক অবস্থা, প্রতিযোগীদের তুলনায় শক্তি আর ডিভিডেন্ডের রেকর্ড। প্রতিটি শেয়ারের পেজে এটি ফ্রি।"),
         _more([bi("Group", "গ্রুপ"), bi("Rank on the DSE", "ডিএসইতে অবস্থান")], shares,
               lambda r: [r["group"], bi(f"No. {r['rank']} of {r['total']}", f"{r['total']}টির মধ্যে {r['rank']} নম্বর")
                          if r["rank"] and r["total"] else bi("—", "—")]),
         glance=bi("Strongest company", "সবচেয়ে শক্তিশালী"))

    # 2 · size
    def size_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        c = crore(by[lead[0]["code"]]["mcap_cr"])
        return bi(f"{en} is the biggest, worth {c['en'].replace(' cr', ' crore')} on the market.",
                  f"সবচেয়ে বড় {bn}, বাজার মূলধন {c['bn']}।")
    card("size", bi("Size", "আকার"), bi("Which company is bigger?", "কোন কোম্পানি বড়?"), "max",
         [_bar(r["code"], r["mcap_cr"], crore(r["mcap_cr"])) for r in shares],
         size_answer,
         bi("Market value is the share price times every share the company has. Bigger companies are usually easier to buy and sell.",
            "বাজার মূলধন হলো শেয়ারের দাম গুণ কোম্পানির মোট শেয়ার। বড় কোম্পানির শেয়ার সাধারণত সহজে কেনাবেচা করা যায়।"),
         _more([bi("Price today", "আজকের দাম"), bi("Traded a day", "দিনে লেনদেন"), bi("Category", "ক্যাটাগরি")], shares,
               lambda r: [bi(money(r["price"]), money(r["price"])), lakh_or_crore(r["turnover_lakh"]),
                          bi(r["category"] or "—", r["category"] or "—")]),
         glance=bi("Biggest company", "সবচেয়ে বড়"))

    # 3 · profit
    def profit_bar(r):
        if r["loss"]:
            return _bar(r["code"], None, bi("A loss", "লোকসান"), bi("in its latest results", "সর্বশেষ ফলে"), "neg")
        if r["profit_pct"] is None:
            return _bar(r["code"], None, bi("—", "—"), bi("No results to compare", "তুলনা করার মতো ফল নেই"))
        return _bar(r["code"], r["profit_pct"], bi(signed(r["profit_pct"]), signed(r["profit_pct"])),
                    r["profit_period"], tone_of(r["profit_pct"]))

    def profit_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        v = lead[0]["value"]
        per = by[lead[0]["code"]]["profit_period"]
        yearly = per["en"] == "last full year"
        when_en = "in its last full year" if yearly else f"in its latest results ({per['en']})"
        when_bn = "গত পুরো বছরে" if yearly else f"সর্বশেষ ফলে ({per['bn']})"
        if v >= 0:
            return bi(f"{poss(en)} profit grew most: up {abs(v):.0f}% {when_en}.",
                      f"মুনাফা সবচেয়ে বেশি বেড়েছে {_of(bn)}: {when_bn} {abs(v):.0f}% বেশি।")
        return bi(f"Profit fell at all of them. {poss(en)} fell least: down {abs(v):.0f}% {when_en}.",
                  f"সবগুলোর মুনাফা কমেছে। সবচেয়ে কম কমেছে {_of(bn)}: {when_bn} {abs(v):.0f}% কম।")
    card("profit", bi("Profit", "মুনাফা"), bi("Whose profit grew more?", "কার মুনাফা বেশি বেড়েছে?"), "max",
         [profit_bar(r) for r in shares], profit_answer,
         bi("Each company's latest results against the same months a year before. The months differ when one company has reported a newer quarter.",
            "প্রতিটি কোম্পানির সর্বশেষ ফল, আগের বছরের একই সময়ের তুলনায়। কোনো কোম্পানি নতুন প্রান্তিকের ফল দিলে সময়টা আলাদা হয়।"),
         _more([bi("Last full year", "গত পুরো বছর"), bi("Profit a share (EPS)", "শেয়ারপ্রতি মুনাফা (ইপিএস)")], shares,
               lambda r: [bi(signed(r["fy_change"]), signed(r["fy_change"])), bi(per_share(r["eps"]), per_share(r["eps"]))]),
         glance=bi("Profit grew most", "মুনাফা সবচেয়ে বেশি বেড়েছে"))

    # 4 · cash dividend
    def div_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        y = lead[0]["value"]
        if not y:
            return bi("None of these shares paid a cash dividend last year.",
                      "গত বছর এই শেয়ারগুলোর কোনোটি নগদ ডিভিডেন্ড দেয়নি।")
        return bi(f"{en} pays the most cash: {y:g}% a year on today's price, before tax.",
                  f"সবচেয়ে বেশি নগদ ডিভিডেন্ড দেয় {bn}: আজকের দামে বছরে {y:g}%, কর কাটার আগে।")

    def paid_words(r):
        p = r["paid"]
        if not p or p <= 2:
            return bi("2 or fewer of 5", "5 বছরে 2 বা তার কম")
        return bi(f"{p} of 5", f"5 বছরে {p}")
    card("dividend", bi("Cash dividend", "নগদ ডিভিডেন্ড"), bi("Which pays you more cash?", "কোনটি বেশি নগদ টাকা দেয়?"), "max",
         [_bar(r["code"], r["yield"], bi(f"{r['yield']:g}%" if r["yield"] else "None", f"{r['yield']:g}%" if r["yield"] else "নেই"))
          for r in shares], div_answer,
         bi("Last year's cash dividend against today's price, before 10% tax. On ৳10,000 of shares, 5% is about ৳500 a year.",
            "গত বছরের নগদ ডিভিডেন্ড, আজকের দামের তুলনায়, 10% কর কাটার আগে। ৳10,000-এর শেয়ারে 5% মানে বছরে প্রায় ৳500।"),
         _more([bi("Cash a share", "শেয়ারপ্রতি নগদ"), bi("Years it paid", "কত বছর দিয়েছে"), bi("Next record date", "পরের রেকর্ড ডেট")], shares,
               lambda r: [bi(per_share(r["dps"]), per_share(r["dps"])) if r["dps"] else bi("None", "নেই"), paid_words(r),
                          day(r["record"]["date"]) if r.get("record") else bi("Not set", "ঠিক হয়নি")]),
         glance=bi("Pays the most cash", "সবচেয়ে বেশি নগদ দেয়"))

    # 5 · price for its profit
    def pe_bar(r):
        if r["loss"]:
            return _bar(r["code"], None, bi("A loss", "লোকসান"), bi("no profit to measure", "মাপার মতো মুনাফা নেই"), "neg")
        if r["pe"] is None:
            return _bar(r["code"], None, bi("—", "—"))
        return _bar(r["code"], r["pe"], bi(f"{r['pe']:g} years", f"{r['pe']:g} বছর"))

    def pe_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        v = lead[0]["value"]
        return bi(f"{en} costs the least for its profit: today's price is {v:g} years of its profit.",
                  f"মুনাফার তুলনায় সবচেয়ে কম দাম {_of(bn)}: আজকের দাম এর {v:g} বছরের মুনাফার সমান।")
    card("pe", bi("Price for its profit", "মুনাফার তুলনায় দাম"),
         bi("Which costs less for its profit?", "মুনাফার তুলনায় কোনটির দাম কম?"), "min",
         [pe_bar(r) for r in shares], pe_answer,
         bi("How many years of its profit today's price buys (P/E). Fewer years means you pay less for each taka it earns. A low number can also mean the market expects less from it.",
            "আজকের দামে কত বছরের মুনাফা কেনা হচ্ছে (পিই)। বছর কম মানে প্রতি টাকা মুনাফার জন্য কম দাম দিচ্ছেন। তবে কম হলে এমনও হতে পারে যে বাজার এর কাছ থেকে কম আশা করছে।"),
         _more([bi("It usually costs", "সাধারণত দাম"), bi("Similar companies", "একই ধরনের কোম্পানি"),
                bi("Price against what it owns (P/B)", "সম্পদের তুলনায় দাম (পিবি)")], shares,
               lambda r: [bi(f"{r['usual_pe']} years", f"{r['usual_pe']} বছর") if r["usual_pe"] else bi("Not enough years", "যথেষ্ট বছর নেই"),
                          bi(f"{r['sector_pe']} years", f"{r['sector_pe']} বছর") if r["sector_pe"] else bi("—", "—"),
                          bi(f"{r['pb']:g} times", f"{r['pb']:g} গুণ") if r["pb"] else bi("—", "—")]),
         glance=bi("Costs least for its profit", "মুনাফার তুলনায় সবচেয়ে কম দাম"))

    # 6 · loans
    def loans_bar(r):
        if r["lender"]:
            en, bn = _LENDER_WORDS[r["sector_class"]]
            return _bar(r["code"], None, bi("—", "—"), bi(en, bn))
        if r["no_savings"]:
            return _bar(r["code"], None, bi("No savings", "জমানো টাকা নেই"), bi("its savings are below zero", "জমানো টাকা শূন্যের নিচে"), "neg")
        v = r["loans_pct"]
        if v is None:
            return _bar(r["code"], None, bi("—", "—"), bi("Not reported", "জানা যায়নি"))
        if v < 1:
            return _bar(r["code"], v, bi("Under 1%", "1%-এর কম"))
        return _bar(r["code"], v, bi(f"{v:.0f}%", f"{v:.0f}%"), None, "neg" if v >= 100 else "")

    def loans_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        v = lead[0]["value"]
        head = (bi(f"{en} has the fewest loans: almost none.", f"সবচেয়ে কম ঋণ {_of(bn)}: প্রায় নেই বললেই চলে।") if v < 1
                else bi(f"{en} has the fewest loans: {v:.0f}% of its savings.", f"সবচেয়ে কম ঋণ {_of(bn)}: জমানো টাকার {v:.0f}%।"))
        over = [b for b in ranked if b["value"] is not None and b["value"] >= 100]
        if over:
            o_en, o_bn = _names(by, over)
            verb = "owes more than it has" if len(over) == 1 else "owe more than they have"
            head = bi(head["en"] + f" {o_en} {verb} saved.",
                      head["bn"] + f" {_of(o_bn)} ঋণ জমানো টাকার চেয়ে বেশি।")
        return head
    card("loans", bi("Loans", "ঋণ"), bi("Which has fewer loans?", "কোনটির ঋণ কম?"), "min",
         [loans_bar(r) for r in shares], loans_answer,
         bi("Loans against the savings it has built up over the years. Over 100% means it owes more than it has saved.",
            "এত বছরে জমানো টাকার তুলনায় ঋণ। 100%-এর বেশি মানে জমানো টাকার চেয়ে ঋণ বেশি।"),
         _more([bi("Loans", "ঋণ"), bi("Savings", "জমানো টাকা"), bi("Against its market value", "বাজার মূলধনের তুলনায়")], shares,
               lambda r: [crore(r["loans_cr"]) if r["loans_cr"] is not None else bi("—", "—"),
                          crore(r["savings_cr"]) if r["savings_cr"] is not None else bi("—", "—"),
                          bi("Under 1%", "1%-এর কম") if r["loans_mcap_pct"] is not None and r["loans_mcap_pct"] < 1
                          else bi(f"{r['loans_mcap_pct']:.0f}%", f"{r['loans_mcap_pct']:.0f}%") if r["loans_mcap_pct"] is not None
                          else bi("—", "—")]),
         glance=bi("Fewest loans", "সবচেয়ে কম ঋণ"))

    # 7 · the price this year
    def move_answer(ranked, lead):
        en, bn = _names(by, lead[:1])
        v = lead[0]["value"]
        first = (bi(f"{en} rose most: up {abs(v):g}% in 12 months.", f"সবচেয়ে বেশি বেড়েছে {bn}: 12 মাসে {abs(v):g}%।") if v >= 0
                 else bi(f"All of them fell. {en} fell least: down {abs(v):g}% in 12 months.",
                         f"সবগুলোর দাম কমেছে। সবচেয়ে কম কমেছে {bn}: 12 মাসে {abs(v):g}%।"))
        have = [b for b in ranked if b["value"] is not None]
        worst = have[-1] if len(have) > 1 else None
        if worst and worst["value"] < 0 and v >= 0:
            w_en, w_bn = _names(by, [worst])
            first = bi(first["en"] + f" {w_en} fell {abs(worst['value']):g}%.",
                       first["bn"] + f" {w_bn} কমেছে {abs(worst['value']):g}%।")
        return first
    card("move", bi("Price", "দাম"), bi("How has the price moved this year?", "এ বছর দাম কেমন বদলেছে?"), "max",
         [_bar(r["code"], r["ret_1y"], bi(signed(r["ret_1y"], 1), signed(r["ret_1y"], 1)) if r["ret_1y"] is not None
               else bi("—", "—"), None if r["ret_1y"] is not None else bi("Not a year of prices yet", "এক বছরের দাম এখনো নেই"),
               tone_of(r["ret_1y"])) for r in shares],
         move_answer,
         bi("The change in price over the last 12 months. Cash dividends and bonus shares are taken into account, so a record date doesn't show as a fall.",
            "গত 12 মাসে দামের পরিবর্তন। নগদ ডিভিডেন্ড আর বোনাস শেয়ার হিসাবে ধরা হয়েছে, তাই রেকর্ড ডেটের পরের দরপতন এখানে পতন হিসেবে আসে না।"),
         _more([bi("Price today", "আজকের দাম"), bi("Year's low", "বছরের সর্বনিম্ন"), bi("Year's high", "বছরের সর্বোচ্চ")], shares,
               lambda r: [bi(money(r["price"]), money(r["price"])), bi(money(r["lo52"]), money(r["lo52"])),
                          bi(money(r["hi52"]), money(r["hi52"]))]),
         diverge=True, glance=bi("Price rose most", "দাম সবচেয়ে বেশি বেড়েছে"))
    return out


# --------------------------------------------------------------------------- #
# Our analysis, in plain words (Premium on screen)
# --------------------------------------------------------------------------- #

def plain_words(shares: list[dict], problem_words: dict[str, tuple[str, str]]) -> Optional[dict]:
    """A few sentences on how the shares differ, built only from the figures
    and words above. Never "better buy"; never buy or sell."""
    graded = [r for r in shares if r["score"] is not None]
    if len(graded) < 2:
        return None
    en, bn = [], []
    best = max(graded, key=lambda r: r["score"])
    strong = [k for k in ("profit", "finances", "business", "dividend")
              if best["analysis"]["checks"].get(k) == "strong"]
    if strong:
        names_bn = {e: b for e, b in CHECK_NAMES.values()}
        en.append(f"{best['short']} is the strongest company here: it is strong on {join_words(strong)}.")
        bn.append(f"এখানে সবচেয়ে শক্তিশালী কোম্পানি {best['short']}। এর {join_words([names_bn[k] for k in strong], True)} শক্তিশালী।")
    else:
        en.append(f"{best['short']} has the highest grade here.")
        bn.append(f"এখানে সবচেয়ে বেশি গ্রেড {_of(best['short'])}।")

    priced = [r for r in shares if r["pe"] is not None]
    cheap = min(priced, key=lambda r: r["pe"]) if len(priced) > 1 else None
    payers = [r for r in shares if r["yield"]]
    payer = max(payers, key=lambda r: r["yield"]) if len(payers) > 1 else None
    said = {best["code"]}

    also_en, also_bn = [], []
    if cheap is best:
        also_en.append("costs the least for its profit")
        also_bn.append("মুনাফার তুলনায় দাম সবচেয়ে কম")
    if payer is best:
        also_en.append("pays the most cash")
        also_bn.append("নগদ ডিভিডেন্ড সবচেয়ে বেশি")
    if also_en:
        en.append(f"It also {join_words(also_en)}.")
        bn.append(f"এর {join_words(also_bn, True)}।")

    if cheap and cheap is not best:
        prob = next((problem_words[k] for k in cheap["problems"] if k in problem_words), None)
        if prob:
            en.append(f"{cheap['short']} costs the least for its profit, but {prob[0]}.")
            bn.append(f"মুনাফার তুলনায় সবচেয়ে কম দাম {_of(cheap['short'])}, তবে {prob[1]}।")
        else:
            en.append(f"{cheap['short']} costs the least for its profit.")
            bn.append(f"মুনাফার তুলনায় সবচেয়ে কম দাম {_of(cheap['short'])}।")
        said.add(cheap["code"])
    if payer and payer is not best and payer is not cheap:
        en.append(f"{payer['short']} pays the most cash.")
        bn.append(f"সবচেয়ে বেশি নগদ ডিভিডেন্ড দেয় {payer['short']}।")

    for r in shares:
        if r["code"] == best["code"]:
            continue
        weak = (r["analysis"].get("weak") or {})
        if weak.get("en"):
            en.append(f"{r['short']} is weak on {weak['en']}.")
            bn.append(f"{_of(r['short'])} দুর্বল দিক: {weak['bn']}।")
        elif r["loans_pct"] is not None and r["loans_pct"] >= 100 and r["code"] not in said:
            en.append(f"{r['short']} owes more than it has saved.")
            bn.append(f"{_of(r['short'])} ঋণ জমানো টাকার চেয়ে বেশি।")
        if len(en) >= 6:
            break
    return bi(" ".join(en), " ".join(bn))


# --------------------------------------------------------------------------- #
# Dates ahead
# --------------------------------------------------------------------------- #

def date_items(shares: list[dict], records: list[dict], agms: list[dict], meetings: list[dict],
               today: str, horizon: str) -> list[dict]:
    """Every record date, AGM and results meeting on these shares between
    today and ``horizon``, soonest first."""
    short = {r["code"]: r["short"] for r in shares}
    out = []
    for e in records:
        c, d = e.get("trading_code"), str(e.get("record_date") or "")[:10]
        if c not in short or not (today <= d <= horizon):
            continue
        cash = _n(e.get("cash_per_share"))
        stock = _n(e.get("stock_pct"))
        bits_en, bits_bn = [], []
        if cash:
            bits_en.append(f"{per_share(cash)} a share in cash")
            bits_bn.append(f"শেয়ারপ্রতি {per_share(cash)} নগদ")
        if stock:
            bits_en.append(f"{stock:g}% bonus shares")
            bits_bn.append(f"{stock:g}% বোনাস শেয়ার")
        line_en = (f"Owners on this day get {join_words(bits_en)}." if bits_en
                   else "Owners on this day are counted for the company's decision.")
        line_bn = (f"এদিন যাঁদের কাছে শেয়ার থাকবে, তাঁরা পাবেন {join_words(bits_bn, True)}।" if bits_bn
                   else "এদিন যাঁদের কাছে শেয়ার থাকবে, তাঁদের হিসাবে ধরা হবে।")
        buy_by = str(e.get("buy_by") or "")[:10]
        if buy_by and buy_by >= today:
            bd = day(buy_by)
            line_en += f" Last day to buy: {bd['en']}."
            line_bn += f" শেষ কেনার দিন: {bd['bn']}।"
        elif buy_by:
            line_en += " It is too late to buy for it in a normal trade."
            line_bn += " সাধারণ লেনদেনে এখন কিনে এটি আর পাওয়া যাবে না।"
        out.append({"date": d, "code": c, "kind": "record", "label": bi("Record date", "রেকর্ড ডেট"),
                    "line": bi(line_en, line_bn)})
    for e in agms:
        c, d = e.get("trading_code"), str(e.get("agm_date") or "")[:10]
        if c not in short or not (today <= d <= horizon):
            continue
        cash = _n(e.get("cash_per_share"))
        line = (bi(f"Shareholders approve the {per_share(cash)} dividend.", f"শেয়ারহোল্ডাররা {per_share(cash)} ডিভিডেন্ড অনুমোদন করবেন।")
                if cash else bi("Shareholders meet once a year.", "শেয়ারহোল্ডারদের বার্ষিক সভা।"))
        out.append({"date": d, "code": c, "kind": "agm", "label": bi("Yearly meeting (AGM)", "বার্ষিক সভা (এজিএম)"),
                    "line": line})
    for m in meetings:
        c, d = m.get("code"), str(m.get("date") or "")[:10]
        if c not in short or not (today <= d <= horizon):
            continue
        out.append({"date": d, "code": c, "kind": "results",
                    "label": bi(m.get("label_en") or "Results", m.get("label_bn") or "আর্থিক ফল"),
                    "line": bi("The board meets to approve the results.", "ফল অনুমোদনের জন্য বোর্ড সভা বসবে।")})
    seen, unique = set(), []
    for it in sorted(out, key=lambda x: (x["date"], x["code"], x["kind"])):
        k = (it["date"], it["code"], it["kind"])
        if k not in seen:
            seen.add(k)
            unique.append(it)
    return unique


def similar_codes(shares: list[dict], universe: list[dict], limit: int = SIMILAR_MAX) -> list[dict]:
    """Companies to add next: the biggest others in the first share's sector,
    then in the other chosen shares' sectors. ``universe`` = [{code, short,
    sector, mcap_cr}]."""
    chosen = {r["code"] for r in shares}
    sectors = []
    for r in shares:
        if r.get("sector") and r["sector"] not in sectors:
            sectors.append(r["sector"])
    out: list[dict] = []
    for sec in sectors:
        pool = sorted((u for u in universe if u.get("sector") == sec and u["code"] not in chosen),
                      key=lambda u: -(u.get("mcap_cr") or 0))
        for u in pool:
            if len(out) >= limit:
                return out
            if u["code"] not in {o["code"] for o in out}:
                out.append({"code": u["code"], "short": u["short"]})
    return out
