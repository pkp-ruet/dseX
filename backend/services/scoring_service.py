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
from pymongo import ASCENDING, UpdateOne
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
# Algorithm 2 — DSE Fundamental Stock Scoring (5-pillar)
# ---------------------------------------------------------------------------

def _a2_eps_cagr_score(cagr_pct: float) -> float:
    return _score(cagr_pct, [(-5, 0), (0, 2), (3, 4), (7, 6), (10, 8), (15, 10)])


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
    return _score(cagr_pct, [(-5, 0), (0, 3), (5, 6), (10, 8), (15, 10)])


def _a2_div_yield_score(yield_pct: float) -> float:
    return _score(yield_pct, [(0, 1), (1, 4), (3, 7), (5, 10)])


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

    # m2: EPS CAGR over actual year span (handles missing years), with explicit turnaround logic
    if len(eps_pairs) < 2:
        m2 = 0.0
    else:
        (start_year, start_e) = eps_pairs[0]
        (end_year,   end_e)   = eps_pairs[-1]
        n = max(end_year - start_year, 1)
        if start_e > 0 and end_e > 0:
            try:
                cagr = (end_e / start_e) ** (1.0 / n) - 1.0
                m2 = _a2_eps_cagr_score(cagr * 100)
            except (ZeroDivisionError, ValueError, OverflowError):
                m2 = 0.0
        elif start_e <= 0 < end_e:
            # Turnaround: loss → profit. Award a fixed neutral-positive (don't pretend it's a CAGR)
            m2 = 5.0
        else:
            # End <= 0 → currently unprofitable
            m2 = 0.0

    # m3: ROE 3yr avg with trend bonus/penalty
    roe_vals = []
    for er in ext_last5:
        np_v = er.get("net_profit")
        eq_v = er.get("total_equity")
        if not _is_nanish(np_v) and not _is_nanish(eq_v) and float(eq_v) > 0:
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
    else:
        m3 = 0.0

    # m4: NPM trend slope using actual year on the x-axis (so year gaps don't distort slope)
    npm_pairs = []
    for er in ext_last5:
        np_v  = er.get("net_profit")
        rev_v = _effective_revenue(er, is_financial)
        yr    = er.get("year")
        if yr is not None and not _is_nanish(np_v) and rev_v is not None:
            npm_pairs.append((float(yr), float(np_v) / rev_v * 100))
    if len(npm_pairs) < 2:
        m4 = 0.0
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

    score = m1 * 0.20 + m2 * 0.30 + m3 * 0.30 + m4 * 0.20
    return score, {"p1_eps_consist": m1, "p1_eps_cagr": m2, "p1_roe": m3, "p1_npm_trend": m4,
                   "eps_yoy_pct": eps_yoy}


def _a2_pillar2(ext_last5: list[dict], is_financial: bool = False) -> tuple[float, dict]:
    latest = ext_last5[-1] if ext_last5 else {}

    debt = latest.get("total_debt")
    eq   = latest.get("total_equity")
    if not _is_nanish(debt) and not _is_nanish(eq) and float(eq) > 0:
        m1 = _a2_de_score(float(debt) / float(eq), is_financial)
    else:
        m1 = 0.0

    ebit    = latest.get("ebit")
    int_exp = latest.get("interest_expense")
    if not _is_nanish(ebit) and not _is_nanish(int_exp) and float(int_exp) > 0:
        m2 = _a2_ic_score(float(ebit) / float(int_exp))
    elif not _is_nanish(ebit) and float(ebit) > 0:
        m2 = 10.0
    else:
        m2 = 0.0

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
        m3 = 0.0
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

    # Cash/Assets: not meaningful for banks (most assets are loans by design).
    # Skip the metric and redistribute its 10% weight to the remaining four.
    if is_financial:
        m4 = None
    else:
        cash = latest.get("cash_and_equivalents")
        ta   = latest.get("total_assets")
        if not _is_nanish(cash) and not _is_nanish(ta) and float(ta) > 0:
            cash_pct = float(cash) / float(ta) * 100
            m4 = _a2_cash_assets_score(cash_pct)
        else:
            m4 = 0.0

    if m4 is None:
        score = m1 * 0.357 + m2 * 0.286 + m3 * 0.357
    else:
        score = m1 * 0.313 + m2 * 0.250 + m3 * 0.313 + m4 * 0.125
    return score, {"p2_de": m1, "p2_ic": m2, "p2_cfo": m3, "p2_cash": m4}


