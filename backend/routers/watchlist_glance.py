"""
Watchlist glance board — fair value, what blocks a Buy, next event and risk
flags for a set of codes (see services/watchlist_glance.py).

Public and keyed on codes like ``/api/news/multi``: the Premium lock on the
watchlist page is screen-only, like every other lock in the app.
"""
from fastapi import APIRouter, Query

from backend.services.watchlist_glance import build_glance

router = APIRouter(tags=["watchlist"])


@router.get("/api/watchlist/glance")
def watchlist_glance(codes: str = Query("", description="Comma-separated trading codes")):
    return {"rows": build_glance(codes.split(","))}
