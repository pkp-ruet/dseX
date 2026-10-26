"""Premium payments, v1: bKash / Nagad Send Money to a personal number.

The reader picks a plan, sends the money, and types the number they sent it
from. Premium starts at once (the days are added on top of any left); an admin
later finds the payment in the bKash / Nagad app and **accepts** it, or
**revokes** it, which takes those days back. There is no transaction ID — the
admin matches on sender number, amount, time and the reader's reference code.

An admin can also **change the plan** of a pending or accepted payment when
the reader picked one plan but sent the money for another: amount and days
follow the new plan and a granted end date moves by the difference.

Guards: one unchecked (`pending`) payment per account at a time (unique
partial index), and an account with a revoked payment no longer gets the days
up front — its next payment waits for an admin to accept it.

The rules (`normalize_sender`, `ref_code`, `revoke_until`, `shift_until`, payloads) are pure
and tested in `backend/tests/test_payments.py`; the rest is storage.
"""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

# plan → (taka charged, days). `list_amount` is the regular price shown struck
# through while a limited-time offer runs (2026-10-27: 6 months ৳1,149 → ৳999,
# 1 year ৳2,199 → ৳1,899); the reader always pays `amount`. Mirrored by
# frontend `lib/premium-plans.ts`. The 3-month plan ("quarterly", ৳499 / 90
# days) was replaced by the 6-month one on 2026-10-27 — old payments keep that
# key with their own amount + days stored on the payment row.
PAID_PLANS: dict[str, dict] = {
    "monthly": {"amount": 199, "days": 30},
    "halfyearly": {"amount": 999, "days": 180, "list_amount": 1149},
    "yearly": {"amount": 1899, "days": 365, "list_amount": 2199},
}
METHODS = ("bkash", "nagad")
STATUSES = ("pending", "accepted", "revoked")

# HTTPException details the frontend matches.
ERR_PENDING = "payment_pending"
ERR_PLAN = "bad_plan"
ERR_METHOD = "bad_method"
ERR_SENDER = "bad_sender"
ERR_SAME_PLAN = "same_plan"

RENEW_WINDOW_DAYS = (2, 5)  # remind once, 2–5 days before a paid plan ends

_SENDER_RE = re.compile(r"^01[3-9]\d{8}$")


# ---------------------------------------------------------------------------
# Pure rules
# ---------------------------------------------------------------------------

def normalize_sender(raw: str) -> Optional[str]:
    """A Bangladeshi mobile number as `01XXXXXXXXX`, or None. Accepts spaces,
    dashes, `+880` / `880` prefixes and Bengali digits."""
    if not raw:
        return None
    s = str(raw).translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
    s = re.sub(r"[\s\-()]", "", s)
    if s.startswith("+"):
        s = s[1:]
    if s.startswith("880"):
        s = s[2:]
    return s if _SENDER_RE.match(s) else None


def ref_code(user_id: str) -> str:
    """Six characters the reader can put in the Send Money reference, so the
    admin can tell whose payment it is."""
    return re.sub(r"[^0-9a-zA-Z]", "", user_id or "")[:6].upper()


def _as_utc(value) -> Optional[datetime]:
    if not isinstance(value, datetime):
        return None
    return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


def extend_until(current, days: int, now: datetime) -> datetime:
    """Paid days start after any days the reader still has."""
    cur = _as_utc(current)
    base = cur if cur and cur > now else now
    return base + timedelta(days=days)


def revoke_until(current, days: int, now: datetime) -> datetime:
    """Take `days` back off the end date, never past now."""
    cur = _as_utc(current) or now
    return max(now, cur - timedelta(days=days))


def shift_until(current, delta_days: int, now: datetime) -> datetime:
    """Move an end date by `delta_days` after an admin corrects the plan: more
    days are added like a payment (after any days left), fewer are taken back
    like a revoke (never past now)."""
    if delta_days >= 0:
        return extend_until(current, delta_days, now)
    return revoke_until(current, -delta_days, now)


