"""Dividend / corporate-action calendar.

Answers the question DSE retail investors actually ask — *"if I buy today, do I
still get the dividend?"* — by turning the stored `dividend_declarations` ledger
into a forward calendar of record dates and AGMs, priced off the latest close.

Nothing here is advice: it reports declared corporate actions and does the
arithmetic (cash per share, gross yield at today's price, days left, the last
normal-market buy day). Tax is deliberately out of scope — see the cost/tax work.
"""

from __future__ import annotations

import math
from datetime import date, datetime, timedelta, timezone
from typing import Any, Optional

from backend.services.db_service import (
    _ttl_cache,
    load_companies,
    load_dividend_history,
    load_latest_prices,
)

# DSE settles the normal market on T+2, and runs a spot-market window (same/next
# day settlement) in the last couple of trading days before a record date. So a
# normal-market buy needs ~3 trading days of headroom to be on the register.
SPOT_WINDOW_DAYS = 2
NORMAL_BUY_LEAD_DAYS = SPOT_WINDOW_DAYS + 1

# Bangladesh trading week is Sunday–Thursday: Friday (4) and Saturday (5) are off.
_WEEKEND = (4, 5)

DEFAULT_FACE_VALUE = 10.0

# How far ahead/back the calendar looks.
UPCOMING_WINDOW_DAYS = 120
RECENT_DECLARATION_DAYS = 45

NOTE_EN = (
    "To receive a dividend, your shares must be in your BO account on the record "
    "date. DSE settles normal-market trades two working days after the trade, and "
    "opens a short spot-market window just before the record date, so buying about "
    "three trading days early is the safe choice. Please confirm the exact cut-off "
    "with your broker."
)
NOTE_BN = (
    "ডিভিডেন্ড পেতে রেকর্ড ডেটের দিন শেয়ার আপনার বিও অ্যাকাউন্টে থাকতে হবে। "
    "সাধারণ মার্কেটের লেনদেন নিষ্পত্তি হয় কেনার দুই কার্যদিবস পরে, আর রেকর্ড ডেটের ঠিক আগে "
    "অল্প কয়েক দিনের জন্য স্পট মার্কেট চলে। তাই রেকর্ড ডেটের অন্তত তিন কার্যদিবস আগে কেনাই "
    "নিরাপদ। সঠিক শেষ দিনটি আপনার ব্রোকারের কাছে জেনে নিন।"
)


