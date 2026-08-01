"""
User feedback / reviews.

Collects a star rating (1-5) + optional comment from two surfaces:
  - the homepage feedback band (anyone — logged-in or out)
  - a one-time popup shown to signed-in users

Stored in the `feedback` collection. Admins read it via /api/admin/feedback.
"""
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING

from backend.services.db_service import get_db, _ttl_cache

COLLECTION = "feedback"
MAX_COMMENT_LEN = 2000
# Public quotes are trimmed so one long review can't dominate the trust block.
PUBLIC_COMMENT_LEN = 280
VALID_SOURCES = {"homepage", "popup"}


def ensure_feedback_indexes() -> None:
    db = get_db()
    db[COLLECTION].create_index([("created_at", DESCENDING)])
    db[COLLECTION].create_index([("user_id", ASCENDING)])
    # Public testimonials read by (featured, created_at) on every landing render.
    db[COLLECTION].create_index([("featured", ASCENDING), ("created_at", DESCENDING)])


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
        "featured": bool(doc.get("featured")),
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
        "featured": col.count_documents({"featured": True}),
    }


def set_featured(feedback_id: str, featured: bool) -> bool:
    """Admin moderation switch. Only `featured` rows are ever shown publicly, so
    nothing a user writes reaches the landing page without a human approving it.
    Returns False when the id doesn't exist (or isn't a valid ObjectId)."""
    try:
        oid = ObjectId(feedback_id)
    except (InvalidId, TypeError):
        return False
    res = get_db()[COLLECTION].update_one({"_id": oid}, {"$set": {"featured": bool(featured)}})
    return res.matched_count > 0


# ---------------------------------------------------------------------------
# Public surface — the landing page's trust block
# ---------------------------------------------------------------------------

# Names are the only user-supplied identity we publish, and only a first name.
# Emails never leave the admin view.
def _first_name(raw) -> Optional[str]:
    if not isinstance(raw, str):
        return None
    first = raw.strip().split(" ")[0].strip()
    return first[:24] or None


def _public_testimonials(limit: int) -> list[dict]:
    """Admin-approved reviews that actually carry a comment, newest first."""
    cur = (
        get_db()[COLLECTION]
        .find({"featured": True, "comment": {"$ne": None}})
        .sort("created_at", DESCENDING)
        .limit(int(limit))
    )
    out: list[dict] = []
    for d in cur:
        text = (d.get("comment") or "").strip()
        if not text:
            continue
        created = d.get("created_at")
        out.append({
            "name": _first_name(d.get("user_name")),
            "rating": d.get("rating") if isinstance(d.get("rating"), int) else None,
            "comment": text[:PUBLIC_COMMENT_LEN],
            "date": created.date().isoformat() if isinstance(created, datetime) else None,
        })
    return out


@_ttl_cache(300, max_entries=4)
def public_trust_stats(testimonial_limit: int = 6) -> dict:
    """Real, checkable numbers for the landing page's trust block.

    Deliberately narrow: how many people have signed up, how they rate the app,
    and the reviews an admin has approved for publication. No performance or
    return claims live here — the product makes none.
    """
    db = get_db()
    try:
        user_count = db["users"].count_documents({})
    except Exception:  # noqa: BLE001 — the block degrades to "no number" rather than 500ing
        user_count = 0

    rated = 0
    weighted = 0
    try:
        for row in db[COLLECTION].aggregate([
            {"$match": {"rating": {"$gte": 1, "$lte": 5}}},
            {"$group": {"_id": "$rating", "n": {"$sum": 1}}},
        ]):
            r, n = row.get("_id"), int(row.get("n") or 0)
            if isinstance(r, (int, float)):
                rated += n
                weighted += r * n
    except Exception:  # noqa: BLE001
        rated = weighted = 0

    try:
        testimonials = _public_testimonials(testimonial_limit)
    except Exception:  # noqa: BLE001
        testimonials = []

    return {
        "user_count": user_count,
        "review_count": rated,
        "review_average": round(weighted / rated, 1) if rated else None,
        "testimonials": testimonials,
    }
