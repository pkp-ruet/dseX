"""
The stock page's analysis (2026-11-05, user: "our main goal is to present our
fundamental analysis … the whole analysis section is complicated to
understand. hard language, complex presentation, lots of hidden figures";
plan + mockup https://claude.ai/artifact/X9ipDsdsLDtoMmQPe1VkS8).

``build_analysis(inp, sections, answer)`` → the report's ``analysis`` field:
our grade and a few short sentences that sum the company up, then six parts in
ONE shape:

* profit · finances · business · dividend — the grade's own four checks, so a
  part's word IS the check's word (Strong 7+ / Weak under 4, grade_rules) and
  can never disagree with the grade (RENATA read "Growing" in one row and
  "its profit is weak" in another);
* price — the answer card's price light;
* safety — the red-flag checks.

Each part: its word, one answer (one or two short sentences), up to three
numbers shown in the open, a short list of ✓ / ! / ✕ lines (one fact each),
an optional watch line, dated callout or note, and its source. Nothing is
folded away on the page.

Pure. Built only from the report's own sections (with their private working
fields), so it never says something the sections don't. JSON shape:
``frontend/lib/stock-report.ts`` ``StockAnalysis`` — keep the two in step.
Every sentence is an {en, bn} pair in the calm-advisor voice
(docs/voice.md): the fact first, then what it means; Bengali written as people
say it, Western digits.
"""
from __future__ import annotations

import math
import re
from typing import Optional

from backend.services import grade_rules as _gr
from backend.services import stock_report as sr
from backend.services.tiers import tier_key

bi = sr.bi
_f = sr._f

PART_ORDER = ("profit", "finances", "business", "dividend", "price", "safety")
CHECK_OF = {"profit": "p1_biz", "finances": "p2_health", "business": "p3_moat", "dividend": "p5_div"}

# The parts' names and questions (the lender's finances ask about its own money).
NAMES = {
    "profit": (bi("Profit", "মুনাফা"), bi("Is it making more money?", "মুনাফা কি বাড়ছে?")),
    "finances": (bi("Finances", "আর্থিক অবস্থা"), bi("Can it handle its loans?", "ঋণ কি সামলাতে পারে?")),
    "business": (bi("Business", "ব্যবসা"), bi("How strong is it against its rivals?", "প্রতিযোগীদের তুলনায় কতটা শক্তিশালী?")),
    "dividend": (bi("Dividend", "ডিভিডেন্ড"), bi("Does it pay you, and can it keep paying?", "ডিভিডেন্ড দেয় কি, আর দিয়ে যেতে পারবে কি?")),
    "price": (bi("Price", "দাম"), bi("Is the price fair?", "দাম কি ন্যায্য?")),
    "safety": (bi("Safety", "নিরাপত্তা"), bi("Is anything wrong?", "কোনো সমস্যা আছে কি?")),
}
_LENDER_FIN_Q = bi("Does it keep enough of its own money?", "নিজের যথেষ্ট টাকা রাখে কি?")
_INSURER_FIN_Q = bi("Are its finances safe?", "আর্থিক অবস্থা কি নিরাপদ?")

# Each check as the subject of a watch line ("Its profit is close to strong").
_NOUN = {
    "p1_biz": ("Its profit", "এর মুনাফা", "is"),
    "p2_health": ("Its finances", "এর আর্থিক অবস্থা", "are"),
    "p3_moat": ("Its business", "এর ব্যবসার শক্তি", "is"),
    "p5_div": ("Its dividend record", "এর ডিভিডেন্ডের ধারা", "is"),
}

# A profit this far under its best year has "fallen"; this far over the first
# year it has "grown".
FELL_SHARE = 0.9
GREW_SHARE = 1.1
# The yearly profit change counts as up / down past this (results page band).
MOVE_PCT = sr.SAME_PROFIT_PCT
# A dividend this far under its best of the last six years "pays less than it did".
DIV_LOWER_SHARE = 0.75
# Price against its usual / similar companies: ±10% (the report's own band).
PE_BAND = sr.PE_BAND


# ---------------------------------------------------------------- helpers

def _cr(v: Optional[float]) -> Optional[dict]:
    """A crore figure for a number box: ৳2,078 cr / ৳70 lakh."""
    if v is None:
        return None
    a, sign = abs(v), "-" if v < 0 else ""
    if a < 1:
        s = f"{a * 100:,.0f}"
        return bi(f"{sign}৳{s} lakh", f"{sign}৳{s} লাখ")
    s = f"{a:,.0f}" if a >= 100 else f"{a:,.1f}"
    return bi(f"{sign}৳{s} cr", f"{sign}৳{s} কোটি")


def _cr_long(v: float) -> tuple[str, str]:
    """A crore figure inside a sentence: ৳2,078 crore."""
    a, sign = abs(v), "-" if v < 0 else ""
    if a < 1:
        s = f"{a * 100:,.0f}"
        return f"{sign}৳{s} lakh", f"{sign}৳{s} লাখ"
    s = f"{a:,.0f}" if a >= 100 else f"{a:,.1f}"
    return f"{sign}৳{s} crore", f"{sign}৳{s} কোটি"


def _signed(p: float) -> str:
    return f"{'+' if p >= 0 else '-'}{abs(p):.0f}%"


def _tk(v: float) -> str:
    """৳13 for whole taka, ৳5.50 otherwise (a dividend a share)."""
    return f"৳{v:,.0f}" if abs(v - round(v)) < 0.005 else f"৳{v:,.2f}"


def _stat(value: Optional[dict], label: dict) -> Optional[dict]:
    return {"value": value, "label": label} if value else None


def _line(tone: str, en: str, bn: str) -> dict:
    """One list line: tone good (✓) / fair (!) / bad (✕) / info (i)."""
    return {"tone": tone, "text": bi(en, bn)}


def _check_word(row: dict, check: str) -> tuple[dict, str, Optional[float]]:
    v = _gr.check_values(row).get(check)
    if v is None:
        return bi("Not measured", "মাপা যায়নি"), "neutral", None
    if v >= sr.STRONG_AT:
        return bi("Strong", "শক্তিশালী"), "good", v
    if v < sr.WEAK_BELOW:
        return bi("Weak", "দুর্বল"), "bad", v
    return bi("Fair", "মোটামুটি"), "fair", v


def _check_watch(row: dict, check: str) -> Optional[dict]:
    """The quality section's watch line, on the part whose check could move
    the company's group soon. Nothing while settling holds the group."""
    vals = _gr.check_values(row)
    if check not in vals:
        return None
    probs = sr._row_problems(row)
    tier = tier_key(_f(row.get("score")))
    if not tier or _gr.strict_group(vals, probs) != tier:
        return None
    gw = _gr.group_watch(vals, probs)
    n_en, n_bn, verb = _NOUN[check]
    for way in ("down", "up"):
        mv = gw.get(way)
        if not mv or mv["check"] != check:
            continue
        g_en, g_bn = sr.TIER_WORDS.get(mv["group"], ""), sr.TIER_WORDS_BN.get(mv["group"], "")
        if way == "down" and mv["from"] == "strong":
            return bi(f"{n_en} {verb} only just strong. A small slip would move the company down to “{g_en}”.",
                      f"{n_bn} কোনোমতে শক্তিশালী। একটু খারাপ হলেই কোম্পানিটি “{g_bn}”-এ নেমে যাবে।")
        if way == "down":
            return bi(f"{n_en} {verb} close to weak. A small slip would move the company down to “{g_en}”.",
                      f"{n_bn} দুর্বল হওয়ার কাছাকাছি। একটু খারাপ হলেই কোম্পানিটি “{g_bn}”-এ নেমে যাবে।")
        if mv["to"] == "strong":
            return bi(f"{n_en} {verb} close to strong. Getting there would move the company up to “{g_en}”.",
                      f"{n_bn} শক্তিশালী হওয়ার কাছাকাছি। সেটা হলে কোম্পানিটি “{g_bn}”-এ উঠবে।")
        return bi(f"{n_en} {verb} close to no longer being weak. Getting there would move the company up to “{g_en}”.",
                  f"{n_bn} দুর্বলতা কাটিয়ে ওঠার কাছাকাছি। সেটা হলে কোম্পানিটি “{g_bn}”-এ উঠবে।")
    return None


