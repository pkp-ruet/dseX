"""Loads the data behind the Premium research reports (services/research_reports.py).

Each report is cached 900s. The full payload goes to every reader: the Premium
lock on the page is screen-only, like every other lock in the app.
"""
from __future__ import annotations

import logging
import threading
import time
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from backend.services import research_reports as rr
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

WEEK_DAYS = 6           # snapshot days read for "this week" (the newest + 5 before it)
AUDIT_LOOKBACK = 400    # days, the auditor-opinion scraper's own window


def _today() -> date:
    from utils.market_hours import bst_today_iso
    return date.fromisoformat(bst_today_iso())


@_ttl_cache(900, max_entries=2)
def _score_rows() -> dict[str, dict]:
    """{code: score row} (NaN → None)."""
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty:
        return {}
    return {str(r.get("trading_code") or "").upper():
            {k: (None if isinstance(v, float) and v != v else v) for k, v in r.items()}
            for r in df.to_dict("records")}


@_ttl_cache(900, max_entries=2)
def _info() -> dict[str, dict]:
    """{code: {name, sector, tier, price, mcap_mn, sector_class}} for every company."""
    from backend.services.db_service import load_companies, load_latest_prices
    from backend.services.tiers import tier_key
    from utils.sector import normalize_sector

    out: dict[str, dict] = {}
    prices = load_latest_prices() or {}
    for c in load_companies():
        code = c["trading_code"]
        out[code] = {"name": c.get("company_name") or code, "sector": c.get("sector"),
                     "tier": "unknown", "price": rr._n((prices.get(code) or {}).get("ltp")),
                     "sector_class": normalize_sector(c.get("sector") or "")}
    try:
        for code, r in _score_rows().items():
            if code in out:
                out[code]["tier"] = tier_key(rr._n(r.get("score")))
                out[code]["mcap_mn"] = rr._n(r.get("mcap_mn"))
                out[code]["graded"] = rr._n(r.get("score")) is not None
    except Exception:  # noqa: BLE001 — names and sectors still make the reports
        logger.exception("research reports: scores unavailable")
    return out


# ---------------------------------------------------------------- 1 · risks

@_ttl_cache(900, max_entries=2)
def risk_register() -> dict:
    from backend.services.stock_report_service import SNAPSHOT_COLLECTION

    col = get_db()[SNAPSHOT_COLLECTION]
    days = sorted(col.distinct("date"))[-WEEK_DAYS:]
    if not days:
        return rr.risk_register({}, [], {}, [])
    history: list[tuple[str, dict[str, set]]] = []
    now: dict[str, dict] = {}
    for d in days:
        keys: dict[str, set] = {}
        newest = d == days[-1]
        proj = {"_id": 0, "trading_code": 1, "red_keys": 1, **({"red_lines": 1} if newest else {})}
        for row in col.find({"date": d}, proj):
            keys[row["trading_code"]] = set(row.get("red_keys") or [])
            if newest:
                now[row["trading_code"]] = row
        history.append((d, keys))
    try:
        from backend.services.z_risk import z_risk_list
        z_items = z_risk_list().get("items") or []
    except Exception:  # noqa: BLE001
        z_items = []
    return rr.risk_register(now, history, _info(), z_items)


# ---------------------------------------------------------------- 2 · auditors

@_ttl_cache(900, max_entries=2)
def auditor_tracker() -> dict:
    from backend.services.audit_opinion import REASON_WORDS, SERIOUS

    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=AUDIT_LOOKBACK)
    opinions = list(get_db().auditor_opinions.find({"posted": {"$gte": since}}, {"_id": 0}))
    info = _info()
    sizes: dict[str, int] = {}
    for meta in info.values():
        s = meta.get("sector") or "Other"
        sizes[s] = sizes.get(s, 0) + 1
    return rr.auditor_tracker(opinions, info, sizes, _today(), REASON_WORDS, set(SERIOUS))


# ---------------------------------------------------------------- 3 · results season

