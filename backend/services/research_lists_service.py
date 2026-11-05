"""
Company facts — data side of the checks in ``research_lists.py`` (pure).
Gathers one flat "facts" dict per company from the loaders the rest of the
app already caches; read by the recommendation engine, the screener, saved
screens and the watchlist / portfolio glance, plus each pick's watch-out
(`snapshot_risk` / `_risk`) and fair-value range.

The six research lists and their pages, endpoints and daily snapshots
(`research_list_snapshots`) were removed 2026-11-05 (user decision); the
check library they were built from stays.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Optional

from backend.services import research_lists as rl
from backend.services.db_service import (
    _ttl_cache,
    get_db,
    load_52w_ranges,
    load_companies,
    load_company_news,
    load_financials,
    load_latest_prices,
    load_shareholdings,
    order_shareholdings,
)
from backend.services.stock_facts import ownership_baseline
from utils.market_hours import bst_today_iso
from utils.sector import normalize_sector

logger = logging.getLogger(__name__)

# p5_consist (0/4/7/10) -> paying years out of the last five.
_PAID_YEARS = {10.0: 5, 7.0: 4, 4.0: 3}


def _n(v) -> Optional[float]:
    return rl._n(v)


def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if hasattr(v, "isoformat"):
        return v.isoformat()[:10]
    return str(v)[:10] or None


# ---------------------------------------------------------------------------
# Facts
# ---------------------------------------------------------------------------

def _shareholding_pairs() -> dict[str, tuple[dict, Optional[dict]]]:
    """{code: (latest, previous)} shareholding snapshots, one read. Ordered
    by ``order_shareholdings`` — the dates are mixed-format text, so a
    database sort would rank the wrong report first."""
    by_code: dict[str, list[dict]] = {}
    for d in get_db().shareholdings.find(
            {}, {"_id": 0, "trading_code": 1, "as_of_date": 1, "sponsor_director_pct": 1}):
        by_code.setdefault(d.get("trading_code"), []).append(d)
    out: dict[str, tuple[dict, Optional[dict]]] = {}
    for code, docs in by_code.items():
        docs = order_shareholdings(docs)
        if code and docs:
            out[code] = (docs[0], ownership_baseline(docs))
    return out


def facts_from(row: dict, comp: dict, price: dict, rng: dict, mom: dict,
               sh: Optional[tuple[dict, Optional[dict]]]) -> dict:
    """One company's facts — the score row plus the few figures the lists need
    that the score row doesn't carry. Pure, so tests can call it."""
    f = {k: (None if isinstance(v, float) and v != v else v) for k, v in row.items()}
    code = f.get("trading_code")
    ltp = _n(f.get("ltp")) or _n(price.get("ltp"))
    f.update({
        "code": code,
        "name": comp.get("company_name") or code,
        "sector": f.get("sector") or comp.get("sector"),
        "sector_class": normalize_sector(f.get("sector") or comp.get("sector") or ""),
        "cat": f.get("market_cat") or comp.get("market_category"),
        "stale": bool(f.get("stale_data")),
        "ltp": ltp,
        "change_pct": _n(price.get("change_pct")),
        "total_loan_mn": _n(comp.get("total_loan_mn")),
        "turnover_mn": _n(mom.get("avg_turnover_7d_mn")),
        "paid_years": _PAID_YEARS.get(_n(f.get("p5_consist")) or 0.0),
    })
    # Cash a year on ৳10,000: the whole shares ৳10,000 buys × the year's cash a
    # share, before tax (it used to be yield × 100, i.e. fractional shares).
    dps, px = _n(f.get("div_latest_dps")), _n(ltp)
    if dps is None and _n(f.get("div_yield_pct")) and px:
        dps = _n(f.get("div_yield_pct")) * px / 100.0
    shares = int(10000 // px) if px and px > 0 else 0
    f["cash_per_10k"] = round(shares * dps) if (dps and shares) else None
    lmc = _n(f.get("loan_to_mcap"))
    f["loan_pct_mcap"] = round(lmc * 100, 1) if lmc is not None else None
    f["profit_change_pct"] = rl.profit_trend(f)[0]

    hi, lo = _n(rng.get("hi")), _n(rng.get("lo"))
    f["hi52"], f["lo52"] = hi, lo
    f["pct_below_high"] = round((hi - ltp) / hi * 100, 1) if hi and ltp and hi > 0 else None
    f["pct_in_range"] = (round((ltp - lo) / (hi - lo) * 100, 1)
                         if hi and lo is not None and ltp and hi > lo else None)

    now, prev = sh if sh else (None, None)
    a = _n((prev or {}).get("sponsor_director_pct"))
    b = _n((now or {}).get("sponsor_director_pct"))
    f["sponsor_prev"], f["sponsor_now"] = a, b
    f["sponsor_delta"] = round(b - a, 2) if a is not None and b is not None else None
    f["sh_date"] = _iso((now or {}).get("as_of_date"))
    f["sh_prev_date"] = _iso((prev or {}).get("as_of_date"))
    return f


@_ttl_cache(900)
def build_facts() -> dict[str, dict]:
    """{code: facts} for every scored company."""
    from backend.services.scoring_service import build_scores_df
    from backend.services.top20_service import compute_momentum_all

    df = build_scores_df()
    if df.empty:
        return {}
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    ranges = load_52w_ranges()
    try:
        momentum = compute_momentum_all()
    except Exception:  # noqa: BLE001 — turnover just goes missing
        logger.exception("research lists: momentum failed")
        momentum = {}
    try:
        holdings = _shareholding_pairs()
    except Exception:  # noqa: BLE001
        logger.exception("research lists: shareholdings failed")
        holdings = {}

    out: dict[str, dict] = {}
    for row in df.to_dict("records"):
        code = row.get("trading_code")
        if not code:
            continue
        out[code] = facts_from(row, companies.get(code) or {}, prices.get(code) or {},
                               ranges.get(code) or {}, momentum.get(code) or {}, holdings.get(code))
    return out


def _ctx() -> rl.Ctx:
    from backend.services.stock_facts import governance_items
    return rl.Ctx(governance=lambda code: governance_items(load_company_news(code, limit=200)),
                  today=bst_today_iso())


def _as_of() -> Optional[str]:
    dates = [p.get("date") for p in load_latest_prices().values() if p.get("date")]
    return max(dates) if dates else None


def snapshot_risk(snap: Optional[dict]) -> Optional[dict]:
    """Pure: the one thing that could go wrong, from the stock report's newest
    snapshot — its first serious problem, else its first smaller thing, in the
    report's own plain words ({en, bn, more, level}); None when it found
    nothing (2026-11-05, audit EL11)."""
    if not snap:
        return None
    lines = []
    for keys, texts, level in (("red_keys", "red_lines", "red"), ("amber_keys", "amber_lines", "amber")):
        for k in snap.get(keys) or []:
            t = (snap.get(texts) or {}).get(k) or {}
            if t.get("en") and t.get("bn"):
                lines.append((t, level))
    if not lines:
        return None
    (t, level) = lines[0]
    return {"en": t["en"], "bn": t["bn"], "more": len(lines) - 1, "level": level}


def report_snapshots(codes) -> dict[str, dict]:
    """{code: newest stock report snapshot} for these codes (one read)."""
    try:
        from backend.services.stock_report_service import latest_snapshots
        return latest_snapshots(codes)
    except Exception:  # noqa: BLE001 — the card then uses the older wording
        logger.exception("research lists: report snapshots failed")
        return {}


def _risk(f: dict, snaps: Optional[dict] = None) -> Optional[dict]:
    """The one thing that could go wrong. From the stock report's snapshot
    when it carries amber lines (stored since 2026-11-05); else the stock
    page's first watch-out (the older `build_items` wording)."""
    snap = (snaps or {}).get(f["code"])
    if snap is not None and "amber_lines" in snap:
        return snapshot_risk(snap)
    from backend.services.stock_facts import build_items
    code = f["code"]
    try:
        comp = next((c for c in load_companies() if c.get("trading_code") == code), {}) or {}
        items = build_items(f, load_shareholdings(code), load_financials(code), comp,
                            load_company_news(code, limit=200), f.get("sector_class") or "GENERAL")
    except Exception:  # noqa: BLE001
        logger.exception("research lists: watch-outs failed for %s", code)
        return None
    watch = [i for i in items if i.get("tone") == "watch"]
    return {"en": watch[0]["en"], "bn": watch[0]["bn"], "more": len(watch) - 1} if watch else None


def _fair_value(code: str) -> Optional[dict]:
    from backend.services.deep_analysis_service import compute_fair_value
    try:
        fv = compute_fair_value(code)
    except Exception:  # noqa: BLE001
        return None
    if not fv:
        return None
    return {k: fv.get(k) for k in ("low", "high", "center", "today", "stance", "estimates_disagree")}
