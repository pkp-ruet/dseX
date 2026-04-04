"""
DSEF 5-pillar scoring algorithm — ported from scoring.py without Streamlit.
All @st.cache_data decorators replaced with module-level TTL caches.
"""
import math
import time
import numpy as np
import pandas as pd
from typing import Optional

from backend.services.db_service import (
    get_db, load_latest_prices, load_all_company_codes,
)
from utils.sector import normalize_sector



# ---------------------------------------------------------------------------
# Scoring helper — absolute 1–10 scale with linear interpolation
# ---------------------------------------------------------------------------

def _score(value, anchors):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
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


# ---------------------------------------------------------------------------
# Algorithm 2 — DSE Fundamental Stock Scoring (5-pillar)
# ---------------------------------------------------------------------------

def _a2_is_insurance(sector: str) -> bool:
    return "insurance" in (sector or "").lower()


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
    eps_vals = [r.get("eps") for r in fin_last5]

    consistent = sum(1 for e in eps_vals if e is not None and e > 0)
    total_years = sum(1 for e in eps_vals if e is not None)
    if total_years == 0:
        m1 = 0.0
    elif consistent >= 5: m1 = 10.0
    elif consistent >= 4: m1 = 8.0
    elif consistent >= 3: m1 = 5.0
    else:                 m1 = 0.0

    valid_eps = [(i, e) for i, e in enumerate(eps_vals) if e is not None]
    if len(valid_eps) < 2:
        m2 = 0.0
    else:
        start_e = valid_eps[0][1]
        end_e   = valid_eps[-1][1]
        n       = valid_eps[-1][0] - valid_eps[0][0] or 1
        if end_e <= 0:
            m2 = 0.0
        elif start_e <= 0:
            try:
                abs_cagr = (end_e / abs(start_e)) ** (1.0 / n) - 1.0
                m2 = min(_a2_eps_cagr_score(abs_cagr * 100), 4.0)
            except (ZeroDivisionError, ValueError):
                m2 = 0.0
        else:
            try:
                cagr = (end_e / start_e) ** (1.0 / n) - 1.0
                m2 = _a2_eps_cagr_score(cagr * 100)
            except (ZeroDivisionError, ValueError):
                m2 = 0.0

    roe_vals = []
    for er in ext_last5:
        np_v = er.get("net_profit")
        eq_v = er.get("total_equity")
        if np_v is not None and eq_v and eq_v > 0:
            roe_vals.append(np_v / eq_v * 100)
    if roe_vals:
        m3 = _a2_roe_score(sum(roe_vals) / len(roe_vals))
        if len(roe_vals) >= 4:
            first_half = sum(roe_vals[:2]) / 2
            last_half  = sum(roe_vals[-2:]) / 2
            if last_half > first_half:
                m3 = min(m3 + 1.0, 10.0)
            elif last_half < first_half:
                m3 = max(m3 - 1.0, 0.0)
    else:
        m3 = 0.0

    npm_vals = []
    for er in ext_last5:
        np_v  = er.get("net_profit")
        rev_v = _effective_revenue(er, is_financial)
        if np_v is not None and rev_v is not None:
            npm_vals.append(np_v / rev_v * 100)
    if len(npm_vals) < 2:
        m4 = 0.0
    else:
        # Linear regression slope: captures true trend across all points
        x = np.arange(len(npm_vals), dtype=float)
        y = np.array(npm_vals)
        slope = float(np.polyfit(x, y, 1)[0])
        if slope > 2:        m4 = 10.0
        elif slope > 0.5:    m4 = 7.0
        elif slope >= -0.5:  m4 = 5.0
        else:                m4 = 2.0

    eps_yoy = None
    if len(valid_eps) >= 2:
        prev, curr = valid_eps[-2][1], valid_eps[-1][1]
        if prev and prev != 0:
            eps_yoy = round((curr - prev) / abs(prev) * 100, 1)

    score = m1 * 0.20 + m2 * 0.30 + m3 * 0.30 + m4 * 0.20
    return score, {"p1_eps_consist": m1, "p1_eps_cagr": m2, "p1_roe": m3, "p1_npm_trend": m4,
                   "eps_yoy_pct": eps_yoy}


