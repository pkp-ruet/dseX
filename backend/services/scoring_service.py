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

# Growth-curve anchors (annualized % change -> 0..10 score). Shared by the legacy
# point scorers and the trajectory engine so there's a single source of truth.
# Note: 0% growth maps to a low score by design — these reward growth, not mere
# survival (steady profitability is rewarded by the consistency/ROE metrics instead).
_EPS_GROWTH_ANCHORS = [(-5, 0), (0, 2), (3, 4), (7, 6), (10, 8), (15, 10)]
_DPS_GROWTH_ANCHORS = [(-5, 0), (0, 3), (5, 6), (10, 8), (15, 10)]


def _a2_eps_cagr_score(cagr_pct: float) -> float:
    return _score(cagr_pct, _EPS_GROWTH_ANCHORS)


def _a2_roe_score(roe_pct: float) -> float:
    return _score(roe_pct, [(0, 0), (5, 3), (10, 6), (15, 8), (20, 10)])


def _a2_de_score(de: float, is_financial: bool = False) -> float:
    if is_financial:
        return _score(de, [(0, 10), (5, 10), (8, 7), (12, 4), (16, 0)])
    return _score(de, [(0, 10), (0.3, 10), (0.6, 8), (1.0, 6), (1.5, 3), (2.0, 0)])


def _a2_ic_score(ic: float) -> float:
    return _score(ic, [(0, 0), (1.5, 2), (3, 5), (5, 8), (10, 10)])


def _a2_cash_assets_score(pct: float) -> float:
    return _score(pct, [(0, 2), (5, 5), (10, 7), (15, 10)])


def _a2_ownership_score(sponsor_pct: float, institute_pct: float, foreign_pct: float) -> float:
    """Score ownership quality: balanced sponsor + institutional/foreign presence."""
    score = 0.0
    # Sponsor: sweet spot 30-60%, penalize <15% (weak) or >75% (entrenched)
    if 30 <= sponsor_pct <= 60:
        score += 5.0
    elif 20 <= sponsor_pct < 30 or 60 < sponsor_pct <= 75:
        score += 3.0
    else:
        score += 1.0
    # Institutional: higher is better (smart money confidence)
    if institute_pct >= 20:
        score += 3.0
    elif institute_pct >= 10:
        score += 2.0
    else:
        score += 0.5
    # Foreign: any meaningful presence is a positive signal
    if foreign_pct >= 10:
        score += 2.0
    elif foreign_pct >= 3:
        score += 1.0
    else:
        score += 0.5
    return min(score, 10.0)


def _a2_gm_score(avg_gm: float, trend: float) -> float:
    stable = abs(trend) <= 1.0
    if avg_gm > 30 and trend > 0:   return 10.0
    if avg_gm > 30 and stable:      return 8.0
    if avg_gm >= 15 and trend > 0:  return 7.0
    if avg_gm >= 15 and stable:     return 5.0
    return 2.0


def _a2_nim_score(avg_nim: float, trend: float) -> float:
    """Score Net Interest Margin for banks/NBFIs (2–5% is typical range)."""
    stable = abs(trend) <= 0.3
    if avg_nim > 4 and trend > 0:    return 10.0
    if avg_nim > 4 and stable:       return 8.0
    if avg_nim >= 2.5 and trend > 0: return 7.0
    if avg_nim >= 2.5 and stable:    return 5.0
    return 2.0


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


def _a2_rev_vol_score(std_g: float, mean_g: float) -> float:
    # Penalize declining revenue regardless of stability
    if mean_g < 0:
        return 1.0
    if std_g < 5:    return 10.0
    if std_g < 10:   return 7.0
    if std_g < 20:   return 4.0
    return 1.0


def _a2_capex_score(capex_rev_pct: float) -> float:
    """Score CapEx/Revenue ratio — sweet spot is 5-15% reinvestment."""
    if 5 <= capex_rev_pct <= 15:   return 10.0
    if 3 <= capex_rev_pct < 5:     return 7.0
    if 15 < capex_rev_pct <= 25:   return 6.0
    if capex_rev_pct < 3:          return 3.0
    return 2.0  # >25% — very capital intensive


def _a2_pe_pb_ratio_score(ratio: float) -> float:
    return _score(ratio, [(0.5, 10), (0.70, 10), (0.85, 8), (1.00, 6), (1.20, 4), (1.50, 1)])


