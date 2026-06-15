"""
Stock recommendation endpoint.

Public — anyone can take the quiz. If a valid Bearer token is present, the
result is also saved to the user so the homepage can show "your last
recommendation". Thin router; all logic lives in recommendation_service.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from backend.routers.auth import get_current_user_optional
from backend.services.auth_service import save_last_recommendation, clear_daily_picks
from backend.services.recommendation_service import (
    build_recommendation,
    TIMELINES, STRATEGIES, DIVIDENDS, VALUATIONS, BUDGETS, RISKS, SIZES,
)
from backend.models.responses import RecommendationResponse

router = APIRouter(prefix="/api", tags=["recommendations"])


class RecommendationRequest(BaseModel):
    timeline: str
    strategy: str
    sectors: list[str] = []
    dividend: str
    valuation: str
    budget: str
    # Newer dials — optional with neutral defaults so older clients keep working.
    risk: str = "balanced"
    size: str = "any"

    @field_validator("timeline")
    @classmethod
    def _v_timeline(cls, v: str) -> str:
        if v not in TIMELINES:
            raise ValueError(f"timeline must be one of {sorted(TIMELINES)}")
        return v

    @field_validator("strategy")
    @classmethod
    def _v_strategy(cls, v: str) -> str:
        if v not in STRATEGIES:
            raise ValueError(f"strategy must be one of {sorted(STRATEGIES)}")
        return v

    @field_validator("dividend")
    @classmethod
    def _v_dividend(cls, v: str) -> str:
        if v not in DIVIDENDS:
            raise ValueError(f"dividend must be one of {sorted(DIVIDENDS)}")
        return v

    @field_validator("valuation")
    @classmethod
    def _v_valuation(cls, v: str) -> str:
        if v not in VALUATIONS:
            raise ValueError(f"valuation must be one of {sorted(VALUATIONS)}")
        return v

    @field_validator("budget")
    @classmethod
    def _v_budget(cls, v: str) -> str:
        if v not in BUDGETS:
            raise ValueError(f"budget must be one of {sorted(BUDGETS)}")
        return v

    @field_validator("risk")
    @classmethod
    def _v_risk(cls, v: str) -> str:
        if v not in RISKS:
            raise ValueError(f"risk must be one of {sorted(RISKS)}")
        return v

    @field_validator("size")
    @classmethod
    def _v_size(cls, v: str) -> str:
        if v not in SIZES:
            raise ValueError(f"size must be one of {sorted(SIZES)}")
        return v

    @field_validator("sectors")
    @classmethod
    def _v_sectors(cls, v: list[str]) -> list[str]:
        return [s for s in (v or []) if isinstance(s, str) and s.strip()][:20]


@router.post("/recommendations", response_model=RecommendationResponse)
def post_recommendations(
    body: RecommendationRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    answers = body.model_dump()
    result = build_recommendation(answers)
    if current_user:
        result["saved"] = save_last_recommendation(current_user["user_id"], answers, result)
        # Retuning the quiz changes the taste inputs — drop today's cached feed
        # so "Picked for you today" recomputes against the new answers.
        clear_daily_picks(current_user["user_id"])
    return RecommendationResponse(**result)
