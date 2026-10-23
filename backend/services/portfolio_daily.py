"""End-of-day portfolio job + the reads behind the portfolio history chart.

`run_portfolio_daily()` (CLI `portfolio-daily`, after the close scrape) sweeps
every user who owns anything, across all their portfolios:

1. **Bonus shares + cash dividends** — record dates that passed are applied
   to the holding and written to its log (`portfolio_ledger.apply_auto`).
2. **Value snapshot** — one `portfolio_snapshots` row per portfolio per trading
   day ({value, cost, n, dsex}); the history chart grows from these. There is
   no backfill: a day that was not snapshotted is gone, so this runs daily.
3. **Watcher events** — `portfolio_watch.build_events` for the stocks they
   hold, stored in `portfolio_watch_events`; premium readers get one push.
4. **Trial recap** — 3–6 days before a free month ends, one push saying what
   Premium caught for them during the month.

Gated to 2 PM Dhaka like the other close jobs; idempotent per trading day.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.services import portfolio_ledger as ledger
from backend.services import portfolio_watch as watch
from backend.services import user_cache
from backend.services.db_service import get_db

log = logging.getLogger("portfolio-daily")

EVENTS_TTL_SECONDS = 180 * 86400
REPLAY_DAYS = 120
RECAP_WINDOW_DAYS = (3, 6)
NS_HISTORY = "pf_history"


def _snapshots():
    return get_db()["portfolio_snapshots"]


def _events():
    return get_db()["portfolio_watch_events"]


def ensure_indexes() -> None:
    _snapshots().create_index(
        [("user_id", 1), ("pid", 1), ("date", 1)], unique=True, name="psnap_user_pid_date"
    )
    _events().create_index([("user_id", 1), ("id", 1)], unique=True, name="pwatch_user_id")
    _events().create_index([("user_id", 1), ("created_at", -1)], name="pwatch_user_recent")
    _events().create_index("created_at", expireAfterSeconds=EVENTS_TTL_SECONDS, name="pwatch_ttl")


# --------------------------------------------------------------------------- #
# Reads for the API
# --------------------------------------------------------------------------- #


def _dsex_series(since: str) -> list[dict]:
    rows = get_db()["dse_market_summary"].find(
        {"date": {"$gte": since}, "dsex": {"$gt": 0}}, {"_id": 0, "date": 1, "dsex": 1}
    ).sort("date", 1)
    return [{"date": r["date"], "value": float(r["dsex"])} for r in rows]


def _replay(holdings: list[dict]) -> list[dict]:
    from backend.services.db_service import adjust_price_rows, load_corporate_actions, use_official_close

    codes = sorted({(h.get("trading_code") or "").upper() for h in holdings if h.get("trading_code")})
    if not codes:
        return []
    since = (datetime.utcnow() - timedelta(days=REPLAY_DAYS)).strftime("%Y-%m-%d")
    by_code: dict[str, list[dict]] = {}
    for d in get_db().stock_prices.find(
        {"trading_code": {"$in": codes}, "date": {"$gte": since}, "ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1, "close_price": 1, "ycp": 1},
    ):
        by_code.setdefault(d["trading_code"], []).append(use_official_close(d))
    acts = load_corporate_actions()
    closes: dict[str, dict[str, float]] = {}
    dates: set[str] = set()
    for code, rows in by_code.items():
        rows.sort(key=lambda r: r["date"])
        adj = adjust_price_rows(rows, acts.get(code, []))
        closes[code] = {r["date"]: float(r["ltp"]) for r in adj if r.get("ltp")}
        dates.update(closes[code])
    return ledger.replay_series(holdings, closes, sorted(dates))


def history(user_id: str, pid: str, holdings: list[dict]) -> dict:
    """{snapshots, dsex, replay} for the value chart. `replay` = today's shares
    priced over the last ~4 months, for readers with few snapshots yet."""
    key = f"{user_id}:{pid}:{len(holdings)}:{sum(int(h.get('qty') or 0) for h in holdings)}"
    cached = user_cache.get(NS_HISTORY, key, ttl_seconds=300)
    if cached is not None:
        return cached
    snaps = [
        {"date": s["date"], "value": s.get("value"), "cost": s.get("cost")}
        for s in _snapshots().find(
            {"user_id": user_id, "pid": pid}, {"_id": 0, "date": 1, "value": 1, "cost": 1}
        ).sort("date", 1)
    ]
    replay = _replay(holdings)
    starts = [x[0]["date"] for x in (snaps, replay) if x]
    dsex = _dsex_series(min(starts)) if starts else []
    out = {"snapshots": snaps, "replay": replay, "dsex": dsex}
    user_cache.set(NS_HISTORY, key, out)
    return out


def recent_events(user_id: str, days: int = 30, limit: int = 40) -> list[dict]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = _events().find(
        {"user_id": user_id, "created_at": {"$gte": since}},
        {"_id": 0, "user_id": 0},
    ).sort("created_at", -1).limit(limit)
    out = []
    for r in rows:
        ca = r.get("created_at")
        r["created_at"] = ca.isoformat() if isinstance(ca, datetime) else ca
        out.append(r)
    return out


# --------------------------------------------------------------------------- #
# The job
# --------------------------------------------------------------------------- #


def _portfolios_of(user: dict) -> list[tuple[str, list[dict], list[dict]]]:
    from backend.services.portfolio_store import normalize_holding

    out = [(ledger.MAIN_PID,
            [normalize_holding(h) for h in (user.get("portfolio") or [])],
            list(user.get("portfolio_log") or []))]
    for p in user.get("extra_portfolios") or []:
        out.append((p.get("id"),
                    [normalize_holding(h) for h in (p.get("holdings") or [])],
                    list(p.get("log") or [])))
    return [x for x in out if x[0]]


def _category_changes(companies: list[dict]) -> dict[str, tuple[str, str]]:
    """{code: (old, new)} since the last run; the first run only stores a baseline."""
    state = get_db()["portfolio_watch_state"]
    now_map = {c["trading_code"]: (c.get("market_category") or "").strip().upper()
               for c in companies if c.get("trading_code")}
    prev = state.find_one({"_id": "market_category"}) or {}
    prev_map = prev.get("map") or {}
    changes = {}
    if prev_map:
        for code, new in now_map.items():
            old = prev_map.get(code)
            if old and new and old != new:
                changes[code] = (old, new)
    state.update_one({"_id": "market_category"},
                     {"$set": {"map": now_map, "updated_at": datetime.now(timezone.utc)}},
                     upsert=True)
    return changes


def _facts(held_codes: set[str], today) -> dict:
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.db_service import load_52w_ranges, load_companies, load_latest_prices
    from backend.services.interim_service import load_interims

    prices = load_latest_prices()
    record = {}
    try:
        for row in build_dividend_calendar().get("record_dates") or []:
            code = row.get("trading_code")
            if code in held_codes and code not in record:
                record[code] = row
    except Exception:  # noqa: BLE001 — one source failing drops one kind of event
        log.warning("calendar read failed", exc_info=True)
    results = {}
    try:
        fresh_after = today - timedelta(days=watch.RESULTS_FRESH_DAYS)
        for code, rec in load_interims(sorted(held_codes)).items():
            pd = rec.get("post_date")
            pd = pd.date() if isinstance(pd, datetime) else pd
            if pd and pd >= fresh_after:
                results[code] = rec
    except Exception:  # noqa: BLE001
        log.warning("interim read failed", exc_info=True)
    try:
        category = _category_changes(load_companies())
    except Exception:  # noqa: BLE001
        category = {}
    try:
        lows = {c: r.get("lo") for c, r in load_52w_ranges().items() if c in held_codes}
    except Exception:  # noqa: BLE001
        lows = {}
    return {"prices": prices, "record": record, "results": results,
            "category": category, "lows": lows}


def _trade_day(prices: dict) -> Optional[str]:
    days = [str(p.get("date"))[:10] for p in prices.values() if p.get("date")]
    return max(days) if days else None


def run_portfolio_daily(not_before_dhaka_hour: Optional[int] = None) -> dict:
    from backend.services import entitlements, push_service
    from backend.services.auth_service import _DHAKA_TZ, _dhaka_day
    from backend.services.db_service import load_corporate_actions

    now = datetime.now(timezone.utc)
    if not_before_dhaka_hour is not None:
        hour = now.astimezone(_DHAKA_TZ).hour
        if hour < not_before_dhaka_hour:
            log.info("portfolio daily gated — %02d:00 Dhaka", hour)
            return {"gated": True}

    ensure_indexes()
    push_service.ensure_push_indexes()
    day = _dhaka_day(now)
    today = now.astimezone(_DHAKA_TZ).date()
    users_col = get_db()["users"]
    users = list(users_col.find(
        {"$or": [{"portfolio.0": {"$exists": True}}, {"extra_portfolios.holdings.0": {"$exists": True}}]},
        {"_id": 0, "user_id": 1, "email": 1, "portfolio": 1, "portfolio_log": 1,
         "extra_portfolios": 1, "premium_until": 1, "push_enabled": 1,
         "notification_prefs": 1},
    ))
    counts = {"users": len(users), "actions": 0, "snapshots": 0, "events": 0,
              "pushed": 0, "recaps": 0}
    if not users:
        return counts

    from backend.services.db_service import load_latest_prices

    acts = load_corporate_actions()
    prices = load_latest_prices()
    trade_day = _trade_day(prices) or day
    last_ms = get_db()["dse_market_summary"].find_one(
        {"dsex": {"$gt": 0}}, {"_id": 0, "dsex": 1}, sort=[("date", -1)]
    )
    dsex = float(last_ms["dsex"]) if last_ms else None

    held_all: set[str] = set()
    per_user_held: dict[str, dict[str, int]] = {}
    from backend.services import portfolio_store as store

    for u in users:
        uid = u.get("user_id")
        if not uid:
            continue
        held: dict[str, int] = {}
        for pid, holdings, plog in _portfolios_of(u):
            new_h, new_log, applied = ledger.apply_auto(holdings, plog, acts, trade_day)
            if applied:
                counts["actions"] += len(applied)
                try:
                    store.save(uid, pid, holdings=new_h, log=new_log)
                except KeyError:
                    continue
            if new_h:
                v = ledger.value_of(new_h, prices)
                _snapshots().update_one(
                    {"user_id": uid, "pid": pid, "date": trade_day},
                    {"$set": {**v, "dsex": dsex, "updated_at": now}},
                    upsert=True,
                )
                counts["snapshots"] += 1
            for h in new_h:
                held[h["trading_code"]] = held.get(h["trading_code"], 0) + int(h.get("qty") or 0)
        per_user_held[uid] = held
        held_all.update(held)

    facts = _facts(held_all, today)
    push_ok = push_service.is_configured()
    sends = get_db()["push_sends"]

    for u in users:
        uid = u.get("user_id")
        held = per_user_held.get(uid) or {}
        if not held:
            continue
        fresh = []
        for e in watch.build_events(held, facts, day):
            res = _events().update_one(
                {"user_id": uid, "id": e["id"]},
                {"$setOnInsert": {**e, "user_id": uid, "created_at": now}},
                upsert=True,
            )
            if res.upserted_id is not None:
                fresh.append(e)
        counts["events"] += len(fresh)

        if not (fresh and push_ok and entitlements.is_premium(u, now)):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not (u.get("push_enabled") and prefs.get("portfolio_watch", True)):
            continue
        campaign_id = f"pwatch-{uid}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        payload = watch.push_payload(fresh, prefs.get("language", "bn"))
        result = push_service.send_to_user(uid, payload)
        if result["sent"] > 0:
            counts["pushed"] += 1
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    counts["recaps"] = _send_trial_recaps(now, day, push_ok)
    log.info("portfolio daily done: %s", counts)
    return counts


def _send_trial_recaps(now: datetime, day: str, push_ok: bool) -> int:
    """One push per trial, 3–6 days before it ends."""
    from backend.services import push_service

    users_col = get_db()["users"]
    lo = now + timedelta(days=RECAP_WINDOW_DAYS[0])
    hi = now + timedelta(days=RECAP_WINDOW_DAYS[1])
    sent = 0
    for u in users_col.find(
        {"premium_source": "trial", "premium_until": {"$gte": lo, "$lte": hi},
         "trial_recap_sent_at": {"$exists": False}},
        {"_id": 0, "user_id": 1, "premium_until": 1, "trial_started_at": 1,
         "push_enabled": 1, "notification_prefs": 1},
    ):
        uid = u["user_id"]
        started = u.get("trial_started_at") or (now - timedelta(days=30))
        caught = _events().count_documents({"user_id": uid, "created_at": {"$gte": started}})
        until = u["premium_until"]
        until = until if until.tzinfo else until.replace(tzinfo=timezone.utc)
        days_left = max(1, (until - now).days)
        users_col.update_one({"user_id": uid}, {"$set": {"trial_recap_sent_at": now}})
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not (push_ok and u.get("push_enabled")):
            continue
        result = push_service.send_to_user(
            uid, watch.trial_recap_payload(caught, days_left, prefs.get("language", "bn"))
        )
        get_db()["push_sends"].update_one(
            {"campaign_id": f"trialrecap-{uid}-{day}", "user_id": uid},
            {"$set": {"campaign_id": f"trialrecap-{uid}-{day}", "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": now}},
            upsert=True,
        )
        if result["sent"]:
            sent += 1
    return sent
