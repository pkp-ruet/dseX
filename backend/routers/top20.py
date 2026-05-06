from fastapi import APIRouter

from backend.models.responses import Top20Response
from backend.services.top20_service import compute_top20

router = APIRouter()


@router.get("/api/top-20", response_model=Top20Response)
def get_top20():
    return compute_top20()