def _a2_pillar2(ext_last5: list[dict], is_financial: bool = False) -> tuple[float, dict]:
    latest = ext_last5[-1] if ext_last5 else {}

    debt = latest.get("total_debt")
    eq   = latest.get("total_equity")
    if debt is not None and eq and eq > 0:
        m1 = _a2_de_score(float(debt) / float(eq), is_financial)
    else:
        m1 = 0.0

    ebit    = latest.get("ebit")
    int_exp = latest.get("interest_expense")
    if ebit is not None and int_exp and int_exp > 0:
        m2 = _a2_ic_score(ebit / int_exp)
    elif ebit is not None and ebit > 0:
        m2 = 10.0
    else:
        m2 = 0.0

    ext_m3   = ext_last5[-4:]
    np_vals  = [er.get("net_profit") for er in ext_m3]
    cfo_vals = [er.get("operating_cf") for er in ext_m3]
    # Pair valid CFO/NP for ratio calculation
    cfo_np_ratios = []
    for cfo, np_v in zip(cfo_vals, np_vals):
        if cfo is not None and np_v is not None and np_v > 0:
            cfo_np_ratios.append(cfo / np_v)
    valid_cfos = [c for c in cfo_vals if c is not None]
    if not valid_cfos:
        m3 = 0.0
    elif is_financial:
        # For banks/NBFIs: CFO/NP ratio is structurally low (growing loan book
        # consumes operating cash). Score on positivity + trend instead.
        pos_count = sum(1 for c in valid_cfos if c > 0)
        pos_frac = pos_count / len(valid_cfos)
        sorted_cfos = sorted(valid_cfos)
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
        cfo_np_ratios.sort()
        median_ratio = cfo_np_ratios[len(cfo_np_ratios) // 2]
        pos_count = sum(1 for c in valid_cfos if c > 0)
        # Base score from median CFO/NP ratio
        if median_ratio > 1.2:     m3 = 10.0
        elif median_ratio >= 1.0:  m3 = 8.0
        elif median_ratio >= 0.7:  m3 = 5.0
        elif median_ratio >= 0.3:  m3 = 3.0
        else:                      m3 = 0.0
        # Penalty if CFO is frequently negative
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
        if cash is not None and ta and ta > 0:
            cash_pct = float(cash) / float(ta) * 100
            m4 = _a2_cash_assets_score(cash_pct)
        else:
            m4 = 0.0

    if m4 is None:
        # Banks: redistribute cash/assets weight proportionally across D/E, IC, CFO
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
            if nii is not None and ea and float(ea) > 0:
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
            if gp is not None and rev is not None and float(rev) > 0:
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
        ]
        mean_g = sum(growth_rates) / len(growth_rates)
        std_g  = (sum((g - mean_g) ** 2 for g in growth_rates) / len(growth_rates)) ** 0.5
        m2 = _a2_rev_vol_score(std_g, mean_g)
    else:
        m2 = 0.0

    m3 = sector_rank_score.get(code, 2.0)

    # CapEx reinvestment intensity (avg CapEx / avg Revenue)
    capex_vals = []
    for er in ext_last5:
        cx = er.get("capex")
        rv = _effective_revenue(er, is_financial)
        if cx is not None and rv is not None:
            capex_vals.append(abs(float(cx)) / rv * 100)
    m4 = _a2_capex_score(sum(capex_vals) / len(capex_vals)) if capex_vals else 0.0

    score = m1 * 0.35 + m2 * 0.30 + m3 * 0.20 + m4 * 0.15
    return score, {"p3_margin": m1, "p3_rev_vol": m2, "p3_sector_rank": m3, "p3_capex": m4}


