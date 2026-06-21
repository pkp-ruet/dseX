"""
Admin-gated campaign controls (under /api/admin/campaigns).

Preview + audience counts + "send test to me" + start send (BackgroundTasks)
+ live stats. All endpoints require an admin (get_current_admin_user).
"""
import re
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks, Query, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services import campaign_service
from backend.services.email_service import is_configured

router = APIRouter(prefix="/api/admin/campaigns", tags=["admin"])

VALID_SEGMENTS = ("portfolio", "watchlist", "cold")


def _clean_segments(segments: Optional[list[str]]) -> Optional[list[str]]:
    if not segments:
        return None
    out = [s for s in segments if s in VALID_SEGMENTS]
    if not out:
        raise HTTPException(status_code=400, detail="No valid segments selected.")
    return out


@router.get("/audience")
def get_audience(
    inactive_days: int = Query(30, ge=1, le=3650),
    _: dict = Depends(get_current_admin_user),
):
    return campaign_service.audience_summary(inactive_days)


@router.get("/preview", response_class=HTMLResponse)
def get_preview(
    segment: str = Query("watchlist"),
    _: dict = Depends(get_current_admin_user),
):
    if segment not in VALID_SEGMENTS:
        raise HTTPException(status_code=400, detail="Unknown segment.")
    return HTMLResponse(campaign_service.preview_html(segment))


_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class TestBody(BaseModel):
    segment: str = Field("watchlist")
    to_email: Optional[str] = None  # blank → falls back to the admin's own email


@router.post("/test")
def send_test(body: TestBody, user: dict = Depends(get_current_admin_user)):
    if not is_configured():
        raise HTTPException(status_code=400, detail="RESEND_API_KEY is not set on the server.")
    if body.segment not in VALID_SEGMENTS:
        raise HTTPException(status_code=400, detail="Unknown segment.")
    email = ((body.to_email or "").strip() or (user.get("email") or "").strip())
    if not email:
        raise HTTPException(status_code=400, detail="No recipient — enter an email or use an admin account that has one.")
    if not _EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="That doesn't look like a valid email address.")
    try:
        msg_id = campaign_service.send_test(body.segment, email, user.get("display_name"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Send failed: {exc}")
    return {"ok": True, "to": email, "message_id": msg_id}


class SendBody(BaseModel):
    name: Optional[str] = None
    segments: Optional[list[str]] = None
    inactive_days: int = Field(30, ge=1, le=3650)
    limit: Optional[int] = Field(None, ge=1, le=10000)


@router.post("/send")
def start_send(
    body: SendBody,
    background: BackgroundTasks,
    user: dict = Depends(get_current_admin_user),
):
    if not is_configured():
        raise HTTPException(status_code=400, detail="RESEND_API_KEY is not set on the server.")
    segments = _clean_segments(body.segments)

    raw = (body.name or f"reengage-{datetime.now(timezone.utc):%Y%m%d-%H%M%S}").strip()
    campaign_id = re.sub(r"[^A-Za-z0-9_-]", "-", raw)[:64] or "campaign"

    eligible = len(campaign_service.select_audience(body.inactive_days, segments))

    background.add_task(
        campaign_service.run_campaign,
        campaign_id,
        segments,
        body.inactive_days,
        body.limit,
        user.get("email"),
    )
    return {"campaign_id": campaign_id, "eligible": eligible, "started": True}


@router.get("/{campaign_id}/stats")
def get_stats(campaign_id: str, _: dict = Depends(get_current_admin_user)):
    return campaign_service.campaign_stats(campaign_id)
