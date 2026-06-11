"""
Public feedback submission.

Anyone (logged-in or out) can submit a star rating + optional comment. When a
valid Bearer token is present, the submission is attributed to that user so the
admin view can show who left the review. Thin router; logic lives in
feedback_service.
"""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user_optional
from backend.services.feedback_service import create_feedback, MAX_COMMENT_LEN

router = APIRouter(prefix="/api", tags=["feedback"])


class FeedbackRequest(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=MAX_COMMENT_LEN)
    source: str = "homepage"
    page: Optional[str] = Field(None, max_length=200)


@router.post("/feedback", status_code=201)
def submit_feedback(
    body: FeedbackRequest,
    current_user: Optional[dict] = Depends(get_current_user_optional),
):
    result = create_feedback(
        rating=body.rating,
        comment=body.comment,
        source=body.source,
        user=current_user,
        page=body.page,
    )
    return {"ok": True, **result}
