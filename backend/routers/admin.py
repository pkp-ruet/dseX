from collections import Counter
from datetime import date, datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db, load_companies
from backend.services.daily_pick_service import admin_get_state, refresh_slot
from backend.services import score_adjustments_service
from backend.services import daily_tips_service
from backend.services.scoring_service import build_scores_df

router = APIRouter(prefix="/api/admin", tags=["admin"])


_BDT = timezone(timedelta(hours=6))


# Route → human section. Ordered; first regex match wins (home before the
# generic prefixes, `/stock/` before `/stocks`). Used by the analytics
# aggregations to bucket raw page-view paths into product areas.
_CATEGORY_BRANCHES = [
    (r"^/(\?|$)", "Home"),
    (r"^/stock/", "Stock detail"),
    (r"^/dsestockranking", "Rankings"),
    (r"^/stocks", "Browse stocks"),
    (r"^/(market-analysis|market-intelligence|dse-today|market)", "Market"),
    (r"^/watchlist", "Watchlist"),
    (r"^/portfolio", "Portfolio"),
    (r"^/(learn|blog)", "Learn & Blog"),
    (r"^/stock-insights", "Insights"),
    (r"^/(profile|login|register)", "Account"),
    (r"^/admin", "Admin"),
]


def _category_switch():
    """A Mongo `$switch` expression that maps `$path` → section label."""
    return {
        "$switch": {
            "branches": [
                {"case": {"$regexMatch": {"input": "$path", "regex": rx}}, "then": label}
                for rx, label in _CATEGORY_BRANCHES
            ],
            "default": "Other",
        }
    }


def _bdt_day(field: str) -> dict:
    """Mongo expression: a stored datetime as its Dhaka calendar day string."""
    return {"$dateToString": {"format": "%Y-%m-%d", "date": field,
                              "timezone": "Asia/Dhaka", "onNull": None}}


def _non_empty(field: str) -> dict:
    return {"$gt": [{"$size": {"$ifNull": [field, []]}}, 0]}


def _segment(age_created: int | None, age_seen: int | None) -> str:
    """new > active > at_risk > dormant, by days since signup / last visit."""
    if age_created is not None and age_created < 7:
        return "new"
    if age_seen is not None:
        if age_seen < 7:
            return "active"
        if age_seen < 30:
            return "at_risk"
    return "dormant"


def _top_codes(col, array_field: str, limit: int = 10) -> list[dict]:
    """Most common codes in a per-user array, counted once per user."""
    try:
        rows = col.aggregate([
            {"$project": {"_id": 0, "c": {"$setUnion": [{"$ifNull": [array_field, []]}, []]}}},
            {"$unwind": "$c"},
            {"$match": {"c": {"$type": "string", "$ne": ""}}},
            {"$group": {"_id": {"$toUpper": "$c"}, "users": {"$sum": 1}}},
            {"$sort": {"users": -1}},
            {"$limit": limit},
        ])
        return [{"code": r["_id"], "users": r["users"]} for r in rows]
    except Exception:  # noqa: BLE001 — best-effort panel
        return []


