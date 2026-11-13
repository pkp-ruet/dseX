"""
The stock screener — data side. Rules live in ``screener.py`` (pure).

``universe()`` is the whole page in one payload: every scored company's figure
on every filter, the filter menu, the goals and the sectors. The browser
filters, counts and sorts it on the spot, so a change needs no request.
Saved screens and their daily alert run the same rules here (``run``).

The screener is Premium since 2026-11-14: anyone can pick filters and see how
many shares match; which shares they are is Premium. Locks are screen-only,
so the payload is the same for every reader.
"""
from __future__ import annotations

import logging
from typing import Optional

from backend.services import screener as sc
from backend.services.db_service import _ttl_cache, get_db, load_latest_prices

logger = logging.getLogger(__name__)

READY_TOP = 3  # shares a homepage card shows per ready-made screen


def _sector_bn(name: str) -> str:
    try:
        from utils.sector import sector_bn as word
        return word(name) or name
    except Exception:  # noqa: BLE001 — a label helper must never break a page
        return name


def _one_year_returns() -> dict[str, float]:
    try:
        from backend.services.returns import one_year_returns as rets
        return rets(get_db(), load_latest_prices())
    except Exception:  # noqa: BLE001 — the 1-year filter just has no figures
        logger.exception("screener: 1-year returns failed")
        return {}


def _cash_labels() -> dict[str, str]:
    """{code: "Is the profit real?" label} (backed / partly / paper / none / loss)."""
    try:
        from backend.services.research_reports_service import earnings_quality
        return {i["code"]: i.get("label") for i in earnings_quality().get("items") or [] if i.get("code")}
    except Exception:  # noqa: BLE001 — the cash filter just has no figures
        logger.exception("screener: earnings quality failed")
        return {}


def _owner_moves() -> Optional[dict[str, str]]:
    """{code: "bought" | "sold"} from the founders' and directors' trades of
    the last 12 months; None when the report couldn't be built (then nobody
    gets a figure, rather than everybody reading "No trades")."""
    try:
        from backend.services.research_reports_service import owners_report
        trades = (owners_report() or {}).get("trades") or {}
    except Exception:  # noqa: BLE001 — the owners filter just has no figures
        logger.exception("screener: owners report failed")
        return None
    out = {i["code"]: "sold" for i in trades.get("selling") or [] if i.get("code")}
    out.update({i["code"]: "bought" for i in trades.get("buying") or [] if i.get("code")})
    return out


def _record_dates() -> dict[str, dict]:
    """{code: {days, buy_by}} — the nearest declared cash record date whose
    last day to buy (the dividend calendar's own ``buy_by``) is today or later."""
    try:
        from datetime import date
        from backend.services.corporate_actions_service import build_dividend_calendar
        from utils.market_hours import bst_today_iso
        today = date.fromisoformat(bst_today_iso())
        events = (build_dividend_calendar() or {}).get("record_dates") or []
    except Exception:  # noqa: BLE001 — the record-date filter just has no figures
        logger.exception("screener: dividend calendar failed")
        return {}
    out: dict[str, dict] = {}
    for e in events:
        code = e.get("trading_code")
        if not code or e.get("is_no_dividend") or not e.get("cash_per_share"):
            continue
        try:
            rd = date.fromisoformat(str(e.get("record_date"))[:10])
            bb = date.fromisoformat(str(e.get("buy_by"))[:10]) if e.get("buy_by") else rd
        except ValueError:
            continue
        if bb < today or rd < today:
            continue
        days = (rd - today).days
        if code not in out or days < out[code]["days"]:
            out[code] = {"days": days, "buy_by": bb.isoformat()}
    return out


def _price_lines(f: dict) -> dict:
    try:
        from backend.services.watchlist_glance import price_lines
        return price_lines(f) or {}
    except Exception:  # noqa: BLE001 — "Almost there" just skips our price check
        return {}


def _red_counts(codes) -> dict[str, int]:
    """{code: serious warnings in its newest report snapshot (last 21 days)}.
    Reads only the count: ``stock_report_service.latest_snapshots`` also
    brings every warning line, ~20x the bytes, and the screener's
    "no serious warnings" goals must not go blank when that read is slow."""
    try:
        from datetime import date, timedelta
        from backend.services.stock_report_service import SNAPSHOT_COLLECTION
        from utils.market_hours import bst_today_iso

        wanted = {c.upper() for c in codes or [] if c}
        since = (date.fromisoformat(bst_today_iso()) - timedelta(days=21)).isoformat()
        out: dict[str, int] = {}
        for d in get_db()[SNAPSHOT_COLLECTION].find(
            {"date": {"$gte": since}}, {"_id": 0, "trading_code": 1, "red": 1},
        ).sort("date", -1).batch_size(1000):
            c = d.get("trading_code")
            if c in wanted and c not in out:
                out[c] = int(d.get("red") or 0)
        return out
    except Exception:  # noqa: BLE001 — the warnings filter just has no figures
        logger.exception("screener: report snapshots failed")
        return {}


