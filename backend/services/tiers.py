"""
Canonical fundamental-strength tier thresholds — the single source of truth
for the backend.

Aligned with frontend lib/constants.ts (TIER_THRESHOLDS / TIER_LABELS):
    excellent   score >= 75    "Excellent"
    good        score >= 60    "Good"
    average     score >= 45    "Average"
    weak        score <  45    "Weak"

Tiers describe how fundamentally strong the company is — nothing else.
Action advice (Buy / Hold / Sell) lives in services/signal_service.py and
must never be inferred from the tier alone.

History: renamed 2026-07 from recommendation language (strong_buy / buy /
keep_watching / avoid — "Strong Buy" / "Buy" / "Wait & Watch" / "Risky").
Thresholds unchanged. Before that, the API bucketed at 75/55/35 with
strong_buy/safe_buy/watch/avoid. Every consumer goes through tier_key() so
the boundaries move in one place.
"""
from typing import Optional

EXCELLENT = 75.0
GOOD = 60.0
AVERAGE = 45.0

TIER_KEYS = ("excellent", "good", "average", "weak")

TIER_WORDS = {
    "excellent": "Excellent",
    "good": "Good",
    "average": "Average",
    "weak": "Weak",
    "unknown": "Unrated",
}

# Bengali tier words — mirrored by frontend lib/constants.ts TIER_LABELS_BN.
TIER_WORDS_BN = {
    "excellent": "চমৎকার",
    "good": "ভালো",
    "average": "মাঝারি",
    "weak": "দুর্বল",
    "unknown": "রেটিং নেই",
}

# Old key -> new key, for stored docs written before the 2026-07 rename
# (e.g. users.last_recommendation picks). Read-time hygiene only — never
# emit the old keys in new data.
LEGACY_TIER_KEYS = {
    "strong_buy": "excellent",
    "buy": "good",
    "keep_watching": "average",
    "avoid": "weak",
}


def tier_key(score: Optional[float]) -> str:
    """Map a 0-100 fundamental score to its canonical tier key ("unknown" for None)."""
    if score is None:
        return "unknown"
    if score >= EXCELLENT:
        return "excellent"
    if score >= GOOD:
        return "good"
    if score >= AVERAGE:
        return "average"
    return "weak"
