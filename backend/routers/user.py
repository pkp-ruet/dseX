from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from backend.routers.auth import get_current_user
from backend.services.auth_service import (
    get_user_watchlist,
    update_user_watchlist,
    get_db,
    sanitize_user,
    touch_watchlist_visit,
    get_watchlist_notes,
    set_watchlist_note,
    get_last_recommendation,
    clear_last_recommendation,
    set_pick_feedback,
    clear_daily_picks,
)
from backend.services import user_cache
from backend.services.daily_picks_service import (
    get_or_compute_daily_picks,
    apply_pick_feedback,
)

router = APIRouter(prefix="/api/user", tags=["user"])


class WatchlistBody(BaseModel):
    codes: list[str]


class ProfileUpdateBody(BaseModel):
    display_name: Optional[str] = None


class WatchlistNoteBody(BaseModel):
    code: str
    text: str = ""


class PickFeedbackBody(BaseModel):
    code: str
    vote: str  # "up" | "down" | "clear"


# ---------------------------------------------------------------------------
# Watchlist
# ---------------------------------------------------------------------------

@router.get("/watchlist")
def get_watchlist(current_user: dict = Depends(get_current_user)):
    codes = get_user_watchlist(current_user["user_id"])
    return {"codes": codes}


@router.put("/watchlist")
def set_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    codes = update_user_watchlist(current_user["user_id"], body.codes)
    return {"codes": codes}


@router.patch("/watchlist/add")
def add_to_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    existing = get_user_watchlist(user_id)
    merged = list(dict.fromkeys(existing + [c.upper() for c in body.codes]))
    get_db()["users"].update_one(
        {"user_id": user_id},
        {"$set": {"watchlist": merged, "updated_at": datetime.now(timezone.utc)}},
    )
    user_cache.set(user_cache.NS_WATCHLIST, user_id, merged)
    return {"codes": merged}


@router.patch("/watchlist/remove")
def remove_from_watchlist(body: WatchlistBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    to_remove = {c.upper() for c in body.codes}
    existing = get_user_watchlist(user_id)
    updated = [c for c in existing if c not in to_remove]
    get_db()["users"].update_one(
        {"user_id": user_id},
        {"$set": {"watchlist": updated, "updated_at": datetime.now(timezone.utc)}},
    )
    user_cache.set(user_cache.NS_WATCHLIST, user_id, updated)
    return {"codes": updated}


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


@router.get("/watchlist/notes")
def list_watchlist_notes(current_user: dict = Depends(get_current_user)):
    return {"notes": get_watchlist_notes(current_user["user_id"])}


@router.put("/watchlist/notes")
def upsert_watchlist_note(
    body: WatchlistNoteBody,
    current_user: dict = Depends(get_current_user),
):
    notes = set_watchlist_note(current_user["user_id"], body.code, body.text)
    return {"notes": notes}


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
