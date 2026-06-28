"""
User-defined price alerts.

A price alert is "notify me when stock X reaches price P". Unlike the watchlist /
portfolio (stored inline on the user doc and only ever read per-user), alerts live
in their own `price_alerts` collection because the post-scrape checker must sweep
*every* user's armed alerts at once (`find({"is_active": True})`) — exactly like
`push_subscriptions`.

Direction (above / below) is inferred at create time from the latest price, so the
user never has to choose it. Alerts are one-shot: when the target is hit they go
`is_active=False` with `triggered_at` set, and the user can re-arm from /alerts.

The `triggered_at` flag is the single source of truth for both delivery channels:
- web push is best-effort (no-op when the user has no devices / muted the type),
- the in-app bell reflects `triggered_at` regardless of push state,
so an alert always "fires" in-app even for users who never enabled push.

Idempotent: the checker flips `is_active=False` the moment a target is crossed, so
the next run's active-query excludes it; a `push_sends` row (campaign_id
`pa-<id>-<day>`) is also written for parity with the digest / events jobs.
"""
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from backend.services.db_service import get_db, load_latest_prices

log = logging.getLogger("price-alerts")

# Triggered alerts older than this are dropped from the API response so the
# /alerts history and home-bell payload stay bounded.
_TRIGGERED_RETENTION_DAYS = 30


def _alerts():
    return get_db()["price_alerts"]


def _users():
    return get_db()["users"]


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------

def ensure_price_alert_indexes() -> None:
    col = _alerts()
    col.create_index("user_id", name="alerts_user")
    col.create_index("is_active", name="alerts_active")
    col.create_index([("user_id", 1), ("id", 1)], unique=True, name="alerts_user_id")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def _normalize(a: dict) -> dict:
    """Coerce a stored alert into the shape the frontend consumes."""
    tp = a.get("triggered_price")
    return {
        "id": a.get("id"),
        "trading_code": (a.get("trading_code") or "").upper(),
        "target_price": round(float(a.get("target_price") or 0), 4),
        "direction": a.get("direction") or "above",
        "is_active": bool(a.get("is_active", True)),
        "created_at": _iso(a.get("created_at")),
        "triggered_at": _iso(a.get("triggered_at")),
        "triggered_price": (round(float(tp), 4) if tp is not None else None),
    }


def _ltp_for(code: str, prices: Optional[dict] = None) -> Optional[float]:
    prices = prices if prices is not None else load_latest_prices()
    row = prices.get(code.upper())
    ltp = row.get("ltp") if row else None
    return float(ltp) if ltp else None


def _infer_direction(target_price: float, ltp: Optional[float]) -> str:
    """'above' when the target sits at/over the current price (user is waiting for
    a rise), 'below' when it sits under it (waiting for a drop). Defaults to
    'above' when we have no current price to compare against."""
    if ltp is None:
        return "above"
    return "above" if target_price >= ltp else "below"


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_alerts(user_id: str) -> list[dict]:
    """Active alerts + alerts triggered within the retention window, armed first
    then most-recent."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=_TRIGGERED_RETENTION_DAYS)
    docs = list(_alerts().find({
        "user_id": user_id,
        "$or": [
            {"is_active": True},
            {"triggered_at": {"$gte": cutoff}},
        ],
    }))
    out = [_normalize(d) for d in docs]
    out.sort(key=lambda a: (
        0 if a["is_active"] else 1,
        a["triggered_at"] or a["created_at"] or "",
    ), reverse=False)
    # Within each group keep newest first.
    out.sort(key=lambda a: (a["is_active"], a["triggered_at"] or a["created_at"] or ""), reverse=True)
    return out


def create_alert(user_id: str, trading_code: str, target_price: float) -> dict:
    """Arm an alert. Re-uses an existing armed alert for the same code+direction
    (so tapping 'set alert' twice updates the target instead of stacking dupes)."""
    code = trading_code.strip().upper()
    target = round(float(target_price), 4)
    direction = _infer_direction(target, _ltp_for(code))
    now = datetime.now(timezone.utc)

    existing = _alerts().find_one(
        {"user_id": user_id, "trading_code": code, "direction": direction, "is_active": True}
    )
    if existing:
        _alerts().update_one(
            {"_id": existing["_id"]},
            {"$set": {"target_price": target, "created_at": now}},
        )
        return _normalize({**existing, "target_price": target, "created_at": now})

    doc = {
        "id": uuid.uuid4().hex,
        "user_id": user_id,
        "trading_code": code,
        "target_price": target,
        "direction": direction,
        "is_active": True,
        "created_at": now,
        "triggered_at": None,
        "triggered_price": None,
    }
    _alerts().insert_one(dict(doc))
    return _normalize(doc)


def update_alert(user_id: str, alert_id: str, target_price: float) -> Optional[dict]:
    """Change an alert's target. Re-infers direction from the current price."""
    code_doc = _alerts().find_one({"user_id": user_id, "id": alert_id})
    if not code_doc:
        return None
    target = round(float(target_price), 4)
    direction = _infer_direction(target, _ltp_for(code_doc.get("trading_code") or ""))
    _alerts().update_one(
        {"user_id": user_id, "id": alert_id},
        {"$set": {"target_price": target, "direction": direction}},
    )
    return _normalize({**code_doc, "target_price": target, "direction": direction})


