import numpy as np
import pandas as pd
import streamlit as st

# Lazy imports to avoid circular dependency with app.py
def _get_app():
    import app
    return app


# ---------------------------------------------------------------------------
# Composite scoring
# ---------------------------------------------------------------------------


# Sectors where debt is a core business product — skip Debt/Equity factor
_FINANCIAL_SECTORS = {"bank", "insurance", "financial institution", "nbfi",
                      "non-bank financial institution", "leasing"}

def _is_financial_sector(sector: str) -> bool:
    return any(k in sector.lower() for k in _FINANCIAL_SECTORS) if sector else False


@st.cache_data(ttl=300)
def _build_scores_df():
    """
    dseX Score (0-100) — 8 factors, 4 groups, multi-year averages.

    Group 1 — Valuation (35%):
      20%  Earnings Yield    — 3yr avg EPS / current LTP
      15%  Price-to-NAV inv  — latest NAV/share ÷ LTP (higher = trading below book)

    Group 2 — Profitability Quality (25%):
      15%  ROE               — 3yr avg (EPS / NAV per share per year)
      10%  EPS Stability     — inverse of coefficient of variation across all years

    Group 3 — Dividend Quality (25%):
      15%  Dividend Yield    — 3yr avg cash dividend / face value / LTP
      10%  Dividend Streak   — consecutive years with cash dividend > 0

    Group 4 — Balance Sheet Safety (15%):
      10%  Reserve / MCap    — reserve_surplus_mn / market_cap_mn
       5%  Debt Safety       — (reserve + paid_up) / total_loan; skipped for financial sector

    Post-score multiplier by market category: A=1.00 B=0.92 N=0.88 Z=0.30
    Missing factors are excluded and weights re-normalised per company.
    """
    db = _get_app().get_mongo_db()

    excluded_codes = {
        d["trading_code"]
        for d in db.companies.find({"excluded": True}, {"trading_code": 1, "_id": 0})
    }
    fin_docs = list(db.financials.find({"trading_code": {"$nin": list(excluded_codes)}}, {"_id": 0}))
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
        div_s = grp["cash_dividend_pct"].dropna() if "cash_dividend_pct" in grp.columns else pd.Series(dtype=float)

        # 3yr average EPS (positive-only; loss years excluded so yield stays meaningful)
        eps_pos = eps_s[eps_s > 0]
        eps_3yr = float(eps_pos.tail(3).mean()) if not eps_pos.empty else None

        # Latest NAV per share
        nav_latest = float(nav_s.iloc[-1]) if not nav_s.empty else None

        # 3yr average ROE = avg(EPS/NAV) computed year-by-year
        roe_3yr = None
        if "nav_per_share" in grp.columns:
            roe_df = grp[["eps", "nav_per_share"]].dropna()
            roe_df = roe_df[roe_df["nav_per_share"] > 0]
            if not roe_df.empty:
                roe_vals = (roe_df["eps"] / roe_df["nav_per_share"]).tail(3)
                roe_3yr = float(roe_vals.mean())

        # EPS Stability: 1/(1+CV) across all years; needs >= 3 years
        eps_stab = None
        if len(eps_s) >= 3:
            mean_abs = abs(float(eps_s.mean()))
            if mean_abs > 0:
                cv = float(eps_s.std()) / mean_abs
                eps_stab = 1.0 / (1.0 + cv)  # 0–1; higher = more stable

        # 3yr average dividend % (includes zero years in average)
        div_3yr = float(grp["cash_dividend_pct"].fillna(0).tail(3).mean()) if "cash_dividend_pct" in grp.columns else None
        if div_3yr == 0:
            div_3yr = None

        # Dividend streak: consecutive years with cash div > 0, counting back
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

    # ---- Company metadata ----
    companies = {
        d["trading_code"]: d
        for d in db.companies.find({"excluded": {"$ne": True}}, {
            "trading_code": 1, "reserve_surplus_mn": 1, "paid_up_capital_mn": 1,
            "total_shares": 1, "total_loan_mn": 1, "face_value": 1,
            "market_category": 1, "sector": 1, "_id": 0,
        })
    }

    prices = _get_app().load_latest_prices()

    all_codes = set(per_company.keys()) | set(companies.keys())
    rows = []
    for code in all_codes:
        comp  = companies.get(code, {})
        fm    = per_company.get(code, {})
        ltp   = (prices.get(code) or {}).get("ltp")
        reserve  = comp.get("reserve_surplus_mn")
        paid_up  = comp.get("paid_up_capital_mn")
        shares   = comp.get("total_shares")
        loan     = comp.get("total_loan_mn")
        face     = comp.get("face_value")
        sector   = comp.get("sector", "") or ""
        cat      = (comp.get("market_category") or "").strip().upper()

        eps_3yr    = fm.get("eps_3yr")
        nav_latest = fm.get("nav_latest")
        roe_3yr    = fm.get("roe_3yr")
        eps_stab   = fm.get("eps_stab")
        div_3yr    = fm.get("div_3yr")
        div_streak = fm.get("div_streak")

        mcap_mn = (ltp * shares / 1e6) if ltp and shares and shares > 0 else None

        # Factor 1 — Earnings Yield (3yr avg EPS / LTP)
        earn_yield = None
        if eps_3yr and ltp and ltp > 0:
            earn_yield = eps_3yr / ltp * 100

        # Factor 2 — Price-to-NAV inverse (NAV / LTP)
        nav_to_price = None
        if nav_latest and nav_latest > 0 and ltp and ltp > 0:
            nav_to_price = nav_latest / ltp

        # Factor 3 — ROE (already computed per year above)
        # positive ROE only; negative means loss-making
        roe_val = roe_3yr if roe_3yr and roe_3yr > 0 else None

        # Factor 4 — EPS Stability (already computed)

        # Factor 5 — Dividend Yield (3yr avg div)
        div_yield = None
        if div_3yr and face and ltp and ltp > 0:
            div_yield = (face * div_3yr / 100) / ltp * 100

        # Factor 6 — Dividend Streak (already computed)

        # Factor 7 — Reserve / MCap
        res_mcap = None
        if reserve is not None and mcap_mn and mcap_mn > 0:
            res_mcap = reserve / mcap_mn

        # Factor 8 — Debt Safety: (equity / loan) — skip for financial sector
        debt_safety = None
        if not _is_financial_sector(sector):
            equity = (reserve or 0) + (paid_up or 0)
            if loan and loan > 0 and equity > 0:
                debt_safety = equity / loan  # higher = safer
            elif equity > 0 and (loan is None or loan == 0):
                debt_safety = equity  # no debt = very safe; will rank high

        rows.append({
            "trading_code": code,
            "sector":       sector,
            "market_cat":   cat,
            "ltp":          ltp,
            "mcap_mn":      mcap_mn,
            "eps_3yr":      eps_3yr,
            "nav_latest":   nav_latest,
            "roe_3yr":      roe_val,
            "eps_stab":     eps_stab,
            "earn_yield":   earn_yield,
            "nav_to_price": nav_to_price,
            "div_yield":    div_yield,
            "div_streak":   div_streak,
            "res_mcap":     res_mcap,
            "debt_safety":  debt_safety,
        })

    mdf = pd.DataFrame(rows)
    if mdf.empty:
        return mdf

    # Percentile ranks — all higher = better; NaN stays NaN
    mdf["ey_rank"]     = mdf["earn_yield"].rank(pct=True)
    mdf["np_rank"]     = mdf["nav_to_price"].rank(pct=True)
    mdf["roe_rank"]    = mdf["roe_3yr"].rank(pct=True)
    mdf["stab_rank"]   = mdf["eps_stab"].rank(pct=True)
    mdf["dy_rank"]     = mdf["div_yield"].rank(pct=True)
    mdf["streak_rank"] = mdf["div_streak"].rank(pct=True)
    mdf["rm_rank"]     = mdf["res_mcap"].rank(pct=True)
    mdf["de_rank"]     = mdf["debt_safety"].rank(pct=True)

    # Weights
    _W = {
        "ey_rank":     0.20,
        "np_rank":     0.15,
        "roe_rank":    0.15,
        "stab_rank":   0.10,
        "dy_rank":     0.15,
        "streak_rank": 0.10,
        "rm_rank":     0.10,
        "de_rank":     0.05,
    }
    rank_cols = list(_W.keys())
    w_series  = pd.Series(_W)
    rank_mat  = mdf[rank_cols]

    # Re-normalise weights per row — missing factors are excluded, not penalised
    w_avail     = rank_mat.notna().astype(float).multiply(w_series)
    w_sum       = w_avail.sum(axis=1)
    weighted    = rank_mat.fillna(0).multiply(w_series).sum(axis=1)
    raw_score   = np.where(w_sum > 0, weighted / w_sum * 100, np.nan)

    # Market category multiplier
    _CAT = {"A": 1.00, "B": 0.92, "N": 0.88, "Z": 0.30}
    cat_mult = mdf["market_cat"].map(lambda c: _CAT.get(c, 0.88))
    mdf["score"] = np.round(raw_score * cat_mult, 1)

    # Companies with no factor data at all → NaN
    mdf.loc[~rank_mat.notna().any(axis=1), "score"] = np.nan

    return mdf


