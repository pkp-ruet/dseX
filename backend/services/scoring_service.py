"""
DSEF 5-pillar scoring algorithm.
Uses module-level TTL caches for query memoization.
"""
import logging
import math
import threading
import time
from datetime import datetime, timezone
import numpy as np
import pandas as pd
from pymongo import ASCENDING, ReplaceOne
from typing import Optional

from backend.services.db_service import (
    get_db, load_latest_prices, load_all_company_codes,
)
from utils.sector import normalize_sector

logger = logging.getLogger(__name__)



# ---------------------------------------------------------------------------
# Scoring helper — absolute 1–10 scale with linear interpolation
# ---------------------------------------------------------------------------

def _is_nanish(value) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and math.isnan(value):
        return True
    return False


def _score(value, anchors) -> float:
    """Linear interpolation between anchors. Returns 0.0 (not None) for missing data —
    NaN returns previously crashed downstream when multiplied by a weight."""
    if _is_nanish(value):
        return 0.0
    value = float(value)
    if value <= anchors[0][0]:
        return float(anchors[0][1])
    if value >= anchors[-1][0]:
        return float(anchors[-1][1])
    for i in range(len(anchors) - 1):
        v0, s0 = anchors[i]
        v1, s1 = anchors[i + 1]
        if v0 <= value <= v1:
            t = (value - v0) / (v1 - v0)
            return s0 + t * (s1 - s0)
    return float(anchors[-1][1])


def _median(vals: list[float]) -> float:
    """True median (averaging the two middle values for even-length input)."""
    return float(np.median(vals))


# ---------------------------------------------------------------------------
# Missing-data policy — per-pillar weight renormalization with a floor
# ---------------------------------------------------------------------------
#
# A sub-metric is None only when its INPUT DATA is absent (never scraped /
# disclosed). Present-but-bad data still scores 0.0 — negative equity, burning
# cash and a lost sector rank are signals, not gaps. The missing metric's
# weight is redistributed across the present ones, but only down to a floor:
# the weighted sum is divided by max(present_weight, 0.60), so a pillar backed
# by less than 60% of its designed weight keeps a proportional penalty (the
# renormalization boost is capped at 1/0.60 ≈ 1.67x). Without this, sparse-
# disclosure sectors (insurance, NBFIs, fresh listings) score as "worst
# possible" on metrics they never report — 0-fill made the largest DSE sector
# (insurance) look debt-distressed with no moat.

_RENORM_FLOOR = 0.60

# DSE market-category multiplier, applied to the final score like the
# staleness multiplier. Z (failed AGM / no dividend / operational distress) is
# the canonical value trap; B is mildly penalized. A multiplier rather than a
# hard gate: Z is ~a third of the universe and a genuinely recovering Z name
# should climb the watch list, not vanish. N (newly listed) is not a distress
# marker — no penalty. Unknown/blank categories get a mild haircut.
_CATEGORY_MULT = {"A": 1.00, "N": 1.00, "B": 0.90, "Z": 0.65}
_CATEGORY_MULT_DEFAULT = 0.95


def _weighted_pillar(metrics: list[tuple[Optional[float], float]]) -> tuple[float, float]:
    """Combine (score, weight) sub-metrics into a 0-10 pillar score.

    `metrics` must exclude not-applicable entries entirely (e.g. cash/assets
    for banks) — N/A neither penalizes nor counts toward coverage. Entries
    whose score is None (inputs missing) have their weight renormalized away,
    subject to the 0.60 floor above.

    Returns (pillar_score, coverage) where coverage in [0, 1] is the fraction
    of the applicable weight backed by present data.
    """
    applicable_w = sum(w for _, w in metrics)
    present = [(s, w) for s, w in metrics if s is not None]
    if not present or applicable_w <= 0:
        return 0.0, 0.0
    wsum = sum(w for _, w in present)
    raw = sum(s * w for s, w in present)
    return raw / max(wsum, _RENORM_FLOOR), wsum / applicable_w


# ---------------------------------------------------------------------------
# Algorithm 2 — DSE Fundamental Stock Scoring (5-pillar)
# ---------------------------------------------------------------------------

# Growth-curve anchors (annualized % change -> 0..10 score), consumed by the
# trajectory engine. Note: 0% growth maps to a low score by design — these reward
# growth, not mere survival (steady profitability is rewarded by the
# consistency/ROE metrics instead). A shrinking series scores BELOW the 0% mark.
_EPS_GROWTH_ANCHORS = [(-5, 0), (0, 2), (3, 4), (7, 6), (10, 8), (15, 10)]
_DPS_GROWTH_ANCHORS = [(-5, 0), (0, 3), (5, 6), (10, 8), (15, 10)]


def _a2_roe_score(roe_pct: float) -> float:
    return _score(roe_pct, [(0, 0), (5, 3), (10, 6), (15, 8), (20, 10)])


def _a2_de_score(de: float) -> float:
    """Industrial debt-to-equity (borrowings / equity). Banks and NBFIs never come
    here — their leverage is scored as a capital cushion by _a2_capital_score."""
    return _score(de, [(0, 10), (0.3, 10), (0.6, 8), (1.0, 6), (1.5, 3), (2.0, 0)])


def _a2_capital_score(equity_to_assets_pct: float) -> float:
    """Capital cushion for banks / NBFIs: equity as a % of total assets.

    The scraper's `total_debt` for a bank is borrowings only (deposits are not
    labelled as debt), so borrowings/equity sits near 1.0 for almost every bank
    and cannot separate a well-capitalised lender from a hollowed-out one. Equity
    over assets can: Basel's leverage floor is 3%, DSE's strong banks run 8-10%,
    and the distressed names sit at or below 2% (or negative)."""
    return _score(equity_to_assets_pct, [(2, 0), (5, 5), (7, 8), (9, 10)])


def _a2_ic_score(ic: float) -> float:
    return _score(ic, [(0, 0), (1.5, 2), (3, 5), (5, 8), (10, 10)])


def _a2_cash_assets_score(pct: float) -> float:
    return _score(pct, [(0, 2), (5, 5), (10, 7), (15, 10)])


def _a2_gm_score(avg_gm: float, trend: float) -> float:
    stable = abs(trend) <= 1.0
    if avg_gm > 30 and trend > 0:   return 10.0
    if avg_gm > 30 and stable:      return 8.0
    if avg_gm >= 15 and trend > 0:  return 7.0
    if avg_gm >= 15 and stable:     return 5.0
    return 2.0


def _a2_nim_score(avg_nim: float, trend: float) -> float:
    """Score Net Interest Margin (NII / earning assets, %) for banks and NBFIs.

    Continuous level curve plus a ±1 trend nudge. Calibrated to what the
    scraper actually produces (2026-09: bank median 1.6%, p90 3.1%) rather
    than to textbook 2.5-5% bands, which put half of all banks on a flat 2.0.
    A negative NII (distressed lender) lands on 0.
    """
    level = _score(avg_nim, [(0, 0), (1, 2), (2, 5), (3, 8), (4, 10)])
    if trend > 0.2:
        level += 1.0
    elif trend < -0.2:
        level -= 1.0
    return max(0.0, min(10.0, level))


def _a2_npm_score(avg_npm: float, trend: float) -> float:
    """Score net-profit margin level+trend — the insurer fallback when no
    gross-profit line exists. Thresholds sit at roughly half the gross-margin
    ones because net margin runs well below gross."""
    stable = abs(trend) <= 1.0
    if avg_npm > 15 and trend > 0:  return 10.0
    if avg_npm > 15 and stable:     return 8.0
    if avg_npm >= 8 and trend > 0:  return 7.0
    if avg_npm >= 8 and stable:     return 5.0
    return 2.0


