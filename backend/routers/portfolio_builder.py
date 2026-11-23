"""
Portfolio builder (2026-11-23). Rules in services/portfolio_builder.py, data
in services/portfolio_builder_service.py — this router stays thin.

Signed in only (user decision: "user must sign in to use this builder").

- ``POST /api/user/portfolio-builder``       build a plan from the answers and keep it.
                                             A free reader's first plan is free; a
                                             second is ``403 limit_reached:portfolio_builder``.
- ``GET  /api/user/portfolio-builder``       the reader's kept plans (summaries) + the newest
- ``GET  /api/user/portfolio-builder/{id}``  one kept plan
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import portfolio_builder_service as svc

router = APIRouter(prefix="/api/user", tags=["portfolio-builder"])


class BuildRequest(BaseModel):
    amount: float = Field(..., allow_inf_nan=False)
    purpose: str = Field("mix", max_length=20)
    horizon: str = Field("gt3", max_length=10)
    likes: list[str] = Field(default_factory=list, max_length=5)
    leave_out: list[str] = Field(default_factory=list, max_length=5)
    exclude: list[str] = Field(default_factory=list, max_length=30)
    # Phase 2: "mine" = add this money to the main portfolio (spread lines on the whole).
    start: str = Field("fresh", max_length=10)


@router.post("/portfolio-builder")
def build_portfolio(body: BuildRequest, current_user: dict = Depends(get_current_user)):
    try:
        return svc.build_for(current_user, body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e) or "bad_answers")
    except svc.BuilderLimit:
        raise HTTPException(status_code=403, detail=svc.LIMIT_BUILDER)


@router.get("/portfolio-builder")
def get_plans(current_user: dict = Depends(get_current_user)):
    return svc.plans_for(current_user)


@router.get("/portfolio-builder/{pid}")
def get_plan(pid: str, current_user: dict = Depends(get_current_user)):
    if not pid or len(pid) > 24 or not pid.isalnum():
        raise HTTPException(status_code=404, detail="not_found")
    doc = svc.plan_by_id(current_user, pid)
    if not doc:
        raise HTTPException(status_code=404, detail="not_found")
    return doc
