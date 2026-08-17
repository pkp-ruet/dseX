"""
Corporate-action endpoints — the dividend calendar and per-company dividend history.

Reads the `dividend_declarations` ledger (one doc per company per declaration,
written by scrapers/news.py). No scoring logic lives here; the calendar service
only attaches the DSEF score for context.
"""
from fastapi import APIRouter

from backend.models.responses import DividendCalendarResponse
from backend.services.corporate_actions_service import (
    build_dividend_calendar,
    dividend_history_for,
)

router = APIRouter()


@router.get("/api/dividend-calendar", response_model=DividendCalendarResponse)
def get_dividend_calendar():
    """Upcoming record dates + AGMs + recent declarations, with buy-by dates."""
    return build_dividend_calendar()


@router.get("/api/company/{trading_code}/dividend-history")
def get_dividend_history(trading_code: str):
    """Every declaration stored for one company, newest first."""
    return dividend_history_for(trading_code)
