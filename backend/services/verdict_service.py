"""
Stock verdict generator — combines DSEF fundamentals with 7-day market momentum
into a 2-3 sentence retail-friendly conclusion.

Fundamentals are primary; momentum modifies tone and horizon.
"""
from typing import Optional


# DSEF tier thresholds (mirror of frontend lib/constants getTier)
def _tier_key(score: Optional[float]) -> str:
    if score is None:
        return "unknown"
    if score >= 75:
        return "strong_buy"
    if score >= 60:
        return "buy"
    if score >= 45:
        return "keep_watching"
    return "avoid"


_TIER_WORD = {
    "strong_buy": "Strong Buy",
    "buy": "Buy",
    "keep_watching": "Watch",
    "avoid": "Risky",
    "unknown": "Unrated",
}


# (tier, momentum_grade) -> (tagline, lead_sentence, stance, horizon)
_MATRIX = {
    ("strong_buy", "hot"): (
        "Quality + momentum lining up",
        "Fundamentals are strong and the market is bidding the stock up — both signals agree.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "warm"): (
        "Quality with steady tape",
        "Fundamentally strong with the price quietly trending higher — a clean long-term hold.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "flat"): (
        "Fundamentally strong, market asleep",
        "Fundamentals are strong but the market hasn't noticed — flat trading for weeks. Good for patient long-term holders willing to wait for the re-rating.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "cold"): (
        "Strong fundamentals, price drifting down",
        "Fundamentally strong but the share price has weakened recently. A possible accumulation window for long-term holders willing to average in.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "weak_liquidity"): (
        "Strong but illiquid",
        "Fundamentally strong but trades thinly — fine to hold long term, but exiting a large position may be slow.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "unknown"): (
        "Fundamentally strong",
        "Fundamentally strong; market signal is unclear due to limited recent trading data.",
        "long_term_hold", "Long-term hold",
    ),

    ("buy", "hot"): (
        "Solid + market agreeing",
        "Solid fundamentals with the market actively bidding it up — momentum confirms the quality call.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "warm"): (
        "Solid and steady",
        "Solid fundamentals and a steady price trend — a reasonable long-term hold.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "flat"): (
        "Solid but quiet",
        "Solid fundamentals but the stock has been quiet — fine for long-term holders, no near-term catalyst.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "cold"): (
        "Solid fundamentals, recent weakness",
        "Solid fundamentals but the price has been falling — wait for the slide to settle, or accumulate gradually.",
        "wait", "Watch list",
    ),
    ("buy", "weak_liquidity"): (
        "Solid but illiquid",
        "Solid fundamentals but very low daily turnover — long-term holders only.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "unknown"): (
        "Solid fundamentals",
        "Solid fundamentals; market signal is unclear due to limited recent trading data.",
        "long_term_hold", "Long-term hold",
    ),

    ("keep_watching", "hot"): (
        "Mixed financials, momentum running",
        "Financials are mixed but the stock is running on short-term momentum. Speculative short-term trade only — not a long-term hold.",
        "short_term_trade", "Short-term only",
    ),
    ("keep_watching", "warm"): (
        "Mixed, modest interest",
        "Financials are mixed and the price is drifting up gently — no clear long-term edge; wait for stronger evidence.",
        "wait", "Watch list",
    ),
    ("keep_watching", "flat"): (
        "Mixed and quiet",
        "Financials are mixed and trading is quiet — no clear edge either way.",
        "wait", "Watch list",
    ),
    ("keep_watching", "cold"): (
        "Mixed and weakening",
        "Financials are mixed and the price is sliding — better to wait or pass.",
        "wait", "Watch list",
    ),
    ("keep_watching", "weak_liquidity"): (
        "Mixed and illiquid",
        "Financials are mixed and the stock barely trades — better avoided.",
        "avoid", "Avoid",
    ),
    ("keep_watching", "unknown"): (
        "Mixed and unclear",
        "Financials are mixed and recent market signal is unclear.",
        "wait", "Watch list",
    ),

    ("avoid", "hot"): (
        "Weak fundamentals, hot run",
        "Financials are weak but the stock is running hot — possible short-term gain for risk-tolerant traders, but not a long-term hold.",
        "short_term_trade", "Short-term only",
    ),
    ("avoid", "warm"): (
        "Weak fundamentals, mild bid",
        "Financials are weak with a mild bid — risky for long term, only for careful short-term trades.",
        "short_term_trade", "Short-term only",
    ),
    ("avoid", "flat"): (
        "Weak and quiet",
        "Weak financials and quiet trading — better avoided.",
        "avoid", "Avoid",
    ),
    ("avoid", "cold"): (
        "Weak and falling",
        "Weak financials and a falling price — avoid.",
        "avoid", "Avoid",
    ),
    ("avoid", "weak_liquidity"): (
        "Weak and illiquid",
        "Weak financials and barely trades — avoid.",
        "avoid", "Avoid",
    ),
    ("avoid", "unknown"): (
        "Weak fundamentals",
        "Weak financials; market signal is unclear.",
        "avoid", "Avoid",
    ),

    ("unknown", "hot"): ("Unrated, momentum running",
        "Fundamentals are not rated; the stock is running on short-term momentum only.",
        "short_term_trade", "Short-term only"),
    ("unknown", "warm"): ("Unrated", "Fundamentals are not rated.", "wait", "Watch list"),
    ("unknown", "flat"): ("Unrated", "Fundamentals are not rated.", "wait", "Watch list"),
    ("unknown", "cold"): ("Unrated", "Fundamentals are not rated and price is weak.", "avoid", "Avoid"),
    ("unknown", "weak_liquidity"): ("Unrated, illiquid", "Unrated and barely trades — avoid.", "avoid", "Avoid"),
    ("unknown", "unknown"): ("Unrated", "Not enough data to form a verdict.", "wait", "Watch list"),
}