def _effective_revenue(er: dict, is_financial: bool = False) -> Optional[float]:
    """Return usable revenue for a year-record.

    For banks/NBFIs, net_interest_income is the revenue equivalent when the
    standard 'revenue' line is absent from the income statement.
    """
    rev = er.get("revenue")
    if rev is not None and float(rev) > 0:
        return float(rev)
    if is_financial:
        nii = er.get("net_interest_income")
        if nii is not None and float(nii) > 0:
            return float(nii)
    return None


def _a2_rev_vol_score(growth_rates: list[float]) -> float:
    """Revenue steadiness from year-over-year growth rates (annualized %, one per
    consecutive pair of reported years).

    Two separate questions, so a shrinking business and an erratic one are no
    longer folded onto the same 1.0 floor:
      * mean growth < 0  -> scored on how fast sales are shrinking (max 3.0);
      * otherwise        -> scored on how bumpy the growth is (std of the rates),
                            with bands wide enough for a ~9-10% inflation economy
                            where nominal growth swings of 10-20 points are normal.
    """
    n = len(growth_rates)
    mean_g = sum(growth_rates) / n
    if mean_g < 0:
        return _score(mean_g, [(-10, 0), (0, 3)])
    std_g = (sum((g - mean_g) ** 2 for g in growth_rates) / n) ** 0.5
    return _score(std_g, [(5, 10), (10, 8), (20, 5), (35, 2), (50, 1)])


def _a2_capex_score(capex_rev_pct: float) -> float:
    """Score CapEx/Revenue ratio — sweet spot is 5-15% reinvestment."""
    if 5 <= capex_rev_pct <= 15:   return 10.0
    if 3 <= capex_rev_pct < 5:     return 7.0
    if 15 < capex_rev_pct <= 25:   return 6.0
    if capex_rev_pct < 3:          return 3.0
    return 2.0  # >25% — very capital intensive


def _a2_pe_pb_ratio_score(ratio: float) -> float:
    return _score(ratio, [(0.5, 10), (0.70, 10), (0.85, 8), (1.00, 6), (1.20, 4), (1.50, 1)])


def _a2_div_yield_score(yield_pct: float) -> float:
    return _score(yield_pct, [(0, 1), (1, 4), (3, 7), (5, 10)])


def _a2_payout_score(payout_pct: float) -> float:
    """Dividend affordability: cash DPS as a % of EPS (median of the last 3 paying
    years). Anything up to 60% of profit is comfortably covered; above 100% the
    company is paying out of reserves; a dividend declared on a loss-making year
    arrives here as a very large number and scores 0."""
    return _score(payout_pct, [(60, 10), (80, 7), (100, 4), (150, 0)])


# ---------------------------------------------------------------------------
# Trajectory quality — distinguish genuine *sustained* growth from a volatile
# "round-trip" (fell hard, then recovered to roughly the old level). Endpoint-to-
# endpoint CAGR rewarded both equally; this does not. See _trajectory_score.
# ---------------------------------------------------------------------------

def _earnings_stability(values: list, is_financial: bool = False) -> float:
    """Path smoothness of a metric series in [0, 1] (1.0 = steady, 0.0 = violent).

    Driven by the worst peak-to-trough drawdown — the 'big downfall' signal.
    Peak-to-trough (running peak, not consecutive years) so a slow slide such as
    10, 9, 8, 7, 6 registers as the 40% fall it is instead of four "normal" 10-15%
    dips. Drawdown (not a coefficient of variation) is used deliberately: it flags
    a fall-and-recover round-trip while leaving a healthy one-time *step up* alone
    (a step up has no drawdown). Banks/NBFIs get a wider tolerance band — their
    earnings swing on loan-loss provisioning, so a moderate dip is normal rather
    than alarming.
    """
    vals = [float(v) for v in values if not _is_nanish(v)]
    if len(vals) < 3:
        return 1.0  # too short to judge volatility — don't penalize
    max_dd = 0.0
    peak: Optional[float] = None
    for v in vals:
        if peak is None or v > peak:
            peak = v
        elif peak > 0 and v < peak:
            max_dd = max(max_dd, (peak - v) / peak)
    dd_tol  = 0.40 if is_financial else 0.25   # drawdown still considered "normal"
    dd_span = 0.40 if is_financial else 0.35   # extra drawdown beyond tol => fully unstable
    instability = min(max(0.0, max_dd - dd_tol) / dd_span, 1.0)
    return max(0.0, 1.0 - instability)


def _trajectory_score(pairs: list, anchors: list,
                      is_financial: bool = False,
                      turnaround_ok: bool = True,
                      penalize_volatility: bool = True) -> tuple:
    """Growth score that rewards a *sustained* rise, scores a shrinking series below
    flat, and penalizes a volatile path. Returns (score 0..10, stability 0..1).

    Growth rate = Theil-Sen slope of ln(value) against the fiscal year (the median of
    all pairwise log-slopes), annualized. Year-aware, so a missing year does not
    stretch or compress the rate, and robust to one freak year in five: a single
    spike or dip moves 4 of the 10 pairwise slopes and leaves the median alone,
    whereas endpoint CAGR or an OLS fit swing with it. A negative slope scores
    below the 0% anchor — a steady 10, 9, 8, 7, 6 is a decline, not "flat".

    Gate: a positive rate earns growth credit only when the current level is *held
    above where the series started* (the first value, or the median of the first two
    when there are 4+ points, whichever is higher). A fall-and-recover round-trip
    (10, 2, 10, 10, 10) ends where it began, so it gets no growth credit and the
    volatility penalty then pushes it below flat; a clean step-up (10, 10, 20, 20, 20)
    has no drawdown and keeps its full credit.

    Short histories are damped toward the neutral mark (2 points: half credit,
    3 points: three-quarters) — two data points cannot prove a trend either way.

    A series whose latest value is <= 0 earns nothing. One that *started* at or below
    zero and is profitable now gets a modest 5.0 (turnaround) rather than a CAGR
    fabricated off a non-positive base.

    penalize_volatility=False skips the instability scaling (used for dividends, where a
    lumpy-but-generous payout is a feature, not a risk — see the DPS call site).
    """
    pts = sorted(
        ((int(y), float(v)) for (y, v) in pairs
         if y is not None and not _is_nanish(y) and not _is_nanish(v)),
        key=lambda p: p[0],
    )
    vals = [v for _, v in pts]
    stability = _earnings_stability(vals, is_financial)
    n = len(pts)
    if n < 2:
        return 0.0, stability

    neutral = _score(0.0, anchors)  # the "no growth" mark for this metric

    if vals[-1] <= 0:
        level = 0.0  # loss-making now — no growth credit whatever the path
    elif vals[0] <= 0:
        level = 5.0 if turnaround_ok else neutral
    else:
        pos = [(y, v) for y, v in pts if v > 0]
        slopes = [
            (math.log(v1) - math.log(v0)) / (y1 - y0)
            for i, (y0, v0) in enumerate(pos)
            for (y1, v1) in pos[i + 1:]
            if y1 != y0
        ]
        if not slopes:
            level = neutral
        else:
            growth_pct = (math.exp(_median(slopes)) - 1.0) * 100.0
            if growth_pct > 0:
                early = vals[:2] if n >= 4 else vals[:1]
                start = max(vals[0], _median(early))
                current = sum(vals[-2:]) / 2 if n >= 4 else vals[-1]
                level = _score(growth_pct, anchors) if current > start else neutral
            else:
                level = _score(growth_pct, anchors)
            # Damp short histories toward neutral — 2-3 points can't prove a trend.
            if len(pos) == 2:
                level = neutral + (level - neutral) * 0.5
            elif len(pos) == 3:
                level = neutral + (level - neutral) * 0.75

    # Volatility penalty pushes a round-trip below flat. When exempt (dividends), only the
    # sustainability gate applies — lumpiness isn't punished, just denied growth credit.
    score = level * (0.4 + 0.6 * stability) if penalize_volatility else level
    return round(score, 4), round(stability, 4)


