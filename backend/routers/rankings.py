"""
The rankings page's Premium parts (2026-10-31, the Premium Desk plan step 3).

Public reads like every other: the page hides the Premium parts from free
readers (screen-only). Rank alerts are Premium and checked server-side.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.routers.auth import get_current_user
from backend.services import rank_alerts
from backend.services.entitlements import is_premium
from backend.services.rank_history_service import company_ranks, week_movers
from backend.services.rank_today_service import rankings_today

router = APIRouter(tags=["rankings"])


@router.get("/api/rankings/history/{code}")
def rank_history(code: str):
    """One company's rank on every trading day of the last year ({d, r, n}),
    its best and worst, and today's signal with its reason."""
    if not code or len(code) > 20:
        raise HTTPException(status_code=404, detail="Unknown company")
    out = company_ranks(code)
    if out is None:
        raise HTTPException(status_code=404, detail="Unknown company")
    return out


@router.get("/api/rankings/today")
def rankings_today_route():
    """The ranking page's extras: serious warnings from each company's stock
    report, who moved to a better or lower group this week, and every
    company's rank on the first day of the history."""
    return rankings_today()


@router.get("/api/rankings/movers")
def rank_movers():
    """The week's biggest rank moves (≥5 places, up to 8 each way) with the
    reason in words, and how many companies changed grade."""
    return week_movers()


class RankAlertBody(BaseModel):
    code: str = Field(..., max_length=20)
    kind: str = Field(..., max_length=20)

    @field_validator("code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()


@router.get("/api/user/rank-alerts")
def get_rank_alerts(current_user: dict = Depends(get_current_user)):
    return {"alerts": rank_alerts.list_alerts(current_user)}


@router.post("/api/user/rank-alerts", status_code=201)
def add_rank_alert(body: RankAlertBody, current_user: dict = Depends(get_current_user)):
    if not is_premium(current_user):
        raise HTTPException(status_code=403, detail=rank_alerts.PREMIUM_REQUIRED)
    try:
        alerts = rank_alerts.add_alert(current_user, body.code, body.kind)
    except ValueError as e:
        if str(e) == "limit":
            raise HTTPException(status_code=403, detail=rank_alerts.LIMIT_RANK_ALERTS)
        raise HTTPException(status_code=400, detail=str(e))
    return {"alerts": alerts}


@router.delete("/api/user/rank-alerts/{alert_id}")
def delete_rank_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    if len(alert_id) > 40:
        raise HTTPException(status_code=404, detail="Unknown alert")
    return {"alerts": rank_alerts.remove_alert(current_user, alert_id)}
