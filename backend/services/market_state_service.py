"""
Market State — the "complete picture of the market right now" page.

One cached bundle that answers, in plain words:
  1. The big picture  — a simple mood + one-line summary, the four answers
     (prices high/low this year · more up or down today · cheap or expensive ·
     busy or quiet) and the raw numbers behind them (`stats`, which the page
     shows as "why we say this")
  2. Since yesterday  — what changed against the previous trading day's
     stored snapshot (healthy count, sectors that flipped, names new to the
     lists, how today's breadth ranks against the last ten days)
  3. What's happening now — which businesses are doing well (each row links
     to its `/sector/[slug]` page when one exists), how many companies are
     strong vs risky, plus a one-week trend for that count
  4. History — DSEX this year and the daily snapshot series (healthy share,
     cheap share) that feed the tabbed chart
  5. What could happen next — stocks at a turning point, unusual buying, and
     dividends coming (from the dividend-calendar service, so the last buy day
     matches /dividend-calendar and the stock page exactly)
  6. Where to look for chances — four plain opportunity lists

All wording lives on the frontend; this service returns plain numbers + short
status strings. No finance terms leak into the values we expose. The one
exception is `summary_bn`, a template-rendered everyday-Bangla paragraph.
"""
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

from pymongo import ASCENDING

from backend.services.db_service import (
    CLOSE_EXPR,
    get_db,
    load_companies,
    load_latest_prices,
    load_market_index,
    use_official_close,
    _ttl_cache,
)
from backend.services.scoring_service import build_scores_df
from backend.services.sector_service import sector_slug, sector_slugs
from backend.services.corporate_actions_service import build_dividend_calendar

_SNAPSHOT_COLLECTION = "market_snapshots"

