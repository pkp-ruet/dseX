"""
Canonical per-stock Buy / Hold / Sell signal — the single source of truth for
action advice across the app (rankings, stock page, picks, portfolio, push).

Tiers (services/tiers.py) describe fundamental strength; this module says what
to DO about it. Rule order — fundamentals decide the verb, valuation decides
buy-vs-hold, momentum only caps/dampens (a 7-day streak never flips advice):

    1. unrated                        -> none
    2. tier weak                      -> sell  (momentum never rescues a weak company)
    3. tier average                   -> hold
    4. good/excellent + Z category    -> hold  (hard cap — never Buy a Z share)
    5. good/excellent + stale report  -> hold  (cap)
    6. good/excellent + thin trading  -> hold  (cap, < Tk 1mn avg 7d turnover)
    7. cheap (p4 >= 7): near 52w high -> hold dampener, else -> buy
    8. expensive (p4 < 4)             -> hold  ("strong company, expensive price")
    9. mid/unknown valuation: excellent -> buy (near-high dampener applies),
       good -> hold ("wait for a cheaper price")

The personalized per-holding overlay (holding_signal) layers the owner's entry
picture on top and reuses the persisted portfolio_signals enum
(buy_more/hold/sell). Its sell set is identical to the pre-refactor rules, so
deploying this never triggers spurious "changed to Sell" pushes.

Every signal carries a one-sentence reason in English and Bengali (simple
everyday language; Western digits in Bengali per project convention).
"""
import math
from typing import Optional

from backend.services.db_service import _ttl_cache
from backend.services.tiers import tier_key

BUY, HOLD, SELL, NONE = "buy", "hold", "sell", "none"

SIGNAL_WORDS = {"buy": "Buy", "hold": "Hold", "sell": "Sell", "none": "Not Rated"}
SIGNAL_WORDS_BN = {"buy": "কেনা যায়", "hold": "ধরে রাখুন", "sell": "বিক্রি করুন", "none": "রেটিং নেই"}

# Per-holding overlay states — the persisted portfolio_signals enum (unchanged).
HOLDING_BUY_MORE, HOLDING_HOLD, HOLDING_SELL = "buy_more", "hold", "sell"
HOLDING_SIGNAL_WORDS = {"buy_more": "Buy More", "hold": "Hold", "sell": "Sell"}

CHEAP_P4 = 7.0        # p4_val >= 7 -> cheap vs own history + sector
EXPENSIVE_P4 = 4.0    # p4_val < 4  -> expensive
NEAR_HIGH_PCT = 85.0  # >= 85% of the 52w range -> buy dampener

