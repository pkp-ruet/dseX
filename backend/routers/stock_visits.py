from fastapi import APIRouter, HTTPException, Response
from backend.services.db_service import (
    get_db, increment_stock_visit, load_popular_stocks,
)
from backend.models.responses import PopularStocksResponse

router = APIRouter()


@router.post("/api/stock-visit/{code}", status_code=204)
def track_stock_visit(code: str):
    code = (code or "").strip().upper()
    if not code:
        raise HTTPException(status_code=400, detail="Missing code")

    # Validate against the canonical company list — prevents arbitrary keys.
    db = get_db()
    exists = db.companies.find_one(
        {"trading_code": code, "excluded": {"$ne": True}},
        {"_id": 1},
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Unknown trading code")

    increment_stock_visit(code)
    return Response(status_code=204)


@router.get("/api/popular-stocks", response_model=PopularStocksResponse)
def get_popular_stocks():
    return load_popular_stocks(limit=20)
