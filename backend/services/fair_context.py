"""The inputs that make the fair price steadier and fairer (2026-11-22, review of
the fair-price estimate; pure, tests in backend/tests/test_fair_context.py).

Three rules, each one answering a weakness the review measured on live data:

1. **Steadier profit** (``steady_eps``). The P/E methods multiplied a usual
   P/E by the latest 12 months' profit a share, so a one-off year moved the
   fair price one for one (96 of 224 companies had a latest profit more than
   50% away from the middle of the three years before). A jump above
   ``JUMP_FREE`` x the middle of the last three audited years counts at half
   weight, and nothing past ``JUMP_MAX`` counts at all. A FALL counts in full:
   we never assume lower profit will come back.

2. **Its usual price, in today's market** (``market_factors`` +
   ``usual_today``). The company's own year-end P/Es came from only three
   year-ends for most companies, and those include 2021-22, when strong DSE
   companies traded at 17-20 times profit against about 13 today, with a bank
   deposit now paying 10.5%. Each year-end is put on today's footing by how
   much the market's strong companies were re-priced since: for every strong,
   non-Z company with that year-end, its year-end P/E over its P/E today; the
   middle of those is the year's factor. A company that usually traded 20%
   above its peers still does; the 2021 market level drops out.

3. **Cleaner similar companies** (``peer_ratios``). The sector middle P/E
   counted thinly traded shares whose P/E is high only because their profit is
   tiny (Engineering 32.7, Food 31.4), and a small sector fell back to the
   whole market's 21.6. Peers are now the same DSE sector, profitable today,
   not Z, accounts not stale, trading at least ``PEER_MIN_TURNOVER_MN`` a day,
   and of a similar size when enough are; with fewer than
   ``PEER_MIN_COUNT``, there is no similar-companies estimate at all.
"""
from __future__ import annotations

import math
import statistics
from typing import Iterable, Optional

# --- 1. Steadier profit -------------------------------------------------------

# Up to this many times the middle of the last three years, the latest profit
# counts in full (ordinary growth).
JUMP_FREE = 1.25
# Above JUMP_FREE, each step counts at this weight...
JUMP_WEIGHT = 0.5
# ...and nothing past this many times the middle counts at all.
JUMP_MAX = 2.0
# Years of audited profit the middle is taken over.
STEADY_YEARS = 3


