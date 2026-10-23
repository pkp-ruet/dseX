"""Portfolio history: the trade log, bonus shares and cash dividends.

Holdings stay the one source of truth for what a user owns now (every
downstream reader — digests, picks, push, the home bundle — keeps reading the
plain `portfolio` array). Beside it sits an append-only **log**: what was
bought and sold (so a sale's profit is kept instead of vanishing with the
shares), every bonus issue that changed the share count, and every cash
dividend the holding earned.

Everything here is pure — no DB — so the router, the daily job and the tests
share one rule set.

Log entry shapes (all carry ``id``, ``kind``, ``code``, ``date``):

    buy       qty, price
    sell      qty, price, avg_cost            (profit = qty × (price − avg_cost))
    bonus     record_date, pct, qty_before, shares_added, avg_before, status, auto
    dividend  record_date, cash_ps, qty, amount, status, auto

``status`` on bonus / dividend rows is ``applied`` | ``undone`` | ``dismissed``.
An undone or dismissed row stays in the log so the daily job never applies the
same record date twice.

Who gets a corporate action: a holding recorded **before** the record date.
``added_at`` is when the user put the stock in the app, not when they bought
it, so a record date after it is the only one we can be sure about. Record
dates on or after ``AUTO_SINCE`` (the day this shipped) are applied by the
daily job; older ones since ``added_at`` are offered as *suggestions* the user
confirms — someone who already fixed their share count by hand must not get
the bonus twice.
"""
from __future__ import annotations

import math
import uuid
from datetime import date, datetime, timezone
from typing import Optional

# Record dates from this day on are applied automatically; older ones are
# suggestions (see module docstring).
AUTO_SINCE = "2026-10-25"

# Defaults for the reader's own cost settings (editable on the portfolio page).
# DSE brokerage commission + CDBL/BSEC levies land around 0.3–0.5% a side;
# cash dividends have 10% tax withheld for an individual with a TIN, 15% without.
DEFAULT_SETTINGS = {"fee_pct": 0.4, "div_tax_pct": 10.0}
_FEE_RANGE = (0.0, 2.0)
_TAX_RANGE = (0.0, 30.0)

LOG_MAX = 2000  # hard cap so a runaway client can't grow the user doc forever

MAIN_PID = "main"


def _today_iso() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _iso(value) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat()[:10]
    s = str(value)
    return s[:10] if len(s) >= 10 else s


def clean_settings(raw: Optional[dict]) -> dict:
    out = dict(DEFAULT_SETTINGS)
    for key, (lo, hi) in (("fee_pct", _FEE_RANGE), ("div_tax_pct", _TAX_RANGE)):
        v = (raw or {}).get(key)
        if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
            out[key] = round(min(hi, max(lo, float(v))), 3)
    return out


# --------------------------------------------------------------------------- #
# Trades
# --------------------------------------------------------------------------- #


def buy_entry(code: str, qty: int, price: float, when: Optional[str] = None) -> dict:
    return {
        "id": f"t-{uuid.uuid4().hex[:12]}",
        "kind": "buy",
        "code": code.upper(),
        "qty": int(qty),
        "price": round(float(price), 4),
        "date": when or _today_iso(),
    }


def sell_entry(code: str, qty: int, price: float, avg_cost: float, when: Optional[str] = None) -> dict:
    return {
        "id": f"t-{uuid.uuid4().hex[:12]}",
        "kind": "sell",
        "code": code.upper(),
        "qty": int(qty),
        "price": round(float(price), 4),
        "avg_cost": round(float(avg_cost), 4),
        "date": when or _today_iso(),
    }


def sell(holdings: list[dict], code: str, qty: int, price: float,
         when: Optional[str] = None) -> tuple[list[dict], dict]:
    """Sell `qty` shares of `code` at `price`. Returns (new holdings, log entry).

    The average cost of what is left does not change; selling everything drops
    the holding. Raises ValueError on an unknown code or an oversell."""
    code = code.upper()
    held = next((h for h in holdings if (h.get("trading_code") or "").upper() == code), None)
    if held is None:
        raise ValueError(f"You don't hold {code}.")
    have = int(held.get("qty") or 0)
    if qty <= 0:
        raise ValueError("Enter how many shares you sold.")
    if qty > have:
        raise ValueError(f"You only hold {have:,} shares of {code}.")
    if price <= 0:
        raise ValueError("Enter the price you sold at.")
    entry = sell_entry(code, qty, price, float(held.get("buy_price") or 0), when)
    out = []
    for h in holdings:
        if h is held:
            if qty < have:
                out.append({**h, "qty": have - qty})
        else:
            out.append(h)
    return out, entry


