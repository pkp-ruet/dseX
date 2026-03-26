import math
import numpy as np
import pandas as pd
import streamlit as st

# Lazy import to avoid circular dependency with app.py
def _get_app():
    import app
    return app


# ---------------------------------------------------------------------------
# Scoring helper — absolute 1–10 scale with linear interpolation
# ---------------------------------------------------------------------------

def _score(value, anchors):
    """
    Score a value on a 1–10 scale using linear interpolation between anchors.

    anchors: list of (threshold, score) tuples, sorted ascending by threshold.
    Values outside the range are clamped to the min/max anchor score.

    Example (higher=better):  [(0.5, 1), (0.9, 5), (1.2, 10)]
    Example (lower=better):   [(1, 10), (2, 5), (4, 1)]
    """
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
# Algorithm 2 — DSE Fundamental Stock Scoring (5-pillar, sector-aware)
# ---------------------------------------------------------------------------

def _a2_classify_sector(sector: str) -> str:
    s = (sector or "").lower()
    if "bank" in s:
        return "BANK"
    if any(x in s for x in ["nbfi", "non-bank", "leasing", "finance"]):
        return "NBFI"
    return "GENERAL"


def _a2_is_insurance(sector: str) -> bool:
    return "insurance" in (sector or "").lower()


def _a2_eps_cagr_score(cagr_pct: float) -> float:
    if cagr_pct > 15:   return 10.0
    if cagr_pct >= 10:  return 8.0
    if cagr_pct >= 7:   return 6.0
    if cagr_pct >= 3:   return 4.0
    if cagr_pct >= 0:   return 2.0
    return 0.0


def _a2_roe_score(roe_pct: float) -> float:
    if roe_pct > 20:   return 10.0
    if roe_pct >= 15:  return 8.0
    if roe_pct >= 10:  return 6.0
    if roe_pct >= 5:   return 3.0
    return 0.0


def _a2_de_score(de: float) -> float:
    if de < 0.3:   return 10.0
    if de < 0.6:   return 8.0
    if de < 1.0:   return 6.0
    if de < 1.5:   return 3.0
    return 0.0


def _a2_ic_score(ic: float) -> float:
    if ic > 10:    return 10.0
    if ic >= 5:    return 8.0
    if ic >= 3:    return 5.0
    if ic >= 1.5:  return 2.0
    return 0.0


def _a2_cash_assets_score(pct: float) -> float:
    if pct > 15:   return 10.0
    if pct >= 10:  return 7.0
    if pct >= 5:   return 5.0
    return 2.0


def _a2_gm_score(avg_gm: float, trend: float) -> float:
    # trend and avg_gm in percentage points; stable = |trend| ≤ 1pp
    stable = abs(trend) <= 1.0
    if avg_gm > 30 and trend > 0:   return 10.0
    if avg_gm > 30 and stable:      return 8.0
    if avg_gm >= 15 and trend > 0:  return 7.0
    if avg_gm >= 15 and stable:     return 5.0
    return 2.0


def _a2_nim_score(avg_nim: float, trend: float) -> float:
    # trend and avg_nim in percentage points; stable = |trend| ≤ 0.5pp
    stable = abs(trend) <= 0.5
    if avg_nim > 4 and trend > 0:    return 10.0
    if avg_nim > 4 and stable:       return 8.0
    if avg_nim >= 2.5 and trend > 0: return 7.0
    if avg_nim >= 2.5 and stable:    return 5.0
    return 2.0


def _a2_rev_vol_score(cv: float) -> float:
    if cv < 5:    return 10.0
    if cv < 10:   return 7.0
    if cv < 20:   return 4.0
    return 1.0


def _a2_pe_pb_ratio_score(ratio: float) -> float:
    """Score current vs 5yr-avg ratio: <0.70 → 10, >1.20 → 1."""
    if ratio < 0.70:   return 10.0
    if ratio < 0.85:   return 8.0
    if ratio < 1.00:   return 6.0
    if ratio < 1.20:   return 4.0
    return 1.0


