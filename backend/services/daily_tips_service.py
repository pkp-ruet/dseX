"""
Daily fundamental tips — "TopStockBD Tips".

A list of ~10 plain-English, attention-grabbing bullet points that help users
pick good stocks (e.g. "Marico profit grew 22% vs last year", "X trades cheaper
than its usual price history"). Each tip points at one stock and links to its
detail page.

Generation mirrors the score snapshot: tips are computed once per day right
after the scrape recomputes scores (see `cmd_scrape_all` in the root `main.py`)
and stored in the `daily_tips` collection (one doc per date). The public read
path just returns the newest stored doc, so API requests stay cheap.

Selection guarantees variety: an ordered list of tip categories, each yielding
the single best eligible stock for its metric, deduped so no stock repeats —
up to 10 distinct tips.

No "DSEF" / pillar jargon in any user-facing text — plain English only.
"""
import math
import random
from datetime import datetime, timedelta, timezone

from pymongo import DESCENDING, UpdateOne

from backend.services.db_service import get_db, load_companies, load_latest_prices
from backend.services.scoring_service import build_scores_df

MAX_TIPS = 10


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


# ---------------------------------------------------------------------------
# Row assembly — one flat dict per scored, non-excluded stock
# ---------------------------------------------------------------------------

def _build_rows() -> list[dict]:
    db = get_db()

    df = build_scores_df()
    if df.empty:
        return []

    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    # Latest-year NAV per company (book value per share) for the below-book tip.
    nav_pipeline = [
        {"$sort": {"year": -1}},
        {"$group": {"_id": "$trading_code", "nav_per_share": {"$first": "$nav_per_share"}}},
    ]
    nav_map: dict[str, float] = {}
    for doc in db.financials.aggregate(nav_pipeline):
        nav_map[doc["_id"]] = _safe(doc.get("nav_per_share"))

    # 52-week low for the "near its 52-week low" tip.
    one_year_ago = datetime.now(timezone.utc) - timedelta(days=365)
    w52_pipeline = [
        {"$match": {"date": {"$gte": one_year_ago}, "ltp": {"$gt": 0}}},
        {"$group": {"_id": "$trading_code", "w52_low": {"$min": "$ltp"}}},
    ]
    w52_map: dict[str, float] = {}
    for doc in db.stock_prices.aggregate(w52_pipeline):
        w52_map[doc["_id"]] = _safe(doc.get("w52_low"))

    rows: list[dict] = []
    for rec in df.to_dict("records"):
        code = rec.get("trading_code")
        if not code:
            continue
        comp = companies.get(code, {})
        ltp = _safe(rec.get("ltp")) or _safe(prices.get(code, {}).get("ltp"))
        rows.append({
            "trading_code": code,
            "company_name": comp.get("company_name") or code,
            "sector": rec.get("sector") or comp.get("sector"),
            "ltp": ltp,
            "score": _safe(rec.get("score")),
            "eps": _safe(rec.get("eps")),
            "eps_yoy_pct": _safe(rec.get("eps_yoy_pct")),
            "div_yield_pct": _safe(rec.get("div_yield_pct")),
            "p1_biz": _safe(rec.get("p1_biz")),
            "p2_health": _safe(rec.get("p2_health")),
            "p3_moat": _safe(rec.get("p3_moat")),
            "p4_val": _safe(rec.get("p4_val")),
            "p5_div": _safe(rec.get("p5_div")),
            "nav_per_share": nav_map.get(code),
            "w52_low": w52_map.get(code),
        })
    return rows


# ---------------------------------------------------------------------------
# Tip categories — ordered. Each generates one tip from the best eligible row.
# ---------------------------------------------------------------------------

def _name(r: dict) -> str:
    return r.get("company_name") or r.get("trading_code")


