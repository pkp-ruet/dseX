"""
Daily pick service — selects one DSE stock per day and persists it.

Selection rules (in plain English):
- Must be in the top tier (score >= 75)
- Must not have been picked in the last 14 days (rotation)
- Prefer stocks with positive recent momentum but not already overheated
  (5-day return > 0 and < 10%)
- Among remaining candidates, pick the highest score

Storage: `daily_picks` collection, one row per day.
"""
from datetime import datetime, timezone, timedelta, date
from typing import Optional
from pymongo import ASCENDING, DESCENDING

from backend.services.db_service import get_db, load_latest_prices, load_companies
from backend.services.scoring_service import build_scores_df


_PICK_TTL_HOURS = 6  # re-check candidacy at most this often if pick exists


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _yesterday_iso() -> str:
    return (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")


def ensure_daily_picks_indexes() -> None:
    db = get_db()
    db.daily_picks.create_index([("date", ASCENDING)], unique=True)
    db.daily_picks.create_index([("date", DESCENDING)])
    db.daily_pick_skips.create_index([("date", ASCENDING), ("trading_code", ASCENDING)], unique=True)
    db.daily_pick_skips.create_index([("date", DESCENDING)])


def _five_day_return_pct(trading_code: str) -> Optional[float]:
    """Return the % change between the latest close and the close 5 trading days ago."""
    db = get_db()
    docs = list(
        db.stock_prices.find(
            {"trading_code": trading_code},
            {"_id": 0, "date": 1, "ltp": 1},
        ).sort("date", DESCENDING).limit(6)
    )
    if len(docs) < 6:
        return None
    latest = docs[0].get("ltp")
    earliest = docs[5].get("ltp")
    if not latest or not earliest or earliest <= 0:
        return None
    return round((latest - earliest) / earliest * 100, 2)


def _next_day_return_pct(trading_code: str, pick_date: str) -> Optional[float]:
    """Return the % change between the close on pick_date and the next trading day."""
    db = get_db()
    try:
        pick_dt = datetime.strptime(pick_date, "%Y-%m-%d")
    except ValueError:
        return None
    docs = list(
        db.stock_prices.find(
            {"trading_code": trading_code, "date": {"$gte": pick_dt}},
            {"_id": 0, "date": 1, "ltp": 1},
        ).sort("date", ASCENDING).limit(2)
    )
    if len(docs) < 2:
        return None
    base = docs[0].get("ltp")
    nxt = docs[1].get("ltp")
    if not base or not nxt or base <= 0:
        return None
    return round((nxt - base) / base * 100, 2)


def _build_reasons(row: dict) -> list[str]:
    """Plain-language reason bullets — pick up to 3 that apply."""
    reasons: list[str] = []

    eps_yoy = row.get("eps_yoy_pct")
    if eps_yoy is not None and eps_yoy >= 10:
        reasons.append(f"Profit grew {round(eps_yoy)}% compared to last year.")

    div_yield = row.get("div_yield_pct")
    p5_div = row.get("p5_div") or 0
    if div_yield is not None and div_yield >= 3 and p5_div >= 6:
        reasons.append(
            f"Pays a {div_yield:.1f}% dividend — and the company can afford it."
        )

    p4_val = row.get("p4_val") or 0
    if p4_val >= 7 and len(reasons) < 3:
        reasons.append("Currently cheaper than its usual price history.")

    p2_health = row.get("p2_health") or 0
    if p2_health >= 7 and len(reasons) < 3:
        reasons.append("Strong balance sheet — low debt, steady cash flow.")

    p3_moat = row.get("p3_moat") or 0
    if p3_moat >= 7 and len(reasons) < 3:
        reasons.append("Holds a strong position in its industry.")

    p1_biz = row.get("p1_biz") or 0
    if p1_biz >= 7 and len(reasons) < 3:
        reasons.append("Made profits consistently year after year.")

    # Fallback if nothing matched (shouldn't happen for a top-tier stock)
    if not reasons:
        score = row.get("score") or 0
        reasons.append(f"Overall grade: {score}/100 — one of the strongest names today.")

    return reasons[:3]


def _select_pick_row(extra_excluded: Optional[set[str]] = None) -> Optional[dict]:
    """Return the best candidate row from today's scoring run, or None.

    `extra_excluded` is an optional set of trading codes to exclude beyond the
    standard 14-day rotation — used by the admin shuffle to skip rejected picks
    within the same day.
    """
    df = build_scores_df()
    if df.empty:
        return None

    db = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    recent_codes = {
        d["trading_code"]
        for d in db.daily_picks.find(
            {"picked_at": {"$gte": cutoff}}, {"trading_code": 1, "_id": 0}
        )
    }
    if extra_excluded:
        recent_codes |= {c.upper() for c in extra_excluded}

    scored = df[df["score"].notna() & (df["score"] >= 75)].sort_values(
        "score", ascending=False
    )
    if scored.empty:
        return None

    candidates: list[dict] = []
    for _, row in scored.iterrows():
        code = row["trading_code"]
        if code in recent_codes:
            continue
        ret5 = _five_day_return_pct(code)
        # Prefer positive but not overheated; allow None (insufficient history)
        if ret5 is not None and (ret5 <= 0 or ret5 >= 10):
            continue
        d = row.to_dict()
        d["return_5d_pct"] = ret5
        candidates.append(d)
        if len(candidates) >= 5:
            break

    if not candidates:
        # Fallback: relax momentum filter, just exclude recent picks
        for _, row in scored.iterrows():
            code = row["trading_code"]
            if code in recent_codes:
                continue
            d = row.to_dict()
            d["return_5d_pct"] = _five_day_return_pct(code)
            candidates.append(d)
            if len(candidates) >= 1:
                break

    if not candidates:
        # Ultimate fallback: rotate from the top regardless of recency,
        # but never re-pick something we just skipped today.
        for _, row in scored.iterrows():
            code = row["trading_code"]
            if extra_excluded and code in {c.upper() for c in extra_excluded}:
                continue
            top = row.to_dict()
            top["return_5d_pct"] = _five_day_return_pct(code)
            candidates = [top]
            break

    return candidates[0] if candidates else None


def _materialize_pick(row: dict) -> dict:
    """Convert a score-df row into a stored daily_picks document."""
    companies = {c["trading_code"]: c for c in load_companies()}
    code = row["trading_code"]
    comp = companies.get(code, {})
    prices = load_latest_prices()
    p = prices.get(code, {})

    doc = {
        "date": _today_iso(),
        "trading_code": code,
        "company_name": comp.get("company_name") or row.get("company_name"),
        "sector": row.get("sector") or comp.get("sector"),
        "market_category": comp.get("market_category"),
        "score": float(row.get("score") or 0),
        "ltp_at_pick": p.get("ltp"),
        "change_pct_at_pick": p.get("change_pct"),
        "p1_biz": float(row.get("p1_biz") or 0),
        "p2_health": float(row.get("p2_health") or 0),
        "p3_moat": float(row.get("p3_moat") or 0),
        "p4_val": float(row.get("p4_val") or 0),
        "p5_div": float(row.get("p5_div") or 0),
        "eps_yoy_pct": row.get("eps_yoy_pct"),
        "div_yield_pct": row.get("div_yield_pct"),
        "return_5d_pct": row.get("return_5d_pct"),
        "reasons": _build_reasons(row),
        "picked_at": datetime.now(timezone.utc),
    }
    return doc


def _today_skipped_codes() -> set[str]:
    db = get_db()
    today = _today_iso()
    return {
        d["trading_code"]
        for d in db.daily_pick_skips.find({"date": today}, {"trading_code": 1, "_id": 0})
    }


def _ensure_today_pick() -> Optional[dict]:
    """Read today's pick, or select & persist one if missing."""
    db = get_db()
    today = _today_iso()
    existing = db.daily_picks.find_one({"date": today}, {"_id": 0})
    if existing:
        return existing

    row = _select_pick_row(extra_excluded=_today_skipped_codes())
    if not row:
        return None

    doc = _materialize_pick(row)
    try:
        db.daily_picks.insert_one(dict(doc))  # copy to avoid _id mutation
    except Exception:
        # Race: someone else inserted; re-read
        existing = db.daily_picks.find_one({"date": today}, {"_id": 0})
        if existing:
            return existing
        raise
    # Re-read so we don't return mutated dict (no _id)
    return db.daily_picks.find_one({"date": today}, {"_id": 0})


def shuffle_today_pick(skipped_by_user_id: Optional[str] = None) -> dict:
    """Admin action: skip today's current pick and select a fresh one.

    Returns {"today": <new pick payload>, "skipped": <code that was rejected>,
             "skip_count_today": <total skips for today after this action>}.
    """
    db = get_db()
    today = _today_iso()

    current = db.daily_picks.find_one({"date": today}, {"_id": 0})
    skipped_code: Optional[str] = None
    if current:
        skipped_code = current.get("trading_code")
        # Record the skip (idempotent via unique index)
        try:
            db.daily_pick_skips.insert_one({
                "date": today,
                "trading_code": skipped_code,
                "company_name": current.get("company_name"),
                "score_when_skipped": current.get("score"),
                "skipped_at": datetime.now(timezone.utc),
                "skipped_by": skipped_by_user_id,
            })
        except Exception:
            pass  # already recorded
        # Remove the current pick so _ensure_today_pick re-selects
        db.daily_picks.delete_one({"date": today})

    # Select with all of today's skipped codes excluded
    skipped_today = _today_skipped_codes()
    row = _select_pick_row(extra_excluded=skipped_today)
    if not row:
        # No candidate — rollback by re-inserting the original pick if we had one
        if current:
            db.daily_picks.insert_one(dict(current))
        raise RuntimeError("No remaining candidates to shuffle to")

    new_doc = _materialize_pick(row)
    db.daily_picks.insert_one(dict(new_doc))

    skip_count = db.daily_pick_skips.count_documents({"date": today})
    fresh = get_today_pick()  # builds the public payload
    return {
        "today": fresh.get("today") if fresh else None,
        "yesterday": fresh.get("yesterday") if fresh else None,
        "skipped": skipped_code,
        "skip_count_today": skip_count,
    }


def get_today_skips() -> list[dict]:
    """Admin view: list of codes skipped today, newest first."""
    db = get_db()
    today = _today_iso()
    docs = list(
        db.daily_pick_skips.find({"date": today}, {"_id": 0}).sort("skipped_at", DESCENDING)
    )
    out: list[dict] = []
    for d in docs:
        skipped_at = d.get("skipped_at")
        if isinstance(skipped_at, datetime):
            skipped_at = skipped_at.isoformat()
        out.append({
            "trading_code": d.get("trading_code"),
            "company_name": d.get("company_name"),
            "score_when_skipped": d.get("score_when_skipped"),
            "skipped_at": skipped_at,
            "skipped_by": d.get("skipped_by"),
        })
    return out


def get_today_pick() -> Optional[dict]:
    """Public: today's pick + yesterday's tracked performance."""
    today = _ensure_today_pick()
    if not today:
        return None

    db = get_db()
    yest_doc = db.daily_picks.find_one(
        {"date": {"$lt": today["date"]}},
        {"_id": 0},
        sort=[("date", DESCENDING)],
    )
    yesterday: Optional[dict] = None
    if yest_doc:
        next_ret = _next_day_return_pct(yest_doc["trading_code"], yest_doc["date"])
        yesterday = {
            "date": yest_doc["date"],
            "trading_code": yest_doc["trading_code"],
            "company_name": yest_doc.get("company_name"),
            "next_day_return_pct": next_ret,
        }

    # Drop heavy/internal fields from response
    today_out = {
        "date": today["date"],
        "trading_code": today["trading_code"],
        "company_name": today.get("company_name"),
        "sector": today.get("sector"),
        "score": today.get("score"),
        "ltp": today.get("ltp_at_pick"),
        "change_pct": today.get("change_pct_at_pick"),
        "pillars": {
            "profits":      today.get("p1_biz"),
            "balance":      today.get("p2_health"),
            "business":     today.get("p3_moat"),
            "fair_price":   today.get("p4_val"),
            "dividend":     today.get("p5_div"),
        },
        "reasons": today.get("reasons") or [],
    }
    return {"today": today_out, "yesterday": yesterday}


def get_pick_history(limit: int = 30) -> list[dict]:
    """Public: last N picks with their next-day return."""
    db = get_db()
    docs = list(
        db.daily_picks.find({}, {"_id": 0})
        .sort("date", DESCENDING)
        .limit(max(1, min(limit, 90)))
    )
    out: list[dict] = []
    for d in docs:
        next_ret = _next_day_return_pct(d["trading_code"], d["date"])
        out.append({
            "date": d["date"],
            "trading_code": d["trading_code"],
            "company_name": d.get("company_name"),
            "sector": d.get("sector"),
            "score": d.get("score"),
            "ltp_at_pick": d.get("ltp_at_pick"),
            "next_day_return_pct": next_ret,
            "reasons": d.get("reasons") or [],
        })
    return out