def _a2_pillar1(fin_last5: list[dict], ext_last5: list[dict],
                is_financial: bool = False) -> tuple[float, dict]:
    # Pair (year, eps) so CAGR and trend computations use real time, not list position
    eps_pairs = [
        (r["year"], r["eps"])
        for r in fin_last5
        if r.get("year") is not None and not _is_nanish(r.get("eps"))
    ]

    # m1: EPS consistency as a ratio of profitable years to reported years.
    # Scaled so a company with full history is rewarded more than one with short history,
    # but a perfect-record-with-3-years company isn't punished as harshly as before.
    consistent = sum(1 for _, e in eps_pairs if e > 0)
    total_years = len(eps_pairs)
    if total_years == 0:
        m1 = 0.0
    else:
        ratio = consistent / total_years
        if ratio == 1.0 and total_years >= 5:
            m1 = 10.0
        elif ratio == 1.0 and total_years >= 3:
            m1 = 8.0
        elif ratio >= 0.8:
            m1 = 7.0
        elif ratio >= 0.6:
            m1 = 5.0
        elif ratio >= 0.4:
            m1 = 3.0
        else:
            m1 = 0.0

    # m2: EPS trajectory — rewards a *sustained* rise, penalizes a volatile "round-trip".
    # Replaces endpoint-to-endpoint CAGR, which rewarded "fell then recovered to the old
    # level" identically to genuine growth. eps_stability is reused for the valuation pillar.
    m2, eps_stability = _trajectory_score(eps_pairs, _EPS_GROWTH_ANCHORS, is_financial)

    # m3: ROE averaged over the reported years in the 5-year window (up to 5), with a
    # first-half vs last-half trend bonus/penalty and a light volatility haircut.
    roe_vals = []
    roe_inputs_seen = False  # any year with both NP and equity reported
    for er in ext_last5:
        np_v = er.get("net_profit")
        eq_v = er.get("total_equity")
        if not _is_nanish(np_v) and not _is_nanish(eq_v):
            roe_inputs_seen = True
            if float(eq_v) > 0:
                roe_vals.append(float(np_v) / float(eq_v) * 100)
    if roe_vals:
        m3 = _a2_roe_score(sum(roe_vals) / len(roe_vals))
        if len(roe_vals) >= 4:
            half = len(roe_vals) // 2
            first_half = sum(roe_vals[:half]) / half
            last_half  = sum(roe_vals[-half:]) / half
            if last_half > first_half:
                m3 = min(m3 + 1.0, 10.0)
            elif last_half < first_half:
                m3 = max(m3 - 1.0, 0.0)
        # Gentle volatility haircut: erratic ROE shouldn't earn full marks even when its
        # average is high. ROE is a level/quality metric (and lumpy for high-payout names
        # where equity swings), so the penalty is light — capped at 25%.
        m3 = round(m3 * (0.75 + 0.25 * _earnings_stability(roe_vals, is_financial)), 4)
    elif roe_inputs_seen:
        m3 = 0.0   # reported, but equity non-positive — genuine distress, not a gap
    else:
        m3 = None  # extended financials never scraped — renormalize

    # m4: NPM trend slope using actual year on the x-axis (so year gaps don't distort slope)
    npm_pairs = []
    for er in ext_last5:
        np_v  = er.get("net_profit")
        rev_v = _effective_revenue(er, is_financial)
        yr    = er.get("year")
        if yr is not None and not _is_nanish(np_v) and rev_v is not None:
            npm_pairs.append((float(yr), float(np_v) / rev_v * 100))
    if len(npm_pairs) < 2:
        m4 = None  # can't fit a trend without 2+ profit/revenue years — renormalize
    else:
        x = np.array([p[0] for p in npm_pairs], dtype=float)
        y = np.array([p[1] for p in npm_pairs], dtype=float)
        slope = float(np.polyfit(x, y, 1)[0])
        if slope > 2:        m4 = 10.0
        elif slope > 0.5:    m4 = 7.0
        elif slope >= -0.5:  m4 = 5.0
        else:                m4 = 2.0

    # Reported eps_yoy uses the two most recent actual reports (handles year gaps correctly)
    eps_yoy = None
    if len(eps_pairs) >= 2:
        prev, curr = eps_pairs[-2][1], eps_pairs[-1][1]
        if prev and prev != 0:
            eps_yoy = round((curr - prev) / abs(prev) * 100, 1)

    # m1/m2 come from the DSE audited table (near-universal) — their absence is
    # itself damning, so they stay 0-filled and always count as present.
    score, coverage = _weighted_pillar(
        [(m1, 0.20), (m2, 0.30), (m3, 0.30), (m4, 0.20)]
    )
    return score, {"p1_eps_consist": m1, "p1_eps_cagr": m2, "p1_roe": m3, "p1_npm_trend": m4,
                   "p1_coverage": round(coverage, 3),
                   "eps_yoy_pct": eps_yoy, "eps_stability": round(eps_stability, 4)}


