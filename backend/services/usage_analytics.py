"""Admin usage analytics — the pure parts (tests: backend/tests/test_usage_analytics.py).

Which plan a reader is on, which product area a page path belongs to, how one
reader's page views turn into active days and visits, and how a group of
readers is summed up. Mongo reads live in ``usage_analytics_service.py``.

Page views come from ``user_events`` (signed-in readers only, one row per
reader × path × minute with a ``count``, kept 90 days). A *visit* is a run of
page views with no gap over ``VISIT_GAP_MIN`` minutes; its length runs from the
first page to the last, so a one-page visit counts as one minute. Time figures
are therefore estimates, and the page says so.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from statistics import median as _median
from typing import Iterable, Optional

DHAKA = timezone(timedelta(hours=6))
VISIT_GAP_MIN = 30
WINDOWS = (7, 30, 90)

# ---------------------------------------------------------------------------
# Plans and groups
# ---------------------------------------------------------------------------

PLANS = ("paid", "gifted", "free")
GROUPS = ("all", "premium", "paid", "gifted", "free")
GROUP_LABELS = {
    "all": "Everyone",
    "premium": "All Premium",
    "paid": "Paying",
    "gifted": "Free month / given",
    "free": "Free",
}


def as_utc(v) -> Optional[datetime]:
    """Mongo hands back naive UTC datetimes; make them aware."""
    if not isinstance(v, datetime):
        return None
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


def plan_of(premium_until, premium_source, now: datetime) -> str:
    """paid = Premium today on a bought plan; gifted = Premium today from the old
    free month or an admin grant; free = everyone else (lapsed included)."""
    until = as_utc(premium_until)
    if not until or until <= now:
        return "free"
    return "paid" if premium_source == "paid" else "gifted"


def groups_of(plan: str) -> tuple[str, ...]:
    if plan in ("paid", "gifted"):
        return ("all", "premium", plan)
    return ("all", plan)


# ---------------------------------------------------------------------------
# Paths → areas, pages, stocks, sources
# ---------------------------------------------------------------------------

# (key, label, regex). Ordered; the first match wins.
AREAS: list[tuple[str, str, str]] = [
    ("home", "Home / dashboard", r"^/$"),
    ("stock", "Stock pages", r"^/stock/"),
    ("statement", "Yearly statement", r"^/portfolio/statement"),
    ("portfolio", "Portfolio", r"^/portfolio(/|$)"),
    ("watchlist", "Watchlist", r"^/watchlist"),
    ("notifications", "Notifications", r"^/(notifications|desk)"),
    ("alerts", "Price alerts", r"^/alerts"),
    ("assistant", "TopStock AI", r"^/assistant"),
    ("ranking", "Company ranking", r"^/dsestockranking"),
    ("screener", "Stock screener", r"^/(screener|my-lists|stock-recommendation)"),
    ("lists", "Research & stock lists", r"^/stock-insights"),
    ("dividends", "Dividend calendar", r"^/dividend-calendar"),
    ("results", "Results", r"^/results"),
    ("market", "Market pages", r"^/(market-analysis|market-intelligence|dse-today|share-bazar|todays-news"
                               r"|dse-trending-stocks|dse-popular-stocks|market)"),
    ("sectors", "Sectors", r"^/sectors?(/|$)"),
    ("stocks", "All stocks", r"^/stocks(/|$)"),
    ("signals", "Buy signals (old page)", r"^/(buy-sell-signals|top-picks|daily-tips)"),
    ("samples", "Sample portfolios", r"^/sample-portfolio"),
    ("premium", "Premium page", r"^/(premium|refund-policy)"),
    ("learn", "Learn & blog", r"^/(learn|blog|about)"),
    ("account", "Account & sign-in", r"^/(profile|login|register)"),
    ("admin", "Admin", r"^/admin"),
]
AREA_LABELS = {k: label for k, label, _ in AREAS} | {"other": "Other"}
_AREA_RX = [(k, re.compile(rx)) for k, _, rx in AREAS]

_SRC_RX = re.compile(r"[?&]src=([^&#]+)")
_STOCK_RX = re.compile(r"^/stock/([^/?#]+)")
_SLUG_RX = re.compile(r"^/(learn|blog|sector|stock-insights|sample-portfolio)/[^/?#]+")


def bare(path: str) -> str:
    return (path or "").split("?", 1)[0].split("#", 1)[0] or "/"


def area_of(path: str) -> str:
    p = bare(path)
    for key, rx in _AREA_RX:
        if rx.search(p):
            return key
    return "other"


def page_of(path: str) -> str:
    """One row per page *kind*: query dropped, codes and slugs folded."""
    p = bare(path)
    p = _STOCK_RX.sub("/stock/[code]", p)
    p = _SLUG_RX.sub(lambda m: f"/{m.group(1)}/[slug]", p)
    return p.rstrip("/") or "/"


def stock_of(path: str) -> Optional[str]:
    m = _STOCK_RX.match(bare(path))
    code = m.group(1).strip().upper() if m else ""
    return code or None


def src_of(path: str) -> Optional[str]:
    """Where a tagged deep link came from (`?src=push-digest`, `offer-banner` …)."""
    m = _SRC_RX.search(path or "")
    return m.group(1)[:40] if m else None


# Push campaign ids are `<kind>-<uid>-<day>`; the kind is everything before the
# first dash.
PUSH_KINDS = {
    "digest": "Daily digest",
    "evt": "Stock events",
    "pwatch": "Premium watcher",
    "pteaser": "Free teaser",
    "pa": "Price alerts",
    "psig": "Buy more / Sell",
    "rank": "Rank alerts",
    "clist": "Saved screens",
    "brief": "Morning brief",
    "letter": "Friday letter",
    "grade": "Grade change",
    "premiumrenew": "Renewal reminder",
    "trialrecap": "Free-month recap",
}


def push_kind(campaign_id: str) -> str:
    head = (campaign_id or "").split("-", 1)[0]
    return head if head in PUSH_KINDS else "other"


# ---------------------------------------------------------------------------
# Small maths
# ---------------------------------------------------------------------------

def median(xs: Iterable[float]) -> float:
    xs = list(xs)
    return round(float(_median(xs)), 1) if xs else 0.0


def mean(xs: Iterable[float]) -> float:
    xs = list(xs)
    return round(sum(xs) / len(xs), 1) if xs else 0.0


def pct(part: float, whole: float) -> float:
    return round(part / whole * 100, 1) if whole else 0.0


def spread(xs: list[float]) -> dict:
    return {"mean": mean(xs), "median": median(xs)}


# Active-days buckets per window, (label, lo, hi) inclusive; hi None = open.
_EDGES = {
    7: [("1 day", 1, 1), ("2 days", 2, 2), ("3–4 days", 3, 4), ("5–6 days", 5, 6), ("Every day", 7, None)],
    30: [("1 day", 1, 1), ("2–3 days", 2, 3), ("4–7 days", 4, 7), ("8–14 days", 8, 14), ("15+ days", 15, None)],
    90: [("1 day", 1, 1), ("2–5 days", 2, 5), ("6–20 days", 6, 20), ("21–45 days", 21, 45), ("46+ days", 46, None)],
}


def intensity(day_counts: Iterable[int], window: int) -> list[dict]:
    edges = _EDGES.get(window) or _EDGES[30]
    counts = [0] * len(edges)
    for n in day_counts:
        for i, (_, lo, hi) in enumerate(edges):
            if n >= lo and (hi is None or n <= hi):
                counts[i] += 1
                break
    return [{"label": label, "users": c} for (label, _, _), c in zip(edges, counts)]


# ---------------------------------------------------------------------------
# One reader's page views
# ---------------------------------------------------------------------------

def visits(minute_views: dict[int, int]) -> list[tuple[int, int]]:
    """[(length_minutes, views)] — a visit ends after a gap over VISIT_GAP_MIN."""
    out: list[tuple[int, int]] = []
    if not minute_views:
        return out
    mins = sorted(minute_views)
    start = prev = mins[0]
    views = minute_views[start]
    for m in mins[1:]:
        if m - prev > VISIT_GAP_MIN:
            out.append((prev - start + 1, views))
            start, views = m, 0
        views += minute_views[m]
        prev = m
    out.append((prev - start + 1, views))
    return out


@dataclass
class Usage:
    """One reader's page views inside the window."""
    days: set = field(default_factory=set)              # Dhaka date ordinals
    views: int = 0
    minutes: dict = field(default_factory=dict)         # epoch minute → views
    areas: Counter = field(default_factory=Counter)     # area → views

    def add(self, day_ord: int, minute: int, area: str, count: int) -> None:
        self.days.add(day_ord)
        self.views += count
        self.minutes[minute] = self.minutes.get(minute, 0) + count
        self.areas[area] += count

    def visit_list(self) -> list[tuple[int, int]]:
        return visits(self.minutes)

    def top_areas(self, n: int = 3) -> list[str]:
        return [AREA_LABELS.get(k, k) for k, _ in self.areas.most_common() if k != "admin"][:n]


