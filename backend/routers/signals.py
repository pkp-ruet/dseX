"""What Premium adds to each Buy on /buy-sell-signals (services/signal_detail.py).

Public like every other read: the page hides it from free readers (screen-only).
"""
from fastapi import APIRouter

from backend.services.signal_detail import signal_details

router = APIRouter(tags=["signals"])


@router.get("/api/signals/detail")
def signals_detail():
    """{as_of, items: {CODE: {since, since_floor, buy_below, stop_above}}} for
    every Buy today: when the run began, our buy price, and the price past
    which it would stop being a Buy (the near-the-yearly-high line)."""
    return signal_details()
