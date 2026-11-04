from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user
from backend.services.db_service import get_db, load_companies
from backend.services.daily_pick_service import admin_get_state, refresh_slot
from backend.services import score_adjustments_service
from backend.services import daily_tips_service
from backend.services import usage_analytics_service
from backend.services.scoring_service import build_scores_df

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/analytics")
def get_analytics(days: int = 30, fresh: bool = False, _: dict = Depends(get_current_admin_user)):
    """The whole admin analytics page in one response: everyone, Premium and
    Free side by side — how much each group uses the site, what it opens, what
    it has set up, revenue and renewals, and the earlier overview panels.
    `days` = the behaviour window (7, 30 or 90 Dhaka days). Admin accounts and
    /admin pages are left out. See `usage_analytics_service`."""
    return usage_analytics_service.build(days, fresh=fresh)


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


# ---------------------------------------------------------------------------
# Premium (v1: no billing — the free month, plus manual grants for support)
# ---------------------------------------------------------------------------

class PremiumGrantBody(BaseModel):
    email: str
    days: int = Field(..., ge=0, le=3650)  # 0 = revoke now


@router.post("/premium")
def grant_premium_endpoint(body: PremiumGrantBody, _: dict = Depends(get_current_admin_user)):
    from backend.services.auth_service import normalize_email
    from backend.services.entitlements import grant_premium

    doc = get_db()["users"].find_one({"email": normalize_email(body.email)}, {"user_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    until = grant_premium(doc["user_id"], body.days)
    return {"user_id": doc["user_id"], "premium_until": until.isoformat() if until else None}


# ---------------------------------------------------------------------------
# Payments (bKash / Nagad / bank — Premium starts on submit, checked here afterwards)
# ---------------------------------------------------------------------------

class RevokePaymentBody(BaseModel):
    reason: str = Field("", max_length=200)


class OfferSwitchBody(BaseModel):
    open: bool


@router.get("/offer")
def admin_offer(_: dict = Depends(get_current_admin_user)):
    """The ৳99 offer: on / off, last change, payments taken on it."""
    from backend.services import payments

    return payments.offer_admin_state()


@router.post("/offer")
def admin_set_offer(body: OfferSwitchBody, admin: dict = Depends(get_current_admin_user)):
    """Start or end the ৳99 offer for everyone."""
    from backend.services import payments

    return payments.set_offer_open(body.open, admin.get("email") or "")


@router.get("/payments")
def admin_payments(status: str = "pending", _: dict = Depends(get_current_admin_user)):
    from backend.services import payments

    return payments.admin_list(None if status == "all" else status)


@router.post("/payments/{payment_id}/accept")
def admin_accept_payment(payment_id: str, admin: dict = Depends(get_current_admin_user)):
    from backend.services import payments

    doc = payments.accept(payment_id, admin.get("email") or "")
    if not doc:
        raise HTTPException(status_code=409, detail="not_pending")
    return {"ok": True, "id": payment_id, "status": "accepted"}


class ChangePlanBody(BaseModel):
    plan: str = Field(..., max_length=20)


@router.post("/payments/{payment_id}/plan")
def admin_change_payment_plan(
    payment_id: str, body: ChangePlanBody, admin: dict = Depends(get_current_admin_user)
):
    """Correct the plan (and so the amount + days) of a pending / accepted payment."""
    from backend.services import payments

    try:
        doc = payments.change_plan(payment_id, body.plan, admin.get("email") or "")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if not doc:
        raise HTTPException(status_code=409, detail="already_revoked")
    return {"ok": True, "id": payment_id, "plan": doc["plan"],
            "amount": doc["amount"], "days": doc["days"]}


@router.post("/payments/{payment_id}/revoke")
def admin_revoke_payment(
    payment_id: str, body: RevokePaymentBody, admin: dict = Depends(get_current_admin_user)
):
    from backend.services import payments

    doc = payments.revoke(payment_id, admin.get("email") or "", body.reason)
    if not doc:
        raise HTTPException(status_code=409, detail="already_revoked")
    return {"ok": True, "id": payment_id, "status": "revoked"}


# ---------------------------------------------------------------------------
# Manual subscriptions (cash, a transfer the reader never submitted, a gift)
# ---------------------------------------------------------------------------

@router.get("/users/search")
def admin_search_users(q: str = "", _: dict = Depends(get_current_admin_user)):
    """Accounts by email, phone or name, with their Premium state."""
    from backend.services import payments

    return {"items": payments.admin_search_users(q)}


class ManualPaymentBody(BaseModel):
    user_id: str = Field(..., max_length=64)
    plan: str = Field(..., max_length=20)  # a PAID_PLANS key or "custom"
    days: Optional[int] = Field(None, ge=1, le=3650)
    amount: Optional[int] = Field(None, ge=0, le=100_000)
    method: str = Field("cash", max_length=10)
    sender: str = Field("", max_length=20)
    note: str = Field("", max_length=200)


@router.post("/payments/manual")
def admin_manual_payment(body: ManualPaymentBody, admin: dict = Depends(get_current_admin_user)):
    """Give an account Premium and record the taka as an accepted payment, so
    it counts in the month's total and can be revoked like any other."""
    from backend.services import payments

    try:
        doc = payments.manual_payment(
            body.user_id, body.plan, body.days, body.amount, body.method,
            body.sender, body.note, admin.get("email") or "",
        )
    except ValueError as exc:
        code = str(exc)
        raise HTTPException(status_code=404 if code == payments.ERR_USER else 422, detail=code)
    return {"ok": True, "id": doc["payment_id"], "plan": doc["plan"], "amount": doc["amount"],
            "days": doc["days"], "premium_until": doc["premium_until_after"].isoformat()}