def usage_summary(usages: list[Usage]) -> dict:
    """How much a group's active readers use the site (per reader, then per visit)."""
    days, views, visit_n, time_total, visit_len, visit_pages = [], [], [], [], [], []
    for u in usages:
        vs = u.visit_list()
        days.append(len(u.days))
        views.append(u.views)
        visit_n.append(len(vs))
        time_total.append(sum(length for length, _ in vs))
        visit_len.extend(length for length, _ in vs)
        visit_pages.extend(v for _, v in vs)
    return {
        "days": spread(days),
        "views": spread(views),
        "visits": spread(visit_n),
        "minutes": spread(time_total),       # estimated minutes on the site in the window
        "visit_minutes": spread(visit_len),  # per visit
        "visit_pages": spread(visit_pages),  # per visit
        "total_views": sum(views),
        "total_visits": sum(visit_n),
    }


def area_rows(areas_users: dict[str, set], areas_views: Counter, active: int) -> list[dict]:
    """Reach first: how many of the group's active readers opened each area."""
    rows = []
    for key, users in areas_users.items():
        if key == "admin" or not users:
            continue
        v = areas_views.get(key, 0)
        rows.append({
            "key": key,
            "label": AREA_LABELS.get(key, key),
            "users": len(users),
            "reach": pct(len(users), active),
            "views": v,
            "per_user": round(v / len(users), 1),
        })
    rows.sort(key=lambda r: (-r["users"], -r["views"]))
    return rows


