"""
DSE Top 20 — 7-day momentum composite.

Ranks stocks using last 7 trading days of market data only (no DSEF score).
Composite = z-scored weighted sum of 5 factors:
  35% price momentum (7d return, capped +/-30%)
  25% relative strength vs DSEX (stock 7d return - DSEX 7d return)
  20% volume conviction (log of 7d/30d turnover ratio)
  15% trend quality (up-day ratio - whipsaw penalty)
   5% sweet-spot bonus (60-90% of 52w range = +1, top 5% = -1)

Updated daily after the scraper run; cached 5 minutes.
"""
import math
from datetime import datetime
from typing import Optional

from backend.services.db_service import (
    _ttl_cache,
    compute_market_intelligence,
    get_db,
    load_companies,
)


# ---------------------------------------------------------------------------
# Tunables
# ---------------------------------------------------------------------------

TOP_N = 20
MIN_DAYS_IN_WINDOW = 5
MIN_AVG_TURNOVER_MN = 1.0   # Tk 1M average daily turnover over last 7 days
RETURN_CAP = 0.30           # cap individual 7d returns at +/-30% before z-scoring

W_MOMENTUM = 0.35
W_RS = 0.25
W_VOLUME = 0.20
W_TREND = 0.15
W_SWEET = 0.05


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _date_str(d) -> str:
    return d.isoformat() if hasattr(d, "isoformat") else str(d)


def _zscore(values: list[float]) -> list[float]:
    """Z-score a list of floats. NaN-safe; returns 0.0 for any None / NaN."""
    clean = [v for v in values if v is not None and not (isinstance(v, float) and math.isnan(v))]
    if len(clean) < 2:
        return [0.0] * len(values)
    mean = sum(clean) / len(clean)
    variance = sum((v - mean) ** 2 for v in clean) / len(clean)
    sd = math.sqrt(variance)
    if sd <= 0:
        return [0.0] * len(values)
    out = []
    for v in values:
        if v is None or (isinstance(v, float) and math.isnan(v)):
            out.append(0.0)
        else:
            out.append((v - mean) / sd)
    return out


def _rationale(item: dict) -> str:
    parts = []
    r7 = item.get("return_7d_pct")
    rs = item.get("rs_vs_dsex_pct")
    vr = item.get("volume_ratio")
    ud = item.get("up_days_7d") or 0
    days = item.get("days_counted") or 0

    if r7 is not None:
        sign = "+" if r7 >= 0 else ""
        parts.append(f"{sign}{r7:.1f}% in 7 days")
    if rs is not None and abs(rs) >= 0.5:
        sign = "+" if rs > 0 else ""
        parts.append(f"{sign}{rs:.1f}% vs DSEX")
    if vr is not None and vr >= 1.3:
        parts.append(f"turnover {vr:.1f}x norm")
    elif vr is not None and vr <= 0.7:
        parts.append(f"turnover {vr:.1f}x norm")
    if days > 0 and ud >= max(4, days - 1):
        parts.append(f"{ud}/{days} up days")
    if not parts:
        return "Steady accumulation candidate."
    return ", ".join(parts) + "."


# ---------------------------------------------------------------------------
# Core compute
# ---------------------------------------------------------------------------

