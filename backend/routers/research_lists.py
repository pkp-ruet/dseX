"""
Research lists — six ideas tested in the open (see services/research_lists.py).

The full payload goes to every reader: the Premium lock on the page is
screen-only, like every other lock in the app.
"""
from fastapi import APIRouter, HTTPException

from backend.services.research_lists_service import get_list, list_index

router = APIRouter(tags=["research-lists"])


@router.get("/api/research-lists")
def research_lists():
    """Every list: idea, how many companies pass, the top three names."""
    return {"lists": list_index()}


@router.get("/api/research-lists/{slug}")
def research_list(slug: str):
    """One list: the funnel, a research card per stock, who joined / left."""
    data = get_list(slug)
    if data is None:
        raise HTTPException(status_code=404, detail="unknown_list")
    return data
