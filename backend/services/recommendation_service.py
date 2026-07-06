"""
Stock Recommendation engine.

Takes a few quiz answers and returns the 3 best-matching stocks, each with a
short plain-language reason. Pure (no auth) so the router and any caller can use
it. Logic lives here; the router stays thin (mirrors scores.py / stock_lists.py).

Pipeline:
  1. Assemble an enriched per-stock universe (cached 300s) from the scores
     snapshot + latest prices + company names.
  2. Stage A — hard eligibility filters (always drop stale / avoid-tier; apply
     sector, budget and dividend-required filters).
  3. Stage B — weighted ranking whose weights shift with the user's answers.
  4. Stage C — progressive relaxation (budget -> dividend -> sector) until at
     least 3 stocks qualify; take the top 3.
"""
import math
from datetime import datetime, timezone

from backend.services.db_service import load_companies, load_latest_prices, _ttl_cache
from backend.services.scoring_service import build_scores_df
from backend.services.tiers import GOOD, AVERAGE, tier_key


# Allowed answer values (kept in sync with the router's validators).
TIMELINES = {"short", "long"}
STRATEGIES = {"fundamental_strong", "market_trending"}
DIVIDENDS = {"income_focused", "doesnt_matter"}
VALUATIONS = {"value", "growth", "any"}
BUDGETS = {"under_50", "50_to_200", "any"}
RISKS = {"steady", "balanced", "aggressive"}
SIZES = {"large", "any", "small"}

# How many picks the quiz returns. Kept in sync with the daily-picks feed so the
# two surfaces feel like one feature.
N_RECOMMEND = 5


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _tier_of(score: float | None) -> str | None:
    """Canonical tiers — see backend/services/tiers.py."""
    if score is None:
        return None
    return tier_key(score)


# ---------------------------------------------------------------------------
# Universe assembly (cached)
# ---------------------------------------------------------------------------

