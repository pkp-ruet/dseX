from datetime import datetime, timezone, timedelta
from typing import Optional
from zoneinfo import ZoneInfo
import uuid

_DHAKA_TZ = ZoneInfo("Asia/Dhaka")  # DSE timezone, fixed UTC+6 (no DST)
_STREAK_MILESTONES = (7, 30, 100)

import bcrypt as _bcrypt
from jose import jwt, JWTError

from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from backend.services.db_service import get_db
from backend.services import user_cache


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode(), hashed.encode())


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------

def normalize_email(email: str) -> str:
    return email.strip().lower()


def normalize_phone(phone: str) -> str:
    phone = phone.strip()
    # Convert local BD format 01XXXXXXXXX → +880XXXXXXXXX
    if phone.startswith("01") and len(phone) == 11 and phone.isdigit():
        phone = "+880" + phone[1:]
    return phone


# ---------------------------------------------------------------------------
# User CRUD
# ---------------------------------------------------------------------------

def _users():
    return get_db()["users"]


def sanitize_user(doc: dict) -> dict:
    doc = dict(doc)
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    # Ensure email/phone always present as null if missing (sparse index omits them)
    doc.setdefault("email", None)
    doc.setdefault("phone", None)
    for key in (
        "created_at",
        "updated_at",
        "last_login_at",
        "last_seen_at",
        "watchlist_last_visit_at",
    ):
        if key in doc and isinstance(doc[key], datetime):
            doc[key] = doc[key].isoformat()
    return doc


def get_user_by_id(user_id: str) -> Optional[dict]:
    doc = _users().find_one({"user_id": user_id})
    return sanitize_user(doc) if doc else None


def get_user_by_email(email: str) -> Optional[dict]:
    doc = _users().find_one({"email": normalize_email(email)})
    return doc  # raw — caller may need password_hash


def get_user_by_phone(phone: str) -> Optional[dict]:
    doc = _users().find_one({"phone": normalize_phone(phone)})
    return doc  # raw — caller may need password_hash


def find_user_by_email(email: str) -> Optional[dict]:
    return _users().find_one({"email": normalize_email(email)})


def find_user_by_google_id(google_id: str) -> Optional[dict]:
    return _users().find_one({"google_id": google_id})


def create_user(
    password_plain: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    display_name: Optional[str] = None,
) -> dict:
    if not email and not phone:
        raise ValueError("At least one of email or phone is required.")

    norm_email = normalize_email(email) if email else None
    norm_phone = normalize_phone(phone) if phone else None

    # Check for duplicates
    if norm_email and _users().find_one({"email": norm_email}):
        raise ValueError("email_taken")
    if norm_phone and _users().find_one({"phone": norm_phone}):
        raise ValueError("phone_taken")

    now = datetime.now(timezone.utc)
    doc: dict = {
        "user_id": str(uuid.uuid4()),
        "password_hash": hash_password(password_plain),
        "display_name": display_name.strip() if display_name else None,
        "watchlist": [],
        "created_at": now,
        "updated_at": now,
        "last_login_at": None,
        "is_active": True,
        "current_streak": 0,
        "longest_streak": 0,
        "last_checkin_date": None,
    }
    # Only set email/phone if present — sparse index skips missing fields,
    # but treats explicit null as a value (causing dup key on second null).
    if norm_email:
        doc["email"] = norm_email
    if norm_phone:
        doc["phone"] = norm_phone
    _users().insert_one(doc)
    return sanitize_user(doc)


def create_oauth_user(
    google_sub: str,
    email: str,
    display_name: Optional[str] = None,
    picture: Optional[str] = None,
) -> dict:
    norm_email = normalize_email(email)
    now = datetime.now(timezone.utc)
    doc: dict = {
        "user_id": str(uuid.uuid4()),
        "email": norm_email,
        "display_name": display_name.strip() if display_name else None,
        "watchlist": [],
        "created_at": now,
        "updated_at": now,
        "last_login_at": now,
        "is_active": True,
        "google_id": google_sub,
        "oauth_provider": "google",
        "email_verified": True,
        "picture_url": picture or None,
        "current_streak": 0,
        "longest_streak": 0,
        "last_checkin_date": None,
    }
    _users().insert_one(doc)
    return doc


def link_google_to_user(
    user_id: str,
    google_sub: str,
    picture: Optional[str] = None,
) -> dict:
    now = datetime.now(timezone.utc)
    update = {
        "google_id": google_sub,
        "oauth_provider": "google",
        "email_verified": True,
        "updated_at": now,
        "last_login_at": now,
    }
    if picture:
        update["picture_url"] = picture
    _users().update_one({"user_id": user_id}, {"$set": update})
    return _users().find_one({"user_id": user_id})


