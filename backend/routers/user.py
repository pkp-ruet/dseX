from datetime import datetime, timedelta, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services.auth_service import (
    get_user_watchlist,
    get_user_watchlist_meta,
    update_user_watchlist,
    add_to_user_watchlist,
    remove_from_user_watchlist,
    get_db,
    sanitize_user,
    touch_watchlist_visit,
)
from backend.services import watch_rules
from backend.services.entitlements import (
    HARD_LIMITS,
    LIMIT_WATCHLIST,
    limits_for,
    watchlist_add_blocked,
)

router = APIRouter(prefix="/api/user", tags=["user"])


class WatchlistBody(BaseModel):
    codes: list[Annotated[str, Field(max_length=20)]] = Field(
        ..., max_length=HARD_LIMITS["watchlist"])
    # Optional per-code meta to restore (undo after a remove keeps the original
    # "added on" date + price instead of re-stamping today). Only honoured for
    # codes that have no server-side meta yet.
    meta: Optional[dict[str, dict]] = Field(None, max_length=HARD_LIMITS["watchlist"])


class ProfileUpdateBody(BaseModel):
    display_name: Optional[str] = Field(None, max_length=60)


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

@router.get("/watchlist")
def get_watchlist(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    codes = get_user_watchlist(user_id)
    return {"codes": codes, "meta": get_user_watchlist_meta(user_id)}


def _check_watchlist_limit(user: dict, new_codes: list[str]) -> None:
    """403 when a free account would follow more than its limit."""
    current = get_user_watchlist(user["user_id"])
    if watchlist_add_blocked(current, new_codes, limits_for(user)["watchlist"]):
        raise HTTPException(status_code=403, detail=LIMIT_WATCHLIST)
    if watchlist_add_blocked(current, new_codes, HARD_LIMITS["watchlist"]):
        raise HTTPException(
            status_code=400,
            detail=f"A watchlist can hold up to {HARD_LIMITS['watchlist']} stocks.",
        )


def _drop_rules_off(user: dict, codes: list[str]) -> None:
    """Watching a share = being on the watchlist (2026-11-25): rules on a
    share that is no longer followed go with it."""
    rules = [r for r in user.get("watch_rules") or [] if isinstance(r, dict)]
    if not rules:
        return
    on = {c.upper() for c in codes}
    gone = {str(r.get("code") or "").upper() for r in rules} - on
    if gone:
        get_db().users.update_one({"user_id": user["user_id"]},
                                  {"$set": {"watch_rules": watch_rules.drop_codes(rules, gone)}})


@router.put("/watchlist")
def set_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    _check_watchlist_limit(current_user, body.codes)
    codes, meta = update_user_watchlist(current_user["user_id"], body.codes)
    _drop_rules_off(current_user, codes)
    return {"codes": codes, "meta": meta}


@router.patch("/watchlist/add")
def add_to_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    current = get_user_watchlist(current_user["user_id"])
    _check_watchlist_limit(current_user, current + body.codes)
    codes, meta = add_to_user_watchlist(current_user["user_id"], body.codes, restore=body.meta)
    return {"codes": codes, "meta": meta}


@router.patch("/watchlist/remove")
def remove_from_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    codes, meta = remove_from_user_watchlist(current_user["user_id"], body.codes)
    _drop_rules_off(current_user, codes)
    return {"codes": codes, "meta": meta}


@router.post("/watchlist/visit")
def visit_watchlist(current_user: dict = Depends(get_current_user)):
    prev = touch_watchlist_visit(current_user["user_id"])
    return {"previous_visit_at": prev}


# ---------------------------------------------------------------------------
# Report keys (2026-10-29; 10 a month, spent by the stock page itself since 2026-11-08)
# ---------------------------------------------------------------------------

@router.post("/report-keys/{code}")
def open_report_key(code: str, current_user: dict = Depends(get_current_user)):
    """Use one of the month's keys on a share's full report (open to the end
    of the Dhaka month, at least 7 days). The stock page calls this by itself
    when a free reader opens a share (2026-11-08). Opening a share that is
    already open costs nothing; a Premium reader needs none.
    403 `limit_reached:report_keys` when the month's keys are spent."""
    from backend.services.db_service import load_all_company_codes
    from backend.services.entitlements import is_premium
    from backend.services.report_keys import KEEP, LIMIT_REPORT_KEYS, keys_state, use_key

    code = (code or "").strip().upper()
    if not code or len(code) > 20 or code not in {c.upper() for c in load_all_company_codes()}:
        raise HTTPException(status_code=404, detail="Unknown company")
    now = datetime.now(timezone.utc)
    keys = current_user.get("report_keys") or []
    if is_premium(current_user):
        return {"status": "premium", "report_keys": keys_state(keys, now)}
    status, key = use_key(keys, code, now)
    if status == "none_left":
        raise HTTPException(status_code=403, detail=LIMIT_REPORT_KEYS)
    if key:
        # Two tabs opening the same share at once spend one key, not two.
        recent = now - timedelta(minutes=10)
        get_db()["users"].update_one(
            {
                "user_id": current_user["user_id"],
                "report_keys": {"$not": {"$elemMatch": {"code": code, "opened_at": {"$gte": recent}}}},
            },
            {"$push": {"report_keys": {"$each": [key], "$slice": -KEEP}}},
        )
        keys = [*keys, key][-KEEP:]
    return {"status": status, "report_keys": keys_state(keys, now)}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.patch("/profile")
def update_profile(body: ProfileUpdateBody, current_user: dict = Depends(get_current_user)):
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.display_name is not None:
        # A blank name is stored as no name (the navbar falls back to "Profile").
        updates["display_name"] = body.display_name.strip() or None
    doc = get_db()["users"].find_one_and_update(
        {"user_id": current_user["user_id"]},
        {"$set": updates},
        return_document=True,
    )
    return {"user": sanitize_user(doc)}
