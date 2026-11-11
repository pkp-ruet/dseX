"""
Compare stocks — the data side. Rules and words live in ``compare.py`` (pure).

``build(raw_codes)`` puts up to ``compare.MAX_CODES`` shares side by side from
caches the rest of the site already keeps warm: the research-list facts (score
row + price, yearly range, turnover), the screener's 1-year changes, the newest
stock-report snapshots (price word, safety counts), the dividend calendar and
the results calendar. No report is built here, so ten shares cost about the
same as one. Cached 300s per set of codes.

Everything goes to every reader; the page caps a free reader at
``compare.FREE_CODES`` shares and hides our analysis (screen-only, like every
other lock).
"""
from __future__ import annotations

import logging
from datetime import date, timedelta
from typing import Optional

from backend.services import compare as cp
from backend.services.db_service import _ttl_cache, load_companies, load_latest_prices

logger = logging.getLogger(__name__)


def _today() -> str:
    from utils.market_hours import bst_today_iso
    return bst_today_iso()


def _snapshots(codes: list[str]) -> dict[str, dict]:
    try:
        from backend.services.stock_report_service import latest_snapshots
        return latest_snapshots(codes)
    except Exception:  # noqa: BLE001 — the analysis then falls back to the score row
        logger.exception("compare: report snapshots failed")
        return {}


def _signal(code: str) -> dict:
    try:
        from backend.services.signal_service import get_signal
        return get_signal(code) or {}
    except Exception:  # noqa: BLE001
        return {}


def _returns() -> dict[str, Optional[float]]:
    try:
        from backend.services import screener_service
        return {r["code"]: r["v"].get("ret_1y") for r in screener_service.rows()}
    except Exception:  # noqa: BLE001 — the price card then has no figures
        logger.exception("compare: 1-year changes failed")
        return {}


def _calendar() -> dict:
    try:
        from backend.services.corporate_actions_service import build_dividend_calendar
        return build_dividend_calendar() or {}
    except Exception:  # noqa: BLE001 — no record dates or AGMs then
        logger.exception("compare: dividend calendar failed")
        return {}


def _meetings(codes: set[str]) -> list[dict]:
    try:
        from backend.services.morning_brief_service import results_calendar
        return (results_calendar(codes) or {}).get("meetings") or []
    except Exception:  # noqa: BLE001 — no results meetings then
        logger.exception("compare: results calendar failed")
        return []


def _as_of() -> Optional[str]:
    dates = [p.get("date") for p in load_latest_prices().values() if p.get("date")]
    return str(max(dates))[:10] if dates else None


def _next_records(records: list[dict], today: str) -> dict[str, dict]:
    """{code: the soonest record date from today, with its cash a share}."""
    out: dict[str, dict] = {}
    for e in sorted(records, key=lambda e: str(e.get("record_date") or "")):
        c, d = e.get("trading_code"), str(e.get("record_date") or "")[:10]
        if c and d >= today and c not in out:
            out[c] = {"date": d, "cash": cp._n(e.get("cash_per_share"))}
    return out


@_ttl_cache(300)
def _build(codes: tuple[str, ...]) -> dict:
    from backend.services.grade_rules import PROBLEM_WORDS
    from backend.services.research_lists_service import build_facts
    from backend.services.tiers import GROUP_WORDS
    from backend.services.weekly_letter import short_name
    from utils.sector import sector_bn

    facts = build_facts()
    companies = {c["trading_code"]: c for c in load_companies()}
    known = [c for c in codes if c in facts]
    missing = [c for c in codes if c not in facts]
    today = _today()
    total = len(facts)

    snaps = _snapshots(known) if known else {}
    rets = _returns() if known else {}
    cal = _calendar() if known else {}
    records = _next_records(cal.get("record_dates") or [], today)

    shares = []
    for code in known:
        f = facts[code]
        comp = companies.get(code) or {}
        row = cp.share_row(
            f, short=short_name(f.get("name"), code), ret_1y=rets.get(code),
            reserve_mn=cp._n(comp.get("reserve_surplus_mn")), snap=snaps.get(code),
            signal=_signal(code), total=int(f.get("total_scored") or total),
            group_words=GROUP_WORDS, sector_bn=sector_bn(f.get("sector")),
        )
        row["record"] = records.get(code)
        shares.append(row)

    horizon = (date.fromisoformat(today) + timedelta(days=cp.DATE_DAYS)).isoformat()
    universe = [{"code": c, "short": short_name(f.get("name"), c), "sector": f.get("sector"),
                 "mcap_cr": (cp._n(f.get("mcap_mn")) or 0) / 10.0} for c, f in facts.items()]
    return {
        "as_of": _as_of(),
        "codes": known,
        "missing": missing,
        "max": cp.MAX_CODES,
        "free_max": cp.FREE_CODES,
        "shares": shares,
        "questions": cp.questions(shares) if len(shares) >= 2 else [],
        "plain": cp.plain_words(shares, PROBLEM_WORDS),
        "dates": cp.date_items(shares, cal.get("record_dates") or [], cal.get("agms") or [],
                               _meetings(set(known)) if known else [], today, horizon),
        "similar": cp.similar_codes(shares, universe),
    }


def build(raw_codes: Optional[str]) -> dict:
    return _build(tuple(cp.parse_codes(raw_codes)))
