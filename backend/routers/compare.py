"""
Compare stocks (services/compare.py rules, compare_service.py data): up to 10
shares side by side, the same seven questions answered for each.

Public, like every market page. The free reader's 3-share cap and the Premium
analysis are screen-only (the page), so the payload is the same for everyone.
"""
from typing import Optional

from fastapi import APIRouter, Query

from backend.services import compare_service as svc

router = APIRouter(tags=["compare"])


@router.get("/api/compare")
def compare(codes: Optional[str] = Query(None, max_length=400)):
    return svc.build(codes)
