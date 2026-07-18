"""
Grounded fair-value estimator for the deep-analysis reports.

The deep-analysis report prints an explicit "rough fair value" range in taka
(e.g. "Fair value ~ Tk 180-200, today Tk 215"). That number must be COMPUTED
from data we already have — never guessed by the language model. This module is
the only place the figure is produced; the report writer merely explains it.

Approach: a few simple, explainable, sector-appropriate methods, each returning
a per-share price, blended into a low-high band + a cheap/fair/expensive stance.
When there is no sensible basis (loss-making with no book/dividend anchor, or too
little data) it returns ``None`` and the report falls back to soft language.

This is a rough educational estimate, not a price target — the app's actual
Buy/Sell call stays in ``backend/services/signal_service.py``.

Run standalone to inspect one stock (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/fair_value.py --code GP
"""
import math
from typing import Optional

# A "fair" dividend yield anchor for the dividend-based method: at this yield the
# share is considered fairly priced for its payout. ~6% sits in the middle of the
# range reliable DSE dividend payers trade at.
FAIR_DIVIDEND_YIELD = 0.06

_FINANCIAL_CLASSES = {"BANK", "NBFI", "INSURANCE"}

# Per-method blend weights. Banks / insurers / NBFIs are valued on book (assets),
# so their book methods dominate; industrials lean on earnings.
_WEIGHTS_GENERAL = {
    "own_history_pe": 1.0, "peer_pe": 1.0,
    "book_own": 0.5, "book_peer": 0.5,
    "dividend_yield": 0.5,
}
_WEIGHTS_FINANCIAL = {
    "book_own": 1.0, "book_peer": 1.0,
    "own_history_pe": 0.6, "peer_pe": 0.6,
    "dividend_yield": 0.6,
}

# Which methods are meaningful per class. Cross-company price-to-book (`book_peer`)
# only makes sense for asset-heavy financials — applying a sector-median P/B to an
# asset-light general company (telecom, pharma, IT) produces a nonsense anchor, so
# it is excluded there (its own P/B history, `book_own`, is still self-consistent).
_ELIGIBLE_GENERAL = {"own_history_pe", "peer_pe", "book_own", "dividend_yield"}
_ELIGIBLE_FINANCIAL = {"own_history_pe", "peer_pe", "book_own", "book_peer", "dividend_yield"}

# Plain-English label per method — carried into the fact pack so the report can
# explain the "why" without inventing it. (The report writer localises to Bengali.)
_LABELS = {
    "own_history_pe": "Its own usual price vs profit",
    "peer_pe": "Priced like similar companies (profit)",
    "book_own": "Its own usual price vs asset value",
    "book_peer": "Priced like similar companies (assets)",
    "dividend_yield": "Based on the dividend it pays",
}


def _pos(x) -> bool:
    """True for a real, finite, positive number."""
    return (
        isinstance(x, (int, float))
        and not (isinstance(x, float) and (math.isnan(x) or math.isinf(x)))
        and x > 0
    )


def _latest_fin_value(financials: Optional[list], field: str):
    """Most recent non-null value of ``field`` across the financial years (asc)."""
    if not financials:
        return None
    for row in reversed(financials):
        v = row.get(field)
        if v is not None and not (isinstance(v, float) and math.isnan(v)):
            return v
    return None


def _round_price(x) -> Optional[float]:
    if not isinstance(x, (int, float)) or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return None
    if x >= 100:
        return round(x)
    if x >= 10:
        return round(x, 1)
    return round(x, 2)


