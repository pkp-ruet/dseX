"""
Watchlist glance board — one dense row per watched stock (Premium screen).

Four answers per stock, all from figures the app already computes:

* **Fair value** — the stock page's estimate (``fair_value.estimate_fair_value``)
  and how far today's price sits from its centre.
* **What blocks a Buy** — the signal's own reason (``signal_service``), plus the
  one price line the rules make exact: under 85% of the yearly range for a
  stock held back only by being near its yearly high.
* **Next event** — the nearest record date (with the last normal buy day) or
  AGM from the dividend calendar.
* **Risk flags** — loans, Z category, old accounts, a loss, cash going out this
  year, and governance news (qualified opinion, BSEC action, postponed board).

Served by ``routers/watchlist_glance.py`` to every reader: the Premium lock is
screen-only, like every other lock in the app. Pure helpers are tested in
``backend/tests/test_watchlist_glance.py``.
"""
from __future__ import annotations

import logging
from typing import Optional

from backend.services.db_service import (
    _ttl_cache,
    load_companies,
    load_company_news,
    load_financials,
    load_latest_prices,
)
from backend.services.fair_value import estimate_fair_value
from backend.services.signal_service import NEAR_HIGH_PCT, get_signal
from backend.services.stock_facts import governance_items
from utils.sector import normalize_sector

logger = logging.getLogger(__name__)

MAX_CODES = 100
_LENDER_OR_INSURER = {"BANK", "NBFI", "INSURANCE"}


def _n(v) -> Optional[float]:
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f or f in (float("inf"), float("-inf")) else f


# ---------------------------------------------------------------------------
# Pure helpers
# ---------------------------------------------------------------------------

def fair_block(fv: Optional[dict], price: Optional[float]) -> Optional[dict]:
    """The fair-value cell: range, verdict and the gap from the centre.

    ``gap_pct`` < 0 = the price is under the estimate. It is withheld (like the
    stock page's centre figure) when the yardsticks disagree with the verdict.
    """
    if not fv:
        return None
    center = _n(fv.get("center"))
    disagree = bool(fv.get("estimates_disagree"))
    gap = None
    if center and price and not disagree:
        gap = round((price - center) / center * 100, 1)
    return {
        "low": _n(fv.get("low")), "high": _n(fv.get("high")),
        "center": None if disagree else center,
        "stance": fv.get("stance"),
        "confidence": fv.get("confidence"),
        "gap_pct": gap,
        "estimates_disagree": disagree,
    }


def buy_below(reason_key: Optional[str], hi: Optional[float], lo: Optional[float]) -> Optional[float]:
    """The price under which a near-the-yearly-high stock leaves the dampener.

    Only that rule turns into one exact price; every other block (valuation,
    thin trading, Z, old accounts) is not a price line, so it gets none.
    """
    if reason_key != "near_52w_high":
        return None
    hi, lo = _n(hi), _n(lo)
    if hi is None or lo is None or hi <= lo:
        return None
    return round(lo + (hi - lo) * NEAR_HIGH_PCT / 100.0, 1)


def risk_flags(f: dict, governance: list[dict]) -> list[dict]:
    """Things that can go wrong, worst first. Each is ``{key, en, bn}``."""
    out: list[dict] = []

    def add(key, en, bn):
        out.append({"key": key, "en": en, "bn": bn})

    level = f.get("debt_level")
    if level == "over_mcap":
        add("loans_over_mcap", "Its loans are larger than the whole company's market value",
            "এর ঋণ কোম্পানির পুরো বাজার মূলধনের চেয়েও বেশি")
    elif level == "over_reserve":
        add("loans_over_reserve", "Its loans are larger than the profit it has kept over the years",
            "এর ঋণ বছরের পর বছর জমানো মুনাফার চেয়ে বেশি")
    if str(f.get("cat") or f.get("market_cat") or "").strip().upper() == "Z":
        add("z_category", "It is in Z category, because it skipped a dividend or an AGM",
            "এটি Z ক্যাটাগরিতে, কারণ কোম্পানি ডিভিডেন্ড দেয়নি বা এজিএম করেনি")
    if f.get("stale") or f.get("stale_data"):
        add("stale", "It has not published new accounts for years", "কয়েক বছর ধরে নতুন আর্থিক হিসাব প্রকাশ করেনি")
    eps = _n(f.get("eps"))
    if eps is not None and eps <= 0:
        add("loss", "It made a loss in its latest results", "সর্বশেষ হিসাবে লোকসান করেছে")
    nocf = _n(f.get("interim_nocfps"))
    if nocf is not None and nocf < 0 and f.get("sector_class") not in _LENDER_OR_INSURER:
        add("cash_out", "The business spent more cash than it brought in this year",
            "এ বছর ব্যবসায় যত নগদ এসেছে, খরচ হয়েছে তার চেয়ে বেশি")
    for g in governance or []:
        add(g.get("key") or "governance", g.get("en") or "", g.get("bn") or "")
    return out


