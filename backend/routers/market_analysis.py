"""
Market Analysis endpoints — raw market data, no DSEF scoring.
"""
import math
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from backend.services.db_service import (
    CLOSE_EXPR,
    get_db,
    load_companies,
    load_latest_prices,
    _ttl_cache,
)

router = APIRouter()


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


class NearExtremeItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    ltp: Optional[float] = None
    w52_high: Optional[float] = None
    w52_low: Optional[float] = None
    gap_pct: Optional[float] = None
    change_pct: Optional[float] = None


class NearExtremesResponse(BaseModel):
    near_high: list[NearExtremeItem]
    near_low: list[NearExtremeItem]
    date: Optional[str] = None


@_ttl_cache(900)
def _compute_near_extremes() -> dict:
    db = get_db()
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    # `stock_prices.date` holds an ISO string, so the bound has to be a string
    # too — BSON sorts String before Date, so a datetime bound matched nothing.
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")

    pipeline = [
        {"$match": {"date": {"$gte": one_year_ago}, "ltp": {"$gt": 0}}},
        {"$group": {
            "_id": "$trading_code",
            "w52_high": {"$max": CLOSE_EXPR},
            "w52_low": {"$min": CLOSE_EXPR},
        }},
    ]

    extremes_map: dict[str, dict] = {}
    for doc in db.stock_prices.aggregate(pipeline):
        extremes_map[doc["_id"]] = {
            "w52_high": doc.get("w52_high"),
            "w52_low": doc.get("w52_low"),
        }

    near_high: list[dict] = []
    near_low: list[dict] = []
    latest_date: Optional[str] = None

    for code, price_data in prices.items():
        ltp = price_data.get("ltp")
        if ltp is None or ltp <= 0:
            continue

        ext = extremes_map.get(code)
        if not ext:
            continue

        w52_high = ext.get("w52_high")
        w52_low = ext.get("w52_low")

        if not w52_high or not w52_low or w52_high <= w52_low:
            continue

        comp = companies.get(code, {})
        change_pct = price_data.get("change_pct")
        date_val = price_data.get("date")
        if date_val is not None and latest_date is None:
            latest_date = str(date_val)[:10]

        item_base = {
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "ltp": _safe(ltp),
            "w52_high": _safe(w52_high),
            "w52_low": _safe(w52_low),
            "change_pct": _safe(change_pct),
        }

        gap_to_high = (w52_high - ltp) / w52_high
        if 0 <= gap_to_high <= 0.05:
            near_high.append({**item_base, "gap_pct": _safe(round(gap_to_high * 100, 2))})

        gap_to_low = (ltp - w52_low) / w52_low
        if 0 <= gap_to_low <= 0.05:
            near_low.append({**item_base, "gap_pct": _safe(round(gap_to_low * 100, 2))})

    near_high.sort(key=lambda x: x["gap_pct"] if x["gap_pct"] is not None else 999)
    near_low.sort(key=lambda x: x["gap_pct"] if x["gap_pct"] is not None else 999)

    return {
        "near_high": near_high[:15],
        "near_low": near_low[:15],
        "date": latest_date,
    }


@router.get("/api/market/near-extremes", response_model=NearExtremesResponse)
def get_near_extremes():
    return _compute_near_extremes()


# ---------------------------------------------------------------------------
# Bulk 52-week ranges for a small set of codes (portfolio / watchlist rows).
# Unlike near-extremes (top-15 movers only), this answers "where does today's
# price sit in the year's range" for exactly the stocks the caller holds.
# ---------------------------------------------------------------------------


class Range52wItem(BaseModel):
    trading_code: str
    w52_high: Optional[float] = None
    w52_low: Optional[float] = None


class Range52wResponse(BaseModel):
    items: list[Range52wItem]


@_ttl_cache(900)
def _compute_52w_for(codes: tuple) -> list[dict]:
    db = get_db()
    # `stock_prices.date` holds an ISO string, so the bound has to be a string
    # too — BSON sorts String before Date, so a datetime bound matched nothing.
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
    pipeline = [
        {"$match": {
            "trading_code": {"$in": list(codes)},
            "date": {"$gte": one_year_ago},
            "ltp": {"$gt": 0},
        }},
        {"$group": {
            "_id": "$trading_code",
            "w52_high": {"$max": CLOSE_EXPR},
            "w52_low": {"$min": CLOSE_EXPR},
        }},
    ]
    return [
        {
            "trading_code": doc["_id"],
            "w52_high": _safe(doc.get("w52_high")),
            "w52_low": _safe(doc.get("w52_low")),
        }
        for doc in db.stock_prices.aggregate(pipeline)
    ]


@router.get("/api/market/52w", response_model=Range52wResponse)
def get_52w_ranges(codes: str):
    # Sorted + deduped so the TTL-cache key is stable regardless of order.
    code_list = tuple(sorted({c.strip().upper() for c in codes.split(",") if c.strip()}))[:100]
    if not code_list:
        return {"items": []}
    return {"items": _compute_52w_for(code_list)}
