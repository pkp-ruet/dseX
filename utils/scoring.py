"""
Shared scoring utility — usable from main.py without importing Streamlit.

get_top_n_codes() replicates _build_scores_df() from app.py exactly:
  8 factors, 4 groups, multi-year averages, per-row weight re-normalisation,
  and market category multipliers.
"""
import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

_FINANCIAL_SECTORS = {
    "bank", "insurance", "financial institution", "nbfi",
    "non-bank financial institution", "leasing",
}

_W = {
    "ey_rank":     0.20,  # Earnings Yield
    "np_rank":     0.15,  # NAV / Price
    "roe_rank":    0.15,  # ROE 3yr
    "stab_rank":   0.10,  # EPS Stability
    "dy_rank":     0.15,  # Dividend Yield
    "streak_rank": 0.10,  # Dividend Streak
    "rm_rank":     0.10,  # Reserve / MCap
    "de_rank":     0.05,  # Debt Safety
}

_CAT = {"A": 1.00, "B": 0.92, "N": 0.88, "Z": 0.30}


def _is_financial_sector(sector: str) -> bool:
    if not sector:
        return False
    s = sector.lower()
    return any(k in s for k in _FINANCIAL_SECTORS)


def _latest_prices(db) -> dict[str, float]:
    """Return {trading_code: ltp} for the most recent price record per company."""
    pipeline = [
        {"$sort": {"trading_code": 1, "date": -1}},
        {"$group": {"_id": "$trading_code", "ltp": {"$first": "$ltp"}}},
    ]
    return {d["_id"]: d["ltp"] for d in db.stock_prices.aggregate(pipeline)}


