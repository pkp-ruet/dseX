from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db

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
    return out


@router.get("/analytics")
def get_analytics(_: dict = Depends(get_current_admin_user)):
    col = get_db()["users"]
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today - timedelta(days=now.weekday())
    month_start = today.replace(day=1)
    seven_ago = now - timedelta(days=7)

    docs = list(
        col.find(
            {},
            {"password_hash": 0, "_id": 0, "watchlist": 0, "portfolio": 0},
        ).sort("created_at", -1)
    )

    return {
        "stats": {
            "total_users": len(docs),
            "new_today": col.count_documents({"created_at": {"$gte": today}}),
            "new_this_week": col.count_documents({"created_at": {"$gte": week_start}}),
            "new_this_month": col.count_documents({"created_at": {"$gte": month_start}}),
            "active_last_7d": col.count_documents({"last_seen_at": {"$gte": seven_ago}}),
        },
        "users": [_serialize_user(d) for d in docs],
    }