def next_event(code: str, record_dates: list[dict], agms: list[dict]) -> Optional[dict]:
    """The nearest record date or AGM for one code, plus how many more are ahead."""
    events = []
    for e in record_dates:
        if e.get("trading_code") == code and e.get("record_date"):
            events.append({
                "kind": "record", "date": e["record_date"],
                "days_left": e.get("record_days_left"),
                "buy_by": e.get("buy_by"), "buy_days_left": e.get("buy_days_left"),
                "cash_per_share": _n(e.get("cash_per_share")),
                "yield_pct": _n(e.get("yield_pct")),
                "stock_pct": _n(e.get("stock_pct")),
            })
    for e in agms:
        if e.get("trading_code") == code and e.get("agm_date"):
            events.append({"kind": "agm", "date": e["agm_date"], "days_left": e.get("agm_days_left")})
    if not events:
        return None
    # A record date and an AGM on the same day: the record date matters more.
    events.sort(key=lambda e: (e["date"], e["kind"] != "record"))
    return {**events[0], "more": len(events) - 1}


def glance_row(code: str, f: Optional[dict], comp: dict, price: dict, sig: dict,
               fv: Optional[dict], governance: list[dict],
               record_dates: list[dict], agms: list[dict]) -> dict:
    """One board row. ``f`` is the research-list facts dict (None = unscored)."""
    f = f or {}
    ltp = _n(f.get("ltp")) or _n(price.get("ltp"))
    reason = sig.get("reason_key")
    return {
        "code": code,
        "name": f.get("name") or comp.get("company_name") or code,
        "price": ltp,
        "change_pct": _n(price.get("change_pct")),
        "score": _n(f.get("score")),
        "fair": fair_block(fv, ltp),
        "signal": {
            "signal": sig.get("signal") or "none",
            "strength": sig.get("strength"),
            "reason_key": reason,
            "reason_en": sig.get("reason_en"),
            "reason_bn": sig.get("reason_bn"),
            "buy_below": buy_below(reason, f.get("hi52"), f.get("lo52")),
        },
        "event": next_event(code, record_dates, agms),
        "risks": risk_flags(f, governance) if f else [],
    }


# ---------------------------------------------------------------------------
# Data side
# ---------------------------------------------------------------------------

def _governance(code: str) -> list[dict]:
    try:
        return governance_items(load_company_news(code, limit=200))
    except Exception:  # noqa: BLE001 — news is a modifier, never a blocker
        logger.exception("watchlist glance: governance failed for %s", code)
        return []


def _fair(f: dict, comp: dict, ltp: Optional[float]) -> Optional[dict]:
    try:
        return estimate_fair_value(f, load_financials(f["code"]), comp, ltp,
                                   f.get("sector_class") or normalize_sector(comp.get("sector") or ""))
    except Exception:  # noqa: BLE001
        logger.exception("watchlist glance: fair value failed for %s", f.get("code"))
        return None


@_ttl_cache(300, max_entries=300)
def _build(codes: tuple[str, ...]) -> list[dict]:
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.research_lists_service import build_facts

    facts = build_facts()
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    try:
        cal = build_dividend_calendar()
    except Exception:  # noqa: BLE001
        logger.exception("watchlist glance: calendar failed")
        cal = {}
    record_dates, agms = cal.get("record_dates") or [], cal.get("agms") or []

    rows = []
    for code in codes:
        comp = companies.get(code)
        if comp is None:
            continue
        f = facts.get(code)
        price = prices.get(code) or {}
        fv = _fair(f, comp, f.get("ltp")) if f else None
        rows.append(glance_row(code, f, comp, price, get_signal(code), fv,
                               _governance(code) if f else [], record_dates, agms))
    return rows


def build_glance(codes: list[str]) -> list[dict]:
    """Board rows for the given codes, in the order given (deduplicated)."""
    seen: list[str] = []
    for c in codes:
        c = (c or "").strip().upper()
        if c and c not in seen:
            seen.append(c)
    return _build(tuple(seen[:MAX_CODES]))
