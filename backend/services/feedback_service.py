"""
User feedback / reviews.

Collects a star rating (1-5) + optional comment from two surfaces:
  - the homepage feedback band (anyone — logged-in or out)
  - a one-time popup shown to signed-in users

Stored in the `feedback` collection. Admins read it via /api/admin/feedback.
"""
from datetime import datetime, timezone
from typing import Optional

from pymongo import ASCENDING, DESCENDING

from backend.services.db_service import get_db

COLLECTION = "feedback"
MAX_COMMENT_LEN = 2000
VALID_SOURCES = {"homepage", "popup"}


def ensure_feedback_indexes() -> None:
    db = get_db()
    db[COLLECTION].create_index([("created_at", DESCENDING)])
    db[COLLECTION].create_index([("user_id", ASCENDING)])


def create_feedback(
    *,
    rating: Optional[int] = None,
    comment: Optional[str] = None,
    source: str = "homepage",
    user: Optional[dict] = None,
    page: Optional[str] = None,
) -> dict:
    """Insert one feedback row. `user` is the optional authenticated user doc."""
    db = get_db()
    user = user or {}
    text = (comment or "").strip()[:MAX_COMMENT_LEN] or None
    doc = {
        "rating": int(rating) if rating is not None else None,
        "comment": text,
        "source": source if source in VALID_SOURCES else "homepage",
        "page": (page or "").strip()[:200] or None,
        "user_id": user.get("user_id"),
        "user_email": user.get("email"),
        "user_name": user.get("display_name"),
        "created_at": datetime.now(timezone.utc),
    }
    res = db[COLLECTION].insert_one(doc)
    return {"id": str(res.inserted_id)}


def _serialize(doc: dict) -> dict:
    created = doc.get("created_at")
    return {
        "id": str(doc.get("_id")),
        "rating": doc.get("rating"),
        "comment": doc.get("comment"),
        "source": doc.get("source"),
        "page": doc.get("page"),
        "user_id": doc.get("user_id"),
        "user_email": doc.get("user_email"),
        "user_name": doc.get("user_name"),
        "created_at": created.isoformat() if isinstance(created, datetime) else created,
    }


def list_feedback(limit: int = 500) -> list[dict]:
    db = get_db()
    cur = db[COLLECTION].find({}).sort("created_at", DESCENDING).limit(int(limit))
    return [_serialize(d) for d in cur]


def feedback_stats() -> dict:
    """Total count, average rating, 1-5 distribution, and how many left a comment."""
    db = get_db()
    col = db[COLLECTION]
    total = col.count_documents({})
    dist = {str(i): 0 for i in range(1, 6)}
    average = None
    if total:
        weighted = 0
        counted = 0
        for row in col.aggregate([{"$group": {"_id": "$rating", "n": {"$sum": 1}}}]):
            r = row.get("_id")
            n = int(row.get("n") or 0)
            if isinstance(r, (int, float)) and 1 <= r <= 5:
                dist[str(int(r))] = n
                weighted += r * n
                counted += n
        average = round(weighted / counted, 2) if counted else None
    return {
        "total": total,
        "average": average,
        "distribution": dist,
        "with_comment": col.count_documents({"comment": {"$ne": None}}),
    }
