"""
Email sending (Resend + Brevo transactional APIs) + signed link tokens.

No SMTP and no new dependency — both providers are reached over the `requests`
lib the backend already ships, and link tokens reuse the existing `python-jose`
JWT machinery (signed with JWT_SECRET). Used by the re-engagement campaign
flow (campaign_service / routers).

`send_transactional` is a thin dispatcher: it tries providers in
EMAIL_PROVIDER_ORDER, preferring whichever still has daily-quota headroom
(so a primary's free tier fills before overflowing to the next), and fails
over to the remaining providers if a send errors.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional

import requests
from jose import jwt, JWTError

from backend.config import (
    JWT_SECRET,
    JWT_ALGORITHM,
    RESEND_API_KEY,
    BREVO_API_KEY,
    EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME,
    EMAIL_REPLY_TO,
    EMAIL_PROVIDER_ORDER,
    RESEND_DAILY_CAP,
    BREVO_DAILY_CAP,
)
from backend.services.db_service import get_db

log = logging.getLogger("email")

RESEND_URL = "https://api.resend.com/emails"
BREVO_URL = "https://api.brevo.com/v3/smtp/email"


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
# Providers — Resend + Brevo, tried in EMAIL_PROVIDER_ORDER with failover
# ---------------------------------------------------------------------------

_PROVIDER_KEYS = {"resend": RESEND_API_KEY, "brevo": BREVO_API_KEY}
_PROVIDER_CAPS = {"resend": RESEND_DAILY_CAP, "brevo": BREVO_DAILY_CAP}


def is_provider_configured(name: str) -> bool:
    return bool(_PROVIDER_KEYS.get(name))


def is_configured() -> bool:
    """True if at least one provider has an API key set."""
    return any(is_provider_configured(p) for p in _PROVIDER_KEYS)


def _http_send(url, body, req_headers, *, provider, max_retries, extract_id) -> str:
    """POST a provider payload, retrying 429/5xx with exponential backoff.
    Returns the provider's message id. Raises EmailError on a hard 4xx or after
    exhausting retries."""
    last_err = ""
    for attempt in range(max_retries):
        try:
            resp = requests.post(url, json=body, headers=req_headers, timeout=15)
        except requests.RequestException as exc:
            last_err = f"network: {exc}"
        else:
            if resp.status_code in (200, 201):
                try:
                    return extract_id(resp.json())
                except ValueError:
                    return ""
            # Retry only on rate-limit / transient server errors.
            if resp.status_code == 429 or resp.status_code >= 500:
                last_err = f"{resp.status_code}: {resp.text[:200]}"
            else:
                # 4xx (bad address, unverified domain, etc.) — not worth retrying.
                raise EmailError(f"{provider} {resp.status_code}: {resp.text[:300]}")
        # backoff: 0.8s, 1.6s, ...
        time.sleep(0.8 * (2 ** attempt))

    raise EmailError(f"{provider} send failed after {max_retries} attempts — {last_err}")


def _send_via_resend(to_email, to_name, subject, html, *, tags, headers, max_retries) -> str:
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
    return _http_send(
        RESEND_URL, body, req_headers,
        provider="resend", max_retries=max_retries,
        extract_id=lambda d: d.get("id") or "",
    )


def _send_via_brevo(to_email, to_name, subject, html, *, tags, headers, max_retries) -> str:
    recipient: dict = {"email": to_email}
    if to_name:
        recipient["name"] = to_name
    body: dict = {
        "sender": {"name": EMAIL_FROM_NAME, "email": EMAIL_FROM_ADDRESS},
        "to": [recipient],
        "subject": subject,
        "htmlContent": html,
    }
    if EMAIL_REPLY_TO:
        body["replyTo"] = {"email": EMAIL_REPLY_TO}
    if tags:
        # Brevo tags are a flat list of strings.
        body["tags"] = list(tags)
    if headers:
        # Brevo passes custom headers through (List-Unsubscribe etc.).
        body["headers"] = headers
    req_headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "accept": "application/json",
    }
    return _http_send(
        BREVO_URL, body, req_headers,
        provider="brevo", max_retries=max_retries,
        extract_id=lambda d: d.get("messageId") or "",
    )


_SENDERS = {"resend": _send_via_resend, "brevo": _send_via_brevo}


# --- daily usage counter (per provider, per UTC day) → drives the quota split ---

def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _sent_today(provider: str) -> int:
    doc = get_db()["email_provider_usage"].find_one({"_id": f"{provider}:{_today_key()}"})
    return int((doc or {}).get("count", 0))


def _record_send(provider: str) -> None:
    day = _today_key()
    get_db()["email_provider_usage"].update_one(
        {"_id": f"{provider}:{day}"},
        {"$inc": {"count": 1}, "$setOnInsert": {"provider": provider, "day": day}},
        upsert=True,
    )


def send_transactional(
    to_email: str,
    to_name: Optional[str],
    subject: str,
    html: str,
    *,
    tags: Optional[list[str]] = None,
    headers: Optional[dict] = None,
    max_retries: int = 3,
) -> tuple[str, str]:
    """Send one HTML email, returning (message_id, provider).

    Tries providers in EMAIL_PROVIDER_ORDER: those whose daily cap still has
    headroom go first (fill the primary's free tier, then overflow to the next),
    with the rest kept as failover if a send errors or every provider is capped.
    Raises EmailError only if every configured provider fails."""
    configured = [p for p in EMAIL_PROVIDER_ORDER if is_provider_configured(p)]
    if not configured:
        raise EmailError("no email provider configured — set RESEND_API_KEY and/or BREVO_API_KEY")

    def has_room(p: str) -> bool:
        cap = _PROVIDER_CAPS.get(p) or 0
        return cap <= 0 or _sent_today(p) < cap

    with_room = [p for p in configured if has_room(p)]
    # Prefer providers with quota headroom; keep capped ones as last-resort failover.
    ordered = with_room + [p for p in configured if p not in with_room]

    last_err = ""
    for provider in ordered:
        try:
            msg_id = _SENDERS[provider](
                to_email, to_name, subject, html,
                tags=tags, headers=headers, max_retries=max_retries,
            )
        except EmailError as exc:
            last_err = f"{provider}: {exc}"
            log.warning("email via %s failed for %s — trying next provider: %s", provider, to_email, exc)
            continue
        _record_send(provider)
        return msg_id, provider

    raise EmailError(f"all providers failed — {last_err}")


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

    # One row per day of Buy-signal codes, so the daily mail can tell the reader
    # which signals are actually new (see daily_email_service._prev_buy_codes).
    db["daily_buy_sets"].create_index("date", unique=True, name="buy_set_date_unique")