def _a2_dps_cagr_score(cagr_pct: float) -> float:
    if cagr_pct > 15:  return 10.0
    if cagr_pct >= 10: return 8.0
    if cagr_pct >= 5:  return 6.0
    if cagr_pct >= 0:  return 3.0
    return 0.0


def _a2_div_yield_score(yield_pct: float) -> float:
    if yield_pct > 5:   return 10.0
    if yield_pct >= 3:  return 7.0
    if yield_pct >= 1:  return 4.0
    return 1.0


def _a2_pillar1(fin_last5: list[dict], ext_last5: list[dict]) -> tuple[float, dict]:
    """Business Quality: EPS consistency, EPS CAGR, avg ROE, NPM trend. Returns (score, sub_scores)."""
    eps_vals = [r.get("eps") for r in fin_last5]

    # M1: EPS Consistency
    consistent = sum(1 for e in eps_vals if e is not None and e > 0)
    total_years = sum(1 for e in eps_vals if e is not None)
    if total_years == 0:
        m1 = 0.0
    elif consistent >= 5: m1 = 10.0
    elif consistent >= 4: m1 = 8.0
    elif consistent >= 3: m1 = 5.0
    else:                 m1 = 0.0

    # M2: EPS CAGR (5yr) with negative EPS rules
    valid_eps = [(i, e) for i, e in enumerate(eps_vals) if e is not None]
    if len(valid_eps) < 2:
        m2 = 0.0
    else:
        start_e = valid_eps[0][1]
        end_e   = valid_eps[-1][1]
        n       = valid_eps[-1][0] - valid_eps[0][0] or 1
        if end_e <= 0:
            m2 = 0.0  # current negative
        elif start_e <= 0:
            # historical neg, current positive — use abs, cap at 4
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

    # M3: Avg ROE (5yr)
    roe_vals = []
    for er in ext_last5:
        np_v = er.get("net_profit")
        eq_v = er.get("total_equity")
        if np_v is not None and eq_v and eq_v > 0:
            roe_vals.append(np_v / eq_v * 100)
    m3 = _a2_roe_score(sum(roe_vals) / len(roe_vals)) if roe_vals else 0.0

    # M4: Net Profit Margin Trend
    npm_vals = []
    for er in ext_last5:
        np_v  = er.get("net_profit")
        rev_v = er.get("revenue")
        if np_v is not None and rev_v and rev_v > 0:
            npm_vals.append(np_v / rev_v * 100)
    if len(npm_vals) < 2:
        m4 = 0.0
    else:
        delta = npm_vals[-1] - npm_vals[0]
        if delta > 3:        m4 = 10.0
        elif delta > 0:      m4 = 7.0
        elif abs(delta) <= 1: m4 = 5.0
        else:                m4 = 2.0

    score = (m1 + m2 + m3 + m4) / 4
    return score, {"p1_eps_consist": m1, "p1_eps_cagr": m2, "p1_roe": m3, "p1_npm_trend": m4}


