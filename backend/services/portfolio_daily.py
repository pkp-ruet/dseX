"""End-of-day portfolio job + the reads behind the portfolio history chart.

`run_portfolio_daily()` (CLI `portfolio-daily`, after the close scrape) sweeps
every user who owns anything, across all their portfolios:

1. **Bonus shares + cash dividends** — record dates the share has traded past
   are applied to the holding and written to its log
   (`portfolio_ledger.apply_auto`), with a compare-and-set write: a reader who
   edited meanwhile is skipped until the next run (`conflicts` in the log).
2. **Value snapshot** — one `portfolio_snapshots` row per portfolio per trading
   day ({value, cost, n, dsex}); the history chart grows from these. There is
   no backfill: a day that was not snapshotted is gone, so this runs daily.
3. **Watcher events** — `portfolio_watch.build_events` for the stocks they
   hold (and, for results + grade changes, the stocks they follow), stored in
   `portfolio_watch_events`; premium readers get one push (the after-close
   note, opening /notifications), free readers a capped teaser (the week's
   first event in full, else the count + kinds), also opening /notifications.
4. **Trial recap** — 3–6 days before a free month ends, one push saying what
   Premium caught for them during the month.

Gated to 2 PM Dhaka like the other close jobs; idempotent per trading day.
"""
from __future__ import annotations

import logging
from collections import deque
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


def _grade_changes() -> dict[str, dict]:
    """{code: score_history.explain()} for every grade that changed since the
    last run — the same state-diff as the category watch, so it never misses or
    repeats a change whichever job recomputed the scores. The first run, and a
    market-wide shift (we changed the rules), only store the new baseline."""
    from backend.services import score_history as sh
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty:
        return {}
    cur = {r["trading_code"]: sh.state_row(r) for r in df.to_dict("records") if r.get("trading_code")}
    state = get_db()["portfolio_watch_state"]
    prev = (state.find_one({"_id": "score_state"}) or {}).get("map") or {}
    changes = sh.grade_changes(prev, cur)
    state.update_one({"_id": "score_state"},
                     {"$set": {"map": cur, "updated_at": datetime.now(timezone.utc)}},
                     upsert=True)
    return changes


def _facts(held_codes: set[str], today, followed_codes: Optional[set[str]] = None) -> dict:
    """Everything the watcher needs. `held_codes` = stocks someone holds;
    `followed_codes` = held ∪ watched (results + grade changes cover both)."""
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.db_service import load_52w_ranges, load_companies, load_latest_prices
    from utils.sector import normalize_sector

    followed_codes = set(followed_codes or ()) | set(held_codes)

    prices = load_latest_prices()
    trade_day = _trade_day(prices)
    record = {}
    try:
        for row in build_dividend_calendar().get("record_dates") or []:
            code = row.get("trading_code")
            if code in held_codes and code not in record:
                record[code] = row
    except Exception:  # noqa: BLE001 — one source failing drops one kind of event
        log.warning("calendar read failed", exc_info=True)
    results, rows, before, sector_class = {}, {}, {}, {}
    try:
        fresh_after = today - timedelta(days=watch.RESULTS_FRESH_DAYS)
        # The newest result: a quarter, or the full year from the yearly notice
        # (results_explainer.load_latest_results, 2026-10-28).
        from backend.services.results_explainer import load_latest_results
        for code, rec in load_latest_results(sorted(followed_codes)).items():
            pd = rec.get("post_date")
            pd = pd.date() if isinstance(pd, datetime) else pd
            if pd and pd >= fresh_after:
                results[code] = rec
        if results:
            # What the explainer needs beside the report: price, profit basis,
            # score now and the score before the report came out.
            from backend.services.score_history_service import score_before
            from backend.services.scoring_service import build_scores_df

            df = build_scores_df()
            if df is not None and not df.empty:
                for r in df[df["trading_code"].isin(list(results))].to_dict("records"):
                    rows[r["trading_code"]] = {k: (None if isinstance(v, float) and v != v else v)
                                               for k, v in r.items()}
            for code, rec in results.items():
                pd = rec.get("post_date")
                pd = pd.date() if isinstance(pd, datetime) else pd
                before[code] = score_before(code, pd.isoformat()) if pd else None
                sector_class[code] = normalize_sector((rows.get(code) or {}).get("sector") or "")
    except Exception:  # noqa: BLE001
        log.warning("interim read failed", exc_info=True)
    try:
        grades = {c: ch for c, ch in _grade_changes().items() if c in followed_codes}
    except Exception:  # noqa: BLE001
        log.warning("grade change read failed", exc_info=True)
        grades = {}
    try:
        category = _category_changes(load_companies())
    except Exception:  # noqa: BLE001
        category = {}
    try:
        lows = {c: r.get("lo") for c, r in load_52w_ranges().items() if c in held_codes}
    except Exception:  # noqa: BLE001
        lows = {}
    try:
        from backend.services.db_service import load_ex_day_moves
        ex_moves = {c: m for c, m in load_ex_day_moves().items() if c in held_codes}
    except Exception:  # noqa: BLE001
        log.warning("ex-day moves read failed", exc_info=True)
        ex_moves = {}
    try:
        from backend.services.stock_report_service import red_flag_changes
        red_flags = red_flag_changes(followed_codes)
    except Exception:  # noqa: BLE001
        log.warning("red flag read failed", exc_info=True)
        red_flags = {}
    try:
        from backend.services.stock_report_service import answer_changes
        answers = answer_changes(followed_codes)
    except Exception:  # noqa: BLE001
        log.warning("answer change read failed", exc_info=True)
        answers = {}
    try:
        prior = _prior_closes(held_codes, trade_day) if trade_day else {}
    except Exception:  # noqa: BLE001
        log.warning("prior closes read failed", exc_info=True)
        prior = {}
    # No buy-list events since 2026-11-01 (user decision): the Buy signals page
    # is hidden, and Buy / Sell shows only in the stock report and the
    # portfolio's Premium parts. `watch.buylist_changes` stays for its return.
    buylist: dict = {}
    return {"prices": prices, "trade_day": trade_day, "record": record, "results": results, "rows": rows,
            "score_before": before, "sector_class": sector_class, "grades": grades,
            "category": category, "lows": lows, "red_flags": red_flags,
            "answers": answers, "buylist": buylist, "prior": prior, "ex_moves": ex_moves}


