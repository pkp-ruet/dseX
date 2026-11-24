"""
GET /api/user/home — the logged-in homepage in ONE request.

The dashboard used to fire eleven requests on mount (portfolio, watchlist,
alerts, signal events, picks, tips, news, near-extremes, dividends, index,
market state) and every card popped in on its own. On a budget Android phone
talking to a cold Render instance that was the page's biggest problem. This
bundle returns everything personal plus the *personal slices* of the public
data, so the frontend needs only this + `/api/scores` + `/api/market/state`.

The four-block home (2026-11-25, step 2 of the simplify review): money,
"New on your shares" (the newest rows of the Updates feed itself, `feed`),
your shares, the market line, and one card. Keys nothing reads any more left
the bundle the same day: `for_you`, `news`, `dividends`, `movers`, `research`,
`buy_list`, `calendar`, `rank_moves`, `new_results`, `brief`, `week_watch`,
`screener` (the stories, the icon grid's badges, the swipe slot and Today for
you were their readers). Before that, EL11 (2026-11-05) took out tips, market
news, popular, report codes, Bengali summaries and signal events.

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
from backend.routers.market_analysis import get_near_extremes
from backend.routers.portfolio import get_portfolio
from backend.services import notifications_service, price_alert_service
from backend.services.auth_service import get_user_watchlist, get_user_watchlist_meta
from backend.services.corporate_actions_service import build_dividend_calendar
from backend.services.db_service import load_ex_day_moves, load_market_index
from backend.services.morning_brief_service import results_calendar

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/user", tags=["home"])

T = TypeVar("T")


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

    # The reader's own record-date rows from the dividend calendar (cached
    # 900s), cash per share worked out: the dates line and the share rows.
    cal = _safe("calendar", lambda: build_dividend_calendar() or {}, {})
    record_rows = cal.get("record_dates") or []
    dividend_cash = [e for e in record_rows if (e.get("trading_code") or "").upper() in mine] if mine else []

    # Results meetings on the reader's stocks in the next two weeks.
    results_soon = _safe("results_soon", lambda: results_calendar(mine)["meetings"] if mine else [], [])
    # The day's move on the reader's stocks when a record date fell in between,
    # with the dividend / bonus taken out (audit EL3): {code: change %}.
    ex_moves = _safe("ex_moves", lambda: {c: m["change_pct"] for c, m in load_ex_day_moves().items()
                                          if c in mine}, {})
    # "New on your shares": the Updates feed's own newest rows.
    feed = _safe("feed", lambda: notifications_service.home_feed(user_id), None)

    near = _safe("near_extremes", lambda: _dump(get_near_extremes()), None)
    market_index = _safe("market_index", load_market_index, None)
    alerts = _safe("alerts", lambda: price_alert_service.list_alerts(user_id), [])

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "holdings": holdings,
        "watchlist": {"codes": codes, "meta": meta},
        "alerts": alerts,
        "market_index": market_index,
        "near_extremes": near,
        "dividend_cash": dividend_cash,
        "ex_moves": ex_moves,
        "results_soon": results_soon,
        "feed": feed,
    }
