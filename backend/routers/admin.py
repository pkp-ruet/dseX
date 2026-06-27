from collections import Counter
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db, load_companies
from backend.services.daily_pick_service import admin_get_state, refresh_slot
from backend.services import score_adjustments_service
from backend.services import daily_tips_service
from backend.services.scoring_service import build_scores_df

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _iso(v):
    return v.isoformat() if isinstance(v, datetime) else v


def _naive(dt):
    """Coerce a datetime to naive UTC for safe comparison with pymongo reads
    (the client is not tz_aware, so reads come back naive)."""
    if isinstance(dt, datetime) and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _engagement_segment(doc: dict, now: datetime) -> str:
    """new > active > at_risk > dormant (null last_seen → dormant unless new)."""
    now_n = _naive(now)
    created = _naive(doc.get("created_at"))
    seen = _naive(doc.get("last_seen_at"))
    if isinstance(created, datetime) and created >= now_n - timedelta(days=7):
        return "new"
    if isinstance(seen, datetime):
        age = now_n - seen
        if age < timedelta(days=7):
            return "active"
        if age < timedelta(days=30):
            return "at_risk"
    return "dormant"


def _serialize_user(doc: dict, now: datetime, alert_user_ids: set) -> dict:
    out = {}
    for field in (
        "user_id", "email", "phone", "display_name",
        "is_active", "created_at", "last_login_at",
        "last_seen_at", "total_visits", "watchlist_last_visit_at",
        "updated_at",
    ):
        out[field] = _iso(doc.get(field))
    out.setdefault("total_visits", 0)
    out.setdefault("last_seen_at", None)
    out.setdefault("email", None)
    out.setdefault("phone", None)
    watchlist = doc.get("watchlist") or []
    portfolio = doc.get("portfolio") or []
    out["watchlist_count"] = len(watchlist)
    out["portfolio_count"] = len(portfolio)
    out["has_portfolio"] = bool(portfolio)
    out["signup_source"] = "google" if doc.get("oauth_provider") == "google" else "password"
    out["email_verified"] = bool(doc.get("email_verified"))
    out["push_enabled"] = bool(doc.get("push_enabled"))
    out["app_installed"] = bool(doc.get("app_installed_at"))
    out["ai_used"] = bool(doc.get("ai_query_count") or doc.get("ai_last_used_at"))
    out["has_price_alert"] = doc.get("user_id") in alert_user_ids
    out["segment"] = _engagement_segment(doc, now)
    return out


