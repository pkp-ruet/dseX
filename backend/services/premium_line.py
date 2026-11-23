"""THE Premium line (2026-11-22, plan https://claude.ai/artifact/T2ca745okDEF7YUutwAWM1).

    The market is free to look at. Your shares and our judgement are Premium.

Every part of the site belongs to one of four layers, and what a free reader
sees of it has one of a few shapes. This table is the one place those choices
live: `entitlements.FREE_LIMITS`, the report keys, the teaser-push cap and the
compare cap read their numbers from it, and the frontend mirror
(`frontend/lib/premium-line.ts`) is checked against it in
`backend/tests/test_agreement.py`.

Step 1 of the plan is behaviour-neutral: each area carries what a free reader
sees **today**. The later steps change one area at a time (with its pages),
and `TARGET` says where each is going, so the distance left is visible in one
place. Pure: no imports from the rest of the backend.
"""
from __future__ import annotations

from typing import Optional

LAYERS = ("market", "money", "shares", "judgement")

LAYER_WORDS = {
    "market": {"en": "The market", "bn": "বাজার"},
    "money": {"en": "Your money", "bn": "আপনার টাকা"},
    "shares": {"en": "Your shares", "bn": "আপনার শেয়ার"},
    "judgement": {"en": "Our judgement", "bn": "আমাদের বিচার"},
}

# What a free reader sees of an area:
#   open      — everything
#   limit     — up to n (per `per`, else in total), then Premium
#   meter     — n full items a `per` (the analyses)
#   week      — the next n days in full, the rest Premium (the calendar)
#   count_one — the count, and n items open
#   count     — only how many (and the taka total where there is money)
#   locked    — nothing; one Premium card
SHAPES = ("open", "limit", "meter", "week", "count_one", "count", "locked")
PERIODS = (None, "day", "week", "month")


def _a(layer: str, free: str, n: Optional[int] = None, per: Optional[str] = None) -> dict:
    return {"layer": layer, "free": free, "n": n, "per": per}


# What a free reader sees today. Change an entry only together with its pages.
AREAS: dict[str, dict] = {
    # The market: free to look at.
    "market_today": _a("market", "open"),
    "results": _a("market", "open"),
    "ranking": _a("market", "open"),
    "sectors": _a("market", "open"),
    "dividend_calendar": _a("market", "week", 7),  # step 2, 2026-11-22 (was one example)
    "compare": _a("market", "limit", 10),  # step 5, 2026-11-22: figures for up to 10 (was 2)
    "screener": _a("market", "open"),  # step 5: own filters on public figures show the shares
    # Your money: entering and seeing it is free.
    "portfolio": _a("money", "open"),
    "portfolios": _a("money", "limit", 1),
    "watchlist": _a("money", "open"),  # step 5: follow as many as you want (hard cap 200)
    # Your shares: worked out for you, and brought to you.
    "your_dividends": _a("shares", "count"),  # step 2: the taka total free, which shares Premium
    "updates": _a("shares", "count_one", 1, "week"),  # step 3, 2026-11-22: counts + the week's one event
    "stories": _a("shares", "count_one", 1),  # step 3: Today + one story open, the rest one locked ring
    "pushes": _a("shares", "limit", 1, "week"),  # step 3: the Friday letter (was 3 teasers)
    "brief": _a("shares", "locked"),
    "watch_rules": _a("shares", "limit", 3),  # step 4: 3 rules of any kind, price alerts included
    "reminders": _a("shares", "locked"),
    # Our judgement.
    "analysis": _a("judgement", "meter", 10, "month"),
    "portfolio_check": _a("judgement", "count"),
    "compare_analysis": _a("judgement", "locked"),
    "screener_lists": _a("judgement", "count"),
    "saved_screens": _a("judgement", "locked"),
    "buy_list": _a("judgement", "count_one", 1),
    "for_you": _a("judgement", "count"),
    "research": _a("judgement", "count"),
    # 2026-11-23: one plan per account, open in full; building again is Premium.
    "portfolio_builder": _a("judgement", "limit", 1),
}

# Where each area is going (the plan's table). Only the ones that move.
TARGET: dict[str, dict] = {
    "for_you": _a("judgement", "count_one", 1),
}


# The showcase (step 6, 2026-11-22): five household names whose full analysis
# is open to everyone, signed in or not, and to search engines. Kept the same
# five so their pages keep their search rank; reading one never spends a free
# analysis. Frontend mirror `SHOWCASE` in lib/premium-line.ts.
SHOWCASE = ("GP", "SQURPHARMA", "BRACBANK", "BATBC", "WALTONHIL")


def area(key: str) -> dict:
    """The entry for `key`; a KeyError for an unknown area is a bug, not a lock."""
    return AREAS[key]


def free_n(key: str) -> Optional[int]:
    """How many a free reader gets, in the `limits` sense: None = no cap
    (an open area), 0 = none (locked, or only a count)."""
    a = AREAS[key]
    if a["free"] == "open":
        return None
    if a["free"] in ("locked", "count"):
        return 0
    return a["n"]


def view(key: str, premium: bool) -> dict:
    """What this reader sees of an area: Premium sees everything."""
    a = AREAS[key]
    if premium:
        return {"layer": a["layer"], "free": "open", "n": None, "per": None}
    return dict(a)


def is_premium_layer(key: str) -> bool:
    """Your shares and our judgement are the Premium layers."""
    return AREAS[key]["layer"] in ("shares", "judgement")
