from fastapi import APIRouter
from backend.services.db_service import load_market_movers
from backend.models.responses import MarketMoversResponse

router = APIRouter()


@router.get("/api/market-movers", response_model=MarketMoversResponse)
def get_market_movers():
    return load_market_movers()
