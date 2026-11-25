"""GET /api/home/today — the home's daily public part (2026-11-25): the next
five trading days' dividend record dates and results meetings, results this
week, the ranking's top three and climbers, and the Buy List's counts. The
same answer for every reader (`home_today_service`, cached 15 minutes); the
browser marks the reader's own shares. Public: the signed-in home fetches it
from the browser and the guest home renders it on the server."""
from __future__ import annotations

from fastapi import APIRouter, Response

from backend.services.home_today_service import home_today

router = APIRouter(prefix="/api/home", tags=["home"])


@router.get("/today")
def get_home_today(response: Response) -> dict:
    response.headers["Cache-Control"] = "public, max-age=300"
    return home_today()
