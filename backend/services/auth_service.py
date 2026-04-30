from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

import bcrypt as _bcrypt
from jose import jwt, JWTError

from backend.config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_MINUTES
from backend.services.db_service import get_db


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
    for key in ("created_at", "updated_at", "last_login_at"):
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
    }
    # Only set email/phone if present — sparse index skips missing fields,
    # but treats explicit null as a value (causing dup key on second null).
    if norm_email:
        doc["email"] = norm_email
    if norm_phone:
        doc["phone"] = norm_phone
    _users().insert_one(doc)
    return sanitize_user(doc)


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
    doc = _users().find_one({"user_id": user_id}, {"watchlist": 1})
    return doc.get("watchlist", []) if doc else []


def update_user_watchlist(user_id: str, codes: list[str]) -> list[str]:
    deduped = list(dict.fromkeys(c.upper() for c in codes))
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"watchlist": deduped, "updated_at": datetime.now(timezone.utc)}},
    )
    return deduped


def ensure_users_indexes() -> None:
    col = _users()
    col.create_index("user_id", unique=True)
    col.create_index("email", unique=True, sparse=True)
    col.create_index("phone", unique=True, sparse=True)
    col.create_index([("created_at", -1)])
