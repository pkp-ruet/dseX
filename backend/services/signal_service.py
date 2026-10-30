"""
Canonical per-stock Buy / Sell signal (neutral = none, never Hold) — the single
source of truth for action advice across the app (rankings, stock page, picks,
portfolio, push).

Tiers (services/tiers.py) describe fundamental strength; this module says what
to DO about it. The signal is only ever Buy or Sell — anything neutral is left
empty (none) so the UI shows no chip. Rule order — fundamentals decide the
verb, valuation decides buy-vs-nothing, momentum only caps/dampens (a 7-day
streak never flips advice):

    1. unrated                        -> none
    2. tier weak                      -> sell  (momentum never rescues a weak company)
    3. tier average                   -> none  (no strong reason either way)
    4. good/excellent + Z category    -> none  (hard cap — never Buy a Z share)
    5. good/excellent + stale report  -> none  (cap)
    6. good/excellent + thin trading  -> none  (cap, < Tk 1mn avg 7d turnover)
    6b. good/excellent + latest EPS down >=25% YoY -> none (value-trap cap:
        "cheap for a reason"; backtested worse returns + fatter downside).
        "Latest" = this year's interim year-to-date when a quarterly report is
        newer than the audited year, else the last audited year.
    6c. good/excellent + DSE total loan > market cap -> none (heavy debt)
    6d. good/excellent + a serious red flag in its stock report (qualified
        audit, closed factory, a DSE query during a run, owners under 30% …)
        -> none (2026-10-30: the stock page's "anything wrong" light must
        never be red beside a Buy; read from the daily report snapshot)
    7. cheap (p4 >= 7): near 52w high -> none dampener, else -> buy
       (deeply cheap p4>=8 AND low in 52w range -> strength "strong")
    8. expensive (p4 < 4)             -> none  ("strong company, expensive price")
    9. mid/unknown valuation: excellent -> buy (near-high dampener applies),
       good -> none ("wait for a cheaper price")

The personalized per-holding overlay (holding_signal) layers the owner's entry
picture on top: Buy More, Sell, or empty (none) — never Hold. Its sell set is
identical to the pre-refactor rules, so deploying this never triggers spurious
"changed to Sell" pushes.

Every signal carries a one-sentence reason in English and Bengali (simple
everyday language; Western digits in Bengali per project convention).
"""
import math
from typing import Optional

from backend.services.db_service import _ttl_cache
from backend.services.tiers import tier_key

BUY, SELL, NONE = "buy", "sell", "none"

SIGNAL_WORDS = {"buy": "Buy", "sell": "Sell", "none": "Not rated"}
SIGNAL_WORDS_BN = {"buy": "কেনা যায়", "sell": "বিক্রি করুন", "none": "রেটিং নেই"}

# Per-holding overlay states — Buy More / Sell, or none (never Hold).
HOLDING_BUY_MORE, HOLDING_SELL = "buy_more", "sell"
HOLDING_SIGNAL_WORDS = {"buy_more": "Buy more", "sell": "Sell"}

CHEAP_P4 = 7.0        # p4_val >= 7 -> cheap vs own history + sector
EXPENSIVE_P4 = 4.0    # p4_val < 4  -> expensive
NEAR_HIGH_PCT = 85.0  # >= 85% of the 52w range -> buy dampener
EARNINGS_DROP_PCT = -25.0  # latest EPS fell >=25% YoY -> block buy (value trap)

# Conviction: a cheap Buy is upgraded to "strong" when the stock is DEEPLY cheap
# AND still low in its 52-week range (value + room to run). Backtest-validated
# (2026-07): strong buys returned ~2x the rest at 3 months (+6.3% vs +2.9%
# size-adjusted) with far fewer >15% drawdowns (1% vs 8%). Structural, not
# momentum-based, so the label doesn't vanish in a flat market.
STRONG_CHEAP_P4 = 8.0
STRONG_RANGE_PCT = 50.0
STRENGTH_STRONG, STRENGTH_NORMAL = "strong", "normal"

