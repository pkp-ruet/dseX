"""
"Based on your shares" (``/for-you``, was Discover until 2026-11-18) — the
rules, kept pure so they can be tested. The data side is
``recommend_service.for_user``.

The page's selling point is *why* a company was picked for this reader, so
every pick is tied to one of the reader's own shares and says which one
(2026-11-18, user: "the analysis of that stock is not main part here. why we
selected for that user is the main selling point").

1. **Anchors** — the shares the reader owns (by the money in them), follows,
   and reads about: a stock page opened on 2+ days in the last 30, or once in
   the last 14 (``read_anchors``, from the page views we already keep).
2. **Ties** — what each anchor leads to among today's strong companies
   (``recommend.EXPLORE_GATE``, any price, never on today's Buy List):
   - ``stronger``: same business as a weak / mixed / Z / Sell share of theirs,
     10+ points stronger, said in the four business checks ("ACI is weak on
     profit and finances. BXPHARMA is strong on both.");
   - ``like``: same business as a good share, the most alike first (the
     screener's strengths it shares, then size), with what they share;
   - ``like_other``: a company like a good share in another business, only
     when its own business has no strong match, and sharing 2+ strengths;
   - gaps from the reader's own money: ``new_business`` (one business holds
     over 40% of it) and ``steady_payer`` (3+ shares, none pays cash every
     year).
3. **Selection** — groups in the order the shares matter to the reader
   (owned by money, followed, read, then gaps), taken in turns, at most 3 a
   share (2 a gap), 15 in all, 3 a sector, 5 banks + finance + insurers. A
   company tied to nothing is left out: a shorter list is a truer list. A reader with no anchors gets a free
   starter list of strong, well-known companies.

Not a buy list: no price verdict, no fair range, no "add more". Deterministic:
no shuffle, no popularity. Bengali uses Western digits.
"""
from __future__ import annotations

import math
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.services import grade_rules as gr
from backend.services import recommend as rc
from backend.services import research_lists as rl
from backend.services.tiers import TIER_WORDS, TIER_WORDS_BN, tier_key

_n = rl._n
_r = rl._r

N_PICKS = 15
PER_ANCHOR = 3
GAP_PICKS = 2
STARTER_N = 5
STARTER_FINANCIALS = 2
READ_ANCHORS = 5
READ_WINDOW_DAYS = 30
READ_RECENT_DAYS = 14
READ_MIN_DAYS = 2          # opened on this many days in the window, or once lately
OTHER_MIN_SHARED = 2       # strengths a company in another business must share
HIDE_DAYS = 90
HIDE_MAX = 100
PAYER_MIN_SHARES = 3

_FINANCIAL = {"BANK", "NBFI", "INSURANCE"}

# ---------------------------------------------------------------------------
# Words
# ---------------------------------------------------------------------------

REL = {
    "own": ("which you own", "আপনার কেনা"),
    "follow": ("which you follow", "আপনার ফলো করা"),
    "read": ("which you looked at", "আপনার দেখা"),
}

# The four business checks: (English name, Bengali name, Bengali locative, chip en, chip bn).
_CHECK = {
    "p1_biz": ("profit", "মুনাফা", "মুনাফায়", "Strong profit", "মুনাফা শক্তিশালী"),
    "p2_health": ("finances", "আর্থিক অবস্থা", "আর্থিক অবস্থায়", "Strong finances", "আর্থিক অবস্থা শক্তিশালী"),
    "p3_moat": ("business strength", "ব্যবসার শক্তি", "ব্যবসার শক্তিতে", "Strong business", "ব্যবসা শক্তিশালী"),
    "p5_div": ("dividends", "ডিভিডেন্ড", "ডিভিডেন্ডে", "Strong dividends", "ডিভিডেন্ড শক্তিশালী"),
}

