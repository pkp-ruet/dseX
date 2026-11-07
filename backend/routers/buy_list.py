"""
The Buy List (services/buy_list.py, buy_list_service.py): the few DSE shares
we would buy today, each with its case.

The full payload goes to every reader: the Premium lock on the page is
screen-only, like every other lock in the app.
"""
from fastapi import APIRouter

from backend.services import buy_list_service as svc

router = APIRouter(tags=["buy-list"])


@router.get("/api/buy-list")
def buy_list():
    return svc.build()