def delete_alert(user_id: str, alert_id: str) -> bool:
    res = _alerts().delete_one({"user_id": user_id, "id": alert_id})
    return res.deleted_count > 0


def rearm_alert(user_id: str, alert_id: str) -> Optional[dict]:
    """Reset a triggered alert back to armed, re-inferring direction from the
    current price (the price has moved since it last fired)."""
    doc = _alerts().find_one({"user_id": user_id, "id": alert_id})
    if not doc:
        return None
    direction = _infer_direction(
        float(doc.get("target_price") or 0), _ltp_for(doc.get("trading_code") or "")
    )
    _alerts().update_one(
        {"user_id": user_id, "id": alert_id},
        {"$set": {"is_active": True, "direction": direction},
         "$unset": {"triggered_at": "", "triggered_price": ""}},
    )
    return _normalize({**doc, "is_active": True, "direction": direction,
                       "triggered_at": None, "triggered_price": None})


# ---------------------------------------------------------------------------
# Checker (CLI / cron entrypoint)
# ---------------------------------------------------------------------------

def _crossed(direction: str, ltp: float, target: float) -> bool:
    return (direction == "above" and ltp >= target) or (direction == "below" and ltp <= target)


def check_and_notify(not_before_dhaka_hour: Optional[int] = None) -> dict:
    """Evaluate every armed alert against the latest prices. On a hit: mark the
    alert triggered (one-shot) and best-effort web-push the owner.

    Triggering and push are decoupled — the alert is always marked triggered (so
    the in-app bell shows it), while push is skipped when the user has no devices
    or muted `price_alerts`.

    When `not_before_dhaka_hour` is set, the whole check is skipped before the
    current Dhaka hour reaches it (returns `gated`). Alerts are one-shot, so an
    intraday quick-scrape run must not trip one on a transient price — only the
    close counts. Pass None to disable the gate."""
    from backend.services import push_service
    from backend.services.auth_service import _dhaka_day, _DHAKA_TZ

    now = datetime.now(timezone.utc)
    if not_before_dhaka_hour is not None:
        dhaka_hour = now.astimezone(_DHAKA_TZ).hour
        if dhaka_hour < not_before_dhaka_hour:
            log.info("price alerts gated — %02d:00 Dhaka is before market close %02d:00; skipping",
                     dhaka_hour, not_before_dhaka_hour)
            return {"checked": 0, "triggered": 0, "pushed": 0, "failed": 0, "gated": True}

    ensure_price_alert_indexes()
    push_service.ensure_push_indexes()
    day = _dhaka_day(now)

    active = list(_alerts().find({"is_active": True}))
    if not active:
        return {"checked": 0, "triggered": 0, "pushed": 0, "failed": 0}

    prices = load_latest_prices()
    db = get_db()
    sends = db["push_sends"]
    push_ok = push_service.is_configured()

    prefs_cache: dict[str, bool] = {}

    def _wants_push(uid: str) -> bool:
        if uid not in prefs_cache:
            u = _users().find_one(
                {"user_id": uid},
                {"_id": 0, "push_enabled": 1, "notification_prefs": 1},
            ) or {}
            prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
            prefs_cache[uid] = bool(u.get("push_enabled")) and prefs.get("price_alerts", True)
        return prefs_cache[uid]

    triggered = pushed = failed = 0
    for alert in active:
        code = (alert.get("trading_code") or "").upper()
        ltp = _ltp_for(code, prices)
        if ltp is None:
            continue
        direction = alert.get("direction") or "above"
        target = float(alert.get("target_price") or 0)
        if not _crossed(direction, ltp, target):
            continue

        # 1) Mark triggered first (one-shot). Guard on is_active so a concurrent
        #    run can't double-fire the same alert.
        now = datetime.now(timezone.utc)
        res = _alerts().update_one(
            {"id": alert["id"], "is_active": True},
            {"$set": {"is_active": False, "triggered_at": now, "triggered_price": round(ltp, 4)}},
        )
        if res.modified_count == 0:
            continue
        triggered += 1

        # 2) Best-effort web push.
        uid = alert.get("user_id")
        if not (push_ok and uid and _wants_push(uid)):
            continue
        campaign_id = f"pa-{alert['id']}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        verb = "rose to" if direction == "above" else "dropped to"
        payload = {
            "title": "Price target hit 🎯",
            "body": f"{code} {verb} ৳{ltp:g} — your ৳{target:g} target",
            "url": f"/stock/{code}",
            "tag": f"pa-{code}",
        }
        result = push_service.send_to_user(uid, payload)
        status = "sent" if result["sent"] > 0 else ("expired" if result["expired"] else "failed")
        if result["sent"] > 0:
            pushed += 1
        elif status == "failed":
            failed += 1
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {
                "campaign_id": campaign_id, "user_id": uid,
                "status": status, "result": result,
                "sent_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    counts = {"checked": len(active), "triggered": triggered, "pushed": pushed, "failed": failed}
    log.info("price alerts done: %s", counts)
    return counts
