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
    adj = []
    for year, v in points:
        val = _num(v)
        f = factor_for(factors, year, month)
        if val and val > 0 and f:
            adj.append(val / f)
    if len(adj) < USUAL_MIN_YEARS:
        return None
    return statistics.median(adj)


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
