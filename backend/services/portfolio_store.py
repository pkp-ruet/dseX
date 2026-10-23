"""Where a user's portfolios live on the user doc.

The **main** portfolio keeps its original fields — ``portfolio`` (holdings) +
``portfolio_log`` — so every reader that predates this module (digests, picks,
push, campaigns, the home bundle) keeps working untouched. Extra portfolios
(a parent's or spouse's BO account; Premium) sit in ``extra_portfolios``:
``[{id, name, holdings, log, created_at}]``. Downstream readers only ever see
the main one — by design: they speak to "your stocks".

Reader cost settings (``portfolio_settings``) are per user, not per portfolio.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.services import portfolio_ledger as ledger
from backend.services import user_cache

MAIN_PID = ledger.MAIN_PID
MAIN_NAME = "My portfolio"
MAX_EXTRA = 5
NAME_MAX = 40

# Free accounts get the main portfolio only — the frontend matches this string.
from backend.services.entitlements import LIMIT_PORTFOLIOS  # noqa: E402


def _users():
    from backend.services.auth_service import get_db

    return get_db()["users"]


def _date_part(value) -> Optional[str]:
    if not value:
        return None
    s = str(value)
    return s[:10] if len(s) >= 10 else s


def normalize_holding(h: dict) -> dict:
    """Coerce a stored holding into the shape the frontend consumes."""
    code = (h.get("trading_code") or "").upper()
    return {
        "id": h.get("id") or code,
        "trading_code": code,
        "buy_price": round(float(h.get("buy_price") or 0), 4),
        "qty": int(h.get("qty") or 0),
        "added_at": _date_part(h.get("added_at")),
    }


def clean_name(name: str) -> str:
    name = re.sub(r"\s+", " ", (name or "").strip())[:NAME_MAX]
    if not name:
        raise ValueError("Give the portfolio a name.")
    return name


def _cache_key(user_id: str, pid: str) -> str:
    return user_id if pid == MAIN_PID else f"{user_id}:{pid}"


# --------------------------------------------------------------------------- #
# Read
# --------------------------------------------------------------------------- #


def load(user_id: str, pid: str = MAIN_PID) -> dict:
    """{pid, name, holdings, log}. Raises KeyError for an unknown extra pid.

    The main portfolio also migrates the pre-2026-08 ``transactions`` ledger
    (collapsed to holdings, then dropped) on first read."""
    pid = pid or MAIN_PID
    cached = user_cache.get(user_cache.NS_PORTFOLIO, _cache_key(user_id, pid))
    if cached is not None:
        return cached

    if pid == MAIN_PID:
        doc = _users().find_one(
            {"user_id": user_id}, {"portfolio": 1, "portfolio_log": 1, "transactions": 1}
        ) or {}
        txns = doc.get("transactions")
        if txns is not None:
            from backend.services import portfolio_service

            holdings = [normalize_holding(h) for h in portfolio_service.derive_holdings(txns)]
            _users().update_one(
                {"user_id": user_id},
                {"$set": {"portfolio": holdings}, "$unset": {"transactions": ""}},
            )
            user_cache.invalidate(user_cache.NS_TRANSACTIONS, user_id)
        else:
            holdings = [normalize_holding(h) for h in (doc.get("portfolio") or [])]
        out = {"pid": MAIN_PID, "name": MAIN_NAME, "holdings": holdings,
               "log": list(doc.get("portfolio_log") or [])}
    else:
        doc = _users().find_one(
            {"user_id": user_id, "extra_portfolios.id": pid},
            {"extra_portfolios": {"$elemMatch": {"id": pid}}},
        )
        if not doc or not doc.get("extra_portfolios"):
            raise KeyError(pid)
        p = doc["extra_portfolios"][0]
        out = {"pid": pid, "name": p.get("name") or "Portfolio",
               "holdings": [normalize_holding(h) for h in (p.get("holdings") or [])],
               "log": list(p.get("log") or [])}

    user_cache.set(user_cache.NS_PORTFOLIO, _cache_key(user_id, pid), out)
    return out


def list_portfolios(user_id: str) -> list[dict]:
    doc = _users().find_one(
        {"user_id": user_id},
        {"portfolio": 1, "extra_portfolios.id": 1, "extra_portfolios.name": 1,
         "extra_portfolios.holdings.trading_code": 1},
    ) or {}
    out = [{"id": MAIN_PID, "name": MAIN_NAME, "count": len(doc.get("portfolio") or [])}]
    for p in doc.get("extra_portfolios") or []:
        out.append({"id": p.get("id"), "name": p.get("name") or "Portfolio",
                    "count": len(p.get("holdings") or [])})
    return out


def load_settings(user_id: str) -> dict:
    doc = _users().find_one({"user_id": user_id}, {"portfolio_settings": 1}) or {}
    return ledger.clean_settings(doc.get("portfolio_settings"))


# --------------------------------------------------------------------------- #
# Write
# --------------------------------------------------------------------------- #


def save(user_id: str, pid: str, holdings: Optional[list[dict]] = None,
         log: Optional[list[dict]] = None) -> dict:
    """Persist holdings and/or log for one portfolio; returns the fresh state."""
    pid = pid or MAIN_PID
    now = datetime.now(timezone.utc)
    if holdings is not None:
        holdings = sorted(
            (normalize_holding(h) for h in holdings),
            key=lambda h: (h.get("added_at") or "", h["trading_code"]),
        )
    if log is not None:
        log = log[-ledger.LOG_MAX:]

    if pid == MAIN_PID:
        fields: dict = {"updated_at": now}
        if holdings is not None:
            fields["portfolio"] = holdings
        if log is not None:
            fields["portfolio_log"] = log
        _users().update_one({"user_id": user_id}, {"$set": fields})
    else:
        fields = {"updated_at": now}
        if holdings is not None:
            fields["extra_portfolios.$.holdings"] = holdings
        if log is not None:
            fields["extra_portfolios.$.log"] = log
        res = _users().update_one({"user_id": user_id, "extra_portfolios.id": pid}, {"$set": fields})
        if res.matched_count == 0:
            raise KeyError(pid)

    user_cache.invalidate(user_cache.NS_PORTFOLIO, _cache_key(user_id, pid))
    return load(user_id, pid)


def save_settings(user_id: str, raw: dict) -> dict:
    current = load_settings(user_id)
    merged = ledger.clean_settings({**current, **{k: v for k, v in (raw or {}).items() if v is not None}})
    _users().update_one(
        {"user_id": user_id},
        {"$set": {"portfolio_settings": merged, "updated_at": datetime.now(timezone.utc)}},
    )
    return merged


def create(user_id: str, name: str) -> dict:
    name = clean_name(name)
    existing = list_portfolios(user_id)
    if len(existing) - 1 >= MAX_EXTRA:
        raise ValueError(f"You can keep up to {MAX_EXTRA + 1} portfolios.")
    pid = f"p-{uuid.uuid4().hex[:10]}"
    _users().update_one(
        {"user_id": user_id},
        {"$push": {"extra_portfolios": {
            "id": pid, "name": name, "holdings": [], "log": [],
            "created_at": datetime.now(timezone.utc),
        }}},
    )
    return {"id": pid, "name": name, "count": 0}


def rename(user_id: str, pid: str, name: str) -> None:
    if pid == MAIN_PID:
        raise ValueError("The main portfolio keeps its name.")
    res = _users().update_one(
        {"user_id": user_id, "extra_portfolios.id": pid},
        {"$set": {"extra_portfolios.$.name": clean_name(name)}},
    )
    if res.matched_count == 0:
        raise KeyError(pid)
    user_cache.invalidate(user_cache.NS_PORTFOLIO, _cache_key(user_id, pid))


def delete(user_id: str, pid: str) -> None:
    if pid == MAIN_PID:
        raise ValueError("The main portfolio can't be deleted.")
    res = _users().update_one(
        {"user_id": user_id}, {"$pull": {"extra_portfolios": {"id": pid}}}
    )
    if res.modified_count == 0:
        raise KeyError(pid)
    user_cache.invalidate(user_cache.NS_PORTFOLIO, _cache_key(user_id, pid))
    from backend.services.auth_service import get_db

    get_db()["portfolio_snapshots"].delete_many({"user_id": user_id, "pid": pid})
