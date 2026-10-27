"""
Recommendation engine — the rules, kept pure (no database) so they can be
tested. The data side is ``recommend_service.py``.

ONE engine for every personal stock suggestion in the app: the dashboard's
"Picked for you", the portfolio's "What to buy next", TopStock AI's "suggest
stocks" and the empty watchlist's "Suggested to follow".

Three layers, each explainable in plain words:

1. **Safety gate** (``GATE``) — the trust floor. A pick has today's Buy signal
   (so it can never contradict its own stock page) and passes four more
   checks. Run through ``research_lists.run_list`` so the funnel reads like
   every research list's: how many companies are left after each check.
2. **Conviction** (``conviction``) — 0–100, the same for every reader: grade,
   price, room under the yearly high, which way profit is going, and safety.
3. **Fit** (``fit``) — what ties a pick to *this* reader's own stocks: one they
   own and could add to, one they follow, a stronger company in the same
   business as a weak one they hold, the same business as a good one, the
   strengths their stocks share, or a sector they don't have. A reader with no
   stocks gets the strongest picks by conviction alone.

Deterministic on purpose: no shuffle, no popularity. The list changes only
when the data changes. No performance claims anywhere — never add "since we
picked it" returns.

Bengali sentences use Western digits (the Bengali numerals render as boxes on
some of the audience's phones).
"""
from __future__ import annotations

from typing import Optional

from backend.services import custom_lists as cl
from backend.services import research_lists as rl
from backend.services.tiers import tier_key

_n = rl._n
_r = rl._r

N_PICKS = 15
FEW_PASS = 10            # fewer passers than this -> a plain note, never a lower bar
SECTOR_CAP = 3           # per sector in one list (8 of 38 Buys were insurers on 2026-10-27)
FINANCIAL_CAP = 5        # banks + finance companies + insurers together (they move together)
OWN_CAP = 5              # the reader's own stocks (owned + followed) in one list
KIND_CAP = {"add_more": 3, "watched": 3}
ANCHOR_CAP = 2           # picks that name the same stock of theirs
HEAVY_PCT = 40.0         # a sector holding more of their money than this is "heavy"
ADD_MORE_MAX_PCT = 20.0  # no "add more" on a holding already this big
MIN_COMPLETENESS = 0.6
UPGRADE_GAP = 10.0       # score points a stronger company must clear
TRAIT_SHARE = 0.5        # a strength counts as theirs when half their stocks share it
TRAIT_COMMON = 0.6       # ...and only when most of today's picks don't have it anyway
LABEL_CAP = {"style": 4, "new_area": 3}  # past this, a pick reads as a plain "Top pick"
FIN_HEAVY_PCT = 50.0     # banks + finance + insurers holding more of their money than this

BONUS = {"add_more": 24.0, "watched": 26.0, "upgrade": 22.0, "similar": 14.0,
         "asked": 12.0, "new_area": 6.0, "top": 0.0}
STYLE_MAX = 10.0

_NOT_LENDER = {"GENERAL"}
_FINANCIAL = {"BANK", "NBFI", "INSURANCE"}

# Strengths that make a style: every pick is a Good+ company at a fair price,
# so those two say nothing about taste. Price counts only at "Low".
TRAIT_MIN_LEVEL = {"price": 2, "dividends": 1, "growth": 1, "safety": 1, "trading": 1}


# ---------------------------------------------------------------------------
# 1. Safety gate
# ---------------------------------------------------------------------------

def _buy(f, ctx):
    sig = f.get("signal")
    if sig == "buy":
        return True, "A Buy signal today", "আজ 'কিনুন' সংকেত"
    if sig == "sell":
        return False, "A Sell signal today", "আজ 'বিক্রি' সংকেত"
    return False, "No Buy signal today", "আজ 'কিনুন' সংকেত নেই"


def _enough_data(f, ctx):
    dc = _n(f.get("data_completeness"))
    if dc is None:
        return False, "Too few figures to trust the grade", "গ্রেডে ভরসা করার মতো যথেষ্ট তথ্য নেই"
    pct = _r(dc * 100, 0)
    return dc >= MIN_COMPLETENESS, f"{pct}% of the figures we check are there", \
        f"আমরা যে তথ্য দেখি তার {pct}% আছে"


GATE: list[rl.Check] = [
    rl.Check("buy", "Has a Buy signal today: a good company at a fair price, traded enough, not at its yearly top",
             "আজ 'কিনুন' সংকেত আছে: ভালো কোম্পানি, ঠিকঠাক দাম, যথেষ্ট লেনদেন, বছরের সর্বোচ্চে নয়", _buy),
    rl.PROFITABLE,
    rl.NO_GOVERNANCE,
    rl.DEBT_OK,
    rl.Check("enough_data", "We have enough of its figures to trust the grade",
             "গ্রেডে ভরসা করার মতো যথেষ্ট তথ্য আছে", _enough_data),
]


def _size_part(mcap_mn: Optional[float]) -> float:
    """Bigger companies are steadier and better known: ৳5,000 crore+ full marks."""
    m = mcap_mn or 0.0
    return 1.0 if m >= 50_000 else 0.7 if m >= 10_000 else 0.45 if m >= 2_000 else 0.25