def _a2_dps_cagr_score(cagr_pct: float) -> float:
    return _score(cagr_pct, _DPS_GROWTH_ANCHORS)


def _a2_div_yield_score(yield_pct: float) -> float:
    return _score(yield_pct, [(0, 1), (1, 4), (3, 7), (5, 10)])


# ---------------------------------------------------------------------------
# Trajectory quality — distinguish genuine *sustained* growth from a volatile
# "round-trip" (fell hard, then recovered to roughly the old level). Endpoint-to-
# endpoint CAGR rewarded both equally; this does not. See _trajectory_score.
# ---------------------------------------------------------------------------

def _earnings_stability(values: list, is_financial: bool = False) -> float:
    """Path smoothness of a metric series in [0, 1] (1.0 = steady, 0.0 = violent).

    Driven by the worst single-year drawdown — the 'big downfall' signal. Drawdown
    (not a coefficient of variation) is used deliberately: it flags a fall-and-recover
    round-trip while leaving a healthy one-time *step up* alone (a step up has no
    drawdown). Banks/NBFIs get a wider tolerance band — their earnings swing on
    loan-loss provisioning, so a moderate dip is normal rather than alarming.
    """
    vals = [float(v) for v in values if not _is_nanish(v)]
    if len(vals) < 3:
        return 1.0  # too short to judge volatility — don't penalize
    max_dd = 0.0
    for prev, curr in zip(vals[:-1], vals[1:]):
        if prev > 0 and curr < prev:
            max_dd = max(max_dd, (prev - curr) / prev)
    dd_tol  = 0.40 if is_financial else 0.25   # drawdown still considered "normal"
    dd_span = 0.40 if is_financial else 0.35   # extra drawdown beyond tol => fully unstable
    instability = min(max(0.0, max_dd - dd_tol) / dd_span, 1.0)
    return max(0.0, 1.0 - instability)


