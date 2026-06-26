"""
Web push subscription + preferences API.

All endpoints are user-scoped (Bearer JWT via get_current_user). Subscriptions
are stored per device; prefs + the master on/off live on the user doc.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from backend.routers.auth import get_current_user
from backend.services import push_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


class PushKeys(BaseModel):
    p256dh: str
    auth: str


class SubscribeBody(BaseModel):
    endpoint: str
    keys: PushKeys


class UnsubscribeBody(BaseModel):
    endpoint: str


class PrefsBody(BaseModel):
    prefs: Optional[dict] = None
    push_enabled: Optional[bool] = None


@router.get("/me")
def notifications_state(request: Request, current_user: dict = Depends(get_current_user)):
    """Current opt-in state + per-type prefs. Pass ?endpoint=… to learn whether
    *this* device is registered."""
    endpoint = request.query_params.get("endpoint")
    return push_service.get_state(current_user["user_id"], endpoint)


@router.post("/subscribe")
def subscribe(
    body: SubscribeBody,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    try:
        push_service.subscribe(
            current_user["user_id"],
            {"endpoint": body.endpoint, "keys": body.keys.model_dump()},
            ua=request.headers.get("user-agent"),
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid subscription")
    return push_service.get_state(current_user["user_id"], body.endpoint)


@router.post("/unsubscribe")
def unsubscribe(body: UnsubscribeBody, current_user: dict = Depends(get_current_user)):
    push_service.unsubscribe(current_user["user_id"], body.endpoint)
    return push_service.get_state(current_user["user_id"], body.endpoint)


@router.post("/prefs")
def update_prefs(body: PrefsBody, current_user: dict = Depends(get_current_user)):
    return push_service.update_prefs(
        current_user["user_id"], body.prefs, body.push_enabled
    )