@_ttl_cache(300)
def compute_top20() -> dict:
    db = get_db()
    generated_at = datetime.utcnow().isoformat() + "Z"

    # --- 1. Most recent 30 distinct trading dates -----------------------------
    all_dates = sorted(
        db.stock_prices.distinct("date"),
        key=lambda d: _date_str(d),
        reverse=True,
    )
    if len(all_dates) < 2:
        return {
            "generated_at": generated_at,
            "as_of_date": None,
            "market_condition": "unknown",
            "dsex_7d_change_pct": None,
            "universe_size": 0,
            "items": [],
        }

    recent_dates = all_dates[:30]
    latest_date = recent_dates[0]
    latest_date_str = _date_str(latest_date)

    # 7-day window = today + 6 prior trading days; reference for "7 days ago"
    # is the close 7 trading days back, or the oldest available within 7d window.
    window7_dates = recent_dates[: min(7, len(recent_dates))]
    ref_idx = min(7, len(recent_dates) - 1)  # 0..ref_idx in recent_dates is the 7d window slice
    ref_date = recent_dates[ref_idx]

    window30_dates = recent_dates  # up to 30 days for normalisation

    # --- 2. Pull all rows for the 30-day window in a single query -------------
    docs = list(db.stock_prices.find(
        {"date": {"$in": window30_dates}},
        {
            "_id": 0, "trading_code": 1, "date": 1,
            "ltp": 1, "close_price": 1, "ycp": 1,
            "value_mn": 1, "volume": 1,
        },
    ))

    by_code: dict[str, dict] = {}
    for d in docs:
        code = d.get("trading_code")
        if not code:
            continue
        bucket = by_code.setdefault(code, {})
        bucket[_date_str(d["date"])] = d

    # --- 3. DSEX 7d return ----------------------------------------------------
    summary_docs = list(db.dse_market_summary.find(
        {"date": {"$in": window30_dates}},
        {"_id": 0, "date": 1, "dsex": 1},
    ))
    summary_by_date = {_date_str(d["date"]): d for d in summary_docs}

    today_dsex = summary_by_date.get(latest_date_str, {}).get("dsex")
    ref_dsex = summary_by_date.get(_date_str(ref_date), {}).get("dsex")
    dsex_7d_pct: Optional[float] = None
    if today_dsex and ref_dsex and ref_dsex > 0:
        dsex_7d_pct = (today_dsex / ref_dsex - 1.0) * 100.0

    # --- 4. Company metadata --------------------------------------------------
    companies = {c["trading_code"]: c for c in load_companies()}

    # --- 4b. 52-week min/max per code (one grouped aggregation) --------------
    cutoff_365 = _date_str_minus_days(latest_date, 365)
    range_agg = list(db.stock_prices.aggregate([
        {"$match": {
            "date": {"$gte": cutoff_365 if isinstance(cutoff_365, str) else cutoff_365},
            "ltp": {"$gt": 0},
        }},
        {"$group": {
            "_id": "$trading_code",
            "hi": {"$max": "$ltp"},
            "lo": {"$min": "$ltp"},
        }},
    ]))
    range_by_code = {r["_id"]: r for r in range_agg}

    # --- 5. Per-stock raw factors --------------------------------------------
    raw: list[dict] = []
    for code, day_map in by_code.items():
        comp = companies.get(code)
        if not comp:
            continue  # excluded (bond/ETF/MF) or unknown — skip

        today_row = day_map.get(latest_date_str)
        if not today_row:
            continue
        today_ltp = today_row.get("ltp") or today_row.get("close_price")
        if not today_ltp or today_ltp <= 0:
            continue

        # 7-day window rows (excluding today is fine; we use today vs ref close)
        window_rows = []
        for ds in window7_dates:
            row = day_map.get(_date_str(ds))
            if row:
                window_rows.append(row)
        if len(window_rows) < MIN_DAYS_IN_WINDOW:
            continue

        # 7d avg daily turnover (Tk million)
        turnovers7 = [r.get("value_mn") for r in window_rows if r.get("value_mn") is not None]
        if not turnovers7:
            continue
        avg_turnover_7d = sum(turnovers7) / len(turnovers7)
        if avg_turnover_7d < MIN_AVG_TURNOVER_MN:
            continue  # liquidity floor

        # 30d avg daily turnover (for volume conviction)
        turnovers30 = []
        for ds in window30_dates:
            row = day_map.get(_date_str(ds))
            if row and row.get("value_mn") is not None:
                turnovers30.append(row["value_mn"])
        avg_turnover_30d = (sum(turnovers30) / len(turnovers30)) if turnovers30 else avg_turnover_7d
        if avg_turnover_30d <= 0:
            avg_turnover_30d = avg_turnover_7d

        # --- Factor 1: 7-day price momentum -------------------------------
        ref_row = day_map.get(_date_str(ref_date))
        ref_close = (ref_row.get("close_price") or ref_row.get("ltp")) if ref_row else None
        if not ref_close or ref_close <= 0:
            # Fall back to oldest row in window
            oldest = sorted(window_rows, key=lambda r: _date_str(r["date"]))[0]
            ref_close = oldest.get("close_price") or oldest.get("ltp") or oldest.get("ycp")
        if not ref_close or ref_close <= 0:
            continue

        return_7d = (today_ltp / ref_close - 1.0)
        return_7d_capped = max(-RETURN_CAP, min(RETURN_CAP, return_7d))

        # --- Factor 2: Relative strength vs DSEX -------------------------
        rs = None
        if dsex_7d_pct is not None:
            rs = (return_7d * 100.0) - dsex_7d_pct

        # --- Factor 3: Volume conviction ---------------------------------
        if avg_turnover_30d > 0 and avg_turnover_7d > 0:
            vol_factor = math.log(avg_turnover_7d / avg_turnover_30d)
        else:
            vol_factor = 0.0
        volume_ratio_display = (avg_turnover_7d / avg_turnover_30d) if avg_turnover_30d > 0 else 1.0

        # --- Factor 4: Trend quality -------------------------------------
        # Compute daily returns within the window using each row's ycp/close
        sorted_rows = sorted(window_rows, key=lambda r: _date_str(r["date"]))
        daily_returns: list[float] = []
        for r in sorted_rows:
            close = r.get("close_price") or r.get("ltp")
            ycp = r.get("ycp")
            if close and ycp and ycp > 0:
                daily_returns.append((close / ycp) - 1.0)
        days_counted = len(daily_returns)
        up_days = sum(1 for x in daily_returns if x > 0)

        if daily_returns:
            up_ratio = up_days / days_counted
            mean_r = sum(daily_returns) / days_counted
            var_r = sum((x - mean_r) ** 2 for x in daily_returns) / days_counted
            sd_r = math.sqrt(var_r)
            denom = abs(mean_r) if abs(mean_r) > 1e-6 else 1e-6
            whipsaw_penalty = sd_r / denom
            # Cap penalty so a single whipsaw doesn't destroy the score
            whipsaw_penalty = min(whipsaw_penalty, 5.0)
            trend_factor = up_ratio - 0.3 * (whipsaw_penalty / 5.0)  # normalised to ~[-0.3, 1.0]
        else:
            trend_factor = 0.0

        # --- Factor 5: Sweet-spot bonus from 52w range -------------------
        sweet = 0.0
        pct_in_range: Optional[float] = None
        rng = range_by_code.get(code)
        if rng:
            hi = rng.get("hi")
            lo = rng.get("lo")
            if hi and lo and hi > lo:
                pct_in_range = (today_ltp - lo) / (hi - lo) * 100.0
                if 60.0 <= pct_in_range <= 90.0:
                    sweet = 1.0
                elif pct_in_range >= 95.0:
                    sweet = -1.0

        raw.append({
            "trading_code": code,
            "company_name": comp.get("company_name"),
            "sector": comp.get("sector"),
            "ltp": float(today_ltp),
            "return_7d_pct": round(return_7d * 100.0, 2),
            "_return_7d_capped": return_7d_capped,
            "rs_vs_dsex_pct": round(rs, 2) if rs is not None else None,
            "volume_ratio": round(volume_ratio_display, 2),
            "_vol_factor": vol_factor,
            "avg_turnover_7d_mn": round(avg_turnover_7d, 2),
            "up_days_7d": up_days,
            "days_counted": days_counted,
            "_trend_factor": trend_factor,
            "pct_in_52w_range": round(pct_in_range, 1) if pct_in_range is not None else None,
            "_sweet": sweet,
        })

    universe_size = len(raw)
    if universe_size == 0:
        return {
            "generated_at": generated_at,
            "as_of_date": latest_date_str,
            "market_condition": "unknown",
            "dsex_7d_change_pct": round(dsex_7d_pct, 2) if dsex_7d_pct is not None else None,
            "universe_size": 0,
            "items": [],
        }

    # --- 6. Z-score each factor and combine -----------------------------------
    z_mom = _zscore([r["_return_7d_capped"] for r in raw])
    z_rs = _zscore([(r["rs_vs_dsex_pct"] or 0.0) for r in raw])
    z_vol = _zscore([r["_vol_factor"] for r in raw])
    z_trend = _zscore([r["_trend_factor"] for r in raw])
    z_sweet = _zscore([r["_sweet"] for r in raw])

    for i, r in enumerate(raw):
        r["composite_score"] = round(
            W_MOMENTUM * z_mom[i]
            + W_RS * z_rs[i]
            + W_VOLUME * z_vol[i]
            + W_TREND * z_trend[i]
            + W_SWEET * z_sweet[i],
            3,
        )

    raw.sort(key=lambda x: x["composite_score"], reverse=True)
    top = raw[:TOP_N]

    # --- 7. Market condition (reuse) ------------------------------------------
    try:
        intel = compute_market_intelligence()
        condition = intel.get("market_condition", "unknown")
    except Exception:
        condition = "unknown"

    # --- 8. Build response items ---------------------------------------------
    items = []
    for rank, r in enumerate(top, start=1):
        items.append({
            "rank": rank,
            "trading_code": r["trading_code"],
            "company_name": r.get("company_name"),
            "sector": r.get("sector"),
            "ltp": r.get("ltp"),
            "return_7d_pct": r.get("return_7d_pct"),
            "rs_vs_dsex_pct": r.get("rs_vs_dsex_pct"),
            "volume_ratio": r.get("volume_ratio"),
            "avg_turnover_7d_mn": r.get("avg_turnover_7d_mn"),
            "up_days_7d": r.get("up_days_7d", 0),
            "days_counted": r.get("days_counted", 0),
            "pct_in_52w_range": r.get("pct_in_52w_range"),
            "composite_score": r["composite_score"],
            "rationale": _rationale(r),
        })

    return {
        "generated_at": generated_at,
        "as_of_date": latest_date_str,
        "market_condition": condition,
        "dsex_7d_change_pct": round(dsex_7d_pct, 2) if dsex_7d_pct is not None else None,
        "universe_size": universe_size,
        "items": items,
    }


