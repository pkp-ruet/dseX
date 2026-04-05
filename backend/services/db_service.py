"""
MongoDB query helpers — mirrors app.py cached loaders, without Streamlit.
All functions return plain Python dicts/lists (JSON-serialisable).
"""
import time
from datetime import datetime, timedelta
from typing import Optional
from pymongo import MongoClient
from backend.config import MONGODB_URI, MONGODB_DB_NAME

# ---------------------------------------------------------------------------
# Connection singleton
# ---------------------------------------------------------------------------

_client: Optional[MongoClient] = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = MongoClient(MONGODB_URI)
        _db = _client[MONGODB_DB_NAME]
    return _db


# ---------------------------------------------------------------------------
# Simple TTL cache decorator (replaces @st.cache_data)
# ---------------------------------------------------------------------------

def _ttl_cache(ttl_seconds: int = 300):
    """Module-level TTL cache keyed by function + args."""
    def decorator(fn):
        _store: dict = {}

        def wrapper(*args, **kwargs):
            key = (args, tuple(sorted(kwargs.items())))
            cached = _store.get(key)
            if cached and time.time() - cached["at"] < ttl_seconds:
                return cached["val"]
            val = fn(*args, **kwargs)
            _store[key] = {"val": val, "at": time.time()}
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


@_ttl_cache(300)
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
def load_dividend_declarations() -> list[dict]:
    db = get_db()
    docs = list(db.dividend_declarations.find({}, {"_id": 0}))
    for d in docs:
        for k in ("declaration_date", "record_date", "agm_date"):
            if k in d and hasattr(d[k], "isoformat"):
                d[k] = d[k].isoformat()
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
    all_dates = sorted(db.stock_prices.distinct("date"), reverse=True)
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
        if "ltp" in d and d.get("date", "") >= cutoff and d["ltp"] is not None
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