def create_or_link_google_user(
    google_sub: str,
    email: str,
    display_name: Optional[str] = None,
    picture: Optional[str] = None,
) -> dict:
    """Find by google_id, else find by email and link, else create new.

    Returns the raw user document. Raises ValueError("google_conflict") if the
    email is already linked to a different Google account.
    """
    existing = find_user_by_google_id(google_sub)
    if existing:
        _users().update_one(
            {"user_id": existing["user_id"]},
            {"$set": {"last_login_at": datetime.now(timezone.utc)}},
        )
        return existing

    by_email = find_user_by_email(email)
    if by_email:
        current_gid = by_email.get("google_id")
        if current_gid and current_gid != google_sub:
            raise ValueError("google_conflict")
        return link_google_to_user(by_email["user_id"], google_sub, picture)

    return create_oauth_user(google_sub, email, display_name, picture)


def authenticate_user(
    password_plain: str,
    email: Optional[str] = None,
    phone: Optional[str] = None,
) -> Optional[dict]:
    if not email and not phone:
        return None

    raw = get_user_by_email(email) if email else get_user_by_phone(phone)
    if not raw:
        return None
    if not raw.get("is_active"):
        return None
    if not verify_password(password_plain, raw.get("password_hash", "")):
        return None

    _users().update_one(
        {"user_id": raw["user_id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc)}},
    )
    return sanitize_user(raw)


# ---------------------------------------------------------------------------
# Watchlist helpers
# ---------------------------------------------------------------------------

def get_user_watchlist(user_id: str) -> list[str]:
    cached = user_cache.get(user_cache.NS_WATCHLIST, user_id)
    if cached is not None:
        return cached
    doc = _users().find_one({"user_id": user_id}, {"watchlist": 1})
    codes = doc.get("watchlist", []) if doc else []
    user_cache.set(user_cache.NS_WATCHLIST, user_id, codes)
    return codes


def update_user_watchlist(user_id: str, codes: list[str]) -> list[str]:
    deduped = list(dict.fromkeys(c.upper() for c in codes))
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"watchlist": deduped, "updated_at": datetime.now(timezone.utc)}},
    )
    user_cache.set(user_cache.NS_WATCHLIST, user_id, deduped)
    return deduped


def touch_watchlist_visit(user_id: str) -> Optional[str]:
    """Record a visit to /watchlist. Returns the PREVIOUS visit timestamp (ISO
    string) so the frontend can compute "since last visit" deltas. Returns None
    on first visit."""
    now = datetime.now(timezone.utc)
    doc = _users().find_one_and_update(
        {"user_id": user_id},
        {"$set": {"watchlist_last_visit_at": now, "updated_at": now}},
        projection={"watchlist_last_visit_at": 1},
        return_document=False,  # pymongo: ReturnDocument.BEFORE
    )
    if not doc:
        return None
    prev = doc.get("watchlist_last_visit_at")
    if isinstance(prev, datetime):
        return prev.isoformat()
    return None


# ---------------------------------------------------------------------------
# Stock recommendation (last quiz result)
# ---------------------------------------------------------------------------

def save_last_recommendation(user_id: str, answers: dict, result: dict) -> bool:
    """Persist a user's most recent recommendation result on their user doc.
    Small subdoc, inline — no separate collection/index needed."""
    now = datetime.now(timezone.utc)
    doc = {
        "answers": answers,
        "picks": result.get("picks", []),          # already JSON-safe (no NaN)
        "relaxations": result.get("relaxations", []),
        "generated_at": result.get("generated_at"),
        "saved_at": now,
    }
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"last_recommendation": doc, "updated_at": now}},
    )
    return True


def get_last_recommendation(user_id: str) -> Optional[dict]:
    d = _users().find_one({"user_id": user_id}, {"last_recommendation": 1, "_id": 0})
    rec = (d or {}).get("last_recommendation")
    if rec and isinstance(rec.get("saved_at"), datetime):
        rec = {**rec, "saved_at": rec["saved_at"].isoformat()}
    return rec


def clear_last_recommendation(user_id: str) -> bool:
    """Remove the saved recommendation entirely (used by 'Start over')."""
    _users().update_one(
        {"user_id": user_id},
        {"$unset": {"last_recommendation": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return True


# ---------------------------------------------------------------------------
# Daily personalized picks (per-day cache on the user doc)
# ---------------------------------------------------------------------------

def save_daily_picks(user_id: str, doc: dict) -> bool:
    """Cache today's personalized picks on the user doc. `doc` is JSON-safe and
    carries a `date` key (Dhaka day) used to decide staleness on read."""
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"daily_picks": doc, "updated_at": datetime.now(timezone.utc)}},
    )
    return True


