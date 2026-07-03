"""
Web push (VAPID) sender — browser push notifications.

Mirrors email_service: a thin transport plus subscription/opt-in helpers. The
heavy `pywebpush` dependency is imported lazily inside the send path, so the
router and the rest of the app import cleanly even when the lib or VAPID keys are
absent (same pattern as the lazy google-auth import in routers/auth.py).

Data model
----------
- `push_subscriptions`  one doc per device, unique on `endpoint`
    {user_id, endpoint, p256dh, auth, ua, platform,
     created_at, last_seen_at, last_success_at, fail_count}
- user doc              `push_enabled` (bool) + `notification_prefs` (dict),
                        paralleling the existing `email_opt_out`
- `push_sends`          one row per (campaign_id, user_id) → idempotent re-runs
                        (exact `email_sends` pattern)
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional

from backend.config import VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
from backend.services.db_service import get_db

log = logging.getLogger("push")

# Notification types the user can toggle. All default ON (opt-out, like email).
DEFAULT_PREFS = {
    "daily_digest": True,
    "watchlist_alerts": True,
    "dividends": True,
    "price_extremes": True,
    "price_alerts": True,  # user-defined target-price hits
    "portfolio_signals": True,  # a holding flipped to Sell (buy-more/hold/sell tracker)
}

_MAX_FAILS = 5  # prune a subscription after this many consecutive transient failures


def is_configured() -> bool:
    return bool(VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY)


def _subs():
    return get_db()["push_subscriptions"]


def _users():
    return get_db()["users"]


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------

def ensure_push_indexes() -> None:
    db = get_db()
    subs = db["push_subscriptions"]
    subs.create_index("endpoint", unique=True, name="endpoint_unique")
    subs.create_index("user_id", name="subs_user")

    sends = db["push_sends"]
    # One send per (campaign, user) → idempotent re-runs (safe to re-fire a digest).
    sends.create_index(
        [("campaign_id", 1), ("user_id", 1)], unique=True, name="campaign_user_unique"
    )
    sends.create_index([("campaign_id", 1), ("status", 1)], name="campaign_status")


# ---------------------------------------------------------------------------
# Subscription management
# ---------------------------------------------------------------------------

def subscribe(
    user_id: str,
    subscription: dict,
    *,
    ua: Optional[str] = None,
    platform: Optional[str] = None,
) -> None:
    """Upsert a browser PushSubscription by endpoint and flip the user push-on.
    Seeds default prefs only if the user has none yet (never clobbers choices)."""
    endpoint = subscription.get("endpoint")
    keys = subscription.get("keys") or {}
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")
    if not endpoint or not p256dh or not auth:
        raise ValueError("invalid_subscription")

    now = datetime.now(timezone.utc)
    _subs().update_one(
        {"endpoint": endpoint},
        {
            "$set": {
                "user_id": user_id,
                "endpoint": endpoint,
                "p256dh": p256dh,
                "auth": auth,
                "ua": ua,
                "platform": platform,
                "last_seen_at": now,
                "fail_count": 0,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    # Seed default prefs without overwriting an existing choice.
    _users().update_one(
        {"user_id": user_id, "notification_prefs": {"$exists": False}},
        {"$set": {"notification_prefs": dict(DEFAULT_PREFS)}},
    )
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"push_enabled": True, "updated_at": now}},
    )


def unsubscribe(user_id: str, endpoint: str) -> None:
    _subs().delete_one({"endpoint": endpoint, "user_id": user_id})
    # If this was their last device, mark the account push-off so the digest skips them.
    if _subs().count_documents({"user_id": user_id}, limit=1) == 0:
        _users().update_one(
            {"user_id": user_id},
            {"$set": {"push_enabled": False, "updated_at": datetime.now(timezone.utc)}},
        )


def _prune(endpoint: str) -> None:
    try:
        _subs().delete_one({"endpoint": endpoint})
    except Exception:  # noqa: BLE001
        log.warning("prune failed for %s", endpoint[:60], exc_info=True)


def get_state(user_id: str, endpoint: Optional[str] = None) -> dict:
    u = _users().find_one(
        {"user_id": user_id}, {"_id": 0, "push_enabled": 1, "notification_prefs": 1}
    ) or {}
    this_device = bool(endpoint) and (
        _subs().count_documents({"user_id": user_id, "endpoint": endpoint}, limit=1) > 0
    )
    return {
        "push_enabled": bool(u.get("push_enabled")),
        "notification_prefs": {**DEFAULT_PREFS, **(u.get("notification_prefs") or {})},
        "this_device_registered": this_device,
        "configured": is_configured(),
    }


def update_prefs(
    user_id: str,
    prefs: Optional[dict] = None,
    push_enabled: Optional[bool] = None,
) -> dict:
    update: dict = {"updated_at": datetime.now(timezone.utc)}
    if prefs:
        for k, v in prefs.items():
            if k in DEFAULT_PREFS:
                update[f"notification_prefs.{k}"] = bool(v)
    if push_enabled is not None:
        update["push_enabled"] = bool(push_enabled)
    _users().update_one({"user_id": user_id}, {"$set": update})
    return get_state(user_id)


# ---------------------------------------------------------------------------
# Sending
# ---------------------------------------------------------------------------

def send_to_subscription(sub_doc: dict, payload: dict) -> str:
    """Send to one device. Returns "sent" | "expired" | "failed".
    Prunes dead subscriptions on 404/410, and after repeated transient failures."""
    if not is_configured():
        return "failed"
    try:
        from pywebpush import webpush, WebPushException  # lazy — see module docstring
    except ImportError:
        log.error("pywebpush not installed — cannot send push")
        return "failed"

    info = {
        "endpoint": sub_doc["endpoint"],
        "keys": {"p256dh": sub_doc["p256dh"], "auth": sub_doc["auth"]},
    }
    try:
        webpush(
            subscription_info=info,
            data=json.dumps(payload),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": VAPID_SUBJECT},
            ttl=86400,
        )
        return "sent"
    except WebPushException as exc:
        status = getattr(getattr(exc, "response", None), "status_code", None)
        if status in (404, 410):
            _prune(sub_doc["endpoint"])  # gone — drop it so counts stay honest
            return "expired"
        # Transient (429/5xx/network): bump fail_count, prune once it's clearly dead.
        try:
            doc = _subs().find_one_and_update(
                {"endpoint": sub_doc["endpoint"]},
                {"$inc": {"fail_count": 1}},
                projection={"fail_count": 1},
                return_document=True,  # pymongo: ReturnDocument.AFTER
            )
            if doc and (doc.get("fail_count") or 0) >= _MAX_FAILS:
                _prune(sub_doc["endpoint"])
        except Exception:  # noqa: BLE001
            pass
        log.warning("push send failed (%s) for %s", status, sub_doc["endpoint"][:60])
        return "failed"
    except Exception:  # noqa: BLE001 — one bad device must never abort a run
        log.warning("push send error for %s", sub_doc["endpoint"][:60], exc_info=True)
        return "failed"


def send_to_user(user_id: str, payload: dict) -> dict:
    """Fan a payload out to all of a user's live devices. Returns counts."""
    sent = expired = failed = 0
    for sub in list(_subs().find({"user_id": user_id})):
        result = send_to_subscription(sub, payload)
        if result == "sent":
            sent += 1
            _subs().update_one(
                {"endpoint": sub["endpoint"]},
                {"$set": {"last_success_at": datetime.now(timezone.utc), "fail_count": 0}},
            )
        elif result == "expired":
            expired += 1
        else:
            failed += 1
    return {"sent": sent, "expired": expired, "failed": failed}
