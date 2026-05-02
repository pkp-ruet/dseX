from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, field_validator

from backend.config import ADMIN_EMAILS
from backend.services.auth_service import (
    create_user,
    authenticate_user,
    create_access_token,
    decode_access_token,
    get_user_by_id,
    normalize_email,
    normalize_phone,
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


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    email = (current_user.get("email") or "").lower()
    return {"user": {**current_user, "is_admin": email in ADMIN_EMAILS}}


@router.post("/ping", status_code=204)
def ping(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    get_db()["users"].update_one(
        {"user_id": current_user["user_id"]},
        {"$set": {"last_seen_at": now}, "$inc": {"total_visits": 1}},
    )
