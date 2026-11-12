"""Premium payments, v1: bKash / Nagad Send Money to a personal number, or a
bank transfer (NPSB / BEFTN) to our account.

The reader picks a plan, sends the money, and tells us how: for bKash / Nagad
the number they sent it from; for a bank transfer whether it went by NPSB or
BEFTN, the last 4 digits of the account it came from and the reference they
wrote, if any. Premium starts at once (the days are added on top of any left);
an admin later finds the payment in the bKash / Nagad app or the bank statement
and **accepts** it, or **revokes** it, which takes those days back. There is no
transaction ID — the admin matches on sender number (or account ending +
reference), amount and time.

An admin can also **change the plan** of a pending or accepted payment when
the reader picked one plan but sent the money for another: amount and days
follow the new plan and a granted end date moves by the difference.

Guards: one unchecked (`pending`) payment per account at a time (unique
partial index), and an account with a revoked payment no longer gets the days
up front — its next payment waits for an admin to accept it.

The rules (`normalize_sender`, `bank_details`, `ref_code`, `revoke_until`, `shift_until`,
payloads) are pure
and tested in `backend/tests/test_payments.py`; the rest is storage.
"""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

# plan → (taka charged, days). Flat prices since 2026-11-13 (user decision):
# 1 month ৳199 · 3 months ৳499 · 1 year ৳1,499, no struck-through "regular"
# price and no limited-time offer. Mirrored by frontend `lib/premium-plans.ts`.
# The 6-month plan ("halfyearly", ৳999 / 180 days, 2026-10-27 → 11-13) is no
# longer sold — old payments keep that key with their own amount + days stored
# on the payment row.
PAID_PLANS: dict[str, dict] = {
    "monthly": {"amount": 199, "days": 30},
    "quarterly": {"amount": 499, "days": 90},
    "yearly": {"amount": 1499, "days": 365},
}
# The reader's own offer (2026-10-29): one month for ৳99 instead of ৳199, once
# per account, for a reader who isn't Premium, while an admin keeps it open
# (`/admin/payments`, `set_offer_open`; no end date is ever shown). Shown as a
# banner on top of the homepage and as its own card in the pay box; kept out
# of `PAID_PLANS`, so the public plan list and the admin plan pickers stay as
# they were. `offer_state()` decides who sees it. Mirrored by frontend
# `lib/premium-plans.ts` `OWN_OFFER_PLAN`.
OWN_OFFER_KEY = "offer"
OWN_OFFER = {"amount": 99, "days": 30, "list_amount": 199}
OFFER_SETTING_ID = "own_offer"  # its row in `app_settings`
OFFER_CACHE_SECONDS = 30  # other workers see an admin's switch within this
OFFER_REMIND_DAYS = 3  # "Remind me later" hides the banner this long
ALL_PLANS: dict[str, dict] = {**PAID_PLANS, OWN_OFFER_KEY: OWN_OFFER}
MOBILE_METHODS = ("bkash", "nagad")
METHODS = (*MOBILE_METHODS, "bank")
# How a bank transfer was sent: NPSB lands in seconds, BEFTN by the next
# working day.
TRANSFERS = ("npsb", "beftn")
REFERENCE_MAX = 50
# An admin can also record money taken outside the pay box (cash, a bank
# transfer, a payment the reader never submitted) — `manual_payment` below.
MANUAL_METHODS = ("bkash", "nagad", "cash", "bank", "other")
MANUAL_MAX_DAYS = 3650
MANUAL_MAX_AMOUNT = 100_000
STATUSES = ("pending", "accepted", "revoked")

# HTTPException details the frontend matches.
ERR_PENDING = "payment_pending"
ERR_PLAN = "bad_plan"
ERR_METHOD = "bad_method"
ERR_SENDER = "bad_sender"
ERR_TRANSFER = "bad_transfer"
ERR_LAST4 = "bad_account_last4"
ERR_SAME_PLAN = "same_plan"
ERR_DAYS = "bad_days"
ERR_AMOUNT = "bad_amount"
ERR_USER = "user_not_found"
ERR_OFFER = "offer_closed"