def _part(key: str, word: dict, tone: str, measured: bool, *, answer: dict, tile: dict,
          stats: list, checks: list, source: Optional[dict], brief: Optional[dict],
          question: Optional[dict] = None, watch: Optional[dict] = None, callout: Optional[dict] = None,
          note: Optional[dict] = None, **extra) -> dict:
    name, q = NAMES[key]
    out = {
        "key": key, "name": name, "question": question or q, "word": word, "tone": tone, "measured": measured,
        "tile": tile, "answer": answer,
        "stats": [s for s in stats if s][:3],
        "checks": [c for c in checks if c][:4],
        "watch": watch, "callout": callout, "note": note, "source": source,
        "_brief": brief,
    }
    out.update(extra)
    return out


def _join(sentences: list[Optional[dict]]) -> Optional[dict]:
    s = [x for x in sentences if x]
    if not s:
        return None
    return bi(" ".join(x["en"] for x in s), " ".join(x["bn"] for x in s))


# ---------------------------------------------------------------- 1 · profit

def _profit_years(inp: dict) -> tuple[list[tuple[int, float]], str]:
    """(year, profit) oldest first, last 6, and its unit: ৳ crore from the
    audited accounts, else profit a share from DSE's table (GP, insurers: the
    accounts we scrape carry no profit line for some companies)."""
    rows = []
    for r in sorted(inp.get("extended_financials") or [], key=lambda r: int(r.get("year") or 0)):
        try:
            y = int(r.get("year"))
        except (TypeError, ValueError):
            continue
        np_ = _f(r.get("net_profit"))
        if np_ is not None:
            rows.append((y, round(np_ / 1e7, 1)))
    if len(rows) >= 2:
        return rows[-6:], "crore"
    eps = [(r["_year"], round(sr._fin_eps(r), 2)) for r in sr._sorted_fin(inp.get("financials") or [])
           if sr._fin_eps(r) is not None]
    if len(eps) >= 2:
        return eps[-6:], "share"
    return rows[-6:], "crore"


def _money_of(v: float, unit: str) -> dict:
    """A profit figure in its unit, for a number box or a tile."""
    if unit == "share":
        s = f"{'-' if v < 0 else ''}৳{abs(v):,.2f}"
        return bi(s, s)
    return _cr(v)


