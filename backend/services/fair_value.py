"""
Grounded fair-value estimator — the live "value today" box beside the
deep-analysis report.

The deep-analysis narrative is written to be DURABLE (no price, no verdict, no
fair-value figure). Everything price-relative is computed here, live at serve
time, so the report never goes stale. This module is the single source of that
figure; the report writer merely explains the method in words.

Approach: a few simple, explainable, sector-appropriate methods, each returning
a per-share price, blended into a low-high band + a cheap/fair/expensive stance.
When there is no sensible basis (loss-making with no book/dividend anchor, or
too little data) it returns ``None`` and the UI shows soft language instead.

This is a rough educational estimate, NOT a price target — the app's actual
Buy/Sell call stays in ``backend/services/signal_service.py``.

(The standalone CLI ``scripts/deep_analysis/fair_value.py`` imports
``estimate_fair_value`` from here so there is only one implementation.)
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

# Plain-English label per method — carried through so the value box can explain
# the "why" without inventing it.
_LABELS = {
    "own_history_pe": "Its own usual price vs profit",
    "peer_pe": "Priced like similar companies (profit)",
    "book_own": "Its own usual price vs asset value",
    "book_peer": "Priced like similar companies (assets)",
    "dividend_yield": "Based on the dividend it pays",
}

# Everyday-Bengali mirror of each label (Western digits, no jargon).
_LABELS_BN = {
    "own_history_pe": "মুনাফার তুলনায় এর নিজের চিরাচরিত দাম",
    "peer_pe": "একই ধরনের কোম্পানির মতো দাম (মুনাফা)",
    "book_own": "সম্পদমূল্যের তুলনায় এর নিজের চিরাচরিত দাম",
    "book_peer": "একই ধরনের কোম্পানির মতো দাম (সম্পদ)",
    "dividend_yield": "এর দেওয়া ডিভিডেন্ডের ভিত্তিতে",
}


# Peer-P/E price kept within this factor of the own-history-P/E price.
PEER_CAP = 1.5


def _weighted_median(pairs: list[tuple[float, float]]) -> Optional[float]:
    """Weighted median of (value, weight); the midpoint when the 50% mark falls
    exactly between two values (so two equally weighted methods average)."""
    pts = sorted((v, w) for v, w in pairs if w > 0)
    if not pts:
        return None
    total = sum(w for _, w in pts)
    acc = 0.0
    for i, (v, w) in enumerate(pts):
        acc += w
        if abs(acc - total / 2) < 1e-9 and i + 1 < len(pts):
            return (v + pts[i + 1][0]) / 2
        if acc > total / 2:
            return v
    return pts[-1][0]


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
    is possible (the UI then falls back to soft language).

    Shape::

        {
          "low": float, "high": float, "center": float, "today": float|None,
          "stance": "cheap" | "fair" | "expensive" | None,
          "confidence": "low" | "medium" | "high",
          "methods": [{"name", "label_en", "label_bn", "price"}, ...],
          "basis_en": str, "basis_bn": str,
        }
    """
    if not score_row:
        return None

    company = company or {}
    # `eps` on the score row is the earnings the price is judged on — TTM when a
    # quarterly report is newer than the audited year (scoring_service).
    eps = score_row.get("eps")
    own_pe = score_row.get("own_avg_pe")
    peer_pe = score_row.get("sector_median_pe")
    own_pb = score_row.get("own_avg_pb")
    peer_pb = score_row.get("sector_median_pb")
    cur_pb = score_row.get("current_pb")
    p5_consist = score_row.get("p5_consist")

    # NAV per share (book value): the latest one the score used (interim when
    # newer), else the reported figure, else backed out of price / P/B.
    nav = score_row.get("nav_ps")
    if not _pos(nav):
        nav = _latest_fin_value(financials, "nav_per_share")
    if not _pos(nav) and _pos(cur_pb) and _pos(ltp):
        nav = ltp / cur_pb

    # Dividend per share: the latest fiscal year's total (interim + final), as
    # scored; else the most recent cash dividend % in the audited table.
    face = company.get("face_value")
    face = face if _pos(face) else 10.0  # DSE face value is Tk 10 unless stated
    dps = score_row.get("div_latest_dps")
    if not _pos(dps):
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
        return None  # no sensible basis -> soft-language fallback in the UI

    # The peer method is the outlier-maker: a sector median P/E of 20 on a fuel
    # distributor that has always traded at 5 turned JAMUNAOIL into "worth
    # ৳1,158". Keep it within PEER_CAP of the company's own-history figure.
    if "peer_pe" in methods and "own_history_pe" in methods:
        own = methods["own_history_pe"]
        methods["peer_pe"] = max(own / PEER_CAP, min(own * PEER_CAP, methods["peer_pe"]))

    weights = _WEIGHTS_FINANCIAL if sector_class in _FINANCIAL_CLASSES else _WEIGHTS_GENERAL
    # Weighted MEDIAN, not mean: one wild method can no longer drag the centre.
    center = _weighted_median([(price, weights.get(name, 0.5)) for name, price in methods.items()])
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

    # What the estimate alone says…
    estimate_stance = None
    if _pos(ltp):
        if ltp < low:
            estimate_stance = "cheap"
        elif ltp > high:
            estimate_stance = "expensive"
        else:
            estimate_stance = "fair"
    # …but the badge is the page's ONE valuation verdict (the P4 pillar, the same
    # bands the Buy/Sell signal uses), so the Value box can never say "Looks
    # cheap" beside a Health Check that says "Looks costly" (BATBC).
    from backend.services.stock_facts import valuation_verdict
    stance = valuation_verdict(score_row.get("p4_val")) or estimate_stance
    # Any mismatch counts: "Around fair value" over an estimate 2.6x today's
    # price (WALTONHIL ৳886 vs ৳337) reads as a contradiction just the same.
    disagree = estimate_stance is not None and stance is not None and estimate_stance != stance

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
    if disagree:
        confidence = "low"

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
        "estimate_stance": estimate_stance,
        # True when the rough estimate points the opposite way to the verdict —
        # the box then says the yardsticks disagree instead of printing a
        # centre figure that contradicts its own badge.
        "estimates_disagree": disagree,
        "confidence": confidence,
        "methods": [
            {
                "name": name,
                "label_en": _LABELS.get(name, name),
                "label_bn": _LABELS_BN.get(name, name),
                "price": _round_price(price),
            }
            for name, price in methods.items()
        ],
        "basis_en": basis_en,
        "basis_bn": basis_bn,
    }
