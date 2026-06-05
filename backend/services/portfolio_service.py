"""Portfolio derivation: turn a transaction ledger into holdings + realized P&L.

The user document stores a `transactions` array (the source of truth) and a
derived `portfolio` array (a cache of current holdings, kept in the exact shape
the frontend has always consumed). Everything here is pure — no DB access — so
it can be unit-tested and reused by the router and any future endpoint.

Transaction shape:
    {id, trading_code, side: "buy"|"sell", price, qty, fee, date, created_at}

Cost basis uses FIFO: sells consume the oldest open buy lots first. Fees are
folded into per-share cost on buys and netted off proceeds on sells, so realized
P&L is net of round-trip charges.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

_EPS = 1e-9


def _sort_key(t: dict) -> tuple:
    return (str(t.get("date") or ""), str(t.get("created_at") or ""))


def sort_transactions(transactions: list[dict]) -> list[dict]:
    """Chronological order: by trade date, then insertion time as a tiebreak."""
    return sorted(transactions, key=_sort_key)


def _by_code(transactions: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for t in sort_transactions(transactions):
        code = (t.get("trading_code") or "").upper()
        out.setdefault(code, []).append(t)
    return out


def _date_part(value) -> Optional[str]:
    """Return the YYYY-MM-DD portion of an ISO date/datetime string."""
    if not value:
        return None
    s = str(value)
    return s[:10] if len(s) >= 10 else s


def derive_holdings(transactions: list[dict]) -> list[dict]:
    """Reduce the ledger to current open positions (FIFO).

    Returns holdings in the legacy shape {id, trading_code, buy_price, qty,
    added_at}: buy_price is the weighted-average cost of the still-open lots,
    added_at is the date of the oldest open lot. Codes with zero net qty are
    dropped. id == trading_code (stable — used for React keys and legacy shims).
    """
    holdings: list[dict] = []
    for code, txns in _by_code(transactions).items():
        lots: list[dict] = []  # FIFO queue of {qty, cost_per_share, date}
        for t in txns:
            qty = float(t.get("qty") or 0)
            price = float(t.get("price") or 0)
            fee = float(t.get("fee") or 0)
            if qty <= 0:
                continue
            if t.get("side") == "sell":
                remaining = qty
                while remaining > _EPS and lots:
                    lot = lots[0]
                    take = min(lot["qty"], remaining)
                    lot["qty"] -= take
                    remaining -= take
                    if lot["qty"] <= _EPS:
                        lots.pop(0)
                # oversell beyond holdings is rejected at write time
            else:
                cost_per_share = price + (fee / qty if qty else 0)
                lots.append(
                    {"qty": qty, "cost_per_share": cost_per_share, "date": _date_part(t.get("date"))}
                )
        net_qty = sum(l["qty"] for l in lots)
        if net_qty <= _EPS:
            continue
        total_cost = sum(l["qty"] * l["cost_per_share"] for l in lots)
        avg_price = total_cost / net_qty if net_qty else 0
        holdings.append(
            {
                "id": code,
                "trading_code": code,
                "buy_price": round(avg_price, 4),
                "qty": int(round(net_qty)),
                "added_at": lots[0]["date"] if lots else None,
            }
        )
    holdings.sort(key=lambda h: (h.get("added_at") or "", h["trading_code"]))
    return holdings


def compute_realized(transactions: list[dict]) -> dict:
    """FIFO realized P&L, net of fees, per code and in total.

    Only the portion of a sell that matches a prior buy contributes to realized
    P&L (an unmatched oversell is ignored — it should never persist because
    writes are validated, but we stay defensive).
    """
    by_code_out: list[dict] = []
    total = 0.0
    for code, txns in _by_code(transactions).items():
        lots: list[dict] = []
        realized = 0.0
        sold_qty = 0.0
        first_buy: Optional[str] = None
        last_sell: Optional[str] = None
        for t in txns:
            qty = float(t.get("qty") or 0)
            price = float(t.get("price") or 0)
            fee = float(t.get("fee") or 0)
            if qty <= 0:
                continue
            if t.get("side") == "sell":
                last_sell = _date_part(t.get("date"))
                remaining = qty
                matched_cost = 0.0
                while remaining > _EPS and lots:
                    lot = lots[0]
                    take = min(lot["qty"], remaining)
                    matched_cost += take * lot["cost_per_share"]
                    lot["qty"] -= take
                    remaining -= take
                    if lot["qty"] <= _EPS:
                        lots.pop(0)
                matched_qty = qty - remaining
                if matched_qty > 0:
                    proceeds = price * matched_qty - fee * (matched_qty / qty)
                    realized += proceeds - matched_cost
                    sold_qty += matched_qty
            else:
                if first_buy is None:
                    first_buy = _date_part(t.get("date"))
                cost_per_share = price + (fee / qty if qty else 0)
                lots.append({"qty": qty, "cost_per_share": cost_per_share})
        realized = round(realized, 2)
        if sold_qty > 0:
            by_code_out.append(
                {
                    "trading_code": code,
                    "realized_pnl": realized,
                    "sold_qty": int(round(sold_qty)),
                    "first_buy_date": first_buy,
                    "last_sell_date": last_sell,
                }
            )
        total += realized
    by_code_out.sort(key=lambda r: r["realized_pnl"])
    return {"total": round(total, 2), "by_code": by_code_out}


def first_oversell(transactions: list[dict]) -> Optional[str]:
    """Return an error message if any code is ever sold below zero net qty.

    Walks each code chronologically; the first point where cumulative sells
    exceed cumulative buys is a invalid ledger state. Used to validate adds,
    edits and deletes before they persist.
    """
    for code, txns in _by_code(transactions).items():
        net = 0.0
        for t in txns:
            qty = float(t.get("qty") or 0)
            if qty <= 0:
                continue
            if t.get("side") == "sell":
                net -= qty
                if net < -_EPS:
                    when = _date_part(t.get("date")) or "that date"
                    return f"{code}: selling {int(qty)} exceeds shares held on {when}."
            else:
                net += qty
    return None


def seed_transactions_from_holdings(holdings: list[dict]) -> list[dict]:
    """One-time migration: synthesise a single buy per legacy holding."""
    txns: list[dict] = []
    for h in holdings:
        code = (h.get("trading_code") or "").upper()
        if not code:
            continue
        added = h.get("added_at")
        txns.append(
            {
                "id": str(uuid.uuid4()),
                "trading_code": code,
                "side": "buy",
                "price": float(h.get("buy_price") or 0),
                "qty": int(h.get("qty") or 0),
                "fee": 0.0,
                "date": _date_part(added) or datetime.now(timezone.utc).date().isoformat(),
                "created_at": str(added) if added else datetime.now(timezone.utc).isoformat(),
            }
        )
    return txns