def _profit_part(inp: dict, sec: dict, row: dict) -> dict:
    ty, ca, co = sec.get("this_year"), sec.get("cash"), sec.get("core")
    word, tone, _v = _check_word(row, "p1_biz")
    years, unit = _profit_years(inp)
    per_share = unit == "share"
    first = years[0] if years else None
    last = years[-1] if years else None
    peak = max(years, key=lambda y: y[1]) if years else None
    loss_last = bool(last and last[1] < 0)
    every_up = len(years) >= 3 and years[0][1] > 0 and all(b[1] > a[1] for a, b in zip(years, years[1:]))
    fell = bool(last and peak and peak[1] > 0 and last[0] != peak[0] and last[1] < peak[1] * FELL_SHARE)
    grew = bool(first and last and first[1] > 0 and last[1] > first[1] * GREW_SHARE)

    ty_loss = bool(ty and ty["word"]["en"] == "Loss")
    pct = (ty or {}).get("_pct")
    full = bool((ty or {}).get("_full_year"))
    many_times = pct is not None and pct > 400
    if pct is not None and abs(pct) > 400:
        pct = None   # a tiny year-before profit: the % says nothing
    when_en, when_bn = ("in its latest year", "সর্বশেষ বছরে") if full else ("this year so far", "এ বছর এখন পর্যন্ত")
    When_en = "In its latest year" if full else "This year so far"

    # The answer: the years, then this year.
    s1 = None
    if loss_last:
        s1 = bi(f"It made a loss in {last[0]}.", f"{last[0]} সালে কোম্পানির লোকসান হয়েছে।")
    elif every_up:
        s1 = bi(f"Profit has grown every year since {first[0]}.", f"{first[0]} সাল থেকে প্রতি বছর মুনাফা বেড়েছে।")
    elif fell:
        s1 = bi(f"Profit has fallen since {peak[0]}.", f"{peak[0]} সালের পর থেকে মুনাফা কমেছে।")
    elif grew:
        s1 = bi(f"Profit has grown since {first[0]}, though not every year.",
                f"{first[0]} সালের পর মুনাফা বেড়েছে, তবে প্রতি বছর নয়।")
    elif first and last and len(years) >= 2:
        s1 = bi(f"Profit is about where it was in {first[0]}.", f"মুনাফা {first[0]} সালের কাছাকাছিই আছে।")
    s2 = None
    if ty_loss and loss_last and full:
        s2 = None   # the years already said it
    elif ty_loss:
        s2 = (bi("It made a loss in its latest year.", "সর্বশেষ বছরে লোকসান হয়েছে।") if full
              else bi("It is making a loss this year so far.", "এ বছর এখন পর্যন্ত লোকসান হচ্ছে।"))
    elif pct is not None:
        if pct >= 100:
            s2 = bi(f"{When_en}, profit has more than doubled.", f"{when_bn} মুনাফা দ্বিগুণের বেশি হয়েছে।")
        elif pct >= MOVE_PCT:
            s2 = bi(f"{When_en}, profit is up {pct:.0f}%.", f"{when_bn} মুনাফা {pct:.0f}% বেড়েছে।")
        elif pct <= -MOVE_PCT:
            s2 = bi(f"{When_en}, profit is down {abs(pct):.0f}%.", f"{when_bn} মুনাফা {abs(pct):.0f}% কমেছে।")
        else:
            s2 = bi(f"{When_en}, profit is about the same as a year before.", f"{when_bn} মুনাফা আগের বছরের প্রায় সমান।")
    elif many_times:
        s2 = bi(f"{When_en}, profit is many times what it was a year before.", f"{when_bn} মুনাফা আগের বছরের কয়েক গুণ।")
    elif ty and ty.get("latest"):
        s2 = ty["latest"]["headline"]
    no_figures = not s1 and not s2
    answer = _join([s1, s2]) or (
        bi(f"On our checks its profit is {word['en'].lower()}, but its accounts give no yearly profit figure we can show here.",
           f"আমাদের যাচাইয়ে এর মুনাফা {word['bn']}, তবে এর হিসাবে এমন বার্ষিক মুনাফার সংখ্যা নেই যা এখানে দেখানো যায়।")
        if _v is not None else
        bi("We don't have enough of its accounts to judge its profit yet.",
           "মুনাফা বিচার করার মতো যথেষ্ট হিসাব এখনো আমাদের কাছে নেই।"))

    # The numbers.
    stats = []
    if last:
        what_en, what_bn = ("a share", "শেয়ারপ্রতি ") if per_share else ("", "")
        stats.append(_stat(_money_of(abs(last[1]), unit),
                           bi(f"loss {what_en} in {last[0]}".replace("  ", " "), f"{last[0]} সালে {what_bn}লোকসান") if last[1] < 0
                           else bi(f"profit {what_en} in {last[0]}".replace("  ", " "), f"{last[0]} সালে {what_bn}মুনাফা")))
    if fell and last[1] > 0:
        stats.append(_stat(bi(_signed((last[1] - peak[1]) / peak[1] * 100), _signed((last[1] - peak[1]) / peak[1] * 100)),
                           bi(f"since {peak[0]}", f"{peak[0]} সালের পর")))
    elif first and last and len(years) >= 3 and first[1] > 0 and last[1] > 0:
        ch = (last[1] - first[1]) / first[1] * 100
        stats.append(_stat(bi(_signed(ch), _signed(ch)), bi(f"since {first[0]}", f"{first[0]} সালের পর")))
    if pct is not None and not ty_loss:
        stats.append(_stat(bi(_signed(pct), _signed(pct)), bi(when_en, when_bn)))
    if len([s for s in stats if s]) < 3 and years:
        k = len([y for y in years if y[1] > 0])
        stats.append(_stat(bi(f"{k} of {len(years)}", f"{len(years)}টির {k}টি"),
                           bi("years with a profit", "বছর মুনাফা হয়েছে")))

    # The list: what the answer doesn't already say.
    checks = []
    qs = [q for q in (ty or {}).get("quarters") or [] if q.get("cur") is not None and q.get("prev") not in (None, 0)]
    if len(qs) >= 2 and not ty_loss:
        lower = [q for q in qs if q["cur"] < q["prev"] * 0.97]
        if not lower:
            checks.append(_line("good", "Every quarter so far beat the same months last year",
                                "এ পর্যন্ত প্রতিটি প্রান্তিক গত বছরের একই সময়ের চেয়ে ভালো"))
        elif len(lower) == 1:
            q = lower[0]
            checks.append(_line("fair", f"{q['label']['en']} was below the same months last year",
                                f"{q['label']['bn']} সময়টা গত বছরের একই সময়ের চেয়ে কম ছিল"))
        else:
            checks.append(_line("fair", f"{len(lower)} of {len(qs)} quarters were below the same months last year",
                                f"{len(qs)}টি প্রান্তিকের {len(lower)}টি গত বছরের একই সময়ের চেয়ে কম ছিল"))
    if ca and ca.get("years"):
        c = ca["years"][-1]
        r, y = c["ratio"], c["year"]
        usual = ca.get("usual")
        if ca["word"]["en"] == "No profit":
            pass
        elif r < 0:
            checks.append(_line("bad", f"More cash went out of the business than came in, in {y}",
                                f"{y} সালে ব্যবসায় যত নগদ এসেছে, তার চেয়ে বেশি বেরিয়ে গেছে"))
        elif r >= 100:
            checks.append(_line("good", f"Real cash: all of its profit came in as cash in {y}",
                                f"আসল নগদ: {y} সালে পুরো মুনাফাই নগদে এসেছে"))
        elif r >= sr.CASH_STRONG_RATIO:
            checks.append(_line("good", f"Real cash: ৳{r} of every ৳100 of profit came in as cash in {y}",
                                f"আসল নগদ: {y} সালে প্রতি ৳100 মুনাফার ৳{r} নগদে এসেছে"))
        elif usual is not None and usual >= sr.CASH_STRONG_RATIO and r < usual - 10:
            checks.append(_line("fair", f"Less cash than usual: ৳{r} of every ৳100 of profit came in as cash in {y}",
                                f"স্বাভাবিকের চেয়ে কম নগদ: {y} সালে প্রতি ৳100 মুনাফার ৳{r} নগদে এসেছে"))
        else:
            checks.append(_line("bad" if r < sr.CASH_WEAK_RATIO else "fair",
                                f"Only ৳{r} of every ৳100 of profit came in as cash in {y}",
                                f"{y} সালে প্রতি ৳100 মুনাফার মাত্র ৳{r} নগদে এসেছে"))
    if co and co.get("share") is not None:
        s = co["share"]
        if s < 0:
            checks.append(_line("bad", "Its business lost money; the profit came from other income",
                                "ব্যবসায় লোকসান হয়েছে; মুনাফা এসেছে অন্য আয় থেকে"))
        elif s >= 100:
            checks.append(_line("good", "All of its profit comes from its own business, not one-off gains",
                                "পুরো মুনাফাই আসে নিজের ব্যবসা থেকে, এককালীন লাভ থেকে নয়"))
        elif s >= sr.CORE_YES_PCT:
            checks.append(_line("good", f"৳{s:.0f} of every ৳100 of profit comes from its own business",
                                f"প্রতি ৳100 মুনাফার ৳{s:.0f} আসে নিজের ব্যবসা থেকে"))
        else:
            checks.append(_line("bad" if s < sr.CORE_MOSTLY_PCT else "fair",
                                f"Only ৳{max(1, round(s))} of every ৳100 of profit comes from its own business",
                                f"প্রতি ৳100 মুনাফার মাত্র ৳{max(1, round(s))} আসে নিজের ব্যবসা থেকে"))
        if co.get("one_off"):
            checks.append(_line("fair", "Part of the jump in profit looks like a one-off gain",
                                "মুনাফার হঠাৎ বৃদ্ধির একটি অংশ এককালীন লাভ বলে মনে হচ্ছে"))
    losses = len([y for y in years if y[1] < 0])
    if losses and not loss_last:
        checks.append(_line("fair", f"It made a loss in {losses} of the last {len(years)} years",
                            f"গত {len(years)} বছরের {losses}টিতে লোকসান হয়েছে"))

    # The summary tile and sentence.
    if loss_last or ty_loss:
        tile = bi(f"A loss in {last[0]}", f"{last[0]} সালে লোকসান") if loss_last else bi("A loss this year", "এ বছর লোকসান")
        brief = bi("It is making a loss.", "কোম্পানিটি এখন লোকসানে আছে।")
    elif fell:
        tile = bi(f"Down since {peak[0]}", f"{peak[0]} সালের পর কমেছে")
        brief = (bi(f"Its profit fell after {peak[0]}, but it is recovering this year.",
                    f"{peak[0]} সালের পর মুনাফা কমেছিল, তবে এ বছর আবার বাড়ছে।") if (pct or 0) >= sr.GROWING_PCT
                 else bi(f"Its profit has fallen since {peak[0]}.", f"{peak[0]} সালের পর থেকে মুনাফা কমেছে।"))
    else:
        tile = (bi(f"{_signed(pct)} {when_en}", f"{when_bn} {_signed(pct)}") if pct is not None
                else bi(f"Up every year since {first[0]}", f"{first[0]} সাল থেকে প্রতি বছর বেড়েছে") if every_up
                else bi(f"{_money_of(last[1], unit)['en']} in {last[0]}", f"{last[0]} সালে {_money_of(last[1], unit)['bn']}") if last
                else bi("Not enough figures", "যথেষ্ট তথ্য নেই"))
        cash_ok = bool(ca and ca.get("years") and ca["years"][-1]["ratio"] >= sr.CASH_STRONG_RATIO)
        if (every_up or grew) and (pct is None or pct > -sr.GROWING_PCT):
            brief = (bi("Its profit keeps growing and comes in as real cash.", "মুনাফা বাড়ছে, আর তা নগদেই আসছে।") if cash_ok
                     else bi("Its profit keeps growing.", "মুনাফা বাড়ছে।"))
        elif every_up or grew:
            brief = bi("Its profit grew for years, but it is down this year.", "কয়েক বছর মুনাফা বেড়েছে, তবে এ বছর কমেছে।")
        elif pct is not None and pct >= sr.GROWING_PCT:
            brief = bi("Its profit is growing this year.", "এ বছর মুনাফা বাড়ছে।")
        elif pct is not None and pct <= -sr.GROWING_PCT:
            brief = bi("Its profit is down this year.", "এ বছর মুনাফা কমেছে।")
        elif no_figures:
            brief = None
        else:
            brief = bi("Its profit is steady.", "মুনাফা মোটামুটি স্থির।")

    src = (ty or {}).get("source") or (sec.get("story") or {}).get("source")
    return _part("profit", word, tone, _v is not None, answer=answer, tile=tile, stats=stats, checks=checks,
                 source=src, brief=brief, watch=_check_watch(row, "p1_biz"),
                 series=[{"year": y, "value": v} for y, v in years], unit=unit,
                 note=(ty or {}).get("latest", {}).get("headline") if ty and ty.get("latest") else None)


# ---------------------------------------------------------------- 2 · finances