def top_rows(views: Counter, users: dict[str, set], key: str, limit: int) -> list[dict]:
    rows = [{key: k, "views": v, "users": len(users.get(k, ()))} for k, v in views.most_common(limit)]
    return rows


# ---------------------------------------------------------------------------
# Premium: paying, renewals, conversion
# ---------------------------------------------------------------------------

_PAY_LAG = [("Same day", 0, 0), ("1–7 days", 1, 7), ("8–30 days", 8, 30),
            ("1–3 months", 31, 90), ("3+ months", 91, None)]


def signup_to_pay(lags: Iterable[int]) -> list[dict]:
    counts = [0] * len(_PAY_LAG)
    for n in lags:
        n = max(0, n)
        for i, (_, lo, hi) in enumerate(_PAY_LAG):
            if n >= lo and (hi is None or n <= hi):
                counts[i] += 1
                break
    return [{"label": label, "users": c} for (label, _, _), c in zip(_PAY_LAG, counts)]


def renewal_weeks(members: list[dict], today: date, weeks: int = 8) -> list[dict]:
    """Premium end dates bucketed into the next `weeks` 7-day spans from today.
    `members` rows: {until: date, plan: paid|gifted, active7: bool, push: bool}."""
    out = []
    for w in range(weeks):
        start = today + timedelta(days=7 * w)
        end = start + timedelta(days=6)
        rows = [m for m in members if m.get("until") and start <= m["until"] <= end]
        paid = [m for m in rows if m["plan"] == "paid"]
        out.append({
            "start": start.isoformat(),
            "end": end.isoformat(),
            "paid": len(paid),
            "paid_active7": sum(1 for m in paid if m.get("active7")),
            "paid_push": sum(1 for m in paid if m.get("push")),
            "gifted": len(rows) - len(paid),
        })
    return out


def before_after(days: set[int], paid_day: int, today_ord: int, span: int = 14) -> Optional[tuple[int, int]]:
    """Active days in the `span` days before paying vs the `span` days from the
    payment day. None until the reader has had `span` days of Premium."""
    if today_ord - paid_day < span:
        return None
    before = sum(1 for d in days if paid_day - span <= d < paid_day)
    after = sum(1 for d in days if paid_day <= d < paid_day + span)
    return before, after
