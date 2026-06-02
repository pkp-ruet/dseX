from fastapi import APIRouter
from backend.services.daily_tips_service import get_daily_tips

router = APIRouter()


@router.get("/api/daily-tips")
def daily_tips():
    """TopStockBD Tips — ~10 plain-English fundamental tips, refreshed daily."""
    return get_daily_tips()
