"""Bangladesh DSE trading hours helpers (stdlib only — no pytz)."""
from datetime import datetime, timezone, timedelta

BST = timezone(timedelta(hours=6))

_TRADING_DAYS = {6, 0, 1, 2, 3}  # Sun=6, Mon=0, Tue=1, Wed=2, Thu=3 (Python weekday)


def _now_bst() -> datetime:
    return datetime.now(BST)


def is_trading_day() -> bool:
    return _now_bst().weekday() in _TRADING_DAYS


def is_market_open() -> bool:
    now = _now_bst()
    if now.weekday() not in _TRADING_DAYS:
        return False
    t = (now.hour, now.minute)
    return (10, 0) <= t < (14, 31)


def market_session_info() -> dict:
    now = _now_bst()
    open_ = is_market_open()
    trading = now.weekday() in _TRADING_DAYS
    server_bst = now.strftime("%H:%M")

    closes_in = opens_in = None
    if open_:
        close_dt = now.replace(hour=14, minute=30, second=0, microsecond=0)
        closes_in = max(0, int((close_dt - now).total_seconds()))
    else:
        opens_in = _seconds_to_next_open(now)

    return {
        "is_open": open_,
        "is_trading_day": trading,
        "server_time_bst": server_bst,
        "closes_in_seconds": closes_in,
        "opens_in_seconds": opens_in,
    }


def _seconds_to_next_open(now: datetime) -> int:
    """Seconds until next 10:00 BST on a trading day."""
    candidate = now.replace(hour=10, minute=0, second=0, microsecond=0)
    # If today is a trading day and before 10:00, open is today
    if now.weekday() in _TRADING_DAYS and (now.hour, now.minute) < (10, 0):
        return max(0, int((candidate - now).total_seconds()))
    # Advance days until next trading day
    for i in range(1, 8):
        test = candidate + timedelta(days=i)
        if test.weekday() in _TRADING_DAYS:
            return max(0, int((test - now).total_seconds()))
    return 0