RENEW_WINDOW_DAYS = (2, 5)  # remind once, 2–5 days before a paid plan ends
# The renewal banner on top of every page (2026-11-13): shown while Premium
# ends within this many days; it always offers the yearly plan, counted from
# the current end date (`extend_until`), so renewing early loses nothing.
RENEW_BANNER_DAYS = 10
RENEW_PLAN = "yearly"
DHAKA = timezone(timedelta(hours=6))
_BN_MONTHS = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট",
              "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")

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


def bank_details(transfer: str, last4_raw: str, reference_raw: str = "") -> dict:
    """What the reader tells us about a bank transfer: NPSB or BEFTN, the last
    4 digits of the account it came from (Bengali digits and spaces are
    fine) and an optional reference. Raises ValueError(ERR_TRANSFER /
    ERR_LAST4)."""
    t = (transfer or "").strip().lower()
    if t not in TRANSFERS:
        raise ValueError(ERR_TRANSFER)
    last4 = re.sub(r"[\s\-]", "", str(last4_raw or "")).translate(
        str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
    if not re.fullmatch(r"[0-9]{4}", last4):
        raise ValueError(ERR_LAST4)
    ref = re.sub(r"\s+", " ", str(reference_raw or "")).strip()[:REFERENCE_MAX]
    return {"transfer": t, "account_last4": last4, "reference": ref or None}


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


def offer_state(user: dict, now: datetime, premium: bool, is_open: bool) -> Optional[dict]:
    """The reader's own offer as the browser sees it, or None when it isn't
    theirs: an admin ended it (`is_open` False), they are Premium (`premium`),
    or they already used it. `banner` is False after "Not interested", and
    until the reminder day after "Remind me later"; the pay box still shows
    the offer then."""
    if not is_open or premium or user.get("offer_used_at"):
        return None
    remind = _as_utc(user.get("offer_remind_after"))
    banner = not user.get("offer_dismissed_at") and not (remind and remind > now)
    return {"key": OWN_OFFER_KEY, **OWN_OFFER, "banner": banner}


def offer_dismiss_update(action: str, now: datetime) -> dict:
    """The `$set` for the banner's two quiet buttons. Raises ValueError."""
    if action == "never":
        return {"offer_dismissed_at": now}
    if action == "later":
        return {"offer_remind_after": now + timedelta(days=OFFER_REMIND_DAYS)}
    raise ValueError("bad_action")


def user_search_query(q: str) -> Optional[dict]:
    """The Mongo filter for the admin's account search: a phone number (any
    form, or 4+ of its digits), else part of the email or name, or an exact
    user id. None for a query too short to search on."""
    q = (q or "").strip()
    if len(q) < 2:
        return None
    ors: list[dict] = [{"user_id": q}]
    digits = re.sub(r"[\s\-()+]", "", q).translate(str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789"))
    if digits.isdigit() and len(digits) >= 4:
        full = normalize_sender(digits)
        # Phones are stored as +880XXXXXXXXXX (auth_service.normalize_phone).
        tail = full[1:] if full else digits.lstrip("0") or digits
        ors.append({"phone": {"$regex": re.escape(tail) + ("$" if full else "")}})
    else:
        pat = {"$regex": re.escape(q), "$options": "i"}
        ors += [{"email": pat}, {"display_name": pat}]
    return {"$or": ors}


def manual_spec(plan: str, days: Optional[int], amount: Optional[int]) -> dict:
    """Plan, days and taka of an admin-recorded payment. A known plan fills in
    its own days and price; either can be overridden (a discount, extra days).
    `custom` needs days. Raises ValueError(ERR_PLAN / ERR_DAYS / ERR_AMOUNT)."""
    if plan != "custom" and plan not in ALL_PLANS:
        raise ValueError(ERR_PLAN)
    base = ALL_PLANS.get(plan, {})
    d = days if days is not None else base.get("days")
    a = amount if amount is not None else base.get("amount", 0)
    if not isinstance(d, int) or not 1 <= d <= MANUAL_MAX_DAYS:
        raise ValueError(ERR_DAYS)
    if not isinstance(a, int) or not 0 <= a <= MANUAL_MAX_AMOUNT:
        raise ValueError(ERR_AMOUNT)
    return {"plan": plan, "days": d, "amount": a}


def gift_payload(lang: str = "bn") -> dict:
    bn = lang != "en"
    title = "আপনার প্রিমিয়াম চালু হয়েছে" if bn else "Your Premium is on"
    body = ("আমরা আপনার অ্যাকাউন্টে প্রিমিয়াম চালু করে দিয়েছি। সব সুবিধা এখন খোলা।" if bn
            else "We switched Premium on for your account. Everything in Premium is open now.")
    return {"title": title, "body": body, "url": "/premium?src=granted", "tag": "premium-payment"}


def dhaka_day_words(when: datetime, lang: str = "en") -> str:
    """"19 Nov 2027" / "19 নভেম্বর 2027" — the Dhaka calendar date."""
    d = (_as_utc(when) or when).astimezone(DHAKA)
    if lang != "en":
        return f"{d.day} {_BN_MONTHS[d.month - 1]} {d.year}"
    return f"{d.day} {d.strftime('%b')} {d.year}"


def days_to_end(until: datetime, now: datetime) -> int:
    """Whole Dhaka calendar days from today to the end day (0 = ends today),
    the count the banner shows (frontend `lib/renewal.ts` `daysToEnd`)."""
    return ((_as_utc(until) or until).astimezone(DHAKA).date()
            - (_as_utc(now) or now).astimezone(DHAKA).date()).days


def year_until(current, now: datetime) -> datetime:
    """Where Premium would end after one more year bought today: 365 days on
    top of the days still left (the same rule a payment uses)."""
    return extend_until(current, PAID_PLANS[RENEW_PLAN]["days"], now)


def renewal_have(user: dict, armed_alerts: int = 0) -> dict:
    """What this reader set up with Premium that a free account limits — the
    banner's "what you'd lose" lines, from the user document."""
    return {
        "watchlist": len(user.get("watchlist") or []),
        "extra_portfolios": len(user.get("extra_portfolios") or []),
        "saved_screens": len(user.get("custom_lists") or []),
        "alerts": int(armed_alerts or 0),
        "dividend_reminders": len(user.get("dividend_reminders") or []),
    }


def renewal_found(caught: list[dict]) -> Optional[dict]:
    """"In the last 30 days Premium found 2 results reports and 1 record date
    on your shares." in both languages, or None when it found nothing."""
    from backend.services.portfolio_watch import kinds_phrase

    total = sum(int(k.get("count") or 0) for k in caught or [])
    if not total:
        return None
    return {
        "total": total,
        "en": f"In the last 30 days Premium found {kinds_phrase(caught, 'en')} on your shares.",
        "bn": f"গত 30 দিনে প্রিমিয়াম আপনার শেয়ারে পেয়েছে {kinds_phrase(caught, 'bn')}।",
    }


def renewal_payload(days_left: int, lang: str = "bn", caught: Optional[list[dict]] = None,
                    year_end: Optional[datetime] = None) -> dict:
    """The renewal reminder. Plans never renew by themselves, so the reminder
    says what Premium did this period — `caught` is the watcher's counts by
    kind on the reader's stocks (``portfolio_watch.digest()["kinds"]``). With
    `year_end` it offers the yearly plan and names the date it would run to."""
    from backend.services.portfolio_watch import kinds_phrase

    bn = lang != "en"
    title = (f"আপনার প্রিমিয়াম শেষ হতে আর {days_left} দিন বাকি" if bn
             else f"Your Premium ends in {days_left} day{'' if days_left == 1 else 's'}")
    if year_end is not None:
        price = f"৳{PAID_PLANS[RENEW_PLAN]['amount']:,}"
        again = (f"{price} দিয়ে এক বছর যোগ করলে প্রিমিয়াম চলবে {dhaka_day_words(year_end, 'bn')} পর্যন্ত। "
                 "বাকি দিনগুলো হারাবেন না।" if bn
                 else f"Add one year for {price} and it runs till {dhaka_day_words(year_end, 'en')}. "
                 "You keep the days you have left.")
    else:
        again = ("চালু রাখতে চাইলে বিকাশ, নগদ বা ব্যাংক ট্রান্সফারে আবার একটি প্ল্যান নিন।" if bn
                 else "To keep it on, choose a plan again and pay by bKash, Nagad or bank transfer.")
    phrase = kinds_phrase(caught or [], "bn" if bn else "en")
    # The reminder opens the reader's notifications (the Desk until
    # 2026-11-06): what Premium found for them is listed there.
    seeit = (" সবকিছু দেখুন আপনার নোটিফিকেশনে।" if bn else " See them all in your notifications.")
    if phrase:
        did = (f"এই মাসে প্রিমিয়াম আপনার শেয়ারে পেয়েছে {phrase}। " if bn
               else f"This month it found {phrase} on your shares. ")
        body = did + again + seeit
    else:
        body = again + seeit
    return {"title": title, "body": body, "url": "/notifications?src=renew", "tag": "premium-renew"}


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
    title = "আপনার পেমেন্ট আমরা খুঁজে পাইনি" if bn else "We could not find your payment"
    body = ("তাই প্রিমিয়াম বন্ধ করা হয়েছে। এটি ভুল মনে হলে আমাদের সঙ্গে যোগাযোগ করুন।" if bn
            else "So Premium has been switched off. If you think this is a mistake, please contact us.")
    return {"title": title, "body": body, "url": "/premium?src=revoked#pay", "tag": "premium-payment"}


def accepted_payload(lang: str = "bn") -> dict:
    bn = lang != "en"
    title = "আপনার প্রিমিয়াম চালু হয়েছে" if bn else "Your Premium is on"
    body = ("আপনার পেমেন্ট পেয়েছি, ধন্যবাদ। প্রিমিয়ামের সব সুবিধা এখন খোলা।" if bn
            else "We found your payment. Thank you. Everything in Premium is open now.")
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
        "transfer": doc.get("transfer"),
        "account_last4": doc.get("account_last4"),
        "reference": doc.get("reference"),
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


def receiving_methods() -> list[dict]:
    """Where to send the money, one row per open method: bKash / Nagad with a
    number set, and the bank account when its name and number are set."""
    from backend import config

    out = [{"key": k, "number": v} for k, v in
           (("bkash", config.PAY_BKASH_NUMBER), ("nagad", config.PAY_NAGAD_NUMBER)) if v]
    if config.PAY_BANK_NAME and config.PAY_BANK_ACCOUNT:
        out.append({
            "key": "bank",
            "number": config.PAY_BANK_ACCOUNT,
            "bank_name": config.PAY_BANK_NAME,
            "branch": config.PAY_BANK_BRANCH or None,
            "account_name": config.PAY_BANK_ACCOUNT_NAME or None,
            "routing": config.PAY_BANK_ROUTING or None,
        })
    return out


def user_payments(user_id: str, limit: int = 20) -> list[dict]:
    return [public_payment(d) for d in
            _payments().find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(limit)]


def submit_payment(user: dict, plan: str, method: str, sender_raw: str = "",
                   transfer: str = "", last4_raw: str = "", reference_raw: str = "") -> dict:
    """Record a payment and, unless this account has had one revoked, add the
    plan's days now. bKash / Nagad need the sender number; a bank transfer
    needs NPSB / BEFTN and the account's last 4 digits (reference optional).
    Raises ValueError(<ERR_*>) on bad input or a payment already waiting."""
    from pymongo.errors import DuplicateKeyError

    if plan not in ALL_PLANS:
        raise ValueError(ERR_PLAN)
    if method not in METHODS or method not in {m["key"] for m in receiving_methods()}:
        raise ValueError(ERR_METHOD)
    if method == "bank":
        sender = None
        bank = bank_details(transfer, last4_raw, reference_raw)
    else:
        sender = normalize_sender(sender_raw)
        if not sender:
            raise ValueError(ERR_SENDER)
        bank = {}

    uid = user["user_id"]
    now = datetime.now(timezone.utc)
    spec = ALL_PLANS[plan]
    offer = plan == OWN_OFFER_KEY
    if offer:
        from backend.services.entitlements import is_premium

        if offer_state(user, now, is_premium(user), offer_open(fresh=True)) is None:
            raise ValueError(ERR_OFFER)
        # Claim it atomically, so two tabs can't both take it.
        claimed = _db()["users"].update_one(
            {"user_id": uid, "offer_used_at": {"$exists": False}},
            {"$set": {"offer_used_at": now}},
        )
        if not claimed.modified_count:
            raise ValueError(ERR_OFFER)
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
        **bank,
        "status": "pending",
        "granted": False,
        "created_at": now,
    }
    try:
        _payments().insert_one(doc)
    except DuplicateKeyError:
        if offer:  # nothing was bought, so the offer stays theirs
            _db()["users"].update_one({"user_id": uid}, {"$unset": {"offer_used_at": ""}})
        raise ValueError(ERR_PENDING)
    doc.pop("_id", None)
    if not held:
        _grant(doc, now)
    return doc


_offer_cache: dict = {"at": 0.0, "open": True}


def offer_open(fresh: bool = False) -> bool:
    """Whether the offer is running. No row yet = open (it launched open).
    Cached a few seconds per worker; `fresh` reads the database (a payment)."""
    import time

    now = time.monotonic()
    if fresh or now - _offer_cache["at"] > OFFER_CACHE_SECONDS:
        try:
            row = _db()["app_settings"].find_one({"_id": OFFER_SETTING_ID}, {"open": 1})
            _offer_cache["open"] = bool(row.get("open", True)) if row else True
            _offer_cache["at"] = now
        except Exception:  # noqa: BLE001 — keep the last known answer
            pass
    return _offer_cache["open"]


def offer_admin_state() -> dict:
    """The admin section: on/off, who changed it last, and how far it went."""
    row = _db()["app_settings"].find_one({"_id": OFFER_SETTING_ID}) or {}
    changed = _as_utc(row.get("changed_at"))
    pays = list(_payments().aggregate([
        {"$match": {"plan": OWN_OFFER_KEY}},
        {"$group": {"_id": "$status", "n": {"$sum": 1}}},
    ]))
    by = {r["_id"]: r["n"] for r in pays}
    return {
        "open": bool(row.get("open", True)),
        "changed_at": changed.isoformat() if changed else None,
        "changed_by": row.get("changed_by"),
        **OWN_OFFER,
        "payments": {s: by.get(s, 0) for s in STATUSES},
        "not_interested": _db()["users"].count_documents({"offer_dismissed_at": {"$exists": True}}),
    }


def set_offer_open(is_open: bool, admin_email: str) -> dict:
    """Start or end the offer for everyone, at once on this worker (others
    within OFFER_CACHE_SECONDS). Readers who already paid keep their days."""
    now = datetime.now(timezone.utc)
    _db()["app_settings"].update_one(
        {"_id": OFFER_SETTING_ID},
        {"$set": {"open": bool(is_open), "changed_at": now, "changed_by": admin_email}},
        upsert=True,
    )
    _offer_cache["open"] = bool(is_open)
    _offer_cache["at"] = 0.0
    return offer_admin_state()


def dismiss_offer(user_id: str, action: str) -> None:
    """The banner's "Not interested" (`never`) or "Remind me later" (`later`).
    Raises ValueError on another action."""
    now = datetime.now(timezone.utc)
    _db()["users"].update_one(
        {"user_id": user_id},
        {"$set": {**offer_dismiss_update(action, now), "updated_at": now}},
    )


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
    doc["premium_until_after"] = until


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
            "manual": bool(d.get("manual")),
            "note": d.get("note"),
            "created_by": d.get("created_by"),
            "plan_changes": [
                {"from": c.get("from"), "to": c.get("to"), "at": iso(c.get("at"))}
                for c in d.get("plan_changes") or []
            ],
            "premium_until_after": iso(d.get("premium_until_after")),
        })
    return {"items": out, "counts": counts, "month": month}