def _a2_pillar2(ext_last5: list[dict], is_financial: bool = False,
                is_insurance: bool = False) -> tuple[float, dict]:
    latest = ext_last5[-1] if ext_last5 else {}

    debt = latest.get("total_debt")
    eq   = latest.get("total_equity")
    ta   = latest.get("total_assets")
    m1_capital: Optional[float] = None
    if is_financial:
        # Banks / NBFIs: leverage is a capital cushion (equity / assets), not
        # borrowings / equity — see _a2_capital_score for why.
        m1 = None
        if not _is_nanish(eq) and not _is_nanish(ta) and float(ta) > 0:
            m1_capital = _a2_capital_score(float(eq) / float(ta) * 100)
        # else: balance-sheet totals never scraped — renormalize
    elif not _is_nanish(debt) and not _is_nanish(eq):
        # Negative equity is distress (0), not a data gap.
        m1 = _a2_de_score(float(debt) / float(eq)) if float(eq) > 0 else 0.0
    else:
        # No borrowings/equity lines scraped — common for insurers (typically
        # unlevered), so renormalize instead of scoring worst-leverage.
        m1 = None

    ebit    = latest.get("ebit")
    int_exp = latest.get("interest_expense")
    # Amarstock books expenses with a NEGATIVE sign for many issuers (ACI 2025:
    # interest -8.65bn against EBIT 10.1bn). A `> 0` test read that as "no
    # interest" and scored real 1.2x coverage as a debt-free 10 — use magnitude.
    ie = None if _is_nanish(int_exp) else abs(float(int_exp))
    debt_known = not _is_nanish(debt)
    has_debt = debt_known and float(debt) > 0
    if is_financial:
        # Interest is a lender's cost of goods, so EBIT / interest says nothing
        # about solvency. Not-applicable — excluded from the pillar entirely.
        m2 = None
    elif _is_nanish(ebit):
        m2 = None  # income-statement detail never scraped — renormalize
    elif ie is not None and ie > 0:
        if has_debt and ie < 0.005 * float(debt):
            # Interest under 0.5% of borrowings is not the real interest line
            # (a stray "finance cost" sub-item) — a gap, not 400x coverage.
            m2 = None
        else:
            m2 = _a2_ic_score(float(ebit) / ie)
    elif (ie == 0 and not has_debt) or (debt_known and not has_debt):
        # An explicit zero interest line with no borrowings on the books, or a
        # zero-borrowings balance sheet: genuinely debt-free if operating-profitable.
        m2 = 10.0 if float(ebit) > 0 else 0.0
    else:
        # Interest line missing (or a zero that contradicts real borrowings) — the
        # scraper simply didn't find the line. A data gap, never "debt-free":
        # this branch used to hand a free 10 to 88 companies, one of them with
        # borrowings at 73x equity. Renormalize.
        m2 = None

    ext_m3   = ext_last5[-4:]
    np_vals  = [er.get("net_profit") for er in ext_m3]
    cfo_vals = [er.get("operating_cf") for er in ext_m3]
    # Pair valid CFO/NP for ratio calculation
    cfo_np_ratios = []
    for cfo, np_v in zip(cfo_vals, np_vals):
        if not _is_nanish(cfo) and not _is_nanish(np_v) and float(np_v) > 0:
            cfo_np_ratios.append(float(cfo) / float(np_v))
    valid_cfos = [float(c) for c in cfo_vals if not _is_nanish(c)]
    if not valid_cfos:
        m3 = None  # no cash-flow statement scraped — renormalize
    elif is_financial:
        # For banks/NBFIs: CFO/NP ratio is structurally low (growing loan book
        # consumes operating cash). Score on positivity + trend instead.
        pos_count = sum(1 for c in valid_cfos if c > 0)
        pos_frac = pos_count / len(valid_cfos)
        cfo_growth = (
            valid_cfos[-1] > valid_cfos[0] if len(valid_cfos) >= 2 else False
        )
        if pos_frac == 1.0 and cfo_growth:
            m3 = 8.0
        elif pos_frac == 1.0:
            m3 = 6.0
        elif pos_frac >= 0.75:
            m3 = 4.0
        else:
            m3 = 1.0
    elif cfo_np_ratios:
        # True median (averages middle two for even-length input — avoids upper-bias)
        median_ratio = _median(cfo_np_ratios)
        pos_count = sum(1 for c in valid_cfos if c > 0)
        if median_ratio > 1.2:     m3 = 10.0
        elif median_ratio >= 1.0:  m3 = 8.0
        elif median_ratio >= 0.7:  m3 = 5.0
        elif median_ratio >= 0.3:  m3 = 3.0
        else:                      m3 = 0.0
        if pos_count < len(valid_cfos) * 0.5:
            m3 = min(m3, 2.0)
    else:
        # Have CFO data but no valid NP to compute ratio — fallback to positivity
        pos_count = sum(1 for c in valid_cfos if c > 0)
        if pos_count == len(valid_cfos):
            m3 = 6.0
        elif pos_count >= len(valid_cfos) * 0.75:
            m3 = 4.0
        else:
            m3 = 0.0

    # Cash/Assets: not meaningful for banks (most assets are loans by design)
    # or insurers (assets are the investment float). Not-applicable — excluded
    # from the pillar entirely, so its weight redistributes without touching
    # the coverage measure.
    if is_financial:
        m4 = None
        # Capital cushion carries the weight the D/E + interest-cover pair had.
        metrics = [(m1_capital, 0.60), (m3, 0.40)]
    elif is_insurance:
        m4 = None
        # Insurers are unlevered by nature: only 4 of 59 report a borrowings line
        # and none report interest, so an absent D/E or interest cover is
        # not-applicable, not a gap. Score on whatever applies, weights rescaled so
        # the 0.60 renormalization floor does not punish the missing lines (until
        # 2026-09 the free "debt-free" 10 masked this; removing it alone cost
        # every insurer ~8 points).
        parts = [(s, w) for s, w in ((m1, 0.3125), (m2, 0.25), (m3, 0.3125)) if s is not None]
        tot = sum(w for _, w in parts)
        metrics = [(s, w / tot) for s, w in parts] if tot else [(None, 1.0)]
    else:
        cash = latest.get("cash_and_equivalents")
        if not _is_nanish(cash) and not _is_nanish(ta) and float(ta) > 0:
            m4 = _a2_cash_assets_score(float(cash) / float(ta) * 100)
        else:
            m4 = None  # balance-sheet detail missing — renormalize
        metrics = [(m1, 0.3125), (m2, 0.25), (m3, 0.3125), (m4, 0.125)]

    score, coverage = _weighted_pillar(metrics)
    # p2_de is None for banks/NBFIs and p2_capital is None for everyone else, so
    # the stock page shows exactly one leverage bar per company.
    return score, {"p2_de": m1, "p2_capital": m1_capital, "p2_ic": m2, "p2_cfo": m3,
                   "p2_cash": m4, "p2_coverage": round(coverage, 3)}


def _a2_pillar3(code: str, ext_last5: list[dict],
                sector_rank_score: dict[str, float],
                is_financial: bool = False,
                is_insurance: bool = False) -> tuple[float, dict]:
    def _trend(vals: list[float]) -> float:
        if len(vals) >= 4:
            return (vals[-2] + vals[-1]) / 2 - (vals[0] + vals[1]) / 2
        if len(vals) >= 2:
            return vals[-1] - vals[0]
        return 0.0

    if is_financial:
        # For banks/NBFIs: use Net Interest Margin (NII / earning_assets) as the margin metric
        margin_vals = []
        for er in ext_last5:
            nii = er.get("net_interest_income")
            ea  = er.get("earning_assets")
            if not _is_nanish(nii) and not _is_nanish(ea) and float(ea) > 0:
                margin_vals.append(float(nii) / float(ea) * 100)
        m1 = _a2_nim_score(sum(margin_vals) / len(margin_vals), _trend(margin_vals)) if margin_vals else None
    else:
        margin_vals = []
        for er in ext_last5:
            gp  = er.get("gross_profit")
            rev = er.get("revenue")
            if not _is_nanish(gp) and not _is_nanish(rev) and float(rev) > 0:
                margin_vals.append(float(gp) / float(rev) * 100)
        if margin_vals:
            m1 = _a2_gm_score(sum(margin_vals) / len(margin_vals), _trend(margin_vals))
        elif is_insurance:
            # Insurers rarely report a gross-profit line — fall back to net margin.
            for er in ext_last5:
                np_v = er.get("net_profit")
                rev  = er.get("revenue")
                if not _is_nanish(np_v) and not _is_nanish(rev) and float(rev) > 0:
                    margin_vals.append(float(np_v) / float(rev) * 100)
            m1 = _a2_npm_score(sum(margin_vals) / len(margin_vals), _trend(margin_vals)) if margin_vals else None
        else:
            m1 = None  # margin lines never scraped — renormalize
    # Gentle volatility haircut so a violently swinging margin can't max out on its average.
    if margin_vals and m1 is not None:
        m1 = round(m1 * (0.75 + 0.25 * _earnings_stability(margin_vals, is_financial)), 4)

    # Year-aware revenue growth rates: each consecutive pair of *reported* years,
    # annualized over the gap between them, so a missing year doesn't show up as
    # one huge jump. ext_last5 is year-ascending.
    rev_pairs = [
        (int(er["year"]), rv)
        for er in ext_last5
        for rv in [_effective_revenue(er, is_financial)]
        if rv is not None and er.get("year") is not None and not _is_nanish(er.get("year"))
    ]
    if len(rev_pairs) >= 4:
        growth_rates = []
        for (y0, r0), (y1, r1) in zip(rev_pairs[:-1], rev_pairs[1:]):
            span = max(y1 - y0, 1)
            growth_rates.append(((r1 / r0) ** (1.0 / span) - 1.0) * 100.0)
        m2 = _a2_rev_vol_score(growth_rates) if len(growth_rates) >= 3 else None
    else:
        m2 = None  # under 4 revenue years — stability unjudgeable, renormalize

    # Rank absence means no usable (or hopelessly old) revenue — a data gap, not
    # last place. See the sector-rank block in _compute_scores_df.
    m3 = sector_rank_score.get(code)

    # CapEx reinvestment intensity (avg CapEx / avg Revenue). Only ~a third of
    # industrials have a capex line scraped — missing renormalizes, not zeroes.
    capex_vals = []
    for er in ext_last5:
        cx = er.get("capex")
        rv = _effective_revenue(er, is_financial)
        if not _is_nanish(cx) and rv is not None and rv > 0:
            capex_vals.append(abs(float(cx)) / rv * 100)
    m4 = _a2_capex_score(sum(capex_vals) / len(capex_vals)) if capex_vals else None

    score, coverage = _weighted_pillar(
        [(m1, 0.35), (m2, 0.30), (m3, 0.20), (m4, 0.15)]
    )
    return score, {"p3_margin": m1, "p3_rev_vol": m2, "p3_sector_rank": m3, "p3_capex": m4,
                   "p3_coverage": round(coverage, 3)}