# reason_key -> (reason_en, reason_bn) — one short everyday-language sentence each.
REASONS: dict[str, tuple[str, str]] = {
    # --- stock-level ---
    "not_rated": (
        "We don't have enough information to rate this stock yet.",
        "এই শেয়ারটি যাচাই করার মতো যথেষ্ট তথ্য এখনো নেই।",
    ),
    "weak_fundamentals": (
        "The company's business is weak — better to stay away.",
        "কোম্পানির ব্যবসার অবস্থা দুর্বল — দূরে থাকাই ভালো।",
    ),
    "average_fundamentals": (
        "An average company — no strong reason to buy or sell.",
        "মাঝারি মানের কোম্পানি — কেনা বা বেচার জোরালো কারণ নেই।",
    ),
    "z_category": (
        "Good numbers, but it's a Z-category share — too risky to buy.",
        "হিসাব ভালো, কিন্তু এটি Z ক্যাটাগরির শেয়ার — কেনা ঝুঁকিপূর্ণ।",
    ),
    "stale_financials": (
        "The company hasn't published fresh accounts in years — be careful.",
        "কোম্পানিটি কয়েক বছর ধরে নতুন হিসাব প্রকাশ করেনি — সাবধান থাকুন।",
    ),
    "thin_trading": (
        "Good company, but very few shares trade daily — selling later may be hard.",
        "কোম্পানি ভালো, কিন্তু শেয়ার খুব কম কেনাবেচা হয় — পরে বেচা কঠিন হতে পারে।",
    ),
    "quality_cheap": (
        "Strong company and the price looks cheap right now.",
        "শক্তিশালী কোম্পানি, দামও এখন তুলনামূলক সস্তা।",
    ),
    "near_52w_high": (
        "Strong company, but the price is near its one-year high — wait for a better entry.",
        "কোম্পানি ভালো, কিন্তু দাম এখন বছরের সর্বোচ্চের কাছাকাছি — একটু অপেক্ষা করুন।",
    ),
    "quality_expensive": (
        "Strong company, but the price is expensive right now.",
        "কোম্পানি শক্তিশালী, কিন্তু দাম এখন বেশ চড়া।",
    ),
    "excellent_fair_price": (
        "Excellent company at a reasonable price.",
        "চমৎকার কোম্পানি, দামও যুক্তিসঙ্গত।",
    ),
    "good_wait_price": (
        "Good company — fine to hold, but wait for a cheaper price to buy.",
        "ভালো কোম্পানি — ধরে রাখা যায়, তবে কেনার জন্য আরেকটু কম দামের অপেক্ষা করুন।",
    ),
    # --- holding-level (personalized overlay) ---
    "bought_high_still_expensive": (
        "You bought high and the price is still expensive — cutting the loss is sensible.",
        "বেশি দামে কেনা হয়েছিল, দাম এখনো চড়া — লোকসান সীমিত করাই বুদ্ধিমানের কাজ।",
    ),
    "still_attractive_add": (
        "The company still looks attractive at today's price — adding a little is reasonable.",
        "আজকের দামেও কোম্পানিটি আকর্ষণীয় — অল্প করে আরও কেনা যেতে পারে।",
    ),
    "hold_steady": (
        "No action needed — holding is fine for now.",
        "এখন কিছু করার দরকার নেই — ধরে রাখুন।",
    ),
}

# Fields exposed on the wire (models.StockSignal); the internal object also
# carries score/p4_val for the holding overlay and debugging.
WIRE_FIELDS = ("signal", "reason_key", "reason_en", "reason_bn", "tier", "momentum_grade")


def _f(v) -> Optional[float]:
    """NaN/Inf-safe float (pandas rows leak NaN — NaN comparisons are all False,
    which would misclassify a NaN score as tier weak -> false Sell)."""
    if v is None:
        return None
    try:
        fv = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(fv) or math.isinf(fv):
        return None
    return fv


def _mk(signal: str, key: str, tier: str, grade: str,
        score: Optional[float], p4: Optional[float]) -> dict:
    en, bn = REASONS[key]
    return {
        "signal": signal, "reason_key": key, "reason_en": en, "reason_bn": bn,
        "tier": tier, "momentum_grade": grade, "score": score, "p4_val": p4,
    }


def none_signal() -> dict:
    """Canonical 'not rated' object, for codes missing from the snapshot."""
    return _mk(NONE, "not_rated", "unknown", "unknown", None, None)


def wire_fields(sig: Optional[dict]) -> Optional[dict]:
    """Filter an internal signal object down to the wire model's fields."""
    if not sig:
        return None
    return {k: sig.get(k) for k in WIRE_FIELDS}


