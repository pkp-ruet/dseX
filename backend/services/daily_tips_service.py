"""
Daily "TopStockBD Tips" — conviction picks from raw Dhaka Stock Exchange data.

Each tip points at one stock and stacks 2–3 plain, verifiable facts pulled
straight from the data (profit growth, dividend yield, cheap vs sector, below
book, near 52-week low, dividend just declared, etc.) plus a one-line "why it
matters" explainer that teaches the concept.

Design (rewritten):
  * NO composite score / pillar terms are used for selection — tips stand on raw
    facts only ("pure data basis").
  * A DSE-specific quality gate keeps junk out: Z-category excluded, profitable
    only, minimum market cap + liquidity, recent financials.
  * Conviction = how many independent raw signals a stock passes. A stock needs
    at least MIN_SIGNALS to qualify; its strongest facts are stacked into one tip.

Generation mirrors the score snapshot: tips are computed once per day right
after the scrape (see `cmd_scrape_all` in the root `main.py`) and stored in the
`daily_tips` collection (one doc per date). The public read path just returns
the newest stored doc, so API requests stay cheap.

The raw per-stock numbers (EPS, dividend yield, sector-median P/E, NAV, market
cap) are read off `build_scores_df()`'s output columns — but the blended
`score` / `p1..p5` pillars are deliberately ignored here.
"""
import math
import random
from datetime import datetime, timedelta, timezone

from typing import Optional

from pymongo import ASCENDING, DESCENDING, UpdateOne

from backend.services.db_service import (
    get_db,
    load_companies,
    load_latest_prices,
    load_dividend_declarations,
)
from backend.services.scoring_service import build_scores_df

MAX_TIPS = 10
MIN_SIGNALS = 2          # a stock needs ≥2 raw signals to become a conviction tip

# --- DSE-tuned quality-gate thresholds (raw data, no score) ---
MIN_MCAP_MN = 1000.0     # ≥ ৳100 crore market cap — floors out shells
MIN_TURNOVER_MN = 2.0    # ≥ ৳2M average daily turnover (20d) — kills illiquid/Z stocks
LIQUIDITY_WINDOW_DAYS = 30   # calendar days ≈ 20 trading days for the turnover average
CATALYST_WINDOW_DAYS = 30    # a dividend declaration counts as "just declared" for 30 days
REL_STRENGTH_WINDOW_DAYS = 95  # ~90 trading-day window for relative strength vs DSEX

# Admin-curated blacklist: stocks here never appear in any tip.
EXCLUDES_COLLECTION = "daily_tips_excludes"


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def ensure_daily_tips_indexes() -> None:
    db = get_db()
    db.daily_tips.create_index([("date", DESCENDING)], unique=True)
    db[EXCLUDES_COLLECTION].create_index([("trading_code", ASCENDING)], unique=True)


# ---------------------------------------------------------------------------
# Admin exclusion list — curated blacklist of stocks barred from tips
# ---------------------------------------------------------------------------

def load_excluded_codes() -> set[str]:
    col = get_db()[EXCLUDES_COLLECTION]
    return {d["trading_code"] for d in col.find({}, {"trading_code": 1, "_id": 0})}


def list_excludes() -> list[dict]:
    col = get_db()[EXCLUDES_COLLECTION]
    out = []
    for d in col.find({}, {"_id": 0}).sort("updated_at", DESCENDING):
        ua = d.get("updated_at")
        if isinstance(ua, datetime):
            d["updated_at"] = ua.isoformat()
        out.append(d)
    return out


# ---------------------------------------------------------------------------
# Raw supplemental data (NAV, 52w low, turnover, streaks, relative strength,
# dividend catalysts) — none of it touches the composite score.
# ---------------------------------------------------------------------------

