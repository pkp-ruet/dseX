"""
dseX Score Report -- Top 10 analysis with full factor breakdown.

Scoring algorithm (6-factor, 3 pairs):
  EPS Pair (30%):
    15%  P/E Ratio           -- lower P/E = better value = higher score
    15%  EPS Growth Trend    -- steeper positive slope = higher score
  Balance-Sheet Pair (30%):
    15%  Reserve per Share   -- higher = stronger balance sheet
    15%  Loan per Share      -- lower = less leveraged = higher score
  Dividend Pair (40%):
    20%  Dividend Yield      -- higher yield = higher score
    20%  Dividend Growth     -- steeper positive slope = higher score

Each factor is percentile-ranked (0-1), NaN fills as 0.
"""

import numpy as np
import pandas as pd
from db.connection import get_db, close_connection


def _trend_slope(years, values):
    """Normalized linear-regression slope for a year-sorted series.
    Returns NaN when fewer than 2 non-null data points exist."""
    mask = pd.notna(values)
    y = np.asarray(years[mask], dtype=float)
    v = np.asarray(values[mask], dtype=float)
    if len(v) < 2:
        return np.nan
    mean_abs = np.mean(np.abs(v))
    if mean_abs == 0:
        return 0.0
    slope = np.polyfit(y, v, 1)[0]
    return slope / mean_abs


def build_scores():
    db = get_db()

    fin_docs = list(db.financials.find({}, {"_id": 0}))
    if not fin_docs:
        print("No financials data found.")
        return None

    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))

    latest_eps = fin_df.groupby("trading_code")["eps"].last()

    eps_slopes: dict[str, float] = {}
    div_slopes: dict[str, float] = {}
    latest_div_pct: dict[str, float] = {}
    for code, grp in fin_df.groupby("trading_code"):
        eps_slopes[code] = _trend_slope(grp["year"].values, grp["eps"].values)
        div_slopes[code] = _trend_slope(
            grp["year"].values, grp["cash_dividend_pct"].values
        )
        div_valid = grp["cash_dividend_pct"].dropna()
        if not div_valid.empty:
            latest_div_pct[code] = div_valid.iloc[-1]

    companies = {}
    for d in db.companies.find({}, {
        "trading_code": 1, "company_name": 1, "sector": 1,
        "reserve_surplus_mn": 1, "total_shares": 1, "total_loan_mn": 1,
        "face_value": 1, "_id": 0,
    }):
        companies[d["trading_code"]] = d

    price_pipeline = [
        {"$sort": {"date": -1}},
        {"$group": {"_id": "$trading_code", "ltp": {"$first": "$ltp"}}},
    ]
    prices = {
        d["_id"]: d["ltp"]
        for d in db.stock_prices.aggregate(price_pipeline)
        if d.get("ltp")
    }

    all_codes = set(latest_eps.index) | set(companies.keys())
    metrics = []
    for code in all_codes:
        comp = companies.get(code, {})
        ltp = prices.get(code)
        reserve = comp.get("reserve_surplus_mn")
        shares = comp.get("total_shares")
        loan = comp.get("total_loan_mn")
        face = comp.get("face_value")

        eps_val = latest_eps.get(code)
        eps_growth = eps_slopes.get(code)

        pe = ltp / eps_val if ltp and eps_val and eps_val > 0 else None

        rps = (reserve * 1_000_000 / shares) if reserve and shares and shares > 0 else None
        lps = (((loan or 0) * 1_000_000) / shares) if shares and shares > 0 else None

        div_pct = latest_div_pct.get(code)
        if div_pct and face and ltp and ltp > 0:
            div_yield = (face * div_pct / 100) / ltp * 100
        else:
            div_yield = None

        div_growth = div_slopes.get(code)

        metrics.append({
            "trading_code": code,
            "company_name": comp.get("company_name", ""),
            "sector": comp.get("sector", ""),
            "ltp": ltp,
            "eps": eps_val,
            "pe": pe,
            "eps_growth": eps_growth,
            "reserve_mn": reserve,
            "shares": shares,
            "rps": rps,
            "loan_mn": loan,
            "lps": lps,
            "div_yield": div_yield,
            "div_growth": div_growth,
        })

    mdf = pd.DataFrame(metrics)
    if mdf.empty:
        return None

    # Higher is better
    mdf["eps_growth_rank"] = mdf["eps_growth"].rank(pct=True).fillna(0)
    mdf["rps_rank"] = mdf["rps"].rank(pct=True).fillna(0)
    mdf["div_yield_rank"] = mdf["div_yield"].rank(pct=True).fillna(0)
    mdf["div_growth_rank"] = mdf["div_growth"].rank(pct=True).fillna(0)

    # Lower is better
    pe_raw = mdf["pe"].rank(pct=True, ascending=True)
    mdf["pe_rank"] = (1 - pe_raw).fillna(0)

    lps_raw = mdf["lps"].rank(pct=True, ascending=True)
    mdf["lps_rank"] = (1 - lps_raw).fillna(0)

    mdf["score"] = np.round(
        (
            0.15 * mdf["pe_rank"]
            + 0.15 * mdf["eps_growth_rank"]
            + 0.15 * mdf["rps_rank"]
            + 0.15 * mdf["lps_rank"]
            + 0.20 * mdf["div_yield_rank"]
            + 0.20 * mdf["div_growth_rank"]
        ) * 100,
        1,
    )

    has_any = (
        mdf["pe"].notna()
        | mdf["eps_growth"].notna()
        | mdf["rps"].notna()
        | mdf["lps"].notna()
        | mdf["div_yield"].notna()
        | mdf["div_growth"].notna()
    )
    mdf.loc[~has_any, "score"] = np.nan

    return mdf


