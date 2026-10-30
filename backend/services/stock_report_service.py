"""
Gathers the inputs for ``stock_report.build_report`` and caches the result.

``build_report(code, **already_loaded)`` — the company-detail router passes in
what it has just loaded (company, score row, financials, prices, news …) so the
report adds only what is new: one ``company_news`` read for the notices, the
dividend ledger and calendar row, the sector frame (cached) and the latest
accounts of the sector (cached). Never raises: a failure logs and returns None,
and the page falls back to its existing parts.

``store_snapshots()`` writes one ``stock_report_snapshots`` row per scored
company per trading day (scorecard words, flag counts + keys, fair middle,
buy-below) from the daily job. ``red_flag_changes(codes)`` is what the watcher
reads: a red check in a company's newest snapshot that was not red in the one
before it.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from backend.services import stock_report as sr

logger = logging.getLogger(__name__)

_CACHE_TTL = 300
_CACHE_MAX = 400
_cache: dict[tuple, tuple[float, Optional[dict]]] = {}
_lock = threading.Lock()

_DHAKA = timezone(timedelta(hours=6))
SNAPSHOT_COLLECTION = "stock_report_snapshots"
SNAPSHOT_WORKERS = 4


def _today():
    return datetime.now(_DHAKA).date()


def _clean(d: Optional[dict]) -> dict:
    out = {}
    for k, v in (d or {}).items():
        if isinstance(v, float) and v != v:
            v = None
        out[k] = v
    return out


def clear_cache() -> None:
    with _lock:
        _cache.clear()
    _ext_cache.update(at=0.0, data=None)


# ---------------------------------------------------------------- shared loaders

_ext_cache: dict[str, Any] = {"at": 0.0, "data": None}


def _sector_ext() -> dict[str, dict]:
    """{code: latest extended-financials row (revenue, net_profit)} for every
    company — one small read, cached 900s (the accounts change once a year)."""
    now = time.time()
    if _ext_cache["data"] is not None and now - _ext_cache["at"] < 900:
        return _ext_cache["data"]
    from backend.services.db_service import get_db

    latest: dict[str, dict] = {}
    for d in get_db().company_financials_ext.find(
        {}, {"_id": 0, "trading_code": 1, "year": 1, "revenue": 1, "net_profit": 1}
    ):
        c = d.get("trading_code")
        try:
            y = int(d.get("year"))
        except (TypeError, ValueError):
            continue
        if d.get("revenue") is None:
            continue
        if c not in latest or y > latest[c]["year"]:
            latest[c] = {"year": y, "revenue": d.get("revenue"), "net_profit": d.get("net_profit")}
    _ext_cache.update(at=now, data=latest)
    return latest


def _notices(code: str, news: list[dict]) -> tuple[dict, bool]:
    """The parsed DSE notices for one company, and whether the parser ran.
    Without the notices module the quarters still come from interim_service."""
    try:
        from backend.services.notices import load_company_notices  # noqa: WPS433 — optional until it lands
        n = load_company_notices(code) or {}
        return n, True
    except Exception as e:  # noqa: BLE001
        logger.info("notices unavailable for %s (%s); quarterly posts only", code, e)
    out: dict = {"interims": []}
    try:
        from backend.services.interim_service import parse_interim_post

        for p in news or []:
            rec = parse_interim_post(p.get("title") or "", p.get("body") or "", p.get("post_date"))
            if rec:
                out["interims"].append(rec)
    except Exception:  # noqa: BLE001
        pass
    return out, False


def _calendar_row(code: str) -> Optional[dict]:
    try:
        from backend.services.corporate_actions_service import build_dividend_calendar

        cal = build_dividend_calendar()
        return next((r for r in cal.get("record_dates") or [] if r.get("trading_code") == code), None)
    except Exception:  # noqa: BLE001
        return None


def _sector_rows(sector: Optional[str]) -> list[dict]:
    if not sector:
        return []
    try:
        from backend.services.scoring_service import build_scores_df

        df = build_scores_df()
        if df is None or df.empty:
            return []
        cols = [c for c in ("trading_code", "score", "current_pe", "roe_pct", "eps_yoy_pct", "market_cat", "sector")
                if c in df.columns]
        return [_clean(r) for r in df[df["sector"] == sector][cols].to_dict("records")]
    except Exception:  # noqa: BLE001
        return []


def _names() -> dict[str, str]:
    try:
        from backend.services.db_service import load_companies

        return {c["trading_code"]: c.get("company_name") for c in load_companies()}
    except Exception:  # noqa: BLE001
        return {}


def gather(code: str, *, company: Optional[dict] = None, score_row: Optional[dict] = None,
           financials: Optional[list] = None, extended_financials: Optional[list] = None,
           holdings: Optional[list] = None, prices: Optional[list] = None,
           news: Optional[list] = None, flags: Optional[dict] = None, momentum: Optional[dict] = None,
           fair_value: Optional[dict] = None, score_history: Optional[dict] = None,
           latest: Optional[dict] = None) -> Optional[dict]:
    """Every input the pure builders need, loading whatever wasn't passed in."""
    from backend.services import db_service as db
    from backend.services.fair_value import estimate_fair_value
    from backend.services.stock_facts import governance_items
    from utils.sector import normalize_sector

    code = code.upper()
    company = company or db.get_company(code)
    if not company:
        return None
    if score_row is None:
        from backend.services.scoring_service import get_company_score_row
        score_row = get_company_score_row(code)
    score_row = _clean(score_row)
    financials = financials if financials is not None else db.load_financials(code)
    extended_financials = extended_financials if extended_financials is not None else db.load_extended_financials(code)
    holdings = holdings if holdings is not None else db.load_shareholdings(code)
    prices = prices if prices is not None else db.load_price_history(code)
    news = news if news is not None else db.load_company_news(code, limit=200)
    if latest is None:
        latest = db.load_latest_prices().get(code) or {}
    ltp = sr._f(latest.get("ltp"))
    sector = company.get("sector")
    sector_class = normalize_sector(sector or "")
    if momentum is None:
        try:
            from backend.services.top20_service import compute_momentum_for_code
            momentum = compute_momentum_for_code(code)
        except Exception:  # noqa: BLE001
            momentum = None
    if flags is None:
        try:
            flags = db.compute_signal_flags(score_row, holdings, financials, company, news)
        except Exception:  # noqa: BLE001
            flags = {}
    if score_history is None:
        try:
            from backend.services.score_history_service import company_history
            score_history = company_history(code)
        except Exception:  # noqa: BLE001
            score_history = None
    if fair_value is None:
        try:
            fair_value = estimate_fair_value(score_row, financials, company, ltp, sector_class)
        except Exception:  # noqa: BLE001
            fair_value = None
    fair_fall = None
    eps = sr._f(score_row.get("eps"))
    if eps and eps > 0:
        try:
            fair_fall = estimate_fair_value({**score_row, "eps": eps * (1 - sr.PROFIT_FALL)},
                                            financials, company, ltp, sector_class)
        except Exception:  # noqa: BLE001
            fair_fall = None
    try:
        from backend.services.corporate_actions_service import dividend_history_for
        ledger = dividend_history_for(code)
    except Exception:  # noqa: BLE001
        ledger = []
    try:
        from backend.services.summaries_service import _sector_bn
        sector_bn = _sector_bn(sector) or sector
    except Exception:  # noqa: BLE001
        sector_bn = sector
    try:
        from backend.services.signal_service import get_signal
        signal = get_signal(code)
    except Exception:  # noqa: BLE001
        signal = {}
    try:
        range52 = db.load_52w_ranges().get(code) or {}
    except Exception:  # noqa: BLE001
        range52 = {}
    notices, notices_ok = _notices(code, news)
    watch_items = [i for i in (flags or {}).get("items") or [] if i.get("tone") == "watch"]
    sector_rows = _sector_rows(sector)
    sector_codes = {r["trading_code"] for r in sector_rows}
    return {
        "code": code,
        "name": company.get("company_name"),
        "company": company,
        "sector": sector,
        "sector_bn": sector_bn,
        "sector_class": sector_class,
        "category": company.get("market_category"),
        "face_value": company.get("face_value"),
        "loan_mn": company.get("total_loan_mn"),
        "reserve_mn": company.get("reserve_surplus_mn"),
        "today": _today(),
        "as_of": latest.get("date"),
        "ltp": ltp,
        "score_row": score_row,
        "momentum": momentum or {},
        # The yearly high / low behind the signal's near-the-top line (Our view).
        "range52": {"hi": sr._f(range52.get("hi")), "lo": sr._f(range52.get("lo"))},
        "signal": signal,
        "financials": financials or [],
        "extended_financials": extended_financials or [],
        "holdings": holdings or [],
        "prices": prices or [],
        "news": news or [],
        "ledger": ledger or [],
        "calendar_row": _calendar_row(code),
        "fair_value": fair_value,
        "fair_value_fall": fair_fall,
        "notices": notices,
        "notices_ok": notices_ok,
        "governance": governance_items(news or []),
        "watch_items": watch_items,
        "score_history": score_history,
        "sector_rows": sector_rows,
        "sector_ext": {c: e for c, e in _sector_ext().items() if c in sector_codes},
        "company_names": _names(),
    }