def _parse_dt(v) -> Optional[datetime]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        try:
            d = datetime.fromisoformat(v.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def _load_nav_map(db) -> dict[str, float]:
    """Latest-year NAV (book value) per share, for the below-book signal."""
    pipeline = [
        {"$sort": {"year": -1}},
        {"$group": {"_id": "$trading_code", "nav_per_share": {"$first": "$nav_per_share"}}},
    ]
    return {d["_id"]: _safe(d.get("nav_per_share")) for d in db.financials.aggregate(pipeline)}


def _load_streaks(db) -> dict[str, dict]:
    """Per code: consecutive recent years profitable (eps>0) and paying cash dividend."""
    pipeline = [
        {"$sort": {"year": -1}},
        {"$group": {
            "_id": "$trading_code",
            "years": {"$push": {
                "eps_cont": "$eps_cont_basic",
                "eps_basic": "$eps_basic",
                "cash_div": "$cash_dividend_pct",
            }},
        }},
    ]
    out: dict[str, dict] = {}
    for d in db.financials.aggregate(pipeline):
        profit_streak = 0
        for y in d["years"]:        # already newest-first
            eps = y.get("eps_cont")
            if eps is None or (isinstance(eps, float) and math.isnan(eps)):
                eps = y.get("eps_basic")
            if eps is not None and not (isinstance(eps, float) and math.isnan(eps)) and eps > 0:
                profit_streak += 1
            else:
                break
        div_streak = 0
        for y in d["years"]:
            cd = y.get("cash_div")
            if cd is not None and not (isinstance(cd, float) and math.isnan(cd)) and cd > 0:
                div_streak += 1
            else:
                break
        out[d["_id"]] = {"profit_streak": profit_streak, "div_streak": div_streak}
    return out


def _iso_days_ago(days: int) -> str:
    """ISO date string `days` ago. `stock_prices.date` / `dse_market_summary.date`
    are stored as ISO strings ("YYYY-MM-DD"), which sort lexically — so range
    filters compare against a string bound, not a datetime."""
    return (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")


def _load_w52_low(db) -> dict[str, float]:
    since = _iso_days_ago(365)
    pipeline = [
        {"$match": {"date": {"$gte": since}, "ltp": {"$gt": 0}}},
        {"$group": {"_id": "$trading_code", "w52_low": {"$min": "$ltp"}}},
    ]
    return {d["_id"]: _safe(d.get("w52_low")) for d in db.stock_prices.aggregate(pipeline)}


def _load_avg_turnover(db) -> dict[str, float]:
    """Average daily turnover (value_mn) over the recent liquidity window."""
    since = _iso_days_ago(LIQUIDITY_WINDOW_DAYS)
    pipeline = [
        {"$match": {"date": {"$gte": since}, "value_mn": {"$ne": None}}},
        {"$group": {"_id": "$trading_code", "avg_turnover": {"$avg": "$value_mn"}}},
    ]
    return {d["_id"]: _safe(d.get("avg_turnover")) for d in db.stock_prices.aggregate(pipeline)}


def _load_rel_strength(db) -> dict[str, float]:
    """Per-stock 90d return minus the DSEX 90d return (market context)."""
    since = _iso_days_ago(REL_STRENGTH_WINDOW_DAYS)

    # DSEX move over the window.
    idx = list(db.dse_market_summary.find(
        {"date": {"$gte": since}, "dsex": {"$nin": [None, 0, 0.0]}},
        {"_id": 0, "date": 1, "dsex": 1},
    ).sort("date", ASCENDING))
    if len(idx) < 2 or not idx[0].get("dsex"):
        return {}
    dsex_ret = (idx[-1]["dsex"] - idx[0]["dsex"]) / idx[0]["dsex"] * 100.0

    pipeline = [
        {"$match": {"date": {"$gte": since}, "ltp": {"$gt": 0}}},
        {"$sort": {"date": ASCENDING}},
        {"$group": {
            "_id": "$trading_code",
            "first": {"$first": "$ltp"},
            "last": {"$last": "$ltp"},
        }},
    ]
    out: dict[str, float] = {}
    for d in db.stock_prices.aggregate(pipeline):
        first, last = d.get("first"), d.get("last")
        if first and first > 0 and last:
            stock_ret = (last - first) / first * 100.0
            out[d["_id"]] = round(stock_ret - dsex_ret, 1)
    return out


def _load_div_catalysts(db) -> dict[str, dict]:
    """Code → recently-declared cash dividend within the catalyst window."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=CATALYST_WINDOW_DAYS)
    out: dict[str, dict] = {}
    for d in load_dividend_declarations():
        code = d.get("trading_code")
        decl = _parse_dt(d.get("declaration_date"))
        pct = _safe(d.get("dividend_pct"))
        if not code or decl is None or decl < cutoff or not pct:
            continue
        prev = out.get(code)
        if prev is None or decl > prev["_decl"]:
            out[code] = {"_decl": decl, "dividend_pct": pct,
                         "declaration_date": decl.strftime("%Y-%m-%d")}
    return out


# ---------------------------------------------------------------------------
# Row assembly — one flat dict per gate-passing stock
# ---------------------------------------------------------------------------

def _build_rows() -> list[dict]:
    db = get_db()

    df = build_scores_df()
    if df.empty:
        return []

    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    excluded = load_excluded_codes()

    nav_map = _load_nav_map(db)
    streaks = _load_streaks(db)
    w52_map = _load_w52_low(db)
    turnover_map = _load_avg_turnover(db)
    rel_map = _load_rel_strength(db)
    catalyst_map = _load_div_catalysts(db)

    # ROE universe for the top-quartile threshold (computed below).
    roe_values: list[float] = []

    rows: list[dict] = []
    for rec in df.to_dict("records"):
        code = rec.get("trading_code")
        if not code or code in excluded:
            continue

        # --- DSE quality gate (pure data, no score) ---
        if (rec.get("market_cat") or "").upper() == "Z":
            continue                                    # Z = AGM defaulters / non-performing
        if rec.get("stale_data"):
            continue                                    # financials older than ~18 months

        comp = companies.get(code, {})
        ltp = _safe(rec.get("ltp")) or _safe(prices.get(code, {}).get("ltp"))
        if not ltp or ltp <= 0:
            continue

        eps = _safe(rec.get("eps"))
        if eps is None or eps <= 0:
            continue                                    # profitable only

        mcap_mn = _safe(rec.get("mcap_mn"))
        if mcap_mn is None or mcap_mn < MIN_MCAP_MN:
            continue                                    # minimum market cap

        avg_turnover = turnover_map.get(code)
        if avg_turnover is None or avg_turnover < MIN_TURNOVER_MN:
            continue                                    # minimum liquidity

        st = streaks.get(code, {})
        catalyst = catalyst_map.get(code)
        roe = _safe(rec.get("roe_pct"))
        if roe is not None:
            roe_values.append(roe)

        rows.append({
            "trading_code": code,
            "company_name": comp.get("company_name") or code,
            "sector": rec.get("sector") or comp.get("sector"),
            "ltp": ltp,
            "mcap_mn": mcap_mn,
            "eps": eps,
            "eps_yoy_pct": _safe(rec.get("eps_yoy_pct")),
            "div_yield_pct": _safe(rec.get("div_yield_pct")),
            "roe_pct": roe,
            "sector_median_pe": _safe(rec.get("sector_median_pe")),
            "nav_per_share": nav_map.get(code),
            "w52_low": w52_map.get(code),
            "profit_streak": st.get("profit_streak", 0),
            "div_streak": st.get("div_streak", 0),
            "rel_strength": rel_map.get(code),
            "div_catalyst": catalyst,
        })

    # Top-quartile ROE cutoff across the gated universe (for the high_roe signal).
    roe_cutoff = None
    if roe_values:
        roe_values.sort()
        roe_cutoff = roe_values[int(len(roe_values) * 0.75)]
    for r in rows:
        r["_roe_cutoff"] = roe_cutoff

    return rows


# ---------------------------------------------------------------------------
# Raw signals — each is a verifiable fact stacked into a conviction tip.
# `fact`     → short clause for the stacked headline
# `value`    → compact metric chip
# `why`      → one-line concept explainer (education)
# `strength` → 0..1 magnitude for ranking facts within a stock
# ---------------------------------------------------------------------------

def _pe(r: dict) -> Optional[float]:
    return r["ltp"] / r["eps"] if r.get("eps") and r["eps"] > 0 else None


_SIGNALS = [
    {
        "key": "dividend_yield",
        "label": "Dividend",
        "eligible": lambda r: r["div_yield_pct"] is not None and r["div_yield_pct"] >= 4,
        "fact": lambda r: f"yields {r['div_yield_pct']:.1f}%",
        "value": lambda r: f"{r['div_yield_pct']:.1f}% yield",
        "why": "A 4%+ dividend yield rivals a bank FDR — you get paid while you hold.",
        "strength": lambda r: min(r["div_yield_pct"] / 12.0, 1.0),
    },
    {
        "key": "dividend_streak",
        "label": "Payout streak",
        "eligible": lambda r: r["div_streak"] >= 4,
        "fact": lambda r: f"{r['div_streak']}-year dividend streak",
        "value": lambda r: f"{r['div_streak']}y payouts",
        "why": "Paying a cash dividend every year shows the payout is durable, not a one-off.",
        "strength": lambda r: min(r["div_streak"] / 7.0, 1.0),
    },
    {
        "key": "profit_growth",
        "label": "Growth",
        "eligible": lambda r: r["eps_yoy_pct"] is not None and r["eps_yoy_pct"] >= 15,
        "fact": lambda r: f"profit up {round(r['eps_yoy_pct'])}%",
        "value": lambda r: f"+{round(r['eps_yoy_pct'])}%",
        "why": "Rising earnings per share is the engine behind a higher share price over time.",
        "strength": lambda r: min(r["eps_yoy_pct"] / 60.0, 1.0),
    },
    {
        "key": "profit_streak",
        "label": "Consistent",
        "eligible": lambda r: r["profit_streak"] >= 4,
        "fact": lambda r: f"profitable {r['profit_streak']} years running",
        "value": lambda r: f"{r['profit_streak']}y profit",
        "why": "Years of unbroken profit point to a stable, proven business.",
        "strength": lambda r: min(r["profit_streak"] / 7.0, 1.0),
    },
    {
        "key": "cheap_pe",
        "label": "Cheap vs peers",
        "eligible": lambda r: (
            _pe(r) is not None and r["sector_median_pe"] is not None
            and r["sector_median_pe"] > 0 and _pe(r) <= 0.85 * r["sector_median_pe"]
        ),
        "fact": lambda r: f"{round((1 - _pe(r) / r['sector_median_pe']) * 100)}% cheaper P/E than its sector",
        "value": lambda r: f"P/E {_pe(r):.1f}",
        "why": "A P/E below the sector median means you pay less per taka of profit than for rival stocks.",
        "strength": lambda r: min((1 - _pe(r) / r["sector_median_pe"]), 1.0),
    },
    {
        "key": "below_book",
        "label": "Below book",
        "eligible": lambda r: (
            r["nav_per_share"] is not None and r["nav_per_share"] > 0
            and r["ltp"] < r["nav_per_share"]
        ),
        "fact": lambda r: f"trades below book ({r['ltp']:.1f} vs {r['nav_per_share']:.1f})",
        "value": lambda r: f"{r['ltp'] / r['nav_per_share']:.2f}× book",
        "why": "Buying below book value means the share price is under the company's net assets per share.",
        "strength": lambda r: min(1 - r["ltp"] / r["nav_per_share"], 1.0),
    },
    {
        "key": "high_roe",
        "label": "High returns",
        "eligible": lambda r: (
            r["roe_pct"] is not None and r["_roe_cutoff"] is not None
            and r["roe_pct"] >= r["_roe_cutoff"] and r["roe_pct"] > 0
        ),
        "fact": lambda r: f"earns {round(r['roe_pct'])}% on equity",
        "value": lambda r: f"{round(r['roe_pct'])}% ROE",
        "why": "A high return on equity means the company turns shareholder money into profit efficiently.",
        "strength": lambda r: min(r["roe_pct"] / 30.0, 1.0),
    },
    {
        "key": "near_52w_low",
        "label": "Near low",
        "eligible": lambda r: (
            r["w52_low"] is not None and r["w52_low"] > 0 and r["ltp"] <= 1.10 * r["w52_low"]
        ),
        "fact": lambda r: "sits near its 52-week low",
        "value": lambda r: f"+{round((r['ltp'] / r['w52_low'] - 1) * 100)}% off low",
        "why": "A quality stock near its yearly low can offer a cheaper entry — if the business stays sound.",
        "strength": lambda r: max(0.0, 1 - (r["ltp"] / r["w52_low"] - 1) / 0.10),
    },
    {
        "key": "rel_strength",
        "label": "Outperforming",
        "eligible": lambda r: r["rel_strength"] is not None and r["rel_strength"] >= 5,
        "fact": lambda r: f"beating the DSEX index by {round(r['rel_strength'])}% (3 months)",
        "value": lambda r: f"+{round(r['rel_strength'])}% vs DSEX",
        "why": "Outpacing the broad index shows real demand and relative strength behind the stock.",
        "strength": lambda r: min(r["rel_strength"] / 30.0, 1.0),
    },
    {
        "key": "div_catalyst",
        "label": "Just declared",
        "eligible": lambda r: r["div_catalyst"] is not None,
        "fact": lambda r: f"just declared a {r['div_catalyst']['dividend_pct']}% dividend",
        "value": lambda r: f"{r['div_catalyst']['dividend_pct']}% declared",
        "why": "A fresh dividend declaration is a near-term catalyst — note the record date to qualify.",
        "strength": lambda r: 0.9,   # catalysts always float high
    },
]

_SIGNAL_BY_KEY = {s["key"]: s for s in _SIGNALS}


# ---------------------------------------------------------------------------
# Conviction assembly
# ---------------------------------------------------------------------------

def _name(r: dict) -> str:
    return r.get("company_name") or r.get("trading_code")


def _build_tip(r: dict, passed: list[dict]) -> dict:
    """Stack a stock's strongest facts (max 3) into one conviction tip."""
    ranked = sorted(passed, key=lambda s: s["strength"](r), reverse=True)
    top = ranked[:3]
    facts = [{"label": s["label"], "value": s["value"](r)} for s in top]
    headline = f"{_name(r)} — " + ", ".join(s["fact"](r) for s in top)
    lead = top[0]
    return {
        "category": lead["key"],            # drives frontend color/icon
        "text": headline,                   # backward-compatible single-line text
        "facts": facts,                     # stacked chips
        "why": lead["why"],                 # concept explainer (education)
        "conviction": len(passed),          # # raw signals passed
        "trading_code": r["trading_code"],
        "company_name": r["company_name"],
        "sector": r["sector"],
        "metric_label": lead["label"],
        "metric_value": None,               # metric now lives in facts[]
        "ltp": _safe(r["ltp"]),
    }


def compute_and_store_daily_tips() -> dict:
    """Build today's conviction tips and upsert into `daily_tips`."""
    rows = _build_rows()

    scored: list[tuple[dict, list[dict]]] = []
    for r in rows:
        passed = [s for s in _SIGNALS if s["eligible"](r)]
        if len(passed) >= MIN_SIGNALS:
            scored.append((r, passed))

    # Highest conviction first; tiebreak by combined signal strength.
    scored.sort(
        key=lambda rp: (len(rp[1]), sum(s["strength"](rp[0]) for s in rp[1])),
        reverse=True,
    )

    tips = [_build_tip(r, passed) for r, passed in scored[:MAX_TIPS]]

    # Stable-within-day, varies-by-day display order (seed from date + codes).
    today = _today_iso()
    seed = abs(hash(today + "|" + ",".join(t["trading_code"] for t in tips))) % (2**31)
    random.Random(seed).shuffle(tips)

    doc = {"date": today, "generated_at": datetime.now(timezone.utc), "tips": tips}
    get_db().daily_tips.bulk_write([
        UpdateOne({"date": today}, {"$set": doc}, upsert=True)
    ])
    return doc


# ---------------------------------------------------------------------------
# Public read path
# ---------------------------------------------------------------------------

def get_daily_tips() -> dict:
    """Newest stored tips. Self-heals on a fresh deploy by computing once."""
    db = get_db()
    doc = db.daily_tips.find_one({}, {"_id": 0}, sort=[("date", DESCENDING)])
    if not doc or not doc.get("tips"):
        doc = compute_and_store_daily_tips()
    return {"date": doc.get("date"), "tips": doc.get("tips") or []}


# ---------------------------------------------------------------------------
# Admin controls — curate the live tip list
# ---------------------------------------------------------------------------

def admin_get_tips_state() -> dict:
    """Current live tips + the admin exclusion list."""
    state = get_daily_tips()
    return {
        "date": state.get("date"),
        "tips": state.get("tips") or [],
        "excludes": list_excludes(),
    }


def exclude_tip(trading_code: str, reason: Optional[str], updated_by: Optional[str]) -> dict:
    """Blacklist a stock from all tips, then regenerate today's list so it
    disappears immediately and a fresh tip fills its place."""
    code = (trading_code or "").strip().upper()
    if not code:
        raise ValueError("trading_code is required")

    db = get_db()
    comp = db.companies.find_one({"trading_code": code}, {"company_name": 1, "_id": 0})
    db[EXCLUDES_COLLECTION].update_one(
        {"trading_code": code},
        {"$set": {
            "trading_code": code,
            "company_name": (comp or {}).get("company_name"),
            "reason": (reason or "").strip() or None,
            "updated_by": updated_by,
            "updated_at": datetime.now(timezone.utc),
        }},
        upsert=True,
    )
    compute_and_store_daily_tips()
    return admin_get_tips_state()


def restore_tip(trading_code: str) -> dict:
    """Remove a stock from the exclusion list and regenerate today's tips."""
    code = (trading_code or "").strip().upper()
    res = get_db()[EXCLUDES_COLLECTION].delete_one({"trading_code": code})
    if res.deleted_count:
        compute_and_store_daily_tips()
    return admin_get_tips_state()
