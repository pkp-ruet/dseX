"""The buy signals page's reads (services/signal_detail.py, signal_today_service.py).

Public like every other read: the page hides Premium's part from free readers
(screen-only).
"""
from fastapi import APIRouter

from backend.services.signal_detail import signal_details
from backend.services.signal_today_service import signals_today

router = APIRouter(tags=["signals"])


@router.get("/api/signals/detail")
def signals_detail():
    """{as_of, items: {CODE: {since, since_floor, buy_below, stop_above}}} for
    every Buy today: when the run began, our buy price, and the price past
    which it would stop being a Buy (the near-the-yearly-high line)."""
    return signal_details()


@router.get("/api/signals/today")
def signals_today_route():
    """The page in one bundle: the funnel (graded → good → Buy, and why the
    other good companies were left out), who joined and left since the last
    trading day, each Buy's price word + yearly-range position + three plain
    facts + the detail above, and the good companies almost on the list."""
    return signals_today()
