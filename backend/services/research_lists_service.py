"""
Research lists — data side. The rules live in ``research_lists.py`` (pure);
this module gathers one flat "facts" dict per company from the loaders the
rest of the app already caches, runs every list, builds the research cards
for the stocks that pass, and keeps one snapshot per list per trading day in
``research_list_snapshots`` so the page can say who joined and who left.

Served by ``routers/research_lists.py``. Everything ships to every reader;
the Premium lock is screen-only, like every other lock in the app.
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
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

SNAPSHOT_COLLECTION = "research_list_snapshots"
CHANGES_WINDOW_DAYS = 30

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
    y = _n(f.get("div_yield_pct"))
    f["cash_per_10k"] = round(y * 100) if y else None
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


@_ttl_cache(900)
def run_all() -> dict[str, dict]:
    """{list_id: {universe, funnel, passed (all), codes (top LIST_CAP)}}."""
    facts = list(build_facts().values())
    ctx = _ctx()
    out = {}
    for lst in rl.LISTS:
        res = rl.run_list(lst, facts, ctx)
        res["codes"] = [f["code"] for f in res["passed"][:rl.LIST_CAP]]
        out[lst.id] = res
    return out


# ---------------------------------------------------------------------------
# Snapshots (who joined / who left)
# ---------------------------------------------------------------------------

def _snapshots():
    col = get_db()[SNAPSHOT_COLLECTION]
    try:
        col.create_index([("list_id", 1), ("date", 1)], unique=True, name="list_date")
    except Exception:  # noqa: BLE001 — index already there under another spec
        pass
    return col


def store_snapshots(day: Optional[str] = None) -> dict:
    """Upsert today's members of every list. Idempotent per trading day; the
    daily job calls it after the scores are recomputed."""
    day = day or bst_today_iso()
    runs = run_all()
    col = _snapshots()
    now = datetime.now(timezone.utc)
    for lst in rl.LISTS:
        res = runs.get(lst.id) or {}
        col.update_one(
            {"list_id": lst.id, "date": day},
            {"$set": {"codes": res.get("codes", []), "passed": len(res.get("passed", [])),
                      "computed_at": now}},
            upsert=True,
        )
    return {"date": day, "lists": len(rl.LISTS)}


def _baseline(list_id: str, today: str) -> Optional[dict]:
    """The snapshot to compare against: the latest one at least a month old,
    else the oldest one before today (the list is younger than a month)."""
    col = get_db()[SNAPSHOT_COLLECTION]
    cutoff = (date.fromisoformat(today) - timedelta(days=CHANGES_WINDOW_DAYS)).isoformat()
    doc = col.find_one({"list_id": list_id, "date": {"$lte": cutoff}}, sort=[("date", -1)])
    if doc:
        return doc
    return col.find_one({"list_id": list_id, "date": {"$lt": today}}, sort=[("date", 1)])


def _first_tracked(list_id: str) -> Optional[str]:
    doc = get_db()[SNAPSHOT_COLLECTION].find_one({"list_id": list_id}, sort=[("date", 1)])
    return doc.get("date") if doc else None


def changes_for(lst: rl.ResearchList, codes_now: list[str], facts: dict[str, dict],
                ctx: rl.Ctx) -> dict:
    today = bst_today_iso()
    try:
        base = _baseline(lst.id, today)
        tracked = _first_tracked(lst.id)
    except Exception:  # noqa: BLE001
        logger.exception("research lists: snapshot read failed")
        base, tracked = None, None
    if not base:
        return {"since": None, "tracking_since": tracked, "joined": [], "left": []}
    joined, left = rl.diff_codes(base.get("codes") or [], codes_now)

    def name(code):
        return (facts.get(code) or {}).get("name") or code

    out_left = []
    for code in left:
        en, bn = rl.first_failure(lst, facts.get(code), ctx)
        out_left.append({"code": code, "name": name(code), "reason_en": en, "reason_bn": bn})
    return {
        "since": base.get("date"),
        "tracking_since": tracked,
        "joined": [{"code": c, "name": name(c)} for c in joined],
        "left": out_left,
    }


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

def _as_of() -> Optional[str]:
    dates = [p.get("date") for p in load_latest_prices().values() if p.get("date")]
    return max(dates) if dates else None


def list_index() -> list[dict]:
    """Every list with its pass count and today's top three — each with its
    price and the list's key number (the first comparison column). Feeds the
    /stock-insights hub and the homepage rail (`/api/user/home`). The page
    decides who sees the names: Premium readers only."""
    runs = run_all()
    facts = build_facts()
    out = []
    for lst in rl.LISTS:
        res = runs.get(lst.id) or {}
        key = lst.columns[0] if lst.columns else None
        top = []
        for c in res.get("codes", [])[:3]:
            f = facts.get(c) or {}
            top.append({
                "code": c, "name": f.get("name") or c,
                "price": _n(f.get("ltp")), "change_pct": _n(f.get("change_pct")),
                "metric": _n(f.get(key.key)) if key else None,
            })
        out.append({
            "id": lst.id, "slug": lst.slug,
            "title_en": lst.title_en, "title_bn": lst.title_bn,
            "idea_en": lst.idea_en, "idea_bn": lst.idea_bn,
            "universe": res.get("universe", 0),
            "passed": len(res.get("passed", [])),
            "checks": len(lst.checks),
            "metric": ({"key": key.key, "label_en": key.label_en, "label_bn": key.label_bn, "fmt": key.fmt}
                       if key else None),
            "top": top,
        })
    return out


def _risk(f: dict) -> Optional[dict]:
    """The one thing that could go wrong — the stock page's first watch-out."""
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