_CAT_LINES = {
    "A": ("good", "In category A, the best group on the DSE", "ডিএসইর সবচেয়ে ভালো ক্যাটাগরি A-তে আছে"),
    "B": ("fair", "In category B: small or irregular dividends", "ক্যাটাগরি B-তে: কম বা অনিয়মিত ডিভিডেন্ড"),
    "N": ("info", "In category N: newly listed", "ক্যাটাগরি N-এ: নতুন তালিকাভুক্ত"),
    "Z": ("bad", "In category Z: no dividend or yearly meeting", "ক্যাটাগরি Z-এ: ডিভিডেন্ড বা এজিএম হয়নি"),
}


def _finances_part(inp: dict, sec: dict, row: dict) -> dict:
    sa = sec.get("safety") or {}
    sc = inp.get("sector_class") or "GENERAL"
    word, tone, v = _check_word(row, "p2_health")
    cat = (inp.get("category") or row.get("market_cat") or "").strip().upper()
    cat_line = _CAT_LINES.get(cat)
    stats, checks, bars = [], [], None
    loan, res = _f(inp.get("loan_mn")), _f(inp.get("reserve_mn"))
    mcap = _f(row.get("mcap_mn"))
    meas = sa.get("measures") or {}
    question = None

    if sc not in sr._FINANCIALS and loan is not None:
        r = loan / res if (res and res > 0 and loan > 0) else None
        if loan <= 0:
            s1 = bi("It has no loans.", "কোম্পানির কোনো ঋণ নেই।")
            tile = bi("No loans", "ঋণ নেই")
        elif r is not None and r < 0.1:
            s1 = bi("It has almost no loans.", "কোম্পানির ঋণ প্রায় নেই।")
            tile = bi("Almost no loans", "ঋণ প্রায় নেই")
        elif r is not None and r < 0.5:
            s1 = bi("Its loans are small next to its savings.", "জমানো টাকার তুলনায় ঋণ কম।")
            tile = bi(f"Loans: {r * 100:.0f}% of savings", f"ঋণ: জমানো টাকার {r * 100:.0f}%")
        elif r is not None and r <= 1:
            s1 = bi("Its loans are more than half its savings.", "ঋণ জমানো টাকার অর্ধেকের বেশি।")
            tile = bi(f"Loans: {r * 100:.0f}% of savings", f"ঋণ: জমানো টাকার {r * 100:.0f}%")
        elif r is not None:
            s1 = bi("Its loans are bigger than all its savings.", "ঋণ পুরো জমানো টাকার চেয়েও বেশি।")
            tile = bi("Loans above its savings", "ঋণ জমানো টাকার চেয়ে বেশি")
        elif res is not None:
            e, b = _cr_long(loan / 10.0)
            s1 = bi(f"It owes {e}, and has no savings to set against it.", f"এর ঋণ {b}, আর এর বিপরীতে জমানো টাকা নেই।")
            tile = bi("Loans, no savings", "ঋণ আছে, জমানো টাকা নেই")
        else:
            e, b = _cr_long(loan / 10.0)
            s1 = bi(f"It owes {e}.", f"এর ঋণ {b}।")
            tile = bi(f"Loans: {_cr(loan / 10.0)['en']}", f"ঋণ: {_cr(loan / 10.0)['bn']}")
        cover = _f(meas.get("cover"))
        s2 = None
        # Interest only matters where the loans do (PADMAOIL: "almost no loans"
        # beside "profit does not cover the interest" on a tiny business profit).
        if loan > 0 and cover is not None and (r is None or r >= 0.1):
            if cover >= 3:
                s2 = bi("Its profit pays the interest easily.", "মুনাফা দিয়ে সুদ সহজেই মেটে।")
                checks.append(_line("good", "Profit pays the interest easily", "মুনাফা দিয়ে সুদ সহজেই মেটে"))
            elif cover >= 1.5:
                s2 = bi("Its profit covers the interest, but not by much.", "মুনাফা দিয়ে সুদ মেটে, তবে বাড়তি থাকে কম।")
                checks.append(_line("fair", "Profit covers the interest, but not by much", "মুনাফা দিয়ে সুদ মেটে, তবে বাড়তি থাকে কম"))
            elif cover >= 1:
                s2 = bi("Its profit barely covers the interest.", "মুনাফা দিয়ে কোনোমতে সুদ মেটে।")
                checks.append(_line("bad", "Profit barely covers the interest", "মুনাফা দিয়ে কোনোমতে সুদ মেটে"))
            else:
                s2 = bi("Its profit does not cover the interest.", "মুনাফা দিয়ে সুদও মেটে না।")
                checks.append(_line("bad", "Profit does not cover the interest", "মুনাফা দিয়ে সুদও মেটে না"))
        answer = _join([s1, s2])
        brief = s1
        if r is not None:
            t = "good" if r < 0.5 else "fair" if r <= 1 else "bad"
            checks.insert(0, _line(t, f"Loans are {r * 100:.0f}% of its savings" if r >= 0.01 else "Loans are less than 1% of its savings",
                                   f"ঋণ জমানো টাকার {r * 100:.0f}%" if r >= 0.01 else "ঋণ জমানো টাকার 1%-এর কম"))
        if loan > 0 and mcap and mcap > 0:
            m = loan / mcap
            if m > 1:
                checks.append(_line("bad", "Loans are bigger than the whole company's market value",
                                    "ঋণ কোম্পানির পুরো বাজারমূল্যের চেয়েও বেশি"))
            elif m >= 0.01:
                checks.append(_line("good" if m < 0.5 else "fair", f"Loans are {m * 100:.0f}% of its market value",
                                    f"ঋণ বাজারমূল্যের {m * 100:.0f}%"))
            else:
                checks.append(_line("good", "Loans are almost nothing next to its market value",
                                    "বাজারমূল্যের তুলনায় ঋণ প্রায় নেই"))
        stats = [_stat(_cr(loan / 10.0) if loan > 0 else bi("None", "নেই"), bi("loans", "ঋণ")),
                 _stat(_cr(res / 10.0) if res is not None else None, bi("savings (reserves)", "জমানো টাকা (রিজার্ভ)"))]
        if loan > 0 and res and res > 0:
            bars = [{"label": bi("Loans", "ঋণ"), "value": round(loan / 10.0, 1), "text": _cr(loan / 10.0),
                     "tone": "good" if (r or 0) < 0.5 else "fair" if (r or 0) <= 1 else "bad"},
                    {"label": bi("Savings it has built up", "জমানো টাকা"), "value": round(res / 10.0, 1),
                     "text": _cr(res / 10.0), "tone": "neutral"}]
    else:
        # Banks and NBFIs: the safety section's own reading (their check is the
        # capital cushion, so the two agree). Insurers and anything else
        # without a loans figure: said from the check itself — DELTALIFE read
        # "a top credit grade" under a Weak finances check.
        question = _LENDER_FIN_Q if sc in sr._LENDERS else _INSURER_FIN_Q if sc == "INSURANCE" else None
        head = sa.get("headline") if sc in sr._LENDERS else None
        if head:
            answer, brief = head, head
        else:
            answer = (bi("Its finances look safe on our checks.", "আমাদের যাচাইয়ে আর্থিক অবস্থা নিরাপদ।") if tone == "good"
                      else bi("Its finances are weak on our checks.", "আমাদের যাচাইয়ে আর্থিক অবস্থা দুর্বল।") if tone == "bad"
                      else bi("Its finances are fair on our checks.", "আমাদের যাচাইয়ে আর্থিক অবস্থা মোটামুটি।") if tone == "fair"
                      else bi("We could not read its loans from the accounts.", "হিসাব থেকে এর ঋণের তথ্য পড়া যায়নি।"))
            brief = answer if tone != "neutral" else None
        for f in sa.get("facts") or []:
            if f["label"]["en"].startswith("Its own money"):
                m = re.search(r"[\d.]+%", f["value"]["en"])
                pct = m.group(0) if m else f["value"]["en"]
                stats.append(_stat(bi(pct, pct), bi("of its assets is its own money", "সম্পদের এই অংশ নিজস্ব মূলধন")))
                checks.append(_line(f["tone"] if f["tone"] in ("good", "fair", "bad") else "info",
                                    f"Its own money is {pct} of its assets", f"নিজস্ব মূলধন সম্পদের {pct}"))
                tile = bi(f"Own money: {pct} of assets", f"নিজস্ব মূলধন: সম্পদের {pct}")
        if not stats:
            tile = word
    rating = sa.get("rating")
    if rating:
        stats.append(_stat(bi(rating["long_term"], rating["long_term"]), bi(f"credit rating ({rating['agency']})",
                                                                               f"ক্রেডিট রেটিং ({rating['agency']})")))
        if sc not in sr._LENDERS:
            rk = sr._rating_rank(rating["long_term"])
            good = rk is not None and rk <= sr._RATING_ORDER.index(sr.STRONG_RATING_LAST)
            checks.append(_line("good" if good else "info",
                                f"A rating agency grades its ability to pay its debts {rating['long_term']}",
                                f"ঋণ শোধের সামর্থ্যে একটি রেটিং এজেন্সি একে {rating['long_term']} দিয়েছে"))
    if cat_line:
        stats.append(_stat(bi(cat, cat), bi("DSE category", "ডিএসই ক্যাটাগরি")))
        checks.append(_line(cat_line[0], cat_line[1], cat_line[2]))
    return _part("finances", word, tone, v is not None, answer=answer, tile=tile, stats=stats, checks=checks,
                 source=sa.get("source"), brief=brief, question=question,
                 watch=_check_watch(row, "p2_health"), bars=bars)


