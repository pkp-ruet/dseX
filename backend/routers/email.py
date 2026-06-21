"""
Public email link endpoints (no auth) — open-tracking pixel + unsubscribe.

Both links carry an opaque, signed token (see email_service.sign_email_token).
Unsubscribe is two-step (GET shows a confirm page, POST performs it) so an email
client prefetching the link can't silently opt a user out; the POST also serves
the List-Unsubscribe one-click header.
"""
import base64
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Query
from fastapi.responses import HTMLResponse, Response

from backend.services.db_service import get_db
from backend.services.email_service import verify_email_token

log = logging.getLogger("email")
router = APIRouter(prefix="/api/email", tags=["email"])

# 1×1 transparent GIF
_PIXEL = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
_NO_CACHE = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0", "Pragma": "no-cache"}

_INDIGO = "#4338CA"
_BG = "#FBFAF8"
_TEXT = "#1C1917"
_MUTED = "#79716B"


@router.get("/open")
def track_open(t: str = Query("")):
    """Record an email open, then return the tracking pixel. Always returns the
    GIF (even on a bad/absent token) so it never reveals tracking state."""
    payload = verify_email_token(t, "open")
    if payload and payload.get("cid"):
        try:
            get_db()["email_sends"].update_one(
                {"campaign_id": payload["cid"], "user_id": payload["sub"]},
                {"$set": {"opened_at": datetime.now(timezone.utc)}, "$inc": {"open_count": 1}},
            )
        except Exception:  # noqa: BLE001 — tracking must never error the pixel
            log.warning("open tracking write failed", exc_info=True)
    return Response(content=_PIXEL, media_type="image/gif", headers=_NO_CACHE)


def _set_opt_out(token: str) -> bool:
    payload = verify_email_token(token, "unsub")
    if not payload:
        return False
    try:
        get_db()["users"].update_one(
            {"user_id": payload["sub"]},
            {"$set": {"email_opt_out": True, "updated_at": datetime.now(timezone.utc)}},
        )
    except Exception:  # noqa: BLE001
        log.warning("unsubscribe write failed", exc_info=True)
        return False
    return True


def _page(title: str, body: str) -> str:
    return f"""<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;background:{_BG};font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:480px;margin:8vh auto;padding:0 20px;text-align:center;">
  <div style="font-size:20px;font-weight:800;color:{_INDIGO};">TopStock<span style="color:{_MUTED};"> BD</span></div>
  <div style="background:#fff;border:1px solid #E9E3D8;border-radius:12px;padding:28px 24px;margin-top:18px;">
    {body}
  </div>
  <div style="font-size:12px;color:{_MUTED};margin-top:16px;">topstockbd.com</div>
</div></body></html>"""


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_confirm(t: str = Query("")):
    """Confirmation page — does not opt out until the form is submitted (POST)."""
    valid = verify_email_token(t, "unsub") is not None
    if not valid:
        body = (
            f'<h2 style="color:{_TEXT};font-size:18px;margin:0 0 8px;">Link expired</h2>'
            f'<p style="color:{_MUTED};font-size:14px;line-height:1.6;margin:0;">'
            "This unsubscribe link isn't valid. If you keep receiving emails, just reply and we'll remove you.</p>"
        )
        return HTMLResponse(_page("Unsubscribe", body))
    body = (
        f'<h2 style="color:{_TEXT};font-size:18px;margin:0 0 8px;">Unsubscribe from emails?</h2>'
        f'<p style="color:{_MUTED};font-size:14px;line-height:1.6;margin:0 0 18px;">'
        "You won't get any more re-engagement or alert emails from TopStock BD.</p>"
        f'<form method="post" action="/api/email/unsubscribe?t={t}">'
        f'<button type="submit" style="background:{_INDIGO};color:#fff;border:0;font-size:15px;'
        'font-weight:700;padding:12px 26px;border-radius:8px;cursor:pointer;">Yes, unsubscribe</button>'
        "</form>"
    )
    return HTMLResponse(_page("Unsubscribe", body))


@router.post("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_do(t: str = Query("")):
    """Performs the opt-out. Serves both the confirm-page form submit and the
    List-Unsubscribe one-click POST from mail clients."""
    ok = _set_opt_out(t)
    if ok:
        body = (
            f'<h2 style="color:{_TEXT};font-size:18px;margin:0 0 8px;">You\'re unsubscribed</h2>'
            f'<p style="color:{_MUTED};font-size:14px;line-height:1.6;margin:0;">'
            "You won't receive further emails. Changed your mind? Open TopStock BD anytime — you'll still have your account.</p>"
        )
    else:
        body = (
            f'<h2 style="color:{_TEXT};font-size:18px;margin:0 0 8px;">Link expired</h2>'
            f'<p style="color:{_MUTED};font-size:14px;line-height:1.6;margin:0;">'
            "We couldn't process this request. Reply to any email and we'll remove you.</p>"
        )
    return HTMLResponse(_page("Unsubscribe", body))