@_ttl_cache(900)
def rows() -> list[dict]:
    """[{code, name, sector, v: {filter: figure}}] for every scored company."""
    from concurrent.futures import ThreadPoolExecutor
    from backend.services.research_lists_service import build_facts

    # The four lookups beside the facts are independent and each is slow when
    # cold (~10-15 s apiece on a slow Atlas link); one after another they took
    # the page past the frontend's 30 s fetch limit (2026-11-14). They start
    # first and run alongside the facts; each keeps its own cache, so a
    # rebuild that overlaps another page's read waits instead of repeating it.
    with ThreadPoolExecutor(max_workers=4, thread_name_prefix="screener") as pool:
        f_rets = pool.submit(_one_year_returns)
        f_cash = pool.submit(_cash_labels)
        f_owners = pool.submit(_owner_moves)
        f_records = pool.submit(_record_dates)
        facts = build_facts()
        reds = _red_counts(list(facts))
        rets, cash, owners, records = f_rets.result(), f_cash.result(), f_owners.result(), f_records.result()
    out = []
    for code, f in facts.items():
        extra = {"cash": cash.get(code), "record": records.get(code), "lines": _price_lines(f),
                 "owners": None if owners is None else owners.get(code, "none")}
        out.append({"code": code, "name": f.get("name") or code,
                    "v": sc.row_values(f, rets.get(code), reds.get(code), extra)})
    out.sort(key=lambda r: r["code"])
    return out


def sectors() -> list[str]:
    return sorted({r["v"]["sector"] for r in rows() if r["v"].get("sector")})


def _as_of() -> Optional[str]:
    dates = [p.get("date") for p in load_latest_prices().values() if p.get("date")]
    return str(max(dates))[:10] if dates else None


def menu(names: list[str]) -> dict:
    """The filter menu, groups and ready-made screens, ready for the browser."""
    filters = []
    for fd in sc.FILTERS:
        options = ([{"value": s, "en": s, "bn": _sector_bn(s)} for s in names] if fd.key == "sector"
                   else [{"value": o.value, "en": o.en, "bn": o.bn} for o in fd.options])
        filters.append({
            "key": fd.key, "group": fd.group, "kind": fd.kind,
            "name_en": fd.name_en, "name_bn": fd.name_bn,
            "short_en": fd.short_en, "short_bn": fd.short_bn,
            "help_en": fd.help_en, "help_bn": fd.help_bn,
            "unit": fd.unit, "term": fd.term, "decimals": fd.decimals,
            "signed": fd.signed, "high_good": fd.high_good, "ours": fd.ours, "menu": fd.menu,
            "presets": [{"min": p.min, "max": p.max, "en": p.en, "bn": p.bn} for p in fd.presets],
            "options": options,
        })
    return {
        "groups": [{"key": k, "en": en, "bn": bn} for k, en, bn in sc.GROUPS],
        "filters": filters,
        "ready": [{"id": r.id, "title_en": r.title_en, "title_bn": r.title_bn,
                   "blurb_en": r.blurb_en, "blurb_bn": r.blurb_bn, "spec": r.spec(), "metric": r.metric,
                   "goal": r.goal}
                  for r in sc.READY],
        "max_filters": sc.MAX_FILTERS,
    }


@_ttl_cache(900)
def universe() -> dict:
    """The screener page: menu + every company's figures, packed as one list
    per company in ``cols`` order ([code, name, figure, figure …]) — about a
    third of the size of a dict per company."""
    data = rows()
    names = sorted({r["v"]["sector"] for r in data if r["v"].get("sector")})
    cols = [fd.key for fd in sc.FILTERS] + sc.EXTRA_COLS
    return menu(names) | {"as_of": _as_of(), "cols": cols,
                          "rows": [[r["code"], r["name"]] + [r["v"].get(k) for k in cols] for r in data]}


def run(spec_in: dict) -> dict:
    """A v2 screen, run: {spec, passed, codes (in order), stocks (the first
    few with price + change)}. ValueError on a bad spec."""
    spec = sc.normalize_spec(spec_in, sectors())
    passed = sc.apply(rows(), spec)
    return {"spec": spec, "passed": len(passed), "codes": [r["code"] for r in passed], "rows": passed}


def stock_brief(r: dict, metric: Optional[str] = None) -> dict:
    v = r["v"]
    return {"code": r["code"], "name": r["name"], "price": v.get("price"), "change_pct": v.get("change"),
            "metric": sc.metric_words(metric, v.get(metric)) if metric else None}


@_ttl_cache(900)
def ready_summary() -> list[dict]:
    """The six goals, run — the dashboard's screener card: each one's filters
    in words and today's count (the card shows counts only; the top three
    stay in the payload for older frontends)."""
    out = []
    for r in sc.GOALS:
        try:
            res = run(r.safe_spec())
        except ValueError:
            continue
        out.append({
            "id": r.id, "title_en": r.title_en, "title_bn": r.title_bn,
            "blurb_en": r.blurb_en, "blurb_bn": r.blurb_bn,
            "words": sc.summary(r.spec()), "passed": res["passed"], "universe": len(rows()),
            "top": [stock_brief(x, r.metric) for x in res["rows"][:READY_TOP]],
        })
    return out
