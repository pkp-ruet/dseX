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


def _normalize(h: dict) -> dict:
    """Coerce a stored holding into the shape the frontend consumes."""
    code = (h.get("trading_code") or "").upper()
    return {
        "id": h.get("id") or code,
        "trading_code": code,
        "buy_price": round(float(h.get("buy_price") or 0), 4),
        "qty": int(h.get("qty") or 0),
        "added_at": portfolio_service._date_part(h.get("added_at")),
    }


def _matches(h: dict, holding_id: str) -> bool:
    """True when a stored holding is addressed by `holding_id`.

    Holdings written by this router use id == trading_code, but rows created by
    the original router carry a uuid id, which `_normalize` preserves and users'
    cached frontends still send. Accept the exact id or the trading code —
    codes never look like uuids, so the two can't collide."""
    hid = holding_id.strip()
    return h.get("id") == hid or (h.get("trading_code") or "").upper() == hid.upper()


def _load_holdings(user_id: str) -> list[dict]:
    """Return the user's holdings (one row per code).

    Migrates legacy state on first read: a `transactions` ledger is collapsed to
    net positions (FIFO) and discarded; an older `portfolio` array is normalized
    in place.
    """
    cached = user_cache.get(user_cache.NS_PORTFOLIO, user_id)
    if cached is not None:
        return cached

    doc = get_db()["users"].find_one(
        {"user_id": user_id}, {"portfolio": 1, "transactions": 1}
    )
    txns = doc.get("transactions") if doc else None
    if txns is not None:
        # Legacy ledger present → collapse to holdings, drop the ledger for good.
        # One-time per user (the $unset disarms it). Safe to delete this whole
        # branch once a backfill has migrated every user's `transactions` field.
        holdings = [_normalize(h) for h in portfolio_service.derive_holdings(txns)]
        get_db()["users"].update_one(
            {"user_id": user_id},
            {"$set": {"portfolio": holdings}, "$unset": {"transactions": ""}},
        )
        user_cache.invalidate(user_cache.NS_TRANSACTIONS, user_id)
    else:
        holdings = [_normalize(h) for h in ((doc.get("portfolio") if doc else None) or [])]

    user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    return holdings


def _persist(user_id: str, holdings: list[dict]) -> list[dict]:
    holdings = sorted(holdings, key=lambda h: (h.get("added_at") or "", h["trading_code"]))
    get_db()["users"].update_one(
        {"user_id": user_id},
        {"$set": {"portfolio": holdings, "updated_at": datetime.now(timezone.utc)}},
    )
    user_cache.set(user_cache.NS_PORTFOLIO, user_id, holdings)
    return holdings


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #


@router.get("")
def get_portfolio(current_user: dict = Depends(get_current_user)):
    """Holdings enriched with the personalized Buy More / Hold / Sell signal.

    Signals are computed server-side from the canonical signal service — the
    frontend renders them and never re-derives buy/sell advice. Mutation
    endpoints return bare holdings; the frontend refetches after edits."""
    from backend.services.db_service import load_latest_prices
    from backend.services.signal_service import build_signals, holding_signal

    holdings = _load_holdings(current_user["user_id"])
    try:
        prices = load_latest_prices()
        signals = build_signals()
    except Exception:  # noqa: BLE001 — signals are an enrichment, never a blocker
        prices, signals = {}, {}

    out = []
    for h in holdings:
        code = h["trading_code"]
        ltp = (prices.get(code) or {}).get("ltp")
        buy_price = h.get("buy_price") or 0
        pnl_pct = (
            (float(ltp) - buy_price) / buy_price * 100
            if ltp and buy_price > 0 else None
        )
        sig = signals.get(code)
        out.append({**h, "signal": holding_signal(sig, pnl_pct, (sig or {}).get("p4_val"))})
    return {"holdings": out}


@router.get("/signal-events")
def get_signal_events(current_user: dict = Depends(get_current_user)):
    """Recent Buy More / Hold / Sell flips on the user's holdings (in-app bell)."""
    from backend.services.portfolio_signal_service import list_recent_events

    return {"events": list_recent_events(current_user["user_id"])}


# --------------------------------------------------------------------------- #
# Holdings CRUD
# --------------------------------------------------------------------------- #


@router.post("/holdings", status_code=201)
def add_holding(body: AddHoldingBody, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    holdings = list(_load_holdings(user_id))
    code = body.trading_code
    existing = next((h for h in holdings if h["trading_code"] == code), None)
    if existing:
        # Merge: weighted-average cost across the combined quantity.
        new_qty = existing["qty"] + body.qty
        total_cost = existing["qty"] * existing["buy_price"] + body.qty * body.buy_price
        existing["buy_price"] = round(total_cost / new_qty, 4) if new_qty else 0
        existing["qty"] = new_qty
        holding = existing
    else:
        holding = {
            "id": code,
            "trading_code": code,
            "buy_price": round(body.buy_price, 4),
            "qty": body.qty,
            "added_at": datetime.now(timezone.utc).date().isoformat(),
        }
        holdings.append(holding)
    saved = _persist(user_id, holdings)
    return {"holding": holding, "holdings": saved}


@router.put("/holdings/{holding_id}")
def update_holding(
    holding_id: str,
    body: UpdateHoldingBody,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["user_id"]
    holdings = list(_load_holdings(user_id))
    holding = next((h for h in holdings if _matches(h, holding_id)), None)
    if holding is None:
        raise HTTPException(status_code=404, detail="Holding not found")
    if body.buy_price is not None:
        holding["buy_price"] = round(body.buy_price, 4)
    if body.qty is not None:
        holding["qty"] = body.qty
    saved = _persist(user_id, holdings)
    return {"holding": holding, "holdings": saved}


@router.delete("/holdings/{holding_id}")
def delete_holding(holding_id: str, current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    holdings = list(_load_holdings(user_id))
    updated = [h for h in holdings if not _matches(h, holding_id)]
    if len(updated) == len(holdings):
        raise HTTPException(status_code=404, detail="Holding not found")
    saved = _persist(user_id, updated)
    return {"holdings": saved}
