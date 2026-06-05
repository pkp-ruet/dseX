import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from backend.routers.auth import get_current_user
from backend.services.auth_service import get_db
from backend.services import user_cache
from backend.services import portfolio_service

router = APIRouter(prefix="/api/user/portfolio", tags=["portfolio"])


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #


class TransactionBody(BaseModel):
    trading_code: str
    side: str = "buy"
    price: float
    qty: int
    fee: float = 0.0
    date: Optional[str] = None  # ISO date (YYYY-MM-DD); defaults to today

    @field_validator("trading_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("side")
    @classmethod
    def valid_side(cls, v: str) -> str:
        s = (v or "").strip().lower()
        if s not in ("buy", "sell"):
            raise ValueError("side must be 'buy' or 'sell'")
        return s

    @field_validator("price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("price must be positive")
        return v

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("qty must be positive")
        return v

    @field_validator("fee")
    @classmethod
    def nonneg_fee(cls, v: float) -> float:
        if v < 0:
            raise ValueError("fee cannot be negative")
        return v


class UpdateTransactionBody(BaseModel):
    side: Optional[str] = None
    price: Optional[float] = None
    qty: Optional[int] = None
    fee: Optional[float] = None
    date: Optional[str] = None

    @field_validator("side")
    @classmethod
    def valid_side(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        s = v.strip().lower()
        if s not in ("buy", "sell"):
            raise ValueError("side must be 'buy' or 'sell'")
        return s

    @field_validator("price")
    @classmethod
    def positive_price(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("price must be positive")
        return v

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v <= 0:
            raise ValueError("qty must be positive")
        return v

    @field_validator("fee")
    @classmethod
    def nonneg_fee(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("fee cannot be negative")
        return v


# Legacy holding bodies — kept so the old /holdings shims still validate.
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


# --------------------------------------------------------------------------- #
# Storage helpers
# --------------------------------------------------------------------------- #


def _load_transactions(user_id: str) -> list[dict]:
    """Return the user's transaction ledger, lazily seeding it from any legacy
    `portfolio` array the first time (idempotent — only runs when transactions
    is absent)."""
    cached = user_cache.get(user_cache.NS_TRANSACTIONS, user_id)
    if cached is not None:
        return cached
    doc = get_db()["users"].find_one(
        {"user_id": user_id}, {"portfolio": 1, "transactions": 1}
    )
    txns = doc.get("transactions") if doc else None
    if txns is None:
        legacy = (doc.get("portfolio") if doc else None) or []
        txns = portfolio_service.seed_transactions_from_holdings(legacy)
        if txns:
            holdings = portfolio_service.derive_holdings(txns)
            get_db()["users"].update_one(
                {"user_id": user_id},
                {"$set": {"transactions": txns, "portfolio": holdings}},
            )
            user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    user_cache.set(user_cache.NS_TRANSACTIONS, user_id, txns)
    return txns


def _persist(user_id: str, txns: list[dict]) -> list[dict]:
    """Validate, derive the holdings cache, write both arrays, refresh caches."""
    err = portfolio_service.first_oversell(txns)
    if err:
        raise HTTPException(status_code=400, detail=err)
    holdings = portfolio_service.derive_holdings(txns)
    get_db()["users"].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "transactions": txns,
                "portfolio": holdings,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    user_cache.set(user_cache.NS_TRANSACTIONS, user_id, txns)
    user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    return holdings


def _snapshot(txns: list[dict]) -> dict:
    return {
        "holdings": portfolio_service.derive_holdings(txns),
        "transactions": portfolio_service.sort_transactions(txns),
        "realized": portfolio_service.compute_realized(txns),
    }


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #


@router.get("")
def get_portfolio(current_user: dict = Depends(get_current_user)):
    txns = _load_transactions(current_user["user_id"])
    return _snapshot(txns)


# --------------------------------------------------------------------------- #
# Transactions CRUD (source of truth)
# --------------------------------------------------------------------------- #


@router.post("/transactions", status_code=201)
def add_transaction(body: TransactionBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    txns = list(_load_transactions(user_id))
    now = datetime.now(timezone.utc)
    txn = {
        "id": str(uuid.uuid4()),
        "trading_code": body.trading_code,
        "side": body.side,
        "price": body.price,
        "qty": body.qty,
        "fee": body.fee,
        "date": (body.date or now.date().isoformat())[:10],
        "created_at": now.isoformat(),
    }
    txns.append(txn)
    _persist(user_id, txns)
    snap = _snapshot(txns)
    return {"transaction": txn, **snap}


@router.put("/transactions/{txn_id}")
def update_transaction(
    txn_id: str,
    body: UpdateTransactionBody,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    txns = list(_load_transactions(user_id))
    idx = next((i for i, t in enumerate(txns) if t.get("id") == txn_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    txn = dict(txns[idx])
    if body.side is not None:
        txn["side"] = body.side
    if body.price is not None:
        txn["price"] = body.price
    if body.qty is not None:
        txn["qty"] = body.qty
    if body.fee is not None:
        txn["fee"] = body.fee
    if body.date is not None:
        txn["date"] = body.date[:10]
    txns[idx] = txn
    _persist(user_id, txns)
    snap = _snapshot(txns)
    return {"transaction": txn, **snap}


@router.delete("/transactions/{txn_id}")
def delete_transaction(txn_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    txns = list(_load_transactions(user_id))
    updated = [t for t in txns if t.get("id") != txn_id]
    if len(updated) == len(txns):
        raise HTTPException(status_code=404, detail="Transaction not found")
    _persist(user_id, updated)
    return _snapshot(updated)


# --------------------------------------------------------------------------- #
# Legacy /holdings shims — translate to transactions so any older client (or a
# stale cached bundle) keeps working. id == trading_code in the derived view.
# --------------------------------------------------------------------------- #


@router.post("/holdings", status_code=201)
def add_holding(body: AddHoldingBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    txns = list(_load_transactions(user_id))
    now = datetime.now(timezone.utc)
    txns.append(
        {
            "id": str(uuid.uuid4()),
            "trading_code": body.trading_code,
            "side": "buy",
            "price": body.buy_price,
            "qty": body.qty,
            "fee": 0.0,
            "date": now.date().isoformat(),
            "created_at": now.isoformat(),
        }
    )
    holdings = _persist(user_id, txns)
    holding = next((h for h in holdings if h["trading_code"] == body.trading_code), None)
    return {"holding": holding}


@router.put("/holdings/{holding_id}")
def update_holding(
    holding_id: str,
    body: UpdateHoldingBody,
    current_user: dict = Depends(get_current_user),
):
    """Set-position semantics: replace all lots for the code with one buy."""
    user_id = current_user["user_id"]
    code = holding_id.upper()
    txns = list(_load_transactions(user_id))
    holdings = portfolio_service.derive_holdings(txns)
    current = next((h for h in holdings if h["trading_code"] == code), None)
    if current is None:
        raise HTTPException(status_code=404, detail="Holding not found")
    price = body.buy_price if body.buy_price is not None else current["buy_price"]
    qty = body.qty if body.qty is not None else current["qty"]
    now = datetime.now(timezone.utc)
    rest = [t for t in txns if (t.get("trading_code") or "").upper() != code]
    rest.append(
        {
            "id": str(uuid.uuid4()),
            "trading_code": code,
            "side": "buy",
            "price": price,
            "qty": qty,
            "fee": 0.0,
            "date": (current.get("added_at") or now.date().isoformat())[:10],
            "created_at": now.isoformat(),
        }
    )
    new_holdings = _persist(user_id, rest)
    holding = next((h for h in new_holdings if h["trading_code"] == code), None)
    return {"holding": holding}


@router.delete("/holdings/{holding_id}", status_code=204)
def delete_holding(holding_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    code = holding_id.upper()
    txns = list(_load_transactions(user_id))
    updated = [t for t in txns if (t.get("trading_code") or "").upper() != code]
    if len(updated) == len(txns):
        raise HTTPException(status_code=404, detail="Holding not found")
    _persist(user_id, updated)