def _card(lst: rl.ResearchList, f: dict, rank: int, ctx: rl.Ctx, signals: dict,
          report_codes: set[str]) -> dict:
    head_en, head_bn = lst.headline(f)
    sig = signals.get(f["code"]) or {}
    q = None
    if _n(f.get("interim_eps_yoy_pct")) is not None:
        q = {"label_en": f.get("interim_label_en"), "label_bn": f.get("interim_label_bn"),
             "eps_yoy_pct": _n(f.get("interim_eps_yoy_pct")), "q_yoy_pct": _n(f.get("interim_q_yoy_pct"))}
    owners = None
    # No sponsor group (government-owned) → nothing to say about owners.
    if _n(f.get("sponsor_delta")) is not None and (_n(f.get("sponsor_now")) or 0) > 0:
        owners = {"prev": f.get("sponsor_prev"), "now": f.get("sponsor_now"),
                  "delta": f.get("sponsor_delta"), "since": f.get("sh_prev_date"), "date": f.get("sh_date")}
    return {
        "rank": rank,
        "code": f["code"], "name": f.get("name"), "sector": f.get("sector"),
        "price": _n(f.get("ltp")), "change_pct": _n(f.get("change_pct")),
        "score": _n(f.get("score")),
        "signal": sig.get("signal") or "none", "strength": sig.get("strength"),
        "headline_en": head_en, "headline_bn": head_bn,
        "checks": rl.check_values(lst, f, ctx),
        "risk": _risk(f),
        "fair_value": _fair_value(f["code"]),
        "quarter": q,
        "owners": owners,
        "cash_per_10k": f.get("cash_per_10k"),
        "has_report": f["code"] in report_codes,
        "metrics": {c.key: _n(f.get(c.key)) for c in lst.columns},
    }


@_ttl_cache(900)
def get_list(slug: str) -> Optional[dict]:
    lst = rl.BY_SLUG.get(slug)
    if not lst:
        return None
    from backend.services.signal_service import build_signals
    from backend.services.deep_analysis_service import list_report_codes

    facts = build_facts()
    res = run_all().get(lst.id) or {"universe": 0, "funnel": [], "passed": [], "codes": []}
    ctx = _ctx()
    try:
        signals = build_signals()
    except Exception:  # noqa: BLE001
        signals = {}
    try:
        reports = set(list_report_codes())
    except Exception:  # noqa: BLE001
        reports = set()

    passed = res["passed"][:rl.LIST_CAP]
    return {
        "id": lst.id, "slug": lst.slug,
        "title_en": lst.title_en, "title_bn": lst.title_bn,
        "idea_en": lst.idea_en, "idea_bn": lst.idea_bn,
        "as_of": _as_of(),
        "universe": res["universe"],
        "funnel": res["funnel"],
        "passed": len(res["passed"]),
        "columns": [{"key": c.key, "label_en": c.label_en, "label_bn": c.label_bn, "fmt": c.fmt}
                    for c in lst.columns],
        "stocks": [_card(lst, f, i + 1, ctx, signals, reports) for i, f in enumerate(passed)],
        "changes": changes_for(lst, res["codes"], facts, ctx),
    }