# ---------------------------------------------------------------- 3 · business

def _business_part(inp: dict, sec: dict, row: dict) -> dict:
    se, st = sec.get("sector") or {}, sec.get("story") or {}
    word, tone, v = _check_word(row, "p3_moat")
    ranks = {r["label"]["en"]: r for r in se.get("ranks") or []}
    sales, marg, roe = ranks.get("Sales"), ranks.get("Profit kept from sales"), ranks.get("Profit on owners' money")
    yrs = [y for y in st.get("years") or [] if y.get("revenue_cr")]
    first, last = (yrs[0], yrs[-1]) if len(yrs) >= 2 else (None, None)

    s1 = tile = brief = None
    if sales:
        r, n = sales["rank"], sales["of"]
        if r == 1:
            a_en, a_bn = "It is the biggest company in its sector", "এটি নিজের সেক্টরের সবচেয়ে বড় কোম্পানি"
            tile = bi("Biggest in its sector", "সেক্টরে সবচেয়ে বড়")
        elif r <= 3:
            a_en, a_bn = f"It is the {sr._ordinal(r)} biggest company in its sector", f"বিক্রির হিসাবে এটি নিজের সেক্টরের {r} নম্বর বড় কোম্পানি"
            tile = bi(f"{sr._ordinal(r)} biggest in its sector", f"সেক্টরে বিক্রিতে {r} নম্বরে")
        elif r <= max(5, math.ceil(n / 4)):
            a_en, a_bn = "It is one of the bigger companies in its sector", "এটি নিজের সেক্টরের বড় কোম্পানিগুলোর একটি"
            tile = bi(f"No. {r} by sales in its sector", f"সেক্টরে বিক্রিতে {r} নম্বরে")
        elif r <= math.ceil(n / 2):
            a_en, a_bn = "It is a mid-sized company in its sector", "এটি নিজের সেক্টরে মাঝারি আকারের কোম্পানি"
            tile = bi("Mid-sized in its sector", "সেক্টরে মাঝারি আকারের")
        else:
            a_en, a_bn = "It is one of the smaller companies in its sector", "এটি নিজের সেক্টরের ছোট কোম্পানিগুলোর একটি"
            tile = bi("Smaller in its sector", "সেক্টরে ছোট")
        brief = bi(f"{a_en}.", f"{a_bn}।")
        if marg:
            mr, mn = marg["rank"], marg["of"]
            if mr == 1:
                t_en, t_bn = ", and it keeps more of each sale as profit than any of them.", "প্রতিটি বিক্রি থেকে অন্য সবার চেয়ে বেশি মুনাফা রাখে।"
            elif mr <= math.ceil(mn / 2):
                t_en, t_bn = ", and it keeps more of each sale as profit than most of them.", "প্রতিটি বিক্রি থেকে বেশির ভাগ কোম্পানির চেয়ে বেশি মুনাফা রাখে।"
            else:
                t_en, t_bn = ", but it keeps less of each sale as profit than most of them.", "তবে প্রতিটি বিক্রি থেকে বেশির ভাগ কোম্পানির চেয়ে কম মুনাফা রাখে।"
            s1 = bi(a_en + t_en, f"{a_bn}। {t_bn}")
        else:
            s1 = brief
    elif roe:
        val = roe["value"]
        more = roe["rank"] <= math.ceil(roe["of"] / 2)
        s1 = bi(f"It earns {val['en']} a year on its owners' money, " + ("more than most in its sector." if more else "less than most in its sector."),
                f"নিজস্ব মূলধনে বছরে {val['bn']} মুনাফা করে, যা " + ("সেক্টরের বেশির ভাগের চেয়ে বেশি।" if more else "সেক্টরের বেশির ভাগের চেয়ে কম।"))
        tile = bi(f"Earns {val['en']} on owners' money", f"নিজস্ব মূলধনে {val['bn']} মুনাফা")
        brief = s1
    elif st.get("headline"):
        s1 = st["headline"]
        tile = st.get("word") or word
        brief = s1
    answer = s1 or bi("We could not compare it with the other companies in its sector.",
                      "নিজের সেক্টরের অন্য কোম্পানির সঙ্গে এর তুলনা করা যায়নি।")
    tile = tile or word

    stats, checks = [], []
    if sales:
        stats.append(_stat(bi(f"No. {sales['rank']}", f"{sales['rank']} নম্বর"),
                           bi(f"by sales, of {sales['of']} in its sector", f"বিক্রিতে, সেক্টরের {sales['of']}টির মধ্যে")))
    m1 = last.get("margin_pct") if last else None
    if m1 is not None and not (0 < m1 <= 100):
        m1 = None   # PADMAOIL: a sales line smaller than its profit (commission income)
    if m1 is not None:
        stats.append(_stat(bi(f"৳{m1:.0f}", f"৳{m1:.0f}"), bi("profit from every ৳100 of sales", "প্রতি ৳100 বিক্রিতে মুনাফা")))
    if first and last and first["revenue_cr"] > 0:
        ch = (last["revenue_cr"] - first["revenue_cr"]) / first["revenue_cr"] * 100
        stats.append(_stat(bi(_signed(ch), _signed(ch)), bi(f"sales since {first['year']}", f"{first['year']} সালের পর বিক্রি")))
        if ch >= 10:
            checks.append(_line("good", f"Sales grew {ch:.0f}% since {first['year']}", f"{first['year']} সালের পর বিক্রি {ch:.0f}% বেড়েছে"))
        elif ch <= -5:
            checks.append(_line("bad", f"Sales fell {abs(ch):.0f}% since {first['year']}", f"{first['year']} সালের পর বিক্রি {abs(ch):.0f}% কমেছে"))
        else:
            checks.append(_line("info", f"Sales are about where they were in {first['year']}", f"বিক্রি {first['year']} সালের কাছাকাছি"))
        m0 = first.get("margin_pct")
        if m0 is not None and m1 is not None and 0 < m0 <= 100:
            if m1 > m0 + 0.5:
                checks.append(_line("good", f"Keeps more of each sale as profit than in {first['year']}: ৳{m1:.0f} of ৳100, up from ৳{m0:.0f}",
                                    f"{first['year']} সালের চেয়ে প্রতিটি বিক্রি থেকে বেশি মুনাফা থাকে: ৳100-এ ৳{m1:.0f}, আগে ছিল ৳{m0:.0f}"))
            elif m1 < m0 - 0.5:
                checks.append(_line("fair", f"Keeps less of each sale as profit: ৳{m1:.0f} of ৳100, down from ৳{m0:.0f} in {first['year']}",
                                    f"প্রতিটি বিক্রি থেকে কম মুনাফা থাকে: ৳100-এ ৳{m1:.0f}, {first['year']} সালে ছিল ৳{m0:.0f}"))
    if roe:
        try:
            rv = float(roe["value"]["en"].rstrip("%"))
        except ValueError:
            rv = None
        if rv is not None:
            t = "good" if rv >= 15 else "info" if rv >= 8 else "fair"
            checks.append(_line(t, f"Earns {rv:.1f}% a year on its owners' money", f"নিজস্ব মূলধনে বছরে {rv:.1f}% মুনাফা করে"))
            if not sales:
                stats.insert(0, _stat(bi(f"{rv:.1f}%", f"{rv:.1f}%"), bi("a year on owners' money", "নিজস্ব মূলধনে বছরে মুনাফা")))
    show = []
    for lab, en, bn_ in (("Sales", "Sales", "বিক্রি"), ("Profit kept from sales", "Profit from each sale", "প্রতিটি বিক্রিতে মুনাফা"),
                         ("Profit on owners' money", "Profit on owners' money", "নিজস্ব মূলধনে মুনাফা"),
                         ("Profit growth", "Profit growth", "মুনাফা বৃদ্ধি")):
        rk = ranks.get(lab)
        if rk and len(show) < 3:
            show.append({"label": bi(en, bn_), "rank": rk["rank"], "of": rk["of"], "value": rk["value"]})
    return _part("business", word, tone, v is not None, answer=answer, tile=tile, stats=stats, checks=checks,
                 source=se.get("source") or st.get("source"), brief=brief, watch=_check_watch(row, "p3_moat"),
                 ranks=show or None, sector=se.get("sector"), peers=se.get("peers"))