# Strengths two companies can share, from the screener's six questions
# (custom_lists.best_levels): (key, question, level, sentence en, bn, chip en, chip bn).
# Only the chip words are shown since 2026-11-18 (the sentence names the share).
_TRAITS = [
    ("big", "trading", 2, "is a big company", "বড় কোম্পানি", "Big company", "বড় কোম্পানি"),
    ("high_cash", "dividends", 2, "pays 4% or more in cash every year", "প্রতি বছর 4% বা বেশি নগদ দেয়",
     "4%+ cash a year", "বছরে 4%+ নগদ"),
    ("every_year", "dividends", 1, "has paid cash every year for 5 years", "গত 5 বছর প্রতি বছর নগদ দিয়েছে",
     "Cash every year", "প্রতি বছর নগদ"),
    ("no_loans", "safety", 2, "has almost no loans", "প্রায় কোনো ঋণ নেই", "Almost no loans", "প্রায় ঋণমুক্ত"),
    ("growing", "growth", 2, "makes more profit than 5 years ago", "5 বছর আগের চেয়ে বেশি মুনাফা করে",
     "Profit rising", "মুনাফা বাড়ছে"),
]
_TRAIT_BY_KEY = {t[0]: t for t in _TRAITS}


def _pt(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _chip(en: str, bn: str, tone: str = "good") -> dict:
    return {"en": en, "bn": bn, "tone": tone}


def _join(words: list[str], bn: bool = False) -> str:
    if len(words) <= 1:
        return "".join(words)
    return ", ".join(words[:-1]) + (" আর " if bn else " and ") + words[-1]


def _join_loc(keys: list[str]) -> str:
    """Bengali: the case ending goes on the last name only ("মুনাফা আর আর্থিক অবস্থায়")."""
    if not keys:
        return ""
    names = [_CHECK[k][1] for k in keys[:-1]] + [_CHECK[keys[-1]][2]]
    return _join(names, True)


def _companies(n: int) -> str:
    return "company" if n == 1 else "companies"


def group_words(c: Optional[dict]) -> Optional[tuple[str, str]]:
    """The group in running text ("mostly strong"), None when ungraded."""
    key = tier_key(_n((c or {}).get("score")))
    if key == "unknown":
        return None
    return TIER_WORDS[key].lower(), TIER_WORDS_BN[key]


def _we_grade(code: str, c: Optional[dict]) -> tuple[str, str]:
    """ "We grade ACI mostly weak" / "We don't grade ACI yet" (no full stop)."""
    w = group_words(c)
    if w is None:
        return f"We don't grade {code} yet", f"{code}-এর গ্রেড আমাদের কাছে এখনো নেই"
    return f"We grade {code} {w[0]}", f"আমাদের গ্রেডে {code} {w[1]}"


_TRAIT_ORDER = [t[0] for t in _TRAITS]


def _trait_set(lv: Optional[dict]) -> set[str]:
    lv = lv or {}
    return {k for k, q, lvl, *_ in _TRAITS if (lv.get(q) or 0) >= lvl}


def _ordered(keys: set[str]) -> list[str]:
    """Best first; "4%+ cash, every year" already says "every year"."""
    if "high_cash" in keys:
        keys = keys - {"every_year"}
    return sorted(keys, key=_TRAIT_ORDER.index)


def traits(lv: Optional[dict]) -> list[str]:
    """The strengths a company has, from the screener's six questions."""
    return _ordered(_trait_set(lv))


def shared_traits(a: Optional[dict], b: Optional[dict]) -> list[str]:
    """Strengths both have. One paying 4%+ and one paying every year still
    share "cash every year"."""
    return _ordered(_trait_set(a) & _trait_set(b))


def _trait_chips(keys: list[str]) -> list[dict]:
    return [_chip(_TRAIT_BY_KEY[k][5], _TRAIT_BY_KEY[k][6]) for k in keys]


def _checks(c: Optional[dict]) -> tuple[list[str], list[str]]:
    """(strong checks, weak checks) in the stock report's order."""
    vals = gr.check_values(c or {})
    strong = [k for k in gr.CHECKS if k in vals and vals[k] >= gr.STRONG_AT]
    weak = [k for k in gr.CHECKS if k in vals and vals[k] < gr.WEAK_BELOW]
    return strong, weak


# ---------------------------------------------------------------------------
# 1. Anchors
# ---------------------------------------------------------------------------

_STOCK_PATH = re.compile(r"^/stock/([A-Za-z0-9&.\-]+)")


def visits_from_events(events: list[dict]) -> dict[str, dict]:
    """``user_events`` rows ({path, ts}) -> {code: {days, last}} — the
    distinct days each stock page was opened, and the last time."""
    out: dict[str, dict] = {}
    for e in events:
        m = _STOCK_PATH.match(e.get("path") or "")
        ts = e.get("ts")
        if not m or not isinstance(ts, datetime):
            continue
        code = m.group(1).upper()
        v = out.setdefault(code, {"days": set(), "last": ts})
        v["days"].add(ts.date())
        if ts > v["last"]:
            v["last"] = ts
    return {code: {"days": len(v["days"]), "last": v["last"]} for code, v in out.items()}


def read_anchors(visits: dict[str, dict], exclude: set[str], known: set[str], now: datetime,
                 limit: int = READ_ANCHORS) -> list[dict]:
    """The shares a reader reads about: opened on READ_MIN_DAYS+ days in the
    window, or once in the last READ_RECENT_DAYS. Never one they own or
    follow, never an unknown code. Most days first, then the latest."""
    recent = _naive(now) - timedelta(days=READ_RECENT_DAYS)
    rows = []
    for code, v in visits.items():
        if code in exclude or code not in known:
            continue
        last = _naive(v["last"])
        if v["days"] >= READ_MIN_DAYS or last >= recent:
            rows.append({"code": code, "rel": "read", "days": v["days"], "last": last})
    rows.sort(key=lambda r: (-r["days"], -(r["last"] - _EPOCH).total_seconds(), r["code"]))
    return rows[:limit]


_EPOCH = datetime(2000, 1, 1)


def _naive(dt: datetime) -> datetime:
    """Mongo hands back naive UTC; compare everything that way."""
    return dt.astimezone(timezone.utc).replace(tzinfo=None) if dt.tzinfo else dt


def anchors(mine: list[dict], reads: list[dict], facts: dict[str, dict]) -> list[dict]:
    """Owned (most money first), then followed, then read — the order the
    groups appear in and the order they take their turns."""
    owned = sorted([m for m in mine if m.get("held") and m["code"] in facts],
                   key=lambda m: (-(_n(m.get("value")) or 0.0), m["code"]))
    followed = sorted([m for m in mine if m.get("watched") and not m.get("held") and m["code"] in facts],
                      key=lambda m: m["code"])
    out = [{"code": m["code"], "rel": "own", "value": _n(m.get("value")) or 0.0,
            "holding_signal": m.get("holding_signal")} for m in owned]
    out += [{"code": m["code"], "rel": "follow"} for m in followed]
    out += [{"code": r["code"], "rel": "read", "days": r["days"]} for r in reads if r["code"] in facts]
    return out


# ---------------------------------------------------------------------------
# 2. Ties
# ---------------------------------------------------------------------------

def _size_gap(a: dict, b: dict) -> float:
    ma, mb = _n(a.get("mcap_mn")), _n(b.get("mcap_mn"))
    if not ma or not mb or ma <= 0 or mb <= 0:
        return 3.0
    return abs(math.log10(ma / mb))


def _conv(c: dict) -> float:
    return _n(c.get("conviction")) or 0.0


def ties(anchor: dict, cands: list[dict], facts: dict[str, dict], levels: dict[str, dict]) -> list[dict]:
    """[{code, kind, shared}] this anchor leads to, best first."""
    a = facts.get(anchor["code"]) or {}
    sec = a.get("sector")
    a_lv = levels.get(anchor["code"])
    if rc._poor(a, anchor.get("holding_signal")):
        floor = (_n(a.get("score")) or 0.0) + rc.UPGRADE_GAP
        same = [c for c in cands if sec and c.get("sector") == sec and (_n(c.get("score")) or 0.0) >= floor]
        same.sort(key=lambda c: (-_conv(c), c["code"]))
        return [{"code": c["code"], "kind": "stronger", "shared": []} for c in same]

    out = []
    same = [c for c in cands if sec and c.get("sector") == sec]
    same.sort(key=lambda c: (-len(shared_traits(a_lv, levels.get(c["code"]))), _size_gap(a, c), -_conv(c), c["code"]))
    out += [{"code": c["code"], "kind": "like", "shared": shared_traits(a_lv, levels.get(c["code"]))} for c in same]
    # Another business only when its own has no strong match: "like GP"
    # should mean a phone company first, not any big payer (a bank led to a
    # drug maker on 18 Nov data while strong banks were there).
    if not same and len(traits(a_lv)) >= OTHER_MIN_SHARED:
        other = [c for c in cands if c.get("sector") != sec
                 and len(shared_traits(a_lv, levels.get(c["code"]))) >= OTHER_MIN_SHARED]
        other.sort(key=lambda c: (-len(shared_traits(a_lv, levels.get(c["code"]))), _size_gap(a, c),
                                  -_conv(c), c["code"]))
        out += [{"code": c["code"], "kind": "like_other", "shared": shared_traits(a_lv, levels.get(c["code"]))}
                for c in other]
    return out


def gaps(prof: dict, facts: dict[str, dict], levels: dict[str, dict], cands: list[dict]) -> list[dict]:
    """Gaps in the reader's own money, each with the companies that fill it.
    ``prof`` = ``recommend.build_profile`` of their holdings and follows."""
    out = []
    held = prof["held"]
    if not held:
        return out
    sectors = prof["sectors"]
    top = max(sectors.items(), key=lambda kv: kv[1]["pct"], default=(None, {"pct": 0.0}))
    held_sectors = {(facts.get(c) or {}).get("sector") for c in held}
    if top[0] and top[1]["pct"] > rc.HEAVY_PCT:
        fill = [c for c in cands if c.get("sector") and c.get("sector") not in held_sectors]
        fill.sort(key=lambda c: (-_conv(c), c["code"]))
        # The best of each new business first, so two picks bring two businesses.
        seen: set = set()
        first = [c for c in fill if not (c["sector"] in seen or seen.add(c["sector"]))]
        fill = first + [c for c in fill if c not in first]
        out.append({"key": "new_business", "sector": top[0], "pct": top[1]["pct"],
                    "ties": [{"code": c["code"], "kind": "new_business", "shared": []} for c in fill]})
    if len(held) >= PAYER_MIN_SHARES and not any((levels.get(c) or {}).get("dividends") for c in held):
        fill = [c for c in cands if ((levels.get(c["code"]) or {}).get("dividends") or 0) >= 2]
        fill.sort(key=lambda c: (-(_n(c.get("div_yield_pct")) or 0.0), -_conv(c), c["code"]))
        out.append({"key": "steady_payer", "n_held": len(held),
                    "ties": [{"code": c["code"], "kind": "steady_payer", "shared": []} for c in fill]})
    return out


# ---------------------------------------------------------------------------
# 3. Selection
# ---------------------------------------------------------------------------

def select(groups: list[dict], by_code: dict[str, dict], prof: dict, n: int = N_PICKS) -> list[dict]:
    """Groups take turns, best tie first; each company once (the first share
    that leads to it keeps it). Returns the groups with ``picks`` filled."""
    used, per_sector, fin = set(), {}, 0
    for g in groups:
        g["picks"] = []
        g["_i"] = 0
    total = 0
    progress = True
    while total < n and progress:
        progress = False
        for g in groups:
            if total >= n:
                break
            cap = GAP_PICKS if g["rel"] == "gap" else PER_ANCHOR
            if len(g["picks"]) >= cap:
                continue
            while g["_i"] < len(g["ties"]):
                t = g["ties"][g["_i"]]
                g["_i"] += 1
                c = by_code.get(t["code"])
                if not c or t["code"] in used:
                    continue
                sec = c.get("sector") or ""
                is_fin = (c.get("sector_class") or "GENERAL") in _FINANCIAL
                # No "too much of your money in one business" cut here: this
                # is a list to watch, not to buy, and the reader asked to see
                # companies like theirs. The gap group adds other businesses.
                if sec and per_sector.get(sec, 0) >= rc.SECTOR_CAP:
                    continue
                if is_fin and fin >= rc.FINANCIAL_CAP:
                    continue
                g["picks"].append(t)
                used.add(t["code"])
                per_sector[sec] = per_sector.get(sec, 0) + 1
                fin += 1 if is_fin else 0
                total += 1
                progress = True
                break
    for g in groups:
        g.pop("_i", None)
    return [g for g in groups if g["picks"]]


# ---------------------------------------------------------------------------
# 4. What each group and pick says
# ---------------------------------------------------------------------------

def group_line(g: dict, facts: dict[str, dict]) -> dict:
    """The reason a free reader sees: about their own share, never a pick's name."""
    kinds = [p["kind"] for p in g["picks"]]
    total = len(kinds)
    if g["rel"] == "gap":
        if g["key"] == "new_business":
            pct = _r(g["pct"], 0)
            sec_bn = rc._sector_bn_name(g["sector"])
            head = ((f"All of your money is in the {g['sector']} sector. ", f"আপনার সব টাকা {sec_bn} সেক্টরে। ")
                    if g["pct"] >= 99.5
                    else (f"{pct}% of your money is in the {g['sector']} sector. ",
                          f"আপনার টাকার {pct}% {sec_bn} সেক্টরে। "))
            return _pt(head[0] + f"We found {total} strong {_companies(total)} in a business you don't own yet.",
                       head[1] + f"যে ব্যবসায় আপনার কোনো শেয়ার নেই, সেখানে {total}টি শক্তিশালী কোম্পানি পেয়েছি।")
        k = g["n_held"]
        return _pt(f"None of your {k} shares has paid a cash dividend in each of the last 5 years. "
                   f"We found {total} strong {_companies(total)} that {'has' if total == 1 else 'have'}.",
                   f"আপনার {k}টি শেয়ারের কোনোটিই গত 5 বছরের প্রতি বছর নগদ ডিভিডেন্ড দেয়নি। "
                   f"এমন {total}টি শক্তিশালী কোম্পানি পেয়েছি, যারা দিয়েছে।")

    code = g["anchor"]
    a = facts.get(code) or {}
    w_en, w_bn = _we_grade(code, a)
    if "stronger" in kinds:
        _strong, weak = _checks(a)
        if weak and group_words(a):
            grade = (f"{w_en}: weak on {_join([_CHECK[k][0] for k in weak])}. ",
                     f"{w_bn}; {_join_loc(weak)} দুর্বল। ")
        else:
            grade = (f"{w_en}. ", f"{w_bn}। ")
        found = (f"We found {total} stronger {_companies(total)} in the same business.",
                 f"একই ব্যবসায় এর চেয়ে শক্তিশালী {total}টি কোম্পানি পেয়েছি।")
    else:
        grade = (f"{w_en}. ", f"{w_bn}। ")
        same, other = kinds.count("like"), kinds.count("like_other")
        if same and other:
            found = (f"We found {total} companies like it: {same} in the same business and {other} in "
                     f"{'another business' if other == 1 else 'other businesses'}.",
                     f"এর মতো {total}টি কোম্পানি পেয়েছি: {same}টি একই ব্যবসায়, {other}টি অন্য ব্যবসায়।")
        elif same:
            found = (f"We found {total} {_companies(total)} like it in the same business.",
                     f"একই ব্যবসায় এর মতো {total}টি কোম্পানি পেয়েছি।")
        else:
            found = (f"We found {total} {_companies(total)} like it in "
                     f"{'another business' if total == 1 else 'other businesses'}.",
                     f"অন্য ব্যবসায় এর মতো {total}টি কোম্পানি পেয়েছি।")
    # The page's heading already says which share and how ("Because you
    # looked at RENATA on 3 days"); the line says what we found.
    return _pt(grade[0] + found[0], grade[1] + found[1])


def pick_words(t: dict, g: dict, c: dict, facts: dict[str, dict], lv: Optional[dict]) -> dict:
    """{tag_en, tag_bn, why_en, why_bn, chips, chips_label} for one pick.

    The sentence and the ticks never say the same thing (2026-11-18, user:
    the cards read cluttered): a "like" sentence names the share and the
    ticks say what they have in common; a "stronger" sentence says it all,
    so it has no ticks."""
    code, kind = c["code"], t["kind"]
    label = None
    p_en, p_bn = group_words(c) or ("graded", "গ্রেড করা")  # every pick is graded (the gate)
    if kind == "stronger":
        a = g["anchor"]
        a_f = facts.get(a) or {}
        _a_strong, a_weak = _checks(a_f)
        p_strong, _p_weak = _checks(c)
        better = [k for k in a_weak if k in p_strong]
        tag = (f"Stronger than {a}", f"{a}-এর চেয়ে শক্তিশালী")
        if better:
            names = [_CHECK[k][0] for k in a_weak]
            if better == a_weak:
                on_en = {1: f"on {names[0]}", 2: "on both", 3: "on all three", 4: "on all four"}[len(better)]
                on_bn = {1: _join_loc(better), 2: "দুটিতেই", 3: "তিনটিতেই", 4: "চারটিতেই"}[len(better)]
            else:
                on_en, on_bn = "on " + _join([_CHECK[k][0] for k in better]), _join_loc(better)
            why = (f"Same business as {a}. {a} is weak on {_join(names)}; {code} is strong {on_en}.",
                   f"{a}-এর একই ব্যবসা। {a} {_join_loc(a_weak)} দুর্বল; {code} {on_bn} শক্তিশালী।")
        else:
            w_en, w_bn = _we_grade(a, a_f)
            why = (f"Same business as {a}. {w_en}; we grade {code} {p_en}.",
                   f"{a}-এর একই ব্যবসা। {w_bn}; আর {code} {p_bn}।")
        chips = []
    elif kind in ("like", "like_other"):
        a = g["anchor"]
        rel_en, rel_bn = REL[g["rel"]]
        shared = t.get("shared") or []
        tag = (f"Like {a}", f"{a}-এর মতো")
        if kind == "like":
            if shared:
                why = (f"Same business as {a}, {rel_en}.", f"{rel_bn} {a}-এর একই ব্যবসা।")
            else:
                why = (f"Same business as {a}, {rel_en}, and we grade {code} {p_en}.",
                       f"{rel_bn} {a}-এর একই ব্যবসা, আর আমাদের গ্রেডে {code} {p_bn}।")
        else:
            sec = c.get("sector") or ""
            sec_bn = c.get("sector_bn") or rc._sector_bn_name(sec)
            why = (f"Like {a}, {rel_en}, in a different business: {sec}.",
                   f"{rel_bn} {a}-এর মতো, তবে ভিন্ন ব্যবসা: {sec_bn}।")
        chips = _trait_chips(shared)[:3]
        if chips:
            label = _pt(f"In common with {a}", f"{a}-এর সাথে মিল")
    elif kind == "new_business":
        sec = c.get("sector") or ""
        sec_bn = c.get("sector_bn") or rc._sector_bn_name(sec)
        tag = ("New business for you", "আপনার জন্য নতুন ব্যবসা")
        why = (f"A business none of your shares are in: {sec}. We grade {code} {p_en}.",
               f"এমন ব্যবসা, যেখানে আপনার কোনো শেয়ার নেই: {sec_bn}। আমাদের গ্রেডে {code} {p_bn}।")
        chips = _trait_chips(traits(lv))[:3]
        if chips:
            label = _pt("What stands out", "যা চোখে পড়ে")
    else:  # steady_payer
        y = _n(c.get("div_yield_pct"))
        tag = ("Pays cash every year", "প্রতি বছর নগদ দেয়")
        if y:
            why = (f"{code} has paid a cash dividend in each of the last 5 years, about {_r(y)}% a year on today's price.",
                   f"{code} গত 5 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে, আজকের দামে বছরে প্রায় {_r(y)}%।")
        else:
            why = (f"{code} has paid a cash dividend in each of the last 5 years.",
                   f"{code} গত 5 বছরের প্রতি বছর নগদ ডিভিডেন্ড দিয়েছে।")
        chips = []
    return {"tag_en": tag[0], "tag_bn": tag[1], "why_en": why[0], "why_bn": why[1], "chips": chips,
            "chips_label": label}


def pick_item(t: dict, g: dict, c: dict, facts: dict[str, dict], lv: Optional[dict]) -> dict:
    return {
        "code": c["code"], "name": c.get("name"), "sector": c.get("sector"),
        "sector_bn": c.get("sector_bn") or rc._sector_name_bn(c.get("sector")),
        "price": _n(c.get("ltp")), "change_pct": _n(c.get("change_pct")),
        "score": _n(c.get("score")), "tier": tier_key(_n(c.get("score"))),
        "group": _pt(*rc.group_words(c)),
        "strong": tier_key(_n(c.get("score"))) == "excellent",
        "kind": t["kind"], "anchor": g.get("anchor"), "rel": g["rel"], "group_key": g["key"],
        **pick_words(t, g, c, facts, lv),
        "conviction": _n(c.get("conviction")),
        "new": False,
    }


def group_out(g: dict, facts: dict[str, dict]) -> dict:
    a = (facts.get(g["anchor"]) or {}) if g.get("anchor") else {}
    return {
        "key": g["key"], "rel": g["rel"], "anchor": g.get("anchor"),
        "anchor_name": a.get("name"),
        "days": g.get("days"),
        "line": group_line(g, facts),
        "n": len(g["picks"]),
        "codes": [p["code"] for p in g["picks"]],
        # A free reader sees each hidden pick's business, never its name.
        "sectors": [_pt((facts.get(p["code"]) or {}).get("sector") or "",
                        rc._sector_bn_name((facts.get(p["code"]) or {}).get("sector"))) for p in g["picks"]],
    }


def build(mine: list[dict], reads: list[dict], cands: list[dict], facts: dict[str, dict],
          levels: dict[str, dict], prof: dict, n: int = N_PICKS) -> tuple[list[dict], list[dict]]:
    """(groups, items). ``cands`` = today's explore-pool candidates with the
    Buy List, the reader's own shares and hidden ones already left out."""
    by_code = {c["code"]: c for c in cands}
    groups = []
    for a in anchors(mine, reads, facts):
        groups.append({"key": a["code"], "rel": a["rel"], "anchor": a["code"], "days": a.get("days"),
                       "ties": ties(a, cands, facts, levels)})
    for gp in gaps(prof, facts, levels, cands):
        groups.append({**gp, "rel": "gap", "anchor": None, "days": None})
    chosen = select(groups, by_code, prof, n)
    items = [pick_item(t, g, by_code[t["code"]], facts, levels.get(t["code"])) for g in chosen for t in g["picks"]]
    return [group_out(g, facts) for g in chosen], items


def starter(cands: list[dict], levels: dict[str, dict], n: int = STARTER_N) -> list[dict]:
    """Strong, well-known companies to start with: big ones first, one a
    sector, at most two banks / finance / insurers. Free for every reader."""
    ranked = sorted(cands, key=lambda c: (-((levels.get(c["code"]) or {}).get("trading") or 0), -_conv(c), c["code"]))
    out, sectors, fin = [], set(), 0
    for c in ranked:
        if len(out) >= n:
            break
        sec = c.get("sector") or ""
        is_fin = (c.get("sector_class") or "GENERAL") in _FINANCIAL
        if sec in sectors or (is_fin and fin >= STARTER_FINANCIALS):
            continue
        lv = levels.get(c["code"])
        en, bn, _said = rc._top_why(c, lv, explore=True)
        kws = rc.keywords(c, lv, explore=True)
        out.append({
            "code": c["code"], "name": c.get("name"), "sector": c.get("sector"),
            "sector_bn": c.get("sector_bn") or rc._sector_name_bn(c.get("sector")),
            "price": _n(c.get("ltp")), "change_pct": _n(c.get("change_pct")),
            "score": _n(c.get("score")), "tier": tier_key(_n(c.get("score"))),
            "group": _pt(*rc.group_words(c)), "strong": tier_key(_n(c.get("score"))) == "excellent",
            "kind": "starter", "anchor": None, "rel": None, "group_key": None,
            "tag_en": kws[0]["en"], "tag_bn": kws[0]["bn"], "why_en": en, "why_bn": bn,
            "chips": kws[1:3], "conviction": _n(c.get("conviction")), "new": False,
        })
        sectors.add(sec)
        fin += 1 if is_fin else 0
    return out


# ---------------------------------------------------------------------------
# "Not for me"
# ---------------------------------------------------------------------------

def hidden_codes(entries: Optional[list], now: datetime) -> set[str]:
    out = set()
    for e in entries or []:
        until = e.get("until") if isinstance(e, dict) else None
        if e.get("code") and isinstance(until, datetime) and _naive(until) > _naive(now):
            out.add(e["code"])
    return out


def hide(entries: Optional[list], code: str, now: datetime, days: int = HIDE_DAYS) -> list[dict]:
    """Hide one company for ``days``; expired entries drop, newest kept."""
    keep = [e for e in (entries or []) if isinstance(e, dict) and e.get("code") != code
            and e.get("code") in hidden_codes([e], now)]
    keep.append({"code": code, "until": now + timedelta(days=days)})
    return keep[-HIDE_MAX:]


def unhide(entries: Optional[list], code: str) -> list[dict]:
    return [e for e in (entries or []) if isinstance(e, dict) and e.get("code") != code]


def counts(items: list[dict]) -> dict:
    return {"total": len(items),
            "new": sum(1 for i in items if i.get("new")),
            "own": 0,
            "strong": sum(1 for i in items if i.get("strong"))}