def _a2_pillar4(fin_last5: list[dict], ltp: Optional[float],
                sector_median_pe: Optional[float] = None,
                sector_median_pb: Optional[float] = None) -> tuple[float, dict]:
    if ltp is None or ltp <= 0:
        return 0.0, {"p4_pe": 0.0, "p4_pb": 0.0}

    curr_eps = next((r["eps"] for r in reversed(fin_last5)
                     if r.get("eps") is not None and r["eps"] > 0), None)
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
        # Self-historical P/E score
        if len(hist_pes) >= 2:
            avg_hist_pe = sum(hist_pes) / len(hist_pes)
            self_pe = _a2_pe_pb_ratio_score(current_pe / avg_hist_pe) if avg_hist_pe > 0 else 0.0
        else:
            self_pe = 0.0
        # Sector-relative P/E score
        if sector_median_pe and sector_median_pe > 0:
            sect_pe = _a2_pe_pb_ratio_score(current_pe / sector_median_pe)
            pe_score = self_pe * 0.6 + sect_pe * 0.4
        else:
            pe_score = self_pe

    curr_nav = next((r["nav_per_share"] for r in reversed(fin_last5)
                     if r.get("nav_per_share") is not None and r["nav_per_share"] > 0), None)
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
        # Self-historical P/B score
        if len(hist_pbs) >= 2:
            avg_hist_pb = sum(hist_pbs) / len(hist_pbs)
            self_pb = _a2_pe_pb_ratio_score(current_pb / avg_hist_pb) if avg_hist_pb > 0 else 0.0
        else:
            self_pb = 0.0
        # Sector-relative P/B score
        if sector_median_pb and sector_median_pb > 0:
            sect_pb = _a2_pe_pb_ratio_score(current_pb / sector_median_pb)
            pb_score = self_pb * 0.6 + sect_pb * 0.4
        else:
            pb_score = self_pb

    score = pe_score * 0.6 + pb_score * 0.4
    return score, {"p4_pe": round(pe_score, 2), "p4_pb": round(pb_score, 2)}


def _a2_pillar5(fin_last5: list[dict], ltp: Optional[float],
                face: Optional[float]) -> tuple[float, dict]:
    face_val = float(face) if face and face > 0 else 10.0

    dps_vals = [
        float(r.get("cash_dividend_pct") or 0) * face_val / 100.0
        for r in fin_last5
    ]

    start_d = dps_vals[0] if dps_vals else 0
    end_d   = dps_vals[-1] if dps_vals else 0
    n = max(len(dps_vals) - 1, 1)
    nonzero = [d for d in dps_vals if d > 0]
    if len(nonzero) >= 2 and start_d > 0 and end_d > 0:
        try:
            cagr = (end_d / start_d) ** (1.0 / n) - 1.0
            m1 = _a2_dps_cagr_score(cagr * 100)
        except (ZeroDivisionError, ValueError):
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
# Main scoring function (TTL cached)
# ---------------------------------------------------------------------------

_scores_cache: dict = {"df": None, "at": 0.0}
_SCORES_TTL = 300  # seconds


def invalidate_scores_cache() -> None:
    """Force the next call to _algo2_scores() to recompute from DB."""
    global _scores_cache
    _scores_cache = {"df": None, "at": 0.0}