# How far back the DSEX line reaches (a little over a year of trading days).
_HISTORY_DAYS = 380
# Snapshot rows returned for the daily series (≈ 8–9 months of trading days).
_SNAPSHOT_ROWS = 180
# "Today's breadth beats N of the last M days" window.
_BREADTH_LOOKBACK = 10
# Names listed in a "new since yesterday" chip row.
_NEW_NAMES_CAP = 5


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _num(v) -> Optional[float]:
    """Coerce to a finite float or None (handles numpy + NaN)."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def _median(vals: list[float]) -> Optional[float]:
    clean = sorted(v for v in vals if v is not None)
    n = len(clean)
    if n == 0:
        return None
    mid = n // 2
    if n % 2:
        return clean[mid]
    return (clean[mid - 1] + clean[mid]) / 2.0


def _date_str(d) -> Optional[str]:
    """Normalise a stored date (ISO string or datetime) to 'YYYY-MM-DD'."""
    if d is None:
        return None
    if isinstance(d, str):
        return d[:10]
    if hasattr(d, "isoformat"):
        return d.isoformat()[:10]
    return str(d)[:10]


def _recent_dates(db, n: int) -> list:
    """The n most recent distinct trading dates, newest first."""
    dates = db.stock_prices.distinct("date")
    dates = [d for d in dates if d is not None]
    dates.sort(key=lambda d: d.isoformat() if hasattr(d, "isoformat") else str(d), reverse=True)
    return dates[:n]


# Plain, everyday names for DSE sectors — no industry terms.
_PLAIN_SECTOR = {
    "bank": "Banks",
    "banks": "Banks",
    "financial institutions": "Finance companies",
    "mutual funds": "Funds",
    "pharmaceuticals & chemicals": "Medicine",
    "pharmaceuticals": "Medicine",
    "fuel & power": "Power & gas",
    "power": "Power & gas",
    "engineering": "Engineering",
    "food & allied": "Food",
    "textile": "Clothing",
    "textiles": "Clothing",
    "information technology": "Tech",
    "it - information technology": "Tech",
    "it": "Tech",
    "it sector": "Tech",
    "telecommunication": "Phone & internet",
    "cement": "Cement",
    "insurance": "Insurance",
    "general insurance": "Insurance",
    "life insurance": "Insurance",
    "tannery industries": "Leather",
    "ceramics sector": "Ceramics",
    "ceramics": "Ceramics",
    "jute": "Jute",
    "paper & printing": "Paper",
    "services & real estate": "Services & property",
    "travel & leisure": "Travel",
    "miscellaneous": "Other",
    "corporate bond": "Bonds",
    "debenture": "Bonds",
}


def _plain_sector(s: Optional[str]) -> str:
    key = (s or "").strip().lower()
    return _PLAIN_SECTOR.get(key, (s or "Other").strip().title() or "Other")


def _tier_label(score: Optional[float]) -> Optional[str]:
    """Boundaries follow the canonical tiers (backend/services/tiers.py)."""
    if score is None:
        return None
    if score >= 75:
        return "strong"
    if score >= 60:
        return "good"
    if score >= 45:
        return "soso"
    return "risky"


# ---------------------------------------------------------------------------
# Market-wide reads
# ---------------------------------------------------------------------------

def _index_history(db, days: int = _HISTORY_DAYS) -> list[dict]:
    """Daily DSEX + turnover, newest first, skipping pre-market 0.00 rows.

    ⚠️ `dse_market_summary.date` is an ISO **string** (the scraper stamps it
    with `bst_today_iso()`), so the range bound has to be a string too — BSON
    sorts String before Date, so a `datetime` bound silently matched nothing.
    That bug shipped with this page: "prices this year" and "busy or quiet"
    always answered "—" and the mood could never say "Going down" (fixed
    2026-09-12). Both bound types are OR-ed so a stray datetime-dated row
    still counts."""
    cutoff_dt = datetime.now(timezone.utc) - timedelta(days=days)
    cutoff_str = cutoff_dt.strftime("%Y-%m-%d")
    docs = list(
        db.dse_market_summary.find(
            {
                "dsex": {"$nin": [None, 0, 0.0]},
                "$or": [{"date": {"$gte": cutoff_str}}, {"date": {"$gte": cutoff_dt}}],
            },
            {"_id": 0, "date": 1, "dsex": 1, "dsex_change_pct": 1, "total_value_mn": 1},
        )
    )
    out: list[dict] = []
    for d in docs:
        ds = _date_str(d.get("date"))
        if not ds:
            continue
        out.append({
            "date": ds,
            "dsex": _num(d.get("dsex")),
            "dsex_change_pct": _num(d.get("dsex_change_pct")),
            "total_value_mn": _num(d.get("total_value_mn")),
        })
    out.sort(key=lambda h: h["date"], reverse=True)
    return out


def _window_returns(db, codes: set) -> tuple[dict, dict]:
    """Per-stock % return over ~1 week (5 trading days) and ~1 month (22).
    Returns ({code: ret_1w_pct}, {code: ret_1m_pct})."""
    dates = _recent_dates(db, 23)
    if len(dates) < 2:
        return {}, {}
    latest = dates[0]
    week_ago = dates[5] if len(dates) > 5 else dates[-1]
    month_ago = dates[22] if len(dates) > 22 else dates[-1]

    wanted = {latest, week_ago, month_ago}
    docs = db.stock_prices.find(
        {"date": {"$in": list(wanted)}, "ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1,
         "close_price": 1, "ycp": 1},
    )
    px_latest: dict = {}
    px_week: dict = {}
    px_month: dict = {}
    for d in docs:
        use_official_close(d)
        code = d.get("trading_code")
        if code is not None and codes and code not in codes:
            continue
        dt = d.get("date")
        ltp = _num(d.get("ltp"))
        if ltp is None or ltp <= 0:
            continue
        if dt == latest:
            px_latest[code] = ltp
        if dt == week_ago:
            px_week[code] = ltp
        if dt == month_ago:
            px_month[code] = ltp

    ret_1w: dict = {}
    ret_1m: dict = {}
    for code, now in px_latest.items():
        w = px_week.get(code)
        m = px_month.get(code)
        if w and w > 0:
            ret_1w[code] = round((now - w) / w * 100, 2)
        if m and m > 0:
            ret_1m[code] = round((now - m) / m * 100, 2)
    return ret_1w, ret_1m


def _near_extremes(db, companies: dict, prices: dict) -> tuple[list, list]:
    """Stocks within 5% of their 1-year high / low. Returns (near_high, near_low)."""
    # `stock_prices.date` holds an ISO string, so the bound has to be a string
    # too — BSON sorts String before Date, so a datetime bound matched nothing.
    one_year_ago = (datetime.now(timezone.utc) - timedelta(days=365)).strftime("%Y-%m-%d")
    agg = db.stock_prices.aggregate([
        {"$match": {"date": {"$gte": one_year_ago}, "ltp": {"$gt": 0}}},
        {"$group": {"_id": "$trading_code", "hi": {"$max": CLOSE_EXPR}, "lo": {"$min": CLOSE_EXPR}}},
    ])
    ext = {d["_id"]: d for d in agg}

    near_high: list[dict] = []
    near_low: list[dict] = []
    for code, p in prices.items():
        ltp = _num(p.get("ltp"))
        e = ext.get(code)
        if ltp is None or ltp <= 0 or not e:
            continue
        hi, lo = _num(e.get("hi")), _num(e.get("lo"))
        if not hi or not lo or hi <= lo:
            continue
        comp = companies.get(code) or {}
        name = comp.get("company_name")
        sec = _plain_sector(comp.get("sector"))
        gap_hi = (hi - ltp) / hi
        gap_lo = (ltp - lo) / lo
        if 0 <= gap_hi <= 0.05:
            near_high.append({"trading_code": code, "company_name": name, "sector": sec,
                              "gap_pct": round(gap_hi * 100, 1), "last_price": round(ltp, 2)})
        if 0 <= gap_lo <= 0.05:
            near_low.append({"trading_code": code, "company_name": name, "sector": sec,
                             "gap_pct": round(gap_lo * 100, 1), "last_price": round(ltp, 2)})
    near_high.sort(key=lambda x: x["gap_pct"])
    near_low.sort(key=lambda x: x["gap_pct"])
    return near_high, near_low


def _unusual_buying(db, companies: dict, prices: dict) -> list[dict]:
    """Stocks being bought far more than usual today — today's volume well above
    their own 7-day average, and the price holding up or rising (real buying,
    not a sell-off). Plain signal that 'something may be happening'."""
    dates = _recent_dates(db, 8)
    if len(dates) < 3:
        return []
    hist = dates[1:8]  # the days before today
    sums: dict = {}
    counts: dict = {}
    for d in db.stock_prices.find(
        {"date": {"$in": hist}}, {"_id": 0, "trading_code": 1, "volume": 1}
    ):
        v = _num(d.get("volume"))
        if v and v > 0:
            code = d.get("trading_code")
            sums[code] = sums.get(code, 0) + v
            counts[code] = counts.get(code, 0) + 1

    out: list[dict] = []
    for code, p in prices.items():
        vol = _num(p.get("volume"))
        chg = _num(p.get("change_pct"))
        val = _num(p.get("value_mn")) or 0
        cnt = counts.get(code, 0)
        if not vol or cnt < 2 or val < 2:  # need history + real liquidity
            continue
        avg = sums[code] / cnt
        if avg <= 0:
            continue
        ratio = vol / avg
        if ratio >= 2.0 and (chg or 0) >= 0:
            lp = _num(p.get("ltp"))
            comp = companies.get(code) or {}
            out.append({
                "trading_code": code,
                "company_name": comp.get("company_name"),
                "sector": _plain_sector(comp.get("sector")),
                "volume_ratio": round(ratio, 1),
                "change_pct": round(chg, 2) if chg is not None else None,
                "last_price": round(lp, 2) if lp is not None else None,
            })
    out.sort(key=lambda x: x["volume_ratio"], reverse=True)
    return out[:6]


def _sector_rows(companies: dict, ret_1w: dict, ret_1m: dict) -> list[dict]:
    """Average 1-week / 1-month move per DSE sector (≥3 priced companies),
    best first. `slug` is set only when `/sector/[slug]` exists for it —
    the sector hub needs MIN_COMPANIES scored names before it gets a page,
    which is a stricter bar than "3 priced", so the frontend must not build
    the link itself."""
    code_to_sector = {c: (companies.get(c) or {}).get("sector") for c in companies}
    sec_1w: dict = {}
    sec_1m: dict = {}
    for code, r in ret_1w.items():
        sec = code_to_sector.get(code)
        if sec:
            sec_1w.setdefault(sec, []).append(r)
    for code, r in ret_1m.items():
        sec = code_to_sector.get(code)
        if sec:
            sec_1m.setdefault(sec, []).append(r)

    try:
        pages = set(sector_slugs())
    except Exception:
        pages = set()

    sectors: list[dict] = []
    for sec, vals in sec_1w.items():
        if len(vals) < 3:
            continue
        avg_1w = round(sum(vals) / len(vals), 1)
        m_vals = sec_1m.get(sec, [])
        avg_1m = round(sum(m_vals) / len(m_vals), 1) if m_vals else None
        if avg_1w > 0.5:
            status, tone = "Doing well", "pos"
        elif avg_1w < -0.5:
            status, tone = "Struggling", "neg"
        else:
            status, tone = "So-so", "neutral"
        slug = sector_slug(sec)
        sectors.append({
            "name": _plain_sector(sec),
            "slug": slug if slug in pages else None,
            "status": status,
            "tone": tone,
            "ret_1w": avg_1w,
            "ret_1m": avg_1m,
            "count": len(vals),
        })
    sectors.sort(key=lambda x: x["ret_1w"], reverse=True)
    return sectors


def _upcoming_dividends() -> list[dict]:
    """Next record dates (with the last normal-market buy day) and the freshest
    declarations that have no record date yet — soonest / newest first.

    Reuses the dividend-calendar service so cash-per-share, yield and `buy_by`
    are the same numbers `/dividend-calendar` and the stock page show. The
    field names the daily email reads (`trading_code`, `company_name`, `date`,
    `dividend_pct`, `kind`) are kept."""
    try:
        cal = build_dividend_calendar()
    except Exception:
        return []
    today = cal.get("today") or datetime.now().date().isoformat()

    def _row(e: dict, kind: str, when: str) -> dict:
        ltp = _num(e.get("ltp"))
        return {
            "trading_code": e.get("trading_code"),
            "company_name": e.get("company_name"),
            "sector": _plain_sector(e.get("sector")),
            "last_price": round(ltp, 2) if ltp is not None else None,
            "date": when,
            "kind": kind,
            "dividend_pct": _num(e.get("cash_pct")),
            "stock_pct": _num(e.get("stock_pct")),
            "cash_per_share": _num(e.get("cash_per_share")),
            "yield_pct": _num(e.get("yield_pct")),
            "buy_by": e.get("buy_by"),
            "buy_days_left": e.get("buy_days_left"),
            "record_days_left": e.get("record_days_left"),
        }

    records: list[dict] = []
    seen: set = set()
    for e in cal.get("record_dates") or []:
        code, rd = e.get("trading_code"), e.get("record_date")
        if not code or not rd or rd < today or e.get("is_no_dividend"):
            continue
        if code in seen:
            continue
        seen.add(code)
        records.append(_row(e, "record", rd))
    records.sort(key=lambda x: x["date"])

    declared: list[dict] = []
    for e in cal.get("recent_declarations") or []:
        code = e.get("trading_code")
        if not code or code in seen or e.get("record_date") or e.get("is_no_dividend"):
            continue
        decl = e.get("declaration_date")
        if not decl:
            continue
        seen.add(code)
        declared.append(_row(e, "declared", decl))
    declared.sort(key=lambda x: x["date"], reverse=True)

    return (records + declared)[:10]


# ---------------------------------------------------------------------------
# Sentiment (ported from the old frontend gauge) → 0-100 + plain word
# ---------------------------------------------------------------------------

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _feeling(idx: dict) -> tuple[int, str]:
    up = idx.get("up_count") or 0
    down = idx.get("down_count") or 0
    neutral = idx.get("neutral_count") or 0
    total = (up + down + neutral) or 1
    breadth = (up / total) * 40
    vol = _clamp(((idx.get("volume_change_pct") or 0) + 20) / 40, 0, 1) * 30
    index = _clamp(((idx.get("dsex_change_pct") or 0) + 2) / 4, 0, 1) * 30
    score = int(round(breadth + vol + index))
    if score < 40:
        word = "Worried"
    elif score <= 60:
        word = "Calm"
    else:
        word = "Confident"
    return score, word


# ---------------------------------------------------------------------------
# "আজকের বাজার এক নজরে" — a plain-Bangla paragraph built from the same
# signals as the mood. Template-rendered like the per-stock summaries
# (summaries_service): free, deterministic, no AI. Educational tone only.
# ---------------------------------------------------------------------------

# Plain English sector names (from _PLAIN_SECTOR) → everyday Bangla.
_SECTOR_BN = {
    "Banks": "ব্যাংক",
    "Finance companies": "আর্থিক প্রতিষ্ঠান",
    "Funds": "ফান্ড",
    "Medicine": "ওষুধ",
    "Power & gas": "বিদ্যুৎ ও গ্যাস",
    "Engineering": "প্রকৌশল",
    "Food": "খাদ্য",
    "Clothing": "পোশাক",
    "Tech": "তথ্যপ্রযুক্তি",
    "Phone & internet": "টেলিযোগাযোগ",
    "Cement": "সিমেন্ট",
    "Insurance": "বীমা",
    "Leather": "চামড়া",
    "Ceramics": "সিরামিক",
    "Jute": "পাট",
    "Paper": "কাগজ",
    "Services & property": "সেবা ও আবাসন",
    "Travel": "ভ্রমণ",
    "Bonds": "বন্ড",
    "Other": "বিবিধ",
}


def _build_summary_bn(up, down, advancing_pct, price_pos_pct, cheap_pct,
                      sectors, quality) -> Optional[str]:
    """3–5 short sentences in everyday Bangla. Each sentence is guarded by its
    own inputs, so missing data just drops a sentence instead of breaking."""
    parts: list[str] = []

    # 1) Today's breadth (same 45/55 bands as the Q&A rows)
    if (up or down) and advancing_pct is not None:
        if advancing_pct > 55:
            parts.append(f"আজ বাজার বেশ চাঙা ছিল — {up}টি শেয়ারের দাম বেড়েছে, আর কমেছে {down}টির।")
        elif advancing_pct < 45:
            parts.append(f"আজ বাজার কিছুটা পড়তির দিকে ছিল — {down}টি শেয়ারের দাম কমেছে, আর বেড়েছে {up}টির।")
        else:
            parts.append(f"আজ বাজার মিশ্র ছিল — {up}টি শেয়ারের দাম বেড়েছে, আর {down}টির কমেছে।")

    # 2) Where prices sit in this year's range
    if price_pos_pct is not None:
        if price_pos_pct < 25:
            parts.append("দাম এখন এই বছরের প্রায় সবচেয়ে নিচের দিকে।")
        elif price_pos_pct > 75:
            parts.append("দাম এখন এই বছরের প্রায় সবচেয়ে উপরের দিকে।")
        else:
            parts.append("দাম এখন এই বছরের মাঝামাঝি পর্যায়ে আছে।")

    # 3) Cheap or expensive (same 35/55 bands as the mood)
    if cheap_pct is not None:
        tenths = round(cheap_pct / 10)
        if cheap_pct >= 55:
            parts.append(f"ভালো খবর হলো, প্রতি 10টি শেয়ারের মধ্যে প্রায় {tenths}টির দাম এখন স্বাভাবিকের চেয়ে কম।")
        elif cheap_pct <= 35:
            parts.append("তবে বেশিরভাগ শেয়ারের দাম এখন স্বাভাবিকের চেয়ে বেশি, তাই একটু দেখেশুনে এগোনো ভালো।")
        else:
            parts.append("শেয়ারের দাম মোটামুটি স্বাভাবিক পর্যায়ে আছে।")

    # 4) Best-performing sector this week (list is already sorted best-first)
    if sectors:
        top = sectors[0]
        if top.get("ret_1w") is not None:
            if top["ret_1w"] > 0.5:
                name_bn = _SECTOR_BN.get(top["name"], top["name"])
                parts.append(f"এই সপ্তাহে সবচেয়ে ভালো করছে {name_bn} খাত।")
            elif top["ret_1w"] < -0.5:
                parts.append("এই সপ্তাহে প্রায় সব খাতই চাপে আছে।")

    # 5) How many companies look healthy
    if quality.get("total"):
        healthy = (quality.get("strong") or 0) + (quality.get("good") or 0)
        parts.append(f"আমাদের বিশ্লেষণে {quality['total']}টি কোম্পানির মধ্যে {healthy}টিকে এখন ভালো অবস্থায় দেখা যাচ্ছে।")

    return " ".join(parts[:5]) if parts else None


# ---------------------------------------------------------------------------
# The headline mood — deterministic, built from four plain signals
# ---------------------------------------------------------------------------

def _build_mood(advancing_pct, price_pos_pct, cheap_pct, week_change_pct, feeling_word):
    # Bands
    if advancing_pct is None:
        breadth_band = "mixed"
    elif advancing_pct < 40:
        breadth_band = "down"
    elif advancing_pct > 60:
        breadth_band = "up"
    else:
        breadth_band = "mixed"

    if price_pos_pct is None:
        price_band = "middle"
    elif price_pos_pct < 25:
        price_band = "low"
    elif price_pos_pct > 75:
        price_band = "high"
    else:
        price_band = "middle"

    if cheap_pct is None:
        value_band = "normal"
    elif cheap_pct >= 55:
        value_band = "cheap"
    elif cheap_pct <= 35:
        value_band = "expensive"
    else:
        value_band = "normal"

    if week_change_pct is None:
        trend_band = "flat"
    elif week_change_pct < -1:
        trend_band = "down"
    elif week_change_pct > 1:
        trend_band = "up"
    else:
        trend_band = "flat"

    # Mood label + colour tone
    if breadth_band == "up" and trend_band != "down":
        label, tone = "Going up", "up"
    elif breadth_band == "down" and trend_band == "down":
        label, tone = "Going down", "down"
    elif breadth_band in ("down", "mixed") and price_band == "low":
        label, tone = "Quiet and weak", "weak"
    else:
        label, tone = "Steady", "steady"

    # Sentence 1 — what's happening
    breadth_phrase = {
        "down": "More shares fell than rose today",
        "up": "More shares rose than fell today",
        "mixed": "Shares were mixed today",
    }[breadth_band]
    price_phrase = {
        "low": "and prices are near their lowest for the year",
        "high": "and prices are near their highest for the year",
        "middle": "and prices are around the middle of this year's range",
    }[price_band]
    sentence = f"{breadth_phrase}, {price_phrase}."

    # Sentence 2 — the takeaway in plain words
    if value_band == "cheap":
        sentence2 = ("But here's the good part: most shares are cheaper than usual. "
                     "This can be a time to slowly pick strong companies — not to chase "
                     "shares that are jumping fast.")
    elif value_band == "expensive":
        sentence2 = ("Many shares look expensive right now, so it pays to be careful and "
                     "stick to strong companies at fair prices.")
    else:
        sentence2 = ("Prices look about normal. Focus on strong companies and avoid "
                     "chasing quick jumps.")

    # Which opportunity list to highlight
    if tone == "up":
        best_lens = "rising"
    elif value_band == "cheap" or tone in ("weak", "down"):
        best_lens = "on_sale"
    else:
        best_lens = "income"

    return {
        "label": label,
        "tone": tone,
        "sentence": sentence,
        "sentence2": sentence2,
        "best_lens": best_lens,
        "bands": {
            "breadth": breadth_band,
            "price": price_band,
            "value": value_band,
            "trend": trend_band,
            "feeling": feeling_word,
        },
    }


# ---------------------------------------------------------------------------
# Daily snapshot series (read side)
# ---------------------------------------------------------------------------

def _load_snapshots(db, limit: int = _SNAPSHOT_ROWS) -> list[dict]:
    """Stored daily snapshots, newest first, dates normalised to strings."""
    docs = list(db[_SNAPSHOT_COLLECTION].find({}, {"_id": 0}).sort("date", -1).limit(limit))
    out: list[dict] = []
    for d in docs:
        ds = _date_str(d.get("date"))
        if not ds:
            continue
        d["date"] = ds
        out.append(d)
    return out


def _snapshot_healthy(s: dict) -> Optional[int]:
    strong, good = s.get("strong"), s.get("good")
    if strong is None and good is None:
        return None
    return int(strong or 0) + int(good or 0)


def _snapshot_healthy_pct(s: dict) -> Optional[float]:
    stored = _num(s.get("healthy_pct"))
    if stored is not None:
        return stored
    total = _num(s.get("total_scored"))
    healthy = _snapshot_healthy(s)
    if not total or healthy is None:
        return None
    return round(healthy / total * 100, 1)


def _daily_series(snaps_desc: list[dict]) -> list[dict]:
    """Oldest-first series for the tabbed chart."""
    out: list[dict] = []
    for s in reversed(snaps_desc):
        out.append({
            "date": s["date"],
            "cheap_pct": _num(s.get("cheap_pct")),
            "healthy_pct": _snapshot_healthy_pct(s),
            "median_score": _num(s.get("median_score")),
            "advancing_pct": _num(s.get("advancing_pct")),
            "dsex": _num(s.get("dsex")),
        })
    return out


def _since_yesterday(
    snaps_desc: list[dict],
    today: Optional[str],
    *,
    healthy_now: int,
    total_now: int,
    median_now: Optional[float],
    cheap_now: Optional[float],
    advancing_now: Optional[float],
    sector_status_now: dict,
    on_sale_codes: list[str],
    near_high_codes: list[str],
    near_low_codes: list[str],
    unusual_codes: list[str],
    names: dict,
) -> dict:
    """What changed against the previous trading day's stored snapshot.

    Sector flips and "new to the list" chips need the previous snapshot to
    carry `sector_status` / `*_codes` (stored from 2026-09-12 on); before then
    only the numeric deltas show. Every field is None / empty when it can't be
    computed, so the strip simply renders fewer lines."""
    prior = [s for s in snaps_desc if today is None or s["date"] < today]
    prev = prior[0] if prior else None

    out: dict = {
        "prev_date": prev["date"] if prev else None,
        "healthy_now": healthy_now,
        "healthy_delta": None,
        "median_score_delta": None,
        "cheap_delta": None,
        "breadth_rank": None,
        "sectors_up": [],
        "sectors_down": [],
        "new_on_sale": [],
        "new_near_high": [],
        "new_near_low": [],
        "new_unusual": [],
    }
    if not prev:
        return out

    prev_healthy = _snapshot_healthy(prev)
    prev_total = _num(prev.get("total_scored"))
    # Only compare counts when the scored universe is roughly the same size —
    # a big scrape gap would otherwise read as "40 companies got weaker".
    if prev_healthy is not None and prev_total and total_now and abs(prev_total - total_now) <= 0.05 * total_now:
        out["healthy_delta"] = healthy_now - prev_healthy
    prev_median = _num(prev.get("median_score"))
    if prev_median is not None and median_now is not None:
        out["median_score_delta"] = round(median_now - prev_median, 1)
    prev_cheap = _num(prev.get("cheap_pct"))
    if prev_cheap is not None and cheap_now is not None:
        out["cheap_delta"] = round(cheap_now - prev_cheap, 1)

    if advancing_now is not None:
        window = [_num(s.get("advancing_pct")) for s in prior[:_BREADTH_LOOKBACK]]
        window = [w for w in window if w is not None]
        if len(window) >= 3:
            out["breadth_rank"] = {
                "better_than": sum(1 for w in window if advancing_now > w),
                "of": len(window),
            }

    prev_sectors = prev.get("sector_status") or {}
    if prev_sectors:
        for name, status in sector_status_now.items():
            before = prev_sectors.get(name)
            if before is None or before == status:
                continue
            if status == "Doing well":
                out["sectors_up"].append(name)
            elif status == "Struggling":
                out["sectors_down"].append(name)

    def _new(field: str, now_codes: list[str]) -> list[dict]:
        before = prev.get(field)
        if not isinstance(before, list):
            return []
        prev_set = set(before)
        fresh = [c for c in now_codes if c not in prev_set]
        return [{"trading_code": c, "company_name": names.get(c)} for c in fresh[:_NEW_NAMES_CAP]]

    out["new_on_sale"] = _new("on_sale_codes", on_sale_codes)
    out["new_near_high"] = _new("near_high_codes", near_high_codes)
    out["new_near_low"] = _new("near_low_codes", near_low_codes)
    out["new_unusual"] = _new("unusual_codes", unusual_codes)
    return out


def _quality_trend(snaps_desc: list[dict], today: Optional[str], healthy_now: int,
                   total_now: int, median_now: Optional[float]) -> dict:
    """One-trading-week change in the healthy count and median score, so the
    quality card's takeaway moves with the data instead of repeating itself."""
    prior = [s for s in snaps_desc if today is None or s["date"] < today]
    out = {"healthy_delta_1w": None, "median_score_delta_1w": None, "since": None}
    if len(prior) < 5:
        return out
    older = prior[4]  # the 5th most recent prior trading day ≈ one week ago
    out["since"] = older["date"]
    prev_healthy = _snapshot_healthy(older)
    prev_total = _num(older.get("total_scored"))
    if prev_healthy is not None and prev_total and total_now and abs(prev_total - total_now) <= 0.05 * total_now:
        out["healthy_delta_1w"] = healthy_now - prev_healthy
    prev_median = _num(older.get("median_score"))
    if prev_median is not None and median_now is not None:
        out["median_score_delta_1w"] = round(median_now - prev_median, 1)
    return out


