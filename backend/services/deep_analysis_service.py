"""
Serving layer for the LLM-written deep-analysis reports.

Two halves, matching the durable-vs-live split the reports were written around:

* ``load_report`` / ``list_report_codes`` read the DURABLE bilingual narrative
  from the ``deep_analysis`` collection (seeded by ``scripts/deep_analysis/
  seed_db.py``). Cached long — this content changes only when a report is
  regenerated.
* ``compute_fair_value`` produces the LIVE "value today" figure from the current
  price + financials (``backend/services/fair_value.py``). Cached short — it
  moves with the daily price.

The report body itself carries no price, no scorecard and no fair-value number
(by design), so the two never contradict each other.
"""
from typing import Optional

from backend.services.db_service import (
    _ttl_cache, get_db, get_company, load_financials, load_latest_prices,
)
from backend.services.scoring_service import get_company_score_row
from backend.services.fair_value import estimate_fair_value
from utils.sector import normalize_sector

# Metadata / bookkeeping keys we don't need to ship to the client.
_STRIP_FIELDS = {"_id", "seeded_at"}


@_ttl_cache(3600, max_entries=400)
def load_report(code: str) -> Optional[dict]:
    """The stored durable narrative for one code, or ``None`` if not written yet.

    One report per company (unique index on ``trading_code``). Returns a plain
    JSON-serialisable dict with internal bookkeeping fields stripped.
    """
    code = (code or "").strip().upper()
    if not code:
        return None
    db = get_db()
    doc = db.deep_analysis.find_one({"trading_code": code})
    if not doc:
        return None
    return {k: v for k, v in doc.items() if k not in _STRIP_FIELDS}


@_ttl_cache(3600, max_entries=1)
def list_report_codes() -> list[str]:
    """Every trading code that currently has a deep-analysis report (sorted).

    Feeds the sub-page's static params and the sitemap so only codes with real
    content get an ``/analysis`` URL.
    """
    db = get_db()
    codes = [
        d["trading_code"]
        for d in db.deep_analysis.find({}, {"trading_code": 1, "_id": 0})
        if d.get("trading_code")
    ]
    return sorted(codes)


def report_teaser(code: str) -> Optional[dict]:
    """The light hook shown on the main stock page (headline + bottom line only).

    Keeps the full ~45 KB report off every main-page load — the sub-page fetches
    the rest. ``available`` lets the frontend decide whether to render the teaser
    card and the "read the full analysis" link at all.
    """
    report = load_report(code)
    if not report:
        return None
    return {
        "available": True,
        "trading_code": report.get("trading_code"),
        "headline_en": report.get("headline_en"),
        "headline_bn": report.get("headline_bn"),
        "bottom_line_en": report.get("bottom_line_en"),
        "bottom_line_bn": report.get("bottom_line_bn"),
        "as_of_date": report.get("as_of_date"),
        "data_note_en": report.get("data_note_en"),
        "data_note_bn": report.get("data_note_bn"),
    }


@_ttl_cache(300, max_entries=400)
def compute_fair_value(code: str) -> Optional[dict]:
    """Live grounded fair-value block for one code (the "value today" box).

    Gathers its inputs from the already-cached db/scoring loaders, so calling it
    from the main detail route (which has just loaded the same data) is a cache
    hit. Returns ``None`` when there is no sensible basis — the UI then shows
    soft language instead of a fake number.
    """
    code = (code or "").strip().upper()
    if not code:
        return None
    company = get_company(code)
    if not company:
        return None
    score_row = get_company_score_row(code)
    financials = load_financials(code)
    ltp = (load_latest_prices().get(code) or {}).get("ltp")
    sector_class = normalize_sector(company.get("sector") or "")
    return estimate_fair_value(score_row, financials, company, ltp, sector_class)


def invalidate_deep_analysis_cache() -> None:
    """Drop the report caches (call after seeding new/updated reports)."""
    load_report.cache_clear()
    list_report_codes.cache_clear()
