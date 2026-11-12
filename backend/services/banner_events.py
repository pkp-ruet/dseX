"""What readers do with the Premium banner (2026-11-13).

The homepage's Premium banner for free readers (`PremiumBanner.tsx`) reports
each view and tap here (`POST /api/user/premium/banner`). One row per reader,
banner, action and Dhaka day in ``banner_events``; a repeat the same day only
adds to ``count``. Rows expire after 180 days.

Admin analytics reads one summary over the last 30 days (``summary``): how
many readers saw it and on how many days, how many tapped each button, and
how many sent a payment after seeing it / after tapping "Get Premium" (pending
or accepted, any plan; the yearly plan counted apart). Pure helpers
(``row_key``, ``banner_figures``) are tested in
``backend/tests/test_banner_events.py``.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

BANNERS = ("home",)
# view = the banner was on screen (once per page load); pay = "Get Premium";
# more = "See everything in Premium"; later = "Maybe later";
# never = "Not interested in Premium".
ACTIONS = ("view", "pay", "more", "later", "never")
TTL_SECONDS = 180 * 86_400
DHAKA = timezone(timedelta(hours=6))
COLLECTION = "banner_events"


def dhaka_day(now: datetime) -> str:
    return now.astimezone(DHAKA).date().isoformat()


def row_key(user_id: str, banner: str, action: str, now: datetime) -> dict:
    """The upsert key: one row per reader, banner, action and Dhaka day."""
    if banner not in BANNERS:
        raise ValueError("bad_banner")
    if action not in ACTIONS:
        raise ValueError("bad_action")
    return {"user_id": user_id, "banner": banner, "action": action, "day": dhaka_day(now)}


def record(db, user_id: str, banner: str, action: str, now: datetime | None = None) -> None:
    now = now or datetime.now(timezone.utc)
    db[COLLECTION].update_one(
        row_key(user_id, banner, action, now),
        {"$inc": {"count": 1}, "$set": {"last_at": now}, "$setOnInsert": {"first_at": now}},
        upsert=True,
    )


def ensure_indexes(db) -> None:
    col = db[COLLECTION]
    col.create_index([("user_id", 1), ("banner", 1), ("action", 1), ("day", 1)],
                     unique=True, name="reader_action_day")
    col.create_index([("banner", 1), ("first_at", -1)], name="banner_recent")
    col.create_index("first_at", expireAfterSeconds=TTL_SECONDS, name="first_at_ttl_180d")


def _first(action: str) -> dict:
    return {"$min": {"$cond": [{"$eq": ["$action", action]}, "$first_at", None]}}


def _did(action: str) -> dict:
    return {"$max": {"$cond": [{"$eq": ["$action", action]}, 1, 0]}}


def summary_pipeline(banner: str, start: datetime, admins: list[str]) -> list[dict]:
    """Everything counted in Mongo; one small document comes back."""
    paid_after = lambda field, plan=None: {  # noqa: E731
        "$size": {"$filter": {
            "input": "$pays", "as": "p",
            "cond": {"$and": [
                {"$ne": [f"${field}", None]},
                {"$gte": ["$$p.created_at", f"${field}"]},
                *([{"$eq": ["$$p.plan", plan]}] if plan else []),
            ]},
        }},
    }
    return [
        {"$match": {"banner": banner, "first_at": {"$gte": start}, "user_id": {"$nin": admins}}},
        {"$group": {
            "_id": "$user_id",
            "view_days": {"$sum": {"$cond": [{"$eq": ["$action", "view"]}, 1, 0]}},
            "views": {"$sum": {"$cond": [{"$eq": ["$action", "view"]}, "$count", 0]}},
            "first_view": _first("view"),
            "first_pay": _first("pay"),
            "first_any": {"$min": "$first_at"},
            "pay": _did("pay"), "more": _did("more"), "later": _did("later"), "never": _did("never"),
        }},
        {"$lookup": {
            "from": "payments",
            "let": {"uid": "$_id", "since": "$first_any"},
            "pipeline": [
                {"$match": {"$expr": {"$and": [
                    {"$eq": ["$user_id", "$$uid"]},
                    {"$gte": ["$created_at", "$$since"]},
                    {"$in": ["$status", ["pending", "accepted"]]},
                ]}}},
                {"$project": {"_id": 0, "created_at": 1, "plan": 1}},
            ],
            "as": "pays",
        }},
        {"$group": {
            "_id": None,
            "readers": {"$sum": 1},
            "seen": {"$sum": {"$cond": [{"$gt": ["$view_days", 0]}, 1, 0]}},
            "view_days": {"$sum": "$view_days"},
            "views": {"$sum": "$views"},
            "pay": {"$sum": "$pay"},
            "more": {"$sum": "$more"},
            "later": {"$sum": "$later"},
            "never": {"$sum": "$never"},
            "paid_after_view": {"$sum": {"$cond": [{"$gt": [paid_after("first_view"), 0]}, 1, 0]}},
            "paid_after_tap": {"$sum": {"$cond": [{"$gt": [paid_after("first_pay"), 0]}, 1, 0]}},
            "paid_year_after_view": {"$sum": {"$cond": [
                {"$gt": [paid_after("first_view", "yearly"), 0]}, 1, 0]}},
        }},
    ]


def _pct(part: int, whole: int) -> float:
    return round(part * 100 / whole, 1) if whole else 0.0


def banner_figures(doc: dict | None, days: int) -> dict:
    """The summary document → what the admin page shows (counts are readers;
    percentages are of the readers who saw the banner)."""
    d = doc or {}
    seen = int(d.get("seen") or 0)
    view_days = int(d.get("view_days") or 0)
    out = {"days": days, "seen": seen, "views": int(d.get("views") or 0),
           "avg_days": round(view_days / seen, 1) if seen else 0.0}
    for key in ("pay", "more", "later", "never", "paid_after_view", "paid_after_tap", "paid_year_after_view"):
        v = int(d.get(key) or 0)
        out[key] = v
        out[f"{key}_pct"] = _pct(v, seen)
    pay = out["pay"]
    out["paid_after_tap_of_taps_pct"] = _pct(out["paid_after_tap"], pay)
    return out


def summary(db, banner: str, start: datetime, admins: list[str], days: int) -> dict:
    doc = next(db[COLLECTION].aggregate(summary_pipeline(banner, start, admins)), None)
    return banner_figures(doc, days)
