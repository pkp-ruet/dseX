"""The 7-day taste — pure (THE Premium line, step 6, 2026-11-22).

Once per account, the whole "your shares" layer opens for `TASTE_DAYS`: the
watcher's updates in full, same-evening pushes, the 9 AM brief, the Friday
letter whole, the reader's own dividends by name, and watch rules past the
free 3. Our judgement (the analysis past 10 a month, the Buy List, For you,
research, our screener lists) stays Premium.

Who gets it: a free reader who has never been Premium (no `premium_until`,
no old free month) once they hold a share in any portfolio or follow 3 or
more. Readers who already did on launch day start on their next visit (the
check runs on `/me` and the visit ping). On day 6 one push says what it
told them; from day 8 it closes, and what the reader set during it is kept
(rules past the cap pause, reminders stay).

Stored on the user as `taste_started_at` (and `taste_recap_sent_at`). A paid
plan bought during the taste starts after it ends (`payments._grant`).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

TASTE_DAYS = 7
# The recap push goes out once this many days have passed (day 6).
RECAP_AFTER_DAYS = 5
MIN_FOLLOWED = 3


def _utc(v: Any) -> Optional[datetime]:
    if isinstance(v, str):
        try:
            v = datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return None
    if not isinstance(v, datetime):
        return None
    return v if v.tzinfo else v.replace(tzinfo=timezone.utc)


def has_shares(user: dict) -> bool:
    """A share in any portfolio, or 3 or more followed."""
    if user.get("portfolio"):
        return True
    if any(p.get("holdings") for p in user.get("extra_portfolios") or []):
        return True
    return len(user.get("watchlist") or []) >= MIN_FOLLOWED


def eligible(user: Optional[dict], premium: bool) -> bool:
    """May this reader's taste start now?"""
    if not user or premium:
        return False
    if user.get("taste_started_at") or user.get("trial_started_at") or user.get("premium_until"):
        return False
    return has_shares(user)


def until(user: Optional[dict]) -> Optional[datetime]:
    start = _utc((user or {}).get("taste_started_at"))
    return start + timedelta(days=TASTE_DAYS) if start else None


def active(user: Optional[dict], now: Optional[datetime] = None) -> bool:
    end = until(user)
    return bool(end and end > (now or datetime.now(timezone.utc)))


def state(user: Optional[dict], now: Optional[datetime] = None) -> Optional[dict]:
    """What `/me` says about the taste, or None when it never started."""
    start = _utc((user or {}).get("taste_started_at"))
    if not start:
        return None
    now = now or datetime.now(timezone.utc)
    end = start + timedelta(days=TASTE_DAYS)
    left = (end - now).total_seconds() / 86400
    return {
        "started": start.isoformat(),
        "until": end.isoformat(),
        "active": end > now,
        # 7 on the first day, 1 on the last.
        "days_left": max(0, int(-(-left // 1))) if end > now else 0,
    }


def recap_due(user: Optional[dict], now: datetime) -> bool:
    """Day 6, once."""
    start = _utc((user or {}).get("taste_started_at"))
    if not start or (user or {}).get("taste_recap_sent_at"):
        return False
    return start + timedelta(days=RECAP_AFTER_DAYS) <= now < start + timedelta(days=TASTE_DAYS)


def recap_payload(kinds_phrase: str, total: int, lang: str = "bn") -> dict:
    """The day-6 push: what the taste told them, and that it closes tomorrow."""
    bn = lang != "en"
    if total:
        body = (f"এ সপ্তাহে প্রিমিয়াম আপনার শেয়ারে {kinds_phrase} জানিয়েছে। কাল এটি বন্ধ হবে।" if bn
                else f"This week Premium told you about {kinds_phrase} on your shares. It closes tomorrow.")
    else:
        body = ("এ সপ্তাহে প্রিমিয়াম আপনার শেয়ারে নজর রেখেছে। কাল এটি বন্ধ হবে।" if bn
                else "This week Premium watched your shares for you. It closes tomorrow.")
    return {"title": "আপনার শেয়ারে প্রিমিয়াম" if bn else "Premium on your shares",
            "body": body, "url": "/premium?plan=yearly&src=taste-recap#pay", "tag": "taste"}