def realized(entry: dict) -> float:
    """Gross profit of one sell row (before fees)."""
    if entry.get("kind") != "sell":
        return 0.0
    return round(float(entry.get("qty") or 0) * (float(entry.get("price") or 0) - float(entry.get("avg_cost") or 0)), 2)


def append(log: list[dict], *entries: dict) -> list[dict]:
    out = list(log or []) + [e for e in entries if e]
    return out[-LOG_MAX:]


def remove_trade(log: list[dict], entry_id: str) -> list[dict]:
    """Drop a buy/sell row from the history (a typo, a test). Holdings are not
    touched — the row is a record, the holding is edited on its own."""
    found = False
    out = []
    for e in log or []:
        if e.get("id") == entry_id and e.get("kind") in ("buy", "sell"):
            found = True
            continue
        out.append(e)
    if not found:
        raise KeyError(entry_id)
    return out


# --------------------------------------------------------------------------- #
# Corporate actions
# --------------------------------------------------------------------------- #


def action_id(kind: str, code: str, record_date: str) -> str:
    return f"{'bonus' if kind == 'bonus' else 'div'}-{code.upper()}-{record_date}"


def _holding_for(holdings: list[dict], code: str) -> Optional[dict]:
    return next((h for h in holdings if (h.get("trading_code") or "").upper() == code), None)


def _eligible(holding: dict, record_date: str) -> bool:
    added = _iso(holding.get("added_at"))
    return bool(added) and added < record_date


def pending_actions(holdings: list[dict], log: list[dict],
                    actions_by_code: dict[str, list[dict]]) -> list[dict]:
    """Every bonus / cash action the holdings are owed that the log has never
    seen, oldest first. Each item: {id, kind, code, record_date, pct | cash_ps,
    auto: bool}. Cash comes before bonus on the same record date (the cash is
    paid on the pre-bonus count)."""
    seen = {e.get("id") for e in log or []}
    out: list[dict] = []
    for h in holdings:
        code = (h.get("trading_code") or "").upper()
        for a in actions_by_code.get(code) or []:
            rd = _iso(a.get("record_date"))
            if not rd or not _eligible(h, rd):
                continue
            auto = rd >= AUTO_SINCE
            cash_ps = float(a.get("cash_ps") or 0)
            stock = float(a.get("stock_pct") or 0)
            if cash_ps > 0 and action_id("dividend", code, rd) not in seen:
                out.append({"id": action_id("dividend", code, rd), "kind": "dividend", "code": code,
                            "record_date": rd, "cash_ps": round(cash_ps, 4), "auto": auto})
            if stock > 0 and action_id("bonus", code, rd) not in seen:
                out.append({"id": action_id("bonus", code, rd), "kind": "bonus", "code": code,
                            "record_date": rd, "pct": round(stock, 4), "auto": auto})
    out.sort(key=lambda x: (x["record_date"], x["code"], 0 if x["kind"] == "dividend" else 1))
    return out


def apply_action(holdings: list[dict], log: list[dict], action: dict,
                 when: Optional[str] = None) -> tuple[list[dict], list[dict], Optional[dict]]:
    """Apply one pending action. Returns (holdings, log, entry); entry is None
    when the holding is gone or the bonus rounds to no new share (a dividend
    on zero cash is never pending)."""
    code = action["code"]
    h = _holding_for(holdings, code)
    if h is None:
        return holdings, log, None
    qty = int(h.get("qty") or 0)
    avg = float(h.get("buy_price") or 0)
    today = when or _today_iso()
    if action["kind"] == "dividend":
        amount = round(qty * float(action["cash_ps"]), 2)
        entry = {
            "id": action["id"], "kind": "dividend", "code": code, "date": today,
            "record_date": action["record_date"], "cash_ps": action["cash_ps"],
            "qty": qty, "amount": amount, "status": "applied", "auto": bool(action.get("auto")),
        }
        return holdings, append(log, entry), entry

    added = int(math.floor(qty * float(action["pct"]) / 100.0 + 1e-9))
    if added <= 0:
        # Too few shares for even one bonus share — record it so it isn't re-offered.
        entry = {
            "id": action["id"], "kind": "bonus", "code": code, "date": today,
            "record_date": action["record_date"], "pct": action["pct"],
            "qty_before": qty, "shares_added": 0, "avg_before": round(avg, 4),
            "status": "applied", "auto": bool(action.get("auto")),
        }
        return holdings, append(log, entry), None
    new_qty = qty + added
    new_avg = round(qty * avg / new_qty, 4) if new_qty else avg
    entry = {
        "id": action["id"], "kind": "bonus", "code": code, "date": today,
        "record_date": action["record_date"], "pct": action["pct"],
        "qty_before": qty, "shares_added": added, "avg_before": round(avg, 4),
        "status": "applied", "auto": bool(action.get("auto")),
    }
    new_holdings = [{**x, "qty": new_qty, "buy_price": new_avg} if x is h else x for x in holdings]
    return new_holdings, append(log, entry), entry


