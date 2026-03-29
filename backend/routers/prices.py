from fastapi import APIRouter, HTTPException
from backend.services.db_service import load_price_history, get_company
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/api/company/{code}/prices")
def get_price_history(code: str, range: str = "1y") -> list[dict]:
    company = get_company(code.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{code}' not found")

    history = load_price_history(code.upper())

    if range == "1y":
        cutoff = (datetime.now() - timedelta(days=365)).isoformat()
    elif range == "2y":
        cutoff = (datetime.now() - timedelta(days=730)).isoformat()
    else:
        cutoff = None

    if cutoff:
        history = [d for d in history if d.get("date", "") >= cutoff]

    return history