def _algo2_scores() -> pd.DataFrame:
    global _scores_cache
    if _scores_cache["df"] is not None and time.time() - _scores_cache["at"] < _SCORES_TTL:
        return _scores_cache["df"]

    db = get_db()

    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
    }

    companies = {
        d["trading_code"]: d
        for d in db.companies.find({"excluded": {"$ne": True}}, {
            "trading_code": 1, "total_shares": 1, "face_value": 1,
            "market_category": 1, "sector": 1, "_id": 0,
        })
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

    ext_docs = list(db.company_financials_ext.find(
        {"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}
    ))
    ext_by_code: dict[str, list] = {}
    for doc in ext_docs:
        ext_by_code.setdefault(doc["trading_code"], []).append(doc)
    for code in ext_by_code:
        ext_by_code[code].sort(key=lambda x: x["year"])

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
                sr = 10.0
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

    # Pre-compute sector median P/E and P/B for sector-relative valuation
    sector_pes: dict[str, list[float]] = {}
    sector_pbs: dict[str, list[float]] = {}
    for code, comp in companies.items():
        sector = comp.get("sector", "") or ""
        p = (prices.get(code) or {}).get("ltp")
        if not p or p <= 0:
            continue
        fin_rows_tmp = (
            fin_df[fin_df["trading_code"] == code]
            .sort_values("year")
            .tail(5)
            .to_dict("records")
        )
        eps_v = next((r["eps"] for r in reversed(fin_rows_tmp)
                      if r.get("eps") is not None and r["eps"] > 0), None)
        nav_v = next((r["nav_per_share"] for r in reversed(fin_rows_tmp)
                      if r.get("nav_per_share") is not None and r["nav_per_share"] > 0), None)
        if eps_v:
            sector_pes.setdefault(sector, []).append(p / eps_v)
        if nav_v:
            sector_pbs.setdefault(sector, []).append(p / nav_v)
    sector_median_pe: dict[str, float] = {}
    sector_median_pb: dict[str, float] = {}
    for s, vals in sector_pes.items():
        vals.sort()
        sector_median_pe[s] = vals[len(vals) // 2]
    for s, vals in sector_pbs.items():
        vals.sort()
        sector_median_pb[s] = vals[len(vals) // 2]

    rows = []
    for code, comp in companies.items():
        ltp    = (prices.get(code) or {}).get("ltp")
        shares = comp.get("total_shares")
        face   = comp.get("face_value")
        cat    = (comp.get("market_category") or "").strip().upper()
        sector = comp.get("sector", "") or ""
        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        if _a2_is_insurance(sector):
            rows.append({
                "trading_code": code, "sector": sector, "market_cat": cat,
                "ltp": ltp, "mcap_mn": mcap_mn, "score": float("nan"),
            })
            continue

        fin_rows = (
            fin_df[fin_df["trading_code"] == code]
            .sort_values("year")
            .tail(5)
            .to_dict("records")
        )
        ext_rows_all = ext_by_code.get(code, [])
        ext_last5    = ext_rows_all[-5:]

        is_financial = normalize_sector(sector) in ("BANK", "NBFI")
        p1, sub1 = _a2_pillar1(fin_rows, ext_last5, is_financial)
        p2, sub2 = _a2_pillar2(ext_last5, is_financial)
        p3, sub3 = _a2_pillar3(code, ext_last5, sector_rank_score, is_financial)
        p4, sub4 = _a2_pillar4(fin_rows, ltp,
                               sector_median_pe.get(sector),
                               sector_median_pb.get(sector))
        p5, sub5 = _a2_pillar5(fin_rows, ltp, face)

        final = p1 * 0.30 + p2 * 0.20 + p3 * 0.20 + p4 * 0.15 + p5 * 0.15

        row = {
            "trading_code": code,
            "sector":       sector,
            "market_cat":   cat,
            "ltp":          ltp,
            "mcap_mn":      mcap_mn,
            "score":        round(final * 10, 1),
            "p1_biz":       round(p1, 2),
            "p2_health":    round(p2, 2),
            "p3_moat":      round(p3, 2),
            "p4_val":       round(p4, 2),
            "p5_div":       round(p5, 2),
        }
        row.update(sub1)
        row.update(sub2)
        row.update(sub3)
        row.update(sub4)
        row.update(sub5)
        rows.append(row)

    df = pd.DataFrame(rows)
    _scores_cache = {"df": df, "at": time.time()}
    return df


def build_scores_df() -> pd.DataFrame:
    return _algo2_scores()


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
