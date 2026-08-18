"""
Per-sector aggregates for /sectors and /sector/[slug].

Everything here is derived from data the app already computes — the DSEF score
frame, the latest prices, and the shared momentum window. Nothing new is scraped
and no advice is invented: a sector page states what its companies look like as a
group (how many, how big, how they're valued, how they scored) and hands off to
the per-stock pages.

Sector *names* come from DSE's own field. `utils/sector.normalize_sector` maps
them onto the four scoring classes (BANK / NBFI / INSURANCE / GENERAL), which is
what decides how a company in this sector was scored.
"""

from __future__ import annotations

import math
import re
from statistics import median
from typing import Any, Optional

from backend.services.db_service import (
    _ttl_cache,
    load_companies,
    load_latest_prices,
)
from backend.services.scoring_service import build_scores_df
from backend.services.signal_service import build_signals, wire_fields
from backend.services.tiers import TIER_KEYS, tier_key
from utils.sector import normalize_sector

# A sector needs a few listings before group medians mean anything.
MIN_COMPANIES = 3

# Banks, NBFIs and insurers read as neighbours to each other — used for the
# "related sectors" links, not for scoring.
_FINANCIAL_CLASSES = {"BANK", "NBFI", "INSURANCE"}

# How the four scoring classes differ. Shown on the sector page so a reader can
# see why a bank's score isn't built from the same parts as a textile mill's.
# Mirrors the sector handling in services/scoring_service.py — keep in step.
CLASS_NOTES: dict[str, dict[str, str]] = {
    "BANK": {
        "label": "Bank",
        "en": (
            "Banks are scored on a financial-sector template: debt-to-equity is judged "
            "against bank-appropriate anchors instead of industrial ones, net interest "
            "margin stands in for gross margin, and the cash-to-assets test is skipped "
            "because a bank's balance sheet is deposits, not spare cash."
        ),
        "bn": (
            "ব্যাংকের স্কোর আলাদা নিয়মে হয় — ঋণ-ইকুইটি অনুপাত ব্যাংকের মানদণ্ডে দেখা হয়, "
            "গ্রস মার্জিনের বদলে সুদের মার্জিন ধরা হয়।"
        ),
    },
    "NBFI": {
        "label": "Non-bank financial institution",
        "en": (
            "DSE lists these under Financial Institutions. They use the same financial-sector "
            "template as banks — financial debt anchors, interest margin in place of gross "
            "margin, and operating cash flow as a fallback when the usual lines are missing."
        ),
        "bn": (
            "আর্থিক প্রতিষ্ঠানগুলো ব্যাংকের মতো একই আর্থিক টেমপ্লেটে স্কোর পায়।"
        ),
    },
    "INSURANCE": {
        "label": "Insurance",
        "en": (
            "Insurers run investment-float balance sheets with no gross-profit line, so net "
            "margin is used instead, and the cash-to-assets test is skipped. This is the "
            "largest group of listings on DSE, and the one where missing disclosure is most "
            "common — the score renormalises around what was actually reported."
        ),
        "bn": (
            "বীমা কোম্পানির হিসাব আলাদা ধরনের — গ্রস মার্জিন থাকে না, তাই নেট মার্জিন ব্যবহার করা হয়।"
        ),
    },
    "GENERAL": {
        "label": "General industry",
        "en": (
            "Scored on the full industrial template: earnings growth and stability, debt and "
            "interest cover, gross margin and capex discipline, valuation against sector peers, "
            "and dividend consistency."
        ),
        "bn": (
            "সাধারণ কোম্পানিগুলো পুরো শিল্প-টেমপ্লেটে স্কোর পায় — মুনাফা, ঋণ, মার্জিন, দাম ও লভ্যাংশ।"
        ),
    },
}