def renewal_payload(days_left: int, lang: str = "bn", caught: Optional[list[dict]] = None) -> dict:
    """The renewal reminder. Plans never renew by themselves, so the reminder
    says what Premium did this period — `caught` is the watcher's counts by
    kind on the reader's stocks (``portfolio_watch.digest()["kinds"]``)."""
    from backend.services.portfolio_watch import kinds_phrase

    bn = lang != "en"
    title = (f"আপনার প্রিমিয়াম শেষ হতে আর {days_left} দিন" if bn
             else f"Your Premium ends in {days_left} day{'' if days_left == 1 else 's'}")
    again = ("চালু রাখতে bKash বা Nagad দিয়ে আবার প্ল্যান নিন।" if bn
             else "Pick a plan again by bKash or Nagad to keep it on.")
    phrase = kinds_phrase(caught or [], "bn" if bn else "en")
    if phrase:
        did = (f"এই মাসে আপনার শেয়ারে ধরেছে {phrase}। " if bn
               else f"This month it flagged {phrase} on your stocks. ")
        body = did + again
    else:
        body = again
    return {"title": title, "body": body, "url": "/premium?src=renew#pay", "tag": "premium-renew"}


def _caught_this_period(user_id: str, now: datetime) -> list[dict]:
    """The watcher's counts on this reader's stocks over the last 30 days."""
    from backend.services.portfolio_watch import digest

    rows = list(_db()["portfolio_watch_events"].find(
        {"user_id": user_id, "created_at": {"$gte": now - timedelta(days=30)}},
        {"_id": 0, "kind": 1, "code": 1, "level": 1},
    ))
    return digest(rows)["kinds"]


def revoked_payload(lang: str = "bn") -> dict:
    bn = lang != "en"
    title = "আপনার পেমেন্ট আমরা খুঁজে পাইনি" if bn else "We couldn't find your payment"
    body = ("তাই প্রিমিয়াম বন্ধ করা হয়েছে। ভুল হলে আমাদের সাথে যোগাযোগ করুন।" if bn
            else "So Premium has been switched off. If this is a mistake, contact us.")
    return {"title": title, "body": body, "url": "/premium?src=revoked#pay", "tag": "premium-payment"}


def accepted_payload(lang: str = "bn") -> dict:
    bn = lang != "en"
    title = "আপনার প্রিমিয়াম চালু হয়েছে" if bn else "Your Premium is on"
    body = ("পেমেন্ট পেয়েছি, ধন্যবাদ। সব প্রিমিয়াম সুবিধা এখন খোলা।" if bn
            else "We found your payment — thank you. Everything in Premium is open now.")
    return {"title": title, "body": body, "url": "/premium?src=accepted", "tag": "premium-payment"}


def public_payment(doc: dict) -> dict:
    """What the reader sees of their own payment."""
    def iso(v):
        v = _as_utc(v)
        return v.isoformat() if v else None
    return {
        "id": doc.get("payment_id"),
        "plan": doc.get("plan"),
        "amount": doc.get("amount"),
        "days": doc.get("days"),
        "method": doc.get("method"),
        "sender": doc.get("sender"),
        "status": doc.get("status"),
        "granted": bool(doc.get("granted")),
        "created_at": iso(doc.get("created_at")),
        "reviewed_at": iso(doc.get("reviewed_at")),
    }


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

def _db():
    from backend.services.db_service import get_db

    return get_db()


def _payments():
    return _db()["payments"]


def ensure_payment_indexes() -> None:
    col = _payments()
    col.create_index("payment_id", unique=True, name="payment_id_unique")
    col.create_index([("user_id", 1), ("created_at", -1)], name="user_created")
    col.create_index([("status", 1), ("created_at", -1)], name="status_created")
    # One unchecked payment per account — a double tap or second tab can't
    # stack two lots of free days.
    col.create_index(
        "user_id", unique=True, name="one_pending_per_user",
        partialFilterExpression={"status": "pending"},
    )


def receiving_numbers() -> dict:
    from backend.config import PAY_BKASH_NUMBER, PAY_NAGAD_NUMBER

    nums = {"bkash": PAY_BKASH_NUMBER, "nagad": PAY_NAGAD_NUMBER}
    return {k: v for k, v in nums.items() if v}


def user_payments(user_id: str, limit: int = 20) -> list[dict]:
    return [public_payment(d) for d in
            _payments().find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)]