# ---------------------------------------------------------------------------
# Per-code momentum (for stock detail page verdict)
# ---------------------------------------------------------------------------

def _grade_momentum(return_7d_pct: Optional[float],
                    rs: Optional[float],
                    volume_ratio: Optional[float],
                    avg_turnover_7d: Optional[float]) -> str:
    if avg_turnover_7d is not None and avg_turnover_7d < MIN_AVG_TURNOVER_MN:
        return "weak_liquidity"
    if return_7d_pct is None:
        return "unknown"
    has_vol_conviction = (volume_ratio is not None and volume_ratio >= 1.3)
    rs_positive = (rs is not None and rs > 0)
    if return_7d_pct >= 5.0 and (has_vol_conviction or rs_positive):
        return "hot"
    if return_7d_pct <= -5.0:
        return "cold"
    if return_7d_pct >= 1.5:
        return "warm"
    return "flat"


@_ttl_cache(300)
def compute_momentum_for_code(code: str) -> Optional[dict]:
    """Compute 7d momentum snapshot for a single ticker. Returns None if data insufficient."""
    if not code:
        return None
    db = get_db()

    all_dates = sorted(
        db.stock_prices.distinct("date"),
        key=lambda d: _date_str(d),
        reverse=True,
    )
    if len(all_dates) < 2:
        return None

    recent_dates = all_dates[:30]
    latest_date = recent_dates[0]
    latest_date_str = _date_str(latest_date)
    window7_dates = recent_dates[: min(7, len(recent_dates))]
    ref_idx = min(7, len(recent_dates) - 1)
    ref_date = recent_dates[ref_idx]
    window30_dates = recent_dates

    # DSEX 7d for relative strength
    summary_docs = list(db.dse_market_summary.find(
        {"date": {"$in": window30_dates}},
        {"_id": 0, "date": 1, "dsex": 1},
    ))
    summary_by_date = {_date_str(d["date"]): d for d in summary_docs}
    today_dsex = summary_by_date.get(latest_date_str, {}).get("dsex")
    ref_dsex = summary_by_date.get(_date_str(ref_date), {}).get("dsex")
    dsex_7d_pct: Optional[float] = None
    if today_dsex and ref_dsex and ref_dsex > 0:
        dsex_7d_pct = (today_dsex / ref_dsex - 1.0) * 100.0

    # Pull this code's window
    docs = list(db.stock_prices.find(
        {"trading_code": code, "date": {"$in": window30_dates}},
        {"_id": 0, "date": 1, "ltp": 1, "close_price": 1, "ycp": 1, "value_mn": 1, "volume": 1},
    ))
    if not docs:
        return None
    day_map = {_date_str(d["date"]): d for d in docs}

    today_row = day_map.get(latest_date_str)
    if not today_row:
        return None
    today_ltp = today_row.get("ltp") or today_row.get("close_price")
    if not today_ltp or today_ltp <= 0:
        return None

    window_rows = [day_map[_date_str(ds)] for ds in window7_dates if _date_str(ds) in day_map]
    if len(window_rows) < MIN_DAYS_IN_WINDOW:
        return None

    turnovers7 = [r.get("value_mn") for r in window_rows if r.get("value_mn") is not None]
    avg_turnover_7d = (sum(turnovers7) / len(turnovers7)) if turnovers7 else 0.0

    turnovers30 = [day_map[_date_str(ds)].get("value_mn")
                   for ds in window30_dates
                   if _date_str(ds) in day_map and day_map[_date_str(ds)].get("value_mn") is not None]
    avg_turnover_30d = (sum(turnovers30) / len(turnovers30)) if turnovers30 else avg_turnover_7d
    if avg_turnover_30d <= 0:
        avg_turnover_30d = avg_turnover_7d

    # 7d return
    ref_row = day_map.get(_date_str(ref_date))
    ref_close = (ref_row.get("close_price") or ref_row.get("ltp")) if ref_row else None
    if not ref_close or ref_close <= 0:
        oldest = sorted(window_rows, key=lambda r: _date_str(r["date"]))[0]
        ref_close = oldest.get("close_price") or oldest.get("ltp") or oldest.get("ycp")
    if not ref_close or ref_close <= 0:
        return None
    return_7d = (today_ltp / ref_close - 1.0) * 100.0

    rs = (return_7d - dsex_7d_pct) if dsex_7d_pct is not None else None

    volume_ratio = (avg_turnover_7d / avg_turnover_30d) if avg_turnover_30d > 0 else 1.0

    sorted_rows = sorted(window_rows, key=lambda r: _date_str(r["date"]))
    daily_returns = []
    for r in sorted_rows:
        close = r.get("close_price") or r.get("ltp")
        ycp = r.get("ycp")
        if close and ycp and ycp > 0:
            daily_returns.append((close / ycp) - 1.0)
    days_counted = len(daily_returns)
    up_days = sum(1 for x in daily_returns if x > 0)

    # 52w range position
    cutoff_365 = _date_str_minus_days(latest_date, 365)
    rng_doc = next(iter(db.stock_prices.aggregate([
        {"$match": {"trading_code": code,
                    "date": {"$gte": cutoff_365 if isinstance(cutoff_365, str) else cutoff_365},
                    "ltp": {"$gt": 0}}},
        {"$group": {"_id": "$trading_code", "hi": {"$max": "$ltp"}, "lo": {"$min": "$ltp"}}},
    ])), None)
    pct_in_range: Optional[float] = None
    if rng_doc:
        hi, lo = rng_doc.get("hi"), rng_doc.get("lo")
        if hi and lo and hi > lo:
            pct_in_range = (today_ltp - lo) / (hi - lo) * 100.0

    grade = _grade_momentum(return_7d, rs, volume_ratio, avg_turnover_7d)

    return {
        "return_7d_pct": round(return_7d, 2),
        "rs_vs_dsex_pct": round(rs, 2) if rs is not None else None,
        "volume_ratio": round(volume_ratio, 2),
        "avg_turnover_7d_mn": round(avg_turnover_7d, 2),
        "up_days_7d": up_days,
        "days_counted": days_counted,
        "pct_in_52w_range": round(pct_in_range, 1) if pct_in_range is not None else None,
        "momentum_grade": grade,
    }


def _date_str_minus_days(d, days: int) -> str:
    """Return ISO string for `d - days`, supporting both date/datetime and ISO-string dates."""
    from datetime import datetime as _dt, timedelta as _td
    if hasattr(d, "isoformat") and not isinstance(d, str):
        try:
            return (d - _td(days=days)).isoformat()
        except Exception:
            pass
    s = str(d)
    try:
        parsed = _dt.fromisoformat(s[:19])
        return (parsed - _td(days=days)).isoformat()
    except Exception:
        return s
