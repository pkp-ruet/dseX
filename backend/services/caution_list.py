"""The caution list (2026-10-31, the Premium Desk plan): shares running hard
with no news from the company, market-wide.

The rule is the stock report's rumour-rally check (`stock_report.rally_run` +
`rally_warning`, one function for both): up 30% in 20 trading days or 50% in
60, with no results, dividend or price-sensitive news since the run began; red
when DSE asked about the price, the company grades weak or average, it is in Z
or few shares are with the public. Prices are put on today's footing for
dividends and bonus shares first, so a record date inside the window neither
hides a run nor makes one up.

`/market-analysis` shows how many and which companies (free); the reason for
each and what it means is Premium (screen-only).
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from backend.services.db_service import _ttl_cache

logger = logging.getLogger(__name__)

# Calendar days of prices to read: comfortably more than 61 trading days.
WINDOW_DAYS = 110
# A share whose last trade is older than this (days before the market's latest
# day) is left out — a stale price can't be "running".
STALE_DAYS = 7


def _as_date(v) -> Optional[date]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return None


def adjusted_series(rows: list[tuple[str, float]], actions: list[dict]) -> list[tuple[date, float]]:
    """(ISO day, close) rows → (date, price on today's footing), oldest first."""
    from backend.services.db_service import adjustment_factor_fn

    f = adjustment_factor_fn(actions) if actions else None
    out = []
    for d, p in sorted(rows):
        dd = _as_date(d)
        if dd is None or not p or p <= 0:
            continue
        out.append((dd, float(f(d, p)) if f else float(p)))
    return out


def caution_item(code: str, name: Optional[str], sector: Optional[str], run: dict, warning: dict,
                 ltp: Optional[float]) -> dict:
    """One row of the list. The free part is the company and the size of the
    run; `headline` / `lines` (the reason and what it means) are Premium."""
    return {
        "code": code,
        "name": name or code,
        "sector": sector,
        "level": warning["level"],
        "pct": round(run["pct"], 1),
        "days": run["days"],
        "since": run["since"].isoformat(),
        "ltp": ltp,
        "headline": warning["headline"],
        "lines": warning["lines"],
    }


def sort_items(items: list[dict]) -> list[dict]:
    """Red first, then the biggest run."""
    return sorted(items, key=lambda r: (r["level"] != "red", -r["pct"]))


def _price_rows(since_iso: str) -> dict[str, list[tuple[str, float]]]:
    from backend.services.db_service import get_db, use_official_close

    out: dict[str, list[tuple[str, float]]] = {}
    cur = get_db().stock_prices.find(
        {"date": {"$gte": since_iso}, "ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1, "close_price": 1, "ycp": 1},
    ).batch_size(1000)
    for d in cur:
        use_official_close(d)
        p = d.get("ltp")
        if p:
            out.setdefault(d["trading_code"], []).append((str(d["date"])[:10], float(p)))
    return out


@_ttl_cache(900)
def caution_list() -> dict:
    """{as_of, items: [...]} — every listed company whose price ran on no news,
    red first. Cached 900s."""
    from backend.services import stock_report as sr
    from backend.services.db_service import (
        load_companies, load_company_news, load_corporate_actions, load_shareholdings,
    )
    from backend.services.notices import parse_query_response

    since_iso = (datetime.utcnow() - timedelta(days=WINDOW_DAYS)).strftime("%Y-%m-%d")
    rows = _price_rows(since_iso)
    if not rows:
        return {"as_of": None, "items": []}
    latest = max(r[-1][0] for r in (sorted(v) for v in rows.values()) if r)
    latest_d = _as_date(latest)
    companies = {c["trading_code"]: c for c in load_companies() if not c.get("is_mutual_fund")}
    actions = load_corporate_actions(WINDOW_DAYS + 30)

    try:
        from backend.services.scoring_service import build_scores_df
        df = build_scores_df()
        scores = {str(r["trading_code"]).upper(): r for r in df.to_dict("records")} if df is not None else {}
    except Exception:  # noqa: BLE001
        scores = {}

    items = []
    for code, raw in rows.items():
        co = companies.get(code)
        if not co:
            continue
        series = adjusted_series(raw, actions.get(code) or [])
        if len(series) < 21 or (latest_d and (latest_d - series[-1][0]).days > STALE_DAYS):
            continue
        if sr.rally_run(series, []) is None:  # the cheap pass: prices only
            continue
        try:
            news = load_company_news(code, limit=200) or []
        except Exception:  # noqa: BLE001
            news = []
        run = sr.rally_run(series, [(sr._d(n.get("post_date")), n.get("title") or "") for n in news])
        if run is None:
            continue
        row = scores.get(code) or {}
        today = latest_d or date.today()
        queries = []
        for n in news:
            q = parse_query_response(n.get("title") or "", n.get("body") or "", n.get("post_date"))
            d = _as_date((q or {}).get("post_date"))
            if q and d and (today - d).days <= sr.QUERY_DAYS:
                queries.append({**q, "post_date": d})
        queries.sort(key=lambda q: q["post_date"], reverse=True)
        pub = None
        try:
            owners = sr._owner_rows(load_shareholdings(code) or [])
            if owners:
                pub = sr._f(owners[-1][1].get("public_pct"))
        except Exception:  # noqa: BLE001
            pass
        warning = sr.rally_warning(run, score=sr._f(row.get("score")),
                                   category=co.get("market_category") or row.get("market_cat"),
                                   public_pct=pub, queries=queries)
        items.append(caution_item(code, co.get("company_name"), co.get("sector"), run, warning, series[-1][1]))
    return {"as_of": latest, "items": sort_items(items)}