def _trajectory_score(pairs: list, anchors: list,
                      is_financial: bool = False,
                      turnaround_ok: bool = True,
                      penalize_volatility: bool = True) -> tuple:
    """Growth score that rewards a *sustained* rise and penalizes a volatile path.
    Replaces fragile endpoint-to-endpoint CAGR. Returns (score 0..10, stability 0..1).

    Logic:
      - A higher current level earns growth credit only when it is *held above the early
        baseline*: the lower of the last two years must stay above where the series started.
        A single recovered or one-off spiked year earns none (scored as flat) — this is what
        catches the "100 -> 20 -> 100" round-trip, whose recent trough fell back to baseline.
      - The level score is then scaled down by earnings instability, so a down-and-back-up
        path lands *below* a flat-but-steady one. A genuine "20 -> 100 held" breakout keeps
        its high level score (a clean step up has no drawdown, so stability stays ~1).

    penalize_volatility=False skips the instability scaling (used for dividends, where a
    lumpy-but-generous payout is a feature, not a risk — see the DPS call site).
    """
    pts = [(int(y), float(v)) for (y, v) in pairs
           if y is not None and not _is_nanish(v)]
    stability = _earnings_stability([v for _, v in pts], is_financial)
    if len(pts) < 2:
        return 0.0, stability

    vals = [v for _, v in pts]
    yrs  = [y for y, _ in pts]
    early = vals[:2] if len(vals) >= 4 else vals[:1]
    base  = sum(early) / len(early)
    last2 = vals[-2:]
    neutral = _score(0.0, anchors)  # the "no growth" mark for this metric

    if base <= 0:
        # Recovery from a loss/zero base — credit a modest neutral-positive only if
        # currently profitable (don't fabricate a CAGR off a non-positive base).
        level = 5.0 if (turnaround_ok and vals[-1] > 0) else neutral
    elif min(last2) <= base:
        # The higher level isn't *held above the early baseline*: the lower of the last
        # two years has fallen back to (or below) where it started. That's a one-year
        # recovery or a one-off spike, not sustained growth — no growth credit (a true
        # round-trip is then pushed below flat by the volatility penalty). Genuine
        # compounders, whose recent trough stays above their early base, are unaffected
        # even if a single recent year wobbles below the all-time peak.
        level = neutral
    else:
        current = sum(last2) / len(last2)
        span = max(yrs[-1] - yrs[0], 1)
        try:
            cagr = (current / base) ** (1.0 / span) - 1.0
            level = _score(cagr * 100, anchors)
        except (ValueError, OverflowError, ZeroDivisionError):
            level = neutral

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

    # m3: ROE 3yr avg with trend bonus/penalty
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
    if not _is_nanish(debt) and not _is_nanish(eq):
        # Negative equity is distress (0), not a data gap.
        m1 = _a2_de_score(float(debt) / float(eq), is_financial) if float(eq) > 0 else 0.0
    else:
        # No borrowings/equity lines scraped — common for insurers (typically
        # unlevered), so renormalize instead of scoring worst-leverage.
        m1 = None

    ebit    = latest.get("ebit")
    int_exp = latest.get("interest_expense")
    if not _is_nanish(ebit) and not _is_nanish(int_exp) and float(int_exp) > 0:
        m2 = _a2_ic_score(float(ebit) / float(int_exp))
    elif not _is_nanish(ebit):
        # EBIT reported with no interest expense: debt-free if operating-profitable.
        m2 = 10.0 if float(ebit) > 0 else 0.0
    else:
        m2 = None  # income-statement detail never scraped — renormalize

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
    if is_financial or is_insurance:
        m4 = None
        metrics = [(m1, 0.313), (m2, 0.250), (m3, 0.313)]
    else:
        cash = latest.get("cash_and_equivalents")
        ta   = latest.get("total_assets")
        if not _is_nanish(cash) and not _is_nanish(ta) and float(ta) > 0:
            m4 = _a2_cash_assets_score(float(cash) / float(ta) * 100)
        else:
            m4 = None  # balance-sheet detail missing — renormalize
        metrics = [(m1, 0.313), (m2, 0.250), (m3, 0.313), (m4, 0.125)]

    score, coverage = _weighted_pillar(metrics)
    return score, {"p2_de": m1, "p2_ic": m2, "p2_cfo": m3, "p2_cash": m4,
                   "p2_coverage": round(coverage, 3)}


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

    rev_vals = [rv for er in ext_last5
                for rv in [_effective_revenue(er, is_financial)] if rv is not None]
    if len(rev_vals) >= 4:
        growth_rates = [
            (rev_vals[i] - rev_vals[i - 1]) / rev_vals[i - 1] * 100
            for i in range(1, len(rev_vals))
            if rev_vals[i - 1] > 0
        ]
        if len(growth_rates) >= 3:
            mean_g = sum(growth_rates) / len(growth_rates)
            std_g  = (sum((g - mean_g) ** 2 for g in growth_rates) / len(growth_rates)) ** 0.5
            m2 = _a2_rev_vol_score(std_g, mean_g)
        else:
            m2 = None
    else:
        m2 = None  # under 4 revenue years — stability unjudgeable, renormalize

    # Rank absence means no usable revenue anywhere (a data gap), not last place.
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

    curr_eps = next((r["eps"] for r in reversed(fin_last5)
                     if r.get("eps") is not None and r["eps"] > 0), None)
    has_sector_pe = sector_median_pe is not None and sector_median_pe > 0

    # Raw ratios surfaced for the stock-detail valuation panel (not used in scoring).
    current_pe: Optional[float] = None
    own_avg_pe: Optional[float] = None
    current_pb: Optional[float] = None
    own_avg_pb: Optional[float] = None

    if curr_eps is None:
        pe_score = 0.0
    else:
        current_pe = ltp / curr_eps
        hist_pes = [
            float(pe)
            for r in fin_last5
            for pe in [r.get("pe_ratio_cont_basic") or r.get("pe_ratio_basic")]
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
            pe  = r.get("pe_ratio_cont_basic") or r.get("pe_ratio_basic")
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
                face: Optional[float], is_financial: bool = False) -> tuple[float, dict]:
    # Face value is required to convert "cash_dividend_pct" (% of face) into actual DPS.
    # Default of 10 silently understates DPS by 10× for face-100 stocks — bail out instead.
    if _is_nanish(face) or float(face) <= 0:
        return 0.0, {"p5_dps_cagr": 0.0, "p5_consist": 0.0, "p5_yield": 0.0,
                     "div_yield_pct": None}
    face_val = float(face)

    # Pair (year, dps) so CAGR uses real time spans and first non-zero year as the base
    dps_pairs = [
        (r["year"], float(r.get("cash_dividend_pct") or 0) * face_val / 100.0)
        for r in fin_last5
        if r.get("year") is not None
    ]
    dps_vals = [d for _, d in dps_pairs]

    # m1: DPS trajectory — same sustained-growth gate as EPS, but volatility is NOT
    # penalized: lumpy-but-generous payouts (big special dividends some years) are a feature,
    # rewarded via yield/consistency, not a risk. So a dividend that dipped and recovered to
    # (or below) its old level simply earns no *growth* credit (neutral), without being
    # pushed below flat. Operates on non-zero years so a skipped year doesn't distort the base.
    nonzero_pairs = [(y, d) for y, d in dps_pairs if d > 0]
    if len(nonzero_pairs) >= 2:
        m1, _ = _trajectory_score(nonzero_pairs, _DPS_GROWTH_ANCHORS, is_financial,
                                  penalize_volatility=False)
    else:
        m1 = 0.0

    paid = sum(1 for d in dps_vals if d > 0)
    if paid >= 5:   m2 = 10.0
    elif paid == 4: m2 = 7.0
    elif paid == 3: m2 = 4.0
    else:           m2 = 0.0

    latest_dps = dps_vals[-1] if dps_vals else 0.0
    if ltp and ltp > 0 and latest_dps > 0:
        m3 = _a2_div_yield_score(latest_dps / ltp * 100)
    else:
        m3 = 0.0

    div_yield_pct = None
    if ltp and ltp > 0 and latest_dps > 0:
        div_yield_pct = round(latest_dps / ltp * 100, 1)

    score = m1 * 0.50 + m2 * 0.35 + m3 * 0.15
    return score, {"p5_dps_cagr": m1, "p5_consist": m2, "p5_yield": m3,
                   "div_yield_pct": div_yield_pct}


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