def _a2_pillar2(sec_type: str, ext_last5: list[dict]) -> tuple[float, dict]:
    """Financial Health: D/E, interest coverage, CFO, cash/assets."""
    latest = ext_last5[-1] if ext_last5 else {}

    # M1: Debt-to-Equity
    if sec_type in ("BANK", "NBFI"):
        m1 = 5.0
    else:
        debt = latest.get("total_debt")
        eq   = latest.get("total_equity")
        if debt is not None and eq and eq > 0:
            m1 = _a2_de_score(float(debt) / float(eq))
        else:
            m1 = 0.0

    # M2: Interest Coverage Ratio
    if sec_type in ("BANK", "NBFI"):
        m2 = 5.0
    else:
        ebit     = latest.get("ebit")
        int_exp  = latest.get("interest_expense")
        if ebit is not None and int_exp and int_exp > 0:
            m2 = _a2_ic_score(ebit / int_exp)
        elif ebit is not None and ebit > 0:
            m2 = 10.0  # profitable with no interest → debt-free bonus
        else:
            m2 = 0.0

    # M3: Cash Flow from Operations
    cfo_vals = [er.get("operating_cf") for er in ext_last5]
    np_vals  = [er.get("net_profit")  for er in ext_last5]
    valid_cfos = [c for c in cfo_vals if c is not None]
    if not valid_cfos:
        m3 = 0.0
    else:
        all_pos = len(valid_cfos) == 5 and all(c > 0 for c in valid_cfos)
        mostly_pos = sum(1 for c in valid_cfos if c > 0) >= 3
        if all_pos:
            valid_nps = [n for n in np_vals if n is not None]
            np_avg  = sum(valid_nps) / len(valid_nps) if valid_nps else None
            cfo_avg = sum(valid_cfos) / len(valid_cfos)
            m3 = 10.0 if (np_avg is not None and cfo_avg > np_avg) else 7.0
        elif mostly_pos:
            m3 = 4.0
        else:
            m3 = 0.0

    # M4: Cash & Cash Equivalents / Total Assets
    cash = latest.get("cash_and_equivalents")
    ta   = latest.get("total_assets")
    if cash is not None and ta and ta > 0:
        m4 = _a2_cash_assets_score(float(cash) / float(ta) * 100)
    else:
        m4 = 0.0

    score = (m1 + m2 + m3 + m4) / 4
    return score, {"p2_de": m1, "p2_ic": m2, "p2_cfo": m3, "p2_cash": m4}


def _a2_pillar3(sec_type: str, code: str, ext_last5: list[dict],
                sector_rank_score: dict[str, float]) -> tuple[float, dict]:
    """Competitive Moat: gross margin/NIM, revenue volatility, sector rank."""

    def _trend(vals: list[float]) -> float:
        """Avg(last 2) - Avg(first 2); falls back to last-minus-first for < 4 points."""
        if len(vals) >= 4:
            return (vals[-2] + vals[-1]) / 2 - (vals[0] + vals[1]) / 2
        if len(vals) >= 2:
            return vals[-1] - vals[0]
        return 0.0

    # M1: Gross Margin (GENERAL) or NIM (BANK/NBFI)
    if sec_type in ("BANK", "NBFI"):
        nim_vals = []
        for er in ext_last5:
            nii = er.get("net_interest_income")
            ea  = er.get("earning_assets")
            if nii is not None and ea is not None and float(ea) > 0:
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

    # M2: Revenue Volatility — std dev of YoY growth rates (%)
    rev_vals = [float(er["revenue"]) for er in ext_last5
                if er.get("revenue") is not None and float(er["revenue"]) > 0]
    if len(rev_vals) >= 3:
        growth_rates = [
            (rev_vals[i] - rev_vals[i - 1]) / rev_vals[i - 1] * 100
            for i in range(1, len(rev_vals))
        ]
        mean_g = sum(growth_rates) / len(growth_rates)
        std_g  = (sum((g - mean_g) ** 2 for g in growth_rates) / len(growth_rates)) ** 0.5
        m2 = _a2_rev_vol_score(std_g)
    else:
        m2 = 0.0

    # M3: Sector Revenue Rank
    m3 = sector_rank_score.get(code, 2.0)

    score = (m1 + m2 + m3) / 3
    return score, {"p3_margin": m1, "p3_rev_vol": m2, "p3_sector_rank": m3}


