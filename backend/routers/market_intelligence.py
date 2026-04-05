from fastapi import APIRouter
from backend.services.db_service import compute_market_intelligence
from backend.models.responses import MarketIntelligenceResponse

router = APIRouter()


@router.get("/api/market-intelligence", response_model=MarketIntelligenceResponse)
def get_market_intelligence():
    return compute_market_intelligence()