# ---------------------------------------------------------------- 4 · dividend

def _bonus_years(inp: dict, after: int) -> int:
    """How many years after ``after`` it gave bonus shares (DSE company page)."""
    n = 0
    for pair in (inp.get("company") or {}).get("stock_dividends") or []:
        try:
            y, pct = int(pair[0]), _f(pair[1])
        except (TypeError, ValueError, IndexError):
            continue
        if y > after and pct and pct > 0:
            n += 1
    return n


def _dividend_part(inp: dict, sec: dict, row: dict) -> dict:
    dv = sec.get("dividend") or {}
    word, tone, v = _check_word(row, "p5_div")
    hist = dv.get("history") or []
    vals = [h["cash_ps"] for h in hist]
    n, k = len(vals), len([x for x in vals if x > 0])
    cur, cur_y = dv.get("_cur"), dv.get("year")
    yld = dv.get("year_yield_pct")
    streak = 0
    for i in range(len(vals) - 1, 0, -1):
        if vals[i] > 0 and vals[i] > vals[i - 1] * 1.02 and vals[i - 1] > 0:
            streak += 1
        else:
            break
    recent = [(h["year"], h["cash_ps"]) for h in hist[-6:] if h["cash_ps"] > 0]
    best = max(recent, key=lambda t: t[1]) if recent else None
    lower = bool(cur and best and best[0] != cur_y and cur < best[1] * DIV_LOWER_SHARE)

    stats, checks = [], []
    if not cur:
        bonus_only = (dv.get("word") or {}).get("en") == "Bonus only"
        s1 = (bi("It gave bonus shares, not cash, for its latest year.", "সর্বশেষ বছরের জন্য নগদ নয়, বোনাস শেয়ার দিয়েছে।") if bonus_only
              else bi("It paid no cash dividend for its latest year.", "সর্বশেষ বছরের জন্য কোনো নগদ ডিভিডেন্ড দেয়নি।"))
        s2 = (bi(f"It paid cash in {k} of the last {n} years.", f"গত {n} বছরের {k}টিতে নগদ দিয়েছে।") if n and k else None)
        tile = bi("Bonus shares only", "শুধু বোনাস শেয়ার") if bonus_only else bi("No cash this year", "এ বছর নগদ নেই")
        brief = bi("It pays no regular cash dividend.", "নিয়মিত নগদ ডিভিডেন্ড দেয় না।")
    else:
        if n >= 3 and k == n and streak >= 3:
            s1 = bi(f"It pays cash every year, and has raised it {streak} years in a row.",
                    f"প্রতি বছর নগদ ডিভিডেন্ড দেয়, আর টানা {streak} বছর তা বাড়িয়েছে।")
            tile = bi(f"Raised {streak} years in a row", f"টানা {streak} বছর বেড়েছে")
            brief = bi(f"It has raised its cash dividend {streak} years in a row.", f"টানা {streak} বছর নগদ ডিভিডেন্ড বাড়িয়েছে।")
        elif n >= 3 and k == n:
            s1 = bi(f"It has paid cash every year for {n} years.", f"টানা {n} বছর প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে।")
            tile = bi(f"Paid every year for {n} years", f"{n} বছর ধরে প্রতি বছর দিয়েছে")
            brief = bi("It pays a cash dividend every year.", "প্রতি বছর নগদ ডিভিডেন্ড দেয়।")
        else:
            s1 = bi(f"It paid cash in {k} of the last {n} years.", f"গত {n} বছরের {k}টিতে নগদ ডিভিডেন্ড দিয়েছে।")
            tile = bi(f"Paid in {k} of {n} years", f"{n} বছরের {k}টিতে দিয়েছে")
            brief = bi(f"It paid a cash dividend in {k} of the last {n} years.", f"গত {n} বছরের {k}টিতে নগদ ডিভিডেন্ড দিয়েছে।")
        s2 = (bi(f"But it pays less a share than it did in {best[0]}.", f"তবে {best[0]} সালের চেয়ে এখন শেয়ারপ্রতি কম দেয়।")
              if lower else None)
        stats = [_stat(bi(_tk(cur), _tk(cur)), bi(f"a share for {cur_y}", f"{cur_y} সালের জন্য শেয়ারপ্রতি")),
                 _stat(bi(f"{yld:.1f}%", f"{yld:.1f}%"), bi("a year on today's price", "আজকের দামে বছরে")) if yld else None]
    if n:
        stats.append(_stat(bi(f"{k} of {n}", f"{n}টির {k}টি"), bi("years it paid cash", "বছর নগদ দিয়েছে")))
    answer = _join([s1, s2])

    sf = dv.get("safety")
    if sf and cur:
        t = {"safe": "good", "watch": "fair", "risk": "bad"}.get(sf["level"], "info")
        checks.append(_line(t, f"{sf['word']['en']}: {sr._lc(sf['line_en'])}", f"{sf['word']['bn']}: {sf['line_bn']}"))
    if lower:
        checks.append(_line("fair", f"{_tk(cur)} a share, down from {_tk(best[1])} in {best[0]}",
                            f"শেয়ারপ্রতি {_tk(cur)}, {best[0]} সালে ছিল {_tk(best[1])}"))
        nb = _bonus_years(inp, best[0])
        if nb:
            checks.append(_line("info", f"It also gave bonus shares in {nb} of those years, so the cash is spread over more shares",
                                f"এর মধ্যে {nb} বছর বোনাস শেয়ারও দিয়েছে, তাই নগদ টাকা বেশি শেয়ারে ভাগ হয়েছে"))
    o10 = dv.get("on_10k")
    if o10 and cur:
        checks.append(_line("info", f"৳10,000 put in today brings about {sr.money(o10['net'])} a year, after tax",
                            f"আজ ৳10,000 রাখলে কর বাদে বছরে প্রায় {sr.money(o10['net'])} আসবে"))
    callout = dv.get("watch") if (dv.get("latest") or {}).get("upcoming") else None
    return _part("dividend", word, tone, v is not None, answer=answer or bi("It has not paid a cash dividend in the years we can check.",
                                                                           "যে বছরগুলোর হিসাব আছে, তাতে নগদ ডিভিডেন্ড দেয়নি।"),
                 tile=tile if dv else bi("No dividend record", "ডিভিডেন্ডের রেকর্ড নেই"),
                 stats=stats, checks=checks, source=dv.get("source"),
                 brief=brief if dv else bi("It pays no regular cash dividend.", "নিয়মিত নগদ ডিভিডেন্ড দেয় না।"),
                 watch=_check_watch(row, "p5_div"), callout=callout,
                 series=[{"year": h["year"], "value": h["cash_ps"]} for h in hist])


