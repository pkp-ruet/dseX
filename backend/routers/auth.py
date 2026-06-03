import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator

from backend.config import ADMIN_EMAILS, GOOGLE_CLIENT_ID
from backend.services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
    decode_access_token,
    get_user_by_id,
    normalize_email,
    normalize_phone,
    create_or_link_google_user,
    sanitize_user,
    record_streak_checkin,
)
from backend.services.db_service import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Shared dependency
# ---------------------------------------------------------------------------

def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    user = get_user_by_id(user_id)
    if not user or not user.get("is_active"):
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_user_optional(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> Optional[dict]:
    """Like get_current_user but returns None instead of raising 401 when there
    is no/invalid token — lets an endpoint work both logged-in and logged-out."""
    if not creds:
        return None
    user_id = decode_access_token(creds.credentials)
    if not user_id:
        return None
    user = get_user_by_id(user_id)
    if not user or not user.get("is_active"):
        return None
    return user


def get_current_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    email = (current_user.get("email") or "").lower()
    if email not in ADMIN_EMAILS:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    display_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str


class GoogleAuthRequest(BaseModel):
    id_token: str


class PingBody(BaseModel):
    path: Optional[str] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required.")
    try:
        user = create_user(
            password_plain=body.password,
            email=body.email,
            phone=body.phone,
            display_name=body.display_name,
        )
    except ValueError as exc:
        msg = str(exc)
        if msg == "email_taken":
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        if msg == "phone_taken":
            raise HTTPException(status_code=409, detail="An account with this phone number already exists.")
        raise HTTPException(status_code=400, detail=msg)

    token = create_access_token(user["user_id"])
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/login")
def login(body: LoginRequest):
    if not body.email and not body.phone:
        raise HTTPException(status_code=400, detail="Email or phone number is required.")

    user = authenticate_user(
        password_plain=body.password,
        email=body.email,
        phone=body.phone,
    )
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect credentials.")

    token = create_access_token(user["user_id"])
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.post("/google")
def google_sign_in(body: GoogleAuthRequest):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google sign-in is not configured.")

    try:
        # Imported lazily so the dep is only required if the endpoint is hit.
        from google.oauth2 import id_token as g_id_token
        from google.auth.transport import requests as g_requests

        claims = g_id_token.verify_oauth2_token(
            body.id_token,
            g_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token.")
    except Exception:
        # Transport/cert-fetch/import errors etc. — never let this become a bare
        # 500 (those skip CORS headers and surface as "Failed to fetch" in the browser).
        logging.getLogger("auth").exception("Google token verification failed")
        raise HTTPException(status_code=503, detail="Could not verify Google sign-in right now. Please try again.")

    if not claims.get("email_verified"):
        raise HTTPException(status_code=401, detail="Your Google email is not verified.")

    sub = claims.get("sub")
    email = claims.get("email")
    if not sub or not email:
        raise HTTPException(status_code=401, detail="Google token missing required claims.")

    try:
        user_doc = create_or_link_google_user(
            google_sub=sub,
            email=email,
            display_name=claims.get("name"),
            picture=claims.get("picture"),
        )
    except ValueError as exc:
        if str(exc) == "google_conflict":
            raise HTTPException(
                status_code=409,
                detail="This email is already linked to a different Google account.",
            )
        raise HTTPException(status_code=400, detail=str(exc))
    except HTTPException:
        raise
    except Exception:
        logging.getLogger("auth").exception("create_or_link_google_user failed")
        raise HTTPException(status_code=500, detail="Could not complete Google sign-in. Please try again.")

    user = sanitize_user(user_doc)
    token = create_access_token(user["user_id"])
    return {"access_token": token, "token_type": "bearer", "user": user}


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    email = (current_user.get("email") or "").lower()
    return {"user": {**current_user, "is_admin": email in ADMIN_EMAILS}}


@router.post("/ping")
def ping(
    current_user: dict = Depends(get_current_user),
    body: Optional[PingBody] = Body(default=None),
):
    now = datetime.now(timezone.utc)
    uid = current_user["user_id"]
    db = get_db()
    # Critical path first: liveness counter + last-seen timestamp.
    db["users"].update_one(
        {"user_id": uid},
        {"$set": {"last_seen_at": now}, "$inc": {"total_visits": 1}},
    )
    # Daily check-in streak (any app visit counts). Best-effort: a streak write
    # failure must never break the ping.
    streak = None
    try:
        streak = record_streak_checkin(uid)
    except Exception:  # noqa: BLE001 — streak must never fail the request
        logging.getLogger("auth").warning("streak update failed", exc_info=True)
    # Best-effort page-view event. Collapses repeats of the same path within a
    # minute into one row (count++) to bound write volume. Never break the ping.
    if body and body.path:
        path = body.path[:200]
        bucket = now.replace(second=0, microsecond=0)
        try:
            db["user_events"].update_one(
                {"user_id": uid, "path": path, "ts_bucket": bucket},
                {"$set": {"ts": now}, "$inc": {"count": 1}},
                upsert=True,
            )
        except Exception:  # noqa: BLE001 — analytics write must never fail the request
            logging.getLogger("auth").warning("user_events write failed", exc_info=True)
    return {"streak": streak}
