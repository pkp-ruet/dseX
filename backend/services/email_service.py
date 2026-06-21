"""
Email sending (Resend transactional API) + signed link tokens.

No SMTP and no new dependency — Resend is reached over the `requests` lib that
the backend already ships, and link tokens reuse the existing `python-jose`
JWT machinery (signed with JWT_SECRET). Used by the re-engagement campaign
flow (campaign_service / routers).
"""
import logging
import time
from typing import Optional

import requests
from jose import jwt, JWTError

from backend.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    RESEND_API_KEY,
    EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME,
    EMAIL_REPLY_TO,
)
from backend.services.db_service import get_db

log = logging.getLogger("email")

RESEND_URL = "https://api.resend.com/emails"


class EmailError(RuntimeError):
    """Raised when a transactional send ultimately fails."""


# ---------------------------------------------------------------------------
# Signed link tokens (open pixel + unsubscribe) — opaque, tamper-proof
# ---------------------------------------------------------------------------

def sign_email_token(user_id: str, purpose: str, campaign_id: Optional[str] = None) -> str:
    """Mint a compact token for an email link. `purpose` is "unsub" | "open".
    No expiry — unsubscribe links must work indefinitely."""
    payload = {"sub": user_id, "purpose": purpose}
    if campaign_id:
        payload["cid"] = campaign_id
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_email_token(token: str, expected_purpose: str) -> Optional[dict]:
    """Return the decoded payload ({sub, purpose, cid?}) iff valid and the
    purpose matches; else None."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        return None
    if payload.get("purpose") != expected_purpose:
        return None
    if not payload.get("sub"):
        return None
    return payload


# ---------------------------------------------------------------------------
# Brevo transactional send
# ---------------------------------------------------------------------------

def is_configured() -> bool:
    return bool(RESEND_API_KEY)


def send_transactional(
    to_email: str,
    to_name: Optional[str],
    subject: str,
    html: str,
    *,
    tags: Optional[list[str]] = None,
    headers: Optional[dict] = None,
    max_retries: int = 3,
) -> str:
    """Send one HTML email via Resend. Returns the Resend email id.
    Retries on 429/5xx with exponential backoff. Raises EmailError on failure."""
    if not RESEND_API_KEY:
        raise EmailError("RESEND_API_KEY is not set")

    body: dict = {
        "from": f"{EMAIL_FROM_NAME} <{EMAIL_FROM_ADDRESS}>",
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if EMAIL_REPLY_TO:
        body["reply_to"] = EMAIL_REPLY_TO
    if tags:
        # Resend tags are {name,value} objects; values must be [A-Za-z0-9_-].
        body["tags"] = [{"name": "campaign", "value": t} for t in tags]
    if headers:
        body["headers"] = headers

    req_headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }

    last_err = ""
    for attempt in range(max_retries):
        try:
            resp = requests.post(RESEND_URL, json=body, headers=req_headers, timeout=15)
        except requests.RequestException as exc:
            last_err = f"network: {exc}"
        else:
            if resp.status_code in (200, 201):
                try:
                    return resp.json().get("id") or ""
                except ValueError:
                    return ""
            # Retry only on rate-limit / transient server errors.
            if resp.status_code == 429 or resp.status_code >= 500:
                last_err = f"{resp.status_code}: {resp.text[:200]}"
            else:
                # 4xx (bad address, unverified domain, etc.) — not worth retrying.
                raise EmailError(f"Resend {resp.status_code}: {resp.text[:300]}")
        # backoff: 0.8s, 1.6s, ...
        time.sleep(0.8 * (2 ** attempt))

    raise EmailError(f"send failed after {max_retries} attempts — {last_err}")


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------

def ensure_email_indexes() -> None:
    db = get_db()
    sends = db["email_sends"]
    # One send per (campaign, user) → idempotent re-runs (safe to re-press send).
    sends.create_index(
        [("campaign_id", 1), ("user_id", 1)],
        unique=True,
        name="campaign_user_unique",
    )
    sends.create_index([("campaign_id", 1), ("status", 1)], name="campaign_status")

    campaigns = db["email_campaigns"]
    campaigns.create_index("campaign_id", unique=True, name="campaign_id_unique")
    campaigns.create_index([("created_at", -1)], name="campaign_created")
