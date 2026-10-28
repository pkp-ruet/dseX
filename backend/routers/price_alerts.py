from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.routers.auth import get_current_user
from backend.services import price_alert_service
from backend.services.entitlements import HARD_LIMITS, LIMIT_ALERTS, limits_for

router = APIRouter(prefix="/api/user/alerts", tags=["price-alerts"])


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #


class CreateAlertBody(BaseModel):
    trading_code: str = Field(..., max_length=20)
    target_price: float = Field(..., allow_inf_nan=False, le=10_000_000)

    @field_validator("trading_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("target_price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_price must be positive")
        return v


class UpdateAlertBody(BaseModel):
    target_price: float = Field(..., allow_inf_nan=False, le=10_000_000)

    @field_validator("target_price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_price must be positive")
        return v


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.get("")
def get_alerts(current_user: dict = Depends(get_current_user)):
    return {"alerts": price_alert_service.list_alerts(current_user["user_id"])}


def _alert_limit(user: dict) -> int:
    """The plan's armed-alert cap; Premium (no plan cap) still stops at the
    hard ceiling every account has."""
    limit = limits_for(user)["alerts"]
    return HARD_LIMITS["alerts"] if limit is None else limit


@router.post("", status_code=201)
def create_alert(body: CreateAlertBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        alert = price_alert_service.create_alert(
            user_id, body.trading_code, body.target_price,
            limit=_alert_limit(current_user),
        )
    except price_alert_service.AlertLimitReached:
        raise HTTPException(status_code=403, detail=LIMIT_ALERTS)
    return {"alert": alert, "alerts": price_alert_service.list_alerts(user_id)}


@router.put("/{alert_id}")
def update_alert(
    alert_id: str,
    body: UpdateAlertBody,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    alert = price_alert_service.update_alert(user_id, alert_id, body.target_price)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": alert, "alerts": price_alert_service.list_alerts(user_id)}


@router.post("/{alert_id}/rearm")
def rearm_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    try:
        alert = price_alert_service.rearm_alert(
            user_id, alert_id, limit=_alert_limit(current_user),
        )
    except price_alert_service.AlertLimitReached:
        raise HTTPException(status_code=403, detail=LIMIT_ALERTS)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": alert, "alerts": price_alert_service.list_alerts(user_id)}


@router.delete("/{alert_id}")
def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    if not price_alert_service.delete_alert(user_id, alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alerts": price_alert_service.list_alerts(user_id)}