def _a2_pillar4(fin_last5: list[dict], ltp: Optional[float],
                sector_median_pe: Optional[float] = None,
                sector_median_pb: Optional[float] = None,
                vol_damp: float = 1.0) -> tuple[float, dict]:
    """Valuation pillar. Sector medians passed in are already self-excluded by the caller.
    When self-historical data is missing, sector-relative is used at full weight (no 0.4 cap).

    vol_damp (<=1.0) mildly discounts the cheapness reward when earnings are volatile —
    a stock that's cheap *because* its earnings are erratic shouldn't get full credit for
    looking cheap ('cheap for a reason'). Derived from EPS stability by the caller."""
    if ltp is None or ltp <= 0:
        return 0.0, {"p4_pe": 0.0, "p4_pb": 0.0}

    # The LATEST reported EPS, whatever its sign. A company that has fallen into
    # losses has no P/E — it must not borrow a positive EPS from an earlier year
    # and come out looking "cheap" (68 loss-makers did exactly that, one of them
    # with a 9.96/10 P/E-value score on a negative EPS).
    curr_eps = next((float(r["eps"]) for r in reversed(fin_last5)
                     if not _is_nanish(r.get("eps"))), None)
    has_sector_pe = sector_median_pe is not None and sector_median_pe > 0

    # Raw ratios surfaced for the stock-detail valuation panel (not used in scoring).
    current_pe: Optional[float] = None
    own_avg_pe: Optional[float] = None
    current_pb: Optional[float] = None
    own_avg_pb: Optional[float] = None

    if curr_eps is None or curr_eps <= 0:
        pe_score = 0.0  # no earnings -> P/E undefined -> nothing to call cheap
    else:
        current_pe = ltp / curr_eps
        # DSE's audited table carries a year-end P/E per fiscal year (verified
        # 2026-09: implied year-end prices vary across years, so it is NOT the
        # live price / old EPS). Only `pe_ratio_basic` is scraped.
        hist_pes = [
            float(pe)
            for r in fin_last5
            for pe in [r.get("pe_ratio_basic")]
            if pe and float(pe) > 0
        ]
        has_self_pe = len(hist_pes) >= 2
        if has_self_pe:
            avg_hist_pe = sum(hist_pes) / len(hist_pes)
            own_avg_pe = avg_hist_pe
            self_pe = _a2_pe_pb_ratio_score(current_pe / avg_hist_pe) if avg_hist_pe > 0 else 0.0
        else:
            self_pe = 0.0
        sect_pe = (
            _a2_pe_pb_ratio_score(current_pe / sector_median_pe)
            if has_sector_pe else 0.0
        )
        if has_self_pe and has_sector_pe:
            pe_score = self_pe * 0.6 + sect_pe * 0.4
        elif has_self_pe:
            pe_score = self_pe
        elif has_sector_pe:
            # No self history available — give sector-relative the full weight rather than capping at 0.4×
            pe_score = sect_pe
        else:
            pe_score = 0.0

    curr_nav = next((r["nav_per_share"] for r in reversed(fin_last5)
                     if r.get("nav_per_share") is not None and r["nav_per_share"] > 0), None)
    has_sector_pb = sector_median_pb is not None and sector_median_pb > 0

    if curr_nav is None:
        pb_score = 0.0
    else:
        current_pb = ltp / curr_nav
        hist_pbs = []
        for r in fin_last5:
            # Year-end price = P/E x EPS. `eps` is the only EPS the scraper fills
            # (its `eps_basic` column is None on every row — see company_details.py),
            # and pe_ratio_basic x eps reproduces the year-end price (GP 2020:
            # 12.6 x 27.54 = 347), so the two are on the same basis.
            pe  = r.get("pe_ratio_basic")
            eps = r.get("eps")
            nav = r.get("nav_per_share")
            if pe and float(pe) > 0 and eps and float(eps) > 0 and nav and float(nav) > 0:
                year_end_price = float(pe) * float(eps)
                hist_pbs.append(year_end_price / float(nav))
        has_self_pb = len(hist_pbs) >= 2
        if has_self_pb:
            avg_hist_pb = sum(hist_pbs) / len(hist_pbs)
            own_avg_pb = avg_hist_pb
            self_pb = _a2_pe_pb_ratio_score(current_pb / avg_hist_pb) if avg_hist_pb > 0 else 0.0
        else:
            self_pb = 0.0
        sect_pb = (
            _a2_pe_pb_ratio_score(current_pb / sector_median_pb)
            if has_sector_pb else 0.0
        )
        if has_self_pb and has_sector_pb:
            pb_score = self_pb * 0.6 + sect_pb * 0.4
        elif has_self_pb:
            pb_score = self_pb
        elif has_sector_pb:
            pb_score = sect_pb
        else:
            pb_score = 0.0

    score = (pe_score * 0.6 + pb_score * 0.4) * vol_damp
    return score, {
        "p4_pe": round(pe_score, 2), "p4_pb": round(pb_score, 2),
        "p4_vol_damp": round(vol_damp, 4),
        "current_pe": round(current_pe, 2) if current_pe is not None else None,
        "current_pb": round(current_pb, 2) if current_pb is not None else None,
        "own_avg_pe": round(own_avg_pe, 2) if own_avg_pe is not None else None,
        "own_avg_pb": round(own_avg_pb, 2) if own_avg_pb is not None else None,
    }


def _a2_pillar5(fin_last5: list[dict], ltp: Optional[float],
                face: Optional[float], is_financial: bool = False,
                ledger_cash_pct: Optional[dict[int, float]] = None) -> tuple[float, dict]:
    """Dividend pillar: consistency 0.35 · payout affordability 0.30 · yield 0.20 ·
    growth 0.15.

    Growth used to carry half the pillar, but two-thirds of the market sat on its
    neutral constant, so a steady generous payer could never beat 6.5/10 and the
    pillar never measured what its name promised (sustainability). Payout ratio —
    cash DPS as a share of EPS — is now the second-largest component.

    Nothing in this pillar renormalizes: for dividends, absence IS the signal.

    `ledger_cash_pct` maps fiscal year -> cash % declared per the news ledger
    (dividend_declarations); it only fills a year whose audited-table dividend
    cell was blank. When the ledger has nothing for that year either, the blank
    means what DSE shows: no dividend.
    """
    empty = {"p5_dps_cagr": 0.0, "p5_consist": 0.0, "p5_yield": 0.0, "p5_payout": 0.0,
             "div_yield_pct": None, "payout_pct": None}
    # Face value is required to convert "cash_dividend_pct" (% of face) into actual DPS.
    # Default of 10 silently understates DPS by 10× for face-100 stocks — bail out instead.
    if _is_nanish(face) or float(face) <= 0:
        return 0.0, empty
    face_val = float(face)
    ledger = ledger_cash_pct or {}

    # (year, cash DPS in Tk, EPS or None) — year-aware so growth uses real time spans.
    years: list[tuple[int, float, Optional[float]]] = []
    for r in fin_last5:
        y = r.get("year")
        if y is None or _is_nanish(y):
            continue
        y = int(y)
        pct = r.get("cash_dividend_pct")
        if _is_nanish(pct):
            pct = ledger.get(y, 0.0)
        eps = r.get("eps")
        years.append((y, float(pct) * face_val / 100.0,
                      None if _is_nanish(eps) else float(eps)))
    dps_vals = [d for _, d, _ in years]

    # m1: DPS trajectory — same sustained-growth gate as EPS, but volatility is NOT
    # penalized: lumpy-but-generous payouts (big special dividends some years) are a feature,
    # rewarded via yield/consistency, not a risk. Operates on non-zero years so a skipped
    # year doesn't distort the trend (consistency below already charges for the skip).
    nonzero_pairs = [(y, d) for y, d, _ in years if d > 0]
    if len(nonzero_pairs) >= 2:
        m1, _ = _trajectory_score(nonzero_pairs, _DPS_GROWTH_ANCHORS, is_financial,
                                  penalize_volatility=False)
    else:
        m1 = 0.0

    # m2: consistency — paying years out of the 5-year window.
    paid = sum(1 for d in dps_vals if d > 0)
    if paid >= 5:   m2 = 10.0
    elif paid == 4: m2 = 7.0
    elif paid == 3: m2 = 4.0
    else:           m2 = 0.0

    # m3: yield on the latest year's cash dividend at today's official close.
    latest_dps = dps_vals[-1] if dps_vals else 0.0
    div_yield_pct = None
    if ltp and ltp > 0 and latest_dps > 0:
        div_yield_pct = round(latest_dps / ltp * 100, 1)
        m3 = _a2_div_yield_score(latest_dps / ltp * 100)
    else:
        m3 = 0.0

    # m4: payout affordability — median DPS/EPS over the last three paying years.
    # A dividend declared on a loss year is paid out of reserves: sentinel 999%.
    payouts = [
        (d / eps * 100.0) if eps > 0 else 999.0
        for _, d, eps in years
        if d > 0 and eps is not None
    ][-3:]
    payout_pct = _median(payouts) if payouts else None
    m4 = _a2_payout_score(payout_pct) if payout_pct is not None else 0.0

    score = m2 * 0.35 + m4 * 0.30 + m3 * 0.20 + m1 * 0.15
    return score, {"p5_dps_cagr": m1, "p5_consist": m2, "p5_yield": m3, "p5_payout": m4,
                   "div_yield_pct": div_yield_pct,
                   # None when unknown OR when the sentinel fired (a % of a loss is not a number)
                   "payout_pct": round(payout_pct, 1) if payout_pct is not None and payout_pct < 999 else None}


