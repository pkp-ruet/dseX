from fastapi import APIRouter, HTTPException
from backend.services.daily_pick_service import get_today_pick, get_pick_history

router = APIRouter()


@router.get("/api/daily-pick")
def daily_pick():
    """Today's top stock pick + yesterday's tracked performance.

    Public endpoint. Cached on the frontend with ISR; the underlying selection
    runs at most once per UTC day.
    """
    data = get_today_pick()
    if not data:
        raise HTTPException(status_code=503, detail="Pick not yet available")
    return data


@router.get("/api/daily-pick/history")
def daily_pick_history(limit: int = 30):
    """Last N daily picks with their next-trading-day return."""
    return {"items": get_pick_history(limit)}