def _compute_scores_df() -> pd.DataFrame:
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
    latest_market_year: Optional[int] = max(_candidate_years) if _candidate_years else None

    # Group latest revenue by sector for within-sector ranking.
    # For banks/NBFIs, fall back to net_interest_income when revenue is absent.
    rev_by_sector: dict[str, list[tuple[str, float]]] = {}
    for code, rows in ext_by_code.items():
        sector = (companies.get(code, {}).get("sector") or "").strip()
        is_fin = normalize_sector(sector) in ("BANK", "NBFI")
        for row in reversed(rows):
            rv = _effective_revenue(row, is_fin)
            if rv:
                rev_by_sector.setdefault(sector, []).append((code, rv))
                break

    sector_rank_score: dict[str, float] = {}
    for sector, items in rev_by_sector.items():
        items_sorted = sorted(items, key=lambda x: x[1], reverse=True)
        n = len(items_sorted)
        for rank_idx, (code, _) in enumerate(items_sorted):
            if n == 1:
                # Solo company in a sector — can't rank against peers, give a neutral mark
                # (not 10, which would be a free max for niche-sector listings).
                sr = 5.0
            else:
                pct = (rank_idx + 1) / n
                if rank_idx == 0:
                    sr = 10.0
                elif pct <= 0.25:
                    sr = 7.0
                elif pct <= 0.50:
                    sr = 5.0
                else:
                    sr = 2.0
            sector_rank_score[code] = sr

    prices = load_latest_prices()

    # Admin manual score adjustments (percentage). Loaded once per scoring rebuild;
    # cache is invalidated by score_adjustments_service on every write.
    try:
        adjustments_map = {
            d["trading_code"]: float(d.get("pct", 0))
            for d in db.score_adjustments.find({}, {"trading_code": 1, "pct": 1, "_id": 0})
        }
    except Exception:
        adjustments_map = {}

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
        eps_v = next((r["eps"] for r in reversed(fin_rows_tmp)
                      if r.get("eps") is not None and r["eps"] > 0), None)
        nav_v = next((r["nav_per_share"] for r in reversed(fin_rows_tmp)
                      if r.get("nav_per_share") is not None and r["nav_per_share"] > 0), None)
        if eps_v:
            sector_pes.setdefault(sector, []).append((code, p / eps_v))
        if nav_v:
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
        p5, sub5 = _a2_pillar5(fin_rows, ltp, face, is_financial)

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

        curr_eps = next((r["eps"] for r in reversed(fin_rows)
                         if r.get("eps") is not None), None)

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
