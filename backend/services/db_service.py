"""
MongoDB query helpers — cached loaders for FastAPI routes.
All functions return plain Python dicts/lists (JSON-serialisable).
"""
import time
from collections import OrderedDict
from datetime import datetime, timedelta
from typing import Optional
from pymongo import MongoClient
from backend.config import MONGODB_URI, MONGODB_DB_NAME

# ---------------------------------------------------------------------------
# Connection singleton
# ---------------------------------------------------------------------------

_client: Optional[MongoClient] = None
_db = None

# Conservative pool for Render Starter (512 MB / 0.5 vCPU) + Atlas M0's small
# connection cap: keep sockets few, let idle ones drop, and fail fast rather
# than pile up waiting connections during a DB blip.
_POOL_KWARGS = dict(
    maxPoolSize=10,
    minPoolSize=0,
    maxIdleTimeMS=60_000,
    serverSelectionTimeoutMS=5_000,
    connectTimeoutMS=5_000,
)


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI, **_POOL_KWARGS)
        _db = _client[MONGODB_DB_NAME]
    return _db


def close_db() -> None:
    """Close the shared client and reset the singleton (FastAPI shutdown)."""
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


# ---------------------------------------------------------------------------
# Simple TTL cache decorator
# ---------------------------------------------------------------------------

def _ttl_cache(ttl_seconds: int = 300, max_entries: int = 50):
    """Module-level TTL cache keyed by function + args.

    Bounded LRU: when the store exceeds ``max_entries``, the least-recently-used
    key is evicted on the next write. Single-arg loaders (e.g. per-company)
    would otherwise accumulate one entry per distinct argument across the full
    TTL window — on Render free tier this is the difference between a steady
    ~5 MB cache and unbounded growth toward OOM.

    Behaviour is identical to the previous unbounded cache for any caller that
    stays within ``max_entries`` distinct argument tuples, which covers every
    no-arg function. Eviction only kicks in for fan-out callers like
    ``load_financials(trading_code)``.
    """
    def decorator(fn):
        _store: "OrderedDict[tuple, dict]" = OrderedDict()

        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            cached = _store.get(key)
            if cached and time.time() - cached["at"] < ttl_seconds:
                _store.move_to_end(key)
                return cached["val"]
            val = fn(*args, **kwargs)
            _store[key] = {"val": val, "at": time.time()}
            _store.move_to_end(key)
            while len(_store) > max_entries:
                _store.popitem(last=False)
            return val

        wrapper.cache_clear = lambda: _store.clear()
        return wrapper
    return decorator


# ---------------------------------------------------------------------------
# Query helpers
# ---------------------------------------------------------------------------

@_ttl_cache(300)
def load_companies() -> list[dict]:
    db = get_db()
    return list(db.companies.find({"excluded": {"$ne": True}}, {"_id": 0}))


@_ttl_cache(60)
def load_latest_prices() -> dict[str, dict]:
    """Returns {trading_code: {ltp, change, change_pct, date, high, low, volume, ycp, ...}}"""
    db = get_db()
    pipeline = [
        {"$sort": {"date": -1}},
        {"$group": {
            "_id": "$trading_code",
            "date":       {"$first": "$date"},
            "ltp":        {"$first": "$ltp"},
            "close_price":{"$first": "$close_price"},
            "change":     {"$first": "$change"},
            "change_pct": {"$first": "$change_pct"},
            "high":       {"$first": "$high"},
            "low":        {"$first": "$low"},
            "volume":     {"$first": "$volume"},
            "value_mn":   {"$first": "$value_mn"},
            "trade_count":{"$first": "$trade_count"},
            "ycp":        {"$first": "$ycp"},
        }},
    ]
    return {doc["_id"]: doc for doc in db.stock_prices.aggregate(pipeline)}


@_ttl_cache(300)
def load_price_history(trading_code: str) -> list[dict]:
    db = get_db()
    docs = list(
        db.stock_prices.find(
            {"trading_code": trading_code},
            {"_id": 0, "date": 1, "ltp": 1, "volume": 1, "change_pct": 1,
             "high": 1, "low": 1, "close_price": 1}
        ).sort("date", 1)
    )
    # Convert date objects to ISO strings for JSON serialisation
    for d in docs:
        if "date" in d and hasattr(d["date"], "isoformat"):
            d["date"] = d["date"].isoformat()
    return docs


