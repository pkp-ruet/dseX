"""
Canonical fundamental-strength tier thresholds — the single source of truth
for the backend.

Aligned with frontend lib/constants.ts (TIER_THRESHOLDS / TIER_LABELS):
    excellent   score >= 75    "Strong all round"
    good        score >= 60    "Mostly strong"
    average     score >= 45    "Mixed"
    weak        score <  45    "Mostly weak"

Tiers describe how fundamentally strong the company is — nothing else.
Action advice (Buy / Sell, else none) lives in services/signal_service.py and
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

# The grade names a reader sees (2026-10-31, after the company ranking
# redesign): named by what the company is like on our five checks. The old
# words (Excellent / Good / Average / Weak) are retired from the screen; the
# keys stay. Mirrored by frontend lib/constants.ts TIER_LABELS.
TIER_WORDS = {
    "excellent": "Strong all round",
    "good": "Mostly strong",
    "average": "Mixed",
    "weak": "Mostly weak",
    "unknown": "Unrated",
}

# Bengali grade names — mirrored by frontend lib/constants.ts TIER_LABELS_BN.
TIER_WORDS_BN = {
    "excellent": "সব দিকে শক্তিশালী",
    "good": "বেশিরভাগ দিকে শক্তিশালী",
    "average": "মিশ্র",
    "weak": "বেশিরভাগ দিকে দুর্বল",
    "unknown": "রেটিং নেই",
}

# Kept for callers written before the names became the label (score_history's
# push line). Same words as above.
GROUP_WORDS = {k: (TIER_WORDS[k], TIER_WORDS_BN[k]) for k in TIER_KEYS}

# "Mostly strong or better": the two top grades together, for counts.
GOOD_OR_BETTER = ("mostly strong or better", "বেশিরভাগ দিকে শক্তিশালী বা তার বেশি")


def tier_phrase(key: str) -> tuple[str, str]:
    """A grade name for running text: lower-case English ("is mostly strong")."""
    return TIER_WORDS.get(key, "Unrated").lower(), TIER_WORDS_BN.get(key, "রেটিং নেই")


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
