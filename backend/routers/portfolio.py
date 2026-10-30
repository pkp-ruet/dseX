from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from backend.routers.auth import get_current_user
from backend.services import entitlements
from backend.services import portfolio_ledger as ledger
from backend.services import portfolio_store as store

router = APIRouter(prefix="/api/user/portfolio", tags=["portfolio"])

# Every endpoint takes `?pid=` — the main portfolio when absent. Extra
# portfolios are Premium: anyone can read their own, only a premium account can
# create one or change one (a lapsed trial keeps its numbers, read-only).


# --------------------------------------------------------------------------- #
# Request bodies
# --------------------------------------------------------------------------- #


def _positive(v, name):
    if v is not None and v <= 0:
        raise ValueError(f"{name} must be positive")
    return v


# Finite, bounded numbers: JSON accepts NaN / Infinity, and one stored NaN made
# that reader's portfolio and home bundle 500 (JSON can't encode it).
Price = Annotated[float, Field(allow_inf_nan=False, le=10_000_000)]
Qty = Annotated[int, Field(le=1_000_000_000)]


class AddHoldingBody(BaseModel):
    trading_code: str = Field(..., max_length=20)
    buy_price: Price
    qty: Qty

    @field_validator("trading_code")
    @classmethod
    def upper_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("buy_price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        return _positive(v, "buy_price")

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        return _positive(v, "qty")


class UpdateHoldingBody(BaseModel):
    buy_price: Optional[Price] = None
    qty: Optional[Qty] = None

    @field_validator("buy_price")
    @classmethod
    def positive_price(cls, v: Optional[float]) -> Optional[float]:
        return _positive(v, "buy_price")

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: Optional[int]) -> Optional[int]:
        return _positive(v, "qty")


class SellBody(BaseModel):
    qty: Qty
    price: Price

    @field_validator("qty")
    @classmethod
    def positive_qty(cls, v: int) -> int:
        return _positive(v, "qty")

    @field_validator("price")
    @classmethod
    def positive_price(cls, v: float) -> float:
        return _positive(v, "price")


class SettingsBody(BaseModel):
    fee_pct: Optional[float] = None
    div_tax_pct: Optional[float] = None


class PortfolioNameBody(BaseModel):
    name: str


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #


def _pid(pid: Optional[str]) -> str:
    return (pid or ledger.MAIN_PID).strip() or ledger.MAIN_PID


def _load(user: dict, pid: str) -> dict:
    try:
        return store.load(user["user_id"], pid)
    except KeyError:
        raise HTTPException(status_code=404, detail="Portfolio not found")


def _writable(user: dict, pid: str) -> None:
    if pid != ledger.MAIN_PID and not entitlements.is_premium(user):
        raise HTTPException(status_code=403, detail=store.LIMIT_PORTFOLIOS)


def _save(user: dict, pid: str, **kw) -> dict:
    try:
        return store.save(user["user_id"], pid, **kw)
    except KeyError:
        raise HTTPException(status_code=404, detail="Portfolio not found")


def _matches(h: dict, holding_id: str) -> bool:
    """True when a stored holding is addressed by `holding_id`.

    Holdings written by this router use id == trading_code, but rows created by
    the original router carry a uuid id, which `normalize_holding` preserves and
    users' cached frontends still send. Accept the exact id or the trading code —
    codes never look like uuids, so the two can't collide."""
    hid = holding_id.strip()
    return h.get("id") == hid or (h.get("trading_code") or "").upper() == hid.upper()


def _actions() -> dict:
    from backend.services.db_service import load_corporate_actions

    try:
        return load_corporate_actions()
    except Exception:  # noqa: BLE001 — corrections are an enrichment, never a blocker
        return {}


def _with_signals(holdings: list[dict]) -> list[dict]:
    """Holdings enriched with the personalized Buy More / Sell signal (else none).

    Signals come from the canonical signal service — the frontend renders them
    and never re-derives buy/sell advice."""
    from backend.services.db_service import load_latest_prices
    from backend.services.signal_service import build_signals, holding_signal

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
    return out


def _state(user: dict, pid: str) -> dict:
    """The holdings + log for one portfolio, after applying any corporate action
    the daily job hasn't reached yet (same rule, so the page is never a day behind)."""
    state = _load(user, pid)
    acts = _actions()
    holdings, log, applied = ledger.apply_auto(state["holdings"], state["log"], acts)
    if applied:
        state = _save(user, pid, holdings=holdings, log=log)
    suggestions = [a for a in ledger.pending_actions(state["holdings"], state["log"], acts)
                   if not a["auto"]]
    return {**state, "suggestions": suggestions}