def _signal_for_row(row: dict, momentum: Optional[dict]) -> dict:
    score = _f(row.get("score"))
    tier = tier_key(score)
    grade = (momentum or {}).get("momentum_grade") or "unknown"
    p4 = _f(row.get("p4_val"))
    pct52 = _f((momentum or {}).get("pct_in_52w_range"))
    zcat = str(row.get("market_cat") or "").strip().upper() == "Z"
    stale = row.get("stale_data")
    stale = bool(stale) and not (isinstance(stale, float) and math.isnan(stale))

    def mk(signal, key):
        return _mk(signal, key, tier, grade, score, p4)

    # 1. No rating
    if tier == "unknown":
        return mk(NONE, "not_rated")
    # 2. Weak fundamentals -> sell, unconditionally
    if tier == "weak":
        return mk(SELL, "weak_fundamentals")
    # 3. Average fundamentals -> hold, unconditionally
    if tier == "average":
        return mk(HOLD, "average_fundamentals")

    # ---- tier is good/excellent from here; caps run before any buy ----
    # 4. Z category hard-caps at hold (the category multiplier already dented
    #    the score, but a great business stuck in Z still must not get a Buy).
    if zcat:
        return mk(HOLD, "z_category")
    # 5. Stale financials block buy (staleness multiplier may not have pushed
    #    the score below the Good boundary).
    if stale:
        return mk(HOLD, "stale_financials")
    # 6. Illiquidity caps at hold. Grade "unknown" (data gap) does NOT trigger
    #    this — a good company with a momentum gap still forks on valuation.
    if grade == "weak_liquidity":
        return mk(HOLD, "thin_trading")

    # 7. Cheap: buy, unless the price already ran to the top of its 52w range.
    if p4 is not None and p4 >= CHEAP_P4:
        if pct52 is not None and pct52 >= NEAR_HIGH_PCT:
            return mk(HOLD, "near_52w_high")
        return mk(BUY, "quality_cheap")
    # 8. Expensive: strong company, wrong price.
    if p4 is not None and p4 < EXPENSIVE_P4:
        return mk(HOLD, "quality_expensive")

    # 9. Mid (4 <= p4 < 7) or unknown valuation: quality decides. Excellent is
    #    rare and earns a Buy at a fair price; Good waits for a discount.
    if tier == "excellent":
        if pct52 is not None and pct52 >= NEAR_HIGH_PCT:
            return mk(HOLD, "near_52w_high")
        return mk(BUY, "excellent_fair_price")
    return mk(HOLD, "good_wait_price")


@_ttl_cache(300)
def build_signals() -> dict[str, dict]:
    """{trading_code: signal_obj} for every scored company (bulk, cached).

    Composes the scores snapshot with the shared bulk momentum window; both
    upstreams carry their own 300s caches, so this is one cheap dict pass.
    """
    # Lazy imports — scoring_service's invalidation hook imports this module.
    from backend.services.scoring_service import build_scores_df
    from backend.services.top20_service import compute_momentum_all

    df = build_scores_df()
    out: dict[str, dict] = {}
    if df.empty:
        return out
    try:
        momentum = compute_momentum_all()
    except Exception:  # noqa: BLE001 — momentum is a modifier, never a blocker
        momentum = {}
    for row in df.to_dict("records"):
        code = row.get("trading_code")
        if not code:
            continue
        out[str(code).upper()] = _signal_for_row(row, momentum.get(code))
    return out


def get_signal(code: str) -> dict:
    """Signal for one code — never None (falls back to the 'not rated' object)."""
    if not code:
        return none_signal()
    return build_signals().get(str(code).upper()) or none_signal()


def invalidate_signal_cache() -> None:
    build_signals.cache_clear()


# ---------------------------------------------------------------------------
# Personalized per-holding overlay
# ---------------------------------------------------------------------------

def _mk_holding(signal: str, key: str) -> dict:
    en, bn = REASONS[key]
    return {"signal": signal, "reason_key": key, "reason_en": en, "reason_bn": bn}


def holding_signal(stock_sig: Optional[dict],
                   pnl_pct: Optional[float],
                   p4: Optional[float]) -> dict:
    """Buy More / Hold / Sell for one owned holding.

    Derives from the canonical stock signal so the stock page and the
    portfolio can never disagree, then layers the owner's entry picture:
      - stock sell                                  -> sell (same reason)
      - loss > 5% and still expensive (p4 < 4)      -> sell (unchanged legacy rule)
      - stock buy and not already up >= 5%          -> buy_more
      - everything else                             -> hold
    """
    sig = stock_sig or none_signal()
    base = sig.get("signal", NONE)
    if base == SELL:
        return _mk_holding(HOLDING_SELL, sig.get("reason_key") or "weak_fundamentals")
    if base == NONE or pnl_pct is None:
        return _mk_holding(HOLDING_HOLD, "hold_steady")
    if p4 is not None and pnl_pct < -5 and p4 < EXPENSIVE_P4:
        return _mk_holding(HOLDING_SELL, "bought_high_still_expensive")
    if base == BUY and pnl_pct < 5:
        return _mk_holding(HOLDING_BUY_MORE, "still_attractive_add")
    return _mk_holding(HOLDING_HOLD, "hold_steady")