# reason_key -> (reason_en, reason_bn) — calm, plain full sentences (docs/voice.md).
REASONS: dict[str, tuple[str, str]] = {
    # --- stock-level ---
    "not_rated": (
        "We do not yet have enough information to rate this share.",
        "এই শেয়ারটি মূল্যায়ন করার মতো যথেষ্ট তথ্য এখনো আমাদের কাছে নেই।",
    ),
    "weak_fundamentals": (
        "The company's business is weak. It is safer to stay out for now.",
        "কোম্পানির ব্যবসা দুর্বল। আপাতত দূরে থাকাই নিরাপদ।",
    ),
    "average_fundamentals": (
        "This is an average company. There is no strong reason to buy or sell it now.",
        "এটি মাঝারি মানের কোম্পানি। এখন কেনা বা বিক্রির জোরালো কোনো কারণ নেই।",
    ),
    "z_category": (
        "The figures are good, but it is a Z-category share. That carries too much risk to buy.",
        "হিসাব ভালো, তবে এটি Z ক্যাটাগরির শেয়ার। কেনার জন্য ঝুঁকি অনেক বেশি।",
    ),
    "stale_financials": (
        "The company has not published new yearly accounts for several years. Please be careful.",
        "কোম্পানিটি কয়েক বছর ধরে নতুন বার্ষিক হিসাব প্রকাশ করেনি। সাবধান থাকুন।",
    ),
    "thin_trading": (
        "A good company, but very few of its shares are traded each day. Selling later may be difficult.",
        "কোম্পানিটি ভালো, তবে প্রতিদিন এর শেয়ার খুব কম লেনদেন হয়। পরে বিক্রি করা কঠিন হতে পারে।",
    ),
    "earnings_dropped": (
        "The price is low, but profit fell sharply in the latest results. Waiting until profit starts to recover is the safer choice.",
        "দাম কম, তবে সর্বশেষ হিসাবে মুনাফা অনেক কমেছে। মুনাফা আবার বাড়তে শুরু না করা পর্যন্ত অপেক্ষা করাই নিরাপদ।",
    ),
    "heavy_debt": (
        "The figures are good, but its loans are larger than the value of the whole company. That carries too much risk to buy.",
        "হিসাব ভালো, তবে এর ঋণ পুরো কোম্পানির বাজারমূল্যের চেয়েও বেশি। কেনার জন্য ঝুঁকি অনেক বেশি।",
    ),
    "red_flag": (
        "The figures are good, but we found a serious warning in its notices. Check it before buying.",
        "হিসাব ভালো, তবে এর নোটিশে একটি গুরুতর সতর্কতা পেয়েছি। কেনার আগে সেটি দেখে নিন।",
    ),
    "quality_cheap": (
        "A strong company, and its price is low right now.",
        "কোম্পানিটি শক্তিশালী, আর এখন এর দামও কম।",
    ),
    "near_52w_high": (
        "A strong company, but the price is close to its highest level this year. A lower price would be a better time to buy.",
        "কোম্পানিটি ভালো, তবে দাম এখন এ বছরের সর্বোচ্চের কাছাকাছি। দাম কিছুটা কমলে কেনা ভালো হবে।",
    ),
    "quality_expensive": (
        "A strong company, but its price is high right now.",
        "কোম্পানিটি শক্তিশালী, তবে এখন এর দাম বেশি।",
    ),
    "excellent_fair_price": (
        "An excellent company at a fair price.",
        "চমৎকার কোম্পানি, দামও ন্যায্য।",
    ),
    "good_wait_price": (
        "A good company. It is fine to keep, but a lower price would be a better time to buy more.",
        "ভালো কোম্পানি। ধরে রাখা যায়, তবে আরও কিনতে চাইলে দাম কমার অপেক্ষা করা ভালো।",
    ),
    # --- holding-level (personalized overlay) ---
    "bought_high_still_expensive": (
        "You bought at a high price and the price is still high. Limiting the loss is the sensible choice.",
        "আপনি বেশি দামে কিনেছিলেন, আর দাম এখনো বেশি। লোকসান সীমিত রাখাই বুদ্ধিমানের কাজ।",
    ),
    "still_attractive_add": (
        "The company still looks good value at today's price. Adding a few more shares is reasonable.",
        "আজকের দামেও কোম্পানিটি ভালো মূল্যে পাওয়া যাচ্ছে। অল্প কিছু শেয়ার আরও কেনা যুক্তিসঙ্গত।",
    ),
    "hold_steady": (
        "Nothing needs doing right now. Keeping the shares is fine.",
        "এখন কিছু করার দরকার নেই। শেয়ারগুলো ধরে রাখা ঠিক আছে।",
    ),
}