def _a2_pillar3(code: str, ext_last5: list[dict],
                sector_rank_score: dict[str, float],
                is_financial: bool = False) -> tuple[float, dict]:
    def _trend(vals: list[float]) -> float:
        if len(vals) >= 4:
            return (vals[-2] + vals[-1]) / 2 - (vals[0] + vals[1]) / 2
        if len(vals) >= 2:
            return vals[-1] - vals[0]
        return 0.0

    if is_financial:
        # For banks/NBFIs: use Net Interest Margin (NII / earning_assets) as the margin metric
        nim_vals = []
        for er in ext_last5:
            nii = er.get("net_interest_income")
            ea  = er.get("earning_assets")
            if not _is_nanish(nii) and not _is_nanish(ea) and float(ea) > 0:
                nim_vals.append(float(nii) / float(ea) * 100)
        if nim_vals:
            m1 = _a2_nim_score(sum(nim_vals) / len(nim_vals), _trend(nim_vals))
        else:
            m1 = 0.0
    else:
        gm_vals = []
        for er in ext_last5:
            gp  = er.get("gross_profit")
            rev = er.get("revenue")
            if not _is_nanish(gp) and not _is_nanish(rev) and float(rev) > 0:
                gm_vals.append(float(gp) / float(rev) * 100)
        if gm_vals:
            m1 = _a2_gm_score(sum(gm_vals) / len(gm_vals), _trend(gm_vals))
        else:
            m1 = 0.0

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
            m2 = 0.0
    else:
        m2 = 0.0

    m3 = sector_rank_score.get(code, 2.0)

    # CapEx reinvestment intensity (avg CapEx / avg Revenue)
    capex_vals = []
    for er in ext_last5:
        cx = er.get("capex")
        rv = _effective_revenue(er, is_financial)
        if not _is_nanish(cx) and rv is not None and rv > 0:
            capex_vals.append(abs(float(cx)) / rv * 100)
    m4 = _a2_capex_score(sum(capex_vals) / len(capex_vals)) if capex_vals else 0.0

    score = m1 * 0.35 + m2 * 0.30 + m3 * 0.20 + m4 * 0.15
    return score, {"p3_margin": m1, "p3_rev_vol": m2, "p3_sector_rank": m3, "p3_capex": m4}


def _a2_pillar4(fin_last5: list[dict], ltp: Optional[float],
                sector_median_pe: Optional[float] = None,
                sector_median_pb: Optional[float] = None) -> tuple[float, dict]:
    """Valuation pillar. Sector medians passed in are already self-excluded by the caller.
    When self-historical data is missing, sector-relative is used at full weight (no 0.4 cap)."""
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

    score = pe_score * 0.6 + pb_score * 0.4
    return score, {
        "p4_pe": round(pe_score, 2), "p4_pb": round(pb_score, 2),
        "current_pe": round(current_pe, 2) if current_pe is not None else None,
        "current_pb": round(current_pb, 2) if current_pb is not None else None,
        "own_avg_pe": round(own_avg_pe, 2) if own_avg_pe is not None else None,
        "own_avg_pb": round(own_avg_pb, 2) if own_avg_pb is not None else None,
    }


def _a2_pillar5(fin_last5: list[dict], ltp: Optional[float],
                face: Optional[float]) -> tuple[float, dict]:
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

    # m1: DPS CAGR from first non-zero to last non-zero dividend year, over actual year gap.
    # Treats "[0, 5, 8, 10, 12]" (skipped year 1) consistently with "[5, 0, 0, 10, 12]".
    nonzero_pairs = [(y, d) for y, d in dps_pairs if d > 0]
    if len(nonzero_pairs) >= 2:
        (start_year, start_d) = nonzero_pairs[0]
        (end_year,   end_d)   = nonzero_pairs[-1]
        n = max(end_year - start_year, 1)
        try:
            cagr = (end_d / start_d) ** (1.0 / n) - 1.0
            m1 = _a2_dps_cagr_score(cagr * 100)
        except (ZeroDivisionError, ValueError, OverflowError):
            m1 = 0.0
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
    ops = [
        UpdateOne(
            {"trading_code": r["trading_code"]},
            {"$set": {**r, "computed_at": now}},
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

        is_financial = normalize_sector(sector) in ("BANK", "NBFI")
        # Sector medians computed *excluding the current company* so its own valuation
        # doesn't pull the comparison toward itself in small sectors.
        sect_pe_for_self = _sector_median_excluding(sector_pes.get(sector, []), code)
        sect_pb_for_self = _sector_median_excluding(sector_pbs.get(sector, []), code)

        p1, sub1 = _a2_pillar1(fin_rows, ext_last5, is_financial)
        p2, sub2 = _a2_pillar2(ext_last5, is_financial)
        p3, sub3 = _a2_pillar3(code, ext_last5, sector_rank_score, is_financial)
        p4, sub4 = _a2_pillar4(fin_rows, ltp, sect_pe_for_self, sect_pb_for_self)
        p5, sub5 = _a2_pillar5(fin_rows, ltp, face)

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

        base_score_100 = final * 10
        adj_pct = adjustments_map.get(code, 0.0)
        adjusted_score_100 = base_score_100 * (1 + adj_pct / 100.0) * stale_mult
        # Clamp to [0, 100] — UI and tier thresholds assume this range.
        adjusted_score_100 = max(0.0, min(100.0, adjusted_score_100))

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