# ---------------------------------------------------------------------------
# Scores: precomputed snapshot in MongoDB, read behind a locked in-process cache
# ---------------------------------------------------------------------------
#
# The five-pillar score for ~600 companies is expensive to compute (full table
# scans + per-company pandas). It is now computed once by a daily job
# (`python main.py compute-scores`, hooked into `scrape-all`) and persisted to
# the `scores_snapshot` collection. API requests only READ that snapshot.
#
# `build_scores_df()` keeps a short in-process cache of the loaded snapshot and
# guards the (re)load with a lock so a burst of concurrent requests after TTL
# expiry triggers exactly ONE reload instead of N simultaneous rebuilds — the
# original cause of the stepwise memory climb to OOM.

_SNAPSHOT_COLLECTION = "scores_snapshot"
_scores_cache: dict = {"df": None, "at": 0.0}
_SCORES_TTL = 300  # seconds — in-process cache of the snapshot read
_scores_lock = threading.RLock()


def _records_for_storage(df: pd.DataFrame) -> list[dict]:
    """Convert a scores DataFrame to BSON-safe dicts (numpy -> native, NaN -> None)."""
    out: list[dict] = []
    for raw in df.to_dict("records"):
        rec: dict = {}
        for k, v in raw.items():
            if isinstance(v, np.generic):
                v = v.item()
            if isinstance(v, float) and math.isnan(v):
                v = None
            rec[k] = v
        out.append(rec)
    return out


def _store_snapshot(df: pd.DataFrame) -> None:
    """Persist scored rows to MongoDB so API requests only READ them."""
    if df.empty:
        return
    col = get_db()[_SNAPSHOT_COLLECTION]
    existing = {ix["name"] for ix in col.list_indexes()}
    if "trading_code_1" not in existing:
        col.create_index([("trading_code", ASCENDING)], unique=True, name="trading_code_1")

    now = datetime.now(timezone.utc)
    records = _records_for_storage(df)
    # ReplaceOne (not $set) so the stored doc mirrors the computed row exactly —
    # a renamed/removed sub-metric would otherwise linger in old docs forever
    # and resurface as a stale DataFrame column on reload.
    ops = [
        ReplaceOne(
            {"trading_code": r["trading_code"]},
            {**r, "computed_at": now},
            upsert=True,
        )
        for r in records if r.get("trading_code")
    ]
    if ops:
        col.bulk_write(ops, ordered=False)
    # Drop any company that is no longer in the scored universe.
    live_codes = [r["trading_code"] for r in records if r.get("trading_code")]
    col.delete_many({"trading_code": {"$nin": live_codes}})


def _load_snapshot_df() -> pd.DataFrame:
    """Read the precomputed scores snapshot back into a DataFrame."""
    docs = list(get_db()[_SNAPSHOT_COLLECTION].find({}, {"_id": 0, "computed_at": 0}))
    return pd.DataFrame(docs) if docs else pd.DataFrame()


def compute_and_store_scores() -> pd.DataFrame:
    """Run the full pipeline from raw collections and persist to scores_snapshot.

    The ONLY place the heavy pandas computation runs: the daily `compute-scores`
    CLI job and the self-healing fallback below. Returns the computed frame."""
    df = _compute_scores_df()
    try:
        _store_snapshot(df)
    except Exception as e:  # storing is best-effort; never break the caller
        logger.warning("scores snapshot store failed: %s", e)
    return df


def invalidate_scores_cache() -> None:
    """Recompute scores so a DB change (admin adjustment / manual refresh) is
    immediately visible, then refresh the in-process cache. Single-flighted."""
    global _scores_cache
    with _scores_lock:
        df = compute_and_store_scores()
        _scores_cache = {"df": df, "at": time.time()}
    # Signals derive from scores — drop their cache too (lazy import: the
    # signal service imports build_scores_df from this module).
    try:
        from backend.services.signal_service import invalidate_signal_cache
        invalidate_signal_cache()
    except Exception:  # noqa: BLE001 — cache hygiene must never break a refresh
        pass


def reload_after_scrape() -> None:
    """Make a fresh scrape visible without recomputing in the web process.

    `scrape-all` already computed and stored the snapshot; this drops every
    in-process cache (scores frame, signals, prices, market state, …) so the next
    request reads the new data instead of a pre-scrape copy that the frontend's
    tag purge would otherwise re-cache for a day."""
    global _scores_cache
    from backend.services.db_service import clear_all_caches

    with _scores_lock:
        _scores_cache = {"df": None, "at": 0.0}
    clear_all_caches()


def build_scores_df() -> pd.DataFrame:
    """Return the scored DataFrame for all companies (reads the precomputed snapshot).

    Cheap snapshot read behind a short in-process TTL cache; the reload is
    single-flighted with a lock so concurrent post-expiry requests cause one
    reload, not N. Self-heals by computing + persisting once if no snapshot
    exists yet (fresh deploy or before the first daily job)."""
    global _scores_cache
    cached = _scores_cache["df"]
    if cached is not None and time.time() - _scores_cache["at"] < _SCORES_TTL:
        return cached
    with _scores_lock:
        cached = _scores_cache["df"]
        if cached is not None and time.time() - _scores_cache["at"] < _SCORES_TTL:
            return cached
        df = _load_snapshot_df()
        if df.empty:
            df = compute_and_store_scores()
        _scores_cache = {"df": df, "at": time.time()}
        return df


def _reference_year(data_max_year: Optional[int], fin_max_year: Optional[int],
                    today: Optional[datetime] = None) -> Optional[int]:
    """The fiscal year every company is expected to have reported by now — the
    anchor the staleness multiplier measures `data_age_years` against.

    Calendar-driven: from July onward the reference is the current year (the
    June-FY crowd has filed, and December-FY companies filed the previous year
    by April); January–June it is the previous year. Companies whose latest
    report is one year behind the reference are within tolerance; two or more
    behind are stale.

    Why not simply the freshest year seen in the data (the old rule): that hung
    the multiplier for 49 companies on whether a couple of March-FY names had
    filed yet — one early or mis-parsed row moved a ×0.8 on or off for everyone.
    The data maximum is only used (a) in backtests, where `fin_max_year` defines
    "now", and (b) as a guard when the scrape itself has fallen two or more
    years behind the calendar, so our own stale data never penalizes the market.
    """
    if data_max_year is None:
        return None
    if fin_max_year is not None:
        return data_max_year
    today = today or datetime.now(timezone.utc)
    calendar_ref = today.year if today.month >= 7 else today.year - 1
    return calendar_ref if data_max_year >= calendar_ref - 1 else data_max_year