def _num(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if (math.isnan(f) or math.isinf(f)) else f


def steady_eps(eps, history: Iterable) -> tuple[Optional[float], Optional[str]]:
    """(profit a share the fair price uses, why it differs or None).

    ``eps`` is the latest 12 months (TTM when a quarter is out); ``history``
    the audited yearly figures, oldest first, on today's share count. The
    result moves continuously with ``eps`` (no step where the rule kicks in),
    so a small change in profit never makes the fair price jump."""
    e = _num(eps)
    if e is None or e <= 0:
        return None, None
    hist = [h for h in (_num(x) for x in history) if h is not None][-STEADY_YEARS:]
    if len(hist) < 2:
        return e, None
    mid = statistics.median(hist)
    if mid <= 0:
        return e, None  # back to a profit after losses: nothing steady to lean on
    r = e / mid
    if r <= JUMP_FREE:
        return e, None
    used = mid * (JUMP_FREE + JUMP_WEIGHT * (min(r, JUMP_MAX) - JUMP_FREE))
    return used, "jump"


# --- 2. Its usual price, in today's market ------------------------------------

# A year's factor needs this many strong companies with that year-end.
FACTOR_MIN_COMPANIES = 8
# A factor outside these bounds is a data problem, not a market move.
FACTOR_MIN, FACTOR_MAX = 0.4, 2.5
# Its usual price needs this many year-ends on today's footing (as the score's
# own-history rule, scoring_service.MIN_OWN_YEARS).
USUAL_MIN_YEARS = 3


def market_factors(points: Iterable[tuple[int, Optional[int], float, float]]) -> dict:
    """``{"by_month": {(year, month): f}, "by_year": {year: f}}``.

    ``points`` = (fiscal year, year-end month, its year-end ratio, its ratio
    today) for each strong, non-Z company and year. ``f`` = the middle of
    year-end / today: 1.5 means strong companies traded at 1.5x today's level
    at that year-end. A (year, month) with too few companies falls back to the
    whole year."""
    by_key: dict[tuple[int, Optional[int]], list[float]] = {}
    by_year: dict[int, list[float]] = {}
    for year, month, then, now in points:
        t, n = _num(then), _num(now)
        if not t or not n or t <= 0 or n <= 0:
            continue
        q = t / n
        by_key.setdefault((int(year), month), []).append(q)
        by_year.setdefault(int(year), []).append(q)

    def mid(vals: list[float]) -> Optional[float]:
        if len(vals) < FACTOR_MIN_COMPANIES:
            return None
        return max(FACTOR_MIN, min(FACTOR_MAX, statistics.median(vals)))

    out_key = {k: f for k, v in by_key.items() if (f := mid(v)) is not None}
    out_year = {k: f for k, v in by_year.items() if (f := mid(v)) is not None}
    return {"by_month": out_key, "by_year": out_year}


def factor_for(factors: Optional[dict], year: int, month: Optional[int]) -> Optional[float]:
    if not factors:
        return None
    f = (factors.get("by_month") or {}).get((int(year), month))
    if f is None:
        f = (factors.get("by_year") or {}).get(int(year))
    return f


def usual_today(points: Iterable[tuple[int, float]], month: Optional[int],
                factors: Optional[dict]) -> Optional[float]:
    """The middle of its year-end ratios, each divided by the market's factor
    for that year-end; None with fewer than USUAL_MIN_YEARS on today's footing
    (the caller then keeps the plain usual figure)."""
    return usual_today_n(points, month, factors)[0]


def usual_today_n(points: Iterable[tuple[int, float]], month: Optional[int],
                  factors: Optional[dict]) -> tuple[Optional[float], int]:
    """``usual_today`` and how many year-ends it rests on."""
    adj = []
    for year, v in points:
        val = _num(v)
        f = factor_for(factors, year, month)
        if val and val > 0 and f:
            adj.append(val / f)
    if len(adj) < USUAL_MIN_YEARS:
        return None, len(adj)
    return statistics.median(adj), len(adj)


# --- 3. Cleaner similar companies ---------------------------------------------

# A peer trades at least this much a day (৳ million; ৳10 lakh = 1.0), the same
# line the screener and the recommendation gate use (research_lists.TRADED).
PEER_MIN_TURNOVER_MN = 1.0
# Fewer peers than this and there is no similar-companies estimate.
PEER_MIN_COUNT = 5
# "Similar size" = market value within this factor either way.
PEER_SIZE_FACTOR = 5.0
# DSE groups with no common business are never a peer group.
NO_PEER_SECTORS = {"Miscellaneous"}


def peer_pool(rows: Iterable[dict], turnover: Optional[dict] = None) -> dict[str, list[dict]]:
    """{sector: [{code, pe, pb, mcap}]} of the companies that may stand as
    someone's peer: profitable today, not Z, accounts not stale and, when the
    trading figures are there, trading at least PEER_MIN_TURNOVER_MN a day."""
    pool: dict[str, list[dict]] = {}
    for r in rows:
        sector = r.get("sector")
        if not sector or sector in NO_PEER_SECTORS:
            continue
        if str(r.get("market_cat") or "").upper() == "Z" or r.get("stale_data") is True:
            continue
        pe, pb = _num(r.get("current_pe")), _num(r.get("current_pb"))
        if not pe or pe <= 0:
            continue
        if turnover is not None:
            t = _num(turnover.get(r.get("trading_code")))
            if t is None or t < PEER_MIN_TURNOVER_MN:
                continue
        pool.setdefault(sector, []).append({
            "code": r.get("trading_code"), "pe": pe,
            "pb": pb if pb and pb > 0 else None, "mcap": _num(r.get("mcap_mn")),
        })
    return pool


def peer_ratios(code: str, sector: Optional[str], mcap, pool: dict[str, list[dict]]) -> dict:
    """{"pe", "pb", "n", "sized"}: the middle P/E and P/B of its peers —
    similar-size ones when PEER_MIN_COUNT of them exist, else the whole
    sector's — or Nones when the sector has too few."""
    out = {"pe": None, "pb": None, "n": 0, "sized": False}
    others = [p for p in pool.get(sector or "", []) if p["code"] != code]
    m = _num(mcap)
    group = others
    if m and m > 0:
        sized = [p for p in others
                 if p["mcap"] and m / PEER_SIZE_FACTOR <= p["mcap"] <= m * PEER_SIZE_FACTOR]
        if len(sized) >= PEER_MIN_COUNT:
            group, out["sized"] = sized, True
    if len(group) < PEER_MIN_COUNT:
        return out
    out["n"] = len(group)
    out["pe"] = statistics.median(p["pe"] for p in group)
    pbs = [p["pb"] for p in group if p["pb"]]
    out["pb"] = statistics.median(pbs) if len(pbs) >= PEER_MIN_COUNT else None
    return out


# --- 4. How sure we are, and the range that follows (2026-11-22, phase 1) -----
#
# The range used to be the methods' spread capped at ±20% (129 of 271 at the
# cap), and "the estimates disagree" hid it for 26 of the 63 strong companies.
# Now each estimate carries a confidence from what it rests on, the range is
# at least as wide as that confidence allows, and the valuation score reads
# the price against that range: a price under the range's low edge is a low
# price, so a share we know less about must fall further before it is called
# cheap.

# Half-width of the range by confidence (the floor; a wider spread of the
# methods widens it up to RANGE_MAX).
RANGE_BASE = {"high": 0.08, "medium": 0.12, "low": 0.18}
RANGE_MAX = 0.25
# How much of the methods' spread past the floor widens the range: the spread
# already lowered the confidence, so it counts only a quarter on top of it
# (in full, half the strong companies sat at the cap and none was cheap).
RANGE_SPREAD_SHARE = 0.25
# Own-history year-ends on today's footing for the full point (the window is
# five years less the floor-price ones, so 4 is a long history here).
CONF_LONG_HISTORY = 4
# Profit steadiness (scoring's peak-to-trough eps_stability, 0..1).
CONF_STEADY = 0.75
CONF_UNSTEADY = 0.45
# Share of the figures we have (data_completeness) below which we know less.
CONF_THIN_DATA = 0.6


def confidence(n_methods: int, spread: float, own_years: int, has_own_pe: bool,
               eps_stability, eps_jump: bool, completeness, stale: bool) -> tuple[str, list[str]]:
    """("high" | "medium" | "low", the reasons in keys).

    Points: methods that agree (3+ within 30% of the centre +2, 2+ within 50%
    +1), a long own history (+1; no own P/E at all -1), steady profit (+1;
    unsteady -1), thin or old accounts (-1). 3+ points = high, 1-2 = medium,
    else low. One method alone is always low. A profit jump is not counted
    here: the steadier profit already takes most of it out of the centre
    (``eps_jump`` only adds the reason)."""
    why: list[str] = []
    if n_methods < 2:
        return "low", ["one_method"]
    pts = 0
    if n_methods >= 3 and spread < 0.30:
        pts += 2
        why.append("methods_agree")
    elif spread < 0.50:
        pts += 1
        why.append("methods_close")
    else:
        why.append("methods_apart")
    if not has_own_pe:
        pts -= 1
        why.append("no_own_history")
    elif own_years >= CONF_LONG_HISTORY:
        pts += 1
        why.append("long_history")
    st = _num(eps_stability)
    if st is not None and st >= CONF_STEADY:
        pts += 1
        why.append("steady_profit")
    elif st is not None and st < CONF_UNSTEADY:
        pts -= 1
        why.append("unsteady_profit")
    if eps_jump:
        why.append("profit_jump")
    dc = _num(completeness)
    if stale or (dc is not None and dc < CONF_THIN_DATA):
        pts -= 1
        why.append("thin_data")
    level = "high" if pts >= 3 else "medium" if pts >= 1 else "low"
    return level, why


def range_half_width(level: str, dispersion: float) -> float:
    """The range's half-width (a fraction of the centre): the confidence's
    floor, widened by a share of the methods' own spread past it, up to
    RANGE_MAX."""
    base = RANGE_BASE.get(level, RANGE_BASE["low"])
    d = _num(dispersion) or 0.0
    return min(RANGE_MAX, base + RANGE_SPREAD_SHARE * max(0.0, d - base))


# --- 5. Earning power behind the assets estimate --------------------------------

# The usual price on assets is scaled by how today's return on its assets
# compares with its usual one — never up, and never below this.
BOOK_SCALE_MIN = 0.5


def book_scale(roe_now, roe_usual) -> Optional[float]:
    """(today's profit per ৳ of assets) / (its usual) between BOOK_SCALE_MIN
    and 1, or None without both. A company that used to trade at 3x its assets
    while earning 20% on them is not worth 3x when it earns 8% (WALTONHIL's
    assets estimate sat 2.6x its price)."""
    now, usual = _num(roe_now), _num(roe_usual)
    if now is None or usual is None or usual <= 0:
        return None
    if now <= 0:
        return BOOK_SCALE_MIN
    return max(BOOK_SCALE_MIN, min(1.0, now / usual))


# --- 6. The valuation score from the price and the range ------------------------

# The score at the centre, and per range-width under it: the range's low edge
# is CHEAP_P4 (7.0, a low price) and its high edge EXPENSIVE_P4 (4.0), the
# signal's own lines (test_agreement pins them).
P4_AT_CENTRE = 5.5
P4_PER_RANGE = 1.5

# A bank deposit, the safe alternative to a share (moved here from the stock
# report 2026-11-22; updated by hand).
FDR_RATE_PCT = 10.5
FDR_RATE_AS_OF = "2026-11"
FDR_TAX_PCT = 10.0
DIV_TAX_PCT = 10.0
# A share that earns clearly less than the deposit pays after tax (under
# DEPOSIT_SHARE of it: P/E over about 12.5), pays less in cash than the
# deposit, and isn't growing its profit (the profit-growth part under this,
# about 3% a year) is never a low price: its score stops just short of
# CHEAP_P4. "Clearly": GP earning 9.4% against the deposit's 9.45% is no
# reason to call it dear.
DEPOSIT_GROWTH_SCORE = 4.0
DEPOSIT_SHARE = 0.85
DEPOSIT_CAP_P4 = 6.9
# P/E lines the score never rises past (scoring_service.PE_CEILINGS, the same).
PE_CEILINGS = ((40.0, 1.0), (25.0, 4.0))


def deposit_net_pct() -> float:
    return FDR_RATE_PCT * (1 - FDR_TAX_PCT / 100.0)


def p4_on_fair(price, centre, half_width, eps_now=None, eps_used=None, dps=None,
               growth_score=None) -> tuple[Optional[float], Optional[str]]:
    """(valuation score 0..10 at ``price``, the cap that held it or None).

    5.5 at the centre, +1.5 for each range half-width under it (7.0 at the
    low edge, 4.0 at the high edge). A loss in the latest results (``eps_now``
    <= 0) has no score to give: 0. Caps: the P/E ceilings, and the deposit
    rule above."""
    p, c, w = _num(price), _num(centre), _num(half_width)
    if not p or p <= 0 or not c or c <= 0 or not w or w <= 0:
        return None, None
    e = _num(eps_now)
    if e is not None and e <= 0:
        return 0.0, "loss"
    gap = 1.0 - p / c
    score = max(0.0, min(10.0, P4_AT_CENTRE + P4_PER_RANGE * gap / w))
    cap_key = None
    if e is not None and e > 0:
        pe = p / e
        for line, cap in PE_CEILINGS:
            if pe > line:
                if score > cap:
                    score, cap_key = cap, "pe_ceiling"
                break
    used = _num(eps_used) if _num(eps_used) else e
    g = _num(growth_score)
    if used and used > 0 and g is not None and g < DEPOSIT_GROWTH_SCORE and score > DEPOSIT_CAP_P4:
        net = deposit_net_pct()
        earns = used / p * 100.0
        d = _num(dps)
        cash = d / p * 100.0 * (1 - DIV_TAX_PCT / 100.0) if d and d > 0 else 0.0
        if earns < net * DEPOSIT_SHARE and cash < net:
            score, cap_key = DEPOSIT_CAP_P4, "deposit"
    return score, cap_key


# --- 7. Confidence in plain words (2026-11-22, phase 4) ---------------------------

CONF_WORDS = {
    "high": ("We are fairly sure of this range", "এই সীমা নিয়ে আমরা বেশ নিশ্চিত"),
    "medium": ("We are reasonably sure of this range", "এই সীমা নিয়ে আমরা মোটামুটি নিশ্চিত"),
    "low": ("We are less sure of this range, so it is wider", "এই সীমা নিয়ে আমরা কম নিশ্চিত, তাই সীমাটি চওড়া"),
}
CONF_SHORT = {
    "high": ("Fairly sure", "বেশ নিশ্চিত"),
    "medium": ("Reasonably sure", "মোটামুটি নিশ্চিত"),
    "low": ("Less sure", "কম নিশ্চিত"),
}
# Each reason as a clause, good ones first in each list.
CONF_REASONS = {
    "methods_agree": ("our ways of working it out agree", "আমাদের হিসাবের উপায়গুলো একমত"),
    "methods_close": ("our ways of working it out mostly agree", "আমাদের হিসাবের উপায়গুলো মোটামুটি একমত"),
    "long_history": ("it has years of its own prices to go on", "এর নিজের কয়েক বছরের দামের হিসাব আছে"),
    "steady_profit": ("its profit has been steady", "এর মুনাফা স্থির ছিল"),
    "methods_apart": ("our ways of working it out point some way apart", "আমাদের হিসাবের উপায়গুলো কিছুটা আলাদা দিকে দেখায়"),
    "no_own_history": ("it has too little price history of its own", "এর নিজের দামের ইতিহাস কম"),
    "unsteady_profit": ("its profit has swung a lot", "এর মুনাফা অনেক ওঠানামা করেছে"),
    "profit_jump": ("its latest profit jumped, and we count only part of the jump",
                    "এর সর্বশেষ মুনাফা হঠাৎ বেড়েছে, আমরা তার একটি অংশই ধরেছি"),
    "thin_data": ("some of its figures are missing or old", "এর কিছু হিসাব নেই বা পুরোনো"),
    "one_method": ("only one way of working it out was possible", "হিসাবের একটিমাত্র উপায় পাওয়া গেছে"),
}


def confidence_words(level: Optional[str], why: Optional[Iterable[str]], max_reasons: int = 3) -> Optional[dict]:
    """``{level, word: {en, bn}, line: {en, bn}}``: how sure we are of a fair
    price, said plainly ("We are reasonably sure of this range: our ways of
    working it out mostly agree, and its profit has been steady."). None for
    an unknown level."""
    if level not in CONF_WORDS:
        return None
    keys = [k for k in (why or []) if k in CONF_REASONS][:max_reasons]
    head_en, head_bn = CONF_WORDS[level]
    if keys:
        en = [CONF_REASONS[k][0] for k in keys]
        bn = [CONF_REASONS[k][1] for k in keys]
        en_s = en[0] if len(en) == 1 else ", ".join(en[:-1]) + " and " + en[-1]
        bn_s = bn[0] if len(bn) == 1 else ", ".join(bn[:-1]) + " এবং " + bn[-1]
        line = {"en": f"{head_en}: {en_s}.", "bn": f"{head_bn}: {bn_s}।"}
    else:
        line = {"en": f"{head_en}.", "bn": f"{head_bn}।"}
    w_en, w_bn = CONF_SHORT[level]
    return {"level": level, "word": {"en": w_en, "bn": w_bn}, "line": line}
