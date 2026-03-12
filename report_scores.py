"""
dseX Score Report -- Top 10 analysis with full factor breakdown.

Scoring algorithm (value-based):
  P/E Ratio (50%)           -- lower P/E = undervalued = higher score
  Reserve per Share (25%)   -- higher = stronger balance sheet
  Loan-to-Reserve (25%)    -- lower = less leveraged = higher score

Each factor is percentile-ranked (0-1), NaN fills as 0.
Final score = (0.50 * pe_pct + 0.25 * rps_pct + 0.25 * ltr_pct) * 100
"""

import numpy as np
import pandas as pd
from db.connection import get_db, close_connection


def build_scores():
    db = get_db()

    fin_docs = list(db.financials.find({}, {"_id": 0}))
    if not fin_docs:
        print("No financials data found.")
        return None

    fin_df = pd.DataFrame(fin_docs).sort_values(["trading_code", "year"])
    fin_df["eps"] = fin_df["eps_cont_basic"].combine_first(fin_df.get("eps_basic"))
    latest_eps = fin_df.groupby("trading_code")["eps"].last()

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
    prices = {d["_id"]: d["ltp"] for d in db.stock_prices.aggregate(price_pipeline) if d.get("ltp")}

    metrics = []
    for code, eps in latest_eps.items():
        comp = companies.get(code, {})
        ltp = prices.get(code)
        reserve = comp.get("reserve_surplus_mn")
        shares = comp.get("total_shares")
        loan = comp.get("total_loan_mn")

        pe = ltp / eps if ltp and eps and eps > 0 else None
        rps = (reserve * 1_000_000 / shares) if reserve and shares and shares > 0 else None

        if reserve and reserve > 0:
            ltr = (loan or 0) / reserve
        elif loan and loan > 0:
            ltr = float("inf")
        else:
            ltr = None

        metrics.append({
            "trading_code": code,
            "company_name": comp.get("company_name", ""),
            "sector": comp.get("sector", ""),
            "ltp": ltp,
            "eps": eps,
            "pe": pe,
            "reserve_mn": reserve,
            "shares": shares,
            "rps": rps,
            "loan_mn": loan,
            "ltr": ltr,
        })

    mdf = pd.DataFrame(metrics)
    if mdf.empty:
        return None

    # P/E: lower is better -> rank ascending then invert; NaN (no valid P/E) -> 0
    pe_raw = mdf["pe"].rank(pct=True, ascending=True)
    mdf["pe_rank"] = (1 - pe_raw).fillna(0)

    # Reserve per Share: higher is better
    mdf["rps_rank"] = mdf["rps"].rank(pct=True).fillna(0)

    # Loan-to-Reserve: lower is better -> rank ascending then invert; NaN -> 0
    ltr_finite = mdf["ltr"].replace(float("inf"), np.nan)
    ltr_raw = ltr_finite.rank(pct=True, ascending=True)
    mdf["ltr_rank"] = (1 - ltr_raw).fillna(0)
    mdf.loc[mdf["ltr"] == float("inf"), "ltr_rank"] = 0

    mdf["score"] = np.round(
        (0.50 * mdf["pe_rank"] + 0.25 * mdf["rps_rank"] + 0.25 * mdf["ltr_rank"]) * 100, 1
    )

    has_any = mdf["pe"].notna() | mdf["rps"].notna() | mdf["ltr"].notna()
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
    print("=" * 100)
    print("  dseX Score Report")
    print("=" * 100)
    print()
    print("  Algorithm:")
    print("    Score = 0.50 * P/E_percentile      (lower P/E = higher rank)")
    print("          + 0.25 * Reserve/Share_pctile (higher = better)")
    print("          + 0.25 * Loan/Reserve_pctile  (lower ratio = higher rank)")
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
        f"{'#':>3}  {'Code':<12} {'Company':<28} "
        f"{'LTP':>8} {'EPS':>8} {'P/E':>7} "
        f"{'Res/Shr':>8} {'L/R':>6}  "
        f"{'PE Pct':>7} {'RPS Pct':>8} {'LR Pct':>7}  {'Score':>6}"
    )

    print("-" * 100)
    print("  Top 10 by dseX Score")
    print("-" * 100)
    print()
    print(header)
    print("  " + "-" * (len(header) - 2))

    for rank, (_, r) in enumerate(top10.iterrows(), 1):
        name = (r["company_name"] or "")[:26]
        line = (
            f"{rank:>3}  {r['trading_code']:<12} {name:<28} "
            f"{fmt_num(r['ltp'], '.1f'):>8} {fmt_num(r['eps'], '.2f'):>8} {fmt_num(r['pe'], '.1f'):>7} "
            f"{fmt_num(r['rps'], '.1f'):>8} {fmt_num(r['ltr'], '.3f'):>6}  "
            f"{fmt_rank(r['pe_rank']):>7} {fmt_rank(r['rps_rank']):>8} {fmt_rank(r['ltr_rank']):>7}  "
            f"{r['score']:>6.1f}"
        )
        print(line)

    print()
    print("-" * 100)
    print("  Factor Insight for Top 10")
    print("-" * 100)
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
        print(f"      LTP: {ltp_s}  |  EPS: {eps_s}  |  P/E: {pe_s}  (percentile: {fmt_rank(r['pe_rank'])})")

        res_s = fmt_num(r["reserve_mn"], ",.1f")
        shares_s = fmt_num(r["shares"], ",.0f") if r["shares"] else "  --"
        rps_s = fmt_num(r["rps"], ".1f")
        print(f"      Reserve: {res_s} mn  |  Shares: {shares_s}  |  Reserve/Share: {rps_s}  (percentile: {fmt_rank(r['rps_rank'])})")

        loan_s = fmt_num(r["loan_mn"], ",.1f")
        ltr_s = fmt_num(r["ltr"], ".3f")
        print(f"      Loan: {loan_s} mn  |  Loan/Reserve: {ltr_s}  (percentile: {fmt_rank(r['ltr_rank'])})")

        print(f"      -> dseX Score: {r['score']:.1f}")
        print()

    print("=" * 100)


if __name__ == "__main__":
    mdf = build_scores()
    if mdf is not None:
        print_report(mdf)
    close_connection()