def _a2_pillar4(fin_last5: list[dict], ltp: float | None) -> tuple[float, dict]:
    """Valuation: current P/E vs 5yr avg P/E, current P/B vs 5yr avg P/B."""
    if ltp is None or ltp <= 0:
        return 0.0, {"p4_pe": 0.0, "p4_pb": 0.0}

    # P/E Score — use stored DSE P/E ratios (year-end price ÷ EPS)
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
        if len(hist_pes) >= 2:
            avg_hist_pe = sum(hist_pes) / len(hist_pes)
            pe_score = _a2_pe_pb_ratio_score(current_pe / avg_hist_pe) if avg_hist_pe > 0 else 0.0
        else:
            pe_score = 0.0

    # P/B Score — derive year-end price = pe_ratio × eps, then P/B = price / nav
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
        if len(hist_pbs) >= 2:
            avg_hist_pb = sum(hist_pbs) / len(hist_pbs)
            pb_score = _a2_pe_pb_ratio_score(current_pb / avg_hist_pb) if avg_hist_pb > 0 else 0.0
        else:
            pb_score = 0.0

    score = pe_score * 0.6 + pb_score * 0.4
    return score, {"p4_pe": round(pe_score, 2), "p4_pb": round(pb_score, 2)}


def _a2_pillar5(fin_last5: list[dict], ltp: float | None,
                face: float | None) -> tuple[float, dict]:
    """Dividend Quality: DPS CAGR, consistency, yield."""
    face_val = float(face) if face and face > 0 else 10.0

    dps_vals = [
        float(r.get("cash_dividend_pct") or 0) * face_val / 100.0
        for r in fin_last5
    ]

    # M1: DPS CAGR
    start_d, end_d = dps_vals[0] if dps_vals else 0, dps_vals[-1] if dps_vals else 0
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

    # M2: Dividend Consistency
    paid = sum(1 for d in dps_vals if d > 0)
    if paid >= 5:   m2 = 10.0
    elif paid == 4: m2 = 7.0
    elif paid == 3: m2 = 4.0
    else:           m2 = 0.0

    # M3: Dividend Yield
    latest_dps = dps_vals[-1] if dps_vals else 0.0
    if ltp and ltp > 0 and latest_dps > 0:
        m3 = _a2_div_yield_score(latest_dps / ltp * 100)
    else:
        m3 = 0.0

    score = m1 * 0.50 + m2 * 0.35 + m3 * 0.15
    return score, {"p5_dps_cagr": m1, "p5_consist": m2, "p5_yield": m3}


