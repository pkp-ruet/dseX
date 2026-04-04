import math
from datetime import datetime, timezone
from fastapi import APIRouter
from backend.services.scoring_service import build_scores_df, invalidate_scores_cache
from backend.services.db_service import load_companies
from backend.models.responses import ScoresResponse, ScoreItem, ScoreTiers

router = APIRouter()


def _json_float(v):
    """JSON has no NaN/Inf — convert to None for API responses."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


@router.post("/api/scores/refresh")
def refresh_scores():
    """Invalidate the scores cache so the next request recomputes from DB."""
    invalidate_scores_cache()
    return {"status": "cache cleared"}


@router.get("/api/scores", response_model=ScoresResponse)
def get_scores():
    df = build_scores_df()
    companies = {c["trading_code"]: c for c in load_companies()}

    tiers: dict[str, list[ScoreItem]] = {
        "strong_buy": [], "safe_buy": [], "watch": [], "avoid": []
    }

    if not df.empty:
        scored = df[df["score"].notna()].sort_values("score", ascending=False)
        for _, row in scored.iterrows():
            code  = row["trading_code"]
            score = row["score"]
            comp  = companies.get(code, {})
            item = ScoreItem(
                trading_code=code,
                company_name=comp.get("company_name"),
                sector=row.get("sector"),
                score=_json_float(score),
                ltp=_json_float(row.get("ltp")),
                change_pct=None,
                eps_yoy_pct=_json_float(row.get("eps_yoy_pct")),
                div_yield_pct=_json_float(row.get("div_yield_pct")),
            )
            if score >= 75:
                tiers["strong_buy"].append(item)
            elif score >= 55:
                tiers["safe_buy"].append(item)
            elif score >= 35:
                tiers["watch"].append(item)
            else:
                tiers["avoid"].append(item)

    # Inject latest price change_pct
    from backend.services.db_service import load_latest_prices
    prices = load_latest_prices()
    for tier_list in tiers.values():
        for item in tier_list:
            p = prices.get(item.trading_code, {})
            item.change_pct = _json_float(p.get("change_pct"))

    return ScoresResponse(
        algorithm="DSEF",
        computed_at=datetime.now(timezone.utc).isoformat(),
        tiers=ScoreTiers(**tiers),
        counts={k: len(v) for k, v in tiers.items()},
    )