def _response(user: dict, pid: str, state: Optional[dict] = None) -> dict:
    state = state or _state(user, pid)
    if "suggestions" not in state:
        state = {**state, "suggestions": [
            a for a in ledger.pending_actions(state["holdings"], state["log"], _actions())
            if not a["auto"]
        ]}
    return {
        "pid": state["pid"],
        "name": state["name"],
        "holdings": _with_signals(state["holdings"]),
        "log": state["log"],
        "suggestions": state["suggestions"],
        "settings": store.load_settings(user["user_id"]),
        "portfolios": store.list_portfolios(user["user_id"]),
    }


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #


@router.get("")
def get_portfolio(current_user: dict = Depends(get_current_user), pid: Optional[str] = None):
    """Holdings (with signals), the trade/dividend/bonus log, older corporate
    actions waiting for the reader's OK, cost settings and the portfolio list."""
    return _response(current_user, _pid(pid))


@router.get("/signal-events")
def get_signal_events(current_user: dict = Depends(get_current_user)):
    """Recent Buy More / Sell flips on the user's holdings (in-app bell)."""
    from backend.services.portfolio_signal_service import list_recent_events

    return {"events": list_recent_events(current_user["user_id"])}


@router.get("/history")
def get_history(current_user: dict = Depends(get_current_user), pid: Optional[str] = None):
    """Daily value snapshots + DSEX over the same days, and a replay of today's
    shares over the last few months for readers with few snapshots."""
    from backend.services.portfolio_daily import history

    p = _pid(pid)
    state = _load(current_user, p)
    return history(current_user["user_id"], p, state["holdings"])


@router.get("/watch-events")
def get_watch_events(current_user: dict = Depends(get_current_user)):
    """What the watcher spotted on the reader's stocks in the last 30 days.
    Shipped to every reader (the page shows a free reader the count and the
    week's `free` event, the rest behind the lock); premium readers get the
    full push, free readers a capped teaser."""
    from backend.services.portfolio_daily import recent_events

    return {"events": recent_events(current_user["user_id"])}


# --------------------------------------------------------------------------- #
# Holdings
# --------------------------------------------------------------------------- #


@router.post("/holdings", status_code=201)
def add_holding(body: AddHoldingBody, current_user: dict = Depends(get_current_user),
                pid: Optional[str] = None):
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    holdings = [dict(h) for h in state["holdings"]]
    code = body.trading_code
    existing = next((h for h in holdings if h["trading_code"] == code), None)
    if entitlements.holdings_add_blocked(
        len(holdings), existing is None, entitlements.limits_for(current_user)["holdings"]
    ):
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_HOLDINGS)
    if not existing and len(holdings) >= entitlements.HARD_LIMITS["holdings"]:
        raise HTTPException(
            status_code=400,
            detail=f"A portfolio can hold up to {entitlements.HARD_LIMITS['holdings']} stocks.",
        )
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
            "added_at": ledger._today_iso(),
        }
        holdings.append(holding)
    log = ledger.append(state["log"], ledger.buy_entry(code, body.qty, body.buy_price))
    saved = _save(current_user, p, holdings=holdings, log=log)
    return {"holding": holding, "holdings": saved["holdings"], "log": saved["log"]}


@router.put("/holdings/{holding_id}")
def update_holding(
    holding_id: str,
    body: UpdateHoldingBody,
    current_user: dict = Depends(get_current_user),
    pid: Optional[str] = None,
):
    """Correct a holding's quantity or average price. A correction, not a
    trade — nothing is written to the log."""
    p = _pid(pid)
    _writable(current_user, p)
    holdings = [dict(h) for h in _load(current_user, p)["holdings"]]
    holding = next((h for h in holdings if _matches(h, holding_id)), None)
    if holding is None:
        raise HTTPException(status_code=404, detail="Holding not found")
    if body.buy_price is not None:
        holding["buy_price"] = round(body.buy_price, 4)
    if body.qty is not None:
        holding["qty"] = body.qty
    saved = _save(current_user, p, holdings=holdings)
    return {"holding": holding, "holdings": saved["holdings"]}


@router.delete("/holdings/{holding_id}")
def delete_holding(holding_id: str, current_user: dict = Depends(get_current_user),
                   pid: Optional[str] = None):
    """Remove a holding that was added by mistake. A sale goes through /sell."""
    p = _pid(pid)
    _writable(current_user, p)
    holdings = _load(current_user, p)["holdings"]
    updated = [h for h in holdings if not _matches(h, holding_id)]
    if len(updated) == len(holdings):
        raise HTTPException(status_code=404, detail="Holding not found")
    saved = _save(current_user, p, holdings=updated)
    return {"holdings": saved["holdings"]}


