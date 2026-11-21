"""
Buy / Sell split (2026-11-22, user: "a buy, sell percentage calculation in
stock page … buy 90 sell 10, buy 60 sell 40"; decisions: our analysis weighed,
always agrees with our answer, Premium only, the words Buy / Sell for every
reader).

``build_split(inp, sections, answer, analysis)`` → the report's ``split``
field: how our analysis weighs today, as "Buy 75 · Sell 25".

1. **Weigh.** The six parts of the analysis each lean a share of their weight
   towards buying (0 = all against, 1 = all for):

   * the company, 50 in all — profit, finances, business strength and the
     dividend record, split as the grade splits them (``GRADE_WEIGHTS``: 30 /
     20 / 20 / 15 over the checks this company has), each its own 0-10 check
     value over 10;
   * the price, 30 — the price score (``p4_val``) over 10; near its yearly
     top counts at most ``NEAR_TOP_SHARE``; a price that holds the answer at
     "Not yet" at most ``PRICE_BLOCK_SHARE``; a loss in the latest results
     (no profit to judge the price on) counts 0;
   * safety, 20 — nothing found = 1; each smaller thing takes
     ``AMBER_STEP`` off (never under ``AMBER_FLOOR``); one serious problem =
     ``ONE_RED_SHARE``, two or more = 0; a risk that blocks the Buy (category
     Z, old accounts, thin trading, heavy loans, profit fell, a red flag) =
     at most ``BLOCKED_SHARE``.

2. **Keep it in line with our answer.** The weighed share is placed inside
   its answer's band (``BANDS``), in steps of 5, so the split can never
   disagree with the answer card: a Buy always reads Buy 70 or more, an
   Avoid always Buy 25 or less. A strong company held back by one serious
   problem therefore reads "Not yet" with Buy 45-65, never Buy 80.

Never a chance of a gain: the page says what it weighs. Pure; JSON shape
``frontend/lib/stock-report.ts`` ``BuySellSplit`` — keep the two in step.
"""
from __future__ import annotations

from typing import Optional

from backend.services import grade_rules as _gr
from backend.services import stock_report as sr

bi = sr.bi
_f = sr._f

# Each side's weight out of 100.
COMPANY_WEIGHT = 50.0
PRICE_WEIGHT = 30.0
SAFETY_WEIGHT = 20.0
# The company's four checks, split as the grade splits them (scoring_service.GRADE_WEIGHTS).
CHECK_WEIGHTS = {"p1_biz": 0.30, "p2_health": 0.20, "p3_moat": 0.20, "p5_div": 0.15}
PART_OF = {"p1_biz": "profit", "p2_health": "finances", "p3_moat": "business", "p5_div": "dividend"}

NEAR_TOP_SHARE = 0.3      # near its yearly top: the price leans this much for at most
AMBER_STEP = 0.15         # each smaller thing to check
AMBER_FLOOR = 0.4
ONE_RED_SHARE = 0.1       # one serious problem
BLOCKED_SHARE = 0.1       # a risk that blocks the Buy
PRICE_BLOCK_SHARE = 0.5   # the price that blocks the Buy: even at most

# Our answer's band for "Buy N" (lowest, highest), in steps of 5. The bands
# never overlap, so the number alone tells the answer apart.
BANDS = {
    "buy": (70, 95),
    "wait": (45, 65),
    "no_reason": (30, 40),
    "avoid": (5, 25),
}
STEP = 5
# A part leans for buying from this share, against it up to that one.
FOR_FROM = 0.6
AGAINST_TO = 0.4


def _clip(v: float) -> float:
    return max(0.0, min(1.0, v))


def weigh(row: dict, *, verdict: Optional[str], near_top: bool, red: int, amber: int,
          blocked: bool, price_blocks: bool = False) -> list[dict]:
    """The parts with their weight (out of 100) and how far each leans for
    buying (0-1). Pure; `verdict` is the price section's ("cheap" / "fair" /
    "expensive" / "unjudged")."""
    out: list[dict] = []
    vals = _gr.check_values(row)
    total_w = sum(CHECK_WEIGHTS[k] for k in vals) or 0.0
    for k, v in vals.items():
        out.append({"key": PART_OF[k], "weight": COMPANY_WEIGHT * CHECK_WEIGHTS[k] / total_w,
                    "share": _clip(v / 10.0)})

    p4 = _f(row.get("p4_val"))
    if verdict == "unjudged":
        price = 0.0
    elif p4 is None:
        price = 0.5
    else:
        price = _clip(p4 / 10.0)
    if near_top:
        price = min(price, NEAR_TOP_SHARE)
    if price_blocks:
        # "Not yet" because of the price: it can't lean for buying.
        price = min(price, PRICE_BLOCK_SHARE)
    out.append({"key": "price", "weight": PRICE_WEIGHT, "share": price})

    if red >= 2:
        safe = 0.0
    elif red == 1:
        safe = ONE_RED_SHARE
    else:
        safe = max(AMBER_FLOOR, 1.0 - AMBER_STEP * amber) if amber else 1.0
    if blocked:
        safe = min(safe, BLOCKED_SHARE)
    out.append({"key": "safety", "weight": SAFETY_WEIGHT, "share": safe})
    return out


