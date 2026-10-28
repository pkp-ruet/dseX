"""
The recommendation engine's endpoints. Rules live in services/recommend.py,
data in services/recommend_service.py — this router stays thin.

- ``GET  /api/user/for-you``            the reader's picks ("Picked for you"); the
                                        home bundle carries the same thing as ``for_you``
- ``GET  /api/user/portfolio/buy-next`` the portfolio's "What to buy next" (``?pid=``)
- ``POST /api/recommendations``         TopStock AI's "suggest stocks": quiz answers as
                                        stated tastes. Public; a signed-in reader's own
                                        stocks shape it too, and the answers are saved
                                        so the dashboard's picks lean the same way.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, field_validator

from backend.routers.auth import get_current_user, get_current_user_optional
from backend.services import recommend_service
from backend.services.auth_service import save_last_recommendation
from backend.models.responses import RecommendationResponse

router = APIRouter(prefix="/api", tags=["recommendations"])

# Allowed quiz answers (TopStock AI's suggest flow, frontend lib/assistant/flows.ts).
TIMELINES = {"short", "long"}
STRATEGIES = {"fundamental_strong", "market_trending"}
DIVIDENDS = {"income_focused", "doesnt_matter"}
VALUATIONS = {"value", "growth", "any"}
BUDGETS = {"under_50", "50_to_200", "any"}
RISKS = {"steady", "balanced", "aggressive"}
SIZES = {"large", "any", "small"}


def _one_of(allowed: set[str], name: str):
    def check(cls, v: str) -> str:
        if v not in allowed:
            raise ValueError(f"{name} must be one of {sorted(allowed)}")
        return v
    return check


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

    _v_timeline = field_validator("timeline")(classmethod(_one_of(TIMELINES, "timeline")))
    _v_strategy = field_validator("strategy")(classmethod(_one_of(STRATEGIES, "strategy")))
    _v_dividend = field_validator("dividend")(classmethod(_one_of(DIVIDENDS, "dividend")))
    _v_valuation = field_validator("valuation")(classmethod(_one_of(VALUATIONS, "valuation")))
    _v_budget = field_validator("budget")(classmethod(_one_of(BUDGETS, "budget")))
    _v_risk = field_validator("risk")(classmethod(_one_of(RISKS, "risk")))
    _v_size = field_validator("size")(classmethod(_one_of(SIZES, "size")))

    @field_validator("sectors")
    @classmethod
    def _v_sectors(cls, v: list[str]) -> list[str]:
        return [s[:60] for s in (v or []) if isinstance(s, str) and s.strip()][:20]


@router.post("/recommendations", response_model=RecommendationResponse)
def post_recommendations(
    body: RecommendationRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    answers = body.model_dump()
    result = recommend_service.from_answers(answers, current_user)
    if current_user:
        result["saved"] = save_last_recommendation(current_user["user_id"], answers, result)
    return RecommendationResponse(**result)


@router.get("/user/for-you")
def get_for_you(current_user: dict = Depends(get_current_user)):
    """The reader's picks: up to 15, built from their own stocks (or the
    strongest Buys when they have none). Free readers see three on screen."""
    return recommend_service.for_user(current_user)


@router.get("/user/portfolio/buy-next")
def get_buy_next(current_user: dict = Depends(get_current_user), pid: Optional[str] = None):
    """"What to buy next" for one portfolio (main when ``pid`` is absent)."""
    from backend.routers.portfolio import _pid, _state, _with_signals

    holdings = _with_signals(_state(current_user, _pid(pid))["holdings"])
    return recommend_service.for_portfolio(current_user, holdings)
