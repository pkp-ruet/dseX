"""
The stock screener (`/screener`, services/screener.py) and saved screens
(services/custom_lists_service.py).

The screener's data is public: every company's figures, filtered in the
browser. Our own view (grade, price check, warnings) is one filter group the
page screen-locks, like every other lock. Saving a screen (and its daily
alert) is Premium, enforced here.
"""
from typing import Annotated, Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import custom_lists_service as svc
from backend.services import screener_service
from backend.services import entitlements

router = APIRouter(tags=["custom-lists"])


class FilterBody(BaseModel):
    key: str = Field(..., max_length=40)
    min: Optional[float] = Field(None, allow_inf_nan=False)
    max: Optional[float] = Field(None, allow_inf_nan=False)
    # `in` is a Python keyword: the set filter's values.
    values: Optional[list[Annotated[str, Field(max_length=80)]]] = Field(None, alias="in", max_length=60)

    def spec(self) -> dict:
        out: dict[str, Any] = {"key": self.key}
        if self.values is not None:
            out["in"] = self.values
        else:
            out["min"], out["max"] = self.min, self.max
        return out


class SpecBody(BaseModel):
    """A screener spec: filters on public figures + the order."""
    v: int = 2
    filters: list[FilterBody] = Field([], max_length=32)
    sort: Optional[str] = Field(None, max_length=40)
    dir: Optional[str] = Field(None, max_length=4)

    def spec(self) -> dict:
        return {"v": 2, "filters": [f.spec() for f in self.filters], "sort": self.sort, "dir": self.dir}


class CreateBody(BaseModel):
    name: str = Field(..., max_length=80)
    spec: SpecBody
    alerts: bool = True


class UpdateBody(BaseModel):
    name: Optional[str] = Field(None, max_length=80)
    spec: Optional[SpecBody] = None
    alerts: Optional[bool] = None


@router.get("/api/screener")
def screener_page():
    """The whole screener: filter menu, ready-made screens and every scored
    company's figure on every filter. The page filters it in the browser."""
    return screener_service.universe()


@router.get("/api/user/custom-lists")
def my_custom_lists(current_user: dict = Depends(get_current_user)):
    return {"lists": svc.list_for_user(current_user["user_id"]),
            "can_save": entitlements.is_premium(current_user)}


@router.post("/api/user/custom-lists", status_code=201)
def create_custom_list(body: CreateBody, current_user: dict = Depends(get_current_user)):
    if not entitlements.is_premium(current_user):
        raise HTTPException(status_code=403, detail=entitlements.LIMIT_CUSTOM_LISTS)
    try:
        created = svc.create(current_user["user_id"], body.name, body.spec.spec(), body.alerts)
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
                             body.spec.spec() if body.spec else None, body.alerts)
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