# ---------------------------------------------------------------- 5 · price

def _price_part(inp: dict, sec: dict, row: dict, answer: dict) -> Optional[dict]:
    pr = sec.get("price")
    if not pr:
        return None
    light = next((l for l in (answer or {}).get("lights") or [] if l["key"] == "price"), None)
    word, tone = (light["word"], light["tone"]) if light else (pr["word"], pr["tone"])
    verdict = pr.get("_verdict")
    near = bool(light and light["word"]["en"].startswith("Near"))
    ltp = _f(pr.get("today"))
    fair = pr.get("fair")
    pe = pr.get("pe") or {}
    now, usual, similar = _f(pe.get("now")), _f(pe.get("usual")), _f(pe.get("sector"))
    # The price section's buy-below: capped at the near-the-top line, and
    # cleared when the answer gives no buy price (build_report).
    buy = _f(pr.get("buy_below"))

    if fair:
        rng = bi(f" We think it is worth {sr.money(fair['low'])} to {sr.money(fair['high'])}.",
                 f" আমাদের হিসাবে এর ন্যায্য দাম {sr.money(fair['low'])} থেকে {sr.money(fair['high'])}।")
    else:
        rng = bi("", "")
    if verdict == "unjudged":
        s1 = bi("It made a loss in its latest results, so there is no profit to judge the price against.",
                "সর্বশেষ ফলে লোকসান হয়েছে, তাই মুনাফার তুলনায় দাম বিচার করার উপায় নেই।")
        brief = bi("It made a loss, so we can't judge its price.", "লোকসান হয়েছে, তাই এর দাম বিচার করা যায় না।")
    elif verdict == "cheap":
        s1 = bi("Low for what it earns and owns." + rng["en"], "আয় আর সম্পদের তুলনায় দাম কম।" + rng["bn"])
        brief = bi("Today the price is low for what it earns.", "আয়ের তুলনায় আজকের দাম কম।")
    elif verdict == "fair":
        s1 = bi("About right for what it earns and owns." + rng["en"], "আয় আর সম্পদের তুলনায় দাম মোটামুটি ঠিক আছে।" + rng["bn"])
        brief = bi("The price is about right for what it earns.", "আয়ের তুলনায় দাম মোটামুটি ঠিক আছে।")
    elif verdict == "expensive":
        s1 = bi("High for what it earns and owns." + rng["en"], "আয় আর সম্পদের তুলনায় দাম বেশি।" + rng["bn"])
        brief = bi("The price is high for what it earns.", "আয়ের তুলনায় দাম বেশি।")
    else:
        s1 = bi("We have not judged its price yet.", "এর দাম আমরা এখনো বিচার করিনি।")
        brief = None
    s2 = None
    if near:
        s2 = bi("It is also close to its highest price this year.", "দাম এ বছরের সর্বোচ্চের কাছাকাছিও আছে।")
        brief = bi(((brief or bi("", ""))["en"] + " It is close to its highest price this year.").strip(),
                   ((brief or bi("", ""))["bn"] + " দাম এ বছরের সর্বোচ্চের কাছাকাছি।").strip())
    elif not fair and now and verdict != "unjudged":
        s2 = (bi(f"You pay {now:.0f} years of its profit; it usually costs {usual:.0f}.",
                 f"আজকের দামে এর {now:.0f} বছরের মুনাফার সমান দাম দিচ্ছেন; সাধারণত লাগে {usual:.0f} বছরের।") if usual
              else bi(f"You pay {now:.0f} years of its profit.", f"আজকের দামে এর {now:.0f} বছরের মুনাফার সমান দাম দিচ্ছেন।"))
    ans = _join([s1, s2])

    stats = [_stat(bi(sr.money(ltp), sr.money(ltp)), bi("today", "আজ")) if ltp else None]
    if fair:
        stats.append(_stat(bi(f"{sr.money(fair['low'])} to {sr.money(fair['high'])}", f"{sr.money(fair['low'])} থেকে {sr.money(fair['high'])}"),
                           bi("our fair price", "আমাদের হিসাবে ন্যায্য দাম")))
    elif now:
        stats.append(_stat(bi(f"{now:.0f} years", f"{now:.0f} বছর"), bi("of its profit you pay", "এর মুনাফার সমান দাম দিচ্ছেন")))
    if buy:
        stats.append(_stat(bi(sr.money(buy), sr.money(buy)), bi("we would buy under", "এর নিচে আমরা কিনতাম")))
    elif usual and not fair:
        stats.append(_stat(bi(f"{usual:.0f} years", f"{usual:.0f} বছর"), bi("what it usually costs", "সাধারণত যত লাগে")))
    elif now and fair:
        stats.append(_stat(bi(f"{now:.0f} years", f"{now:.0f} বছর"), bi("of its profit you pay", "এর মুনাফার সমান দাম দিচ্ছেন")))

    checks = []
    if verdict == "unjudged":
        checks.append(_line("bad", "It made a loss in its latest results", "সর্বশেষ ফলে লোকসান হয়েছে"))
    if now and usual:
        if now < usual * (1 - PE_BAND):
            checks.append(_line("good", f"Cheaper than it usually is: {now:.0f} years of profit, usually {usual:.0f}",
                                f"সাধারণত যত থাকে তার চেয়ে সস্তা: {now:.0f} বছরের মুনাফা, সাধারণত {usual:.0f}"))
        elif now > usual * (1 + PE_BAND):
            checks.append(_line("fair", f"Dearer than it usually is: {now:.0f} years of profit, usually {usual:.0f}",
                                f"সাধারণত যত থাকে তার চেয়ে দামি: {now:.0f} বছরের মুনাফা, সাধারণত {usual:.0f}"))
        else:
            checks.append(_line("info", "About what it usually costs", "সাধারণত যে দামে থাকে, তার কাছাকাছি"))
    if now and similar:
        if now < similar * (1 - PE_BAND):
            checks.append(_line("good", f"Cheaper than similar companies ({similar:.0f} years of profit)",
                                f"একই ধরনের কোম্পানির চেয়ে সস্তা (ওদের {similar:.0f} বছরের মুনাফা)"))
        elif now > similar * (1 + PE_BAND):
            checks.append(_line("fair", f"Dearer than similar companies ({similar:.0f} years of profit)",
                                f"একই ধরনের কোম্পানির চেয়ে দামি (ওদের {similar:.0f} বছরের মুনাফা)"))
        else:
            checks.append(_line("info", "About what similar companies cost", "একই ধরনের কোম্পানির দামের কাছাকাছি"))
    pf = pr.get("profit_fall")
    if pf and ltp and fair:
        if pf["center"] > ltp:
            checks.append(_line("good", "Even if profit fell by a fifth, it would still be under our fair price",
                                "মুনাফা এক-পঞ্চমাংশ কমলেও দাম আমাদের ন্যায্য দামের নিচে থাকত"))
        else:
            checks.append(_line("info", f"If profit fell by a fifth, our fair price would drop to {sr.money(pf['center'])}",
                                f"মুনাফা এক-পঞ্চমাংশ কমলে আমাদের ন্যায্য দাম নেমে আসত {sr.money(pf['center'])}-এ"))
    p1 = _gr.check_values(row).get("p1_biz")
    if verdict in ("cheap", "fair") and p1 is not None and p1 < sr.WEAK_BELOW:
        checks.append(_line("fair", "Part of why it looks cheap: its profit has been weak",
                            "সস্তা দেখানোর একটি কারণ: মুনাফা দুর্বল"))
    if near:
        checks.append(_line("fair", "Close to its highest price this year", "দাম এ বছরের সর্বোচ্চের কাছাকাছি"))

    note = None
    if not fair and verdict not in (None, "unjudged") and (inp.get("fair_value") or {}).get("center"):
        note = bi("We give a fair price only when our ways of working it out agree. For this share they don't, so we leave it out.",
                  "ন্যায্য দাম বের করার আমাদের উপায়গুলো একমত হলে তবেই আমরা দাম বলি। এই শেয়ারে তারা একমত নয়, তাই ন্যায্য দাম দিইনি।")
    if fair:
        tile = bi(f"Worth {sr.money(fair['low'])} to {sr.money(fair['high'])}", f"ন্যায্য দাম {sr.money(fair['low'])}–{sr.money(fair['high'])}")
    elif verdict == "unjudged":
        tile = bi("Made a loss", "লোকসান হয়েছে")
    elif now:
        tile = bi(f"{now:.0f} years of profit", f"{now:.0f} বছরের মুনাফা")
    else:
        tile = word
    return _part("price", word, tone, True, answer=ans, tile=tile, stats=stats, checks=checks,
                 source=pr.get("source"), brief=brief, note=note)