def admin_search_users(q: str, limit: int = 10) -> list[dict]:
    """Accounts matching `q` (email, phone or name), with their Premium state."""
    query = user_search_query(q)
    if query is None:
        return []
    now = datetime.now(timezone.utc)

    def iso(v):
        v = _as_utc(v)
        return v.isoformat() if v else None
    out = []
    for u in _db()["users"].find(
        query,
        {"_id": 0, "user_id": 1, "email": 1, "phone": 1, "display_name": 1, "created_at": 1,
         "premium_until": 1, "premium_source": 1, "paid_plan": 1},
    ).sort("created_at", -1).limit(limit):
        until = _as_utc(u.get("premium_until"))
        out.append({
            "user_id": u["user_id"],
            "email": u.get("email"),
            "phone": u.get("phone"),
            "name": u.get("display_name"),
            "created_at": iso(u.get("created_at")),
            "premium_until": iso(until),
            "is_premium": bool(until and until > now),
            "premium_source": u.get("premium_source"),
            "paid_plan": u.get("paid_plan"),
            "payments": _payments().count_documents({"user_id": u["user_id"]}),
        })
    return out


def manual_payment(user_id: str, plan: str, days: Optional[int], amount: Optional[int],
                   method: str, sender_raw: str, note: str, admin_email: str) -> dict:
    """Record a payment taken outside the pay box and give its days at once.
    It is stored already accepted, so its taka count in the month's total, and
    it can be revoked or re-planned like any other payment. Raises
    ValueError(<ERR_*>)."""
    spec = manual_spec(plan, days, amount)
    if method not in MANUAL_METHODS:
        raise ValueError(ERR_METHOD)
    sender = None
    if (sender_raw or "").strip():
        sender = normalize_sender(sender_raw)
        if not sender:
            raise ValueError(ERR_SENDER)
    user = _db()["users"].find_one(
        {"user_id": user_id}, {"_id": 0, "user_id": 1, "email": 1, "phone": 1, "display_name": 1})
    if not user:
        raise ValueError(ERR_USER)

    now = datetime.now(timezone.utc)
    doc = {
        "payment_id": uuid.uuid4().hex,
        "user_id": user_id,
        "email": user.get("email"),
        "phone": user.get("phone"),
        "name": user.get("display_name"),
        "ref_code": ref_code(user_id),
        **spec,
        "method": method,
        "sender": sender,
        "status": "accepted",
        "granted": False,
        "manual": True,
        "note": (note or "").strip()[:200] or None,
        "created_at": now,
        "created_by": admin_email,
        "reviewed_at": now,
        "reviewed_by": admin_email,
    }
    _payments().insert_one(doc)
    doc.pop("_id", None)
    _grant(doc, now)
    _notify(user_id, accepted_payload if spec["amount"] > 0 else gift_payload)
    return doc


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
    if plan not in ALL_PLANS:
        raise ValueError(ERR_PLAN)
    now = datetime.now(timezone.utc)
    spec = ALL_PLANS[plan]
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
            uid, renewal_payload(days_left, prefs.get("language", "bn"), caught, year_until(until, now)))
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