# ---------------------------------------------------------------------------
# Main bundle
# ---------------------------------------------------------------------------

def _compute(df=None) -> tuple[dict, dict]:
    """Build the public bundle plus a private `extras` dict the daily snapshot
    writer needs (uncapped code lists, medians the page doesn't show)."""
    db = get_db()
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    idx = load_market_index()
    today = _date_str(idx.get("date"))

    if df is None:
        df = build_scores_df()
    recs = [] if df is None or df.empty else df.to_dict("records")

    # --- Today: more up or down? ---
    up = idx.get("up_count") or 0
    down = idx.get("down_count") or 0
    neutral = idx.get("neutral_count") or 0
    traded = up + down + neutral
    advancing_pct = round(up / traded * 100, 1) if traded else None

    # --- Prices high or low this year? (DSEX position in its 1-year range) ---
    hist = _index_history(db)
    price_pos_pct = None
    week_change_pct = None
    year_high = year_low = None
    dsex_now = _num(idx.get("dsex"))
    if hist:
        dsex_vals = [h["dsex"] for h in hist if h["dsex"] is not None]
        if dsex_vals:
            cur = dsex_vals[0]
            year_high, year_low = max(dsex_vals), min(dsex_vals)
            if year_high > year_low:
                price_pos_pct = round((cur - year_low) / (year_high - year_low) * 100, 1)
            if len(dsex_vals) > 5 and dsex_vals[5]:
                week_change_pct = round((cur - dsex_vals[5]) / dsex_vals[5] * 100, 2)
            if dsex_now is None:
                dsex_now = cur

    # --- Cheap or expensive? (cross-section, available right now) ---
    pe_vals: list[float] = []
    pb_vals: list[float] = []
    dy_vals: list[float] = []
    cheap_n = cheap_total = 0
    for r in recs:
        pe = _num(r.get("current_pe"))
        own = _num(r.get("own_avg_pe"))
        pb = _num(r.get("current_pb"))
        dy = _num(r.get("div_yield_pct"))
        if pe is not None and 0 < pe < 150:
            pe_vals.append(pe)
        if pb is not None and 0 < pb < 50:
            pb_vals.append(pb)
        if dy is not None and 0 <= dy < 30:
            dy_vals.append(dy)
        if pe is not None and own is not None and pe > 0 and own > 0:
            cheap_total += 1
            if pe < own:
                cheap_n += 1
    median_pe = round(_median(pe_vals), 1) if pe_vals else None
    cheap_pct = round(cheap_n / cheap_total * 100, 1) if cheap_total else None

    # --- Busy or quiet? (today's turnover vs ~30-day average) ---
    turnover_today = _num(idx.get("total_value_mn"))
    turnover_avg = None
    turnover_ratio = None
    turnover_band = None
    if hist:
        recent_turn = [h["total_value_mn"] for h in hist[:30] if h["total_value_mn"]]
        if turnover_today and recent_turn:
            turnover_avg = round(sum(recent_turn) / len(recent_turn), 1)
            if turnover_avg > 0:
                turnover_ratio = round(turnover_today / turnover_avg, 2)
                turnover_band = ("busy" if turnover_ratio >= 1.15
                                 else ("quiet" if turnover_ratio <= 0.85 else "normal"))

    feeling_score, feeling_word = _feeling(idx)
    mood = _build_mood(advancing_pct, price_pos_pct, cheap_pct, week_change_pct, feeling_word)

    # --- Plain Q&A rows (the hero's four answer tiles) ---
    def _price_answer():
        if price_pos_pct is None:
            return "—", "neutral"
        if price_pos_pct < 25:
            return "Low — near the bottom", "neg"
        if price_pos_pct > 75:
            return "High — near the top", "pos"
        return "Around the middle", "neutral"

    def _cheap_answer():
        if cheap_pct is None:
            return "—", "neutral", None
        tenths = round(cheap_pct / 10)
        extra = f"{tenths} in 10 cost less than usual" if tenths else None
        if cheap_pct >= 55:
            return "Cheap", "pos", extra
        if cheap_pct <= 35:
            return "Expensive", "neg", extra
        return "About normal", "neutral", extra

    price_a, price_tone = _price_answer()
    cheap_a, cheap_tone, cheap_extra = _cheap_answer()
    busy_a = {"busy": "Busy — more than usual", "quiet": "Quiet — less than usual",
              "normal": "About normal"}.get(turnover_band, "—")

    questions = [
        {"key": "price", "q": "Are prices high or low this year?", "a": price_a, "tone": price_tone},
        {"key": "breadth", "q": "Did more stocks go up or down today?",
         "a": ("Down" if (advancing_pct or 0) < 45 else ("Up" if (advancing_pct or 0) > 55 else "Mixed")),
         "extra": f"{up} up / {down} down", "tone": ("neg" if (advancing_pct or 0) < 45 else ("pos" if (advancing_pct or 0) > 55 else "neutral"))},
        {"key": "value", "q": "Are shares cheap or expensive?", "a": cheap_a, "extra": cheap_extra, "tone": cheap_tone},
        {"key": "activity", "q": "Is buying and selling busy or quiet?", "a": busy_a,
         "tone": ("pos" if turnover_band == "busy" else ("neg" if turnover_band == "quiet" else "neutral"))},
    ]

    # --- Which businesses are doing well? (sector returns) ---
    code_to_sector = {c: (companies.get(c) or {}).get("sector") for c in companies}
    ret_1w, ret_1m = _window_returns(db, set(companies.keys()))
    sectors = _sector_rows(companies, ret_1w, ret_1m)
    sector_status_now = {s["name"]: s["status"] for s in sectors}

    # --- How many companies are strong vs risky? ---
    quality = {"total": 0, "strong": 0, "good": 0, "soso": 0, "risky": 0}
    scores_clean: list[float] = []
    for r in recs:
        sc = _num(r.get("score"))
        if sc is None:
            continue
        quality["total"] += 1
        scores_clean.append(sc)
        t = _tier_label(sc)
        if t:
            quality[t] += 1
    median_score_raw = round(_median(scores_clean), 1) if scores_clean else None
    quality["median_score"] = int(round(median_score_raw)) if median_score_raw is not None else None
    healthy_now = quality["strong"] + quality["good"]

    # --- Turning points + dividends ---
    near_high, near_low = _near_extremes(db, companies, prices)
    near_low_codes = {x["trading_code"] for x in near_low}
    dividends = _upcoming_dividends()
    unusual = _unusual_buying(db, companies, prices)

    # --- Opportunity lists ---
    def _name(code):
        return (companies.get(code) or {}).get("company_name")

    def _last_price(code):
        lp = _num((prices.get(code) or {}).get("ltp"))
        return round(lp, 2) if lp is not None else None

    on_sale = []
    income = []
    fallen = []
    for r in recs:
        code = r.get("trading_code")
        sc = _num(r.get("score"))
        pe = _num(r.get("current_pe"))
        own = _num(r.get("own_avg_pe"))
        sect_pe = _num(r.get("sector_median_pe"))
        dy = _num(r.get("div_yield_pct"))
        sec = _plain_sector(r.get("sector"))
        if sc is not None and sc >= 60 and pe is not None and 0 < pe < 150 and (
            (own is not None and pe < own) or (sect_pe is not None and pe < sect_pe)
        ):
            on_sale.append({"trading_code": code, "company_name": _name(code), "last_price": _last_price(code),
                            "sector": sec, "score": round(sc), "pe": round(pe, 1)})
        if dy is not None and 0 < dy < 30 and (sc is None or sc >= 45):
            income.append({"trading_code": code, "company_name": _name(code), "last_price": _last_price(code),
                           "sector": sec, "div_yield_pct": round(dy, 1)})
        if code in near_low_codes and sc is not None and sc >= 45:
            fallen.append({"trading_code": code, "company_name": _name(code), "last_price": _last_price(code),
                           "sector": sec, "score": round(sc), "ret_1m": ret_1m.get(code)})

    on_sale.sort(key=lambda x: x["score"], reverse=True)
    income.sort(key=lambda x: x["div_yield_pct"], reverse=True)
    fallen.sort(key=lambda x: x["score"], reverse=True)

    # Rising fast = best 1-week movers with real trading activity
    rising = []
    for code, r in sorted(ret_1w.items(), key=lambda kv: kv[1], reverse=True):
        if r <= 0:
            continue
        p = prices.get(code) or {}
        if (_num(p.get("value_mn")) or 0) < 1:  # skip near-untraded names
            continue
        rising.append({"trading_code": code, "company_name": _name(code), "last_price": _last_price(code),
                       "sector": _plain_sector(code_to_sector.get(code)), "ret_1w": r})
        if len(rising) >= 8:
            break

    # --- History: DSEX this year + the daily snapshot series ---
    snaps_desc = _load_snapshots(db)
    history = {
        "index": [
            {"date": h["date"], "dsex": h["dsex"], "turnover_mn": h["total_value_mn"]}
            for h in reversed(hist) if h["dsex"] is not None
        ],
        "daily": _daily_series(snaps_desc),
    }

    on_sale_codes = [x["trading_code"] for x in on_sale]
    near_high_codes = [x["trading_code"] for x in near_high]
    near_low_codes_list = [x["trading_code"] for x in near_low]
    unusual_codes = [x["trading_code"] for x in unusual]

    since = _since_yesterday(
        snaps_desc, today,
        healthy_now=healthy_now, total_now=quality["total"], median_now=median_score_raw,
        cheap_now=cheap_pct, advancing_now=advancing_pct,
        sector_status_now=sector_status_now,
        on_sale_codes=on_sale_codes, near_high_codes=near_high_codes,
        near_low_codes=near_low_codes_list, unusual_codes=unusual_codes,
        names={c: (companies.get(c) or {}).get("company_name") for c in companies},
    )
    quality["trend"] = _quality_trend(snaps_desc, today, healthy_now, quality["total"], median_score_raw)

    summary_bn = _build_summary_bn(
        up, down, advancing_pct, price_pos_pct, cheap_pct, sectors, quality
    )

    bundle = {
        "date": idx.get("date"),
        "summary_bn": summary_bn,
        "mood": mood,
        "now": {
            "questions": questions,
            "sectors": sectors,
            "quality": quality,
        },
        "since_yesterday": since,
        "history": history,
        "next": {
            "unusual": unusual,
            "near_high": near_high[:6],
            "near_low": near_low[:6],
            "dividends": dividends,
        },
        "chances": {
            "best": mood["best_lens"],
            "on_sale": on_sale[:6],
            "income": income[:6],
            "rising": rising[:6],
            "fallen": fallen[:6],
        },
        "stats": {
            # breadth
            "advancing_pct": advancing_pct,
            "up": up, "down": down, "neutral": neutral,
            # where the index sits this year
            "price_pos_pct": price_pos_pct,
            "dsex": dsex_now,
            "dsex_change_pct": _num(idx.get("dsex_change_pct")),
            "year_high": year_high,
            "year_low": year_low,
            "week_change_pct": week_change_pct,
            # cheap or expensive
            "cheap_pct": cheap_pct,
            "cheap_n": cheap_n,
            "cheap_total": cheap_total,
            "median_pe": median_pe,
            # busy or quiet
            "turnover_mn": turnover_today,
            "turnover_avg_mn": turnover_avg,
            "turnover_ratio": turnover_ratio,
            "turnover_band": turnover_band,
            # how people feel
            "feeling_score": feeling_score,
            "feeling_word": feeling_word,
        },
    }

    extras = {
        "n_recs": len(recs),
        "median_pb": round(_median(pb_vals), 2) if pb_vals else None,
        "median_div_yield": round(_median(dy_vals), 2) if dy_vals else None,
        "median_score": median_score_raw,
        "sector_status": sector_status_now,
        "on_sale_codes": on_sale_codes,
        "near_high_codes": near_high_codes,
        "near_low_codes": near_low_codes_list,
        "unusual_codes": unusual_codes,
    }
    return bundle, extras


