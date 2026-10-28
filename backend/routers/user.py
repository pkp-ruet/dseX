from datetime import datetime, timezone
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from utils.market_hours import bst_today_iso
from backend.services.auth_service import (
    get_user_watchlist,
    get_user_watchlist_meta,
    update_user_watchlist,
    add_to_user_watchlist,
    remove_from_user_watchlist,
    get_db,
    sanitize_user,
    touch_watchlist_visit,
    get_last_recommendation,
    clear_last_recommendation,
)
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


@router.put("/watchlist")
def set_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    _check_watchlist_limit(current_user, body.codes)
    codes, meta = update_user_watchlist(current_user["user_id"], body.codes)
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
    return {"codes": codes, "meta": meta}


@router.post("/watchlist/visit")
def visit_watchlist(current_user: dict = Depends(get_current_user)):
    prev = touch_watchlist_visit(current_user["user_id"])
    return {"previous_visit_at": prev}


# ---------------------------------------------------------------------------
# Stock recommendation
# ---------------------------------------------------------------------------

@router.get("/last-recommendation")
def last_recommendation(current_user: dict = Depends(get_current_user)):
    return {"recommendation": get_last_recommendation(current_user["user_id"])}


@router.delete("/last-recommendation")
def delete_last_recommendation(current_user: dict = Depends(get_current_user)):
    clear_last_recommendation(current_user["user_id"])
    return {"ok": True}


# ---------------------------------------------------------------------------
# TopStock AI usage (adoption tracking)
# ---------------------------------------------------------------------------

@router.post("/ai-used")
def mark_ai_used(current_user: dict = Depends(get_current_user)):
    """Record that the signed-in user sent a message to TopStock AI.

    Sets first/last-used timestamps + increments a message counter. Fired
    fire-and-forget from the assistant on every user message; best-effort."""
    now = datetime.now(timezone.utc)
    # Per-Dhaka-day counter beside the lifetime one; the frontend blocks a free
    # account at `limits.ai_daily` and re-syncs its own count from this reply.
    today = bst_today_iso()
    day = current_user.get("ai_day") or {}
    count_today = (day.get("count", 0) if day.get("date") == today else 0) + 1
    get_db()["users"].update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {"ai_last_used_at": now, "ai_day": {"date": today, "count": count_today}},
            "$min": {"ai_first_used_at": now},
            "$inc": {"ai_query_count": 1},
        },
    )
    return {"ok": True, "count_today": count_today, "limit": limits_for(current_user)["ai_daily"]}


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@router.patch("/profile")
def update_profile(body: ProfileUpdateBody, current_user: dict = Depends(get_current_user)):
    updates: dict = {"updated_at": datetime.now(timezone.utc)}
    if body.display_name is not None:
        updates["display_name"] = body.display_name.strip()
    doc = get_db()["users"].find_one_and_update(
        {"user_id": current_user["user_id"]},
        {"$set": updates},
        return_document=True,
    )
    return {"user": sanitize_user(doc)}
