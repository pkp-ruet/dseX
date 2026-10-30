"""
Watchlist glance board — fair value, what blocks a Buy, next event and risk
flags for a set of codes (see services/watchlist_glance.py).

Public and keyed on codes like ``/api/news/multi``. The glance feeds the
portfolio report; the watchlist page reads ``/api/watchlist/updates`` (free
facts only, 2026-10-30).
"""
from fastapi import APIRouter, Query

from backend.services.watchlist_glance import build_glance
from backend.services.watchlist_updates import build_updates

router = APIRouter(tags=["watchlist"])


@router.get("/api/watchlist/glance")
def watchlist_glance(codes: str = Query("", description="Comma-separated trading codes")):
    return {"rows": build_glance(codes.split(","))}


@router.get("/api/watchlist/updates")
def watchlist_updates(codes: str = Query("", description="Comma-separated trading codes")):
    """Everything new and coming on these codes (results, results meetings,
    record dates, AGMs, declarations, grade changes, yearly ranges) — the
    watchlist page's updates, free facts only (services/watchlist_updates.py)."""
    return build_updates(codes.split(","))
