"""Admin analytics — the pure parts (tests: backend/tests/test_usage_analytics.py).

The short admin page (2026-11-13): headline numbers, 30 days of sign-ups and
active readers, Premium money and who ends soon, Free vs Premium side by side,
and what readers opened in the last 7 days. Mongo reads live in
``usage_analytics_service.py``; it counts inside Mongo and hands these helpers
small rows (one per active reader at most), never the raw page views.

Page views come from ``user_events`` (signed-in readers only, one row per
reader × path × minute with a ``count``, kept 90 days).
"""
from __future__ import annotations

import re
from datetime import date, datetime, timedelta, timezone
from statistics import median as _median
from typing import Iterable, Optional

DHAKA = timezone(timedelta(hours=6))
WINDOW_DAYS = 30
AREA_DAYS = 7
ENDING_DAYS = 14


def as_utc(v) -> Optional[datetime]:
    """Mongo hands back naive UTC datetimes; make them aware."""
    if not isinstance(v, datetime):
        return None
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


def dhaka_day(v) -> Optional[date]:
    t = as_utc(v)
    return t.astimezone(DHAKA).date() if t else None


def plan_of(premium_until, premium_source, now: datetime) -> str:
    """paid = Premium today on a bought plan; gifted = Premium today from the old
    free month or an admin grant; free = everyone else (lapsed included)."""
    until = as_utc(premium_until)
    if not until or until <= now:
        return "free"
    return "paid" if premium_source == "paid" else "gifted"


# ---------------------------------------------------------------------------
# Paths → areas
# ---------------------------------------------------------------------------

# (key, label, regex). Ordered; the first match wins. Run in Mongo through
# `area_switch()`, so keep the patterns plain (PCRE and Python agree on them).
AREAS: list[tuple[str, str, str]] = [
    ("home", "Home / dashboard", r"^/$"),
    # The place pages the bottom bar opens (2026-11-20, frontend lib/places.ts).
    # /find was one until the Lists page replaced it (2026-11-25).
    ("places", "Place pages (Market, old Find)", r"^/(market|find)/?$"),
    ("stock", "Stock pages", r"^/stock/"),
    ("statement", "Yearly statement", r"^/portfolio/statement"),
    ("portfolio", "Portfolio", r"^/portfolio(/|$)"),
    # My shares (/my, 2026-11-25): the one list of owned + watched shares; the
    # watchlist page folded into it, so its old visits count here too.
    ("watchlist", "My shares (and the old watchlist)", r"^/(my|watchlist)(/|$)"),
    ("notifications", "Updates (notifications)", r"^/(notifications|desk)"),
    ("alerts", "Watch rules and price alerts", r"^/(watch-rules|alerts)"),
    ("ranking", "Company ranking", r"^/dsestockranking"),
    # Lists (2026-11-25): the Lists page, where the screener's ready lists open.
    ("screener", "Lists page (and the old screener)", r"^/(lists|screener|my-lists|stock-recommendation)"),
    ("compare", "Compare stocks", r"^/compare-stocks"),
    ("lists", "Premium research", r"^/stock-insights"),
    ("dividends", "Dividend calendar", r"^/dividend-calendar"),
    ("results", "Results", r"^/results"),
    ("market", "Market pages", r"^/(market-analysis|market-intelligence|dse-today|share-bazar|todays-news"
                               r"|dse-trending-stocks|dse-popular-stocks|market)"),
    ("sectors", "Sectors", r"^/sectors?(/|$)"),
    ("stocks", "All stocks", r"^/stocks(/|$)"),
    ("buylist", "Buy List", r"^/buy-list"),
    ("builder", "Portfolio builder", r"^/portfolio-builder"),
    ("discover", "Based on your shares", r"^/(for-you|discover|picked-for-you)"),
    ("signals", "Buy signals (old page)", r"^/(buy-sell-signals|top-picks|daily-tips)"),
    ("samples", "Sample portfolios", r"^/sample-portfolio"),
    ("premium", "Premium page", r"^/(premium|refund-policy)"),
    ("learn", "Learn & blog", r"^/(learn|blog|about)"),
    ("account", "Account & sign-in", r"^/(profile|login|register)"),
    ("admin", "Admin", r"^/admin"),
]
AREA_LABELS = {k: label for k, label, _ in AREAS} | {"other": "Other"}
_AREA_RX = [(k, re.compile(rx)) for k, _, rx in AREAS]
STOCK_RX = r"^/stock/([^/?#]+)"
_STOCK_RX = re.compile(STOCK_RX)