@router.get("/analytics")
def get_analytics(_: dict = Depends(get_current_admin_user)):
    """The whole admin analytics page in one response: headline numbers, daily
    growth, retention, the activation funnel, what users open and look at, and
    when they are online. Aggregates only — no per-user rows. All calendar
    days are Dhaka days."""
    db = get_db()
    events = db["user_events"]
    now = datetime.now(timezone.utc)
    today = now.astimezone(_BDT).date()
    today_start = datetime.combine(today, datetime.min.time(), _BDT).astimezone(timezone.utc)
    thirty_ago = now - timedelta(days=30)
    ninety_ago = now - timedelta(days=90)

    def _agg(pipeline):
        try:
            return list(events.aggregate(pipeline))
        except Exception:  # noqa: BLE001 — every panel is best-effort
            return []

    def _distinct_active(since) -> int:
        try:
            return len(events.distinct("user_id", {"ts": {"$gte": since}}))
        except Exception:  # noqa: BLE001
            return 0

    try:
        alert_user_ids = db["price_alerts"].distinct("user_id")
    except Exception:  # noqa: BLE001 — price_alerts may be empty/absent
        alert_user_ids = []

    # One compact row per user, built in Mongo. Reading whole user documents
    # (~8 MB, mostly `daily_picks` + `last_recommendation`) is what made this
    # endpoint take 80+ seconds.
    users = list(db["users"].aggregate([
        {"$project": {
            "_id": 0,
            "created": _bdt_day("$created_at"),
            "seen": _bdt_day("$last_seen_at"),
            "google": {"$eq": ["$oauth_provider", "google"]},
            "wl": _non_empty("$watchlist"),
            "pf": _non_empty("$portfolio"),
            "push": {"$toBool": {"$ifNull": ["$push_enabled", False]}},
            "installed": {"$gt": ["$app_installed_at", None]},
            "ai": {"$or": [{"$gt": [{"$ifNull": ["$ai_query_count", 0]}, 0]},
                           {"$gt": ["$ai_last_used_at", None]}]},
            "alert": {"$in": ["$user_id", alert_user_ids]},
        }},
    ]))

    def _day(v):
        try:
            return date.fromisoformat(v) if v else None
        except ValueError:
            return None

    segments = Counter()
    signups_by_day = Counter()
    google = 0
    new_today = new_7d = new_30d = 0
    returned = built_wl = added_pf = power = 0
    push = installed = ai = 0
    retention = {n: [0, 0] for n in (1, 7, 30)}  # n -> [eligible, retained]

    for u in users:
        created, seen = _day(u.get("created")), _day(u.get("seen"))
        age = (today - created).days if created else None
        segments[_segment(age, (today - seen).days if seen else None)] += 1
        google += bool(u.get("google"))

        if created:
            signups_by_day[created] += 1
            new_today += age == 0
            new_7d += age < 7
            new_30d += age < 30
            # last_seen_at is the latest visit, so "came back N+ days after
            # signing up" is just last-seen day >= signup day + N.
            for n, cell in retention.items():
                if age >= n:
                    cell[0] += 1
                    if seen and seen >= created + timedelta(days=n):
                        cell[1] += 1
            if seen and seen > created:
                returned += 1

        built_wl += bool(u.get("wl"))
        added_pf += bool(u.get("pf"))
        push += bool(u.get("push"))
        installed += bool(u.get("installed"))
        ai += bool(u.get("ai"))
        if u.get("push") or u.get("installed") or u.get("ai") or u.get("alert"):
            power += 1

    total = len(users)

    # --- Active users ---
    dau = _distinct_active(today_start)
    wau = _distinct_active(now - timedelta(days=7))
    mau = _distinct_active(thirty_ago)

    active_by_day = {
        row["_id"]: row["users"]
        for row in _agg([
            {"$match": {"ts": {"$gte": ninety_ago}}},
            {"$group": {"_id": {
                "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts", "timezone": "Asia/Dhaka"}},
                "u": "$user_id",
            }}},
            {"$group": {"_id": "$_id.d", "users": {"$sum": 1}}},
        ])
    }
    growth = []
    for i in range(89, -1, -1):
        day = today - timedelta(days=i)
        growth.append({
            "date": day.isoformat(),
            "signups": signups_by_day.get(day, 0),
            "active": active_by_day.get(day.isoformat(), 0),
        })

    # --- What they open (last 30 days) ---
    sections = _agg([
        {"$match": {"ts": {"$gte": thirty_ago}, "path": {"$not": {"$regex": "^/admin"}}}},
        {"$addFields": {"cat": _category_switch()}},
        {"$group": {"_id": "$cat", "views": {"$sum": "$count"},
                    "users": {"$addToSet": "$user_id"}}},
        {"$project": {"_id": 0, "category": "$_id", "views": 1,
                      "users": {"$size": "$users"}}},
        {"$sort": {"views": -1}},
    ])

    viewed = _agg([
        {"$match": {"ts": {"$gte": thirty_ago}, "path": {"$regex": "^/stock/"}}},
        {"$addFields": {"code": {"$toUpper": {"$arrayElemAt": [
            {"$split": [{"$arrayElemAt": [{"$split": ["$path", "?"]}, 0]}, "/"]}, 2]}}}},
        {"$group": {"_id": "$code", "views": {"$sum": "$count"},
                    "users": {"$addToSet": "$user_id"}}},
        {"$project": {"_id": 0, "code": "$_id", "views": 1,
                      "users": {"$size": "$users"}}},
        {"$sort": {"views": -1}},
        {"$limit": 11},
    ])
    viewed = [v for v in viewed if v.get("code")][:10]

    # Push / email deep links carry `?src=<channel>`.
    notifications = _agg([
        {"$match": {"ts": {"$gte": thirty_ago}, "path": {"$regex": "src="}}},
        {"$addFields": {"m": {"$regexFind": {"input": "$path", "regex": "src=([^&]+)"}}}},
        {"$addFields": {"src": {"$arrayElemAt": ["$m.captures", 0]}}},
        {"$match": {"src": {"$ne": None}}},
        {"$group": {"_id": "$src", "views": {"$sum": "$count"},
                    "users": {"$addToSet": "$user_id"}}},
        {"$project": {"_id": 0, "src": "$_id", "views": 1,
                      "users": {"$size": "$users"}}},
        {"$sort": {"views": -1}},
        {"$limit": 8},
    ])

    # --- When they are online (weekday 0=Sun..6=Sat × hour, Dhaka) ---
    matrix = [[0] * 24 for _ in range(7)]
    for row in _agg([
        {"$match": {"ts": {"$gte": thirty_ago}}},
        {"$group": {"_id": {
            "dow": {"$dayOfWeek": {"date": "$ts", "timezone": "Asia/Dhaka"}},
            "h": {"$hour": {"date": "$ts", "timezone": "Asia/Dhaka"}},
        }, "views": {"$sum": "$count"}}},
    ]):
        dow, h = int(row["_id"]["dow"]) - 1, int(row["_id"]["h"])
        if 0 <= dow < 7 and 0 <= h < 24:
            matrix[dow][h] = row["views"]

    return {
        "generated_at": now.isoformat(),
        "headline": {
            "total_users": total,
            "new_today": new_today,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "stickiness": round(dau / mau * 100, 1) if mau else 0.0,
        },
        "growth": growth,
        "retention": {
            f"d{n}": {
                "eligible": e,
                "retained": r,
                "pct": round(r / e * 100, 1) if e else 0.0,
            }
            for n, (e, r) in retention.items()
        },
        "segments": {k: segments.get(k, 0) for k in ("new", "active", "at_risk", "dormant")},
        "activation": {
            "signed_up": total,
            "returned": returned,
            "built_watchlist": built_wl,
            "added_portfolio": added_pf,
            "power_feature": power,
        },
        "features": {
            "push": push,
            "installed": installed,
            "alerts": len(alert_user_ids),
            "ai": ai,
        },
        "sections": sections,
        "stocks": {
            "viewed": viewed,
            "watched": _top_codes(db["users"], "$watchlist"),
            "held": _top_codes(db["users"], "$portfolio.trading_code"),
        },
        "active_hours": {"matrix": matrix, "max": max(max(r) for r in matrix)},
        "signup_source": {"google": google, "password": total - google},
        "notifications": notifications,
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


# ---------------------------------------------------------------------------
# Score Adjustments — admin can nudge any company's final score by a percentage
# ---------------------------------------------------------------------------

class ScoreAdjustmentRequest(BaseModel):
    trading_code: str = Field(..., min_length=1, max_length=20)
    pct: float = Field(..., ge=score_adjustments_service.PCT_MIN,
                       le=score_adjustments_service.PCT_MAX)
    reason: str | None = Field(None, max_length=500)


@router.get("/score-adjustments")
def admin_list_score_adjustments(_: dict = Depends(get_current_admin_user)):
    return {"adjustments": score_adjustments_service.list_adjustments()}


@router.get("/scores")
def admin_list_scores(_: dict = Depends(get_current_admin_user)):
    """Every scored company with base + adjusted score and any active adjustment.
    Used by /admin/scores. Sorted by adjusted score desc."""
    import math
    df = build_scores_df()
    companies = {c["trading_code"]: c for c in load_companies()}
    adjustments = {a["trading_code"]: a for a in score_adjustments_service.list_adjustments()}

    items: list[dict] = []
    if not df.empty:
        for _, row in df.iterrows():
            code = row["trading_code"]
            score = row.get("score")
            base = row.get("base_score")
            comp = companies.get(code, {})
            adj = adjustments.get(code)
            def f(v):
                if v is None: return None
                if isinstance(v, float) and (math.isnan(v) or math.isinf(v)): return None
                return v
            items.append({
                "trading_code":   code,
                "company_name":   comp.get("company_name"),
                "sector":         row.get("sector") or comp.get("sector"),
                "score":          f(score),
                "base_score":     f(base),
                "adjustment_pct": float(row.get("adjustment_pct") or 0.0),
                "reason":         (adj or {}).get("reason"),
                "updated_by":     (adj or {}).get("updated_by"),
                "updated_at":     (adj or {}).get("updated_at"),
            })
        items.sort(key=lambda x: (x["score"] is None, -(x["score"] or 0)))
    return {"items": items}


@router.post("/score-adjustment")
def admin_upsert_score_adjustment(
    payload: ScoreAdjustmentRequest,
    user: dict = Depends(get_current_admin_user),
):
    try:
        doc = score_adjustments_service.upsert_adjustment(
            trading_code=payload.trading_code,
            pct=payload.pct,
            reason=payload.reason,
            updated_by=user.get("email") or user.get("user_id"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"adjustment": doc}


@router.delete("/score-adjustment/{trading_code}")
def admin_delete_score_adjustment(
    trading_code: str,
    _: dict = Depends(get_current_admin_user),
):
    removed = score_adjustments_service.delete_adjustment(trading_code)
    if not removed:
        raise HTTPException(status_code=404, detail="No adjustment for that code")
    return {"deleted": True, "trading_code": trading_code.upper()}


# ---------------------------------------------------------------------------
# Daily Tips — admin can remove a tip's stock (and restore it later)
# ---------------------------------------------------------------------------

class ExcludeTipRequest(BaseModel):
    trading_code: str = Field(..., min_length=1, max_length=20)
    reason: str | None = Field(None, max_length=500)


@router.get("/daily-tips")
def admin_get_daily_tips(_: dict = Depends(get_current_admin_user)):
    """Current live tips + the exclusion list."""
    return daily_tips_service.admin_get_tips_state()


@router.post("/daily-tips/exclude")
def admin_exclude_tip(
    payload: ExcludeTipRequest,
    user: dict = Depends(get_current_admin_user),
):
    """Remove a stock from tips: blacklist it and regenerate today's list."""
    try:
        state = daily_tips_service.exclude_tip(
            trading_code=payload.trading_code,
            reason=payload.reason,
            updated_by=user.get("email") or user.get("user_id"),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return state


@router.delete("/daily-tips/exclude/{trading_code}")
def admin_restore_tip(
    trading_code: str,
    _: dict = Depends(get_current_admin_user),
):
    """Un-blacklist a stock so it can appear in tips again."""
    return daily_tips_service.restore_tip(trading_code)


# ---------------------------------------------------------------------------
# Feedback — user reviews (star rating + comment) from the homepage band + popup
# ---------------------------------------------------------------------------

@router.get("/feedback")
def admin_list_feedback(_: dict = Depends(get_current_admin_user)):
    """All feedback (newest first) + summary stats."""
    from backend.services.feedback_service import list_feedback, feedback_stats
    return {"stats": feedback_stats(), "items": list_feedback()}


class FeatureFeedbackRequest(BaseModel):
    featured: bool


@router.post("/feedback/{feedback_id}/feature")
def admin_feature_feedback(
    feedback_id: str,
    payload: FeatureFeedbackRequest,
    _: dict = Depends(get_current_admin_user),
):
    """Approve (or un-approve) one review for public display on the landing page.
    Nothing a user writes appears publicly until it is featured here."""
    from backend.services.feedback_service import set_featured, public_trust_stats
    if not set_featured(feedback_id, payload.featured):
        raise HTTPException(status_code=404, detail="Feedback not found")
    # The public block is TTL-cached; drop it so moderation takes effect at once.
    public_trust_stats.cache_clear()
    return {"ok": True, "id": feedback_id, "featured": payload.featured}
