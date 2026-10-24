"""
The four FREE stock lists (`/stock-insights/[slug]`): top 20 on one plain
number each — dividend yield, market value, money traded, 1-year return.
The six Premium research lists are a separate service (research_lists.py).

Guards (2026-10-24): the dividend list drops Z-category, stale and
paid-from-a-loss dividends; the 1-year return is measured from the price a
year ago (adjusted for dividends and bonus shares), not from the yearly low;
"most traded" is money traded, not share count. The EPS, profit, growth and
sector lists this used to serve were removed with their pages.
"""
import math
from datetime import datetime, timedelta
from fastapi import APIRouter
from backend.services.db_service import (
    CLOSE_EXPR,
    adjustment_factor_fn,
    get_db,
    load_companies,
    load_corporate_actions,
    load_latest_prices,
    _ttl_cache,
)
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


def _safe_dividend(sc: dict) -> bool:
    """A yield worth ranking: not category Z, accounts not stale, and not paid
    out of a loss or out of more than the year's profit (payout_pct is None
    when a dividend was paid in a loss year)."""
    if (sc.get("market_cat") or "").strip().upper() == "Z" or sc.get("stale_data"):
        return False
    if sc.get("payout_pct") is None:
        return False
    latest = sc.get("payout_latest_pct")
    return latest is None or latest <= 100


def _one_year_returns(db, prices: dict) -> dict[str, float]:
    """{code: % change from the official close about a year ago}, with the old
    price put on today's footing for dividends and bonus shares since then
    (a 20% bonus otherwise reads as a 17% loss)."""
    latest = max((p.get("date") for p in prices.values() if p.get("date")), default=None)
    if not latest:
        return {}
    start = datetime.fromisoformat(str(latest)[:10]) - timedelta(days=365)
    lo, hi = start.strftime("%Y-%m-%d"), (start + timedelta(days=10)).strftime("%Y-%m-%d")
    then: dict[str, tuple[str, float]] = {}
    for d in db.stock_prices.aggregate([
        # String bounds: stock_prices.date is an ISO string, not a BSON date.
        {"$match": {"date": {"$gte": lo, "$lte": hi}, "ltp": {"$gt": 0}}},
        {"$sort": {"date": 1}},
        {"$group": {"_id": "$trading_code", "date": {"$first": "$date"}, "close": {"$first": CLOSE_EXPR}}},
    ]):
        if d.get("close"):
            then[d["_id"]] = (str(d["date"])[:10], float(d["close"]))
    actions = load_corporate_actions(days=400)
    out: dict[str, float] = {}
    for code, (day, close) in then.items():
        now = (prices.get(code) or {}).get("ltp")
        base = adjustment_factor_fn(actions.get(code, []))(day, close)
        if now and base and base > 0:
            out[code] = round((float(now) - base) / base * 100, 2)
    return out


@_ttl_cache(300)
def _compute_stock_lists() -> dict:
    db = get_db()
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    # Yield + the dividend guards come from the score snapshot.
    scores_map: dict[str, dict] = {}
    scores_df = build_scores_df()
    if not scores_df.empty:
        for row in scores_df.to_dict("records"):
            scores_map[row["trading_code"]] = {
                "div_yield_pct": _safe(row.get("div_yield_pct")),
                "payout_pct": _safe(row.get("payout_pct")),
                "payout_latest_pct": _safe(row.get("payout_latest_pct")),
                "market_cat": row.get("market_cat"),
                "stale_data": bool(row.get("stale_data")),
            }

    returns_1y = _one_year_returns(db, prices)

    rows = []
    for code, comp in companies.items():
        price_data = prices.get(code, {})
        ltp = _safe(price_data.get("ltp"))
        total_shares = _safe(comp.get("total_shares"))
        sc = scores_map.get(code, {})
        rows.append({
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "ltp": ltp,
            "turnover_mn": _safe(price_data.get("value_mn")),
            "market_cap": _safe(total_shares * ltp) if (total_shares and ltp) else None,
            "div_yield_pct": sc.get("div_yield_pct"),
            "safe_dividend": _safe_dividend(sc) if sc else False,
            "return_1y": returns_1y.get(code),
        })

    def top20(key: str, filter_fn=None, min_val: float | None = None) -> list[dict]:
        subset = [r for r in rows if r.get(key) is not None and (filter_fn is None or filter_fn(r))]
        if min_val is not None:
            subset = [r for r in subset if r[key] > min_val]
        subset = sorted(subset, key=lambda r: r[key], reverse=True)[:20]
        return [_item(r["trading_code"], r["company_name"], r["sector"], r["ltp"], r[key]) for r in subset]

    return {
        "top_dividend":   top20("div_yield_pct", filter_fn=lambda r: r["safe_dividend"], min_val=0),
        "top_market_cap": top20("market_cap"),
        # Key names are historical: ranked by money traded (৳ mn) and by the
        # 1-year return.
        "top_volume":     top20("turnover_mn", min_val=0),
        "top_52w_return": top20("return_1y", min_val=0),
    }


@router.get("/api/stock-lists")
def get_stock_lists():
    return _compute_stock_lists()
