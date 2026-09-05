from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

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
    get_last_recommendation,
    clear_last_recommendation,
    set_pick_feedback,
    clear_daily_picks,
)
from backend.services.daily_picks_service import (
    get_or_compute_daily_picks,
    apply_pick_feedback,
)

router = APIRouter(prefix="/api/user", tags=["user"])


class WatchlistBody(BaseModel):
    codes: list[str]
    # Optional per-code meta to restore (undo after a remove keeps the original
    # "added on" date + price instead of re-stamping today). Only honoured for
    # codes that have no server-side meta yet.
    meta: Optional[dict[str, dict]] = None


class ProfileUpdateBody(BaseModel):
    display_name: Optional[str] = None


class PickFeedbackBody(BaseModel):
    code: str
    vote: str  # "up" | "down" | "clear"


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

@router.get("/watchlist")
def get_watchlist(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    codes = get_user_watchlist(user_id)
    return {"codes": codes, "meta": get_user_watchlist_meta(user_id)}


@router.put("/watchlist")
def set_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    codes, meta = update_user_watchlist(current_user["user_id"], body.codes)
    return {"codes": codes, "meta": meta}


@router.patch("/watchlist/add")
def add_to_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
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
# Daily personalized picks ("Picked for you today")
# ---------------------------------------------------------------------------

@router.get("/daily-picks")
def daily_picks(current_user: dict = Depends(get_current_user)):
    return get_or_compute_daily_picks(current_user)


@router.post("/picks/feedback")
def pick_feedback(body: PickFeedbackBody, current_user: dict = Depends(get_current_user)):
    """Like (up) / skip (down) / clear feedback on a daily pick.

    - up    → records a taste signal (boost only); applies on next recompute.
    - down  → drops the stock from today's feed and backfills the next best one.
    - clear → removes any prior vote for that stock.
    Returns {"feedback": {...}, "replacement": <pick|null>}."""
    vote = body.vote if body.vote in ("up", "down", "clear") else "clear"
    return apply_pick_feedback(current_user, body.code, vote)


# ---------------------------------------------------------------------------
# TopStock AI usage (adoption tracking)
# ---------------------------------------------------------------------------

@router.post("/ai-used")
def mark_ai_used(current_user: dict = Depends(get_current_user)):
    """Record that the signed-in user sent a message to TopStock AI.

    Sets first/last-used timestamps + increments a message counter. Fired
    fire-and-forget from the assistant on every user message; best-effort."""
    now = datetime.now(timezone.utc)
    get_db()["users"].update_one(
        {"user_id": current_user["user_id"]},
        {
            "$set": {"ai_last_used_at": now},
            "$min": {"ai_first_used_at": now},
            "$inc": {"ai_query_count": 1},
        },
    )
    return {"ok": True}


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