def submit_payment(user: dict, plan: str, method: str, sender_raw: str) -> dict:
    """Record a payment and, unless this account has had one revoked, add the
    plan's days now. Raises ValueError(<ERR_*>) on bad input or a payment
    already waiting."""
    from pymongo.errors import DuplicateKeyError

    if plan not in PAID_PLANS:
        raise ValueError(ERR_PLAN)
    if method not in METHODS or method not in receiving_numbers():
        raise ValueError(ERR_METHOD)
    sender = normalize_sender(sender_raw)
    if not sender:
        raise ValueError(ERR_SENDER)

    uid = user["user_id"]
    now = datetime.now(timezone.utc)
    spec = PAID_PLANS[plan]
    held = _payments().count_documents({"user_id": uid, "status": "revoked"}, limit=1) > 0
    doc = {
        "payment_id": uuid.uuid4().hex,
        "user_id": uid,
        "email": user.get("email"),
        "phone": user.get("phone"),
        "name": user.get("display_name"),
        "ref_code": ref_code(uid),
        "plan": plan,
        "amount": spec["amount"],
        "days": spec["days"],
        "method": method,
        "sender": sender,
        "status": "pending",
        "granted": False,
        "created_at": now,
    }
    try:
        _payments().insert_one(doc)
    except DuplicateKeyError:
        raise ValueError(ERR_PENDING)
    doc.pop("_id", None)
    if not held:
        _grant(doc, now)
    return doc


def _grant(doc: dict, now: datetime) -> None:
    users = _db()["users"]
    u = users.find_one({"user_id": doc["user_id"]}, {"premium_until": 1})
    until = extend_until((u or {}).get("premium_until"), doc["days"], now)
    users.update_one(
        {"user_id": doc["user_id"]},
        {"$set": {"premium_until": until, "premium_source": "paid",
                  "paid_plan": doc["plan"], "updated_at": now}},
    )
    _payments().update_one(
        {"payment_id": doc["payment_id"]},
        {"$set": {"granted": True, "granted_at": now, "premium_until_after": until}},
    )
    doc["granted"] = True


def admin_list(status: Optional[str], limit: int = 200) -> dict:
    q = {"status": status} if status in STATUSES else {}
    items = list(_payments().find(q, {"_id": 0}).sort("created_at", -1).limit(limit))
    counts = {s: _payments().count_documents({"status": s}) for s in STATUSES}

    dhaka = timezone(timedelta(hours=6))
    month_start = datetime.now(dhaka).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    agg = list(_payments().aggregate([
        {"$match": {"status": {"$in": ["pending", "accepted"]},
                    "created_at": {"$gte": month_start.astimezone(timezone.utc)}}},
        {"$group": {"_id": "$status", "amount": {"$sum": "$amount"}}},
    ]))
    month = {s: 0 for s in ("pending", "accepted")}
    for row in agg:
        month[row["_id"]] = row["amount"]

    def iso(v):
        v = _as_utc(v)
        return v.isoformat() if v else None
    out = []
    for d in items:
        out.append({
            **public_payment(d),
            "user_id": d.get("user_id"),
            "email": d.get("email"),
            "phone": d.get("phone"),
            "name": d.get("name"),
            "ref_code": d.get("ref_code"),
            "reason": d.get("reason"),
            "plan_changes": [
                {"from": c.get("from"), "to": c.get("to"), "at": iso(c.get("at"))}
                for c in d.get("plan_changes") or []
            ],
            "premium_until_after": iso(d.get("premium_until_after")),
        })
    return {"items": out, "counts": counts, "month": month}


def accept(payment_id: str, admin_email: str) -> Optional[dict]:
    """pending → accepted. A payment that was held (revoked before) gets its
    days now. Returns the payment, or None when it wasn't pending."""
    now = datetime.now(timezone.utc)
    doc = _payments().find_one_and_update(
        {"payment_id": payment_id, "status": "pending"},
        {"$set": {"status": "accepted", "reviewed_at": now, "reviewed_by": admin_email}},
        projection={"_id": 0},
    )
    if not doc:
        return None
    if not doc.get("granted"):
        _grant(doc, now)
        _notify(doc["user_id"], accepted_payload)
    doc["status"] = "accepted"
    return doc


