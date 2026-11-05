"""The reader's notifications (2026-11-06, replaced `/api/user/desk`).

GET  /api/user/notifications        — the list (services/notifications_service.py)
GET  /api/user/notifications/unread — the navbar bell's number
POST /api/user/notifications/seen   — the reader opened the list

`/api/notifications/*` (no `/user`) is the push-subscription router.
"""
from fastapi import APIRouter, Depends

from backend.routers.auth import get_current_user
from backend.services import notifications_service as svc

router = APIRouter(prefix="/api/user/notifications", tags=["notifications"])


@router.get("")
def get_notifications(current_user: dict = Depends(get_current_user)):
    """{items, unread, seen_at, has_shares, premium}."""
    return svc.feed(current_user["user_id"])


@router.get("/unread")
def get_unread(current_user: dict = Depends(get_current_user)):
    return {"unread": svc.unread(current_user["user_id"])}


@router.post("/seen")
def post_seen(current_user: dict = Depends(get_current_user)):
    return {"seen_at": svc.mark_seen(current_user["user_id"])}
