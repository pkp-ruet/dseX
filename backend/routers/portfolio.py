import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from backend.routers.auth import get_current_user
from backend.services.auth_service import get_db
from backend.services import user_cache

router = APIRouter(prefix="/api/user/portfolio", tags=["portfolio"])


class AddHoldingBody(BaseModel):
    trading_code: str
    buy_price: float
    qty: int

    @field_validator("trading_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("buy_price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("buy_price must be positive")
        return v

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("qty must be positive")
        return v


class UpdateHoldingBody(BaseModel):
    buy_price: Optional[float] = None
    qty: Optional[int] = None

    @field_validator("buy_price")
    @classmethod
    def positive_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("buy_price must be positive")
        return v

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("qty must be positive")
        return v


def _get_portfolio(user_id: str) -> list[dict]:
    cached = user_cache.get(user_cache.NS_PORTFOLIO, user_id)
    if cached is not None:
        return cached
    doc = get_db()["users"].find_one({"user_id": user_id}, {"portfolio": 1})
    holdings = doc.get("portfolio", []) if doc else []
    user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    return holdings


@router.get("")
def get_portfolio(current_user: dict = Depends(get_current_user)):
    holdings = _get_portfolio(current_user["user_id"])
    return {"holdings": holdings}


@router.post("/holdings", status_code=201)
def add_holding(body: AddHoldingBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    holding = {
        "id": str(uuid.uuid4()),
        "trading_code": body.trading_code,
        "buy_price": body.buy_price,
        "qty": body.qty,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    get_db()["users"].update_one(
        {"user_id": user_id},
        {
            "$push": {"portfolio": holding},
            "$set": {"updated_at": datetime.now(timezone.utc)},
        },
    )
    user_cache.invalidate(user_cache.NS_PORTFOLIO, user_id)
    return {"holding": holding}


@router.put("/holdings/{holding_id}")
def update_holding(
    holding_id: str,
    body: UpdateHoldingBody,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    # Read straight from DB — cached copy may be stale relative to a concurrent
    # write, and we're about to overwrite the whole array.
    doc = get_db()["users"].find_one({"user_id": user_id}, {"portfolio": 1})
    holdings = doc.get("portfolio", []) if doc else []
    idx = next((i for i, h in enumerate(holdings) if h["id"] == holding_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Holding not found")

    if body.buy_price is not None:
        holdings[idx]["buy_price"] = body.buy_price
    if body.qty is not None:
        holdings[idx]["qty"] = body.qty

    get_db()["users"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "portfolio": holdings,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    return {"holding": holdings[idx]}


@router.delete("/holdings/{holding_id}", status_code=204)
def delete_holding(
    holding_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    doc = get_db()["users"].find_one({"user_id": user_id}, {"portfolio": 1})
    holdings = doc.get("portfolio", []) if doc else []
    updated = [h for h in holdings if h["id"] != holding_id]
    if len(updated) == len(holdings):
        raise HTTPException(status_code=404, detail="Holding not found")

    get_db()["users"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "portfolio": updated,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    user_cache.set(user_cache.NS_PORTFOLIO, user_id, updated)