@_ttl_cache(300)
def load_financials(trading_code: str) -> list[dict]:
    db = get_db()
    docs = list(
        db.financials.find({"trading_code": trading_code}, {"_id": 0}).sort("year", 1)
    )
    # Normalise EPS column
    for d in docs:
        if "eps_cont_basic" in d and d["eps_cont_basic"] is not None:
            d["eps"] = d["eps_cont_basic"]
        elif "eps_basic" in d and d["eps_basic"] is not None:
            d["eps"] = d["eps_basic"]
        else:
            d["eps"] = None
    return docs


@_ttl_cache(300)
def load_extended_financials(trading_code: str) -> list[dict]:
    db = get_db()
    return list(
        db.company_financials_ext.find(
            {"trading_code": trading_code}, {"_id": 0}
        ).sort("year", 1)
    )


@_ttl_cache(300)
def load_shareholdings(trading_code: str) -> list[dict]:
    db = get_db()
    docs = list(
        db.shareholdings.find(
            {"trading_code": trading_code}, {"_id": 0}
        ).sort("as_of_date", -1)
    )
    for d in docs:
        if "as_of_date" in d and hasattr(d["as_of_date"], "isoformat"):
            d["as_of_date"] = d["as_of_date"].isoformat()
    return docs


@_ttl_cache(300)
def load_company_news(trading_code: str, limit: int = 20) -> list[dict]:
    db = get_db()
    docs = list(
        db.company_news.find(
            {"trading_code": trading_code},
            {"_id": 0, "title": 1, "body": 1, "post_date": 1},
        ).sort("post_date", -1).limit(limit)
    )
    for d in docs:
        if "post_date" in d and hasattr(d["post_date"], "isoformat"):
            d["post_date"] = d["post_date"].isoformat()
    return docs