@_ttl_cache(300)
def compute_market_state() -> dict:
    return _compute()[0]


# ---------------------------------------------------------------------------
# Daily snapshot — one row per trading day (no backfill; fills forward)
# ---------------------------------------------------------------------------

def compute_and_store_market_snapshot(df=None) -> Optional[dict]:
    """Persist one daily row so the history chart, the quality trend and the
    "since yesterday" strip can grow over time.

    Called right after the scores snapshot in the daily job. Best-effort: a
    failure here must never break the scores pipeline. Accepts the freshly
    computed scores DataFrame to avoid a second heavy build.

    Since 2026-09-12 the row also carries the day's sector statuses and the
    full code lists for on-sale / near-high / near-low / unusual buying, which
    is what lets tomorrow's page say what flipped and who is new."""
    bundle, extras = _compute(df)
    if not extras.get("n_recs"):
        return None
    date_str = _date_str(bundle.get("date"))
    if not date_str:
        return None

    q = bundle["now"]["quality"]
    st = bundle["stats"]
    total = q["total"]
    healthy = q["strong"] + q["good"]

    doc = {
        "date": date_str,
        "median_pe": st.get("median_pe"),
        "median_pb": extras.get("median_pb"),
        "median_div_yield": extras.get("median_div_yield"),
        "cheap_pct": st.get("cheap_pct"),
        "advancing_pct": st.get("advancing_pct"),
        "median_score": extras.get("median_score"),
        "dsex": st.get("dsex"),
        "strong": q["strong"], "good": q["good"],
        "soso": q["soso"], "risky": q["risky"],
        "total_scored": total,
        "healthy_pct": round(healthy / total * 100, 1) if total else None,
        "sector_status": extras.get("sector_status") or {},
        "on_sale_codes": extras.get("on_sale_codes") or [],
        "near_high_codes": extras.get("near_high_codes") or [],
        "near_low_codes": extras.get("near_low_codes") or [],
        "unusual_codes": extras.get("unusual_codes") or [],
        "computed_at": datetime.now(timezone.utc),
    }

    db = get_db()
    col = db[_SNAPSHOT_COLLECTION]
    existing = {ix["name"] for ix in col.list_indexes()}
    if "date_1" not in existing:
        col.create_index([("date", ASCENDING)], unique=True, name="date_1")
    col.update_one({"date": date_str}, {"$set": doc}, upsert=True)
    return doc
