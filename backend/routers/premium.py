from fastapi import APIRouter, Depends, HTTPException

from backend.routers.auth import get_current_user
from backend.services.auth_service import get_user_by_id, public_user
from backend.services.entitlements import start_trial

router = APIRouter(prefix="/api/user/premium", tags=["premium"])


@router.post("/start-trial")
def start_free_month(current_user: dict = Depends(get_current_user)):
    """Start the account's one free month of premium. 409 once it's been used."""
    if not start_trial(current_user["user_id"]):
        raise HTTPException(status_code=409, detail="trial_used")
    return {"user": public_user(get_user_by_id(current_user["user_id"]))}
