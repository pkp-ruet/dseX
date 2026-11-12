"""Admin analytics — the Mongo side of ``GET /api/admin/analytics``.

The short page (2026-11-13). Everything is counted inside Mongo, so only small
rows cross the wire: the database sends ~85 KB/s per connection, and the old
page streamed every page view of the window (31k–127k rows, 1.5–3 minutes).

* ``users`` — one ``$facet``: accounts and set-up figures per plan, sign-ups per
  day, and the Premium readers themselves (about a hundred rows);
* ``user_events`` — one ``$facet`` over 30 days: each active reader's days, the
  areas readers opened in 7 days (free / Premium), the 10 most-opened stocks;
* ``payments`` (accepted), ``push_subscriptions`` (who has a device).

Admin accounts (``entitlements.is_admin``) and ``/admin`` pages are left out.
The result is kept ``CACHE_SECONDS``; after that the last copy is served at
once and a fresh one is built in the background. ``fresh`` builds now.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone

from backend.services import entitlements
from backend.services import usage_analytics as ua
from backend.services.db_service import get_db

log = logging.getLogger("usage_analytics")

CACHE_SECONDS = 900
_state: dict = {"at": 0.0, "data": None, "building": False}
_LOCK = threading.Lock()          # guards _state
_BUILD_LOCK = threading.Lock()    # one build at a time


def build(fresh: bool = False) -> dict:
    with _LOCK:
        data, age = _state["data"], time.time() - _state["at"]
        if data is not None and not fresh:
            if age >= CACHE_SECONDS and not _state["building"]:
                _state["building"] = True
                threading.Thread(target=_refresh, name="analytics-refresh", daemon=True).start()
            return data
    with _BUILD_LOCK:
        with _LOCK:
            # Another request may have built it while this one waited.
            if not fresh and _state["data"] is not None and time.time() - _state["at"] < CACHE_SECONDS:
                return _state["data"]
        out = _build()
        with _LOCK:
            _state.update(at=time.time(), data=out)
        return out


def _refresh() -> None:
    try:
        with _BUILD_LOCK:
            out = _build()
        with _LOCK:
            _state.update(at=time.time(), data=out)
    except Exception:  # noqa: BLE001 — keep serving the last copy
        log.warning("analytics refresh failed", exc_info=True)
    finally:
        with _LOCK:
            _state["building"] = False


def _safe(fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001 — every panel is best-effort
        log.warning("analytics read failed", exc_info=True)
        return default


def _size(field: str) -> dict:
    return {"$cond": [{"$isArray": field}, {"$size": field}, 0]}


def _admin_uids(db) -> list[str]:
    from backend.config import ADMIN_EMAILS

    if not ADMIN_EMAILS:
        return []
    rows = db["users"].find(
        {"email": {"$in": sorted(ADMIN_EMAILS)}},
        {"_id": 0, "user_id": 1, "email": 1, "email_verified": 1, "created_at": 1},
    )
    return [r["user_id"] for r in rows if r.get("user_id") and entitlements.is_admin(r)]


def _users(db, now: datetime, start30: datetime, admins: list[str], push_users: list[str]) -> dict:
    cap = entitlements.FREE_LIMITS.get("watchlist") or 10**9
    premium = {"$gt": ["$premium_until", now]}
    pipeline = [
        {"$match": {"user_id": {"$nin": admins, "$type": "string"}}},
        {"$project": {
            "_id": 0,
            "user_id": 1,
            "premium": premium,
            "wl": _size("$watchlist"),
            "pf": _size("$portfolio"),
            "created_at": 1,
            "last_seen_at": 1,
            # Signed up 7+ days ago (a missing date is not "old": null sorts low).
            "old": {"$and": [{"$eq": [{"$type": "$created_at"}, "date"]},
                             {"$lte": ["$created_at", now - timedelta(days=7)]}]},
            "premium_until": 1,
            "premium_source": 1,
            "paid_plan": 1,
        }},
        {"$facet": {
            "plans": [{"$group": {
                "_id": "$premium",
                "accounts": {"$sum": 1},
                "follow": {"$sum": {"$cond": [{"$gt": ["$wl", 0]}, 1, 0]}},
                "portfolio": {"$sum": {"$cond": [{"$gt": ["$pf", 0]}, 1, 0]}},
                "push": {"$sum": {"$cond": [{"$in": ["$user_id", push_users]}, 1, 0]}},
                "at_cap": {"$sum": {"$cond": [{"$gte": ["$wl", cap]}, 1, 0]}},
                # Came back a week later: signed up 7+ days ago and seen 7+ days after.
                "eligible": {"$sum": {"$cond": ["$old", 1, 0]}},
                "returned": {"$sum": {"$cond": [{"$and": [
                    "$old",
                    {"$gte": ["$last_seen_at", {"$dateAdd": {
                        "startDate": "$created_at", "unit": "day", "amount": 7}}]},
                ]}, 1, 0]}},
            }}],
            "signups": [
                {"$match": {"created_at": {"$gte": start30}}},
                {"$group": {"_id": {"$dateToString": {
                    "format": "%Y-%m-%d", "date": "$created_at", "timezone": "Asia/Dhaka"}},
                    "n": {"$sum": 1}}},
            ],
            "members": [
                {"$match": {"premium": True}},
                {"$project": {"user_id": 1, "premium_until": 1, "premium_source": 1, "paid_plan": 1,
                              "last_seen_at": 1}},
            ],
            "lapsed": [
                {"$match": {"premium_source": "paid",
                            "premium_until": {"$lte": now, "$gt": now - timedelta(days=30)}}},
                {"$count": "n"},
            ],
        }},
    ]
    return next(db["users"].aggregate(pipeline), {})


def _events(db, start30: datetime, start7: datetime, admins: list[str], premium: list[str]) -> dict:
    pipeline = [
        {"$match": {"ts": {"$gte": start30}, "user_id": {"$nin": admins},
                    "path": {"$not": {"$regex": "^/admin"}}}},
        {"$project": {"_id": 0, "u": "$user_id", "ts": 1, "path": 1,
                      "c": {"$ifNull": ["$count", 1]}}},
        {"$facet": {
            "days": [
                {"$group": {"_id": {"u": "$u", "d": {"$dateToString": {
                    "format": "%Y-%m-%d", "date": "$ts", "timezone": "Asia/Dhaka"}}}}},
                {"$group": {"_id": "$_id.u", "d": {"$push": "$_id.d"}}},
            ],
            "areas": [
                {"$match": {"ts": {"$gte": start7}}},
                {"$project": {"u": 1, "a": ua.area_switch(ua.bare_expr("$path"))}},
                {"$group": {"_id": {"a": "$a", "u": "$u"}}},
                {"$group": {"_id": {"a": "$_id.a", "p": {"$in": ["$_id.u", premium]}},
                            "users": {"$sum": 1}}},
            ],
            "stocks": [
                {"$match": {"ts": {"$gte": start7}}},
                {"$project": {"u": 1, "c": 1, "m": {"$regexFind": {"input": "$path", "regex": ua.STOCK_RX}}}},
                {"$match": {"m": {"$ne": None}}},
                {"$group": {"_id": {"code": {"$toUpper": {"$arrayElemAt": ["$m.captures", 0]}}, "u": "$u"},
                            "v": {"$sum": "$c"}}},
                {"$group": {"_id": "$_id.code", "users": {"$sum": 1}, "views": {"$sum": "$v"}}},
                {"$sort": {"users": -1, "views": -1, "_id": 1}},
                {"$limit": 10},
            ],
        }},
    ]
    return next(db["user_events"].aggregate(pipeline, allowDiskUse=True), {})


def _build() -> dict:
    t0 = time.perf_counter()
    db = get_db()
    now = datetime.now(timezone.utc)
    today = now.astimezone(ua.DHAKA).date()
    start30 = datetime.combine(today - timedelta(days=ua.WINDOW_DAYS - 1), datetime.min.time(),
                               ua.DHAKA).astimezone(timezone.utc)
    start7 = datetime.combine(today - timedelta(days=ua.AREA_DAYS - 1), datetime.min.time(),
                              ua.DHAKA).astimezone(timezone.utc)

    admins = _safe(lambda: _admin_uids(db), [])
    push_users = _safe(lambda: [u for u in db["push_subscriptions"].distinct("user_id") if u], [])
    push_set = set(push_users)

    users = _users(db, now, start30, admins, push_users)
    plans = {bool(r["_id"]): r for r in users.get("plans", [])}
    free_p, prem_p = plans.get(False, {}), plans.get(True, {})
    members = users.get("members", [])
    premium_uids = [m["user_id"] for m in members]
    signups = {r["_id"]: r["n"] for r in users.get("signups", [])}
    lapsed = next(iter(users.get("lapsed") or []), {}).get("n", 0)

    events = _safe(lambda: _events(db, start30, start7, admins, premium_uids), {})
    act = ua.active_figures({r["_id"]: r["d"] for r in events.get("days", [])}, set(premium_uids), today)
    G = act["groups"]

    payments = _safe(lambda: list(db["payments"].find(
        {"status": "accepted"}, {"_id": 0, "user_id": 1, "amount": 1, "created_at": 1})), [])
    pending = _safe(lambda: db["payments"].count_documents({"status": "pending"}), 0)
    money = ua.money_summary(payments, now)

    # Names only for the few whose Premium ends this week.
    soon_ids = [m["user_id"] for m in members
                if (ua.dhaka_day(m.get("premium_until")) or today) < today + timedelta(days=ua.ENDING_DAYS)]
    names = {}
    if soon_ids:
        for r in _safe(lambda: list(db["users"].find(
                {"user_id": {"$in": soon_ids}},
                {"_id": 0, "user_id": 1, "display_name": 1, "email": 1, "phone": 1})), []):
            names[r["user_id"]] = r
    ending = ua.ending_soon([
        {"user_id": m["user_id"],
         "name": ((names.get(m["user_id"]) or {}).get("display_name") or "").strip(),
         "contact": (names.get(m["user_id"]) or {}).get("email") or (names.get(m["user_id"]) or {}).get("phone"),
         "plan": "paid" if m.get("premium_source") == "paid" else "gifted",
         "until": m.get("premium_until"), "last_seen_at": m.get("last_seen_at")}
        for m in members if m["user_id"] in names
    ], today, act["last"], push_set)

    paying = sum(1 for m in members if m.get("premium_source") == "paid")

    def group(p: dict, g: dict, free: bool) -> dict:
        accounts = int(p.get("accounts") or 0)
        row = {
            "accounts": accounts,
            "active_7d": g["d7"],
            "active_7d_pct": ua.pct(g["d7"], accounts),
            "active_30d": g["d30"],
            "median_days": g["median_days"],
            "follow_pct": ua.pct(p.get("follow", 0), accounts),
            "portfolio_pct": ua.pct(p.get("portfolio", 0), accounts),
            "push_pct": ua.pct(p.get("push", 0), accounts),
        }
        if free:
            row["at_cap"] = int(p.get("at_cap") or 0)
        return row

    eligible = int(free_p.get("eligible", 0)) + int(prem_p.get("eligible", 0))
    returned = int(free_p.get("returned", 0)) + int(prem_p.get("returned", 0))
    accounts = int(free_p.get("accounts", 0)) + int(prem_p.get("accounts", 0))
    t = today.isoformat()
    week = [(today - timedelta(days=i)).isoformat() for i in range(7)]

    out = {
        "generated_at": now.isoformat(),
        "build_seconds": round(time.perf_counter() - t0, 1),
        "admins_left_out": len(admins),
        "tiles": {
            "accounts": accounts,
            "new_today": int(signups.get(t, 0)),
            "new_7d": sum(int(signups.get(d, 0)) for d in week),
            "active_today": G["all"]["today"],
            "active_7d": G["all"]["d7"],
            "active_30d": G["all"]["d30"],
            "premium": len(members),
            "paying": paying,
            "given": len(members) - paying,
            "money_month": money["month"],
            "payments_month": money["month_payments"],
        },
        "growth": ua.growth_series(today, signups, act["per_day"]),
        "came_back": {"eligible": eligible, "returned": returned, "pct": ua.pct(returned, eligible)},
        "premium": {
            "paying": paying,
            "given": len(members) - paying,
            "pending": pending,
            "lapsed_30d": lapsed,
            "money_month": money["month"],
            "month_payments": money["month_payments"],
            "money_total": money["total"],
            "payments": money["payments"],
            "buyers": money["buyers"],
            "repeat_buyers": money["repeat_buyers"],
            "new_buyers_30d": money["new_buyers_30d"],
            "plans": ua.plan_counts(members),
            "ending": ending,
        },
        "groups": {
            "free": group(free_p, G["free"], True),
            "premium": group(prem_p, G["premium"], False),
        },
        "areas": ua.area_rows(
            [{"area": r["_id"].get("a"), "premium": r["_id"].get("p"), "users": r["users"]}
             for r in events.get("areas", [])],
            {"free": G["free"]["d7"], "premium": G["premium"]["d7"]},
        ),
        "stocks": [{"code": r["_id"], "users": r["users"], "views": r["views"]}
                   for r in events.get("stocks", []) if r.get("_id")],
    }
    log.info("admin analytics built in %.1fs", out["build_seconds"])
    return out