def conviction(f: dict, levels: Optional[dict] = None) -> float:
    """0–100, the same for every reader. Grade 45 · price 20 · profit
    direction 12 · room under the yearly high 8 · safety 15, then small
    adjustments. Quality leads on purpose: a pick has to read as a company a
    careful investor would recognise, not just the cheapest Buy."""
    score = _n(f.get("score")) or 0.0
    p4 = _n(f.get("p4_val"))
    pos = _n(f.get("pct_in_range"))
    quality = score / 100
    price = (p4 if p4 is not None else 5.0) / 10
    room = 1 - min(100.0, max(0.0, pos)) / 100 if pos is not None else 0.5

    trend = rl.profit_trend(f)[0]
    profit = 0.5 if trend is None else 1.0 if trend >= 15 else 0.7 if trend >= 0 else 0.25

    cat = (f.get("cat") or "").strip().upper()
    trade = {2: 1.0, 1: 0.7}.get(int((levels or {}).get("trading") or 0), 0.4)
    paid = (_n(f.get("p5_consist")) or 0.0) / 10
    safety = (0.4 * (1.0 if cat == "A" else 0.6) + 0.3 * trade + 0.15 * paid
              + 0.15 * _size_part(_n(f.get("mcap_mn"))))

    total = 45 * quality + 20 * price + 12 * profit + 8 * room + 15 * safety
    if f.get("strength") == "strong":
        total += 3
    dc = _n(f.get("data_completeness"))
    if dc is not None and dc < 0.8:
        total -= 3
    nocf = _n(f.get("interim_nocfps"))
    if nocf is not None and nocf < 0 and (f.get("sector_class") or "GENERAL") in _NOT_LENDER:
        total -= 5
    return round(min(100.0, max(0.0, total)), 1)


def gate_list() -> rl.ResearchList:
    """The gate as a research list, so ``run_list`` gives the funnel."""
    return rl.ResearchList(
        id="for_you", slug="for-you", title_en="Picked for you", title_bn="আপনার জন্য বাছাই",
        idea_en="", idea_bn="", checks=GATE,
        rank=lambda f: (_n(f.get("conviction")) or 0.0, _n(f.get("score")) or 0.0),
        headline=lambda f: ("", ""),
    )


def funnel_summary(run: dict) -> dict:
    """``run_list`` output -> the trust line: Buy signals today, how many pass
    every check, and each check with how many it let through."""
    funnel = run.get("funnel") or []
    return {
        "rated": run.get("universe") or 0,
        "buys": funnel[0]["left"] if funnel else 0,
        "passed": funnel[-1]["left"] if funnel else 0,
        "checks": [{"key": c["key"], "en": c["label_en"], "bn": c["label_bn"], "left": c["left"]} for c in funnel],
    }


# ---------------------------------------------------------------------------
# 2. The reader
# ---------------------------------------------------------------------------

def _poor(f: Optional[dict], holding_sig: Optional[str]) -> bool:
    """A stock of theirs we would not pick: weak or average, marked Sell, or Z."""
    if not f:
        return False
    if tier_key(_n(f.get("score"))) in ("weak", "average", "unknown"):
        return True
    if f.get("signal") == "sell" or holding_sig == "sell":
        return True
    return (f.get("cat") or "").strip().upper() == "Z"


def _trait(qkey: str, lvl: int) -> dict:
    l = cl.Q_BY_KEY[qkey].levels[lvl - 1]
    return {"key": qkey, "level": lvl, "en": l.tag_en, "bn": l.tag_bn}


# TopStock AI's quiz answers -> the strengths they ask for.
_STATED = {
    ("dividend", "income_focused"): ("dividends", 1),
    ("valuation", "value"): ("price", 2),
    ("valuation", "growth"): ("growth", 2),
    ("risk", "steady"): ("safety", 1),
    ("size", "large"): ("trading", 2),
}


