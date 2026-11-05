"""
The stock screener — data side. Rules live in ``screener.py`` (pure).

``universe()`` is the whole page in one payload: every scored company's figure
on every filter, the filter menu, the ready-made screens and the sectors. The
browser filters, counts and sorts it on the spot, so a change needs no request.
Saved screens and their daily alert run the same rules here (``run``).
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


def _red_counts(codes) -> dict[str, int]:
    try:
        from backend.services.stock_report_service import latest_snapshots
        return {c: int(s.get("red") or 0) for c, s in latest_snapshots(codes).items()}
    except Exception:  # noqa: BLE001 — the warnings filter just has no figures
        logger.exception("screener: report snapshots failed")
        return {}


@_ttl_cache(900)
def rows() -> list[dict]:
    """[{code, name, sector, v: {filter: figure}}] for every scored company."""
    from backend.services.research_lists_service import build_facts

    facts = build_facts()
    rets = _one_year_returns()
    reds = _red_counts(list(facts))
    out = []
    for code, f in facts.items():
        out.append({"code": code, "name": f.get("name") or code,
                    "v": sc.row_values(f, rets.get(code), reds.get(code))})
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
            "signed": fd.signed, "high_good": fd.high_good, "premium": fd.premium,
            "presets": [{"min": p.min, "max": p.max, "en": p.en, "bn": p.bn} for p in fd.presets],
            "options": options,
        })
    return {
        "groups": [{"key": k, "en": en, "bn": bn} for k, en, bn in sc.GROUPS],
        "filters": filters,
        "ready": [{"id": r.id, "title_en": r.title_en, "title_bn": r.title_bn,
                   "blurb_en": r.blurb_en, "blurb_bn": r.blurb_bn, "spec": r.spec(), "metric": r.metric}
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
    cols = [fd.key for fd in sc.FILTERS]
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
    """The ready-made screens, run — the homepage "Find stocks your way" card:
    each one's filters in words, today's count and its top three, each with
    the figure that put it there. Nothing here is locked."""
    out = []
    for r in sc.READY:
        try:
            res = run(r.spec())
        except ValueError:
            continue
        out.append({
            "id": r.id, "title_en": r.title_en, "title_bn": r.title_bn,
            "blurb_en": r.blurb_en, "blurb_bn": r.blurb_bn,
            "words": sc.summary(res["spec"]), "passed": res["passed"], "universe": len(rows()),
            "top": [stock_brief(x, r.metric) for x in res["rows"][:READY_TOP]],
        })
    return out
