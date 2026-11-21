"""The 7-day taste — the writes (rules in `taste.py`)."""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from backend.services import taste

log = logging.getLogger("taste")


def maybe_start(user: dict) -> dict:
    """Start the reader's taste when they qualify (called on `/me` and the
    visit ping, so a reader who already has shares starts on their first visit
    after launch, and a new one on the visit after they add a share). Returns
    the user with `taste_started_at` set when it started."""
    from backend.services.entitlements import is_premium

    try:
        if not taste.eligible(user, is_premium(user)):
            return user
        from backend.services.db_service import get_db

        now = datetime.now(timezone.utc)
        res = get_db()["users"].update_one(
            {"user_id": user["user_id"], "taste_started_at": {"$exists": False},
             "premium_until": {"$in": [None]}, "trial_started_at": {"$in": [None]}},
            {"$set": {"taste_started_at": now}},
        )
        if res.modified_count:
            return {**user, "taste_started_at": now}
    except Exception:  # noqa: BLE001 — the taste must never break sign-in
        log.warning("taste start failed", exc_info=True)
    return user
