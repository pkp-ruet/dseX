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
