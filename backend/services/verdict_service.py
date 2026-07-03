"""
Stock verdict generator — combines DSEF fundamentals with 7-day market momentum
into a 2-3 sentence retail-friendly conclusion.

Fundamentals are primary; momentum modifies tone and horizon.
"""
from typing import Optional

from backend.services.tiers import TIER_WORDS as _TIER_WORD, tier_key as _tier_key


# (tier, momentum_grade) -> (tagline, lead_sentence, stance, horizon)
_MATRIX = {
    ("strong_buy", "hot"): (
        "Strong company, price already rising",
        "The company's profits and balance sheet are strong, and buyers are actively pushing the price up. Both signals agree — this looks like a good long-term hold.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "warm"): (
        "Strong company, price slowly rising",
        "The company is doing well financially, and the share price has been slowly climbing. A safe choice for people who want to hold for the long term.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "flat"): (
        "Strong company, but market hasn't noticed yet",
        "The company has strong profits and a healthy balance sheet, but the share price has not moved for weeks. Patient long-term investors may benefit if the market wakes up to it later.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "cold"): (
        "Strong company, share price falling lately",
        "The company is financially strong, but the share price has dropped recently. This may be a chance to buy slowly, a little at a time, if you plan to hold for years.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "weak_liquidity"): (
        "Strong company, but very few shares trade daily",
        "The company is financially strong, but very few shares are bought and sold each day. Fine to hold for the long term, but selling a big amount quickly will be difficult.",
        "long_term_hold", "Long-term hold",
    ),
    ("strong_buy", "unknown"): (
        "Strong company, recent trading data unclear",
        "The company's numbers are strong, but there is not enough recent trading data to judge the share price trend.",
        "long_term_hold", "Long-term hold",
    ),

    ("buy", "hot"): (
        "Good company, market is buying actively",
        "The company's numbers are good, and people are buying the share and pushing the price up. The market agrees with the quality — looks like a reasonable long-term hold.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "warm"): (
        "Good company, price moving up steadily",
        "The company is in good financial shape, and the share price is steadily rising. A reasonable choice if you want to hold for the long term.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "flat"): (
        "Good company, but share is quiet",
        "The company's numbers are good, but the share has been quiet — the price is not moving much. Fine for long-term holders; do not expect quick gains.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "cold"): (
        "Good company, but price is falling lately",
        "The company's numbers are good, but the share price has been falling. Better to wait for the fall to stop, or buy slowly in small amounts.",
        "wait", "Watch list",
    ),
    ("buy", "weak_liquidity"): (
        "Good company, but very few shares trade daily",
        "The company is in good financial shape, but very few shares are bought and sold each day. Only for people who want to hold long term and do not need to sell quickly.",
        "long_term_hold", "Long-term hold",
    ),
    ("buy", "unknown"): (
        "Good company, recent trading data unclear",
        "The company's numbers are good, but there is not enough recent trading data to judge how the share is moving.",
        "long_term_hold", "Long-term hold",
    ),

    ("keep_watching", "hot"): (
        "Average company, but share is running hot",
        "The company's numbers are average — not strong, not weak. But people are buying the share heavily right now and pushing the price up fast. This is a short-term trade for people who accept risk — not a long-term hold.",
        "short_term_trade", "Short-term only",
    ),
    ("keep_watching", "warm"): (
        "Average company, mild buying interest",
        "The company's numbers are average, and the share price is slowly going up. There is no strong reason to buy for the long term — better to wait for clearer signals.",
        "wait", "Watch list",
    ),
    ("keep_watching", "flat"): (
        "Average company, very little trading",
        "The company's profits and balance sheet are average — not strong, not weak. The share price is also quiet, not moving much in either direction. There is no clear reason to buy or sell — better to wait and watch.",
        "wait", "Watch list",
    ),
    ("keep_watching", "cold"): (
        "Average company, share price falling",
        "The company's numbers are average, and the share price is slowly going down. Better to wait or look at other stocks.",
        "wait", "Watch list",
    ),
    ("keep_watching", "weak_liquidity"): (
        "Average company, very few shares trade daily",
        "The company's numbers are average, and very few shares are bought and sold each day. Better to avoid — you may get stuck if you need to sell.",
        "avoid", "Avoid",
    ),
    ("keep_watching", "unknown"): (
        "Average company, recent trading data unclear",
        "The company's numbers are average, and there is not enough recent trading data to judge the share price.",
        "wait", "Watch list",
    ),

    ("avoid", "hot"): (
        "Weak company, but share is running hot",
        "The company's profits and balance sheet are weak, but the share price is rising fast right now. Risk-takers may make a quick gain, but this is not safe to hold for the long term.",
        "short_term_trade", "Short-term only",
    ),
    ("avoid", "warm"): (
        "Weak company, slow price rise",
        "The company's numbers are weak, and the share price is slowly going up. Risky for long-term holding — only consider careful short-term trades.",
        "short_term_trade", "Short-term only",
    ),
    ("avoid", "flat"): (
        "Weak company, quiet trading",
        "The company's numbers are weak and the share price is barely moving. Better to avoid — there is no real reason to put your money here.",
        "avoid", "Avoid",
    ),
    ("avoid", "cold"): (
        "Weak company, price falling",
        "The company's numbers are weak, and the share price keeps falling. Best to avoid.",
        "avoid", "Avoid",
    ),
    ("avoid", "weak_liquidity"): (
        "Weak company, very few shares trade daily",
        "The company's numbers are weak, and very few shares are bought and sold each day. Avoid — you may not be able to sell when you want to.",
        "avoid", "Avoid",
    ),
    ("avoid", "unknown"): (
        "Weak company, recent trading data unclear",
        "The company's numbers are weak, and there is not enough recent trading data to judge the share price.",
        "avoid", "Avoid",
    ),

    ("unknown", "hot"): ("No rating, share is running hot",
        "We do not have enough data to rate the company. The share price is rising fast right now, but without checking the business numbers, this is only a short-term gamble.",
        "short_term_trade", "Short-term only"),
    ("unknown", "warm"): ("No rating available", "We do not have enough data to rate this company's business.", "wait", "Watch list"),
    ("unknown", "flat"): ("No rating available", "We do not have enough data to rate this company's business.", "wait", "Watch list"),
    ("unknown", "cold"): ("No rating, price is falling", "We do not have enough data to rate the company, and the share price is falling lately.", "avoid", "Avoid"),
    ("unknown", "weak_liquidity"): ("No rating, very few shares trade daily", "We do not have enough data to rate the company, and very few shares are bought and sold each day. Better to avoid.", "avoid", "Avoid"),
    ("unknown", "unknown"): ("No rating available", "We do not have enough data to give a clear opinion on this stock.", "wait", "Watch list"),
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
        out.append("Has paid dividends regularly in past years.")

    # Valuation clause
    p4_pe = sr.get("p4_pe")
    if p4_pe is not None and p4_pe >= 8:
        out.append("The share price looks cheaper now than its average over the past few years.")
    elif p4_pe is not None and p4_pe <= 1:
        out.append("The share price looks more expensive now than its 5-year average.")

    # 52w range clause
    pct = (momentum or {}).get("pct_in_52w_range")
    if pct is not None:
        if pct >= 85 and tier in ("strong_buy", "buy"):
            out.append("Price is close to the highest level of the past year — not much room left for a cheap entry.")
        elif pct <= 15 and tier in ("strong_buy", "buy"):
            out.append("Price is close to the lowest level of the past year — may be a good time to buy slowly.")

    # Risk clause (latest EPS negative)
    if financials:
        latest = financials[-1] if financials else None
        if latest:
            eps = latest.get("eps")
            if isinstance(eps, (int, float)) and eps < 0:
                out.append("The company lost money in its most recent year — be careful.")

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