@_ttl_cache(300)
def load_news_for_codes(codes: tuple, days: int = 30) -> list[dict]:
    db = get_db()
    cutoff = datetime.utcnow() - timedelta(days=days)
    docs = list(
        db.company_news.find(
            {"trading_code": {"$in": list(codes)}, "post_date": {"$gte": cutoff}},
            {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
        ).sort("post_date", -1).limit(100)
    )
    for d in docs:
        if "post_date" in d and hasattr(d["post_date"], "isoformat"):
            d["post_date"] = d["post_date"].isoformat()
    return docs


@_ttl_cache(300)
def load_dividend_declarations() -> list[dict]:
    db = get_db()
    docs = list(db.dividend_declarations.find({}, {"_id": 0}))
    for d in docs:
        for k in ("declaration_date", "record_date", "agm_date"):
            if k in d and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
    return docs


@_ttl_cache(300)
def load_dse_today_table() -> list[dict]:
    """Flat per-stock list for the latest trading day: code, name, sector, ltp, chg%, vol, val."""
    prices = load_latest_prices()
    companies_idx = {c["trading_code"]: c for c in load_companies()}
    rows: list[dict] = []
    for code, p in prices.items():
        if p.get("ltp") is None:
            continue
        comp = companies_idx.get(code, {})
        rows.append({
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "ltp": p.get("ltp"),
            "change_pct": p.get("change_pct"),
            "volume": p.get("volume"),
            "value_mn": p.get("value_mn"),
        })
    return rows


@_ttl_cache(300)
def load_market_news(limit: int = 50) -> list[dict]:
    """Latest market-wide news. Anchors to the newest post_date in company_news; falls back to last 7 days."""
    db = get_db()
    latest = db.company_news.find_one({}, sort=[("post_date", -1)])
    if not latest or not latest.get("post_date"):
        return []

    latest_dt = latest["post_date"]
    # Floor to start of that day (UTC)
    if hasattr(latest_dt, "year"):
        start = datetime(latest_dt.year, latest_dt.month, latest_dt.day)
    else:
        try:
            parsed = datetime.fromisoformat(str(latest_dt))
            start = datetime(parsed.year, parsed.month, parsed.day)
        except Exception:
            start = datetime.utcnow() - timedelta(days=1)

    def _fetch(start_dt: datetime) -> list[dict]:
        return list(
            db.company_news.find(
                {"post_date": {"$gte": start_dt}},
                {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
            ).sort("post_date", -1).limit(limit)
        )

    docs = _fetch(start)
    if not docs:
        docs = _fetch(datetime.utcnow() - timedelta(days=7))

    companies_idx = {c["trading_code"]: c.get("company_name") for c in load_companies()}
    for d in docs:
        d["company_name"] = companies_idx.get(d.get("trading_code"))
        if "post_date" in d and hasattr(d["post_date"], "isoformat"):
            d["post_date"] = d["post_date"].isoformat()
    return docs


@_ttl_cache(300)
def load_market_movers() -> dict:
    """Top 5 gainers, losers, and most-traded for the latest trading day."""
    db = get_db()
    latest = db.stock_prices.find_one(sort=[("date", -1)])
    if not latest:
        return {"date": None, "gainers": [], "losers": [], "most_traded": []}

    latest_date = latest["date"]
    docs = list(db.stock_prices.find(
        {"date": latest_date},
        {"_id": 0, "trading_code": 1, "ltp": 1, "change": 1,
         "change_pct": 1, "volume": 1, "value_mn": 1},
    ))

    # Join company names
    companies = {c["trading_code"]: c.get("company_name") for c in load_companies()}
    for d in docs:
        d["company_name"] = companies.get(d["trading_code"])

    # Filter out entries with missing change_pct / value_mn
    with_change = [d for d in docs if d.get("change_pct") is not None]
    with_value = [d for d in docs if d.get("value_mn") is not None]

    gainers = sorted(with_change, key=lambda x: x["change_pct"], reverse=True)[:5]
    losers = sorted(with_change, key=lambda x: x["change_pct"])[:5]
    most_traded = sorted(with_value, key=lambda x: x["value_mn"], reverse=True)[:5]

    date_str = latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date)

    return {
        "date": date_str,
        "gainers": gainers,
        "losers": losers,
        "most_traded": most_traded,
    }


@_ttl_cache(60)
def load_market_index() -> dict:
    """
    Returns the latest DSE index snapshot (DSEX/DSES/DS30 + market totals).
    Falls back to stock_prices aggregation for volume/value if not in the scraped doc.
    Skips docs with zero/null DSEX (transient pre-market scrapes show 0.00 on the DSE homepage).
    """
    db = get_db()
    doc = db.dse_market_summary.find_one(
        {"dsex": {"$nin": [None, 0, 0.0]}},
        sort=[("date", -1)],
    )
    if not doc:
        # No valid index data anywhere — fall back to the latest doc, if any
        doc = db.dse_market_summary.find_one(sort=[("date", -1)])

    if not doc:
        return {
            "date": None,
            "dsex": None, "dsex_change": None, "dsex_change_pct": None,
            "dses": None, "dses_change": None,
            "ds30": None, "ds30_change": None,
            "total_volume": None, "total_value_mn": None, "total_trades": None,
        }

    date_str = doc["date"].isoformat() if hasattr(doc["date"], "isoformat") else str(doc["date"])

    total_volume = doc.get("total_volume")
    total_value_mn = doc.get("total_value_mn")

    # Fallback: aggregate volume/value from stock_prices if not scraped
    if total_volume is None or total_value_mn is None:
        agg = list(db.stock_prices.aggregate([
            {"$match": {"date": doc["date"]}},
            {"$group": {
                "_id": None,
                "vol": {"$sum": "$volume"},
                "val": {"$sum": "$value_mn"},
            }},
        ]))
        if agg:
            if total_volume is None:
                total_volume = agg[0].get("vol")
            if total_value_mn is None:
                total_value_mn = agg[0].get("val")

    # Previous day for change % calculation — skip docs with zero/null indices
    prev_doc = db.dse_market_summary.find_one(
        {"date": {"$lt": doc["date"]}, "dsex": {"$nin": [None, 0, 0.0]}},
        sort=[("date", -1)],
    )
    prev_volume = prev_doc.get("total_volume") if prev_doc else None
    prev_value_mn = prev_doc.get("total_value_mn") if prev_doc else None

    if prev_doc and (prev_volume is None or prev_value_mn is None):
        prev_agg = list(db.stock_prices.aggregate([
            {"$match": {"date": prev_doc["date"]}},
            {"$group": {"_id": None, "vol": {"$sum": "$volume"}, "val": {"$sum": "$value_mn"}}},
        ]))
        if prev_agg:
            if prev_volume is None:
                prev_volume = prev_agg[0].get("vol")
            if prev_value_mn is None:
                prev_value_mn = prev_agg[0].get("val")

    def safe_pct(curr, prev):
        if curr and prev and prev != 0:
            return round((curr - prev) / prev * 100, 2)
        return None

    volume_change_pct = safe_pct(total_volume, prev_volume)
    turnover_change_pct = safe_pct(total_value_mn, prev_value_mn)

    # Up / down / neutral company counts for the latest date
    price_changes = list(db.stock_prices.find(
        {"date": doc["date"]},
        {"_id": 0, "change_pct": 1},
    ))
    up_count = sum(1 for p in price_changes if (p.get("change_pct") or 0) > 0)
    down_count = sum(1 for p in price_changes if (p.get("change_pct") or 0) < 0)
    neutral_count = len(price_changes) - up_count - down_count

    return {
        "date": date_str,
        "dsex": doc.get("dsex"),
        "dsex_change": doc.get("dsex_change"),
        "dsex_change_pct": doc.get("dsex_change_pct"),
        "dses": doc.get("dses"),
        "dses_change": doc.get("dses_change"),
        "ds30": doc.get("ds30"),
        "ds30_change": doc.get("ds30_change"),
        "total_volume": total_volume,
        "total_value_mn": total_value_mn,
        "total_trades": doc.get("total_trades"),
        "volume_change_pct": volume_change_pct,
        "turnover_change_pct": turnover_change_pct,
        "up_count": up_count,
        "down_count": down_count,
        "neutral_count": neutral_count,
    }


@_ttl_cache(300)
def compute_market_intelligence() -> dict:
    """
    Auto-detect market condition and compute intelligence signals.
    Returns signals tailored to falling / rising / sideways market state.
    """
    import math
    from datetime import datetime

    db = get_db()

    # --- Latest trading date ---
    latest_doc = db.stock_prices.find_one(sort=[("date", -1)])
    if not latest_doc:
        return {"market_condition": "unknown", "market_summary": {}, "signals": {}}

    latest_date = latest_doc["date"]
    latest_date_str = latest_date.isoformat() if hasattr(latest_date, "isoformat") else str(latest_date)

    # --- Last 10 distinct trading dates ---
    all_dates = sorted(
        db.stock_prices.distinct("date"),
        key=lambda d: d.isoformat() if hasattr(d, "isoformat") else str(d),
        reverse=True,
    )
    recent_dates = all_dates[:10]

    # --- Today's prices ---
    today_docs = list(db.stock_prices.find(
        {"date": latest_date},
        {"_id": 0, "trading_code": 1, "ltp": 1, "change_pct": 1,
         "volume": 1, "value_mn": 1}
    ))

    # --- Historical (last 7 trading days, excluding today) for volume avg ---
    hist_dates = recent_dates[1:8]
    hist_docs = list(db.stock_prices.find(
        {"date": {"$in": hist_dates}},
        {"_id": 0, "trading_code": 1, "volume": 1}
    )) if hist_dates else []

    vol_sums: dict = {}
    vol_counts: dict = {}
    for d in hist_docs:
        code = d["trading_code"]
        if d.get("volume") and d["volume"] > 0:
            vol_sums[code] = vol_sums.get(code, 0) + d["volume"]
            vol_counts[code] = vol_counts.get(code, 0) + 1

    avg_volumes = {
        code: vol_sums[code] / vol_counts[code]
        for code in vol_sums
        if vol_counts[code] >= 2
    }

    # --- Company metadata ---
    companies = {c["trading_code"]: c for c in load_companies()}

    # --- DSEF scores ---
    scores: dict = {}
    try:
        from backend.services.scoring_service import build_scores_df
        df = build_scores_df()
        if not df.empty:
            for _, row in df.iterrows():
                v = row.get("score")
                if v is not None and not (isinstance(v, float) and math.isnan(v)):
                    scores[row["trading_code"]] = float(v)
    except Exception:
        pass

    # --- Upcoming dividend record dates within 14 days ---
    today = datetime.now().date()
    upcoming_record_codes: set = set()
    try:
        for d in load_dividend_declarations():
            rd = d.get("record_date")
            if rd:
                try:
                    record_date = datetime.fromisoformat(str(rd)).date()
                    if 0 <= (record_date - today).days <= 14:
                        upcoming_record_codes.add(d["trading_code"])
                except Exception:
                    pass
    except Exception:
        pass

    # --- Market condition ---
    valid_today = [d for d in today_docs if d.get("change_pct") is not None]
    if not valid_today:
        # Data exists but no change_pct values — return date info without signals
        return {
            "market_condition": "unknown",
            "market_summary": {
                "date": latest_date_str,
                "avg_change_pct": None,
                "gainers": 0,
                "losers": 0,
                "flat": len(today_docs),
                "total": len(today_docs),
            },
            "signals": {},
        }

    avg_change = sum(d["change_pct"] for d in valid_today) / len(valid_today)
    gainers = sum(1 for d in valid_today if d["change_pct"] > 0)
    losers = sum(1 for d in valid_today if d["change_pct"] < 0)
    flat_count = len(valid_today) - gainers - losers
    total = len(valid_today)
    gainer_ratio = gainers / total if total > 0 else 0
    loser_ratio = losers / total if total > 0 else 0

    if avg_change < -0.3 or loser_ratio > 0.60:
        condition = "falling"
    elif avg_change > 0.3 or gainer_ratio > 0.60:
        condition = "rising"
    else:
        condition = "sideways"

    # --- Enrich today's docs ---
    def enrich(d: dict) -> dict:
        code = d["trading_code"]
        comp = companies.get(code, {})
        avg_vol = avg_volumes.get(code)
        vol = d.get("volume")
        vol_ratio = None
        if vol and avg_vol and avg_vol > 0:
            vol_ratio = round(vol / avg_vol, 2)
        score = scores.get(code)
        return {
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "ltp": d.get("ltp"),
            "change_pct": d.get("change_pct"),
            "volume": vol,
            "value_mn": d.get("value_mn"),
            "avg_volume_7d": round(avg_vol) if avg_vol else None,
            "volume_ratio": vol_ratio,
            "score": score if score is not None and not (isinstance(score, float) and math.isnan(score)) else None,
        }

    enriched = [
        enrich(d) for d in today_docs
        if d.get("change_pct") is not None and d.get("volume")
    ]

    def _sk(x, field, default=0):
        v = x.get(field)
        if v is None or (isinstance(v, float) and math.isnan(v)):
            return default
        return v

    signals: dict = {}

    if condition == "falling":
        accum = [
            e for e in enriched
            if e["change_pct"] > avg_change and (e.get("volume_ratio") or 0) >= 1.5
        ]
        accum.sort(key=lambda x: _sk(x, "volume_ratio"), reverse=True)
        signals["accumulation_radar"] = accum[:15]

        signals["resilience_leaders"] = sorted(
            enriched, key=lambda x: _sk(x, "change_pct", -999), reverse=True
        )[:10]

        floor_watch = [
            e for e in enriched
            if e["change_pct"] < 0 and (e.get("volume_ratio") or 0) >= 1.3
        ]
        floor_watch.sort(key=lambda x: _sk(x, "volume_ratio"), reverse=True)
        signals["floor_watch"] = floor_watch[:10]

    elif condition == "rising":
        breakouts = [
            e for e in enriched
            if e["change_pct"] > avg_change and (e.get("volume_ratio") or 0) >= 2.0
        ]
        breakouts.sort(key=lambda x: _sk(x, "volume_ratio"), reverse=True)
        signals["volume_breakouts"] = breakouts[:15]

        signals["momentum_leaders"] = sorted(
            [e for e in enriched if e["change_pct"] > 0],
            key=lambda x: _sk(x, "change_pct", -999),
            reverse=True
        )[:10]

        quality_laggards = [
            e for e in enriched
            if _sk(e, "score", 0) >= 55 and e["change_pct"] <= 0.2
        ]
        quality_laggards.sort(key=lambda x: _sk(x, "score", 0), reverse=True)
        signals["quality_laggards"] = quality_laggards[:10]

    else:  # sideways
        vol_div = [
            e for e in enriched
            if abs(e["change_pct"]) <= 0.5 and (e.get("volume_ratio") or 0) >= 1.5
        ]
        vol_div.sort(key=lambda x: _sk(x, "volume_ratio"), reverse=True)
        signals["volume_divergence"] = vol_div[:15]

        div_capture = [e for e in enriched if e["trading_code"] in upcoming_record_codes]
        div_capture.sort(key=lambda x: _sk(x, "score", 0), reverse=True)
        signals["dividend_capture"] = div_capture[:10]

        hidden_gems = [
            e for e in enriched
            if _sk(e, "score", 0) >= 55 and abs(e["change_pct"]) <= 0.3
        ]
        hidden_gems.sort(key=lambda x: _sk(x, "score", 0), reverse=True)
        signals["hidden_gems"] = hidden_gems[:10]

    # --- Sector strength (all conditions) ---
    sector_data: dict = {}
    for e in enriched:
        sec = e.get("sector") or "Other"
        sector_data.setdefault(sec, []).append(e["change_pct"])

    signals["sector_strength"] = sorted(
        [
            {"sector": sec, "avg_change_pct": round(sum(v) / len(v), 2), "count": len(v)}
            for sec, v in sector_data.items()
            if len(v) >= 2
        ],
        key=lambda x: x["avg_change_pct"],
        reverse=True,
    )

    return {
        "market_condition": condition,
        "market_summary": {
            "date": latest_date_str,
            "avg_change_pct": round(avg_change, 2),
            "gainers": gainers,
            "losers": losers,
            "flat": flat_count,
            "total": total,
        },
        "signals": signals,
    }


def get_company(trading_code: str) -> Optional[dict]:
    db = get_db()
    return db.companies.find_one(
        {"trading_code": trading_code, "excluded": {"$ne": True}},
        {"_id": 0}
    )


@_ttl_cache(300)
def load_all_company_codes() -> list[str]:
    db = get_db()
    return [
        d["trading_code"]
        for d in db.companies.find(
            {"excluded": {"$ne": True}}, {"trading_code": 1, "_id": 0}
        )
    ]


# ---------------------------------------------------------------------------
# Compute 52-week high/low from price history
# ---------------------------------------------------------------------------

def compute_52w_range(price_history: list[dict]) -> tuple[Optional[float], Optional[float]]:
    cutoff = (datetime.now() - timedelta(days=365)).isoformat()
    vals = [
        d["ltp"]
        for d in price_history
        if "ltp" in d and d.get("date", "") >= cutoff and d["ltp"] is not None and d["ltp"] > 0
    ]
    if not vals:
        return None, None
    return float(max(vals)), float(min(vals))


# ---------------------------------------------------------------------------
# Signal flags (extracted from views/detail.py:247-297)
# ---------------------------------------------------------------------------

def compute_signal_flags(
    score_row: Optional[dict],
    holdings: list[dict],
    financials: list[dict],
    company: dict,
) -> dict[str, list[str]]:
    green_flags: list[str] = []
    red_flags: list[str] = []

    # --- Green flags from score ---
    if score_row:
        if (score_row.get("p1_eps_consist") or 0) >= 8:
            green_flags.append("EPS positive 4+ of 5 years")
        if (score_row.get("p2_cfo") or 0) >= 4:
            green_flags.append("CFO positive 3+ years")
        if (score_row.get("p5_consist") or 0) >= 7:
            green_flags.append("Consistent dividend payer (4+ years)")
        if (score_row.get("p4_pe") or 0) >= 8:
            green_flags.append("Currently cheap vs historical P/E")

    # --- Sponsor holding green flag ---
    if holdings:
        spon_pct = holdings[0].get("sponsor_director_pct")
        if spon_pct and spon_pct > 30:
            green_flags.append(f"Sponsor holding {spon_pct:.1f}% (strong alignment)")

    # --- Red flags ---
    face_v    = company.get("face_value")
    reserve_mn = company.get("reserve_surplus_mn")
    loan_mn    = company.get("total_loan_mn")
    market_cat = (company.get("market_category") or "").strip()

    # Latest EPS
    eps_latest = None
    if financials:
        for row in reversed(financials):
            if row.get("eps") is not None:
                eps_latest = row["eps"]
                break

    if eps_latest is not None and eps_latest < 0:
        red_flags.append("Latest EPS is negative")

    if reserve_mn and loan_mn and reserve_mn > 0 and loan_mn > 2 * reserve_mn:
        red_flags.append("Total loan > 2× reserve surplus")

    # Payout ratio
    div_pct = None
    if financials:
        for row in reversed(financials):
            if row.get("cash_dividend_pct") is not None:
                div_pct = row["cash_dividend_pct"]
                break
    if div_pct is not None and face_v and eps_latest and eps_latest > 0:
        dps = div_pct * face_v / 100.0
        payout = dps / eps_latest * 100
        if payout > 90:
            red_flags.append(f"Payout ratio {payout:.0f}% — potentially unsustainable")

    if score_row and (score_row.get("p4_pe") or 5) <= 1.0:
        red_flags.append("P/E more than 20% above 5yr average")

    if market_cat and market_cat.upper() != "A":
        red_flags.append(f"Market category: {market_cat} (not 'A')")

    return {"green": green_flags, "red": red_flags}


# ---------------------------------------------------------------------------
# Popular stocks — top 20 by /stock/[code] visits in the last 7 days
# with FIFA-style rank-change vs the prior 7 days.
# ---------------------------------------------------------------------------

def _tier_for_score(score: Optional[float]) -> Optional[str]:
    if score is None:
        return None
    if score >= 75:
        return "strong_buy"
    if score >= 55:
        return "safe_buy"
    if score >= 35:
        return "watch"
    return "avoid"


@_ttl_cache(300)
def load_popular_stocks(limit: int = 20) -> dict:
    """All-time visit ranking — top N by `stock_visits.count` (one row per company)."""
    import math
    from datetime import datetime

    db = get_db()

    all_visits = list(db.stock_visits.find(
        {},
        {"trading_code": 1, "count": 1, "_id": 0},
    ).sort("count", -1).limit(limit))

    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    score_map: dict = {}
    try:
        from backend.services.scoring_service import build_scores_df
        df = build_scores_df()
        if not df.empty:
            for _, row in df.iterrows():
                v = row.get("score")
                if v is not None and not (isinstance(v, float) and math.isnan(v)):
                    score_map[row["trading_code"]] = float(v)
    except Exception:
        pass

    items: list[dict] = []
    for i, row in enumerate(all_visits):
        code = row["trading_code"]
        comp = companies.get(code, {})
        p = prices.get(code, {})
        score = score_map.get(code)

        items.append({
            "rank": i + 1,
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "visits_total": int(row["count"]),
            "ltp": p.get("ltp"),
            "change_pct": p.get("change_pct"),
            "score": round(score, 1) if score is not None else None,
            "tier": _tier_for_score(score),
        })

    return {
        "as_of": datetime.utcnow().isoformat() + "Z",
        "items": items,
    }


def increment_stock_visit(trading_code: str) -> None:
    """One row per company — all-time counter. Caller must validate trading_code first."""
    from datetime import datetime, timezone
    db = get_db()
    db.stock_visits.update_one(
        {"trading_code": trading_code},
        {
            "$inc": {"count": 1},
            "$set": {"last_visited_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


@_ttl_cache(300)
def load_stock_visit_counts() -> dict:
    """Global all-time visit count per trading_code: {code: count}. Powers the
    popularity boost in daily personalized picks."""
    db = get_db()
    out: dict = {}
    for row in db.stock_visits.find({}, {"trading_code": 1, "count": 1, "_id": 0}):
        code = row.get("trading_code")
        if code:
            out[code] = int(row.get("count") or 0)
    return out