@_ttl_cache(300)
def _build_universe() -> dict:
    """Enriched per-stock rows + the universe volume median (for momentum
    normalisation). Cached so concurrent quizzes share one build."""
    df = build_scores_df()
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    rows: list[dict] = []
    if not df.empty:
        for r in df.to_dict("records"):
            code = r["trading_code"]
            comp = companies.get(code, {})
            p = prices.get(code, {})
            rows.append({
                "trading_code": code,
                "company_name": comp.get("company_name"),
                "sector": _safe(r.get("sector")),
                "score": _safe(r.get("score")),
                "ltp": _safe(r.get("ltp")),
                "mcap_mn": _safe(r.get("mcap_mn")),
                "change_pct": _safe(p.get("change_pct")),
                "volume": _safe(p.get("volume")),
                "div_yield_pct": _safe(r.get("div_yield_pct")),
                "eps_yoy_pct": _safe(r.get("eps_yoy_pct")),
                "p1_biz": _safe(r.get("p1_biz")),
                "p2_health": _safe(r.get("p2_health")),
                "p3_moat": _safe(r.get("p3_moat")),
                "p4_val": _safe(r.get("p4_val")),
                "p5_div": _safe(r.get("p5_div")),
                "stale_data": bool(r.get("stale_data")) if r.get("stale_data") is not None else False,
            })

    vols = [r["volume"] for r in rows if r["volume"] and r["volume"] > 0]
    vol_median = sorted(vols)[len(vols) // 2] if vols else 0.0

    # Market-cap terciles drive the "company size" preference (blue chip vs
    # smaller). Computed once over the universe so size is relative to the
    # market, not an absolute taka cutoff.
    mcaps = sorted(r["mcap_mn"] for r in rows if r.get("mcap_mn") and r["mcap_mn"] > 0)

    def _pct(p: float) -> float:
        if not mcaps:
            return 0.0
        return mcaps[min(len(mcaps) - 1, int(len(mcaps) * p))]

    return {
        "rows": rows,
        "vol_median": vol_median,
        "mcap_p33": _pct(0.33),
        "mcap_p66": _pct(0.66),
    }


# ---------------------------------------------------------------------------
# Stage A — eligibility
# ---------------------------------------------------------------------------

def _selected_sectors(answers: dict) -> set[str]:
    return {s.strip().lower() for s in (answers.get("sectors") or []) if s and s.strip()}


def _eligible(row: dict, answers: dict, drop: set[str]) -> bool:
    score = row.get("score")
    # Always: usable score, not stale, not bottom "weak" tier.
    if score is None or row.get("stale_data"):
        return False

    # "Steady" risk-takers should not be shown weak names — lift the score floor
    # from the baseline average-tier cutoff to the Good tier. Relaxable if too few qualify.
    floor = AVERAGE
    if "risk" not in drop and answers.get("risk") == "steady":
        floor = GOOD
    if score < floor:
        return False

    if "sector" not in drop:
        wanted = _selected_sectors(answers)
        if wanted and (row.get("sector") or "").strip().lower() not in wanted:
            return False

    if "budget" not in drop:
        budget = answers.get("budget")
        ltp = row.get("ltp")
        if budget == "under_50":
            if ltp is None or ltp >= 50:
                return False
        elif budget == "50_to_200":
            if ltp is None or ltp < 50 or ltp > 200:
                return False

    if "dividend" not in drop and answers.get("dividend") == "income_focused":
        dy = row.get("div_yield_pct")
        if not (dy and dy > 0):
            return False

    return True


# ---------------------------------------------------------------------------
# Stage B — weighted ranking
# ---------------------------------------------------------------------------

def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _normalized(row: dict, vol_median: float, mcap_terc: tuple[float, float] = (0.0, 0.0)) -> dict:
    """Each contributing metric mapped to 0..1."""
    def num(key):
        v = row.get(key)
        return float(v) if v is not None else 0.0

    change = num("change_pct")
    vol = num("volume")

    # Company size, relative to the market's mcap terciles.
    mcap = num("mcap_mn")
    p33, p66 = mcap_terc
    if p66 > p33 > 0:
        mcap_large = _clamp((mcap - p33) / (p66 - p33))
    elif p66 > 0:
        mcap_large = _clamp(mcap / p66)
    else:
        mcap_large = 0.0

    return {
        "score": _clamp(num("score") / 100.0),
        "p1_biz": _clamp(num("p1_biz") / 10.0),
        "p2_health": _clamp(num("p2_health") / 10.0),
        "p3_moat": _clamp(num("p3_moat") / 10.0),
        "p4_val": _clamp(num("p4_val") / 10.0),
        "p5_div": _clamp(num("p5_div") / 10.0),
        "div_yield_pct": _clamp(num("div_yield_pct") / 8.0),       # 8% = full marks
        "eps_yoy_pct": _clamp(num("eps_yoy_pct") / 50.0),          # +50% YoY = full marks
        "change_pct": _clamp((change + 10.0) / 20.0),              # -10%..+10% -> 0..1
        "volume": _clamp(vol / (vol_median * 3.0)) if vol_median > 0 else 0.0,
        "low_volatility": _clamp(1.0 - abs(change) / 10.0),        # calm day = high
        "mcap_large": mcap_large,
        "mcap_small": 1.0 - mcap_large,
    }


def _weights(answers: dict) -> dict:
    """Metric -> weight, accumulated from the answers. timeline and strategy are
    always set, so weights are never empty.

    timeline and strategy are deliberately given *distinct* weights (not the same
    fundamental/momentum switch) so mixed answers — e.g. long horizon but
    trend-driven — produce a nuanced blend rather than collapsing to one of two
    profiles."""
    w: dict[str, float] = {}

    def add(metric, amount):
        w[metric] = w.get(metric, 0.0) + amount

    # Timeline = how long they hold (horizon emphasis).
    if answers.get("timeline") == "long":
        add("p3_moat", 0.20)   # durable advantage matters over years
        add("p5_div", 0.10)    # compounding income
        add("score", 0.10)
    elif answers.get("timeline") == "short":
        add("change_pct", 0.25)
        add("volume", 0.15)

    # Strategy = quality vs trending (distinct dial from timeline).
    if answers.get("strategy") == "fundamental_strong":
        add("score", 0.20)
        add("p1_biz", 0.15)
        add("p2_health", 0.10)
    elif answers.get("strategy") == "market_trending":
        add("change_pct", 0.20)
        add("volume", 0.15)

    # Risk comfort.
    risk = answers.get("risk")
    if risk == "steady":
        add("p2_health", 0.15)
        add("score", 0.10)
        add("low_volatility", 0.10)
    elif risk == "aggressive":
        add("change_pct", 0.15)
        add("volume", 0.10)

    # Company size.
    size = answers.get("size")
    if size == "large":
        add("mcap_large", 0.15)
    elif size == "small":
        add("mcap_small", 0.15)

    if answers.get("dividend") == "income_focused":
        add("p5_div", 0.20)
        add("div_yield_pct", 0.15)

    if answers.get("valuation") == "value":
        add("p4_val", 0.20)
    elif answers.get("valuation") == "growth":
        add("eps_yoy_pct", 0.20)

    return w


def _match_score(row: dict, answers: dict, vol_median: float,
                 mcap_terc: tuple[float, float] = (0.0, 0.0)) -> float:
    weights = _weights(answers)
    norm = _normalized(row, vol_median, mcap_terc)
    total = sum(weights.values()) or 1.0
    raw = sum(weights[m] * norm.get(m, 0.0) for m in weights)
    return round(raw / total * 100.0, 1)


# ---------------------------------------------------------------------------
# Reasons — plain language, never "DSEF"
# ---------------------------------------------------------------------------

def _reasons_for_pick(row: dict, answers: dict, ctx: dict | None = None) -> list[str]:
    reasons: list[str] = []
    score = row.get("score") or 0
    sectors = _selected_sectors(answers)
    sector = row.get("sector")

    if sectors and sector and sector.strip().lower() in sectors:
        reasons.append(f"In the {sector} sector you picked.")

    dy = row.get("div_yield_pct")
    if answers.get("dividend") == "income_focused" and dy and dy > 0:
        reasons.append(f"Pays a {dy:.1f}% dividend — good for steady income.")

    p4 = row.get("p4_val") or 0
    if answers.get("valuation") == "value" and p4 >= 7:
        reasons.append("Priced cheaper than its usual history right now.")

    eps_yoy = row.get("eps_yoy_pct")
    if answers.get("valuation") == "growth" and eps_yoy is not None and eps_yoy >= 10:
        reasons.append(f"Profit grew {round(eps_yoy)}% over the last year.")

    long_or_fundamental = answers.get("timeline") == "long" or answers.get("strategy") == "fundamental_strong"
    if long_or_fundamental and (score >= 70 or (row.get("p1_biz") or 0) >= 7) and len(reasons) < 2:
        reasons.append("Strong, consistent business fundamentals.")

    short_or_trending = answers.get("timeline") == "short" or answers.get("strategy") == "market_trending"
    change = row.get("change_pct")
    if short_or_trending and change and change > 0 and len(reasons) < 2:
        reasons.append(f"Positive recent momentum — up {change:.1f}% today.")

    risk = answers.get("risk")
    p2 = row.get("p2_health") or 0
    if risk == "steady" and p2 >= 7 and len(reasons) < 2:
        reasons.append("Financially solid — built to ride out rough patches.")

    size = answers.get("size")
    mcap = row.get("mcap_mn")
    if ctx and size and mcap is not None and len(reasons) < 2:
        if size == "large" and ctx.get("mcap_p66") and mcap >= ctx["mcap_p66"]:
            reasons.append("A large, established company.")
        elif size == "small" and ctx.get("mcap_p33") and mcap <= ctx["mcap_p33"]:
            reasons.append("A smaller company with room to grow.")

    if not reasons:
        reasons.append(f"One of the best overall matches for your answers (grade {round(score)}/100).")

    return reasons[:2]


# ---------------------------------------------------------------------------
# Stage C — selection with progressive relaxation
# ---------------------------------------------------------------------------

# Drop order: budget first, then the steady-risk score floor, then the dividend
# ask; sector preference is the last thing we relax.
_RELAXATION_STEPS: list[set[str]] = [
    set(),
    {"budget"},
    {"budget", "risk"},
    {"budget", "risk", "dividend"},
    {"budget", "risk", "dividend", "sector"},
]


def build_recommendation(answers: dict) -> dict:
    """Returns a RecommendationResponse-shaped dict (no auth / persistence)."""
    universe = _build_universe()
    rows = universe["rows"]
    vol_median = universe["vol_median"]
    mcap_terc = (universe["mcap_p33"], universe["mcap_p66"])
    ctx = {"mcap_p33": universe["mcap_p33"], "mcap_p66": universe["mcap_p66"]}

    eligible: list[dict] = []
    chosen_drop: set[str] = set()
    for drop in _RELAXATION_STEPS:
        eligible = [r for r in rows if _eligible(r, answers, drop)]
        chosen_drop = drop
        if len(eligible) >= N_RECOMMEND:
            break

    # Score each eligible stock once (don't mutate the cached rows), then rank:
    # match desc, raw score desc, code asc for deterministic tie-breaks.
    scored = [(_match_score(r, answers, vol_median, mcap_terc), r) for r in eligible]
    scored.sort(key=lambda t: (-t[0], -(t[1].get("score") or 0), t[1]["trading_code"]))
    top = scored[:N_RECOMMEND]

    from backend.services.signal_service import build_signals, wire_fields
    signals = build_signals()

    picks = []
    for match, r in top:
        score = r.get("score")
        picks.append({
            "trading_code": r["trading_code"],
            "company_name": r.get("company_name"),
            "sector": r.get("sector"),
            "score": score,
            "tier": _tier_of(score),
            "signal": wire_fields(signals.get(r["trading_code"])),
            "ltp": r.get("ltp"),
            "change_pct": r.get("change_pct"),
            "div_yield_pct": r.get("div_yield_pct"),
            "eps_yoy_pct": r.get("eps_yoy_pct"),
            "p1_biz": r.get("p1_biz"),
            "p3_moat": r.get("p3_moat"),
            "p4_val": r.get("p4_val"),
            "p5_div": r.get("p5_div"),
            "match_score": match,
            "reasons": _reasons_for_pick(r, answers, ctx),
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "answers_echo": dict(answers),
        "relaxations": sorted(chosen_drop),
        "saved": False,
        "picks": picks,
    }