def get_daily_picks(user_id: str) -> Optional[dict]:
    d = _users().find_one({"user_id": user_id}, {"daily_picks": 1, "_id": 0})
    return (d or {}).get("daily_picks")


def clear_daily_picks(user_id: str) -> bool:
    """Drop today's cached picks so the next read recomputes. Called when the
    user's taste inputs change (quiz retune, like/skip feedback)."""
    _users().update_one(
        {"user_id": user_id},
        {"$unset": {"daily_picks": ""}, "$set": {"updated_at": datetime.now(timezone.utc)}},
    )
    return True


# ---------------------------------------------------------------------------
# Pick feedback (like / skip on daily picks) — tunes the taste profile
# ---------------------------------------------------------------------------

def get_pick_feedback(user_id: str) -> dict:
    """Return {"liked": [...], "disliked": [...]} (always both keys)."""
    d = _users().find_one({"user_id": user_id}, {"pick_feedback": 1, "_id": 0})
    fb = (d or {}).get("pick_feedback") or {}
    return {
        "liked": [c for c in (fb.get("liked") or []) if c],
        "disliked": [c for c in (fb.get("disliked") or []) if c],
    }


def set_pick_feedback(user_id: str, code: str, vote: str) -> dict:
    """Record a like / skip / clear for one stock. `vote` is up|down|clear.
    Liked and disliked are mutually exclusive per code. Returns the updated
    feedback dict."""
    code = (code or "").upper().strip()
    if not code:
        return get_pick_feedback(user_id)

    fb = get_pick_feedback(user_id)
    liked = [c for c in fb["liked"] if c != code]
    disliked = [c for c in fb["disliked"] if c != code]
    if vote == "up":
        liked.append(code)
    elif vote == "down":
        disliked.append(code)
    # "clear" leaves the code in neither list.

    # Bound the lists so the doc can't grow unbounded.
    liked = liked[-100:]
    disliked = disliked[-200:]
    _users().update_one(
        {"user_id": user_id},
        {"$set": {
            "pick_feedback": {"liked": liked, "disliked": disliked},
            "updated_at": datetime.now(timezone.utc),
        }},
    )
    return {"liked": liked, "disliked": disliked}


# ---------------------------------------------------------------------------
# Login streak
# ---------------------------------------------------------------------------

def _dhaka_day(dt: datetime) -> str:
    """Calendar day in Asia/Dhaka (UTC+6) as YYYY-MM-DD. Streak day boundary
    must follow DSE local time, not UTC, or a late-night Dhaka login lands in
    the wrong day."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(_DHAKA_TZ).strftime("%Y-%m-%d")


def record_streak_checkin(user_id: str) -> dict:
    """Update the user's daily check-in streak. Any app visit (one per Dhaka
    day) counts. Returns {current_streak, longest_streak, last_checkin_date,
    milestone_hit}. Same-day re-visit is a no-op."""
    now = datetime.now(timezone.utc)
    today = _dhaka_day(now)
    yesterday = _dhaka_day(now - timedelta(days=1))

    doc = _users().find_one(
        {"user_id": user_id},
        {"current_streak": 1, "longest_streak": 1, "last_checkin_date": 1},
    )
    if not doc:
        return {"current_streak": 0, "longest_streak": 0, "last_checkin_date": None, "milestone_hit": None}

    current = int(doc.get("current_streak") or 0)
    longest = int(doc.get("longest_streak") or 0)
    last_day = doc.get("last_checkin_date")

    if last_day == today:
        # Already counted today — no change, no milestone re-fire.
        return {
            "current_streak": current,
            "longest_streak": max(longest, current),
            "last_checkin_date": today,
            "milestone_hit": None,
        }

    current = current + 1 if last_day == yesterday else 1
    longest = max(longest, current)
    milestone_hit = current if current in _STREAK_MILESTONES else None

    _users().update_one(
        {"user_id": user_id},
        {"$set": {
            "current_streak": current,
            "longest_streak": longest,
            "last_checkin_date": today,
        }},
    )
    return {
        "current_streak": current,
        "longest_streak": longest,
        "last_checkin_date": today,
        "milestone_hit": milestone_hit,
    }


def ensure_users_indexes() -> None:
    col = _users()
    col.create_index("user_id", unique=True)
    col.create_index("email", unique=True, sparse=True)
    col.create_index("phone", unique=True, sparse=True)
    col.create_index("google_id", unique=True, sparse=True, name="google_id_unique")
    col.create_index([("created_at", -1)])

    # Per-user page-view events (route-level). Raw paths stored; grouped at
    # read time. TTL auto-purges after 90 days so the collection stays bounded.
    events = get_db()["user_events"]
    events.create_index("ts", expireAfterSeconds=7_776_000, name="ts_ttl_90d")
    events.create_index([("user_id", 1), ("ts", -1)], name="user_recent_events")
