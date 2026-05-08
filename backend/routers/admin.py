from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db
from backend.services.daily_pick_service import admin_get_state, refresh_slot

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _serialize_user(doc: dict) -> dict:
    out = {}
    for field in (
        "user_id", "email", "phone", "display_name",
        "is_active", "created_at", "last_login_at",
        "last_seen_at", "total_visits",
    ):
        val = doc.get(field)
        if isinstance(val, datetime):
            val = val.isoformat()
        out[field] = val
    out.setdefault("total_visits", 0)
    out.setdefault("last_seen_at", None)
    out.setdefault("email", None)
    out.setdefault("phone", None)
    portfolio = doc.get("portfolio") or []
    out["has_portfolio"] = bool(portfolio)
    return out


@router.get("/analytics")
def get_analytics(_: dict = Depends(get_current_admin_user)):
    col = get_db()["users"]
    now = datetime.now(timezone.utc)
    bdt = timezone(timedelta(hours=6))
    now_bdt = now.astimezone(bdt)
    today_bdt = now_bdt.replace(hour=0, minute=0, second=0, microsecond=0)
    today = today_bdt.astimezone(timezone.utc)
    week_start = today - timedelta(days=now_bdt.weekday())
    month_start = today_bdt.replace(day=1).astimezone(timezone.utc)
    seven_ago = now - timedelta(days=7)

    docs = list(
        col.find(
            {},
            {"password_hash": 0, "_id": 0, "watchlist": 0},
        ).sort("created_at", -1)
    )

    return {
        "stats": {
            "total_users": len(docs),
            "new_today": col.count_documents({"created_at": {"$gte": today}}),
            "new_this_week": col.count_documents({"created_at": {"$gte": week_start}}),
            "new_this_month": col.count_documents({"created_at": {"$gte": month_start}}),
            "active_today": col.count_documents({"last_seen_at": {"$gte": today}}),
            "active_last_7d": col.count_documents({"last_seen_at": {"$gte": seven_ago}}),
            "with_portfolio": col.count_documents({"portfolio.0": {"$exists": True}}),
        },
        "users": [_serialize_user(d) for d in docs],
    }


# ---------------------------------------------------------------------------
# Daily Picks — admin controls (3 picks per day; refresh any individually)
# ---------------------------------------------------------------------------

class RefreshSlotRequest(BaseModel):
    slot: int = Field(..., ge=1, le=3)


@router.get("/daily-pick")
def admin_get_daily_pick(_: dict = Depends(get_current_admin_user)):
    """Today's picks (in slot order, NOT randomized) + skip log + yesterday."""
    return admin_get_state()


@router.post("/daily-pick/refresh")
def admin_refresh_slot(
    payload: RefreshSlotRequest,
    user: dict = Depends(get_current_admin_user),
):
    """Skip the current stock at `slot` and select a new candidate from the
    same source pool. Adds the rejected code to today's skip list so it can't
    come back today."""
    try:
        result = refresh_slot(payload.slot, refreshed_by_user_id=user.get("user_id"))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return result
