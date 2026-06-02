"""
Pre-computed top-20 stock lists based on actual financial metrics.
Used by the /stock-lists section of the frontend.
"""
import math
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter
from backend.services.db_service import get_db, load_companies, load_latest_prices, _ttl_cache
from backend.services.scoring_service import build_scores_df

router = APIRouter()


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _item(code: str, name: str | None, sector: str | None, ltp: float | None, metric_value: float | None) -> dict:
    return {
        "trading_code": code,
        "company_name": name,
        "sector": sector,
        "ltp": _safe(ltp),
        "metric_value": _safe(metric_value),
    }


@_ttl_cache(300)
def _compute_stock_lists() -> dict:
    db = get_db()

    # --- Base data ---
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    # --- Scores DF (div_yield_pct, eps_yoy_pct) ---
    scores_df = build_scores_df()
    scores_map: dict[str, dict] = {}
    if not scores_df.empty:
        for row in scores_df.to_dict("records"):
            code = row["trading_code"]
            scores_map[code] = {
                "div_yield_pct": _safe(row.get("div_yield_pct")),
                "eps_yoy_pct": _safe(row.get("eps_yoy_pct")),
            }

    # --- Bulk latest financials (latest year per company) ---
    fin_pipeline = [
        {"$sort": {"year": -1}},
        {"$group": {
            "_id": "$trading_code",
            "eps_cont_basic": {"$first": "$eps_cont_basic"},
            "eps_basic": {"$first": "$eps_basic"},
            "profit_mn": {"$first": "$profit_mn"},
            "cash_dividend_pct": {"$first": "$cash_dividend_pct"},
        }},
    ]
    fin_map: dict[str, dict] = {}
    for doc in db.financials.aggregate(fin_pipeline):
        code = doc["_id"]
        eps = doc.get("eps_cont_basic") or doc.get("eps_basic")
        fin_map[code] = {
            "eps": _safe(eps),
            "profit_mn": _safe(doc.get("profit_mn")),
            "cash_dividend_pct": _safe(doc.get("cash_dividend_pct")),
        }

    # --- 52-week high/low for return calculation ---
    one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
    pipeline_52w = [
        {"$match": {"date": {"$gte": one_year_ago}, "ltp": {"$gt": 0}}},
        {"$group": {
            "_id": "$trading_code",
            "w52_low": {"$min": "$ltp"},
            "ltp_latest": {"$last": "$ltp"},
        }},
    ]
    perf_map: dict[str, dict] = {}
    for doc in db.stock_prices.aggregate(pipeline_52w):
        code = doc["_id"]
        low = doc.get("w52_low")
        ltp_now = prices.get(code, {}).get("ltp")
        if low and low > 0 and ltp_now:
            ret = (ltp_now - low) / low * 100
            perf_map[code] = {"return_52w": _safe(ret)}

    # --- Build flat list of all companies with all metrics ---
    all_codes = set(companies.keys())
    rows = []
    for code in all_codes:
        comp = companies[code]
        name = comp.get("company_name")
        sector = comp.get("sector")
        price_data = prices.get(code, {})
        ltp = _safe(price_data.get("ltp"))
        volume = _safe(price_data.get("volume"))
        total_shares = _safe(comp.get("total_shares"))
        market_cap = _safe(total_shares * ltp) if (total_shares and ltp) else None
        fin = fin_map.get(code, {})
        sc = scores_map.get(code, {})
        perf = perf_map.get(code, {})

        rows.append({
            "trading_code": code,
            "company_name": name,
            "sector": sector,
            "ltp": ltp,
            "volume": volume,
            "market_cap": market_cap,
            "eps": fin.get("eps"),
            "profit_mn": fin.get("profit_mn"),
            "div_yield_pct": sc.get("div_yield_pct"),
            "eps_yoy_pct": sc.get("eps_yoy_pct"),
            "return_52w": perf.get("return_52w"),
        })

    def top20(key: str, filter_fn=None, min_val: float | None = None) -> list[dict]:
        subset = rows
        if filter_fn:
            subset = [r for r in subset if filter_fn(r)]
        if min_val is not None:
            subset = [r for r in subset if r.get(key) is not None and r[key] > min_val]
        else:
            subset = [r for r in subset if r.get(key) is not None]
        subset = sorted(subset, key=lambda r: r[key], reverse=True)[:20]
        return [_item(r["trading_code"], r["company_name"], r["sector"], r["ltp"], r[key]) for r in subset]

    def sector_top20(sector_kw: str, key: str) -> list[dict]:
        return top20(key, filter_fn=lambda r: sector_kw.lower() in (r.get("sector") or "").lower())

    return {
        "top_dividend":    top20("div_yield_pct", min_val=0),
        "top_eps":         top20("eps", min_val=0),
        "top_profitable":  top20("profit_mn", min_val=0),
        "top_market_cap":  top20("market_cap"),
        "top_eps_growth":  top20("eps_yoy_pct", min_val=0),
        "top_volume":      top20("volume"),
        "top_52w_return":  top20("return_52w", min_val=0),
        "bank_stocks":     sector_top20("bank", "eps"),
        "pharma_stocks":   sector_top20("pharma", "eps"),
        "it_stocks":       sector_top20("it", "eps"),
    }


@router.get("/api/stock-lists")
def get_stock_lists():
    return _compute_stock_lists()