def build_profile(mine: list[dict], facts: dict[str, dict], levels: dict[str, dict],
                  stated: Optional[dict] = None, pool_levels: Optional[list[dict]] = None) -> dict:
    """The reader from their own stocks.

    ``mine`` = [{code, held, watched, value, holding_signal}] — holdings carry
    their money (``value``), followed-only stocks 0. ``stated`` = TopStock AI
    quiz answers, which outrank what their stocks suggest. ``pool_levels`` =
    today's gated picks' strengths: a strength most of them share ("Low price"
    on a cheap day) says nothing about this reader's taste, so it is left out."""
    held = {m["code"] for m in mine if m.get("held")}
    watched = {m["code"] for m in mine if m.get("watched")}
    hsig = {m["code"]: m.get("holding_signal") for m in mine if m.get("held")}
    total = sum(max(0.0, _n(m.get("value")) or 0.0) for m in mine if m.get("held"))
    weight = {m["code"]: round((_n(m.get("value")) or 0.0) / total * 100, 1) if total > 0 else 0.0
              for m in mine if m.get("held")}

    sectors: dict[str, dict] = {}
    for m in mine:
        f = facts.get(m["code"])
        sec = (f or {}).get("sector")
        if not sec:
            continue
        s = sectors.setdefault(sec, {"pct": 0.0, "n": 0, "held": [], "watched": [], "poor": []})
        s["n"] += 1
        s["pct"] += weight.get(m["code"], 0.0)
        (s["held"] if m.get("held") else s["watched"]).append(m["code"])
        if _poor(f, hsig.get(m["code"])):
            s["poor"].append({"code": m["code"], "score": _n(f.get("score")) or 0.0})
    for s in sectors.values():
        s["pct"] = round(s["pct"], 1)
        s["held"].sort(key=lambda c: -weight.get(c, 0.0))
        s["poor"].sort(key=lambda p: p["score"])
        # The anchor named in "Like X": their biggest holding there, else the first they follow.
        good = [c for c in s["held"] + s["watched"] if c not in {p["code"] for p in s["poor"]}]
        s["anchor"] = good[0] if good else None
        s["anchor_held"] = bool(good) and good[0] in held
    heavy = {sec for sec, s in sectors.items() if total > 0 and s["pct"] > HEAVY_PCT}

    fin_pct = sum(weight.get(c, 0.0) for c in held
                  if ((facts.get(c) or {}).get("sector_class") or "GENERAL") in _FINANCIAL)

    # Shared strengths: a trait when half their rated stocks (at least 2) meet
    # it and most of today's picks don't. ``common`` = the share of picks that
    # have it, so the rarest shared strength can be named first.
    rated = [levels[c] for c in sorted(held | watched) if c in levels]
    pool = pool_levels or []

    def common(qkey: str, want: int) -> float:
        return sum(1 for lv in pool if (lv.get(qkey) or 0) >= want) / len(pool) if pool else 0.0

    traits = []
    for qkey, lvl in TRAIT_MIN_LEVEL.items():
        for want in (2, 1):
            if want < lvl:
                continue
            n = sum(1 for lv in rated if (lv.get(qkey) or 0) >= want)
            if n >= 2 and n >= TRAIT_SHARE * len(rated):
                if common(qkey, want) <= TRAIT_COMMON:
                    traits.append(_trait(qkey, want) | {"n": n, "of": len(rated), "common": common(qkey, want)})
                break

    asked, asked_sectors = [], set()
    for (q, a), (qkey, lvl) in _STATED.items():
        if (stated or {}).get(q) == a:
            asked.append(_trait(qkey, lvl) | {"n": None, "of": None, "asked": True, "common": common(qkey, lvl)})
    for sec in (stated or {}).get("sectors") or []:
        if isinstance(sec, str) and sec.strip():
            asked_sectors.add(sec.strip())
    # Asked-for strengths replace the same question's inferred one.
    asked_keys = {t["key"] for t in asked}
    traits = asked + [t for t in sorted(traits, key=lambda t: (-t["n"], t["common"])) if t["key"] not in asked_keys]

    return {
        "held": held, "watched": watched, "codes": held | watched,
        "holding_signal": hsig, "weight": weight, "total_value": total,
        "sectors": sectors, "heavy": heavy,
        "fin_heavy": total > 0 and len(held) > 1 and fin_pct > FIN_HEAVY_PCT,
        "top_sector_pct": max((s["pct"] for s in sectors.values()), default=0.0),
        "traits": traits, "asked_sectors": asked_sectors,
    }


def empty_profile() -> dict:
    return build_profile([], {}, {})


# ---------------------------------------------------------------------------
# 3. Fit
# ---------------------------------------------------------------------------

def style_match(lv: Optional[dict], prof: dict) -> list[dict]:
    """Their strengths this pick shares — what they asked for first, then the
    rarest among today's picks (the one that says most about the fit)."""
    shared = [t for t in prof["traits"] if ((lv or {}).get(t["key"]) or 0) >= t["level"]]
    return sorted(shared, key=lambda t: (not t.get("asked"), t.get("common") or 0.0))


def fit(c: dict, lv: Optional[dict], prof: dict) -> Optional[dict]:
    """``{bonus, kind, anchor, shared}`` for one gated candidate, or None when
    it must not be suggested to this reader: it would add to a sector that
    already holds too much of their money (banks + finance + insurers count
    as one when they hold over half), or it is a stock they own that is not
    an "add more" today."""
    code, sec = c["code"], c.get("sector")
    if sec in prof["heavy"] or ((c.get("sector_class") or "GENERAL") in _FINANCIAL and prof.get("fin_heavy")):
        return None
    s = prof["sectors"].get(sec) if sec else None
    shared = style_match(lv, prof)
    style = STYLE_MAX * len(shared) / len(prof["traits"]) if prof["traits"] else 0.0
    anchor = None

    if code in prof["held"]:
        ok = (prof["holding_signal"].get(code) == "buy_more"
              and prof["weight"].get(code, 0.0) < ADD_MORE_MAX_PCT)
        if not ok:
            return None
        kind = "add_more"
    elif code in prof["watched"]:
        kind = "watched"
    else:
        poor = next((p for p in (s or {}).get("poor") or []
                     if (_n(c.get("score")) or 0.0) >= p["score"] + UPGRADE_GAP), None)
        if poor:
            kind, anchor = "upgrade", poor["code"]
        elif s and s.get("anchor"):
            kind, anchor = "similar", s["anchor"]
        elif sec and sec in prof["asked_sectors"]:
            kind = "asked"
        elif shared:
            kind = "style"
        elif (prof["held"] and sec and sec not in prof["sectors"]
              and prof["top_sector_pct"] > HEAVY_PCT):
            kind = "new_area"
        else:
            kind = "top"
    # "style" is a kind only when nothing closer applies; its bonus rides on every kind.
    bonus = BONUS.get(kind, 0.0) + style
    return {"bonus": round(bonus, 1), "kind": kind, "anchor": anchor, "shared": shared}


# ---------------------------------------------------------------------------
# 4. Words
# ---------------------------------------------------------------------------