_CATEGORIES = [
    {
        "key": "profit_growth",
        "eligible": lambda r: r["eps_yoy_pct"] is not None and r["eps_yoy_pct"] >= 10,
        "sort": lambda r: r["eps_yoy_pct"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} profit grew {round(r['eps_yoy_pct'])}% vs last year.",
        "metric_label": "profit growth",
        "metric": lambda r: round(r["eps_yoy_pct"], 1),
    },
    {
        "key": "dividend",
        "eligible": lambda r: r["div_yield_pct"] is not None and r["div_yield_pct"] >= 4
        and (r["p5_div"] or 0) >= 6,
        "sort": lambda r: r["div_yield_pct"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} pays a {r['div_yield_pct']:.1f}% dividend — backed by steady, sustainable payouts.",
        "metric_label": "dividend yield",
        "metric": lambda r: round(r["div_yield_pct"], 1),
    },
    {
        "key": "cheap_vs_history",
        "eligible": lambda r: (r["p4_val"] or 0) >= 7,
        "sort": lambda r: r["p4_val"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} trades cheaper than its usual price history.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "below_book",
        "eligible": lambda r: r["nav_per_share"] is not None and r["nav_per_share"] > 0
        and r["ltp"] is not None and r["ltp"] < r["nav_per_share"],
        "sort": lambda r: r["ltp"] / r["nav_per_share"],
        "reverse": False,
        "text": lambda r: f"{_name(r)} trades below book value — price {r['ltp']:.1f} vs book value {r['nav_per_share']:.1f} per share.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "near_52w_low",
        "eligible": lambda r: (r["score"] or 0) >= 65 and r["w52_low"] is not None
        and r["w52_low"] > 0 and r["ltp"] is not None and r["ltp"] <= 1.10 * r["w52_low"],
        "sort": lambda r: r["ltp"] / r["w52_low"],
        "reverse": False,
        "text": lambda r: f"{_name(r)} is a high-grade stock trading near its 52-week low.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "strong_balance",
        "eligible": lambda r: (r["p2_health"] or 0) >= 7,
        "sort": lambda r: r["p2_health"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} has low debt and steady cash flow.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "moat",
        "eligible": lambda r: (r["p3_moat"] or 0) >= 7,
        "sort": lambda r: r["p3_moat"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} holds a strong position in its industry.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "consistent_profit",
        "eligible": lambda r: (r["p1_biz"] or 0) >= 7,
        "sort": lambda r: r["p1_biz"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} has made profits consistently year after year.",
        "metric_label": None,
        "metric": lambda r: None,
    },
    {
        "key": "high_eps",
        "eligible": lambda r: r["eps"] is not None and r["eps"] > 0,
        "sort": lambda r: r["eps"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} earns {r['eps']:.2f} per share — among the highest on the market.",
        "metric_label": "EPS",
        "metric": lambda r: round(r["eps"], 2),
    },
    {
        "key": "top_overall",
        "eligible": lambda r: (r["score"] or 0) >= 70,
        "sort": lambda r: r["score"],
        "reverse": True,
        "text": lambda r: f"{_name(r)} is one of the top-rated stocks today — grade {round(r['score'])}/100.",
        "metric_label": "grade",
        "metric": lambda r: round(r["score"]),
    },
]


def _make_tip(cat: dict, row: dict) -> dict:
    return {
        "category": cat["key"],
        "text": cat["text"](row),
        "trading_code": row["trading_code"],
        "company_name": row["company_name"],
        "sector": row["sector"],
        "metric_label": cat["metric_label"],
        "metric_value": _safe(cat["metric"](row)),
        "ltp": _safe(row["ltp"]),
    }


# ---------------------------------------------------------------------------
# Generate + store
# ---------------------------------------------------------------------------

def compute_and_store_daily_tips() -> dict:
    """Build today's tips and upsert into `daily_tips`. Returns the stored doc."""
    rows = _build_rows()
    tips: list[dict] = []
    used: set[str] = set()

    if rows:
        for cat in _CATEGORIES:
            if len(tips) >= MAX_TIPS:
                break
            eligible = [r for r in rows if r["trading_code"] not in used and cat["eligible"](r)]
            if not eligible:
                continue
            best = sorted(eligible, key=cat["sort"], reverse=cat["reverse"])[0]
            used.add(best["trading_code"])
            tips.append(_make_tip(cat, best))

    # Stable-within-day, varies-by-day display order (seed from date + codes).
    today = _today_iso()
    seed = abs(hash(today + "|" + ",".join(t["trading_code"] for t in tips))) % (2**31)
    random.Random(seed).shuffle(tips)

    doc = {"date": today, "generated_at": datetime.now(timezone.utc), "tips": tips}
    db = get_db()
    db.daily_tips.bulk_write([
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
