from fastapi import APIRouter, HTTPException
from backend.services.db_service import (
    load_price_history, get_company, load_corporate_actions, adjust_price_rows,
)
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/api/company/{code}/prices")
def get_price_history(code: str, range: str = "1y") -> list[dict]:
    company = get_company(code.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{code}' not found")

    # Prices before a dividend / bonus record date are adjusted onto today's
    # footing (rows carry `adjusted: true`), so the chart shows no fake crash.
    history = adjust_price_rows(load_price_history(code.upper()),
                                load_corporate_actions(2200).get(code.upper(), []))

    if range == "1y":
        cutoff = (datetime.now() - timedelta(days=365)).isoformat()
    elif range == "2y":
        cutoff = (datetime.now() - timedelta(days=730)).isoformat()
    elif range == "3y":
        cutoff = (datetime.now() - timedelta(days=3 * 365)).isoformat()
    elif range == "5y":
        cutoff = (datetime.now() - timedelta(days=5 * 365)).isoformat()
    else:
        cutoff = None

    if cutoff:
        history = [d for d in history if d.get("date", "") >= cutoff]

    return history
