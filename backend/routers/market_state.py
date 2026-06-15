"""
Market State — single bundle for the "complete picture of the market" page.

Returns plain numbers + short status strings; all user-facing wording is built
on the frontend (simple, everyday language — no finance jargon).
"""
from fastapi import APIRouter

from backend.services.market_state_service import compute_market_state

router = APIRouter()


@router.get("/api/market/state")
def get_market_state():
    return compute_market_state()