def _join_en(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " and " + items[-1]


def _join_bn(items: list[str]) -> str:
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    return ", ".join(items[:-1]) + " এবং " + items[-1]


def estimate_fair_value(
    score_row: Optional[dict],
    financials: Optional[list],
    company: Optional[dict],
    ltp: Optional[float],
    sector_class: str = "GENERAL",
) -> Optional[dict]:
    """Return a grounded fair-value block, or ``None`` when no sensible estimate
    is possible (the report then falls back to soft language).

    Shape::

        {
          "low": float, "high": float, "center": float, "today": float|None,
          "stance": "cheap" | "fair" | "expensive" | None,
          "confidence": "low" | "medium" | "high",
          "methods": [{"name", "label_en", "price"}, ...],
          "basis_en": str, "basis_bn": str,
        }
    """
    if not score_row:
        return None

    company = company or {}
    eps = score_row.get("eps")
    own_pe = score_row.get("own_avg_pe")
    peer_pe = score_row.get("sector_median_pe")
    own_pb = score_row.get("own_avg_pb")
    peer_pb = score_row.get("sector_median_pb")
    cur_pb = score_row.get("current_pb")
    p5_consist = score_row.get("p5_consist")

    # NAV per share (book value): prefer the reported figure, else back it out of
    # today's price and the current price-to-book.
    nav = _latest_fin_value(financials, "nav_per_share")
    if not _pos(nav) and _pos(cur_pb) and _pos(ltp):
        nav = ltp / cur_pb

    # Dividend per share from the most recent cash dividend %.
    face = company.get("face_value")
    face = face if _pos(face) else 10.0  # DSE face value is Tk 10 unless stated
    cash_div_pct = _latest_fin_value(financials, "cash_dividend_pct")
    dps = (cash_div_pct * face / 100.0) if _pos(cash_div_pct) else None

    eligible = _ELIGIBLE_FINANCIAL if sector_class in _FINANCIAL_CLASSES else _ELIGIBLE_GENERAL
    methods: dict[str, float] = {}
    if "own_history_pe" in eligible and _pos(own_pe) and _pos(eps):
        methods["own_history_pe"] = own_pe * eps
    if "peer_pe" in eligible and _pos(peer_pe) and _pos(eps):
        methods["peer_pe"] = peer_pe * eps
    if "book_own" in eligible and _pos(own_pb) and _pos(nav):
        methods["book_own"] = own_pb * nav
    if "book_peer" in eligible and _pos(peer_pb) and _pos(nav):
        methods["book_peer"] = peer_pb * nav
    # Dividend method only for companies that actually pay a reasonably reliable
    # dividend (avoids anchoring on a one-off payout).
    if "dividend_yield" in eligible and _pos(dps) and (p5_consist is None or p5_consist >= 5):
        methods["dividend_yield"] = dps / FAIR_DIVIDEND_YIELD

    if not methods:
        return None  # no sensible basis -> soft-language fallback in the report

    weights = _WEIGHTS_FINANCIAL if sector_class in _FINANCIAL_CLASSES else _WEIGHTS_GENERAL
    num = den = 0.0
    for name, price in methods.items():
        w = weights.get(name, 0.5)
        num += w * price
        den += w
    center = num / den if den else sum(methods.values()) / len(methods)
    if not _pos(center):
        return None

    prices = list(methods.values())
    if len(prices) == 1:
        band = 0.12  # single method -> express honest uncertainty
    else:
        dispersion = (max(prices) - min(prices)) / (2 * center)
        band = min(0.20, max(0.05, dispersion))
    low = center * (1 - band)
    high = center * (1 + band)

    stance = None
    if _pos(ltp):
        if ltp < low:
            stance = "cheap"
        elif ltp > high:
            stance = "expensive"
        else:
            stance = "fair"

    # Confidence from how many methods agree (and how tightly), softened by data
    # completeness.
    spread = (max(prices) - min(prices)) / center if len(prices) > 1 else 0.0
    n = len(prices)
    if n >= 3 and spread < 0.15:
        confidence = "high"
    elif n >= 2 and spread < 0.35:
        confidence = "medium"
    else:
        confidence = "low"
    dc = score_row.get("data_completeness")
    if isinstance(dc, (int, float)) and dc < 0.5 and confidence == "high":
        confidence = "medium"

    # Human-readable basis (both languages) — which anchors were actually used.
    uses_en: list[str] = []
    uses_bn: list[str] = []
    if "own_history_pe" in methods:
        uses_en.append("its own past price levels")
        uses_bn.append("অতীতে এর নিজের দামের ধরন")
    if "peer_pe" in methods:
        uses_en.append("what similar companies trade at")
        uses_bn.append("একই ধরনের কোম্পানির দাম")
    if "book_own" in methods or "book_peer" in methods:
        uses_en.append("the value of what it owns")
        uses_bn.append("এর সম্পদের মূল্য")
    if "dividend_yield" in methods:
        uses_en.append("the dividend it pays")
        uses_bn.append("এর দেওয়া ডিভিডেন্ড")
    basis_en = "Based on " + _join_en(uses_en) + "."
    basis_bn = _join_bn(uses_bn) + " বিবেচনা করে।"

    return {
        "low": _round_price(low),
        "high": _round_price(high),
        "center": _round_price(center),
        "today": _round_price(ltp) if _pos(ltp) else None,
        "stance": stance,
        "confidence": confidence,
        "methods": [
            {"name": name, "label_en": _LABELS.get(name, name), "price": _round_price(price)}
            for name, price in methods.items()
        ],
        "basis_en": basis_en,
        "basis_bn": basis_bn,
    }


# ---------------------------------------------------------------------------
# Standalone inspection: py scripts/deep_analysis/fair_value.py --code GP
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse
    import json
    import pathlib
    import sys

    sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2]))
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # box/Bengali chars on Windows
    except Exception:
        pass

    from backend.services.db_service import (  # noqa: E402
        get_company, load_latest_prices, load_financials, close_db,
    )
    from backend.services.scoring_service import get_company_score_row  # noqa: E402
    from utils.sector import normalize_sector  # noqa: E402

    parser = argparse.ArgumentParser(description="Inspect the fair-value estimate for one stock.")
    parser.add_argument("--code", required=True, help="Trading code, e.g. GP")
    args = parser.parse_args()

    code = args.code.strip().upper()
    try:
        company = get_company(code)
        if not company:
            print(f"Company '{code}' not found (or excluded).")
            raise SystemExit(1)
        score_row = get_company_score_row(code)
        financials = load_financials(code)
        ltp = (load_latest_prices().get(code) or {}).get("ltp")
        sector_class = normalize_sector(company.get("sector") or "")
        fv = estimate_fair_value(score_row, financials, company, ltp, sector_class)
        print(json.dumps(fv, indent=2, ensure_ascii=False))
    finally:
        close_db()
