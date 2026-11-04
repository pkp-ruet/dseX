"""Admin usage analytics — the Mongo side of ``GET /api/admin/analytics``.

One pass over each source, then the pure helpers in ``usage_analytics.py``:

* ``users`` — one compact row per account, built in Mongo (whole user documents
  are ~8 MB, mostly ``daily_picks`` + ``last_recommendation``);
* ``price_alerts``, ``push_subscriptions``, ``payments`` — grouped per reader;
* ``push_sends`` / ``email_sends`` in the window — grouped per reader in Mongo;
* ``user_events`` — the window streamed in batches, never listed (per-reader
  state only); the 90-day active line grouped in Mongo; payers' own 90 days
  read by user id.

Every reader is put in one plan (paying · free month / given · free) and every
figure is worked out for each group, so the Premium and Free tabs mirror each
other. Admin accounts (``entitlements.is_admin``) and ``/admin`` pages are left
out of everything. Cached ``CACHE_SECONDS`` per window; ``fresh`` skips it.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import Counter, defaultdict
from datetime import date, datetime, time as dtime, timedelta, timezone
from typing import Optional

from backend.services import entitlements
from backend.services import usage_analytics as ua
from backend.services.db_service import get_db

log = logging.getLogger("usage_analytics")

CACHE_SECONDS = 120
LEADS = 25
_CACHE: dict[int, tuple[float, dict]] = {}
_LOCK = threading.Lock()

PLAN_WORDS = {
    "monthly": "1 month", "quarterly": "3 months", "halfyearly": "6 months",
    "yearly": "1 year", "offer": "৳99 month",
}
SOURCE_WORDS = {"trial": "Free month", "admin": "Given by admin"}


def build(days: int = 30, fresh: bool = False) -> dict:
    days = days if days in ua.WINDOWS else 30
    with _LOCK:
        hit = _CACHE.get(days)
        if hit and not fresh and time.time() - hit[0] < CACHE_SECONDS:
            return hit[1]
    out = _build(days)
    with _LOCK:
        _CACHE[days] = (time.time(), out)
    return out


# ---------------------------------------------------------------------------
# Reads
# ---------------------------------------------------------------------------

def _n(field: str) -> dict:
    return {"$cond": [{"$isArray": field}, {"$size": field}, 0]}


def _load_users(db) -> list[dict]:
    return list(db["users"].aggregate([
        {"$project": {
            "_id": 0, "user_id": 1, "email": 1, "email_verified": 1, "display_name": 1,
            "created_at": 1, "last_seen_at": 1, "premium_until": 1, "premium_source": 1,
            "paid_plan": 1, "trial_started_at": 1, "offer_dismissed_at": 1,
            "offer_remind_after": 1, "offer_used_at": 1, "email_opt_out": 1,
            "has_phone": {"$gt": ["$phone", None]},
            "google": {"$eq": ["$oauth_provider", "google"]},
            "wl": _n("$watchlist"), "pf": _n("$portfolio"), "xp": _n("$extra_portfolios"),
            "screens": _n("$custom_lists"), "reminders": _n("$dividend_reminders"),
            "rank_alerts": _n("$rank_alerts"),
            "keys": {"$ifNull": ["$report_keys.opened_at", []]},
            "push_enabled": {"$toBool": {"$ifNull": ["$push_enabled", False]}},
            "installed": {"$gt": ["$app_installed_at", None]},
            "ai_count": {"$ifNull": ["$ai_query_count", 0]},
            "ai_last": "$ai_last_used_at",
        }},
    ]))


def _safe(fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001 — every panel is best-effort
        log.warning("analytics read failed", exc_info=True)
        return default


def _top_codes(col, array_field: str, limit: int = 10) -> list[dict]:
    """Most common codes in a per-user array, counted once per user."""
    rows = col.aggregate([
        {"$project": {"_id": 0, "c": {"$setUnion": [{"$ifNull": [array_field, []]}, []]}}},
        {"$unwind": "$c"},
        {"$match": {"c": {"$type": "string", "$ne": ""}}},
        {"$group": {"_id": {"$toUpper": "$c"}, "users": {"$sum": 1}}},
        {"$sort": {"users": -1}},
        {"$limit": limit},
    ])
    return [{"code": r["_id"], "users": r["users"]} for r in rows]


def _dhaka_day(v) -> Optional[date]:
    t = ua.as_utc(v)
    return t.astimezone(ua.DHAKA).date() if t else None


def _day_start_utc(d: date) -> datetime:
    return datetime.combine(d, dtime.min, ua.DHAKA).astimezone(timezone.utc)


# ---------------------------------------------------------------------------
# Per-group accumulator
# ---------------------------------------------------------------------------

class _Group:
    def __init__(self):
        self.daily_users: dict[int, set] = defaultdict(set)   # all of it is the window
        self.daily_views: Counter = Counter()
        self.area_users: dict[str, set] = defaultdict(set)
        self.area_views: Counter = Counter()
        self.page_views: Counter = Counter()
        self.page_users: dict[str, set] = defaultdict(set)
        self.stock_views: Counter = Counter()
        self.stock_users: dict[str, set] = defaultdict(set)
        self.src_views: Counter = Counter()
        self.src_users: dict[str, set] = defaultdict(set)
        self.hours = [[0] * 24 for _ in range(7)]


def _active_since(g: _Group, today_ord: int, n: int) -> set:
    out: set = set()
    for i in range(n):
        out |= g.daily_users.get(today_ord - i, set())
    return out


# ---------------------------------------------------------------------------
# The build
# ---------------------------------------------------------------------------

def _build(days: int) -> dict:
    db = get_db()
    now = datetime.now(timezone.utc)
    today = now.astimezone(ua.DHAKA).date()
    today_ord = today.toordinal()
    start_ord = today_ord - days + 1
    window_start = _day_start_utc(date.fromordinal(start_ord))
    start90 = _day_start_utc(today - timedelta(days=89))
    month_start = today.replace(day=1)

    # --- Accounts ---------------------------------------------------------
    raw_users = _load_users(db)
    info: dict[str, dict] = {}
    admin_uids: list[str] = []
    for u in raw_users:
        uid = u.get("user_id")
        if not uid:
            continue
        if entitlements.is_admin(u):
            admin_uids.append(uid)
            continue
        u["plan"] = ua.plan_of(u.get("premium_until"), u.get("premium_source"), now)
        u["created"] = _dhaka_day(u.get("created_at"))
        u["seen"] = _dhaka_day(u.get("last_seen_at"))
        info[uid] = u

    alerts = _safe(lambda: {
        r["_id"]: r for r in db["price_alerts"].aggregate([
            {"$group": {"_id": "$user_id",
                        "armed": {"$sum": {"$cond": [{"$eq": ["$is_active", True]}, 1, 0]}},
                        "total": {"$sum": 1}}},
        ])
    }, {})
    push_users = set(_safe(lambda: db["push_subscriptions"].distinct("user_id"), []))

    payments = _safe(lambda: list(db["payments"].find(
        {"status": {"$in": ["accepted", "pending", "revoked"]}},
        {"_id": 0, "user_id": 1, "amount": 1, "plan": 1, "method": 1, "status": 1,
         "created_at": 1, "manual": 1},
    )), [])
    accepted = [p for p in payments if p.get("status") == "accepted"]
    paid_by_user: dict[str, list[dict]] = defaultdict(list)
    for p in sorted(accepted, key=lambda p: ua.as_utc(p.get("created_at")) or now):
        paid_by_user[p.get("user_id")].append(p)
    first_paid = {uid: ua.as_utc(ps[0].get("created_at")) for uid, ps in paid_by_user.items()
                  if ps and ua.as_utc(ps[0].get("created_at"))}

    # --- Notifications sent in the window --------------------------------
    push_by_user: dict[str, dict] = defaultdict(lambda: {"sent": 0, "failed": 0, "kinds": Counter()})
    for r in _safe(lambda: list(db["push_sends"].aggregate([
        {"$match": {"sent_at": {"$gte": window_start}}},
        {"$group": {"_id": {"u": "$user_id", "c": {"$arrayElemAt": [
            {"$split": [{"$ifNull": ["$campaign_id", ""]}, "-"]}, 0]}, "s": "$status"},
            "n": {"$sum": 1}}},
    ])), []):
        k = r["_id"]
        row = push_by_user[k.get("u")]
        if k.get("s") == "sent":
            row["sent"] += r["n"]
            row["kinds"][ua.push_kind(k.get("c") or "")] += r["n"]
        else:
            row["failed"] += r["n"]
    email_by_user: Counter = Counter()
    for r in _safe(lambda: list(db["email_sends"].aggregate([
        {"$match": {"sent_at": {"$gte": window_start}, "status": "sent"}},
        {"$group": {"_id": "$user_id", "n": {"$sum": 1}}},
    ])), []):
        email_by_user[r["_id"]] += r["n"]

    # --- Page views ---------------------------------------------------------
    # The window is streamed row by row (per-reader state only). The 90-day
    # active-readers line is grouped in Mongo, and payers' own history (what
    # they did before paying) is read by user id, so a 7- or 30-day window
    # never pulls 90 days of rows over the wire.
    groups = {g: _Group() for g in ua.GROUPS}
    usage: dict[str, ua.Usage] = {}
    payer_days: dict[str, set] = defaultdict(set)
    payer_events: dict[str, list] = defaultdict(list)
    not_admin = {"user_id": {"$nin": admin_uids}, "path": {"$not": {"$regex": "^/admin"}}}

    def _rows(query: dict):
        cur = db["user_events"].find(
            query, {"_id": 0, "user_id": 1, "path": 1, "ts": 1, "ts_bucket": 1, "count": 1},
        ).batch_size(5000)
        for row in cur:
            u = info.get(row.get("user_id"))
            path = row.get("path") or "/"
            area = ua.area_of(path)
            ts = ua.as_utc(row.get("ts")) or ua.as_utc(row.get("ts_bucket"))
            if u is None or area == "admin" or ts is None:
                continue
            yield row["user_id"], u, path, area, ts, int(row.get("count") or 1), row

    def _window():
        for uid, u, path, area, ts, count, row in _rows({"ts": {"$gte": window_start}}):
            local = ts.astimezone(ua.DHAKA)
            day_ord = local.date().toordinal()
            bucket = ua.as_utc(row.get("ts_bucket")) or ts
            usage.setdefault(uid, ua.Usage()).add(day_ord, int(bucket.timestamp() // 60), area, count)
            page, code, src = ua.page_of(path), ua.stock_of(path), ua.src_of(path)
            dow, hour = (local.weekday() + 1) % 7, local.hour
            for g in ua.groups_of(u["plan"]):
                G = groups[g]
                G.daily_users[day_ord].add(uid)
                G.daily_views[day_ord] += count
                G.area_users[area].add(uid)
                G.area_views[area] += count
                G.page_views[page] += count
                G.page_users[page].add(uid)
                if code:
                    G.stock_views[code] += count
                    G.stock_users[code].add(uid)
                if src:
                    G.src_views[src] += count
                    G.src_users[src].add(uid)
                G.hours[dow][hour] += count

    def _payers():
        if not first_paid:
            return
        for uid, _u, path, area, ts, _c, _row in _rows(
                {"user_id": {"$in": list(first_paid)}, "ts": {"$gte": start90}}):
            payer_days[uid].add(ts.astimezone(ua.DHAKA).date().toordinal())
            payer_events[uid].append((ts, area, ua.src_of(path)))

    def _growth_active() -> dict[str, int]:
        return {r["_id"]: r["users"] for r in db["user_events"].aggregate([
            {"$match": {"ts": {"$gte": start90}, **not_admin}},
            {"$group": {"_id": {"d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts",
                                                         "timezone": "Asia/Dhaka"}},
                                "u": "$user_id"}}},
            {"$group": {"_id": "$_id.d", "users": {"$sum": 1}}},
        ])}

    def _distinct_since(n: int) -> int:
        since = _day_start_utc(today - timedelta(days=n - 1))
        return len(db["user_events"].distinct("user_id", {"ts": {"$gte": since}, **not_admin}))

    _safe(_window, None)
    _safe(_payers, None)
    growth_active = _safe(_growth_active, {})

    # --- Per-group summaries ----------------------------------------------
    members = {g: [uid for uid, u in info.items() if g in ua.groups_of(u["plan"])] for g in ua.GROUPS}
    window_days = [start_ord + i for i in range(days)]

    def _setup(uids: list[str], active: set) -> list[dict]:
        def armed(uid):
            return int((alerts.get(uid) or {}).get("armed") or 0)

        def keys_month(uid):
            return sum(1 for t in info[uid].get("keys") or [] if (_dhaka_day(t) or date.min) >= month_start)

        defs = [
            ("watchlist", "Follows shares (watchlist)", lambda uid: info[uid].get("wl", 0)),
            ("portfolio", "Has a portfolio", lambda uid: info[uid].get("pf", 0)),
            ("extra_portfolios", "More than one portfolio", lambda uid: info[uid].get("xp", 0)),
            ("alerts", "Price alert on", armed),
            ("push", "Push on a device", lambda uid: int(uid in push_users)),
            ("installed", "Installed the app", lambda uid: int(bool(info[uid].get("installed")))),
            ("ai", "Asked TopStock AI (ever)", lambda uid: int(info[uid].get("ai_count") or 0)
                or int(bool(info[uid].get("ai_last")))),
            ("ai_window", "Asked TopStock AI in this window", lambda uid: int(
                (ua.as_utc(info[uid].get("ai_last")) or datetime.min.replace(tzinfo=timezone.utc)) >= window_start)),
            ("screens", "Saved a screen", lambda uid: info[uid].get("screens", 0)),
            ("reminders", "Dividend reminder set", lambda uid: info[uid].get("reminders", 0)),
            ("rank_alerts", "Rank alert set", lambda uid: info[uid].get("rank_alerts", 0)),
            ("report_keys", "Used a free report key this month", keys_month),
        ]
        sized = {"watchlist", "portfolio", "alerts", "screens", "reminders"}
        rows = []
        for key, label, fn in defs:
            vals = [(uid, fn(uid)) for uid in uids]
            have = [(uid, v) for uid, v in vals if v]
            rows.append({
                "key": key,
                "label": label,
                "users": len(have),
                "pct": ua.pct(len(have), len(uids)),
                "active_users": sum(1 for uid, _ in have if uid in active),
                "pct_active": ua.pct(sum(1 for uid, _ in have if uid in active), len(active)),
                "median": ua.median(v for _, v in have) if key in sized else None,
            })
        return rows

    def _notified(uids: list[str]) -> dict:
        kinds_sent: Counter = Counter()
        kinds_users: Counter = Counter()
        sent = failed = reached = 0
        for uid in uids:
            row = push_by_user.get(uid)
            if not row:
                continue
            sent += row["sent"]
            failed += row["failed"]
            reached += bool(row["sent"])
            for k, n in row["kinds"].items():
                kinds_sent[k] += n
                kinds_users[k] += 1
        return {
            "push_sent": sent,
            "push_failed": failed,
            "push_users": reached,
            "email_sent": sum(email_by_user.get(uid, 0) for uid in uids),
            "email_users": sum(1 for uid in uids if email_by_user.get(uid)),
            "kinds": [{"kind": k, "label": ua.PUSH_KINDS.get(k, "Other"), "sent": n,
                       "users": kinds_users[k]} for k, n in kinds_sent.most_common()],
        }

    def _summary(g: str) -> dict:
        G = groups[g]
        uids = members[g]
        active = {uid for uid in uids if uid in usage}
        usages = [usage[uid] for uid in active]
        daily_active = [len(G.daily_users.get(d, ())) for d in window_days]
        return {
            "key": g,
            "label": ua.GROUP_LABELS[g],
            "accounts": len(uids),
            "active": {
                "today": len(G.daily_users.get(today_ord, ())),
                "d7": len(_active_since(G, today_ord, 7)),
                "window": len(active),
                "window_pct": ua.pct(len(active), len(uids)),
            },
            # Average active readers a day, as a share of the window's active readers.
            "stickiness": ua.pct(sum(daily_active) / days, len(active)),
            "usage": ua.usage_summary(usages),
            "intensity": ua.intensity([len(u.days) for u in usages], days),
            "daily": [{"date": date.fromordinal(d).isoformat(), "active": a,
                       "views": G.daily_views.get(d, 0)} for d, a in zip(window_days, daily_active)],
            "areas": ua.area_rows(G.area_users, G.area_views, len(active)),
            "pages": ua.top_rows(G.page_views, G.page_users, "path", 15),
            "stocks": ua.top_rows(G.stock_views, G.stock_users, "code", 10),
            "hours": {"matrix": G.hours, "max": max(max(r) for r in G.hours)},
            "sources": ua.top_rows(G.src_views, G.src_users, "src", 10),
            "setup": _setup(uids, active),
            "notified": _notified(uids),
        }

    summaries = {g: _summary(g) for g in ua.GROUPS}
    active7_all = _active_since(groups["all"], today_ord, 7)

    def _person(uid: str) -> dict:
        u = info[uid]
        us = usage.get(uid)
        vs = us.visit_list() if us else []
        caps = []
        if u["plan"] == "free":
            if u.get("wl", 0) >= (entitlements.FREE_LIMITS["watchlist"] or 10**9):
                caps.append("watchlist")
            if int((alerts.get(uid) or {}).get("armed") or 0) >= (entitlements.FREE_LIMITS["alerts"] or 10**9):
                caps.append("alerts")
        return {
            "name": (u.get("display_name") or "").strip() or None,
            "email": u.get("email") or None,
            "phone_only": bool(u.get("has_phone") and not u.get("email")),
            "signed_up": u["created"].isoformat() if u.get("created") else None,
            "last_seen": u["seen"].isoformat() if u.get("seen") else None,
            "active_days": len(us.days) if us else 0,
            "views": us.views if us else 0,
            "visits": len(vs),
            "minutes": sum(length for length, _ in vs),
            "active7": uid in active7_all,
            "top_areas": us.top_areas() if us else [],
            "premium_views": int(us.areas.get("premium", 0)) if us else 0,
            "holdings": u.get("pf", 0),
            "watchlist": u.get("wl", 0),
            "alerts": int((alerts.get(uid) or {}).get("armed") or 0),
            "push": uid in push_users,
            "installed": bool(u.get("installed")),
            "caps": caps,
        }

    # --- Premium ------------------------------------------------------------
    premium_uids = members["premium"]
    member_rows = []
    for uid in premium_uids:
        u = info[uid]
        ps = paid_by_user.get(uid, [])
        until = _dhaka_day(u.get("premium_until"))
        row = _person(uid)
        row.update({
            "plan": u["plan"],
            "plan_label": PLAN_WORDS.get(u.get("paid_plan") or "", "Paid") if u["plan"] == "paid"
            else SOURCE_WORDS.get(u.get("premium_source") or "", "Given"),
            "method": (ps[-1].get("method") if ps else None),
            "paid_total": sum(int(p.get("amount") or 0) for p in ps),
            "payments": len(ps),
            "first_paid": _dhaka_day(ps[0].get("created_at")).isoformat() if ps and ps[0].get("created_at") else None,
            "until": until.isoformat() if until else None,
            "days_left": (until - today).days if until else None,
        })
        member_rows.append(row)
    member_rows.sort(key=lambda r: (r["until"] or "9999", r["name"] or ""))

    renew_input = [{"until": date.fromisoformat(r["until"]) if r["until"] else None, "plan": r["plan"],
                    "active7": r["active7"], "push": r["push"]} for r in member_rows]
    lapsed_paid = sum(
        1 for uid, u in info.items()
        if uid in paid_by_user and u["plan"] == "free" and ua.as_utc(u.get("premium_until"))
        and ua.as_utc(u.get("premium_until")) > now - timedelta(days=30)
    )

    def _sum(ps):
        return sum(int(p.get("amount") or 0) for p in ps)

    in_window = [p for p in accepted if (ua.as_utc(p.get("created_at")) or now) >= window_start]
    in_month = [p for p in accepted if (_dhaka_day(p.get("created_at")) or today) >= month_start]
    by_plan: dict[str, list] = defaultdict(list)
    by_method: dict[str, list] = defaultdict(list)
    for p in accepted:
        by_plan[p.get("plan") or "other"].append(p)
        by_method[p.get("method") or "other"].append(p)

    revenue = {
        "total": _sum(accepted),
        "payments": len(accepted),
        "buyers": len(paid_by_user),
        "window": _sum(in_window),
        "window_payments": len(in_window),
        "month": _sum(in_month),
        "month_payments": len(in_month),
        "repeat_buyers": sum(1 for ps in paid_by_user.values() if len(ps) >= 2),
        "pending": sum(1 for p in payments if p.get("status") == "pending"),
        "revoked": sum(1 for p in payments if p.get("status") == "revoked"),
        "by_plan": sorted(
            [{"key": k, "label": PLAN_WORDS.get(k, k), "payments": len(v), "amount": _sum(v)}
             for k, v in by_plan.items()], key=lambda r: -r["amount"]),
        "by_method": sorted(
            [{"key": k, "label": {"bkash": "bKash", "nagad": "Nagad", "bank": "Bank transfer"}.get(k, k.title()),
              "payments": len(v), "amount": _sum(v)} for k, v in by_method.items()],
            key=lambda r: -r["amount"]),
    }

    # Conversion: who paid, how long after signing up, and what they did first.
    lags, before_areas, before_srcs, covered = [], Counter(), Counter(), 0
    pairs = []
    for uid, t in first_paid.items():
        u = info.get(uid)
        if not u:
            continue
        paid_day = t.astimezone(ua.DHAKA).date()
        if u.get("created"):
            lags.append((paid_day - u["created"]).days)
        if t - timedelta(hours=24) >= start90:
            evs = [e for e in payer_events.get(uid, []) if t - timedelta(hours=24) <= e[0] <= t]
            if evs:
                covered += 1
                for a in {e[1] for e in evs}:
                    before_areas[a] += 1
                for s in {e[2] for e in evs if e[2]}:
                    before_srcs[s] += 1
        if t - timedelta(days=14) >= start90:
            ba = ua.before_after(payer_days.get(uid, set()), paid_day.toordinal(), today_ord)
            if ba:
                pairs.append(ba)

    free_active = {uid for uid in members["free"] if uid in usage}
    free_visited = [uid for uid in free_active if usage[uid].areas.get("premium")]
    bought = [uid for uid, t in first_paid.items() if uid in info and t >= window_start]
    conversion = {
        "payers": len([uid for uid in first_paid if uid in info]),
        "signup_to_pay": ua.signup_to_pay(lags),
        "before": {
            "payers": covered,
            "areas": [{"key": k, "label": ua.AREA_LABELS.get(k, k), "users": n}
                      for k, n in before_areas.most_common() if k != "admin"],
            "sources": [{"src": s, "users": n} for s, n in before_srcs.most_common(8)],
        },
        "premium_page": {
            "free_active": len(free_active),
            "free_visited": len(free_visited),
            "free_visit_views": ua.median(usage[uid].areas["premium"] for uid in free_visited),
            "bought": len(bought),
            "bought_visited": sum(1 for uid in bought if uid in usage and usage[uid].areas.get("premium")),
        },
        "before_after": {
            "span": 14,
            "payers": len(pairs),
            "before": ua.mean(b for b, _ in pairs),
            "after": ua.mean(a for _, a in pairs),
        },
    }

    # --- Free -------------------------------------------------------------
    free_uids = members["free"]
    lapsed = [uid for uid in free_uids if uid in paid_by_user or info[uid].get("trial_started_at")
              or info[uid].get("premium_until")]
    lapsed_set = set(lapsed)
    free_rows = [{**_person(uid), "lapsed": uid in lapsed_set} for uid in free_active]
    leads = sorted(free_rows, key=lambda r: (-r["active_days"], -r["views"]))[:LEADS]
    keys_month = [sum(1 for t in info[uid].get("keys") or [] if (_dhaka_day(t) or date.min) >= month_start)
                  for uid in free_uids]
    free_src = summaries["free"]["sources"]
    free = {
        "limits": {
            "watchlist_cap": entitlements.FREE_LIMITS["watchlist"],
            "alerts_cap": entitlements.FREE_LIMITS["alerts"],
            "at_watchlist_cap": sum(1 for uid in free_uids
                                    if info[uid].get("wl", 0) >= (entitlements.FREE_LIMITS["watchlist"] or 10**9)),
            "at_watchlist_cap_active": sum(1 for uid in free_active
                                           if info[uid].get("wl", 0) >= (entitlements.FREE_LIMITS["watchlist"] or 10**9)),
            "at_alerts_cap": sum(1 for uid in free_uids
                                 if int((alerts.get(uid) or {}).get("armed") or 0) >= (entitlements.FREE_LIMITS["alerts"] or 10**9)),
            "report_key_users": sum(1 for n in keys_month if n),
            "report_keys_used": sum(keys_month),
            "report_keys_per_month": 3,
        },
        "interest": {
            "visited_premium": len(free_visited),
            "premium_views": sum(usage[uid].areas["premium"] for uid in free_visited),
            "offer_dismissed": sum(1 for uid in free_uids if info[uid].get("offer_dismissed_at")),
            "offer_later": sum(1 for uid in free_uids if info[uid].get("offer_remind_after")),
            "taps": free_src,
        },
        "lapsed": {
            "accounts": len(lapsed),
            "paid_before": sum(1 for uid in lapsed if uid in paid_by_user),
            "active": sum(1 for uid in lapsed if uid in free_active),
        },
        "leads": leads,
    }

    # --- Everyone (the earlier page's panels, admins now left out) ----------
    total = len(info)
    all_g = groups["all"]
    dau = len(all_g.daily_users.get(today_ord, ()))
    wau = len(_active_since(all_g, today_ord, 7))
    mau = len(_active_since(all_g, today_ord, 30)) if days >= 30 else _safe(lambda: _distinct_since(30), 0)
    signups_by_day: Counter = Counter()
    segments: Counter = Counter()
    retention = {n: [0, 0] for n in (1, 7, 30)}
    returned = built_wl = added_pf = power = google = 0
    new_today = new_7d = new_30d = 0
    for uid, u in info.items():
        created, seen = u.get("created"), u.get("seen")
        age = (today - created).days if created else None
        age_seen = (today - seen).days if seen else None
        if age is not None and age < 7:
            segments["new"] += 1
        elif age_seen is not None and age_seen < 7:
            segments["active"] += 1
        elif age_seen is not None and age_seen < 30:
            segments["at_risk"] += 1
        else:
            segments["dormant"] += 1
        google += bool(u.get("google"))
        if created:
            signups_by_day[created] += 1
            new_today += age == 0
            new_7d += age < 7
            new_30d += age < 30
            for n, cell in retention.items():
                if age >= n:
                    cell[0] += 1
                    if seen and seen >= created + timedelta(days=n):
                        cell[1] += 1
            returned += bool(seen and seen > created)
        built_wl += u.get("wl", 0) > 0
        added_pf += u.get("pf", 0) > 0
        if (uid in push_users or u.get("push_enabled") or u.get("installed")
                or u.get("ai_count") or u.get("ai_last") or uid in alerts):
            power += 1

    growth = []
    for i in range(89, -1, -1):
        d = today - timedelta(days=i)
        growth.append({"date": d.isoformat(), "signups": signups_by_day.get(d, 0),
                       "active": growth_active.get(d.isoformat(), 0)})

    def _count(q):
        return _safe(lambda: db["users"].count_documents(q), 0)

    s_all = summaries["all"]
    return {
        "generated_at": now.isoformat(),
        "window_days": days,
        "admins_left_out": len(admin_uids),
        "plans": {p: len(members[p]) for p in ua.PLANS},
        "groups": summaries,
        "headline": {
            "total_users": total,
            "new_today": new_today,
            "new_7d": new_7d,
            "new_30d": new_30d,
            "dau": dau,
            "wau": wau,
            "mau": mau,
            "stickiness": ua.pct(dau, mau),
        },
        "growth": growth,
        "retention": {
            f"d{n}": {"eligible": e, "retained": r, "pct": ua.pct(r, e)}
            for n, (e, r) in retention.items()
        },
        "segments": {k: segments.get(k, 0) for k in ("new", "active", "at_risk", "dormant")},
        "activation": {
            "signed_up": total,
            "returned": returned,
            "built_watchlist": built_wl,
            "added_portfolio": added_pf,
            "power_feature": power,
        },
        "features": {
            "push": sum(1 for uid in info if uid in push_users),
            "installed": sum(1 for u in info.values() if u.get("installed")),
            "alerts": sum(1 for uid in info if uid in alerts),
            "ai": sum(1 for u in info.values() if u.get("ai_count") or u.get("ai_last")),
        },
        "premium": {
            "active": len(premium_uids),
            "paid": len(members["paid"]),
            "on_trial": sum(1 for uid in members["gifted"] if info[uid].get("premium_source") == "trial"),
            "granted": sum(1 for uid in members["gifted"] if info[uid].get("premium_source") != "trial"),
            "payments_pending": revenue["pending"],
            "trials_started": sum(1 for u in info.values() if u.get("trial_started_at")),
            "trials_7d": _count({"trial_started_at": {"$gte": now - timedelta(days=7)}}),
            "trials_ended": sum(1 for u in info.values() if u.get("trial_started_at") and u["plan"] == "free"),
            "lapsed_30d": lapsed_paid,
            "revenue": revenue,
            "members": member_rows,
            "renewals": ua.renewal_weeks(renew_input, today),
            "conversion": conversion,
        },
        "free": free,
        # The earlier page's panels, read from the "Everyone" group.
        "sections": [{"category": r["label"], "views": r["views"], "users": r["users"]}
                     for r in sorted(s_all["areas"], key=lambda r: -r["views"])],
        "stocks": {
            "viewed": s_all["stocks"],
            "watched": _safe(lambda: _top_codes(db["users"], "$watchlist"), []),
            "held": _safe(lambda: _top_codes(db["users"], "$portfolio.trading_code"), []),
        },
        "active_hours": s_all["hours"],
        "signup_source": {"google": google, "password": total - google},
        "notifications": [{"src": r["src"], "views": r["views"], "users": r["users"]}
                          for r in s_all["sources"]],
    }
