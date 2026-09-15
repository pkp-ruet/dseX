"""
GET /api/user/home — the logged-in homepage in ONE request.

The dashboard used to fire eleven requests on mount (portfolio, watchlist,
alerts, signal events, daily picks, tips, news, near-extremes, dividends, index,
market state) and every card popped in on its own. On a budget Android phone
talking to a cold Render instance that was the page's biggest problem. This
bundle returns everything personal plus the *personal slices* of the public
data (dividends / 52-week extremes / news for the user's own codes), so the
frontend needs only this + `/api/scores` + `/api/market/state`.

Every part is guarded: one failing piece degrades to its empty value instead
of failing the whole page. Nothing here is cached as a unit — each piece
already rides on its own service-level cache (`_ttl_cache`, `user_cache`).
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Callable, TypeVar

from fastapi import APIRouter, Depends

from backend.routers.auth import get_current_user
from backend.routers.dividends import compute_upcoming_dividends
from backend.routers.market_analysis import get_near_extremes
from backend.routers.portfolio import get_portfolio
from backend.services import price_alert_service
from backend.services.auth_service import get_user_watchlist, get_user_watchlist_meta
from backend.services.corporate_actions_service import build_dividend_calendar
from backend.services.daily_picks_service import get_or_compute_daily_picks
from backend.services.daily_tips_service import get_daily_tips
from backend.services.db_service import load_market_index, load_news_for_codes
from backend.services.deep_analysis_service import list_report_codes
from backend.services.portfolio_signal_service import list_recent_events
from backend.services.summaries_service import load_stock_summaries

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["home"])

T = TypeVar("T")

NEWS_LIMIT = 20


def _safe(label: str, fn: Callable[[], T], default: T) -> T:
    try:
        return fn()
    except Exception as e:  # noqa: BLE001 — one broken card must not blank the page
        logger.warning("home bundle: %s failed: %s", label, e, exc_info=True)
        return default


def _dump(obj: Any) -> Any:
    """Pydantic model → plain dict (the pieces below mix models and dicts)."""
    return obj.model_dump() if hasattr(obj, "model_dump") else obj


@router.get("/home")
def home_bundle(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]

    portfolio = _safe("portfolio", lambda: get_portfolio(current_user), {"holdings": []})
    holdings = portfolio.get("holdings") or []
    codes = _safe("watchlist", lambda: get_user_watchlist(user_id), [])
    meta = _safe("watchlist_meta", lambda: get_user_watchlist_meta(user_id), {})

    held = {(h.get("trading_code") or "").upper() for h in holdings}
    watched = {c.upper() for c in codes}
    mine = {c for c in (held | watched) if c}

    picks = _safe("daily_picks", lambda: get_or_compute_daily_picks(current_user), None)
    pick_codes = {(p.get("trading_code") or "").upper() for p in ((picks or {}).get("picks") or [])}

    mine_t = tuple(sorted(mine))
    all_codes_t = tuple(sorted(mine | pick_codes))

    news = _safe("news", lambda: load_news_for_codes(mine_t)[:NEWS_LIMIT] if mine_t else [], [])
    dividends = _safe(
        "dividends",
        lambda: _dump(compute_upcoming_dividends(codes=mine, limit=None))
        if mine
        else {"upcoming_declarations": [], "upcoming_record_dates": []},
        {"upcoming_declarations": [], "upcoming_record_dates": []},
    )

    # Record dates with the cash per share worked out — the calendar page's own
    # rows, filtered to the user's codes, so "GP pays you ৳1,200" is one multiply.
    def _cash_rows() -> list[dict]:
        if not mine:
            return []
        cal = build_dividend_calendar() or {}
        return [e for e in (cal.get("record_dates") or []) if (e.get("trading_code") or "").upper() in mine]

    dividend_cash = _safe("dividend_cash", _cash_rows, [])

    near = _safe("near_extremes", lambda: _dump(get_near_extremes()), None)
    market_index = _safe("market_index", load_market_index, None)
    tips = _safe("tips", get_daily_tips, {"date": None, "tips": []})
    alerts = _safe("alerts", lambda: price_alert_service.list_alerts(user_id), [])
    signal_events = _safe("signal_events", lambda: list_recent_events(user_id), [])

    report_codes = _safe(
        "report_codes",
        lambda: sorted({c.upper() for c in list_report_codes()} & set(all_codes_t)),
        [],
    )
    summaries_bn = _safe(
        "summaries_bn",
        lambda: load_stock_summaries(all_codes_t) if all_codes_t else {},
        {},
    )

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "holdings": holdings,
        "watchlist": {"codes": codes, "meta": meta},
        "alerts": alerts,
        "signal_events": signal_events,
        "daily_picks": picks,
        "tips": tips,
        "news": news,
        "market_index": market_index,
        "dividends": dividends,
        "near_extremes": near,
        "dividend_cash": dividend_cash,
        "report_codes": report_codes,
        "summaries_bn": summaries_bn,
    }