def fmt_num(val, fmt_str=".1f"):
    if val is None or (isinstance(val, float) and (pd.isna(val) or val == float("inf"))):
        return "    --"
    return f"{val:{fmt_str}}"


def fmt_rank(val):
    if pd.isna(val):
        return "  --"
    return f"{val * 100:.1f}"


def print_report(mdf):
    total_companies = len(mdf)
    scored = mdf["score"].notna().sum()

    print()
    print("=" * 120)
    print("  dseX Score Report")
    print("=" * 120)
    print()
    print("  Algorithm (6 factors, 3 pairs):")
    print("    EPS Pair (30%):           15% P/E Ratio (inverted)  +  15% EPS Growth Trend")
    print("    Balance-Sheet Pair (30%): 15% Reserve/Share  +  15% Loan/Share (inverted)")
    print("    Dividend Pair (40%):      20% Dividend Yield  +  20% Dividend Growth Trend")
    print()
    print(f"  Companies analysed: {total_companies}")
    print(f"  Companies scored (at least 1 factor): {scored}")
    print()

    valid_scores = mdf["score"].dropna()
    if not valid_scores.empty:
        print("  Score distribution:")
        print(f"    Median: {valid_scores.median():.1f}")
        print(f"    Mean:   {valid_scores.mean():.1f}")
        print(f"    Min:    {valid_scores.min():.1f}")
        print(f"    Max:    {valid_scores.max():.1f}")
        for label, lo, hi in [("90-100", 90, 100), ("70-90", 70, 90), ("50-70", 50, 70), ("< 50", 0, 50)]:
            count = ((valid_scores >= lo) & (valid_scores <= hi)).sum()
            print(f"    {label:>6}: {count} companies")
    print()

    top10 = mdf.nlargest(10, "score")

    header = (
        f"{'#':>3}  {'Code':<12} {'Company':<24} "
        f"{'P/E':>7} {'EPSGr':>7} {'Res/Sh':>8} {'Ln/Sh':>8} {'DivY%':>7} {'DivGr':>7}  "
        f"{'PEPct':>5} {'EGPct':>5} {'RPct':>5} {'LPct':>5} {'DYPct':>5} {'DGPct':>5}  {'Score':>6}"
    )

    print("-" * 120)
    print("  Top 10 by dseX Score")
    print("-" * 120)
    print()
    print(header)
    print("  " + "-" * (len(header) - 2))

    for rank, (_, r) in enumerate(top10.iterrows(), 1):
        name = (r["company_name"] or "")[:22]
        line = (
            f"{rank:>3}  {r['trading_code']:<12} {name:<24} "
            f"{fmt_num(r['pe'], '.1f'):>7} "
            f"{fmt_num(r['eps_growth'], '.2f'):>7} "
            f"{fmt_num(r['rps'], '.1f'):>8} "
            f"{fmt_num(r['lps'], '.1f'):>8} "
            f"{fmt_num(r['div_yield'], '.2f'):>7} "
            f"{fmt_num(r['div_growth'], '.2f'):>7}  "
            f"{fmt_rank(r['pe_rank']):>5} "
            f"{fmt_rank(r['eps_growth_rank']):>5} "
            f"{fmt_rank(r['rps_rank']):>5} "
            f"{fmt_rank(r['lps_rank']):>5} "
            f"{fmt_rank(r['div_yield_rank']):>5} "
            f"{fmt_rank(r['div_growth_rank']):>5}  "
            f"{r['score']:>6.1f}"
        )
        print(line)

    print()
    print("-" * 120)
    print("  Factor Insight for Top 10")
    print("-" * 120)
    print()

    for rank, (_, r) in enumerate(top10.iterrows(), 1):
        code = r["trading_code"]
        name = r["company_name"] or code
        print(f"  #{rank} {code} -- {name}")
        if r.get("sector"):
            print(f"      Sector: {r['sector']}")

        ltp_s = fmt_num(r["ltp"], ",.1f")
        eps_s = fmt_num(r["eps"], ".2f")
        pe_s = fmt_num(r["pe"], ".1f")
        epsg_s = fmt_num(r["eps_growth"], ".3f")
        print(
            f"      LTP: {ltp_s}  |  EPS: {eps_s}  |  P/E: {pe_s} (pct: {fmt_rank(r['pe_rank'])})"
            f"  |  EPS Growth: {epsg_s} (pct: {fmt_rank(r['eps_growth_rank'])})"
        )

        res_s = fmt_num(r["reserve_mn"], ",.1f")
        shares_s = fmt_num(r["shares"], ",.0f") if r["shares"] else "  --"
        rps_s = fmt_num(r["rps"], ".1f")
        loan_s = fmt_num(r["loan_mn"], ",.1f")
        lps_s = fmt_num(r["lps"], ".1f")
        print(
            f"      Reserve: {res_s} mn  |  Shares: {shares_s}  |  Res/Share: {rps_s} (pct: {fmt_rank(r['rps_rank'])})"
        )
        print(
            f"      Loan: {loan_s} mn  |  Loan/Share: {lps_s} (pct: {fmt_rank(r['lps_rank'])})"
        )

        dy_s = fmt_num(r["div_yield"], ".2f")
        dg_s = fmt_num(r["div_growth"], ".3f")
        print(
            f"      Div Yield: {dy_s}% (pct: {fmt_rank(r['div_yield_rank'])})"
            f"  |  Div Growth: {dg_s} (pct: {fmt_rank(r['div_growth_rank'])})"
        )

        print(f"      -> dseX Score: {r['score']:.1f}")
        print()

    print("=" * 120)


if __name__ == "__main__":
    mdf = build_scores()
    if mdf is not None:
        print_report(mdf)
    close_connection()