@_ttl_cache(900, max_entries=2)
def season_records() -> list[dict]:
    """Every company's report for every period we hold: each quarterly post
    (the newest post per period) and each yearly notice (as
    ``results_explainer.full_year_result`` reads it), with the yearly
    notice's cash / stock dividend %."""
    from backend.services.interim_service import parse_interim_post
    from backend.services.notices import _ANNUAL_TITLE_RE, annual_record, newest_annual
    from backend.services.results_explainer import full_year_result

    db = get_db()
    best: dict[tuple[str, date, bool], dict] = {}

    def keep(code: str, rec: dict) -> None:
        pe = rec.get("period_end")
        if not code or not isinstance(pe, date):
            return
        k = (code, pe, bool(rec.get("full_year")))
        old = best.get(k)
        if old is None or (int(rec.get("months") or 0), str(rec.get("post_date") or "")) > \
                (int(old.get("months") or 0), str(old.get("post_date") or "")):
            best[k] = {**rec, "code": code}

    for d in db.company_news.find(
        {"title": {"$regex": r"\bQ[1-3]\b.*Financials|Financials.*\bQ[1-3]\b", "$options": "i"}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        rec = parse_interim_post(d.get("title") or "", d.get("body") or "", d.get("post_date"))
        if rec:
            keep(d.get("trading_code"), {**rec, "full_year": False})

    yearly: dict[tuple[str, date], list[dict]] = {}
    for d in db.company_news.find(
        {"title": {"$regex": _ANNUAL_TITLE_RE.pattern, "$options": "i"},
         "body": {"$regex": "year ended", "$options": "i"}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        rec = annual_record(d.get("title") or "", d.get("body") or "", d.get("post_date"))
        if rec and rec.get("fy_end"):
            yearly.setdefault((d.get("trading_code"), rec["fy_end"]), []).append(rec)
    for (code, _), recs in yearly.items():
        ann = newest_annual(recs)
        year = full_year_result(ann)
        if year:
            keep(code, {**year, "cash_pct": ann.get("cash_pct"), "stock_pct": ann.get("stock_pct")})
    return list(best.values())


def results_season(sid: Optional[str] = None) -> Optional[dict]:
    seasons = rr.season_list(season_records())
    if not seasons:
        return None
    return _season(sid or seasons[0]["id"])


@_ttl_cache(900, max_entries=8)
def _season(sid: str) -> Optional[dict]:
    from backend.services.notices import load_ledger_cash

    info = _info()
    try:
        from backend.services.morning_brief_service import results_calendar
        meetings = results_calendar().get("meetings") or []
    except Exception:  # noqa: BLE001 — "still to come" just stays empty
        meetings = []
    # Last year's cash dividend %: DSE's own yearly list on the company page,
    # then the declaration ledger (a year of news) on top.
    ledger: dict[str, dict[int, float]] = {}
    from backend.services.db_service import load_companies
    for c in load_companies():
        for pair in c.get("cash_dividends") or []:
            try:
                ledger.setdefault(c["trading_code"], {})[int(pair[0])] = float(pair[1])
            except (TypeError, ValueError, IndexError):
                continue
    try:
        for code, years in load_ledger_cash().items():
            ledger.setdefault(code, {}).update(years)
    except Exception:  # noqa: BLE001
        pass
    return rr.results_season(season_records(), sid, info, ledger, meetings,
                             {c: m.get("sector_class") or "GENERAL" for c, m in info.items()})


# ---------------------------------------------------------------- 4 · who is buying

INSIDER_DAYS = 365


@_ttl_cache(900, max_entries=2)
def owners_report() -> dict:
    from backend.services import research_owners as ro
    from backend.services.db_service import order_shareholdings
    from backend.services.notices import _INSIDER_TITLE_RE, pair_insider_trades, parse_insider

    db = get_db()
    since = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=INSIDER_DAYS)
    recs: dict[str, list[dict]] = {}
    for d in db.company_news.find(
        {"post_date": {"$gte": since}, "title": {"$regex": _INSIDER_TITLE_RE.pattern, "$options": "i"}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        r = parse_insider(d.get("title") or "", d.get("body") or "", d.get("post_date"))
        if r and d.get("trading_code"):
            recs.setdefault(d["trading_code"], []).append(r)
    trades = {c: pair_insider_trades(v) for c, v in recs.items()}

    by_code: dict[str, list[dict]] = {}
    for d in db.shareholdings.find({}, {"_id": 0}):
        if d.get("trading_code"):
            by_code.setdefault(d["trading_code"], []).append(d)
    holdings = {c: order_shareholdings(v) for c, v in by_code.items()}
    return ro.owners_report(trades, holdings, _info(), _today())


# ---------------------------------------------------------------- 5 · is the profit real

def _bonus_deflator(stock: dict[int, float]) -> dict[int, float]:
    """{year: shares then ÷ shares now}, from the bonus % of each later year."""
    out, mult = {}, 1.0
    for y in sorted(stock, reverse=True):
        out[y] = 1 / mult
        mult *= 1 + (stock.get(y) or 0) / 100
    return out


@_ttl_cache(900, max_entries=2)
def _dividend_years() -> dict[str, dict[int, dict]]:
    """{code: {year: {cash_pct, stock_pct}}} — DSE's audited table first, the
    company page's yearly lists for years the table lacks."""
    from backend.services.db_service import load_companies

    out: dict[str, dict[int, dict]] = {}
    for d in get_db().financials.find({}, {"_id": 0, "trading_code": 1, "year": 1, "cash_dividend_pct": 1,
                                            "stock_dividend_pct": 1}):
        try:
            y = int(d.get("year"))
        except (TypeError, ValueError):
            continue
        out.setdefault(d["trading_code"], {})[y] = {"cash_pct": rr._n(d.get("cash_dividend_pct")),
                                                    "stock_pct": rr._n(d.get("stock_dividend_pct"))}
    for c in load_companies():
        code = c["trading_code"]
        for key, field in (("cash_dividends", "cash_pct"), ("stock_dividends", "stock_pct")):
            for pair in c.get(key) or []:
                try:
                    y, v = int(pair[0]), float(pair[1])
                except (TypeError, ValueError, IndexError):
                    continue
                row = out.setdefault(code, {}).setdefault(y, {"cash_pct": None, "stock_pct": None})
                if row.get(field) is None:
                    row[field] = v
    # A year's cash from the declaration ledger (interim + final) when it is
    # bigger: DSE's table can carry only part of a year that is still open.
    try:
        from backend.services.notices import load_ledger_cash
        for code, years in load_ledger_cash().items():
            for y, v in years.items():
                row = out.get(code, {}).get(int(y))
                if row is not None and v and v > (row.get("cash_pct") or 0):
                    row["cash_pct"] = float(v)
    except Exception:  # noqa: BLE001
        logger.exception("research reports: dividend ledger failed")
    return out


@_ttl_cache(900, max_entries=2)
def earnings_quality() -> dict:
    from backend.services import research_quality as rq
    from backend.services.db_service import load_companies

    db = get_db()
    profit_mn: dict[tuple[str, int], float] = {}
    for d in db.financials.find({}, {"_id": 0, "trading_code": 1, "year": 1, "profit_mn": 1}):
        v = rr._n(d.get("profit_mn"))
        try:
            if v is not None:
                profit_mn[(d["trading_code"], int(d["year"]))] = v
        except (TypeError, ValueError):
            continue
    # DSE's per-share operating cash from the yearly notice, to catch a
    # cash-flow line the Amarstock scrape read wrong.
    try:
        from backend.services.notices import load_annual_results
        notice_cash = {(c, a["fy_end"].year): rr._n(a.get("nocfps"))
                       for c, a in load_annual_results().items() if a and a.get("fy_end")}
    except Exception:  # noqa: BLE001
        notice_cash = {}
    rows: dict[str, list[dict]] = {}
    for d in db.company_financials_ext.find({}, {"_id": 0}):
        try:
            y = int(d.get("year"))
        except (TypeError, ValueError):
            continue
        code = d.get("trading_code")
        np_ = rr._n(d.get("net_profit"))
        if np_ is None and (code, y) in profit_mn:
            np_ = profit_mn[(code, y)] * 1e6
        ocf = rr._n(d.get("operating_cf"))
        per_share = rr._n(d.get("nocfps"))
        if per_share is None:
            per_share = notice_cash.get((code, y))
        doubt = (ocf is not None and per_share is not None and abs(ocf) > 1e7 and per_share != 0
                 and (ocf < 0) != (per_share < 0))
        rows.setdefault(code, []).append({
            "year": y, "profit": np_, "ocf": ocf, "doubt": doubt, "capex": rr._n(d.get("capex")),
            "ebit": rr._n(d.get("ebit")), "revenue": rr._n(d.get("revenue")),
            "debt": rr._n(d.get("total_debt")), "assets": rr._n(d.get("total_assets"))})

    # Cash dividends paid for each year, in taka: % of face value × the shares
    # outstanding then (today's count put back through later bonus shares).
    comps = {c["trading_code"]: c for c in load_companies()}
    dividends: dict[str, dict[int, float]] = {}
    for code, ys in _dividend_years().items():
        c = comps.get(code) or {}
        shares, face = rr._n(c.get("total_shares")), rr._n(c.get("face_value")) or 10.0
        if not shares:
            continue
        defl = _bonus_deflator({y: (v.get("stock_pct") or 0) for y, v in ys.items()})
        dividends[code] = {y: (v.get("cash_pct") or 0) / 100 * face * shares * defl.get(y, 1.0)
                           for y, v in ys.items()}
    return rq.quality_report(rows, dividends, _info())


# ---------------------------------------------------------------- 6 · dividends you can count on

@_ttl_cache(900, max_entries=2)
def dividend_reliability() -> dict:
    from backend.services import research_dividends as rd
    from backend.services.db_service import load_companies
    from backend.services.dividend_safety import dividend_safety

    info = _info()
    scores = _score_rows()
    years = _dividend_years()
    newest = max((max(ys) for ys in years.values() if ys), default=None)
    # Only companies whose record reaches the last two years (an old record
    # can't say what it pays now).
    years = {c: ys for c, ys in years.items() if ys and newest is not None and max(ys) >= newest - 1}
    safety, yields = {}, {}
    for code in years:
        row = scores.get(code)
        if row:
            safety[code] = dividend_safety(row, (info.get(code) or {}).get("sector_class") or "GENERAL")
            yields[code] = rr._n(row.get("div_yield_pct"))
    try:
        cash_labels = {i["code"]: i["label"] for i in earnings_quality().get("items") or []}
    except Exception:  # noqa: BLE001 — the steady list just can't use it
        logger.exception("dividend report: earnings quality failed")
        cash_labels = {}
    faces = {c["trading_code"]: rr._n(c.get("face_value")) or 10.0 for c in load_companies()}
    return rd.dividend_report(years, safety, yields, cash_labels, info, faces)


# ---------------------------------------------------------------- the hub

def _guard(name: str, fn, default=None):
    try:
        return fn()
    except Exception:  # noqa: BLE001
        logger.exception("research summary: %s failed", name)
        return default


def summary() -> dict:
    """One line of figures per report for the hub's cards."""
    def risks():
        r = risk_register()
        return {"flagged": r["flagged"], "universe": r["universe"], "two_or_more": r["two_or_more"],
                "added": len(r["week"]["added"]), "fixed": len(r["week"]["fixed"]), "as_of": r["as_of"]}

    def auditors():
        a = auditor_tracker()
        return {"companies": a["companies"], "universe": a["universe"], "counts": a["counts"],
                "recent": a["recent"]}

    def season():
        s = results_season()
        if not s:
            return None
        return {"title": s["season"]["title"], "id": s["season"]["id"], "reported": s["reported"],
                "counts": s["counts"], "coming": len(s["coming"])}

    def owners():
        o = owners_report()
        return {"month": o["month"], **o["totals"]}

    def quality():
        q = earnings_quality()
        return {"universe": q["universe"], "counts": q["counts"], "to": q["years"]["to"]}

    def dividends():
        d = dividend_reliability()
        return {"universe": d["universe"], **d["counts"]}

    return {"risks": _guard("risks", risks), "auditors": _guard("auditors", auditors),
            "season": _guard("season", season), "owners": _guard("owners", owners),
            "quality": _guard("quality", quality), "dividends": _guard("dividends", dividends)}


# ---------------------------------------------------------------- the dashboard

SNAPSHOT_TTL = 900  # seconds before the dashboard's copy is rebuilt (in the background)
_snap: dict = {"val": None, "at": 0.0, "busy": False}
_snap_lock = threading.Lock()


def _refresh_snapshot() -> None:
    try:
        val = summary()
        with _snap_lock:
            _snap["val"], _snap["at"] = val, time.time()
    except Exception:  # noqa: BLE001
        logger.exception("research summary snapshot failed")
    finally:
        with _snap_lock:
            _snap["busy"] = False


def summary_snapshot() -> Optional[dict]:
    """The hub's figures for the dashboard's research card, never blocking.

    A cold ``summary()`` builds all six reports (~13 s), far too slow for the
    home bundle. This returns the last copy at once (None on a fresh worker)
    and, when it is missing or older than SNAPSHOT_TTL, rebuilds it on a
    background thread; the card shows the reports without figures until then.
    """
    with _snap_lock:
        val, stale = _snap["val"], time.time() - _snap["at"] >= SNAPSHOT_TTL
        start = stale and not _snap["busy"]
        if start:
            _snap["busy"] = True
    if start:
        threading.Thread(target=_refresh_snapshot, name="research-summary", daemon=True).start()
    return val