# Fields exposed on the wire (models.StockSignal); the internal object also
# carries score/p4_val for the holding overlay and debugging.
WIRE_FIELDS = ("signal", "reason_key", "reason_en", "reason_bn", "tier", "momentum_grade", "strength")


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
        score: Optional[float], p4: Optional[float],
        strength: str = STRENGTH_NORMAL) -> dict:
    en, bn = REASONS[key]
    return {
        "signal": signal, "reason_key": key, "reason_en": en, "reason_bn": bn,
        "tier": tier, "momentum_grade": grade, "score": score, "p4_val": p4,
        # Conviction, only meaningful when signal == "buy": "strong" | "normal".
        "strength": strength,
    }


def none_signal() -> dict:
    """Canonical 'not rated' object, for codes missing from the snapshot."""
    return _mk(NONE, "not_rated", "unknown", "unknown", None, None)


def wire_fields(sig: Optional[dict]) -> Optional[dict]:
    """Filter an internal signal object down to the wire model's fields."""
    if not sig:
        return None
    return {k: sig.get(k) for k in WIRE_FIELDS}


# Red-flag keys from the stock report that the rules above already cover
# (Z category, old accounts, loans over market value) — they keep their own
# reason instead of the generic "red_flag".
_COVERED_RED_KEYS = {"category", "stale", "loans"}


def _signal_for_row(row: dict, momentum: Optional[dict],
                    red_keys: Optional[list] = None) -> dict:
    score = _f(row.get("score"))
    tier = tier_key(score)
    grade = (momentum or {}).get("momentum_grade") or "unknown"
    p4 = _f(row.get("p4_val"))
    # This year's interim (year-to-date vs the same months last year) beats the
    # last audited year — it is the newer news (JAMUNAOIL: FY25 +47%, 9M FY26 -27%).
    eps_yoy = _f(row.get("interim_eps_yoy_pct"))
    if eps_yoy is None:
        eps_yoy = _f(row.get("eps_yoy_pct"))
    heavy_debt = str(row.get("debt_level") or "") == "over_mcap"
    pct52 = _f((momentum or {}).get("pct_in_52w_range"))
    zcat = str(row.get("market_cat") or "").strip().upper() == "Z"
    stale = row.get("stale_data")
    stale = bool(stale) and not (isinstance(stale, float) and math.isnan(stale))

    def mk(signal, key, strength=STRENGTH_NORMAL):
        return _mk(signal, key, tier, grade, score, p4, strength)

    # 1. No rating
    if tier == "unknown":
        return mk(NONE, "not_rated")
    # 2. Weak fundamentals -> sell, unconditionally
    if tier == "weak":
        return mk(SELL, "weak_fundamentals")
    # 3. Average fundamentals -> no signal (no strong reason either way)
    if tier == "average":
        return mk(NONE, "average_fundamentals")

    # ---- tier is good/excellent from here; caps run before any buy ----
    # 4. Z category hard-caps at no-buy (the category multiplier already dented
    #    the score, but a great business stuck in Z still must not get a Buy).
    if zcat:
        return mk(NONE, "z_category")
    # 5. Stale financials block buy (staleness multiplier may not have pushed
    #    the score below the Good boundary).
    if stale:
        return mk(NONE, "stale_financials")
    # 6. Illiquidity blocks a buy. Grade "unknown" (data gap) does NOT trigger
    #    this — a good company with a momentum gap still forks on valuation.
    if grade == "weak_liquidity":
        return mk(NONE, "thin_trading")
    # 6b. Earnings collapse blocks a buy — a still-highly-rated company whose
    #     most recent annual profit cratered is "cheap for a reason" (classic
    #     value trap). Backtested: buys with EPS down >=25% YoY returned worse
    #     with a fatter downside tail. Absence of the figure never blocks.
    if eps_yoy is not None and eps_yoy < EARNINGS_DROP_PCT:
        return mk(NONE, "earnings_dropped")
    # 6c. Loans bigger than the whole market value block a buy — the shareholders'
    #     stake is the thin slice on top of the lenders' (ACMELAB: loans 2,481 Cr
    #     vs market cap ~1,650 Cr). Loans > reserves alone already cap the
    #     Financial Health pillar in scoring; this is the harder line.
    if heavy_debt:
        return mk(NONE, "heavy_debt")
    # 6d. A serious red flag in the stock report blocks a buy.
    if any(k not in _COVERED_RED_KEYS for k in (red_keys or [])):
        return mk(NONE, "red_flag")

    # 7. Cheap: buy, unless the price already ran to the top of its 52w range.
    #    Deeply cheap + still low in the 52w range -> "strong" conviction.
    if p4 is not None and p4 >= CHEAP_P4:
        if pct52 is not None and pct52 >= NEAR_HIGH_PCT:
            return mk(NONE, "near_52w_high")
        strong = (p4 >= STRONG_CHEAP_P4
                  and pct52 is not None and pct52 <= STRONG_RANGE_PCT)
        return mk(BUY, "quality_cheap", STRENGTH_STRONG if strong else STRENGTH_NORMAL)
    # 8. Expensive: strong company, wrong price -> no buy.
    if p4 is not None and p4 < EXPENSIVE_P4:
        return mk(NONE, "quality_expensive")

    # 9. Mid (4 <= p4 < 7) or unknown valuation: quality decides. Excellent is
    #    rare and earns a Buy at a fair price; Good waits for a discount.
    if tier == "excellent":
        if pct52 is not None and pct52 >= NEAR_HIGH_PCT:
            return mk(NONE, "near_52w_high")
        return mk(BUY, "excellent_fair_price")
    return mk(NONE, "good_wait_price")