# ---------------------------------------------------------------- 6 · safety

def _safety_part(sec: dict) -> Optional[dict]:
    rf = sec.get("red_flags")
    if not rf:
        return None
    c = rf["counts"]
    n, red, amber, passed = c["checks"], c["red"], c["amber"], c["pass"]
    reds = [x for x in rf["checks"] if x["level"] == "red"]
    if red:
        word, tone = bi(f"{red} serious", f"{red}টি গুরুতর"), "bad"
        d = reds[0]["detail"]
        # The answer stays short; each problem is named in full right under it.
        answer = (bi("Yes, one serious problem. It is named below with the notice behind it.",
                     "হ্যাঁ, একটি গুরুতর সমস্যা আছে। নিচে নোটিশসহ তা দেখানো হলো।") if red == 1
                  else bi(f"Yes, {red} serious problems. Each is named below with the notice behind it.",
                          f"হ্যাঁ, {red}টি গুরুতর সমস্যা আছে। নিচে নোটিশসহ প্রতিটি দেখানো হলো।"))
        tile = bi(f"{red} serious {'problem' if red == 1 else 'problems'}", f"{red}টি গুরুতর সমস্যা")
        brief = (bi(f"One serious problem: {sr._lc(d['en'])}", f"একটি গুরুতর সমস্যা: {d['bn']}") if red == 1
                 else bi(f"We found {red} serious problems. The biggest: {sr._lc(d['en'])}",
                         f"{red}টি গুরুতর সমস্যা পেয়েছি। সবচেয়ে বড়টি: {d['bn']}"))
    elif amber:
        word, tone = bi(f"{amber} to check", f"দেখার মতো {amber}টি"), "fair"
        one = amber == 1
        answer = bi("Nothing serious, but " + ("one smaller thing is" if one else f"{amber} smaller things are") + " worth a look.",
                    "গুরুতর কিছু নেই, তবে " + ("একটি ছোট বিষয়" if one else f"{amber}টি ছোট বিষয়") + " দেখে নেওয়া ভালো।")
        tile = bi(f"{passed} of {n} checks passed", f"{n}টির {passed}টি যাচাই ঠিক")
        brief = bi("Nothing serious is wrong, but " + ("one smaller thing is" if one else f"{amber} smaller things are") + " worth a look.",
                   "গুরুতর কোনো সমস্যা নেই, তবে " + ("একটি ছোট বিষয়" if one else f"{amber}টি ছোট বিষয়") + " দেখে নেওয়া ভালো।")
    else:
        word, tone = bi("All passed", "সব ঠিক আছে"), "good"
        answer = bi(f"Nothing wrong. All {n} of our checks passed.", f"কোনো সমস্যা নেই। আমাদের {n}টি যাচাইয়ের সবগুলোই ঠিক আছে।")
        tile = bi(f"All {n} checks passed", f"{n}টি যাচাইয়ের সবই ঠিক")
        brief = None
    stats = [_stat(bi(str(n), str(n)), bi("checks we ran", "যাচাই করেছি")),
             _stat(bi(str(red), str(red)), bi("serious", "গুরুতর")),
             _stat(bi(str(amber), str(amber)), bi("smaller things", "ছোট বিষয়"))]
    return _part("safety", word, tone, True, answer=answer, tile=tile, stats=stats, checks=[],
                 source=rf.get("source"), brief=brief)


# ---------------------------------------------------------------- the whole analysis

def _standing(rank: Optional[int], total: Optional[int]) -> Optional[dict]:
    """Where it stands on the DSE, in words (the quality section's bands)."""
    if not rank or not total:
        return None
    share = rank / total
    if rank == 1:
        return bi("The strongest company on the DSE", "ডিএসইর সবচেয়ে শক্তিশালী কোম্পানি")
    if rank <= 10:
        return bi("One of the 10 strongest companies on the DSE", "ডিএসইর সবচেয়ে শক্তিশালী 10টি কোম্পানির একটি")
    if share <= 0.25:
        return bi("Stronger than most companies on the DSE", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে শক্তিশালী")
    if share <= 0.5:
        return bi("Stronger than about half the companies on the DSE", "ডিএসইর প্রায় অর্ধেক কোম্পানির চেয়ে শক্তিশালী")
    if share <= 0.9:
        return bi("Weaker than most companies on the DSE", "ডিএসইর বেশির ভাগ কোম্পানির চেয়ে দুর্বল")
    return bi("One of the weakest companies on the DSE", "ডিএসইর সবচেয়ে দুর্বল কোম্পানিগুলোর একটি")


def build_analysis(inp: dict, sections: dict, answer: Optional[dict]) -> Optional[dict]:
    """The analysis block (see the module note). ``sections`` still carries
    the sections' private working fields. None for a share we can't grade."""
    row = inp.get("score_row") or {}
    ql = sections.get("quality")
    if not ql:
        return None
    parts = {
        "profit": _profit_part(inp, sections, row),
        "finances": _finances_part(inp, sections, row),
        "business": _business_part(inp, sections, row),
        "dividend": _dividend_part(inp, sections, row),
        "price": _price_part(inp, sections, row, answer or {}),
        "safety": _safety_part(sections),
    }

    # The summary: profit, then the strongest and the weakest of the other
    # three checks (both, when all three are strong: finances + dividend),
    # then the price, then anything wrong.
    vals = _gr.check_values(row)
    others = [k for k in ("finances", "business", "dividend") if CHECK_OF[k] in vals and parts[k]["_brief"]]
    strong = [k for k in others if vals[CHECK_OF[k]] >= sr.STRONG_AT]
    sentences = [parts["profit"]["_brief"]]
    if others and len(strong) == len(others):
        sentences += [parts[k]["_brief"] for k in ("finances", "dividend") if k in others]
    else:
        if strong:
            sentences.append(parts[max(strong, key=lambda k: vals[CHECK_OF[k]])]["_brief"])
        rest = [k for k in others if k not in strong]
        if rest:
            sentences.append(parts[min(rest, key=lambda k: vals[CHECK_OF[k]])]["_brief"])
    if parts["price"]:
        sentences.append(parts["price"]["_brief"])
    if parts["safety"] and parts["safety"]["_brief"]:
        if len([s for s in sentences if s]) >= 4:
            sentences.pop(1)
        sentences.append(parts["safety"]["_brief"])
    summary = _join(sentences)

    rank, total = ql.get("rank"), ql.get("total")
    grade = {
        "word": ql["word"], "tone": ql["tone"],
        "score": round(ql["score"]) if ql.get("score") is not None else None,
        "rank": rank, "total": total,
        "line": _standing(rank, total),
        "checks": sr.checks_line(row),
    }
    out_parts = []
    for k in PART_ORDER:
        p = parts.get(k)
        if p:
            out_parts.append({kk: vv for kk, vv in p.items() if not kk.startswith("_")})
    return {"grade": grade, "summary": summary, "parts": out_parts}
