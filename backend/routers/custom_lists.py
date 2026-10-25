"""
Your own research lists (services/custom_lists.py).

The menu and the live result are public — the builder shows a free reader how
many companies pass and screen-locks which ones, like every other lock. Saving
a list (and its daily alert) is Premium, enforced here.
"""
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.routers.auth import get_current_user
from backend.services import custom_lists_service as svc
from backend.services import entitlements

router = APIRouter(tags=["custom-lists"])


class SpecBody(BaseModel):
    checks: list[dict[str, Any]]
    sort: Optional[str] = None


class CreateBody(BaseModel):
    name: str
    spec: SpecBody
    alerts: bool = True


class UpdateBody(BaseModel):
    name: Optional[str] = None
    spec: Optional[SpecBody] = None
    alerts: Optional[bool] = None


@router.get("/api/custom-lists/catalog")
def custom_list_catalog():
    """Every check a list can use, its settings, the sort orders and templates."""
    return svc.catalog()


@router.post("/api/custom-lists/run")
def custom_list_run(body: SpecBody):
    """Run a list without saving it: funnel, pass count, the top stocks."""
    try:
        return svc.run(body.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/api/user/custom-lists")
def my_custom_lists(current_user: dict = Depends(get_current_user)):
    return {"lists": svc.list_for_user(current_user["user_id"]),
            "can_save": entitlements.is_premium(current_user)}


@router.post("/api/user/custom-lists", status_code=201)
def create_custom_list(body: CreateBody, current_user: dict = Depends(get_current_user)):
    if not entitlements.is_premium(current_user):
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_CUSTOM_LISTS)
    try:
        created = svc.create(current_user["user_id"], body.name, body.spec.model_dump(), body.alerts)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"list": created}


@router.patch("/api/user/custom-lists/{list_id}")
def update_custom_list(list_id: str, body: UpdateBody, current_user: dict = Depends(get_current_user)):
    """Changing a list is Premium too; a lapsed plan can still delete one."""
    if not entitlements.is_premium(current_user):
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_CUSTOM_LISTS)
    try:
        updated = svc.update(current_user["user_id"], list_id, body.name,
                             body.spec.model_dump() if body.spec else None, body.alerts)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except KeyError:
        raise HTTPException(status_code=404, detail="List not found")
    return {"list": updated}


@router.delete("/api/user/custom-lists/{list_id}")
def delete_custom_list(list_id: str, current_user: dict = Depends(get_current_user)):
    try:
        svc.delete(current_user["user_id"], list_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="List not found")
    return {"ok": True}