def _latest_red_keys() -> dict[str, list]:
    """{code: [red flag keys]} from the newest stock-report snapshot day
    (stock_report_service.store_snapshots, written by compute-scores). Empty
    when the collection is missing — the rule then simply doesn't fire."""
    try:
        from backend.services.db_service import get_db
        col = get_db()["stock_report_snapshots"]
        top = col.find_one({}, {"date": 1}, sort=[("date", -1)])
        if not top:
            return {}
        return {
            str(d["trading_code"]).upper(): list(d.get("red_keys") or [])
            for d in col.find({"date": top["date"]}, {"trading_code": 1, "red_keys": 1})
            if d.get("trading_code")
        }
    except Exception:  # noqa: BLE001 — a modifier, never a blocker
        return {}


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
    red = _latest_red_keys()
    for row in df.to_dict("records"):
        code = row.get("trading_code")
        if not code:
            continue
        out[str(code).upper()] = _signal_for_row(row, momentum.get(code), red.get(str(code).upper()))
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
    """Buy More / Sell for one owned holding — or none (never Hold).

    Derives from the canonical stock signal so the stock page and the
    portfolio can never disagree, then layers the owner's entry picture:
      - stock sell                                  -> sell (same reason)
      - loss > 5% and still expensive (p4 < 4)      -> sell (unchanged legacy rule)
      - stock buy and not already up >= 5%          -> buy_more
      - everything else                             -> none (no chip shown)

    The sell set is unchanged: a genuinely unrated stock has no p4, so the
    loss-cut rule still can't fire on it — only rated names (including the ones
    that now resolve to a neutral `none` at stock level) reach it.
    """
    sig = stock_sig or none_signal()
    base = sig.get("signal", NONE)
    if base == SELL:
        return _mk_holding(HOLDING_SELL, sig.get("reason_key") or "weak_fundamentals")
    if pnl_pct is not None:
        if p4 is not None and pnl_pct < -5 and p4 < EXPENSIVE_P4:
            return _mk_holding(HOLDING_SELL, "bought_high_still_expensive")
        if base == BUY and pnl_pct < 5:
            return _mk_holding(HOLDING_BUY_MORE, "still_attractive_add")
    return _mk_holding(NONE, "hold_steady")


