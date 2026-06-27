from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from backend.routers.auth import get_current_user
from backend.services import price_alert_service

router = APIRouter(prefix="/api/user/alerts", tags=["price-alerts"])


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #


class CreateAlertBody(BaseModel):
    trading_code: str
    target_price: float

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
    target_price: float

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


@router.post("", status_code=201)
def create_alert(body: CreateAlertBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    alert = price_alert_service.create_alert(user_id, body.trading_code, body.target_price)
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
    alert = price_alert_service.rearm_alert(user_id, alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alert": alert, "alerts": price_alert_service.list_alerts(user_id)}


@router.delete("/{alert_id}")
def delete_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    if not price_alert_service.delete_alert(user_id, alert_id):
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"alerts": price_alert_service.list_alerts(user_id)}
