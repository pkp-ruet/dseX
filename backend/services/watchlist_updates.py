"""
Watchlist updates — everything new and everything coming on a set of codes,
in one payload (2026-10-30, user decision: the watchlist is the one page for
the shares you follow, the same for free and Premium readers; the catch is
the free cap of 5 shares, not locked content).

Only free facts ride here:

* ``results`` — reports posted in the last ``RESULT_DAYS`` (headline + profit
  line, the /results row; the "what it means" sentence is left out).
* ``coming_results`` — results meetings in the next two weeks (dates only;
  what to expect stays on /results for Premium).
* ``record_dates`` / ``agms`` / ``declared`` — the dividend calendar's rows on
  these codes (no "Is it safe?").
* ``grades`` — grade changes in the last ``GRADE_DAYS`` (from → to, no reasons;
  rule-change days skipped).
* ``ranges`` — the yearly high / low per code.
* ``price_date`` — the last trading day in the prices (today's move is that
  day's move; on a Friday it is Thursday's).

Served by ``routers/watchlist_glance.py``. Pure helpers are tested in
``backend/tests/test_watchlist_updates.py``.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Iterable, Optional

from backend.services.db_service import _ttl_cache, get_db, load_52w_ranges, load_latest_prices

logger = logging.getLogger(__name__)

MAX_CODES = 100
RESULT_DAYS = 30
GRADE_DAYS = 30
# Snapshots read for grade changes: the window plus room for the old grade to
# have begun, so a change near the window's start is still seen.
_GRADE_LOOKBACK_DAYS = 120

_PREMIUM_RESULT_FIELDS = ("meaning_en", "meaning_bn")
_PREMIUM_MEETING_FIELDS = ("expect_en", "expect_bn", "better_above", "weaker_below")
_CALENDAR_FIELDS = (
    "trading_code", "company_name", "dividend_type", "cash_pct", "stock_pct",
    "cash_per_share", "yield_pct", "declaration_date", "record_date", "agm_date",
    "record_days_left", "buy_by", "buy_days_left", "agm_days_left", "amended",
    "is_no_dividend",
)


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def clean_codes(codes: Iterable[str]) -> list[str]:
    """Upper-case, deduplicated, in the order given, at most ``MAX_CODES``."""
    seen: list[str] = []
    for c in codes or ():
        c = (c or "").strip().upper()
        if c and c not in seen:
            seen.append(c)
    return seen[:MAX_CODES]


def without(row: dict, fields: Iterable[str]) -> dict:
    return {k: v for k, v in row.items() if k not in set(fields)}


def calendar_rows(rows: list[dict], codes: set[str]) -> list[dict]:
    """The calendar's rows on these codes, free fields only."""
    return [{k: r.get(k) for k in _CALENDAR_FIELDS} for r in rows or [] if r.get("trading_code") in codes]


def recent_grade_changes(timeline: Optional[dict], since: str) -> list[dict]:
    """Grade changes on or after ``since`` (ISO), newest first, without the
    reasons (those are Premium on the stock page). Rule-change days skipped."""
    out = []
    for ch in (timeline or {}).get("changes") or []:
        if ch.get("method") or (ch.get("date") or "") < since:
            continue
        out.append({
            "date": ch["date"],
            "from_tier": ch.get("from_tier"),
            "to_tier": ch.get("to_tier"),
            "from_score": ch.get("from_score"),
            "to_score": ch.get("to_score"),
        })
    return out


# ---------------------------------------------------------------------------
# Data side
# ---------------------------------------------------------------------------

def _grades(codes: list[str], today: date) -> dict[str, list[dict]]:
    """{code: grade changes in the last GRADE_DAYS} — one snapshot read."""
    from backend.services import score_history as sh
    from backend.services.score_history_service import _ROW_FIELDS, method_days

    start = (today - timedelta(days=_GRADE_LOOKBACK_DAYS)).isoformat()
    by_code: dict[str, list[dict]] = {}
    for d in get_db()["signal_snapshots"].find(
            {"trading_code": {"$in": codes}, "date": {"$gte": start}},
            {**_ROW_FIELDS, "trading_code": 1}).batch_size(1000):
        by_code.setdefault(d.get("trading_code"), []).append(d)
    try:
        days = set(method_days())
    except Exception:  # noqa: BLE001
        days = set()
    since = (today - timedelta(days=GRADE_DAYS)).isoformat()
    out = {}
    for code, rows in by_code.items():
        changes = recent_grade_changes(sh.timeline(rows, days), since)
        if changes:
            out[code] = changes
    return out


def _safe(label: str, fn, default):
    try:
        return fn()
    except Exception:  # noqa: BLE001 — one part failing must not blank the page
        logger.exception("watchlist updates: %s failed", label)
        return default


@_ttl_cache(300, max_entries=300)
def _build(codes: tuple[str, ...]) -> dict:
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.morning_brief_service import results_calendar
    from backend.services.results_explainer import results_for
    from utils.market_hours import bst_today_iso

    want = set(codes)
    today = date.fromisoformat(bst_today_iso())
    cal = _safe("calendar", build_dividend_calendar, {})
    meetings = _safe("results calendar", lambda: results_calendar(want).get("meetings") or [], [])
    results = _safe("results", lambda: results_for(codes, days=RESULT_DAYS, limit=len(codes) * 2), [])
    ranges = _safe("ranges", load_52w_ranges, {})
    prices = _safe("prices", load_latest_prices, {})
    days = [str((prices.get(c) or {}).get("date") or "")[:10] for c in codes]
    return {
        "as_of": today.isoformat(),
        "price_date": max(days, default="") or None,
        "results": [without(r, _PREMIUM_RESULT_FIELDS) for r in results],
        "coming_results": [without(m, _PREMIUM_MEETING_FIELDS) for m in meetings],
        "record_dates": calendar_rows(cal.get("record_dates"), want),
        "agms": calendar_rows(cal.get("agms"), want),
        "declared": calendar_rows(cal.get("recent_declarations"), want),
        "grades": _safe("grades", lambda: _grades(list(codes), today), {}),
        "ranges": {c: ranges[c] for c in codes if c in ranges},
    }


def build_updates(codes: list[str]) -> dict:
    return _build(tuple(clean_codes(codes)))