def lean_pct(parts: list[dict]) -> float:
    """The weighed share for buying, 0-100."""
    w = sum(p["weight"] for p in parts)
    return 100.0 * sum(p["weight"] * p["share"] for p in parts) / w if w else 50.0


def in_band(raw: float, decision: str) -> Optional[int]:
    """The weighed share placed inside the answer's band, in steps of 5."""
    band = BANDS.get(decision)
    if not band:
        return None
    lo, hi = band
    steps = (hi - lo) // STEP
    return int(lo + STEP * round(_clip(raw / 100.0) * steps))


def _names(keys: list[str], names: dict) -> tuple[str, str]:
    en = [names[k]["en"].lower() for k in keys]
    bn = [names[k]["bn"] for k in keys]
    if len(en) == 1:
        return en[0], bn[0]
    return ", ".join(en[:-1]) + " and " + en[-1], ", ".join(bn[:-1]) + " আর " + bn[-1]


# Each part named inside a sentence ("its profit and its price").
_IN_LINE = {
    "profit": bi("Profit", "মুনাফা"),
    "finances": bi("Finances", "আর্থিক অবস্থা"),
    "business": bi("Business strength", "ব্যবসার শক্তি"),
    "dividend": bi("Dividend record", "ডিভিডেন্ডের ধারা"),
    "price": bi("Price", "দাম"),
    "safety": bi("Safety", "নিরাপত্তা"),
}


def _line(fors: list[str], againsts: list[str], decision: str) -> dict:
    """One plain sentence on what weighs on each side, no figures."""
    if fors and not againsts and decision != "buy":
        # Held back by something the parts don't weigh (the group's own
        # problems): the answer right above says what.
        f_en, f_bn = _names(fors, _IN_LINE)
        return bi(f"For buying: {f_en}. What holds it back is in our answer above.",
                  f"কেনার পক্ষে: {f_bn}। কী কারণে আটকে আছে, তা ওপরে আমাদের উত্তরে বলা আছে।")
    if fors and againsts:
        f_en, f_bn = _names(fors, _IN_LINE)
        a_en, a_bn = _names(againsts, _IN_LINE)
        return bi(f"For buying: {f_en}. Against it: {a_en}.",
                  f"কেনার পক্ষে: {f_bn}। বিপক্ষে: {a_bn}।")
    if fors:
        f_en, f_bn = _names(fors, _IN_LINE)
        return bi(f"For buying: {f_en}. Nothing weighs clearly against it.",
                  f"কেনার পক্ষে: {f_bn}। বিপক্ষে স্পষ্ট কিছু নেই।")
    if againsts:
        a_en, a_bn = _names(againsts, _IN_LINE)
        return bi(f"Against buying: {a_en}. Nothing weighs clearly for it.",
                  f"কেনার বিপক্ষে: {a_bn}। পক্ষে স্পষ্ট কিছু নেই।")
    return bi("Nothing weighs clearly either way.", "কোনো দিকেই স্পষ্ট ঝোঁক নেই।")


def build_split(inp: dict, sections: dict, answer: Optional[dict],
                analysis: Optional[dict]) -> Optional[dict]:
    """The report's `split` (see the module note). None for a share we can't
    rate or without the analysis."""
    decision = (answer or {}).get("decision")
    if decision not in BANDS or not analysis:
        return None
    row = inp.get("score_row") or {}
    pr = sections.get("price") or {}
    rf = sections.get("red_flags") or {}
    counts = rf.get("counts") or {}
    light = next((l for l in (answer or {}).get("lights") or [] if l["key"] == "price"), None)
    near_top = bool(light and light["word"]["en"].startswith("Near"))

    parts = weigh(row, verdict=pr.get("_verdict"), near_top=near_top,
                  red=int(counts.get("red") or 0), amber=int(counts.get("amber") or 0),
                  blocked=answer.get("blocker") == "risks",
                  price_blocks=answer.get("blocker") == "price")
    raw = lean_pct(parts)
    buy = in_band(raw, decision)
    if buy is None:
        return None

    shown = {p["key"]: p for p in analysis.get("parts") or []}
    factors = []
    for p in parts:
        a = shown.get(p["key"])
        if not a:
            continue
        side = "for" if p["share"] >= FOR_FROM else "against" if p["share"] <= AGAINST_TO else "even"
        factors.append({
            "key": p["key"], "name": a["name"], "word": a["word"], "tone": a["tone"],
            "weight": round(p["weight"]), "side": side,
        })
    # Heaviest first on each side, so the sentence names what matters most.
    fors = [f["key"] for f in sorted(factors, key=lambda f: -f["weight"]) if f["side"] == "for"][:3]
    againsts = [f["key"] for f in sorted(factors, key=lambda f: -f["weight"]) if f["side"] == "against"][:3]
    return {
        "buy": buy,
        "sell": 100 - buy,
        "factors": factors,
        "line": _line(fors, againsts, decision),
    }