@st.cache_data(ttl=300)
def _algo2_scores() -> pd.DataFrame:
    """
    dseX Fundamental Score (0–100) — 5-pillar sector-aware scoring.

    Pillar                   Weight  Metrics
    ─────────────────────────────────────────────────────────────────────────
    1. Business Quality       30%    EPS consistency, EPS CAGR, avg ROE, NPM trend
    2. Financial Health       20%    D/E, interest coverage, CFO quality, cash ratio
    3. Competitive Moat       20%    Gross margin/NIM, revenue volatility, sector rank
    4. Valuation              15%    P/E vs 5yr avg, P/B vs 5yr avg
    5. Dividend Quality       15%    DPS CAGR, consistency, yield

    Insurance companies: excluded.
    Missing data → score 0 (no exceptions).
    Lookback: 5 years for all metrics.
    """
    db = _get_app().get_mongo_db()

    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
    }

    # ---- Company metadata ----
    companies = {
        d["trading_code"]: d
        for d in db.companies.find({"excluded": {"$ne": True}}, {
            "trading_code": 1, "total_shares": 1, "face_value": 1,
            "market_category": 1, "sector": 1, "_id": 0,
        })
    }

    # ---- Financials (EPS, NAV, dividend per year) ----
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

    # ---- Extended financials ----
    ext_docs = list(db.company_financials_ext.find(
        {"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}
    ))
    ext_by_code: dict[str, list] = {}
    for doc in ext_docs:
        ext_by_code.setdefault(doc["trading_code"], []).append(doc)
    for code in ext_by_code:
        ext_by_code[code].sort(key=lambda x: x["year"])

    # ---- Sector revenue rank (latest revenue per company within sector type) ----
    latest_rev_by_code: dict[str, float] = {}
    for code, rows in ext_by_code.items():
        for row in reversed(rows):
            rev = row.get("revenue")
            if rev and rev > 0:
                latest_rev_by_code[code] = float(rev)
                break

    sector_type_of_code: dict[str, str] = {
        code: _a2_classify_sector(comp.get("sector", ""))
        for code, comp in companies.items()
    }
    sector_buckets: dict[str, list] = {}
    for code, rev in latest_rev_by_code.items():
        st_type = sector_type_of_code.get(code, "GENERAL")
        sector_buckets.setdefault(st_type, []).append((code, rev))

    sector_rank_score: dict[str, float] = {}
    for st_type, items in sector_buckets.items():
        items_sorted = sorted(items, key=lambda x: x[1], reverse=True)
        n = len(items_sorted)
        for rank_idx, (code, _) in enumerate(items_sorted):
            pct = (rank_idx + 1) / n
            if rank_idx == 0:       sr = 10.0
            elif pct <= 0.25:       sr = 7.0
            elif pct <= 0.50:       sr = 5.0
            else:                   sr = 2.0
            sector_rank_score[code] = sr

    prices = _get_app().load_latest_prices()

    # ---- Per-company scoring ----
    rows = []
    for code, comp in companies.items():
        ltp     = (prices.get(code) or {}).get("ltp")
        shares  = comp.get("total_shares")
        face    = comp.get("face_value")
        cat     = (comp.get("market_category") or "").strip().upper()
        sector  = comp.get("sector", "") or ""
        sec_type = _a2_classify_sector(sector)
        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        # Insurance: excluded
        if _a2_is_insurance(sector):
            rows.append({
                "trading_code": code, "sector": sector, "market_cat": cat,
                "ltp": ltp, "mcap_mn": mcap_mn, "score": float("nan"),
            })
            continue

        # Prepare per-company data slices (last 5 years)
        fin_rows = (
            fin_df[fin_df["trading_code"] == code]
            .sort_values("year")
            .tail(5)
            .to_dict("records")
        )
        ext_rows_all  = ext_by_code.get(code, [])
        ext_last5     = ext_rows_all[-5:]

        p1, sub1 = _a2_pillar1(fin_rows, ext_last5)
        p2, sub2 = _a2_pillar2(sec_type, ext_last5)
        p3, sub3 = _a2_pillar3(sec_type, code, ext_last5, sector_rank_score)
        p4, sub4 = _a2_pillar4(fin_rows, ltp)
        p5, sub5 = _a2_pillar5(fin_rows, ltp, face)

        final = p1 * 0.30 + p2 * 0.20 + p3 * 0.20 + p4 * 0.15 + p5 * 0.15

        row = {
            "trading_code": code,
            "sector":       sector,
            "market_cat":   cat,
            "ltp":          ltp,
            "mcap_mn":      mcap_mn,
            "score":        round(final * 10, 1),  # 0–10 → 0–100
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

    return pd.DataFrame(rows)


from typing import Callable

ALGO_REGISTRY: dict[str, Callable[[], "pd.DataFrame"]] = {
    "DSEF": _algo2_scores,
}
ALGO_NAMES = list(ALGO_REGISTRY.keys())


@st.cache_data(ttl=300)
def build_scores_df(algorithm: str = "DSEF") -> "pd.DataFrame":
    fn = ALGO_REGISTRY.get(algorithm, _algo2_scores)
    return fn()


@st.cache_data(ttl=300)
def compute_composite_scores():
    mdf = build_scores_df("DSEF")
    if mdf.empty:
        return {}
    return dict(zip(mdf["trading_code"], mdf["score"]))


def _get_company_score_row(trading_code: str) -> dict | None:
    mdf = build_scores_df("DSEF")
    if mdf.empty:
        return None
    row = mdf[mdf["trading_code"] == trading_code]
    if row.empty:
        return None
    scored = mdf[mdf["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    rank_pos = scored[scored["trading_code"] == trading_code].index
    d = row.iloc[0].to_dict()
    d["overall_rank"] = int(rank_pos[0]) + 1 if len(rank_pos) else None
    d["total_scored"] = len(scored)
    return d
