"""
Sector endpoints — group views over the DSEF score frame.

`/api/sectors` feeds the hub page and the sitemap; `/api/sector/{slug}` feeds one
sector page. Both are pure aggregation over data other services already compute.
"""
from fastapi import APIRouter, HTTPException

from backend.models.responses import SectorDetailResponse, SectorsListResponse
from backend.services.sector_service import get_sector, list_sectors, sector_slugs

router = APIRouter()


@router.get("/api/sectors", response_model=SectorsListResponse)
def get_sectors():
    """Every sector with at least a handful of listings, biggest first."""
    return list_sectors()


@router.get("/api/sectors/slugs", response_model=list[str])
def get_sector_slugs():
    """Slugs only — for static params and the sitemap."""
    return sector_slugs()


@router.get("/api/sector/{slug}", response_model=SectorDetailResponse)
def get_sector_detail(slug: str):
    data = get_sector(slug)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Unknown sector: {slug}")
    return data