def apply_auto(holdings: list[dict], log: list[dict],
               actions_by_code: dict[str, list[dict]],
               when: Optional[str] = None) -> tuple[list[dict], list[dict], list[dict]]:
    """Apply every pending action marked auto. Returns (holdings, log, applied)."""
    applied: list[dict] = []
    for a in pending_actions(holdings, log, actions_by_code):
        if not a["auto"]:
            continue
        holdings, log, entry = apply_action(holdings, log, a, when)
        if entry is not None:
            applied.append(entry)
    return holdings, log, applied


def dismiss_action(log: list[dict], action: dict, when: Optional[str] = None) -> list[dict]:
    entry = {
        "id": action["id"], "kind": action["kind"], "code": action["code"],
        "date": when or _today_iso(), "record_date": action["record_date"],
        "status": "dismissed", "auto": False,
    }
    if action["kind"] == "bonus":
        entry["pct"] = action.get("pct")
    else:
        entry["cash_ps"] = action.get("cash_ps")
    return append(log, entry)


def undo_action(holdings: list[dict], log: list[dict], entry_id: str) -> tuple[list[dict], list[dict]]:
    """Reverse an applied bonus / dividend row. A bonus takes the added shares
    back off at the same total cost (so it is right even after later buys);
    the row stays, marked ``undone``, so the daily job leaves it alone."""
    entry = next((e for e in log or [] if e.get("id") == entry_id), None)
    if entry is None or entry.get("kind") not in ("bonus", "dividend"):
        raise KeyError(entry_id)
    if entry.get("status") != "applied":
        return holdings, log
    if entry["kind"] == "bonus" and int(entry.get("shares_added") or 0) > 0:
        code = entry["code"]
        h = _holding_for(holdings, code)
        if h is not None:
            qty = int(h.get("qty") or 0)
            cost = qty * float(h.get("buy_price") or 0)
            back = max(1, qty - int(entry["shares_added"]))
            holdings = [{**x, "qty": back, "buy_price": round(cost / back, 4)} if x is h else x
                        for x in holdings]
    log = [{**e, "status": "undone"} if e.get("id") == entry_id else e for e in log]
    return holdings, log


# --------------------------------------------------------------------------- #
# Value
# --------------------------------------------------------------------------- #


def value_of(holdings: list[dict], prices: dict[str, dict]) -> dict:
    """{value, cost, priced, n} at the latest official close. Codes with no
    price count at cost so a suspended stock doesn't read as a total loss."""
    value = cost = 0.0
    priced = 0
    for h in holdings:
        code = (h.get("trading_code") or "").upper()
        qty = float(h.get("qty") or 0)
        c = qty * float(h.get("buy_price") or 0)
        ltp = (prices.get(code) or {}).get("ltp")
        cost += c
        if ltp:
            value += qty * float(ltp)
            priced += 1
        else:
            value += c
    return {"value": round(value, 2), "cost": round(cost, 2), "priced": priced, "n": len(holdings)}


def replay_series(holdings: list[dict], closes_by_code: dict[str, dict[str, float]],
                  dates: list[str]) -> list[dict]:
    """What today's shares were worth on each of `dates` — the chart before a
    reader has enough daily snapshots of their own. `closes_by_code` holds
    corporate-action-adjusted closes, so a bonus issue is not a cliff. A date
    where a code has no close carries that code's last known close forward."""
    last: dict[str, Optional[float]] = {}
    out = []
    for d in dates:
        total = 0.0
        missing = False
        for h in holdings:
            code = (h.get("trading_code") or "").upper()
            px = (closes_by_code.get(code) or {}).get(d)
            if px:
                last[code] = px
            px = last.get(code)
            if px is None:
                missing = True
                break
            total += float(h.get("qty") or 0) * px
        if not missing:
            out.append({"date": d, "value": round(total, 2)})
    return out
