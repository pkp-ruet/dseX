from fastapi import APIRouter

from backend.services.db_service import (
    compute_market_intelligence,
    load_dse_today_table,
    load_market_index,
    load_market_movers,
    load_market_news,
)
from backend.models.responses import DseTodayResponse

router = APIRouter()


def _safe(fn, default):
    try:
        return fn()
    except Exception:
        return default


@router.get("/api/dse-today", response_model=DseTodayResponse)
def get_dse_today():
    header = _safe(load_market_index, {})
    movers = _safe(load_market_movers, {"date": None, "gainers": [], "losers": [], "most_traded": []})
    table = _safe(load_dse_today_table, [])
    news = _safe(lambda: load_market_news(50), [])

    intel_raw = _safe(compute_market_intelligence, {})
    sector_strength = (intel_raw.get("signals") or {}).get("sector_strength") or []
    intelligence = {
        "market_condition": intel_raw.get("market_condition", "unknown"),
        "sector_strength": sector_strength,
    }

    return {
        "header": header,
        "movers": movers,
        "intelligence": intelligence,
        "table": table,
        "news": news,
    }
