import logging
from fastapi import APIRouter
from backend.services.db_service import compute_market_intelligence
from backend.models.responses import MarketIntelligenceResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/market-intelligence", response_model=MarketIntelligenceResponse)
def get_market_intelligence():
    try:
        return compute_market_intelligence()
    except Exception as e:
        logger.error("market_intelligence error: %s", e, exc_info=True)
        return {"market_condition": "unknown", "market_summary": {}, "signals": {}}