def bare(path: str) -> str:
    return (path or "").split("?", 1)[0].split("#", 1)[0] or "/"


def area_of(path: str) -> str:
    p = bare(path)
    for key, rx in _AREA_RX:
        if rx.search(p):
            return key
    return "other"


def stock_of(path: str) -> Optional[str]:
    m = _STOCK_RX.match(bare(path))
    code = m.group(1).strip().upper() if m else ""
    return code or None


def bare_expr(field: str = "$path") -> dict:
    """Mongo: the path without its query or hash (the same as `bare`)."""
    no_q = {"$arrayElemAt": [{"$split": [{"$ifNull": [field, "/"]}, "?"]}, 0]}
    no_h = {"$arrayElemAt": [{"$split": [no_q, "#"]}, 0]}
    return {"$cond": [{"$eq": [no_h, ""]}, "/", no_h]}


def area_switch(field: str | dict = "$p") -> dict:
    """Mongo: the area key of a bare path (the same as `area_of`)."""
    return {"$switch": {
        "branches": [{"case": {"$regexMatch": {"input": field, "regex": rx}}, "then": key}
                     for key, _, rx in AREAS],
        "default": "other",
    }}


# ---------------------------------------------------------------------------
# Small maths
# ---------------------------------------------------------------------------

def median(xs: Iterable[float]) -> float:
    xs = list(xs)
    return round(float(_median(xs)), 1) if xs else 0.0


def pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


# ---------------------------------------------------------------------------
# Readers' active days → the page's figures
# ---------------------------------------------------------------------------

def active_figures(user_days: dict[str, list[str]], premium: set[str], today: date,
                   window: int = WINDOW_DAYS) -> dict:
    """`user_days` = {uid: ["YYYY-MM-DD", …]} (Dhaka days with a page view in the
    window). Returns the active counts for everyone / free / premium, each
    group's median active days, the readers per day, and each reader's last day."""
    t = today.isoformat()
    d7 = (today - timedelta(days=6)).isoformat()
    groups = {g: {"today": 0, "d7": 0, "d30": 0, "days": []} for g in ("all", "free", "premium")}
    per_day: dict[str, int] = {}
    last: dict[str, str] = {}
    for uid, days in user_days.items():
        days = sorted(set(days))
        if not days:
            continue
        last[uid] = days[-1]
        for d in days:
            per_day[d] = per_day.get(d, 0) + 1
        for g in ("all", "premium" if uid in premium else "free"):
            G = groups[g]
            G["d30"] += 1
            G["d7"] += days[-1] >= d7
            G["today"] += days[-1] == t
            G["days"].append(len(days))
    out = {g: {"today": v["today"], "d7": v["d7"], "d30": v["d30"], "median_days": median(v["days"])}
           for g, v in groups.items()}
    return {"groups": out, "per_day": per_day, "last": last}