def _compute_scores_df(
    prices_override: Optional[dict] = None,
    fin_max_year: Optional[int] = None,
) -> pd.DataFrame:
    """Pure scoring compute over the current DB snapshot.

    Backtest hooks (both default None -> production behaviour is unchanged):
      * ``prices_override`` — a {code: {"ltp": float}} map to score against
        instead of today's latest prices (used to value the universe as-of a
        past date).
      * ``fin_max_year`` — drop every financial/extended-financial row for a
        fiscal ``year`` greater than this, so scores reflect only the reports
        knowable at a past date (removes fundamental look-ahead). Staleness is
        derived from the freshest *surviving* report, so it auto-adjusts.
    """
    db = get_db()

    # Build set of codes to exclude from DSEF scoring: hard-excluded (bonds/debentures/etc.)
    # plus mutual funds (they report NAV, not EPS/ROE, so the formula doesn't apply).
    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find(
            {"$or": [{"excluded": True}, {"is_mutual_fund": True}]},
            {"trading_code": 1, "_id": 0},
        )
    }

    companies = {
        d["trading_code"]: d
        for d in db.companies.find(
            {"excluded": {"$ne": True}, "is_mutual_fund": {"$ne": True}},
            {
                "trading_code": 1, "total_shares": 1, "face_value": 1,
                "market_category": 1, "sector": 1, "_id": 0,
            },
        )
    }

    fin_docs = list(db.financials.find(
        {"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}
    ))
    if not fin_docs:
        return pd.DataFrame()

    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    if fin_max_year is not None and "year" in fin_df.columns:
        fin_df = fin_df[fin_df["year"] <= fin_max_year]
        if fin_df.empty:
            return pd.DataFrame()
    if "eps_cont_basic" in fin_df.columns:
        fin_df["eps"] = fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
    elif "eps_basic" in fin_df.columns:
        fin_df["eps"] = fin_df["eps_basic"]
    else:
        fin_df["eps"] = float("nan")

    # Group financials by code once. fin_df is already sorted by
    # [trading_code, year], so each group is year-ascending and tail(5) is the
    # last 5 years — identical to the old per-company filter+sort, but O(n)
    # total instead of an O(n) boolean scan repeated for each of ~600 companies.
    fin_by_code: dict[str, list[dict]] = {
        code: g.tail(5).to_dict("records")
        for code, g in fin_df.groupby("trading_code", sort=False)
    }

    ext_docs = list(db.company_financials_ext.find(
        {"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}
    ))
    if fin_max_year is not None:
        ext_docs = [d for d in ext_docs
                    if d.get("year") is not None and d["year"] <= fin_max_year]
    ext_by_code: dict[str, list] = {}
    for doc in ext_docs:
        ext_by_code.setdefault(doc["trading_code"], []).append(doc)
    for code in ext_by_code:
        ext_by_code[code].sort(key=lambda x: x["year"])

    # Reference year = freshest report across all companies. Companies whose
    # latest report lags this by 2+ years get a staleness multiplier on score.
    _candidate_years: list[int] = []
    try:
        if "year" in fin_df.columns:
            _yser = fin_df["year"].dropna()
            if not _yser.empty:
                _candidate_years.append(int(_yser.max()))
    except Exception:
        pass
    for _rows in ext_by_code.values():
        if _rows:
            _y = _rows[-1].get("year")
            if _y is not None:
                try:
                    _candidate_years.append(int(_y))
                except Exception:
                    pass
    data_max_year: Optional[int] = max(_candidate_years) if _candidate_years else None
    latest_market_year: Optional[int] = _reference_year(data_max_year, fin_max_year)

    # Group latest revenue by sector for within-sector ranking.
    # For banks/NBFIs, fall back to net_interest_income when revenue is absent.
    rev_by_sector: dict[str, list[tuple[str, float, int]]] = {}
    for code, rows in ext_by_code.items():
        sector = (companies.get(code, {}).get("sector") or "").strip()
        is_fin = normalize_sector(sector) in ("BANK", "NBFI")
        for row in reversed(rows):
            rv = _effective_revenue(row, is_fin)
            if rv:
                yr = row.get("year")
                rev_by_sector.setdefault(sector, []).append(
                    (code, rv, int(yr) if yr is not None else 0))
                break

    # Sector standing = revenue-size percentile within the DSE sector, mapped
    # linearly onto 2..10 (largest = 10, smallest = 2). The old four-step ladder
    # gave the entire bottom half of every sector a flat 2.0 — 124 of 243
    # industrials were told they had weak "sector standing".
    #   * a company whose latest revenue is 3+ years older than the sector's
    #     freshest is left out (None -> renormalize): ranking a 2019 figure
    #     against 2025 peers is noise, and the staleness multiplier already
    #     charges for the age;
    #   * a solo company, and every member of DSE's catch-all "Miscellaneous"
    #     sector (unrelated businesses), gets the neutral 5.0 — there are no
    #     real peers to rank against.
    sector_rank_score: dict[str, float] = {}
    for sector, items in rev_by_sector.items():
        if sector.lower() == "miscellaneous":
            for code, _, _ in items:
                sector_rank_score[code] = 5.0
            continue
        freshest = max(y for _, _, y in items)
        ranked = [it for it in items if it[2] >= freshest - 2]
        ranked.sort(key=lambda x: x[1], reverse=True)
        n = len(ranked)
        for rank_idx, (code, _, _) in enumerate(ranked):
            if n == 1:
                sector_rank_score[code] = 5.0
            else:
                sector_rank_score[code] = round(2.0 + 8.0 * (1.0 - rank_idx / (n - 1)), 4)

    prices = load_latest_prices() if prices_override is None else prices_override

    # Admin manual score adjustments (percentage). Loaded once per scoring rebuild;
    # cache is invalidated by score_adjustments_service on every write.
    try:
        adjustments_map = {
            d["trading_code"]: float(d.get("pct", 0))
            for d in db.score_adjustments.find({}, {"trading_code": 1, "pct": 1, "_id": 0})
        }
    except Exception:
        adjustments_map = {}

    # Cash dividend % per fiscal year from the news ledger, used by pillar 5 only
    # to fill a blank dividend cell in the audited table. Interim + final for the
    # same period-end year are summed (DSE's table shows the year's total).
    ledger_by_code: dict[str, dict[int, float]] = {}
    try:
        for d in db.dividend_declarations.find(
            {"cash_pct": {"$ne": None}, "period_end": {"$ne": None}},
            {"trading_code": 1, "period_end": 1, "cash_pct": 1, "_id": 0},
        ):
            pe = d.get("period_end")
            try:
                fy = pe.year if isinstance(pe, datetime) else int(str(pe)[:4])
            except (TypeError, ValueError):
                continue
            if fin_max_year is not None and fy > fin_max_year:
                continue  # backtest: a declaration not yet knowable
            per_year = ledger_by_code.setdefault(d["trading_code"], {})
            per_year[fy] = per_year.get(fy, 0.0) + float(d.get("cash_pct") or 0.0)
    except Exception as e:  # noqa: BLE001 — the ledger is a fill-in, never a blocker
        logger.warning("dividend ledger unavailable for scoring: %s", e)
        ledger_by_code = {}

    # Pre-compute sector P/E and P/B values keyed by code so the per-company median
    # can exclude the company itself (otherwise a small sector's median is biased toward self).
    sector_pes: dict[str, list[tuple[str, float]]] = {}
    sector_pbs: dict[str, list[tuple[str, float]]] = {}
    for code, comp in companies.items():
        sector = comp.get("sector", "") or ""
        p = (prices.get(code) or {}).get("ltp")
        if not p or p <= 0:
            continue
        fin_rows_tmp = fin_by_code.get(code, [])
        # Latest reported EPS / NAV, whatever the sign — a loss-maker has no P/E
        # and must not enter the sector median on a stale positive figure.
        eps_v = next((float(r["eps"]) for r in reversed(fin_rows_tmp)
                      if not _is_nanish(r.get("eps"))), None)
        nav_v = next((float(r["nav_per_share"]) for r in reversed(fin_rows_tmp)
                      if not _is_nanish(r.get("nav_per_share"))), None)
        if eps_v is not None and eps_v > 0:
            sector_pes.setdefault(sector, []).append((code, p / eps_v))
        if nav_v is not None and nav_v > 0:
            sector_pbs.setdefault(sector, []).append((code, p / nav_v))

    def _sector_median_excluding(pairs: list[tuple[str, float]], exclude_code: str) -> Optional[float]:
        vals = [v for c, v in pairs if c != exclude_code]
        return _median(vals) if vals else None

    rows = []
    for code, comp in companies.items():
        ltp    = (prices.get(code) or {}).get("ltp")
        shares = comp.get("total_shares")
        face   = comp.get("face_value")
        cat    = (comp.get("market_category") or "").strip().upper()
        sector = comp.get("sector", "") or ""
        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        fin_rows = fin_by_code.get(code, [])
        ext_rows_all = ext_by_code.get(code, [])
        ext_last5    = ext_rows_all[-5:]

        sector_class = normalize_sector(sector)
        is_financial = sector_class in ("BANK", "NBFI")
        is_insurance = sector_class == "INSURANCE"
        # Sector medians computed *excluding the current company* so its own valuation
        # doesn't pull the comparison toward itself in small sectors.
        sect_pe_for_self = _sector_median_excluding(sector_pes.get(sector, []), code)
        sect_pb_for_self = _sector_median_excluding(sector_pbs.get(sector, []), code)

        p1, sub1 = _a2_pillar1(fin_rows, ext_last5, is_financial)
        p2, sub2 = _a2_pillar2(ext_last5, is_financial, is_insurance)
        p3, sub3 = _a2_pillar3(code, ext_last5, sector_rank_score, is_financial, is_insurance)
        # Cheap-for-a-reason: mildly discount the valuation reward when EPS is volatile.
        eps_stability = sub1.get("eps_stability", 1.0)
        p4_vol_damp = 1.0 - 0.5 * (1.0 - eps_stability)
        p4, sub4 = _a2_pillar4(fin_rows, ltp, sect_pe_for_self, sect_pb_for_self, vol_damp=p4_vol_damp)
        p5, sub5 = _a2_pillar5(fin_rows, ltp, face, is_financial,
                               ledger_cash_pct=ledger_by_code.get(code))

        final = p1 * 0.30 + p2 * 0.20 + p3 * 0.20 + p4 * 0.15 + p5 * 0.15

        # Staleness — penalize companies that haven't filed financials in 2+ years.
        # Year source: max(financials.year, ext_financials.year). Reference year is
        # the freshest report seen across the whole market (latest_market_year).
        fin_last_year = fin_rows[-1].get("year") if fin_rows else None
        ext_last_year = ext_last5[-1].get("year") if ext_last5 else None
        _years_for_self: list[int] = []
        for _y in (fin_last_year, ext_last_year):
            if _y is None:
                continue
            if isinstance(_y, float) and math.isnan(_y):
                continue
            try:
                _years_for_self.append(int(_y))
            except (TypeError, ValueError):
                pass
        last_reported_year: Optional[int] = max(_years_for_self) if _years_for_self else None
        data_age_years: Optional[int] = (
            (latest_market_year - last_reported_year)
            if (latest_market_year is not None and last_reported_year is not None)
            else None
        )
        if data_age_years is None or data_age_years <= 1:
            stale_mult = 1.0
        elif data_age_years == 2:
            stale_mult = 0.80
        elif data_age_years == 3:
            stale_mult = 0.50
        else:
            stale_mult = 0.25
        stale_data = stale_mult < 1.0

        # Market-category multiplier — Z-category is the canonical DSE value trap
        # (see _CATEGORY_MULT). Applied like the staleness multiplier, so tier
        # ordering within a category is preserved.
        cat_mult = _CATEGORY_MULT.get(cat, _CATEGORY_MULT_DEFAULT)

        base_score_100 = final * 10
        adj_pct = adjustments_map.get(code, 0.0)
        adjusted_score_100 = base_score_100 * (1 + adj_pct / 100.0) * stale_mult * cat_mult
        # Clamp to [0, 100] — UI and tier thresholds assume this range.
        adjusted_score_100 = max(0.0, min(100.0, adjusted_score_100))

        # Fraction of the renormalizable pillar weight (P1-P3) backed by data —
        # surfaced so downstream views can qualify claims about thin-data names.
        data_completeness = round(
            (0.30 * sub1.get("p1_coverage", 0.0)
             + 0.20 * sub2.get("p2_coverage", 0.0)
             + 0.20 * sub3.get("p3_coverage", 0.0)) / 0.70,
            3,
        )

        curr_eps = next((float(r["eps"]) for r in reversed(fin_rows)
                         if not _is_nanish(r.get("eps"))), None)

        # Point-in-time ROE (%) from the latest extended-financials year — surfaced for
        # the stock-detail peer table, not used in scoring.
        roe_pct: Optional[float] = None
        if ext_last5:
            _np = ext_last5[-1].get("net_profit")
            _eq = ext_last5[-1].get("total_equity")
            if _np is not None and _eq and not _is_nanish(_np) and not _is_nanish(_eq) and float(_eq) > 0:
                roe_pct = round(float(_np) / float(_eq) * 100, 1)

        row = {
            "trading_code": code,
            "sector":       sector,
            "market_cat":   cat,
            "ltp":          ltp,
            "mcap_mn":      mcap_mn,
            "score":          round(adjusted_score_100, 1),
            "base_score":     round(base_score_100, 1),
            "adjustment_pct": adj_pct if adj_pct else 0.0,
            "category_mult":  cat_mult,
            "data_completeness": data_completeness,
            "eps":          curr_eps,
            "roe_pct":      roe_pct,
            "sector_median_pe": round(sect_pe_for_self, 2) if sect_pe_for_self is not None else None,
            "sector_median_pb": round(sect_pb_for_self, 2) if sect_pb_for_self is not None else None,
            "p1_biz":       round(p1, 2),
            "p2_health":    round(p2, 2),
            "p3_moat":      round(p3, 2),
            "p4_val":       round(p4, 2),
            "p5_div":       round(p5, 2),
            "last_reported_year": last_reported_year,
            "data_age_years":     data_age_years,
            "stale_data":         stale_data,
        }
        row.update(sub1)
        row.update(sub2)
        row.update(sub3)
        row.update(sub4)
        row.update(sub5)
        rows.append(row)

    df = pd.DataFrame(rows)
    return df


def get_company_score_row(trading_code: str) -> Optional[dict]:
    mdf = build_scores_df()
    if mdf.empty:
        return None
    row = mdf[mdf["trading_code"] == trading_code]
    if row.empty:
        return None
    scored = mdf[mdf["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    rank_pos = scored[scored["trading_code"] == trading_code].index
    d = row.iloc[0].to_dict()
    # Convert NaN to None for JSON serialisation
    for k, v in d.items():
        if isinstance(v, float) and math.isnan(v):
            d[k] = None
    d["overall_rank"] = int(rank_pos[0]) + 1 if len(rank_pos) else None
    d["total_scored"] = len(scored)
    return d