def _prior_closes(held_codes: set[str], trade_day: str,
                  days: int = watch.BACK_PRIOR_DAYS) -> dict[str, dict]:
    """`prior_closes` over a year of each held code's official closes."""
    from backend.services.db_service import load_corporate_actions

    if not held_codes:
        return {}
    since = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
    # Ordered by the (trading_code, date) index and streamed in small batches.
    cursor = get_db().stock_prices.find(
        {"trading_code": {"$in": sorted(held_codes)}, "date": {"$gte": since}, "ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1, "close_price": 1},
    ).sort([("trading_code", 1), ("date", 1)]).batch_size(1000)
    return prior_closes(cursor, load_corporate_actions(), trade_day, days)


def prior_closes(rows, acts: dict[str, list[dict]], trade_day: str,
                 days: int = watch.BACK_PRIOR_DAYS) -> dict[str, dict]:
    """{code: {"max", "n", "start", "lo", "lo_date"}} from price rows in date
    order per code: the highest official close over the `days` trading days
    before `trade_day` and the first of those days, plus the lowest close and
    its day. Prices before a bonus record date are put on today's share count,
    like the reader's average price; cash dividends are left in, since the
    average isn't cut for them. A code with no trade on `trade_day` keeps its
    last close in the window, so a stale price can't read as new. Pure."""
    from backend.services.db_service import adjustment_factor_fn

    fns: dict[str, tuple] = {}
    last: dict[str, deque] = {}
    low: dict[str, tuple[float, str]] = {}
    for d in rows:
        code = d["trading_code"]
        day = str(d.get("date") or "")[:10]
        close = d.get("close_price")
        p = close if close is not None and close > 0 else d.get("ltp")
        if not p or not day or day > trade_day:
            continue
        if code not in fns:
            a = [{**x, "cash_ps": 0.0} for x in acts.get(code, []) if x.get("stock_pct")]
            fns[code] = (a, adjustment_factor_fn(a) if a else None)
        a, f = fns[code]
        if f and any(day <= x["record_date"] for x in a):
            p = f(day, p)
        p = float(p)
        # Only the last `days` + 1 rows and the running low are kept per code.
        last.setdefault(code, deque(maxlen=days + 1)).append((day, p))
        if code not in low or p <= low[code][0]:
            low[code] = (p, day)
    out: dict[str, dict] = {}
    for code, rs in last.items():
        before = [(day, p) for day, p in rs if day < trade_day][-days:]
        if before:
            out[code] = {"max": round(max(p for _, p in before), 2), "n": len(before),
                         "start": before[0][0], "lo": round(low[code][0], 2), "lo_date": low[code][1]}
    return out


def reader_positions(portfolios: list[tuple[str, list[dict]]]) -> tuple[dict, dict, dict]:
    """(held, cost, since) for one reader across their portfolios: shares per
    code, the highest average price paid and the day the last of its holdings
    was added. "Back to your price" uses the last two so it is true in every
    portfolio. Pure."""
    held: dict[str, int] = {}
    cost: dict[str, float] = {}
    since: dict[str, str] = {}
    for _pid, holdings in portfolios:
        for h in holdings:
            c = h["trading_code"]
            held[c] = held.get(c, 0) + int(h.get("qty") or 0)
            if float(h.get("buy_price") or 0) > 0:
                cost[c] = max(cost.get(c, 0.0), float(h["buy_price"]))
            since[c] = max(since.get(c, ""), h.get("added_at") or "9999")
    return held, cost, since


def _trade_day(prices: dict) -> Optional[str]:
    days = [str(p.get("date"))[:10] for p in prices.values() if p.get("date")]
    return max(days) if days else None


def _mark_free(uid: str, fresh: list[dict], day: str) -> Optional[dict]:
    """Flag this trading week's free event — the first thing the watcher spots
    for a reader each week is open to them on every page. Returns it when it is
    one of today's `fresh` events (the teaser push then tells it in full)."""
    taken = _events().find_one(
        {"user_id": uid, "free": True, "day": {"$gte": watch.week_start(day)}}, {"_id": 1}
    )
    if taken:
        return None
    pick = watch.pick_free(fresh)
    if pick is None:
        return None
    _events().update_one({"user_id": uid, "id": pick["id"]}, {"$set": {"free": True}})
    pick["free"] = True
    return pick


def _teasers_this_week(sends, uid: str, now: datetime) -> int:
    """Teaser pushes sent to a free reader in the last 7 days."""
    return sends.count_documents({
        "user_id": uid,
        "campaign_id": {"$regex": "^pteaser-"},
        "status": "sent",
        "sent_at": {"$gte": now - timedelta(days=7)},
    })


def after_close_payload(events: list[dict], lang: str = "bn") -> Optional[dict]:
    """A Premium reader's after-close note: "After the close: N things on your
    shares", opening the reader's notifications. One event keeps the watcher's own push (a lone
    result or grade change opens its card on the stock page)."""
    if len(events) <= 1:
        return watch.push_payload(events, lang, "/notifications?src=watch")
    # Count what the notifications list will show: it leaves out our-answer
    # and buy-list events, so "3 things" must not open a list of 2 (audit EL2).
    shown = [e for e in events if e.get("kind") not in watch.PREMIUM_ONLY_KINDS]
    if not shown:
        # Only answer changes: the most serious one opens its answer card.
        return watch.push_payload(sorted(events, key=lambda e: watch._LEVEL_ORDER.get(e.get("level"), 3))[:1],
                                  lang, "/notifications?src=watch")
    payload = watch.push_payload(shown, lang, "/notifications?src=watch")
    if payload and len(shown) > 1:
        n = len(shown)
        payload["title"] = (f"বাজার বন্ধের পর: আপনার শেয়ারে {n}টি খবর" if lang != "en"
                            else f"After the close: {n} things on your shares")
    elif payload:
        # One thing the list shows (plus answer changes it doesn't): open the list.
        payload["url"] = "/notifications?src=watch"
    return payload


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
    fields = {"_id": 0, "user_id": 1, "email": 1, "portfolio": 1, "portfolio_log": 1,
              "extra_portfolios": 1, "premium_until": 1, "push_enabled": 1,
              "notification_prefs": 1, "watchlist": 1, "portfolio_settings": 1}
    users = list(users_col.find(
        {"$or": [{"portfolio.0": {"$exists": True}}, {"extra_portfolios.holdings.0": {"$exists": True}},
                 {"watchlist.0": {"$exists": True}}]},
        fields,
    ))
    counts = {"users": len(users), "actions": 0, "snapshots": 0, "events": 0,
              "pushed": 0, "teasers": 0, "recaps": 0, "conflicts": 0}
    if not users:
        return counts

    from backend.services.db_service import load_latest_prices

    acts = load_corporate_actions()
    prices = load_latest_prices()
    trade_day = _trade_day(prices) or day
    last_trade = {c: str(p.get("date") or "")[:10] for c, p in prices.items()}
    # The index on the snapshot's own trading day (the summary scrape can lag).
    last_ms = get_db()["dse_market_summary"].find_one(
        {"date": {"$lte": trade_day}, "dsex": {"$gt": 0}}, {"_id": 0, "dsex": 1}, sort=[("date", -1)]
    )
    dsex = float(last_ms["dsex"]) if last_ms else None

    held_all: set[str] = set()
    followed_all: set[str] = set()
    per_user_held: dict[str, dict[str, int]] = {}
    per_user_watched: dict[str, set[str]] = {}
    per_user_cost: dict[str, dict[str, float]] = {}
    per_user_since: dict[str, dict[str, str]] = {}
    per_user_fee: dict[str, float] = {}
    from backend.services import portfolio_store as store

    for u in users:
        uid = u.get("user_id")
        if not uid:
            continue
        def _apply(doc: dict) -> tuple[list, dict]:
            st, ch = [], {}
            for pid, holdings, plog in _portfolios_of(doc):
                new_h, new_log, applied = ledger.apply_auto(holdings, plog, acts, last_trade, trade_day)
                if applied:
                    ch[pid] = (new_h, new_log)
                st.append((pid, new_h, len(applied)))
            return st, ch

        states, changes = _apply(u)
        # Compare-and-set on what was read: a reader who edited their portfolio
        # since the read keeps their edit. Their page applies the same actions
        # when it opens, so read them again and retry once; if that also
        # loses, the actions wait for the next run, but the day's snapshot and
        # events still go out on what is stored.
        if changes and not store.save_if_unchanged(uid, u, changes):
            fresh = users_col.find_one({"user_id": uid}, fields) or u
            states, changes = _apply(fresh)
            if changes and not store.save_if_unchanged(uid, fresh, changes):
                counts["conflicts"] += 1
                states = [(pid, holdings, 0) for pid, holdings, _log in _portfolios_of(fresh)]
            u = fresh
        for pid, new_h, n_applied in states:
            counts["actions"] += n_applied
            if new_h:
                v = ledger.value_of(new_h, prices)
                _snapshots().update_one(
                    {"user_id": uid, "pid": pid, "date": trade_day},
                    {"$set": {**v, "dsex": dsex, "updated_at": now}},
                    upsert=True,
                )
                counts["snapshots"] += 1
        held, cost, since = reader_positions([(pid, new_h) for pid, new_h, _ in states])
        per_user_held[uid] = held
        per_user_cost[uid] = cost
        per_user_since[uid] = since
        per_user_fee[uid] = ledger.clean_settings(u.get("portfolio_settings"))["fee_pct"]
        held_all.update(held)
        watched = {str(c).upper() for c in (u.get("watchlist") or []) if c} - set(held)
        per_user_watched[uid] = watched
        followed_all.update(watched)

    facts = _facts(held_all, today, held_all | followed_all)
    push_ok = push_service.is_configured()
    sends = get_db()["push_sends"]

    for u in users:
        uid = u.get("user_id")
        if uid not in per_user_held:  # a conflict above: next run
            continue
        held = per_user_held.get(uid) or {}
        watched = per_user_watched.get(uid) or set()
        if not held and not watched:
            continue
        fresh = []
        for e in watch.build_events(held, facts, day, watched, per_user_cost.get(uid),
                                    per_user_since.get(uid), per_user_fee.get(uid)):
            res = _events().update_one(
                {"user_id": uid, "id": e["id"]},
                {"$setOnInsert": {**e, "user_id": uid, "created_at": now}},
                upsert=True,
            )
            if res.upserted_id is not None:
                fresh.append(e)
        counts["events"] += len(fresh)
        free = _mark_free(uid, fresh, day) if fresh else None

        if not (fresh and push_ok):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not (u.get("push_enabled") and prefs.get("portfolio_watch", True)):
            continue
        lang = prefs.get("language", "bn")
        if entitlements.is_premium(u, now):
            # The after-close note: several things open the notifications list;
            # a lone result / grade change still opens its card on the stock page.
            campaign_id = f"pwatch-{uid}-{day}"
            payload = after_close_payload(fresh, lang)
        else:
            # Free reader: a teaser — this week's free event in full, or the
            # count + kinds + codes — capped so the watcher never nags.
            campaign_id = f"pteaser-{uid}-{day}"
            if _teasers_this_week(sends, uid, now) >= watch.TEASER_WEEKLY_CAP:
                continue
            payload = watch.teaser_payload(fresh, free, lang, "/notifications?src=watch-teaser")
        if not payload or sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        result = push_service.send_to_user(uid, payload)
        if result["sent"] > 0:
            counts["teasers" if campaign_id.startswith("pteaser-") else "pushed"] += 1
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    counts["recaps"] = _send_trial_recaps(now, day, push_ok)
    from backend.services.payments import send_renewal_reminders

    counts["renewals"] = send_renewal_reminders(now, day, push_ok)
    try:
        from backend.services.custom_lists_service import run_alerts
        counts["custom_lists"] = run_alerts(now, day, push_ok)
    except Exception:  # noqa: BLE001 — the lists never fail the portfolio job
        log.warning("custom list alerts failed", exc_info=True)
    try:
        from backend.services.rank_alerts import run_rank_alerts
        counts["rank_alerts"] = run_rank_alerts(now, day, push_ok)
    except Exception:  # noqa: BLE001 — rank alerts never fail the portfolio job
        log.warning("rank alerts failed", exc_info=True)
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
