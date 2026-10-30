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
from backend.services.tiers import TIER_KEYS, TIER_WORDS, TIER_WORDS_BN, tier_key
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
        "label_bn": "ব্যাংক",
        "en": (
            "Banks are scored with rules made for lenders. Instead of loans and interest cover, "
            "we look at how much of the bank's own capital stands behind its total assets. "
            "The interest margin takes the place of gross margin, and the cash-to-assets check "
            "is skipped, because a bank's balance sheet is mostly deposits, not spare cash."
        ),
        "bn": (
            "ব্যাংকের স্কোর ঋণদাতাদের জন্য তৈরি নিয়মে হয়। ঋণ আর সুদ পরিশোধের সক্ষমতার বদলে আমরা দেখি, "
            "মোট সম্পদের পেছনে ব্যাংকের নিজের মূলধন কতটা আছে। গ্রস মার্জিনের জায়গায় সুদের মার্জিন ধরা হয়, "
            "আর নগদ ও সম্পদের অনুপাত বাদ দেওয়া হয়, কারণ ব্যাংকের হিসাবের বেশির ভাগই আমানত, বাড়তি নগদ নয়।"
        ),
    },
    "NBFI": {
        "label": "Finance company",
        "label_bn": "আর্থিক প্রতিষ্ঠান",
        "en": (
            "DSE lists these under Financial Institutions. They are scored with the same rules "
            "as banks: the company's own capital against its assets instead of loans and interest "
            "cover, and the interest margin instead of gross margin. When the usual lines are "
            "missing, cash from the business is used instead."
        ),
        "bn": (
            "ডিএসই এদের আর্থিক প্রতিষ্ঠান হিসেবে তালিকাভুক্ত করে। এদের স্কোরও ব্যাংকের মতো একই নিয়মে হয়: "
            "ঋণ আর সুদ পরিশোধের সক্ষমতার বদলে সম্পদের তুলনায় নিজের মূলধন, আর গ্রস মার্জিনের বদলে সুদের মার্জিন। "
            "স্বাভাবিক হিসাবগুলো না থাকলে ব্যবসা থেকে আসা নগদ দেখা হয়।"
        ),
    },
    "INSURANCE": {
        "label": "Insurance",
        "label_bn": "বিমা",
        "en": (
            "Insurers have no gross-profit line, so the net margin is used instead, and the "
            "cash-to-assets check is skipped. This is the largest group of companies on DSE, "
            "and the one where figures are most often missing. When a figure is missing, the "
            "score is worked out from what the company did report."
        ),
        "bn": (
            "বিমা কোম্পানির হিসাবে গ্রস মুনাফা থাকে না, তাই নেট মার্জিন ব্যবহার করা হয়, আর নগদ ও সম্পদের "
            "অনুপাত বাদ দেওয়া হয়। ডিএসইতে এটিই সবচেয়ে বড় কোম্পানির দল, আর এখানেই তথ্য সবচেয়ে বেশি অনুপস্থিত থাকে। "
            "কোনো তথ্য না থাকলে কোম্পানি যা প্রকাশ করেছে, তা দিয়েই স্কোর হিসাব করা হয়।"
        ),
    },
    "GENERAL": {
        "label": "General industry",
        "label_bn": "সাধারণ শিল্প",
        "en": (
            "Scored on all five checks: how profit has grown and how steady it is, loans and "
            "interest cover, margins and spending on new assets, price against similar companies, "
            "and how regularly it pays dividends."
        ),
        "bn": (
            "পাঁচটি যাচাইয়েই স্কোর হয়: মুনাফা কতটা বেড়েছে ও কতটা স্থির, ঋণ ও সুদ পরিশোধের সক্ষমতা, "
            "মার্জিন ও নতুন সম্পদে খরচ, একই ধরনের কোম্পানির তুলনায় দাম, আর কত নিয়মিত ডিভিডেন্ড দেয়।"
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


# ---------------------------------------------------------------------------
# Our read of the sector this month (2026-10-31, the Premium Desk plan) —
# Premium on /sector/[slug] (screen-only). Pure builders + one shared read of
# DSE turnover; every sentence plain, at most three numbers.
# ---------------------------------------------------------------------------

# Turnover windows: the last 28 calendar days against the 28 before (about 4 weeks each).
FLOW_DAYS = 28
# A change in the sector's share of DSE turnover smaller than this (relative %)
# reads as "steady".
FLOW_BAND_PCT = 15.0
# The sector's middle "years of profit" within this (relative %) of the
# market's reads as "about the same".
VALUE_BAND_PCT = 10.0


@_ttl_cache(900, max_entries=2)
def _turnover_by_code() -> dict:
    """{"now": {code: Tk mn}, "before": {code: Tk mn}, "total_now", "total_before"}
    — one Mongo aggregation over 56 days of prices (string date bounds)."""
    from datetime import datetime, timedelta
    from backend.services.db_service import get_db

    today = datetime.utcnow()
    mid = (today - timedelta(days=FLOW_DAYS)).strftime("%Y-%m-%d")
    start = (today - timedelta(days=2 * FLOW_DAYS)).strftime("%Y-%m-%d")
    agg = get_db().stock_prices.aggregate([
        {"$match": {"date": {"$gte": start}, "value_mn": {"$gt": 0}}},
        {"$group": {"_id": {"c": "$trading_code", "now": {"$gte": ["$date", mid]}},
                    "v": {"$sum": "$value_mn"}}},
    ])
    now: dict[str, float] = {}
    before: dict[str, float] = {}
    for d in agg:
        (now if d["_id"]["now"] else before)[d["_id"]["c"]] = float(d["v"] or 0)
    return {"now": now, "before": before,
            "total_now": sum(now.values()), "total_before": sum(before.values())}


def money_flow(codes: list[str], turnover: dict) -> Optional[dict]:
    """The sector's share of DSE turnover over the last 4 weeks against the 4
    before: {share_now, share_before, change_pct, word: in | out | same}."""
    tn, tb = turnover.get("total_now") or 0, turnover.get("total_before") or 0
    if tn <= 0 or tb <= 0:
        return None
    now = sum(turnover["now"].get(c, 0.0) for c in codes)
    before = sum(turnover["before"].get(c, 0.0) for c in codes)
    sn, sb = now / tn * 100.0, before / tb * 100.0
    if sb <= 0:
        return None
    ch = (sn - sb) / sb * 100.0
    word = "in" if ch >= FLOW_BAND_PCT else "out" if ch <= -FLOW_BAND_PCT else "same"
    return {"share_now": round(sn, 1), "share_before": round(sb, 1), "change_pct": round(ch, 1), "word": word}


def _years(v: float) -> str:
    return f"{v:.0f}" if v >= 10 else f"{v:.1f}".rstrip("0").rstrip(".")


_PRICE_TAIL = {
    "cheaper": ("so the sector is cheaper than the market", "তাই সেক্টরটি বাজারের চেয়ে সস্তা"),
    "dearer": ("so the sector costs more than the market", "তাই সেক্টরটির দাম বাজারের চেয়ে বেশি"),
    "same": ("about the same as the market", "বাজারের প্রায় সমান"),
}


def sector_read(summary: dict, market: dict, stocks: list[dict], results: dict[str, str],
                flow: Optional[dict]) -> dict:
    """Three plain sentences (price · profit · money) + the best value in the
    sector today. ``stocks`` best score first; ``results`` = {code: level} of
    the latest reports (good / watch / bad / neutral)."""
    lines: list[dict] = []

    # 1 · The price: years of profit at the middle, against the whole market.
    spe, mpe = summary.get("median_pe"), market.get("median_pe")
    if spe and mpe and spe > 0 and mpe > 0:
        gap = (spe - mpe) / mpe * 100.0
        word = "cheaper" if gap <= -VALUE_BAND_PCT else "dearer" if gap >= VALUE_BAND_PCT else "same"
        en_tail, bn_tail = _PRICE_TAIL[word]
        lines.append({
            "key": "price", "tone": "good" if word == "cheaper" else "fair" if word == "dearer" else "neutral",
            "en": f"At the middle, its shares cost about {_years(spe)} years of profit, against {_years(mpe)} for the whole market, {en_tail}.",
            "bn": f"মাঝামাঝি হিসাবে এর শেয়ারের দাম প্রায় {_years(spe)} বছরের মুনাফার সমান, পুরো বাজারে {_years(mpe)} বছর, {bn_tail}।",
        })

    # 2 · Profit: what its companies' latest reports said.
    levels = [results[st["trading_code"]] for st in stocks if st["trading_code"] in results]
    if levels:
        n, up, down = len(levels), levels.count("good"), levels.count("bad")
        if up > down * 2 and up >= n / 3:
            tone, en_w, bn_w = "good", "Profit is mostly rising", "মুনাফা বেশিরভাগ ক্ষেত্রে বাড়ছে"
        elif down > up * 2 and down >= n / 3:
            tone, en_w, bn_w = "bad", "Profit is mostly falling", "মুনাফা বেশিরভাগ ক্ষেত্রে কমছে"
        else:
            tone, en_w, bn_w = "neutral", "Profit is mixed", "মুনাফা মিশ্র"
        lines.append({
            "key": "profit", "tone": tone,
            "en": f"{en_w}: of the {n} companies with a recent report, {up} did better than a year ago and {down} did worse.",
            "bn": f"{bn_w}: সাম্প্রতিক প্রতিবেদন দেওয়া {n}টি কোম্পানির মধ্যে {up}টি এক বছর আগের চেয়ে ভালো করেছে, {down}টি খারাপ।",
        })

    # 3 · Money: its share of DSE turnover, last 4 weeks against the 4 before.
    if flow:
        if flow["word"] == "in":
            tone, en_w, bn_w = "good", "Money is moving in", "টাকা ঢুকছে"
        elif flow["word"] == "out":
            tone, en_w, bn_w = "fair", "Money is moving out", "টাকা বেরিয়ে যাচ্ছে"
        else:
            tone, en_w, bn_w = "neutral", "Trading is steady", "লেনদেন স্থির"
        sn, sb = flow["share_now"], flow["share_before"]
        lines.append({
            "key": "money", "tone": tone,
            "en": f"{en_w}: it took {sn:.1f}% of all DSE trading in the last 4 weeks, against {sb:.1f}% in the 4 weeks before.",
            "bn": f"{bn_w}: গত 4 সপ্তাহে ডিএসইর মোট লেনদেনের {sn:.1f}% হয়েছে এই সেক্টরে, তার আগের 4 সপ্তাহে {sb:.1f}%।",
        })

    # The best value today: the highest graded Good-or-better company whose
    # price reads low (p4_val >= 7, the signal's "cheap" band).
    best = next((st for st in stocks if (st.get("p4_val") or 0) >= 7 and (st.get("score") or 0) >= 60), None)
    best_out = None
    if best:
        nm = (best.get("company_name") or best["trading_code"]).rstrip(". ")
        best_out = {
            "trading_code": best["trading_code"],
            "company_name": best.get("company_name"),
            "score": best.get("score"),
            "tier": best.get("tier"),
            "ltp": best.get("ltp"),
            "en": f"The best value in it today is {nm}: graded {TIER_WORDS[best['tier']].lower()}, at a low price for its profit.",
            "bn": f"আজ এই সেক্টরে সবচেয়ে ভালো দামে আছে {nm}: গ্রেড {TIER_WORDS_BN[best['tier']]}, মুনাফার তুলনায় দাম কম।",
        }
    return {"lines": lines, "best": best_out, "flow": flow, "reported": len(levels)}


def _results_levels() -> dict[str, str]:
    try:
        from backend.services.results_explainer import all_results
        return {r["code"]: r["level"] for r in all_results()}
    except Exception:  # noqa: BLE001
        return {}


def _read_for(summary: dict, market: dict, stocks: list[dict]) -> Optional[dict]:
    """Our read of the sector (Premium, screen-only); None when it can't be built."""
    try:
        try:
            flow = money_flow([st["trading_code"] for st in stocks], _turnover_by_code())
        except Exception:  # noqa: BLE001
            flow = None
        return sector_read(summary, market, stocks, _results_levels(), flow)
    except Exception:  # noqa: BLE001
        return None


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
            ("median_score", "Score out of 100", True),
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
        "read": _read_for(summary, market, stocks),
    }