# ---------------------------------------------------------------------------
# Daily signal snapshot (Phase 3)
# ---------------------------------------------------------------------------
#
# Persist one row per scored company per trading day so the signal's forward
# performance can be measured on a *growing, exact* history — no as-of
# reconstruction, no look-ahead. Written by the daily close job
# (`python main.py snapshot-signals`, also fired at the end of `scrape-all`);
# read later by scripts/signal_backtest.py once enough days accumulate.
#
# The live signal already composes last-computed fundamentals with FRESH
# momentum, so a snapshot taken right after the close scrape captures exactly
# what users saw that day.

_SNAPSHOT_COLLECTION = "signal_snapshots"


def snapshot_signals_today(date: Optional[str] = None) -> dict:
    """Compute today's signal for every scored company and upsert it into
    `signal_snapshots`, keyed by (date, trading_code).

    Idempotent per day — re-running overwrites the day's rows, so it is safe on
    cron re-runs and captures the final end-of-day state. Best-effort and
    read-mostly (only writes its own collection). Returns a summary dict.
    """
    from datetime import datetime, timezone
    from pymongo import ASCENDING, ReplaceOne
    from backend.services.db_service import get_db, load_latest_prices
    from backend.services.scoring_service import build_scores_df
    from backend.services.top20_service import compute_momentum_all, _market_window_raw

    invalidate_signal_cache()  # fresh compose of scores snapshot + live momentum
    df = build_scores_df()
    if df is None or df.empty:
        return {"date": None, "stored": 0, "reason": "no scores"}

    snap_date = str(date or _market_window_raw().get("as_of_date") or "")[:10]
    if not snap_date:
        return {"date": None, "stored": 0, "reason": "no trading date"}

    try:
        momentum = compute_momentum_all()
    except Exception:  # noqa: BLE001 — momentum is a modifier, never a blocker
        momentum = {}
    prices = load_latest_prices()  # true close on snap_date = the entry price
    red = _latest_red_keys()

    db = get_db()
    col = db[_SNAPSHOT_COLLECTION]
    existing = {ix["name"] for ix in col.list_indexes()}
    if "date_1_trading_code_1" not in existing:
        col.create_index([("date", ASCENDING), ("trading_code", ASCENDING)],
                         unique=True, name="date_1_trading_code_1")
    if "trading_code_1_date_1" not in existing:  # one company's score history
        col.create_index([("trading_code", ASCENDING), ("date", ASCENDING)],
                         name="trading_code_1_date_1")

    now = datetime.now(timezone.utc)
    ops, counts = [], {"buy": 0, "sell": 0, "none": 0}
    for row in df.to_dict("records"):
        code = row.get("trading_code")
        if not code:
            continue
        code = str(code).upper()
        mom = momentum.get(code)
        sig = _signal_for_row(row, mom, red.get(code))
        stale = row.get("stale_data")
        if stale is None:
            stale_val = None
        elif isinstance(stale, float) and math.isnan(stale):
            stale_val = False
        else:
            stale_val = bool(stale)
        rec = {
            "date": snap_date,
            "trading_code": code,
            "signal": sig.get("signal"),
            "strength": sig.get("strength"),
            "reason_key": sig.get("reason_key"),
            "tier": sig.get("tier"),
            "momentum_grade": sig.get("momentum_grade"),
            "score": _f(row.get("score")),
            "p4_val": _f(row.get("p4_val")),
            # The other pillars (since 2026-10-25) — score_history explains a
            # grade change by the pillar that moved it.
            "p1_biz": _f(row.get("p1_biz")),
            "p2_health": _f(row.get("p2_health")),
            "p3_moat": _f(row.get("p3_moat")),
            "p5_div": _f(row.get("p5_div")),
            "pct_in_52w_range": (mom or {}).get("pct_in_52w_range"),
            "market_cat": (str(row.get("market_cat")).strip().upper()
                           if row.get("market_cat") is not None else None),
            "stale_data": stale_val,
            "mcap_mn": _f(row.get("mcap_mn")),
            "sector": row.get("sector"),
            "ltp": _f((prices.get(code) or {}).get("ltp")) or _f(row.get("ltp")),
            "computed_at": now,
        }
        counts[rec["signal"]] = counts.get(rec["signal"], 0) + 1
        ops.append(ReplaceOne({"date": snap_date, "trading_code": code}, rec, upsert=True))

    if ops:
        col.bulk_write(ops, ordered=False)
    return {"date": snap_date, "stored": len(ops), **counts}
