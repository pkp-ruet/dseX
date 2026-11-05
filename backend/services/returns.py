"""The 1-year price change of every share, on today's footing (dividends and
bonus shares since then taken out). Read by the screener's "1-year price
change" filter. Lived in routers/stock_lists.py until the free rankings were
removed (2026-11-05)."""
from __future__ import annotations

from datetime import datetime, timedelta

from backend.services.db_service import CLOSE_EXPR, adjustment_factor_fn, load_corporate_actions


def one_year_returns(db, prices: dict) -> dict[str, float]:
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
