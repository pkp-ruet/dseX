"""GET /api/user/desk — the reader's Desk in one request (services/desk_service.py).

Every reader gets the whole payload; the page hides what is Premium from a
free reader (screen-only, like every lock).
"""
from fastapi import APIRouter, Depends

from backend.routers.auth import get_current_user
from backend.services.desk_service import desk

router = APIRouter(prefix="/api/user", tags=["desk"])


@router.get("/desk")
def get_desk(current_user: dict = Depends(get_current_user)):
    """{day, premium, has_shares, brief, after_close, letter, watching, month}."""
    return desk(current_user["user_id"])