@st.cache_data(ttl=300)
def compute_composite_scores():
    mdf = _build_scores_df()
    if mdf.empty:
        return {}
    return dict(zip(mdf["trading_code"], mdf["score"]))


# ---------------------------------------------------------------------------
# Homepage helpers
# ---------------------------------------------------------------------------

_FACTOR_LABELS = {
    "ey_rank":     "earnings yield",
    "np_rank":     "price-to-book",
    "roe_rank":    "ROE",
    "stab_rank":   "EPS stability",
    "dy_rank":     "div. yield",
    "streak_rank": "div. streak",
    "rm_rank":     "reserve/mkt cap",
    "de_rank":     "low debt",
}


def _top_strengths(row_dict: dict, n: int = 2) -> list[str]:
    """Return labels of the top-n highest-ranked factors."""
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    ranked.sort(reverse=True)
    return [label for _, label in ranked[:n]]


def _worst_factor(row_dict: dict) -> str | None:
    """Return the label of the single worst-ranked factor."""
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    if not ranked:
        return None
    ranked.sort()
    return ranked[0][1]


def _generate_verdict(row_dict: dict) -> str:
    """Return a 1-sentence plain-language summary of strengths and weaknesses."""
    strengths = _top_strengths(row_dict, n=2)
    ranked = []
    for key, label in _FACTOR_LABELS.items():
        v = row_dict.get(key)
        if v is not None and not (isinstance(v, float) and pd.isna(v)):
            ranked.append((v, label))
    ranked.sort()
    weak = [label for _, label in ranked[:1] if ranked and ranked[0][0] < 0.30]
    parts = []
    if strengths:
        parts.append("Strong " + " & ".join(strengths))
    if weak:
        parts.append("weak " + weak[0])
    if not parts:
        return "Moderate across all factors."
    sentence = ", but ".join(parts) + "."
    return sentence[0].upper() + sentence[1:]


def _get_company_score_row(trading_code: str) -> dict | None:
    """Return the full score row dict for one company including overall rank."""
    mdf = _build_scores_df()
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