@router.get("/analytics")
def get_analytics(_: dict = Depends(get_current_admin_user)):
    db = get_db()
    col = db["users"]
    now = datetime.now(timezone.utc)
    bdt = timezone(timedelta(hours=6))
    now_bdt = now.astimezone(bdt)
    today_bdt = now_bdt.replace(hour=0, minute=0, second=0, microsecond=0)
    today = today_bdt.astimezone(timezone.utc)
    week_start = today - timedelta(days=now_bdt.weekday())
    month_start = today_bdt.replace(day=1).astimezone(timezone.utc)
    seven_ago = now - timedelta(days=7)
    ninety_ago = now - timedelta(days=90)

    docs = list(
        col.find(
            {},
            {"password_hash": 0, "_id": 0},
        ).sort("created_at", -1)
    )
    # Distinct users who have set at least one price alert (active or recently
    # triggered). Drives the feature-reach count + the per-user badge.
    try:
        alert_user_ids = set(db["price_alerts"].distinct("user_id"))
    except Exception:  # noqa: BLE001 — price_alerts may be empty/absent
        alert_user_ids = set()
    rows = [_serialize_user(d, now, alert_user_ids) for d in docs]

    # --- Engagement segments (sum == total_users) ---
    seg = Counter(r["segment"] for r in rows)
    segments = {k: seg.get(k, 0) for k in ("new", "active", "at_risk", "dormant")}

    # --- Signup source split ---
    src = Counter(r["signup_source"] for r in rows)
    signup_source = {"google": src.get("google", 0), "password": src.get("password", 0)}

    # --- Feature adoption (sum == total_users) ---
    wl_only = pf_only = both = neither = 0
    push_count = install_count = ai_count = ai_messages = 0
    vb_1000 = vb_750 = vb_500 = vb_250 = vb_100 = visits_under_100 = 0
    install_platforms: Counter = Counter()
    watched: Counter = Counter()
    held_count: Counter = Counter()
    held_qty: Counter = Counter()
    for d in docs:
        wl = d.get("watchlist") or []
        pf = d.get("portfolio") or []
        if wl and pf:
            both += 1
        elif wl:
            wl_only += 1
        elif pf:
            pf_only += 1
        else:
            neither += 1
        # Power-feature adoption — independent flags (a user can have any combo).
        if d.get("push_enabled"):
            push_count += 1
        if d.get("app_installed_at"):
            install_count += 1
            install_platforms[(d.get("app_platform") or "other").lower()] += 1
        _qc = d.get("ai_query_count") or 0
        if _qc or d.get("ai_last_used_at"):
            ai_count += 1
            try:
                ai_messages += int(_qc)
            except (TypeError, ValueError):
                pass
        # Lifetime visit-count distribution (only the 100+ bands are charted).
        try:
            v = int(d.get("total_visits") or 0)
        except (TypeError, ValueError):
            v = 0
        if v >= 1000:
            vb_1000 += 1
        elif v >= 750:
            vb_750 += 1
        elif v >= 500:
            vb_500 += 1
        elif v >= 250:
            vb_250 += 1
        elif v >= 100:
            vb_100 += 1
        else:
            visits_under_100 += 1
        for code in wl:
            if isinstance(code, str) and code:
                watched[code.upper()] += 1
        for h in pf:
            code = (h.get("trading_code") or "").upper()
            if not code:
                continue
            held_count[code] += 1
            try:
                held_qty[code] += float(h.get("qty") or 0)
            except (TypeError, ValueError):
                pass
    adoption = {
        "watchlist_only": wl_only,
        "portfolio_only": pf_only,
        "both": both,
        "neither": neither,
    }
    popular_stocks = {
        "most_watched": [{"code": c, "count": n} for c, n in watched.most_common(15)],
        "most_held": [
            {"code": c, "count": n, "total_qty": held_qty.get(c, 0)}
            for c, n in held_count.most_common(15)
        ],
    }

    # --- Growth time-series (last 90 calendar days, ascending) ---
    now_n = _naive(now)
    today_date = now_n.date()
    date_keys = [today_date - timedelta(days=i) for i in range(89, -1, -1)]
    earliest = date_keys[0]
    signup_counts: Counter = Counter()
    for d in docs:
        c = _naive(d.get("created_at"))
        if isinstance(c, datetime) and c.date() >= earliest:
            signup_counts[c.date()] += 1
    # Accurate active-per-day from the page-view events (distinct users/day).
    active_counts: dict = {}
    try:
        agg = db["user_events"].aggregate([
            {"$match": {"ts": {"$gte": ninety_ago}}},
            {"$group": {"_id": {
                "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
                "user": "$user_id",
            }}},
            {"$group": {"_id": "$_id.date", "users": {"$sum": 1}}},
        ])
        active_counts = {row["_id"]: row["users"] for row in agg}
    except Exception:  # noqa: BLE001 — events curve is best-effort
        active_counts = {}
    growth = [
        {
            "date": dk.isoformat(),
            "signups": signup_counts.get(dk, 0),
            "active": active_counts.get(dk.isoformat(), 0),
        }
        for dk in date_keys
    ]

    # Secondary feature-reach stats (cheap counts; best-effort).
    try:
        active_alerts = db["price_alerts"].count_documents({"is_active": True})
    except Exception:  # noqa: BLE001 — price_alerts may be empty/absent
        active_alerts = 0
    try:
        push_devices = db["push_subscriptions"].count_documents({})
    except Exception:  # noqa: BLE001 — push_subscriptions may be empty/absent
        push_devices = 0

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
        "segments": segments,
        "adoption": adoption,
        "signup_source": signup_source,
        "feature_reach": {
            "total_users": len(docs),
            "push": {"users": push_count, "devices": push_devices},
            "install": {"users": install_count, "platforms": dict(install_platforms)},
            "alerts": {"users": len(alert_user_ids), "active": active_alerts},
            "ai": {"users": ai_count, "messages": ai_messages},
        },
        "visit_distribution": {
            "bands": [
                {"label": "1000+", "count": vb_1000},
                {"label": "750–999", "count": vb_750},
                {"label": "500–749", "count": vb_500},
                {"label": "250–499", "count": vb_250},
                {"label": "100–249", "count": vb_100},
            ],
            "under_100": visits_under_100,
            "total_users": len(docs),
        },
        "popular_stocks": popular_stocks,
        "growth": growth,
        "users": rows,
    }


@router.get("/users/{user_id}")
def admin_get_user(user_id: str, _: dict = Depends(get_current_admin_user)):
    """Full per-user drill-down: watchlist, portfolio, recent page views."""
    db = get_db()
    doc = db["users"].find_one({"user_id": user_id}, {"password_hash": 0, "_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    now = datetime.now(timezone.utc)

    events = list(
        db["user_events"]
        .find({"user_id": user_id}, {"_id": 0, "user_id": 0, "ts_bucket": 0})
        .sort("ts", -1)
        .limit(50)
    )
    for e in events:
        e["ts"] = _iso(e.get("ts"))

    portfolio = [
        {
            "id": h.get("id"),
            "trading_code": h.get("trading_code"),
            "buy_price": h.get("buy_price"),
            "qty": h.get("qty"),
            "added_at": _iso(h.get("added_at")),
        }
        for h in (doc.get("portfolio") or [])
    ]

    return {
        "user_id": doc.get("user_id"),
        "display_name": doc.get("display_name"),
        "email": doc.get("email"),
        "phone": doc.get("phone"),
        "signup_source": "google" if doc.get("oauth_provider") == "google" else "password",
        "email_verified": bool(doc.get("email_verified")),
        "created_at": _iso(doc.get("created_at")),
        "last_login_at": _iso(doc.get("last_login_at")),
        "last_seen_at": _iso(doc.get("last_seen_at")),
        "watchlist_last_visit_at": _iso(doc.get("watchlist_last_visit_at")),
        "total_visits": doc.get("total_visits", 0),
        "segment": _engagement_segment(doc, now),
        "watchlist": doc.get("watchlist") or [],
        "portfolio": portfolio,
        "recent_events": events,
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