def build_scores_df(db) -> pd.DataFrame:
    """
    Compute dseX scores for all non-excluded companies.
    Mirrors app.py:_build_scores_df() exactly so ranking is identical.
    Returns a DataFrame with columns: trading_code, score (and factor columns).
    """
    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
    }

    fin_docs = list(db.financials.find(
        {"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}
    ))
    if not fin_docs:
        return pd.DataFrame()

    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = (
        fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
        if "eps_cont_basic" in fin_df.columns
        else fin_df.get("eps_basic", pd.Series(dtype=float))
    )

    # ---- Per-company multi-year metric extraction ----
    per_company: dict[str, dict] = {}
    for code, grp in fin_df.groupby("trading_code"):
        grp = grp.sort_values("year")

        eps_s = grp["eps"].dropna()
        nav_s = grp["nav_per_share"].dropna() if "nav_per_share" in grp.columns else pd.Series(dtype=float)

        eps_pos = eps_s[eps_s > 0]
        eps_3yr = float(eps_pos.tail(3).mean()) if not eps_pos.empty else None

        nav_latest = float(nav_s.iloc[-1]) if not nav_s.empty else None

        roe_3yr = None
        if "nav_per_share" in grp.columns:
            roe_df = grp[["eps", "nav_per_share"]].dropna()
            roe_df = roe_df[roe_df["nav_per_share"] > 0]
            if not roe_df.empty:
                roe_3yr = float((roe_df["eps"] / roe_df["nav_per_share"]).tail(3).mean())

        eps_stab = None
        if len(eps_s) >= 3:
            mean_abs = abs(float(eps_s.mean()))
            if mean_abs > 0:
                cv = float(eps_s.std()) / mean_abs
                eps_stab = 1.0 / (1.0 + cv)

        div_3yr = float(grp["cash_dividend_pct"].fillna(0).tail(3).mean()) if "cash_dividend_pct" in grp.columns else None
        if div_3yr == 0:
            div_3yr = None

        streak = 0
        for val in grp["cash_dividend_pct"].fillna(0).values[::-1]:
            if val > 0:
                streak += 1
            else:
                break
        div_streak = streak if streak > 0 else None

        per_company[code] = {
            "eps_3yr":    eps_3yr,
            "nav_latest": nav_latest,
            "roe_3yr":    roe_3yr,
            "eps_stab":   eps_stab,
            "div_3yr":    div_3yr,
            "div_streak": div_streak,
        }

    companies = {
        d["trading_code"]: d
        for d in db.companies.find({"excluded": {"$ne": True}}, {
            "trading_code": 1, "reserve_surplus_mn": 1, "paid_up_capital_mn": 1,
            "total_shares": 1, "total_loan_mn": 1, "face_value": 1,
            "market_category": 1, "sector": 1, "_id": 0,
        })
    }

    prices = _latest_prices(db)

    all_codes = set(per_company.keys()) | set(companies.keys())
    rows = []
    for code in all_codes:
        comp  = companies.get(code, {})
        fm    = per_company.get(code, {})
        ltp   = prices.get(code)
        reserve = comp.get("reserve_surplus_mn")
        paid_up = comp.get("paid_up_capital_mn")
        shares  = comp.get("total_shares")
        loan    = comp.get("total_loan_mn")
        face    = comp.get("face_value")
        sector  = comp.get("sector", "") or ""
        cat     = (comp.get("market_category") or "").strip().upper()

        eps_3yr    = fm.get("eps_3yr")
        nav_latest = fm.get("nav_latest")
        roe_3yr    = fm.get("roe_3yr")
        eps_stab   = fm.get("eps_stab")
        div_3yr    = fm.get("div_3yr")
        div_streak = fm.get("div_streak")

        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        earn_yield = (eps_3yr / ltp * 100) if eps_3yr and ltp and ltp > 0 else None
        nav_to_price = (nav_latest / ltp) if nav_latest and nav_latest > 0 and ltp and ltp > 0 else None
        roe_val = roe_3yr if roe_3yr and roe_3yr > 0 else None
        div_yield = ((face * div_3yr / 100) / ltp * 100) if div_3yr and face and ltp and ltp > 0 else None
        res_mcap = (reserve / mcap_mn) if reserve is not None and mcap_mn and mcap_mn > 0 else None

        debt_safety = None
        if not _is_financial_sector(sector):
            equity = (reserve or 0) + (paid_up or 0)
            if loan and loan > 0 and equity > 0:
                debt_safety = equity / loan
            elif equity > 0 and (loan is None or loan == 0):
                debt_safety = equity

        rows.append({
            "trading_code": code,
            "earn_yield":   earn_yield,
            "nav_to_price": nav_to_price,
            "roe_3yr":      roe_val,
            "eps_stab":     eps_stab,
            "div_yield":    div_yield,
            "div_streak":   div_streak,
            "res_mcap":     res_mcap,
            "debt_safety":  debt_safety,
            "market_cat":   cat,
        })

    mdf = pd.DataFrame(rows)
    if mdf.empty:
        return mdf

    rank_cols = list(_W.keys())
    factor_cols = ["earn_yield", "nav_to_price", "roe_3yr", "eps_stab",
                   "div_yield", "div_streak", "res_mcap", "debt_safety"]

    mdf["ey_rank"]     = mdf["earn_yield"].rank(pct=True)
    mdf["np_rank"]     = mdf["nav_to_price"].rank(pct=True)
    mdf["roe_rank"]    = mdf["roe_3yr"].rank(pct=True)
    mdf["stab_rank"]   = mdf["eps_stab"].rank(pct=True)
    mdf["dy_rank"]     = mdf["div_yield"].rank(pct=True)
    mdf["streak_rank"] = mdf["div_streak"].rank(pct=True)
    mdf["rm_rank"]     = mdf["res_mcap"].rank(pct=True)
    mdf["de_rank"]     = mdf["debt_safety"].rank(pct=True)

    w_series  = pd.Series(_W)
    rank_mat  = mdf[rank_cols]
    w_avail   = rank_mat.notna().astype(float).multiply(w_series)
    w_sum     = w_avail.sum(axis=1)
    weighted  = rank_mat.fillna(0).multiply(w_series).sum(axis=1)
    raw_score = np.where(w_sum > 0, weighted / w_sum * 100, np.nan)

    cat_mult = mdf["market_cat"].map(lambda c: _CAT.get(c, 0.88))
    mdf["score"] = np.round(raw_score * cat_mult, 1)
    mdf.loc[~rank_mat.notna().any(axis=1), "score"] = np.nan

    return mdf


def get_top_n_codes(db, n: int = 50) -> list[str]:
    """Return trading codes for the top-n companies by dseX score."""
    mdf = build_scores_df(db)
    if mdf.empty:
        logger.warning("No scored companies found — cannot compute top-%d codes", n)
        return []
    top = mdf[mdf["score"].notna()].nlargest(n, "score")
    return list(top["trading_code"])