def renewal_state(user_id: str, now: Optional[datetime] = None) -> Optional[dict]:
    """The renewal banner's data, or None when it shouldn't show: not Premium,
    an admin, more than `RENEW_BANNER_DAYS` left, or a payment still waiting
    (its days are already on, or will be once an admin accepts it)."""
    from backend.services.entitlements import FREE_LIMITS, is_admin

    now = now or datetime.now(timezone.utc)
    db = _db()
    u = db["users"].find_one(
        {"user_id": user_id},
        {"_id": 0, "user_id": 1, "email": 1, "email_verified": 1, "created_at": 1,
         "premium_until": 1, "premium_source": 1, "watchlist": 1, "extra_portfolios": 1,
         "custom_lists": 1, "dividend_reminders": 1},
    )
    if not u or is_admin(u):
        return None
    until = _as_utc(u.get("premium_until"))
    if not until or until <= now or days_to_end(until, now) > RENEW_BANNER_DAYS:
        return None
    if _payments().count_documents({"user_id": user_id, "status": "pending"}, limit=1):
        return None
    armed = db["price_alerts"].count_documents({"user_id": user_id, "is_active": True})
    try:
        found = renewal_found(_caught_this_period(user_id, now))
    except Exception:  # noqa: BLE001 — the recap line is a nice-to-have
        found = None
    plan = PAID_PLANS[RENEW_PLAN]
    year_end = year_until(until, now)
    return {
        "premium_until": until.isoformat(),
        "premium_source": u.get("premium_source"),
        "plan": {"key": RENEW_PLAN, "amount": plan["amount"],
                 "list_amount": plan.get("list_amount"), "days": plan["days"],
                 "until": year_end.isoformat()},
        "found": found,
        "have": renewal_have(u, armed),
        "free": {"watchlist": FREE_LIMITS["watchlist"], "alerts": FREE_LIMITS["alerts"]},
    }