def _to_date(value: Any) -> Optional[date]:
    """Coerce an ISO string / datetime / date into a plain date."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)[:19]).date()
    except (TypeError, ValueError):
        return None


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def _minus_trading_days(d: date, days: int) -> date:
    """Step back `days` Bangladesh trading days (Sun–Thu), ignoring holidays."""
    out = d
    left = days
    while left > 0:
        out -= timedelta(days=1)
        if out.weekday() not in _WEEKEND:
            left -= 1
    return out


def _month_label(d: date) -> str:
    return d.strftime("%B %Y")


def _build_event(
    decl: dict,
    companies: dict,
    prices: dict,
    scores: dict,
    today: date,
) -> Optional[dict]:
    code = decl.get("trading_code")
    if not code:
        return None

    comp = companies.get(code, {})
    price = prices.get(code, {}) or {}
    ltp = _num(price.get("ltp"))

    face_value = _num(comp.get("face_value")) or DEFAULT_FACE_VALUE
    cash_pct = _num(decl.get("cash_pct"))
    if cash_pct is None:
        cash_pct = _num(decl.get("dividend_pct"))
    stock_pct = _num(decl.get("stock_pct"))

    cash_per_share = round(cash_pct / 100.0 * face_value, 4) if cash_pct else 0.0
    yield_pct = (
        round(cash_per_share / ltp * 100.0, 2)
        if cash_per_share and ltp else None
    )

    record_date = _to_date(decl.get("record_date"))
    agm_date = _to_date(decl.get("agm_date"))
    declaration_date = _to_date(decl.get("declaration_date"))
    period_end = _to_date(decl.get("period_end"))

    score_row = scores.get(code) or {}

    event = {
        "trading_code": code,
        "company_name": comp.get("company_name"),
        "sector": comp.get("sector"),
        "market_category": comp.get("market_category"),
        "ltp": ltp,
        "change_pct": _num(price.get("change_pct")),
        "score": _num(score_row.get("score")),
        "tier": score_row.get("tier"),
        "dividend_type": decl.get("dividend_type"),
        "cash_pct": cash_pct,
        "stock_pct": stock_pct,
        "cash_per_share": cash_per_share or None,
        "yield_pct": yield_pct,
        "face_value": face_value,
        "declaration_date": declaration_date.isoformat() if declaration_date else None,
        "record_date": record_date.isoformat() if record_date else None,
        "agm_date": agm_date.isoformat() if agm_date else None,
        "period_end": period_end.isoformat() if period_end else None,
        "amended": bool(decl.get("amended_at")),
        "is_no_dividend": not cash_pct and not stock_pct,
        # Only a cash dividend has something to be safe about.
        "safety": score_row.get("safety") if cash_per_share else None,
    }

    if record_date:
        event["record_days_left"] = (record_date - today).days
        buy_by = _minus_trading_days(record_date, NORMAL_BUY_LEAD_DAYS)
        spot_starts = _minus_trading_days(record_date, SPOT_WINDOW_DAYS)
        event["buy_by"] = buy_by.isoformat()
        event["spot_starts"] = spot_starts.isoformat()
        event["buy_days_left"] = (buy_by - today).days
    if agm_date:
        event["agm_days_left"] = (agm_date - today).days

    return event


def _score_index() -> dict:
    """code → {score, tier, safety}. Never fatal: the calendar works without scores."""
    try:
        from backend.services.scoring_service import build_scores_df
        from backend.services.tiers import tier_key

        from backend.services.dividend_safety import dividend_safety
        from utils.sector import normalize_sector

        df = build_scores_df()
        if df.empty:
            return {}
        out = {}
        for _, row in df.iterrows():
            score = _num(row.get("score"))
            r = row.to_dict()
            out[row["trading_code"]] = {
                "score": score,
                "tier": tier_key(score) if score is not None else None,
                # "Is this dividend safe?" — Premium on the page (screen-only lock).
                "safety": dividend_safety(r, normalize_sector(r.get("sector") or "")),
            }
        return out
    except Exception:
        return {}


# Bangladesh is UTC+6 with no DST. `date.today()` on the UTC host was a day
# behind from midnight to 6 AM Dhaka, so a record date that passed yesterday
# still listed as upcoming and every "days left" was one too many.
_DHAKA = timezone(timedelta(hours=6))


def _today_dhaka() -> date:
    return datetime.now(_DHAKA).date()


@_ttl_cache(900, max_entries=2)
def build_dividend_calendar() -> dict:
    """Forward calendar of record dates + AGMs, plus recent declarations.

    Day counts are as of the Dhaka date when this was built; the calendar page
    recounts them from the dates at render time (`lib/dividend-dates.ts`)."""
    today = _today_dhaka()
    horizon = today + timedelta(days=UPCOMING_WINDOW_DAYS)

    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    scores = _score_index()

    events = [
        e for e in (
            _build_event(d, companies, prices, scores, today)
            for d in load_dividend_history()
        )
        if e is not None
    ]

    # One row per company per date: a follow-up notice once folded this year's
    # dates into last year's declaration (AMCL(PRAN), 2026-10), and the two rows
    # then shared a React key. The ledger is newest first, so the latest wins.
    def _once(rows: list[dict], field: str) -> list[dict]:
        seen: set[tuple] = set()
        out = []
        for e in rows:
            k = (e["trading_code"], str(e[field])[:10])
            if k not in seen:
                seen.add(k)
                out.append(e)
        return out

    record_upcoming = _once([
        e for e in events
        if e.get("record_date") and today <= _to_date(e["record_date"]) <= horizon
    ], "record_date")
    record_upcoming.sort(key=lambda e: (e["record_date"], -(e.get("yield_pct") or 0)))

    agm_upcoming = _once([
        e for e in events
        if e.get("agm_date") and today <= _to_date(e["agm_date"]) <= horizon
    ], "agm_date")
    agm_upcoming.sort(key=lambda e: e["agm_date"])

    decl_cutoff = today - timedelta(days=RECENT_DECLARATION_DAYS)
    recent = [
        e for e in events
        if e.get("declaration_date") and _to_date(e["declaration_date"]) >= decl_cutoff
    ]
    recent.sort(key=lambda e: e["declaration_date"], reverse=True)

    # Month buckets mix both kinds so the page can render a single timeline.
    months: dict[str, dict] = {}
    for e in record_upcoming:
        d = _to_date(e["record_date"])
        key = d.strftime("%Y-%m")
        months.setdefault(key, {"key": key, "label": _month_label(d), "events": []})
        months[key]["events"].append({**e, "kind": "record", "event_date": e["record_date"]})
    for e in agm_upcoming:
        d = _to_date(e["agm_date"])
        key = d.strftime("%Y-%m")
        months.setdefault(key, {"key": key, "label": _month_label(d), "events": []})
        months[key]["events"].append({**e, "kind": "agm", "event_date": e["agm_date"]})
    for bucket in months.values():
        bucket["events"].sort(key=lambda e: (e["event_date"], e["trading_code"]))

    # Biggest cash payers of the last year, ranked by what the dividend is worth at
    # today's price. Keeps the page useful in the off-season, when few record dates
    # are still ahead. One row per company — the latest declaration wins.
    year_cutoff = today - timedelta(days=365)
    seen_codes: set[str] = set()
    top_cash: list[dict] = []
    for e in sorted(
        (
            e for e in events
            if e.get("yield_pct")
            and e.get("declaration_date")
            and _to_date(e["declaration_date"]) >= year_cutoff
        ),
        key=lambda e: e["yield_pct"],
        reverse=True,
    ):
        if e["trading_code"] in seen_codes:
            continue
        seen_codes.add(e["trading_code"])
        top_cash.append(e)

    cash_payers = [e for e in record_upcoming if e.get("cash_per_share")]
    this_week = [
        e for e in record_upcoming
        if e.get("record_days_left") is not None and e["record_days_left"] <= 7
    ]

    return {
        "today": today.isoformat(),
        "note_en": NOTE_EN,
        "note_bn": NOTE_BN,
        "settlement": {
            "normal_buy_lead_trading_days": NORMAL_BUY_LEAD_DAYS,
            "spot_window_trading_days": SPOT_WINDOW_DAYS,
        },
        "stats": {
            "upcoming_record_dates": len(record_upcoming),
            "record_dates_this_week": len(this_week),
            "upcoming_agms": len(agm_upcoming),
            "recent_declarations": len(recent),
            "cash_payers_upcoming": len(cash_payers),
            "top_yield_pct": max(
                (e["yield_pct"] for e in cash_payers if e.get("yield_pct")), default=None
            ),
            "declarations_tracked": len(events),
        },
        "record_dates": record_upcoming,
        "agms": agm_upcoming,
        "recent_declarations": recent[:40],
        "top_cash_dividends": top_cash[:25],
        "months": sorted(months.values(), key=lambda m: m["key"]),
    }


def dividend_history_for(code: str) -> list[dict]:
    """Every stored declaration for one company, newest first."""
    code = (code or "").upper()
    return [d for d in load_dividend_history() if d.get("trading_code") == code]