def _pt(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _grade_point(c: dict) -> Optional[dict]:
    s = _n(c.get("score"))
    if s is None:
        return None
    w_en, w_bn = rl.grade_words(s)
    return _pt(f"Our grade: {_r(s, 0)} out of 100 ({w_en})", f"আমাদের গ্রেড: 100-এর মধ্যে {_r(s, 0)} ({w_bn})")


def _price_point(c: dict) -> Optional[dict]:
    pe, own, sect = _n(c.get("current_pe")), _n(c.get("own_avg_pe")), _n(c.get("sector_median_pe"))
    if pe is None or pe <= 0:
        return None
    if own and own > 0 and pe < own:
        return _pt(f"Price is {_r(pe)}× its profit, below its usual {_r(own)}×",
                   f"দাম মুনাফার {_r(pe)} গুণ, সাধারণত {_r(own)} গুণ থাকে")
    if sect and sect > 0 and pe < sect:
        return _pt(f"Price is {_r(pe)}× its profit, against {_r(sect)}× for its sector",
                   f"দাম মুনাফার {_r(pe)} গুণ, খাতে {_r(sect)} গুণ")
    return _pt(f"Price is {_r(pe)}× its profit", f"দাম মুনাফার {_r(pe)} গুণ")


def _dividend_point(c: dict) -> Optional[dict]:
    y = _n(c.get("div_yield_pct"))
    if not y or y < 2:
        return None
    per = c.get("cash_per_10k")
    tail_en = f", about ৳{per:,} on ৳10,000" if per else ""
    tail_bn = f", ৳10,000-এ প্রায় ৳{per:,}" if per else ""
    return _pt(f"Pays {_r(y)}% a year in cash{tail_en}", f"বছরে {_r(y)}% নগদ লভ্যাংশ{tail_bn}")


def _profit_point(c: dict) -> Optional[dict]:
    v, en, bn = rl.profit_trend(c)
    if v is None or v < 5:
        return None
    return _pt(f"Profit up {_r(v, 0)}% ({en})", f"মুনাফা {_r(v, 0)}% বেশি ({bn})")


def _room_point(c: dict) -> Optional[dict]:
    d = _n(c.get("pct_below_high"))
    if d is None or d < 10:
        return None
    return _pt(f"{_r(d, 0)}% below its 1-year high", f"এক বছরের সর্বোচ্চ দামের চেয়ে {_r(d, 0)}% কম")


def _fair_point(c: dict) -> Optional[dict]:
    fv = c.get("fair_value") or {}
    lo, hi = _n(fv.get("low")), _n(fv.get("high"))
    if lo is None or hi is None or fv.get("estimates_disagree") or hi <= 0:
        return None
    return _pt(f"Our fair-value estimate: ৳{_r(lo, 0)}–{_r(hi, 0)} a share",
               f"আমাদের হিসাবে ন্যায্য দাম: শেয়ারপ্রতি ৳{_r(lo, 0)}–{_r(hi, 0)}")


_POINT_FNS = {"grade": _grade_point, "price": _price_point, "dividends": _dividend_point,
              "growth": _profit_point, "room": _room_point, "fair": _fair_point}
_DEFAULT_ORDER = ["grade", "price", "dividends", "growth", "room", "fair"]


def points(c: dict, lead: Optional[str] = None, skip: tuple[str, ...] = (), limit: int = 3) -> list[dict]:
    """2–3 number lines. ``lead`` puts one kind of fact first (the strength
    the pick was chosen for)."""
    order = ([lead] if lead in _POINT_FNS else []) + [k for k in _DEFAULT_ORDER if k != lead]
    out = []
    for k in order:
        if k in skip:
            continue
        p = _POINT_FNS[k](c)
        if p:
            out.append(p)
        if len(out) >= limit:
            break
    return out


def _sector_bn(c: dict) -> str:
    return c.get("sector_bn") or c.get("sector") or ""


def _top_why(c: dict, lv: Optional[dict]) -> tuple[str, str, Optional[str]]:
    """A no-strings pick's reason, built from what stands out about it, so
    fifteen picks don't all read the same. Returns (en, bn, the fact kind it
    already says — skipped in the number lines)."""
    lv = lv or {}
    s = _n(c.get("score")) or 0.0
    p4 = _n(c.get("p4_val"))
    lead = ("An excellent company", "চমৎকার কোম্পানি") if s >= 75 else ("A good company", "ভালো কোম্পানি")
    if p4 is not None and p4 >= 8:
        price = ("at a low price", "দামও কম")
    elif p4 is not None and p4 >= 7:
        price = ("at a good price", "দামও ভালো")
    else:
        price = ("at a fair price", "দামও ঠিকঠাক")
    y = _n(c.get("div_yield_pct"))
    trend, t_en, t_bn = rl.profit_trend(c)
    below = _n(c.get("pct_below_high"))
    extra, said = None, None
    if (lv.get("dividends") or 0) >= 2 and y:
        extra, said = (f"and it pays {_r(y)}% a year in cash", f"বছরে {_r(y)}% নগদ লভ্যাংশ দেয়"), "dividends"
    elif trend is not None and trend >= 15:
        extra, said = (f"with profit up {_r(trend, 0)}% ({t_en})", f"মুনাফা {_r(trend, 0)}% বেশি ({t_bn})"), "growth"
    elif below is not None and below >= 20:
        extra, said = (f"{_r(below, 0)}% below its 1-year high", f"এক বছরের সর্বোচ্চের চেয়ে {_r(below, 0)}% কম"), "room"
    elif (lv.get("trading") or 0) >= 2:
        extra = ("and one of the market's big, easy-to-trade names", "বাজারের বড়, সহজে কেনাবেচার শেয়ার")
    elif (lv.get("safety") or 0) >= 2:
        extra = ("with almost no loans", "প্রায় কোনো ঋণ নেই")
    en = f"{lead[0]} {price[0]}" + (f", {extra[0]}." if extra else ".")
    bn = f"{lead[1]}, {price[1]}" + (f"; {extra[1]}।" if extra else "।")
    return en, bn, said


def words(c: dict, kind: str, anchor: Optional[str], shared: list[dict], prof: dict,
          anchor_score: Optional[float] = None, lv: Optional[dict] = None) -> dict:
    """The kind word, the one-sentence reason and the number lines."""
    sec, sec_bn = c.get("sector") or "", _sector_bn(c)
    lead, skip = None, ()
    if kind == "add_more":
        tag = ("Add more", "আরও কিনুন")
        why = ("You own it, and at today's price it is still a good buy.",
               "এটি আপনার কাছে আছে, আর আজকের দামেও কেনার মতো।")
    elif kind == "watched":
        tag = ("On your watchlist", "আপনার ওয়াচলিস্টে")
        why = ("You follow it, and today the price is right.",
               "আপনি এটি ফলো করছেন, আর আজ দামটা ঠিক জায়গায়।")
    elif kind == "upgrade":
        s = _r(_n(c.get("score")) or 0, 0)
        a = _r(anchor_score or 0, 0)
        tag = (f"Stronger than {anchor}", f"{anchor}-এর চেয়ে শক্তিশালী")
        why = (f"Same business as {anchor}, but a stronger company: graded {s} against {a}.",
               f"{anchor}-এর মতো একই ব্যবসা, কিন্তু আরও শক্তিশালী কোম্পানি: গ্রেড {s}, {anchor}-এর {a}।")
        skip = ("grade",)
    elif kind == "similar":
        own = anchor in prof["held"]
        tag = (f"Like {anchor}", f"{anchor}-এর মতো")
        why = (f"Same business as {anchor} you {'own' if own else 'follow'}, and the price is good now.",
               f"আপনার {'কেনা' if own else 'ফলো করা'} {anchor}-এর মতো একই ব্যবসা, আর এখন দামও ভালো।")
    elif kind == "asked":
        # The tag already says "your sector"; the reason says what stands out.
        tag = ("Your sector", "আপনার খাত")
        en, bn, said = _top_why(c, lv)
        why = (en, bn)
        skip = (said,) if said else ()
    elif kind == "style":
        t = shared[0]
        lead = t["key"]
        tag = ("Fits your style", "আপনার ধরনের")
        if t.get("asked"):
            why = (f"{t['en']}, as you asked.", f"{t['bn']}, যেমনটা আপনি চেয়েছেন।")
        else:
            why = (f"{t['en']}, like {t['n']} of your {t['of']} stocks.",
                   f"{t['bn']}, আপনার {t['of']}টি শেয়ারের {t['n']}টির মতোই।")
    elif kind == "new_area":
        tag = ("New sector for you", "আপনার জন্য নতুন খাত")
        why = (f"Adds {sec}, a business none of your stocks are in.",
               f"{sec_bn} খাত যোগ হয়, আপনার কোনো শেয়ার এই ব্যবসায় নেই।")
    else:
        tag = ("Strong pick" if c.get("strength") == "strong" else "Top pick",
               "জোরালো বাছাই" if c.get("strength") == "strong" else "সেরা বাছাই")
        en, bn, said = _top_why(c, lv)
        why = (en, bn)
        skip = (said,) if said else ()
    return {"tag_en": tag[0], "tag_bn": tag[1], "why_en": why[0], "why_bn": why[1],
            "points": points(c, lead, skip)}


def item(c: dict, kind: str, anchor: Optional[str], shared: list[dict], prof: dict,
         facts: dict[str, dict], total: float, lv: Optional[dict]) -> dict:
    anchor_score = _n((facts.get(anchor) or {}).get("score")) if anchor else None
    risk = c.get("risk") or None
    return {
        "code": c["code"], "name": c.get("name"), "sector": c.get("sector"),
        "price": _n(c.get("ltp")), "change_pct": _n(c.get("change_pct")),
        "score": _n(c.get("score")), "tier": tier_key(_n(c.get("score"))),
        "strong": c.get("strength") == "strong",
        "kind": kind, "anchor": anchor,
        **words(c, kind, anchor, shared, prof, anchor_score, lv),
        "watch": {"en": risk["en"], "bn": risk["bn"]} if risk else None,
        "signal_reason_en": c.get("reason_en"), "signal_reason_bn": c.get("reason_bn"),
        "strengths": cl.strength_tags(lv),
        "div_yield_pct": _n(c.get("div_yield_pct")),
        "conviction": _n(c.get("conviction")), "rank_score": round(total, 1),
        "new": False,
    }


# ---------------------------------------------------------------------------
# 5. Ranking and selection
# ---------------------------------------------------------------------------

def rank(cands: list[dict], levels: dict[str, dict], prof: dict) -> list[tuple[float, dict, dict]]:
    """[(total, candidate, fit)] best first — conviction + fit, ties to score
    then code, so the same inputs always give the same order."""
    out = []
    for c in cands:
        ft = fit(c, levels.get(c["code"]), prof)
        if ft is None:
            continue
        total = (_n(c.get("conviction")) or 0.0) + ft["bonus"]
        out.append((total, c, ft))
    out.sort(key=lambda t: (-t[0], -(_n(t[1].get("score")) or 0.0), t[1]["code"]))
    return out


def select(ranked: list[tuple[float, dict, dict]], prof: dict, n: int = N_PICKS) -> list[tuple[float, dict, dict]]:
    """Caps: per sector, banks + finance + insurers together, the reader's
    own stocks, per kind, per anchor."""
    out, per_sector, per_kind, per_anchor, own, fin = [], {}, {}, {}, 0, 0
    for total, c, ft in ranked:
        if len(out) >= n:
            break
        sec, kind, anchor = c.get("sector") or "", ft["kind"], ft["anchor"]
        asked = sec in prof["asked_sectors"]  # a sector they asked for is never capped
        if sec and not asked and per_sector.get(sec, 0) >= SECTOR_CAP:
            continue
        is_fin = (c.get("sector_class") or "GENERAL") in _FINANCIAL and not asked
        if is_fin and fin >= FINANCIAL_CAP:
            continue
        mine = c["code"] in prof["codes"]
        if mine and own >= OWN_CAP:
            continue
        if kind in KIND_CAP and per_kind.get(kind, 0) >= KIND_CAP[kind]:
            continue
        if anchor and per_anchor.get(anchor, 0) >= ANCHOR_CAP:
            continue
        out.append((total, c, ft))
        per_sector[sec] = per_sector.get(sec, 0) + 1
        per_kind[kind] = per_kind.get(kind, 0) + 1
        if anchor:
            per_anchor[anchor] = per_anchor.get(anchor, 0) + 1
        own += 1 if mine else 0
        fin += 1 if is_fin else 0
    return out


def recommend(cands: list[dict], levels: dict[str, dict], prof: dict, facts: dict[str, dict],
              n: int = N_PICKS) -> list[dict]:
    """Gated candidates (with ``conviction``) -> up to ``n`` explained picks."""
    picked = select(rank(cands, levels, prof), prof, n)
    labels: dict[str, int] = {}
    out = []
    for total, c, ft in picked:
        kind = ft["kind"]
        labels[kind] = labels.get(kind, 0) + 1
        if kind in LABEL_CAP and labels[kind] > LABEL_CAP[kind]:
            kind = "top"  # fifteen "New sector for you" rows would say nothing
        out.append(item(c, kind, ft["anchor"], ft["shared"], prof, facts, total, levels.get(c["code"])))
    return out


def mark_new(items: list[dict], prev: Optional[list[str]]) -> list[str]:
    """Flag the picks that were not in the reader's previous list. Nothing is
    new on a first-ever list (``prev`` None)."""
    if prev is None:
        return []
    before = set(prev)
    fresh = []
    for it in items:
        if it["code"] not in before:
            it["new"] = True
            fresh.append(it["code"])
    return fresh


def seen_update(state: Optional[dict], day: str, codes: list[str]) -> tuple[Optional[dict], Optional[list[str]]]:
    """``users.for_you_seen`` bookkeeping -> (the doc to write or None, the
    previous day's codes to diff against). A new day moves today's codes to
    ``prev``; the same day only rewrites ``codes`` when they changed."""
    state = state or {}
    if state.get("day") == day:
        prev = state.get("prev")
        if list(state.get("codes") or []) == codes:
            return None, prev
        return {"day": day, "codes": codes, "prev": prev}, prev
    prev = state.get("codes") if state.get("day") else None
    return {"day": day, "codes": codes, "prev": prev}, prev


def note(passed: int) -> Optional[dict]:
    if passed == 0:
        return _pt("No stock passes every check today, so we pick nothing. When good companies get cheaper, picks appear here.",
                   "আজ কোনো শেয়ার সব যাচাই পার হয়নি, তাই কিছু বাছাই করা হয়নি। ভালো কোম্পানির দাম কমলে এখানে বাছাই আসবে।")
    if passed < FEW_PASS:
        return _pt(f"Only {passed} stocks pass every check today. We don't lower the bar to fill the list.",
                   f"আজ মাত্র {passed}টি শেয়ার সব যাচাই পার হয়েছে। তালিকা ভরাতে আমরা মান কমাই না।")
    return None


# ---------------------------------------------------------------------------
# 6. Portfolio — "What to buy next"
# ---------------------------------------------------------------------------

BUY_NEXT_PICKS = 3


def _names(codes: list[str], bn: bool = False, cap: int = 2) -> str:
    and_ = "এবং" if bn else "and"
    if not codes:
        return ""
    if len(codes) == 1:
        return codes[0]
    if len(codes) <= cap + 1:
        return f"{', '.join(codes[:-1])} {and_} {codes[-1]}"
    rest = len(codes) - cap
    return f"{', '.join(codes[:cap])} এবং আরও {rest}টি" if bn else f"{', '.join(codes[:cap])} and {rest} more"


def holding_rows(holdings: list[dict], facts: dict[str, dict]) -> list[dict]:
    """Holdings -> {code, qty, value, weight_pct, sector, score, weak, z, p5_div}.
    ``holdings`` carry ``ltp`` (the official close) and ``buy_price``."""
    rows = []
    for h in holdings:
        code = (h.get("trading_code") or h.get("code") or "").upper()
        qty = int(h.get("qty") or 0)
        if not code or qty <= 0:
            continue
        f = facts.get(code) or {}
        price = _n(h.get("ltp")) or _n(f.get("ltp")) or _n(h.get("buy_price")) or 0.0
        rows.append({
            "code": code, "qty": qty, "value": qty * price, "sector": f.get("sector"),
            "sector_class": f.get("sector_class") or "GENERAL",
            "score": _n(f.get("score")), "weak": tier_key(_n(f.get("score"))) == "weak",
            "z": (f.get("cat") or "").strip().upper() == "Z", "p5_div": _n(f.get("p5_div")),
        })
    total = sum(r["value"] for r in rows)
    for r in rows:
        r["weight_pct"] = r["value"] / total * 100 if total > 0 else 0.0
    return rows


def gaps(rows: list[dict]) -> dict:
    """What the portfolio is missing, in both languages, plus the facts the
    idea picker needs."""
    n = len(rows)
    by_sector: dict[str, float] = {}
    for r in rows:
        key = r["sector"] or "Other"
        by_sector[key] = by_sector.get(key, 0.0) + r["weight_pct"]
    top = max(by_sector.items(), key=lambda kv: kv[1], default=(None, 0.0))
    heavy = top[0] if top[1] > HEAVY_PCT and n > 1 else None
    fin_pct = sum(r["weight_pct"] for r in rows if r["sector_class"] in _FINANCIAL)
    fin_heavy = fin_pct > 50 and n > 1
    swap = sorted([r for r in rows if r["weak"] or r["z"]], key=lambda r: -r["weight_pct"])
    no_payer = n >= 3 and not any((r["p5_div"] or 0) >= 7 for r in rows)

    out = []
    if 0 < n < 5:
        out.append({"key": "few",
                    "en": f"You own {n} share{'' if n == 1 else 's'}. Aim for 5–8, so one bad company cannot drag your whole portfolio down.",
                    "bn": f"আপনার কাছে {n}টি শেয়ার আছে। 5–8টি রাখার চেষ্টা করুন, যাতে একটি খারাপ কোম্পানি পুরো পোর্টফোলিওকে নিচে টেনে নামাতে না পারে।"})
    if heavy:
        pct = _r(top[1], 0)
        out.append({"key": "heavy_sector",
                    "en": f"{pct}% of your money is in {heavy}, so your next buy is best made in a different sector.",
                    "bn": f"আপনার টাকার {pct}% আছে {heavy} খাতে, তাই পরের কেনাটি অন্য কোনো খাতে হলে ভালো।"})
    heavy_is_fin = heavy is not None and any(r["sector"] == heavy and r["sector_class"] in _FINANCIAL for r in rows)
    if fin_heavy and fin_pct - (top[1] if heavy_is_fin else 0.0) > 5:
        pct = _r(fin_pct, 0)
        out.append({"key": "financials",
                    "en": f"{pct}% of your money is in banks, finance companies and insurers. They move together, so these ideas leave them out.",
                    "bn": f"আপনার টাকার {pct}% আছে ব্যাংক, আর্থিক প্রতিষ্ঠান আর বিমায়। এরা একসঙ্গে ওঠানামা করে, তাই এই প্রস্তাবগুলোতে এদের রাখা হয়নি।"})
    if swap:
        codes = [r["code"] for r in swap]
        out.append({"key": "swap",
                    "en": f"{_names(codes)} {'is' if len(codes) == 1 else 'are'} rated weak or in DSE's Z category. A stronger company in the same line of business could put that money to better use.",
                    "bn": f"{_names(codes, True)} দুর্বল রেটিং বা ডিএসই-র Z ক্যাটাগরিতে আছে। একই ধরনের ব্যবসার কোনো শক্তিশালী কোম্পানিতে সেই টাকা বেশি কাজে লাগতে পারে।"})
    if no_payer:
        out.append({"key": "dividend",
                    "en": "None of your shares pays a steady dividend. One steady payer would bring in cash every year.",
                    "bn": "আপনার কোনো শেয়ার নিয়মিত ডিভিডেন্ড দেয় না। নিয়মিত ডিভিডেন্ড দেয় এমন একটি শেয়ার প্রতি বছর নগদ টাকা আনবে।"})
    return {"gaps": out, "heavy": heavy, "fin_heavy": fin_heavy, "swap": swap, "no_payer": no_payer,
            "spread": n < 5 or heavy is not None or fin_heavy}


def size(price: Optional[float], total_value: float, n_holdings: int,
         amount_hint: Optional[float] = None) -> Optional[dict]:
    """Example size: about 10% of the money, an equal share up to 20% under
    5 stocks; a swap uses the replaced holding's money. Whole shares."""
    if not price or price <= 0 or total_value <= 0:
        return None
    target = min(20.0, 100 / (n_holdings + 1)) if 0 < n_holdings < 5 else 10.0
    amount = amount_hint if amount_hint is not None else total_value * target / (100 - target)
    shares = max(1, int(amount // price))
    return {"shares": shares, "amount": round(shares * price, 2),
            "target_pct": 0.0 if amount_hint is not None else round(target, 1)}


def _idea(pick: dict, kind: str, why_en: str, why_bn: str, replaces: Optional[str],
          suggest: Optional[dict], tag: Optional[tuple[str, str]] = None) -> dict:
    out = dict(pick)
    out.update({"kind": kind, "replaces": replaces, "why_en": why_en, "why_bn": why_bn, "suggest": suggest})
    if tag:
        out["tag_en"], out["tag_bn"] = tag
    return out


def portfolio_plan(rows: list[dict], cands: list[dict], levels: dict[str, dict], prof: dict,
                   facts: dict[str, dict], buys: int, n: int = BUY_NEXT_PICKS) -> dict:
    """The portfolio's "What to buy next". Each gap gets its own kind of idea
    from the same gated, ranked pool the dashboard uses; with no gaps, the
    reader's top personal picks. Never lowers the bar."""
    g = gaps(rows)
    total = sum(r["value"] for r in rows)
    held = {r["code"] for r in rows}
    held_sectors = {r["sector"] for r in rows if r["sector"]}
    nh = len(rows)
    ranked = rank(cands, levels, prof)
    explained = {c["code"]: item(c, ft["kind"], ft["anchor"], ft["shared"], prof, facts, t, levels.get(c["code"]))
                 for t, c, ft in ranked}

    def allowed(c: dict) -> bool:
        return (c["code"] not in held and not (g["heavy"] and c.get("sector") == g["heavy"])
                and not (g["fin_heavy"] and (c.get("sector_class") or "GENERAL") in _FINANCIAL))

    pool = [c for _t, c, _f in ranked if allowed(c)]
    ideas, used_codes, used_sectors = [], set(), set()

    def free(c: dict) -> bool:
        return c["code"] not in used_codes and (c.get("sector") or "") not in used_sectors

    def take(idea: dict):
        ideas.append(idea)
        used_codes.add(idea["code"])
        used_sectors.add(idea.get("sector") or "")

    if not g["gaps"]:
        # Nothing missing: the reader's own best picks, owned ones as "add more".
        for t, c, ft in ranked:
            if len(ideas) >= n:
                break
            if not free(c) or (c["code"] in held and ft["kind"] != "add_more"):
                continue
            base = explained[c["code"]]
            kind = "add_more" if ft["kind"] == "add_more" else "fit"
            take(_idea(base, kind, base["why_en"], base["why_bn"], None,
                       size(_n(c.get("ltp")), total, nh)))
        return {"gaps": [], "picks": ideas, "buys": buys, "passed": len(cands), "none_reason": None}

    for r in g["swap"]:
        if len(ideas) >= n:
            break
        c = next((c for c in pool if free(c) and c.get("sector") == r["sector"]
                  and (_n(c.get("score")) or 0.0) >= (r["score"] or 0.0) + UPGRADE_GAP), None)
        if c:
            take(_idea(explained[c["code"]], "swap",
                       f"A stronger company in the same business as {r['code']}, where that money could work harder.",
                       f"{r['code']}-এর মতো একই ব্যবসার একটি শক্তিশালী কোম্পানি, যেখানে সেই টাকা বেশি কাজে লাগতে পারে।",
                       r["code"], size(_n(c.get("ltp")), total, nh, r["value"]),
                       (f"Instead of {r['code']}", f"{r['code']}-এর বদলে")))

    if g["no_payer"] and len(ideas) < n:
        c = next((c for c in pool if free(c) and (_n(c.get("p5_div")) or 0) >= 7
                  and (_n(c.get("div_yield_pct")) or 0) >= 4), None)
        if c:
            base = explained[c["code"]]
            take(_idea(base | {"points": points(c, "dividends", ("growth",))}, "dividend",
                       "Pays a steady dividend it can afford, so cash comes in every year.",
                       "সামর্থ্যের মধ্যে নিয়মিত ডিভিডেন্ড দেয়, তাই প্রতি বছর নগদ টাকা আসে।",
                       None, size(_n(c.get("ltp")), total, nh), ("Pays you cash", "নগদ টাকা দেয়")))

    if g["spread"]:
        for c in pool:
            if len(ideas) >= n:
                break
            if not free(c) or c.get("sector") in held_sectors:
                continue
            sec, sec_bn = c.get("sector") or "", _sector_bn(c)
            take(_idea(explained[c["code"]], "new_sector",
                       f"Adds a sector you don't own yet: {sec}.",
                       f"এমন একটি খাত যোগ করে যা আপনার এখনো নেই: {sec_bn}।",
                       None, size(_n(c.get("ltp")), total, nh), ("New sector", "নতুন খাত")))
        for c in pool:
            if len(ideas) >= n:
                break
            if not free(c):
                continue
            heavy = g["heavy"]
            take(_idea(explained[c["code"]], "spread",
                       f"Outside {heavy}, where most of your money is." if heavy
                       else "A good company at a good price, outside what you already own.",
                       f"{heavy}-এর বাইরে, যেখানে আপনার বেশিরভাগ টাকা।" if heavy
                       else "ভালো দামে ভালো কোম্পানি, আপনার যা আছে তার বাইরে।",
                       None, size(_n(c.get("ltp")), total, nh), ("Spreads your money", "টাকা ছড়ায়")))

    out_gaps = list(g["gaps"])
    if g["swap"] and not any(i["kind"] == "swap" for i in ideas):
        codes = [r["code"] for r in g["swap"]]
        one = len(codes) == 1
        for i, gp in enumerate(out_gaps):
            if gp["key"] == "swap":
                out_gaps[i] = {"key": "swap",
                               "en": f"{_names(codes)} {'is' if one else 'are'} rated weak or in DSE's Z category. The money in {'it' if one else 'them'} could work harder in a stronger company.",
                               "bn": f"{_names(codes, True)} দুর্বল রেটিং বা ডিএসই-র Z ক্যাটাগরিতে আছে। এই টাকা কোনো শক্তিশালী কোম্পানিতে বেশি কাজে লাগতে পারে।"}

    none_reason = None
    if not ideas:
        none_reason = (
            _pt("No stock passes every check today, so there is nothing to suggest. When good companies get cheaper, ideas appear here.",
                "আজ কোনো শেয়ার সব যাচাই পার হয়নি, তাই কিছু বলার নেই। ভালো কোম্পানির দাম কমলে এখানে আইডিয়া আসবে।")
            if not cands else
            _pt(f"{len(cands)} stocks pass every check today, but none of them fills these gaps without adding to what you already have too much of. Waiting is fine.",
                f"আজ {len(cands)}টি শেয়ার সব যাচাই পার হয়েছে, কিন্তু আপনার যা বেশি আছে তা না বাড়িয়ে এই ফাঁক ভরে এমন কোনোটি নেই। অপেক্ষা করাও ঠিক আছে।"))
    return {"gaps": out_gaps, "picks": ideas, "buys": buys, "passed": len(cands), "none_reason": none_reason}