def change_plan(payment_id: str, plan: str, admin_email: str) -> Optional[dict]:
    """Correct the plan of a pending / accepted payment (the reader picked one
    plan but sent the money for another). Amount and days follow the plan; if
    the days were already granted, the reader's end date moves by the
    difference. Status is unchanged. Returns the payment, or None when it is
    revoked or doesn't exist. Raises ValueError(ERR_PLAN / ERR_SAME_PLAN)."""
    if plan not in PAID_PLANS:
        raise ValueError(ERR_PLAN)
    now = datetime.now(timezone.utc)
    spec = PAID_PLANS[plan]
    old = _payments().find_one(
        {"payment_id": payment_id, "status": {"$in": ["pending", "accepted"]}}, {"_id": 0})
    if not old:
        return None
    if old.get("plan") == plan:
        raise ValueError(ERR_SAME_PLAN)
    doc = _payments().find_one_and_update(
        # Matching the old plan makes a double submit a no-op instead of
        # moving the end date twice.
        {"payment_id": payment_id, "plan": old.get("plan"),
         "status": {"$in": ["pending", "accepted"]}},
        {"$set": {"plan": plan, "amount": spec["amount"], "days": spec["days"],
                  "plan_changed_at": now, "plan_changed_by": admin_email},
         "$push": {"plan_changes": {"from": old.get("plan"), "from_amount": old.get("amount"),
                                    "to": plan, "at": now, "by": admin_email}}},
        projection={"_id": 0},
        return_document=True,
    )
    if not doc:
        return None
    if doc.get("granted"):
        delta = spec["days"] - int(old.get("days") or 0)
        users = _db()["users"]
        u = users.find_one({"user_id": doc["user_id"]}, {"premium_until": 1})
        until = shift_until((u or {}).get("premium_until"), delta, now)
        users.update_one({"user_id": doc["user_id"]},
                         {"$set": {"premium_until": until, "paid_plan": plan, "updated_at": now}})
        _payments().update_one({"payment_id": payment_id},
                               {"$set": {"premium_until_after": until}})
        doc["premium_until_after"] = until
    return doc


def revoke(payment_id: str, admin_email: str, reason: str = "") -> Optional[dict]:
    """pending / accepted → revoked, taking back the days it added. Returns the
    payment, or None when it was already revoked or doesn't exist."""
    now = datetime.now(timezone.utc)
    doc = _payments().find_one_and_update(
        {"payment_id": payment_id, "status": {"$in": ["pending", "accepted"]}},
        {"$set": {"status": "revoked", "reviewed_at": now, "reviewed_by": admin_email,
                  "reason": (reason or "")[:200]}},
        projection={"_id": 0},
    )
    if not doc:
        return None
    if doc.get("granted"):
        users = _db()["users"]
        u = users.find_one({"user_id": doc["user_id"]}, {"premium_until": 1})
        until = revoke_until((u or {}).get("premium_until"), int(doc.get("days") or 0), now)
        users.update_one({"user_id": doc["user_id"]},
                         {"$set": {"premium_until": until, "updated_at": now}})
        _notify(doc["user_id"], revoked_payload)
    doc["status"] = "revoked"
    return doc


def _notify(user_id: str, build) -> None:
    """Best-effort push in the reader's language; never fails the admin action."""
    try:
        from backend.services import push_service

        if not push_service.is_configured():
            return
        u = _db()["users"].find_one({"user_id": user_id},
                                    {"push_enabled": 1, "notification_prefs": 1})
        if not (u and u.get("push_enabled")):
            return
        lang = (u.get("notification_prefs") or {}).get("language", "bn")
        push_service.send_to_user(user_id, build(lang))
    except Exception:  # noqa: BLE001 — a push is a courtesy
        import logging

        logging.getLogger(__name__).warning("payment push failed for %s", user_id, exc_info=True)


def send_renewal_reminders(now: datetime, day: str, push_ok: bool) -> int:
    """One push per paid period, 2–5 days before it ends."""
    from backend.services import push_service

    users_col = _db()["users"]
    lo = now + timedelta(days=RENEW_WINDOW_DAYS[0])
    hi = now + timedelta(days=RENEW_WINDOW_DAYS[1])
    sent = 0
    for u in users_col.find(
        {"premium_source": "paid", "premium_until": {"$gte": lo, "$lte": hi}},
        {"_id": 0, "user_id": 1, "premium_until": 1, "renew_reminder_for": 1,
         "push_enabled": 1, "notification_prefs": 1},
    ):
        until = _as_utc(u["premium_until"])
        # Once per end date: a renewal moves the date, so the next period
        # gets its own reminder.
        if _as_utc(u.get("renew_reminder_for")) == until:
            continue
        uid = u["user_id"]
        users_col.update_one({"user_id": uid}, {"$set": {"renew_reminder_for": until}})
        if not (push_ok and u.get("push_enabled")):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        days_left = max(1, (until - now).days)
        try:
            caught = _caught_this_period(uid, now)
        except Exception:  # noqa: BLE001 — the recap line is a nice-to-have
            caught = []
        result = push_service.send_to_user(
            uid, renewal_payload(days_left, prefs.get("language", "bn"), caught))
        campaign_id = f"premiumrenew-{uid}-{day}"
        _db()["push_sends"].update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": now}},
            upsert=True,
        )
        if result["sent"]:
            sent += 1
    return sent