def build_report(code: str, *, use_cache: bool = True, **loaded) -> Optional[dict]:
    """The report for one company, cached 300s per (code, price day)."""
    code = (code or "").upper()
    latest = loaded.get("latest") or {}
    key = (code, str(latest.get("date") or ""))
    now = time.time()
    if use_cache:
        with _lock:
            hit = _cache.get(key)
            if hit and now - hit[0] < _CACHE_TTL:
                return hit[1]
    try:
        inp = gather(code, **loaded)
        rep = sr.build_report(inp) if inp else None
    except Exception:  # noqa: BLE001 — the report refines the page, never blocks it
        logger.exception("stock report failed for %s", code)
        rep = None
    if not use_cache:
        return rep
    with _lock:
        if len(_cache) >= _CACHE_MAX:
            for k in sorted(_cache, key=lambda k: _cache[k][0])[: _CACHE_MAX // 4]:
                _cache.pop(k, None)
        _cache[key] = (now, rep)
    return rep


# ---------------------------------------------------------------- snapshots

def ensure_snapshot_indexes() -> None:
    from backend.services.db_service import get_db

    col = get_db()[SNAPSHOT_COLLECTION]
    col.create_index([("trading_code", 1), ("date", 1)], unique=True, name="code_date")
    col.create_index([("date", -1)], name="date_desc")


def store_snapshots(codes: Optional[list[str]] = None) -> dict:
    """One row per scored company for today's price day. Idempotent (upsert on
    code + date). Builds the full report per company from the shared caches."""
    from pymongo import UpdateOne

    from backend.services.db_service import get_db, load_latest_prices
    from backend.services.scoring_service import build_scores_df

    t0 = time.time()
    ensure_snapshot_indexes()
    prices = load_latest_prices()
    if codes is None:
        df = build_scores_df()
        codes = [] if df is None or df.empty else [c for c in df[df["score"].notna()]["trading_code"].tolist()]
    days = [str(p.get("date"))[:10] for p in prices.values() if p.get("date")]
    day = max(days) if days else _today().isoformat()
    db = get_db()

    def one(code: str) -> Optional[dict]:
        news = list(db.company_news.find({"trading_code": code}, {"_id": 0, "title": 1, "body": 1, "post_date": 1})
                    .sort("post_date", -1).limit(200))
        return build_report(code, use_cache=False, latest=prices.get(code) or {}, news=news)

    # Each report is a handful of small reads; four at a time keeps the run to
    # a couple of minutes without crowding the connection pool.
    from concurrent.futures import ThreadPoolExecutor

    ops, failed = [], 0
    with ThreadPoolExecutor(max_workers=SNAPSHOT_WORKERS) as pool:
        for code, rep in zip(codes, pool.map(one, codes)):
            if not rep:
                failed += 1
                continue
            doc = {"trading_code": code, "date": day, **sr.snapshot_fields(rep),
                   "computed_at": datetime.now(timezone.utc)}
            ops.append(UpdateOne({"trading_code": code, "date": day}, {"$set": doc}, upsert=True))
    if ops:
        db[SNAPSHOT_COLLECTION].bulk_write(ops, ordered=False)
    return {"date": day, "stored": len(ops), "failed": failed, "seconds": round(time.time() - t0, 1)}


# ---------------------------------------------------------------- watcher

def red_flag_changes(codes) -> dict[str, dict]:
    """{code: {"day": snapshot date, "items": [{key, en, bn}]}} — red checks in
    each company's newest snapshot that were not red in the one before. A
    company with only one snapshot is a baseline, not news. Event ids carry the
    snapshot date, so a re-run of the watcher is a no-op."""
    from backend.services.db_service import get_db

    codes = sorted({c.upper() for c in codes or [] if c})
    if not codes:
        return {}
    by_code: dict[str, list[dict]] = {}
    since = (_today() - timedelta(days=21)).isoformat()
    for d in get_db()[SNAPSHOT_COLLECTION].find(
        {"trading_code": {"$in": codes}, "date": {"$gte": since}},
        {"_id": 0, "trading_code": 1, "date": 1, "red_keys": 1, "red_lines": 1},
    ).sort("date", -1):
        rows = by_code.setdefault(d["trading_code"], [])
        if len(rows) < 2:
            rows.append(d)
    prev = {c: (rows[1].get("red_keys") or []) for c, rows in by_code.items() if len(rows) == 2}
    cur = {c: {"keys": rows[0].get("red_keys") or [], "lines": rows[0].get("red_lines") or {}}
           for c, rows in by_code.items() if len(rows) == 2}
    fresh = new_red_flags(prev, cur)
    return {c: {"day": by_code[c][0]["date"], "items": items} for c, items in fresh.items()}


def answer_changes(codes) -> dict[str, dict]:
    """{code: {"day", "from": word, "to": word, "line", "decision"}} — the
    answer card's answer changed and held for two snapshot days in a row
    (`settled_answer_change`). The price light moves with the price, so a
    one-day flip back and forth is not news."""
    from backend.services.db_service import get_db

    codes = sorted({c.upper() for c in codes or [] if c})
    if not codes:
        return {}
    by_code: dict[str, list[dict]] = {}
    since = (_today() - timedelta(days=21)).isoformat()
    for d in get_db()[SNAPSHOT_COLLECTION].find(
        {"trading_code": {"$in": codes}, "date": {"$gte": since}, "decision": {"$exists": True}},
        {"_id": 0, "trading_code": 1, "date": 1, "decision": 1, "answer_word": 1, "answer_line": 1},
    ).sort("date", -1):
        rows = by_code.setdefault(d["trading_code"], [])
        if len(rows) < 3:
            rows.append(d)
    out = {}
    for code, rows in by_code.items():
        ch = settled_answer_change(rows)
        if ch:
            out[code] = ch
    return out


def settled_answer_change(rows: list[dict]) -> Optional[dict]:
    """Pure: `rows` newest first (up to three snapshot days). A change counts
    when the newest two agree and the one before them differs."""
    if len(rows) < 3:
        return None
    a, b, c = rows[0], rows[1], rows[2]
    if not a.get("decision") or a.get("decision") != b.get("decision") or b.get("decision") == c.get("decision"):
        return None
    if not c.get("decision"):
        return None
    return {"day": a["date"], "decision": a["decision"], "from": c.get("answer_word"),
            "to": a.get("answer_word"), "line": a.get("answer_line")}


def new_red_flags(prev: dict[str, list[str]], cur: dict[str, dict]) -> dict[str, list[dict]]:
    """Pure diff: red keys in `cur` that were not in `prev` (codes `prev` never
    saw are a baseline, not news)."""
    out = {}
    for code, v in cur.items():
        if code not in prev:
            continue
        before = set(prev.get(code) or [])
        fresh = [k for k in v.get("keys") or [] if k not in before]
        if fresh:
            out[code] = [{"key": k, **(v.get("lines") or {}).get(k, {"en": "", "bn": ""})} for k in fresh]
    return out
