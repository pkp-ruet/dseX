""""Remind me" on the dividend calendar (2026-10-31, the Premium Desk plan).

A Premium reader picks any share on the calendar; on its last day to buy before
a cash record date the morning brief tells them ("Last day to buy X to get its
৳N dividend"), deduped with the shares they hold or follow. Stored as
`users.dividend_reminders` (codes, at most 50). Free readers get a 403 the
page turns into a pointer to its Premium card.
"""
import re

from fastapi import APIRouter, Depends, HTTPException

from backend.routers.auth import get_current_user
from backend.services import entitlements
from backend.services.db_service import get_db

router = APIRouter(prefix="/api/user/dividend-reminders", tags=["dividend-reminders"])

_CODE = re.compile(r"^[A-Z0-9&.\-]{1,20}$")


def _codes(user: dict) -> list[str]:
    return [str(c).upper() for c in (user.get("dividend_reminders") or []) if c]


def _clean(code: str) -> str:
    code = (code or "").strip().upper()
    if not _CODE.match(code):
        raise HTTPException(status_code=400, detail="bad_code")
    return code


@router.get("")
def list_reminders(current_user: dict = Depends(get_current_user)):
    return {"codes": _codes(current_user)}


@router.post("/{code}")
def add_reminder(code: str, current_user: dict = Depends(get_current_user)):
    code = _clean(code)
    if not entitlements.is_premium(current_user):
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_DIVIDEND_REMINDERS)
    have = _codes(current_user)
    if code in have:
        return {"codes": have}
    if len(have) >= entitlements.DIVIDEND_REMINDERS_MAX:
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_DIVIDEND_REMINDERS)
    if not get_db().companies.find_one({"trading_code": code}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="unknown_code")
    codes = have + [code]
    get_db().users.update_one({"user_id": current_user["user_id"]}, {"$set": {"dividend_reminders": codes}})
    return {"codes": codes}


@router.delete("/{code}")
def remove_reminder(code: str, current_user: dict = Depends(get_current_user)):
    code = _clean(code)
    codes = [c for c in _codes(current_user) if c != code]
    get_db().users.update_one({"user_id": current_user["user_id"]}, {"$set": {"dividend_reminders": codes}})
    return {"codes": codes}
