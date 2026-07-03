"""
Canonical DSEF tier thresholds — the single source of truth for the backend.

Aligned with frontend lib/constants.ts (TIER_THRESHOLDS / TIER_LABELS):
    strong_buy      score >= 75    "Strong Buy"
    buy             score >= 60    "Buy"
    keep_watching   score >= 45    "Wait & Watch"
    avoid           score <  45    "Risky"

Historic note: the API used to bucket at 75/55/35 with keys
strong_buy/safe_buy/watch/avoid while the UI and verdict engine used
75/60/45 — the same score could carry two different tier labels. Every
consumer now goes through tier_key() so the boundaries move in one place.
"""
from typing import Optional

STRONG_BUY = 75.0
BUY = 60.0
KEEP_WATCHING = 45.0

TIER_KEYS = ("strong_buy", "buy", "keep_watching", "avoid")

TIER_WORDS = {
    "strong_buy": "Strong Buy",
    "buy": "Buy",
    "keep_watching": "Wait & Watch",
    "avoid": "Risky",
    "unknown": "Unrated",
}


def tier_key(score: Optional[float]) -> str:
    """Map a 0-100 DSEF score to its canonical tier key ("unknown" for None)."""
    if score is None:
        return "unknown"
    if score >= STRONG_BUY:
        return "strong_buy"
    if score >= BUY:
        return "buy"
    if score >= KEEP_WATCHING:
        return "keep_watching"
    return "avoid"
