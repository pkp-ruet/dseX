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


# Allowed answer values (kept in sync with the router's validators).
TIMELINES = {"short", "long"}
STRATEGIES = {"fundamental_strong", "market_trending"}
DIVIDENDS = {"income_focused", "doesnt_matter"}
VALUATIONS = {"value", "growth", "any"}
BUDGETS = {"under_50", "50_to_200", "any"}


def _safe(v):
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _tier_of(score: float | None) -> str | None:
    """Same thresholds as routers/scores.py."""
    if score is None:
        return None
    if score >= 75:
        return "strong_buy"
    if score >= 55:
        return "safe_buy"
    if score >= 35:
        return "watch"
    return "avoid"


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
    return {"rows": rows, "vol_median": vol_median}


# ---------------------------------------------------------------------------
# Stage A — eligibility
# ---------------------------------------------------------------------------

def _selected_sectors(answers: dict) -> set[str]:
    return {s.strip().lower() for s in (answers.get("sectors") or []) if s and s.strip()}


def _eligible(row: dict, answers: dict, drop: set[str]) -> bool:
    score = row.get("score")
    # Always: usable score, not stale, not bottom "avoid" tier.
    if score is None or row.get("stale_data"):
        return False
    if score < 35:
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


def _normalized(row: dict, vol_median: float) -> dict:
    """Each contributing metric mapped to 0..1."""
    def num(key):
        v = row.get(key)
        return float(v) if v is not None else 0.0

    change = num("change_pct")
    vol = num("volume")
    return {
        "score": _clamp(num("score") / 100.0),
        "p1_biz": _clamp(num("p1_biz") / 10.0),
        "p3_moat": _clamp(num("p3_moat") / 10.0),
        "p4_val": _clamp(num("p4_val") / 10.0),
        "p5_div": _clamp(num("p5_div") / 10.0),
        "div_yield_pct": _clamp(num("div_yield_pct") / 8.0),       # 8% = full marks
        "eps_yoy_pct": _clamp(num("eps_yoy_pct") / 50.0),          # +50% YoY = full marks
        "change_pct": _clamp((change + 10.0) / 20.0),              # -10%..+10% -> 0..1
        "volume": _clamp(vol / (vol_median * 3.0)) if vol_median > 0 else 0.0,
    }


def _weights(answers: dict) -> dict:
    """Metric -> weight, accumulated from the answers. timeline is always set so
    one of the first two branches always fires (weights never empty)."""
    w: dict[str, float] = {}

    def add(metric, amount):
        w[metric] = w.get(metric, 0.0) + amount

    long_or_fundamental = answers.get("timeline") == "long" or answers.get("strategy") == "fundamental_strong"
    short_or_trending = answers.get("timeline") == "short" or answers.get("strategy") == "market_trending"

    if long_or_fundamental:
        add("score", 0.30)
        add("p1_biz", 0.15)
        add("p3_moat", 0.15)
        add("p4_val", 0.10)
    if short_or_trending:
        add("change_pct", 0.40)
        add("volume", 0.20)

    if answers.get("dividend") == "income_focused":
        add("p5_div", 0.20)
        add("div_yield_pct", 0.15)

    if answers.get("valuation") == "value":
        add("p4_val", 0.20)
    elif answers.get("valuation") == "growth":
        add("eps_yoy_pct", 0.20)

    return w


def _match_score(row: dict, answers: dict, vol_median: float) -> float:
    weights = _weights(answers)
    norm = _normalized(row, vol_median)
    total = sum(weights.values()) or 1.0
    raw = sum(weights[m] * norm.get(m, 0.0) for m in weights)
    return round(raw / total * 100.0, 1)


# ---------------------------------------------------------------------------
# Reasons — plain language, never "DSEF"
# ---------------------------------------------------------------------------

def _reasons_for_pick(row: dict, answers: dict) -> list[str]:
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

    if not reasons:
        reasons.append(f"One of the best overall matches for your answers (grade {round(score)}/100).")

    return reasons[:2]


# ---------------------------------------------------------------------------
# Stage C — selection with progressive relaxation
# ---------------------------------------------------------------------------

# Drop order: keep the user's explicit dividend ask longer than budget; sector
# is the last thing we relax.
_RELAXATION_STEPS: list[set[str]] = [
    set(),
    {"budget"},
    {"budget", "dividend"},
    {"budget", "dividend", "sector"},
]


def build_recommendation(answers: dict) -> dict:
    """Returns a RecommendationResponse-shaped dict (no auth / persistence)."""
    universe = _build_universe()
    rows = universe["rows"]
    vol_median = universe["vol_median"]

    eligible: list[dict] = []
    chosen_drop: set[str] = set()
    for drop in _RELAXATION_STEPS:
        eligible = [r for r in rows if _eligible(r, answers, drop)]
        chosen_drop = drop
        if len(eligible) >= 3:
            break

    # Score each eligible stock once (don't mutate the cached rows), then rank:
    # match desc, raw score desc, code asc for deterministic tie-breaks.
    scored = [(_match_score(r, answers, vol_median), r) for r in eligible]
    scored.sort(key=lambda t: (-t[0], -(t[1].get("score") or 0), t[1]["trading_code"]))
    top = scored[:3]

    picks = []
    for match, r in top:
        score = r.get("score")
        picks.append({
            "trading_code": r["trading_code"],
            "company_name": r.get("company_name"),
            "sector": r.get("sector"),
            "score": score,
            "tier": _tier_of(score),
            "ltp": r.get("ltp"),
            "change_pct": r.get("change_pct"),
            "div_yield_pct": r.get("div_yield_pct"),
            "eps_yoy_pct": r.get("eps_yoy_pct"),
            "p1_biz": r.get("p1_biz"),
            "p3_moat": r.get("p3_moat"),
            "p4_val": r.get("p4_val"),
            "p5_div": r.get("p5_div"),
            "match_score": match,
            "reasons": _reasons_for_pick(r, answers),
        })

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "answers_echo": dict(answers),
        "relaxations": sorted(chosen_drop),
        "saved": False,
        "picks": picks,
    }
