from fastapi import APIRouter, HTTPException, Request, Response
from backend.services.db_service import (
    get_db, increment_stock_visit, load_popular_stocks,
)
from backend.models.responses import PopularStocksResponse
from backend.services.rate_limit import STOCK_VISITS_SEEN, client_ip

router = APIRouter()


@router.post("/api/stock-visit/{code}", status_code=204)
def track_stock_visit(code: str, request: Request):
    code = (code or "").strip().upper()
    if not code or len(code) > 20:
        raise HTTPException(status_code=400, detail="Missing code")

    # One counted visit per address per stock every 6 hours: the counts feed
    # the public "popular" list, and a script hitting one code in a loop could
    # push any stock onto it.
    ip = client_ip({k.lower(): v for k, v in request.headers.items()},
                   request.client.host if request.client else None)
    if STOCK_VISITS_SEEN.check_and_add(f"{ip}:{code}"):
        return Response(status_code=204)

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
