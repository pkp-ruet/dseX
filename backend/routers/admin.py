from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db, load_companies
from backend.services.daily_pick_service import admin_get_state, refresh_slot
from backend.services import score_adjustments_service
from backend.services.scoring_service import build_scores_df

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
