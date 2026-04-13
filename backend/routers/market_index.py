import logging

from fastapi import APIRouter

from backend.models.responses import MarketIndexResponse
from backend.services.db_service import load_market_index

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/market-index", response_model=MarketIndexResponse)
def get_market_index():
    try:
        return load_market_index()
    except Exception as e:
        logger.error("market_index error: %s", e, exc_info=True)
        return MarketIndexResponse()