def growth_series(today: date, signups: dict[str, int], active: dict[str, int],
                  days: int = WINDOW_DAYS) -> list[dict]:
    out = []
    for i in range(days - 1, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        out.append({"date": d, "signups": int(signups.get(d, 0)), "active": int(active.get(d, 0))})
    return out


# ---------------------------------------------------------------------------
# Premium
# ---------------------------------------------------------------------------

def money_summary(payments: list[dict], now: datetime) -> dict:
    """Accepted payments → this month (Dhaka), all time, buyers, repeat buyers
    and readers whose first payment is in the last 30 days."""
    month_start = now.astimezone(DHAKA).date().replace(day=1)
    since30 = now - timedelta(days=30)
    first: dict[str, datetime] = {}
    count: dict[str, int] = {}
    month = month_n = total = 0
    for p in payments:
        amt = int(p.get("amount") or 0)
        total += amt
        t = as_utc(p.get("created_at"))
        if t and t.astimezone(DHAKA).date() >= month_start:
            month += amt
            month_n += 1
        uid = p.get("user_id")
        if not uid:
            continue
        count[uid] = count.get(uid, 0) + 1
        if t and (uid not in first or t < first[uid]):
            first[uid] = t
    return {
        "month": month,
        "month_payments": month_n,
        "total": total,
        "payments": len(payments),
        "buyers": len(count),
        "repeat_buyers": sum(1 for n in count.values() if n >= 2),
        "new_buyers_30d": sum(1 for t in first.values() if t >= since30),
    }


# The plans readers buy (payments.PAID_PLANS + the own-offer month), in the
# order the page shows them. `halfyearly` was sold 2026-10-27 → 11-13 and is
# still counted while its buyers have days left.
PLAN_LABELS = [
    ("monthly", "1 month"),
    ("quarterly", "3 months"),
    ("halfyearly", "6 months"),
    ("yearly", "1 year"),
    ("offer", "৳99 first month"),
]


def plan_counts(members: list[dict]) -> list[dict]:
    """Paying members (premium_source "paid") by the plan they bought last
    (`users.paid_plan`). Always the five plans, then "Other" when there is any."""
    counts: dict[str, int] = {}
    for m in members:
        if m.get("premium_source") != "paid":
            continue
        key = m.get("paid_plan") or "other"
        key = key if key in dict(PLAN_LABELS) else "other"
        counts[key] = counts.get(key, 0) + 1
    rows = [{"key": k, "label": label, "members": counts.get(k, 0)} for k, label in PLAN_LABELS]
    if counts.get("other"):
        rows.append({"key": "other", "label": "Other", "members": counts["other"]})
    return rows


def ending_soon(members: list[dict], today: date, last_active: dict[str, str],
                push_users: set[str], days: int = ENDING_DAYS) -> list[dict]:
    """Premium readers whose Premium ends within `days` (today included), soonest
    first. `members` rows: {user_id, name, contact, plan, until (datetime),
    last_seen_at}."""
    week_ago = today - timedelta(days=6)
    out = []
    for m in members:
        until = dhaka_day(m.get("until"))
        if not until or not (today <= until < today + timedelta(days=days)):
            continue
        uid = m.get("user_id")
        last = last_active.get(uid)
        seen = (date.fromisoformat(last) >= week_ago) if last else bool(
            (dhaka_day(m.get("last_seen_at")) or date.min) >= week_ago)
        out.append({
            "name": m.get("name") or None,
            "contact": m.get("contact") or None,
            "plan": m.get("plan"),
            "until": until.isoformat(),
            "days_left": (until - today).days,
            "seen_7d": seen,
            "push": uid in push_users,
        })
    out.sort(key=lambda r: (r["until"], r["name"] or ""))
    return out


# How long each plan runs, to tell a move up from a move down. A plan not here
# (an admin's custom days) is read from the payment's own `days`.
PLAN_DAYS = {"offer": 30, "monthly": 30, "quarterly": 90, "halfyearly": 180, "yearly": 365}
RENEW_WAIT_DAYS = 7  # after a plan ends, how long before "not renewed" counts as lapsed


def renewal_rows(payments: list[dict], now: datetime, wait_days: int = RENEW_WAIT_DAYS) -> dict:
    """What happened when each bought plan ran out, by the plan bought.

    `payments`: granted payments (accepted, or pending and granted) with
    user_id, plan, days, created_at, premium_until_after (the day that
    payment's Premium ran to). For each payment:
    - the reader paid again later → renewed (same length), moved up (longer)
      or moved down (shorter); early when the next payment came before the end;
    - else its end is more than `wait_days` behind us → lapsed;
    - else its end has passed → waiting (may still renew);
    - else it is still running → not counted.
    `rate` = renewed + up + down over those plus lapsed (waiting left out)."""
    by_user: dict[str, list[dict]] = {}
    for p in payments:
        if p.get("user_id") and as_utc(p.get("created_at")):
            by_user.setdefault(p["user_id"], []).append(p)
    labels = dict(PLAN_LABELS)
    keys = [k for k, _ in PLAN_LABELS]
    blank = lambda: {"renewed": 0, "up": 0, "down": 0, "early": 0, "lapsed": 0,  # noqa: E731
                     "waiting": 0, "running": 0, "to": {}}
    stats: dict[str, dict] = {}
    cutoff = now - timedelta(days=wait_days)

    def length(p: dict) -> int:
        return PLAN_DAYS.get(p.get("plan")) or int(p.get("days") or 0)

    for rows in by_user.values():
        rows.sort(key=lambda p: as_utc(p["created_at"]))
        for i, p in enumerate(rows):
            end = as_utc(p.get("premium_until_after"))
            if not end:
                continue
            key = p.get("plan") if p.get("plan") in labels else "other"
            s = stats.setdefault(key, blank())
            nxt = rows[i + 1] if i + 1 < len(rows) else None
            if nxt:
                a, b = length(p), length(nxt)
                s["up" if b > a else "down" if b < a else "renewed"] += 1
                if as_utc(nxt["created_at"]) < end:
                    s["early"] += 1
                to = nxt.get("plan") if nxt.get("plan") in labels else "other"
                s["to"][to] = s["to"].get(to, 0) + 1
            elif end <= cutoff:
                s["lapsed"] += 1
            elif end <= now:
                s["waiting"] += 1
            else:
                s["running"] += 1

    def finish(key: str, label: str, s: dict) -> dict:
        kept = s["renewed"] + s["up"] + s["down"]
        decided = kept + s["lapsed"]
        return {
            "key": key, "label": label, **{k: v for k, v in s.items() if k != "to"},
            "kept": kept, "decided": decided,
            "rate": pct(kept, decided) if decided else None,
            "to": [{"key": k, "label": labels.get(k, "Other"), "n": n}
                   for k, n in sorted(s["to"].items(), key=lambda kv: (-kv[1], kv[0]))],
        }

    rows_out = [finish(k, labels[k], stats[k]) for k in keys if k in stats]
    if "other" in stats:
        rows_out.append(finish("other", "Other", stats["other"]))
    total = blank()
    for s in stats.values():
        for k in total:
            if k != "to":
                total[k] += s[k]
        for k, n in s["to"].items():
            total["to"][k] = total["to"].get(k, 0) + n
    return {"wait_days": wait_days, "plans": rows_out, "total": finish("all", "All plans", total)}


# ---------------------------------------------------------------------------
# What readers opened
# ---------------------------------------------------------------------------

def area_rows(rows: list[dict], active7: dict[str, int]) -> list[dict]:
    """`rows` from Mongo: {area, premium: bool, users}. One row per area with
    free and Premium readers and each as a share of that group's readers
    active in the 7 days. Admin pages are left out; biggest reach first."""
    by: dict[str, dict] = {}
    for r in rows:
        key = r.get("area") or "other"
        if key == "admin":
            continue
        row = by.setdefault(key, {"key": key, "label": AREA_LABELS.get(key, key), "free": 0, "premium": 0})
        row["premium" if r.get("premium") else "free"] += int(r.get("users") or 0)
    out = []
    for row in by.values():
        row["free_pct"] = pct(row["free"], active7.get("free", 0))
        row["premium_pct"] = pct(row["premium"], active7.get("premium", 0))
        out.append(row)
    out.sort(key=lambda r: (-(r["free"] + r["premium"]), r["label"]))
    return out
