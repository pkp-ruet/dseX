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
        for row in scored.to_dict("records"):
            code  = row["trading_code"]
            score = row["score"]
            comp  = companies.get(code, {})
            _lry = row.get("last_reported_year")
            _day = row.get("data_age_years")
            _stale = row.get("stale_data")
            item = ScoreItem(
                trading_code=code,
                company_name=comp.get("company_name"),
                sector=row.get("sector"),
                market_category=comp.get("market_category"),
                score=_json_float(score),
                ltp=_json_float(row.get("ltp")),
                change_pct=None,
                eps_yoy_pct=_json_float(row.get("eps_yoy_pct")),
                eps=_json_float(row.get("eps")),
                div_yield_pct=_json_float(row.get("div_yield_pct")),
                p1_biz=_json_float(row.get("p1_biz")),
                p2_health=_json_float(row.get("p2_health")),
                p3_moat=_json_float(row.get("p3_moat")),
                p4_val=_json_float(row.get("p4_val")),
                p5_div=_json_float(row.get("p5_div")),
                last_reported_year=int(_lry) if _lry is not None and not (isinstance(_lry, float) and math.isnan(_lry)) else None,
                data_age_years=int(_day) if _day is not None and not (isinstance(_day, float) and math.isnan(_day)) else None,
                stale_data=bool(_stale) if _stale is not None and not (isinstance(_stale, float) and math.isnan(_stale)) else None,
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
            if p.get("ltp") is not None:
                item.ltp = _json_float(p.get("ltp"))

    return ScoresResponse(
        algorithm="DSEF",
        computed_at=datetime.now(timezone.utc).isoformat(),
        tiers=ScoreTiers(**tiers),
        counts={k: len(v) for k, v in tiers.items()},
    )