@router.post("/holdings/{holding_id}/sell")
def sell_holding(holding_id: str, body: SellBody, current_user: dict = Depends(get_current_user),
                 pid: Optional[str] = None):
    """Sell some or all shares. The profit (sale price − average cost) is kept
    in the log; selling everything removes the holding."""
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    held = next((h for h in state["holdings"] if _matches(h, holding_id)), None)
    if held is None:
        raise HTTPException(status_code=404, detail="Holding not found")
    try:
        holdings, entry = ledger.sell(state["holdings"], held["trading_code"], body.qty, body.price)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    saved = _save(current_user, p, holdings=holdings, log=ledger.append(state["log"], entry))
    return {"holdings": saved["holdings"], "log": saved["log"], "entry": entry}


# --------------------------------------------------------------------------- #
# Log + corporate actions
# --------------------------------------------------------------------------- #


@router.delete("/log/{entry_id}")
def delete_log_entry(entry_id: str, current_user: dict = Depends(get_current_user),
                     pid: Optional[str] = None):
    """Drop a buy/sell row from the history. Holdings are not touched."""
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    try:
        log = ledger.remove_trade(state["log"], entry_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Entry not found")
    return _response(current_user, p, _save(current_user, p, log=log))


def _find_pending(state: dict, action_id: str) -> dict:
    action = next((a for a in ledger.pending_actions(state["holdings"], state["log"], _actions())
                   if a["id"] == action_id), None)
    if action is None:
        raise HTTPException(status_code=404, detail="Nothing to apply")
    return action


@router.post("/actions/{action_id}/apply")
def apply_action(action_id: str, current_user: dict = Depends(get_current_user),
                 pid: Optional[str] = None):
    """Confirm an older bonus issue / cash dividend the reader was owed."""
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    holdings, log, _ = ledger.apply_action(state["holdings"], state["log"], _find_pending(state, action_id))
    return _response(current_user, p, _save(current_user, p, holdings=holdings, log=log))


@router.post("/actions/{action_id}/dismiss")
def dismiss_action(action_id: str, current_user: dict = Depends(get_current_user),
                   pid: Optional[str] = None):
    """"Not mine / already counted" — the action is never offered again."""
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    log = ledger.dismiss_action(state["log"], _find_pending(state, action_id))
    return _response(current_user, p, _save(current_user, p, log=log))


@router.post("/actions/{entry_id}/undo")
def undo_action(entry_id: str, current_user: dict = Depends(get_current_user),
                pid: Optional[str] = None):
    """Reverse an applied bonus / dividend (bought too late, already counted)."""
    p = _pid(pid)
    _writable(current_user, p)
    state = _load(current_user, p)
    try:
        holdings, log = ledger.undo_action(state["holdings"], state["log"], entry_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Entry not found")
    return _response(current_user, p, _save(current_user, p, holdings=holdings, log=log))


@router.put("/settings")
def put_settings(body: SettingsBody, current_user: dict = Depends(get_current_user)):
    """The reader's own brokerage fee % and dividend tax % (for net figures)."""
    return {"settings": store.save_settings(current_user["user_id"], body.model_dump())}


# --------------------------------------------------------------------------- #
# Portfolios (Premium: more than one)
# --------------------------------------------------------------------------- #


@router.get("/portfolios")
def get_portfolios(current_user: dict = Depends(get_current_user)):
    return {"portfolios": store.list_portfolios(current_user["user_id"])}


@router.post("/portfolios", status_code=201)
def create_portfolio(body: PortfolioNameBody, current_user: dict = Depends(get_current_user)):
    if not entitlements.is_premium(current_user):
        raise HTTPException(status_code=403, detail=store.LIMIT_PORTFOLIOS)
    try:
        created = store.create(current_user["user_id"], body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"portfolio": created, "portfolios": store.list_portfolios(current_user["user_id"])}


@router.patch("/portfolios/{pid}")
def rename_portfolio(pid: str, body: PortfolioNameBody, current_user: dict = Depends(get_current_user)):
    _writable(current_user, pid)
    try:
        store.rename(current_user["user_id"], pid, body.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"portfolios": store.list_portfolios(current_user["user_id"])}


@router.delete("/portfolios/{pid}")
def delete_portfolio(pid: str, current_user: dict = Depends(get_current_user)):
    """Deleting is always allowed — a lapsed trial can still clear its data."""
    try:
        store.delete(current_user["user_id"], pid)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError:
        raise HTTPException(status_code=404, detail="Portfolio not found")
    return {"portfolios": store.list_portfolios(current_user["user_id"])}