def _supporting_clauses(tier: str,
                        score_row: Optional[dict],
                        signal_flags: Optional[dict],
                        momentum: Optional[dict],
                        financials: Optional[list]) -> list[str]:
    """Pick at most one clause from each of: dividend, valuation, range, risk."""
    out: list[str] = []
    sr = score_row or {}
    flags = signal_flags or {"green": [], "red": []}

    # Dividend clause
    p5 = sr.get("p5_div")
    div_y = sr.get("div_yield_pct")
    if (p5 is not None and p5 >= 7) or (div_y is not None and div_y >= 5):
        out.append("Pays dividend reliably.")

    # Valuation clause
    p4_pe = sr.get("p4_pe")
    if p4_pe is not None and p4_pe >= 8:
        out.append("Currently priced cheaper than its own history.")
    elif p4_pe is not None and p4_pe <= 1:
        out.append("Priced richer than its 5-year average.")

    # 52w range clause
    pct = (momentum or {}).get("pct_in_52w_range")
    if pct is not None:
        if pct >= 85 and tier in ("strong_buy", "buy"):
            out.append("Near its 1-year high — limited bargain at this level.")
        elif pct <= 15 and tier in ("strong_buy", "buy"):
            out.append("Near its 1-year low — possible value entry.")

    # Risk clause (latest EPS negative)
    if financials:
        latest = financials[-1] if financials else None
        if latest:
            eps = latest.get("eps")
            if isinstance(eps, (int, float)) and eps < 0:
                out.append("Lost money in the most recent year — fragile.")

    # Cap to 2 supporting clauses to keep output to 2-3 sentences total
    return out[:2]


def build_verdict(score_row: Optional[dict],
                  momentum: Optional[dict],
                  signal_flags: Optional[dict],
                  latest_price: Optional[dict],
                  financials: Optional[list]) -> dict:
    score = (score_row or {}).get("score") if score_row else None
    tier = _tier_key(score)
    grade = (momentum or {}).get("momentum_grade", "unknown")

    tagline, lead, stance, horizon = _MATRIX.get(
        (tier, grade),
        _MATRIX[(tier, "unknown")],
    )

    sentences = [lead] + _supporting_clauses(tier, score_row, signal_flags, momentum, financials)

    return {
        "headline": _TIER_WORD[tier],
        "tagline": tagline,
        "sentences": sentences,
        "stance": stance,
        "horizon_hint": horizon,
    }