def sector_slug(name: str) -> str:
    """DSE sector name → URL slug. "Pharmaceuticals & Chemicals" → "pharmaceuticals-and-chemicals"."""
    s = (name or "").strip().lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def _num(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def _median(values: list[Optional[float]]) -> Optional[float]:
    present = [v for v in values if v is not None]
    return round(median(present), 2) if present else None


def _mean(values: list[Optional[float]]) -> Optional[float]:
    present = [v for v in values if v is not None]
    return round(sum(present) / len(present), 2) if present else None


def _momentum_all() -> dict[str, dict]:
    """Shared 7-day window. Never fatal — sector pages work without momentum."""
    try:
        from backend.services.top20_service import compute_momentum_all
        return compute_momentum_all()
    except Exception:
        return {}


def _build_stock(row: dict, comp: dict, price: dict, mom: dict, sig: Optional[dict]) -> dict:
    score = _num(row.get("score"))
    return {
        "trading_code": row["trading_code"],
        "company_name": comp.get("company_name"),
        "market_category": comp.get("market_category"),
        "score": score,
        "tier": tier_key(score) if score is not None else None,
        "ltp": _num(price.get("ltp")) if price.get("ltp") is not None else _num(row.get("ltp")),
        "change_pct": _num(price.get("change_pct")),
        "pe": _num(row.get("current_pe")),
        "pb": _num(row.get("current_pb")),
        "eps": _num(row.get("eps")),
        "eps_yoy_pct": _num(row.get("eps_yoy_pct")),
        "roe_pct": _num(row.get("roe_pct")),
        "div_yield_pct": _num(row.get("div_yield_pct")),
        "mcap_mn": _num(row.get("mcap_mn")),
        "return_7d_pct": _num(mom.get("return_7d_pct")),
        "rs_vs_dsex_pct": _num(mom.get("rs_vs_dsex_pct")),
        "p1_biz": _num(row.get("p1_biz")),
        "p2_health": _num(row.get("p2_health")),
        "p3_moat": _num(row.get("p3_moat")),
        "p4_val": _num(row.get("p4_val")),
        "p5_div": _num(row.get("p5_div")),
        "stale_data": bool(row.get("stale_data")) if row.get("stale_data") is not None else None,
        "signal": sig,
    }


def _summarize(name: str, stocks: list[dict]) -> dict:
    """Group-level figures for one sector. Medians, not averages, for valuation —
    one Tk 2,700 share shouldn't drag a sector's P/E around."""
    tier_counts = {k: 0 for k in TIER_KEYS}
    for s in stocks:
        if s["tier"] in tier_counts:
            tier_counts[s["tier"]] += 1

    mcaps = [s["mcap_mn"] for s in stocks if s["mcap_mn"] is not None]
    by_score = sorted(
        (s for s in stocks if s["score"] is not None), key=lambda s: s["score"], reverse=True
    )
    by_change = sorted(
        (s for s in stocks if s["change_pct"] is not None), key=lambda s: s["change_pct"]
    )

    def brief(s: Optional[dict]) -> Optional[dict]:
        if not s:
            return None
        return {
            "trading_code": s["trading_code"],
            "company_name": s["company_name"],
            "score": s["score"],
            "tier": s["tier"],
            "ltp": s["ltp"],
            "change_pct": s["change_pct"],
        }

    return {
        "sector": name,
        "slug": sector_slug(name),
        "sector_class": normalize_sector(name),
        "company_count": len(stocks),
        "total_mcap_mn": round(sum(mcaps), 2) if mcaps else None,
        "median_score": _median([s["score"] for s in stocks]),
        "median_pe": _median([s["pe"] for s in stocks]),
        "median_pb": _median([s["pb"] for s in stocks]),
        "median_yield_pct": _median([s["div_yield_pct"] for s in stocks]),
        "median_roe_pct": _median([s["roe_pct"] for s in stocks]),
        "avg_change_pct": _mean([s["change_pct"] for s in stocks]),
        "avg_return_7d_pct": _mean([s["return_7d_pct"] for s in stocks]),
        "avg_rs_vs_dsex_pct": _mean([s["rs_vs_dsex_pct"] for s in stocks]),
        "buy_signals": sum(1 for s in stocks if (s.get("signal") or {}).get("signal") == "buy"),
        "sell_signals": sum(1 for s in stocks if (s.get("signal") or {}).get("signal") == "sell"),
        "tier_counts": tier_counts,
        "top_ranked": brief(by_score[0] if by_score else None),
        "best_today": brief(by_change[-1] if by_change else None),
        "worst_today": brief(by_change[0] if by_change else None),
    }


@_ttl_cache(900, max_entries=2)
def _sector_index() -> dict:
    """{slug: {summary, stocks}} for every sector with enough listings, plus
    market-wide medians to compare a sector against."""
    df = build_scores_df()
    if df.empty:
        return {"sectors": {}, "market": {}, "skipped": []}

    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    momentum = _momentum_all()
    signals = build_signals()

    grouped: dict[str, list[dict]] = {}
    for row in df[df["score"].notna()].to_dict("records"):
        name = (row.get("sector") or "").strip()
        if not name:
            continue
        code = row["trading_code"]
        grouped.setdefault(name, []).append(
            _build_stock(
                row,
                companies.get(code, {}),
                prices.get(code, {}) or {},
                momentum.get(code, {}) or {},
                wire_fields(signals.get(code)),
            )
        )

    all_stocks = [s for group in grouped.values() for s in group]
    market = {
        "company_count": len(all_stocks),
        "median_score": _median([s["score"] for s in all_stocks]),
        "median_pe": _median([s["pe"] for s in all_stocks]),
        "median_pb": _median([s["pb"] for s in all_stocks]),
        "median_yield_pct": _median([s["div_yield_pct"] for s in all_stocks]),
        "median_roe_pct": _median([s["roe_pct"] for s in all_stocks]),
        "avg_change_pct": _mean([s["change_pct"] for s in all_stocks]),
        "avg_return_7d_pct": _mean([s["return_7d_pct"] for s in all_stocks]),
        "sector_count": sum(1 for g in grouped.values() if len(g) >= MIN_COMPANIES),
    }

    sectors: dict[str, dict] = {}
    skipped: list[str] = []
    for name, group in grouped.items():
        if len(group) < MIN_COMPANIES:
            skipped.append(name)
            continue
        group.sort(key=lambda s: (s["score"] is None, -(s["score"] or 0)))
        sectors[sector_slug(name)] = {"summary": _summarize(name, group), "stocks": group}

    return {"sectors": sectors, "market": market, "skipped": sorted(skipped)}


def list_sectors() -> dict:
    """Hub payload: one summary per sector, biggest first, + market medians."""
    index = _sector_index()
    summaries = [entry["summary"] for entry in index["sectors"].values()]
    summaries.sort(key=lambda s: (-(s["total_mcap_mn"] or 0), -s["company_count"]))
    return {"market": index["market"], "sectors": summaries}


def sector_slugs() -> list[str]:
    """Every slug with a page — for generateStaticParams and the sitemap."""
    return sorted(_sector_index()["sectors"].keys())


def get_sector(slug: str) -> Optional[dict]:
    """Full detail for one sector, or None when the slug isn't a sector we cover."""
    index = _sector_index()
    entry = index["sectors"].get((slug or "").strip().lower())
    if not entry:
        return None

    summary = entry["summary"]
    stocks = entry["stocks"]
    market = index["market"]

    def gap(sector_value: Optional[float], market_value: Optional[float]) -> Optional[float]:
        if sector_value is None or market_value is None or market_value == 0:
            return None
        return round((sector_value - market_value) / abs(market_value) * 100.0, 1)

    comparison = [
        {
            "metric": key,
            "label": label,
            "sector": summary.get(key),
            "market": market.get(key),
            # Positive means the sector reads higher than the market median.
            "gap_pct": gap(summary.get(key), market.get(key)),
            "higher_is_better": higher,
        }
        for key, label, higher in (
            ("median_score", "DSEF score", True),
            ("median_pe", "P/E", False),
            ("median_pb", "P/B", False),
            ("median_yield_pct", "Dividend yield", True),
            ("median_roe_pct", "Return on equity", True),
        )
    ]

    by_yield = [s for s in stocks if s["div_yield_pct"]]
    by_yield.sort(key=lambda s: s["div_yield_pct"], reverse=True)
    by_7d = [s for s in stocks if s["return_7d_pct"] is not None]
    by_7d.sort(key=lambda s: s["return_7d_pct"], reverse=True)
    by_change = [s for s in stocks if s["change_pct"] is not None]
    by_change.sort(key=lambda s: s["change_pct"], reverse=True)

    # Internal links: same scoring class first, then the same broad family
    # (banks / NBFIs / insurers read as neighbours), then the biggest of the rest.
    self_class = summary["sector_class"]
    self_financial = self_class in _FINANCIAL_CLASSES
    others = [e["summary"] for s, e in index["sectors"].items() if s != summary["slug"]]
    others.sort(
        key=lambda o: (
            o["sector_class"] != self_class,
            (o["sector_class"] in _FINANCIAL_CLASSES) != self_financial,
            -(o["total_mcap_mn"] or 0),
        )
    )

    return {
        "summary": summary,
        "market": market,
        "comparison": comparison,
        "scoring_note": CLASS_NOTES.get(summary["sector_class"], CLASS_NOTES["GENERAL"]),
        "stocks": stocks,
        "top_dividend": by_yield[:5],
        "gainers": by_change[:3],
        "losers": list(reversed(by_change[-3:])) if len(by_change) > 3 else [],
        "week_leaders": by_7d[:3],
        "related_sectors": others[:6],
    }
