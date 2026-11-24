"""
The reader survey (rules `services/survey.py`, storage `services/survey_service.py`).

GET   /api/user/survey        — may it open now, the reader's plan branch, saved answers
POST  /api/user/survey/event  — shown · later · never (the pop-up's state on the account)
PATCH /api/user/survey        — save answers after a screen; `finish` on the last one
GET   /api/admin/survey       — the admin Survey tab
"""
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_admin_user, get_current_user
from backend.services import survey_service

router = APIRouter(prefix="/api", tags=["survey"])

MAX_KEYS = 40


class SurveyEvent(BaseModel):
    action: Literal["shown", "later", "never"]


class SurveyDevice(BaseModel):
    mobile: bool = False
    browser: str = Field("", max_length=40)
    standalone: bool = False
    width: int = Field(0, ge=0, le=10_000)


class SurveySave(BaseModel):
    answers: dict[str, Any] = Field(default_factory=dict)
    step: int = Field(0, ge=0, le=20)
    finish: bool = False
    contact: Optional[bool] = None
    lang: Optional[Literal["en", "bn"]] = None
    device: Optional[SurveyDevice] = None
    from_path: Optional[str] = Field(None, max_length=200)


@router.get("/user/survey")
def get_survey(user: dict = Depends(get_current_user)):
    return survey_service.state_for(user)


@router.post("/user/survey/event")
def survey_event(body: SurveyEvent, user: dict = Depends(get_current_user)):
    return survey_service.record_event(user, body.action)


@router.patch("/user/survey")
def save_survey(body: SurveySave, user: dict = Depends(get_current_user)):
    if len(body.answers) > MAX_KEYS:
        raise HTTPException(status_code=422, detail="Too many answers.")
    return survey_service.save(
        user,
        answers=body.answers,
        step=body.step,
        finish=body.finish,
        contact=body.contact,
        lang=body.lang,
        device=body.device.model_dump() if body.device else None,
        from_path=body.from_path,
    )


@router.get("/admin/survey")
def admin_survey(round: Optional[str] = None, _: dict = Depends(get_current_admin_user)):
    return survey_service.admin_summary(round)
