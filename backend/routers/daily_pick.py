from fastapi import APIRouter, HTTPException
from backend.services.daily_pick_service import get_today_picks, get_pick_history

router = APIRouter()


@router.get("/api/daily-pick")
def daily_pick():
    """Today's three top stock picks + yesterday's recap.

    Public endpoint. Order of the three picks is randomized per day so the
    visual presentation has no implicit ranking.
    """
    data = get_today_picks()
    if not data or not data.get("picks"):
        raise HTTPException(status_code=503, detail="Picks not yet available")
    return data


@router.get("/api/daily-pick/history")
def daily_pick_history(days: int = 30):
    """Last N pick days, each with its three picks and next-day returns."""
    return {"days": get_pick_history(days)}
