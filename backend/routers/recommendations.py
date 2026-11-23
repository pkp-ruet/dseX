"""
The recommendation engine's endpoints. Rules live in services/recommend.py,
data in services/recommend_service.py — this router stays thin.

- ``GET  /api/user/for-you``            "Based on your shares" (the page ``/for-you``);
                                        the home bundle carries the top three as ``for_you``
- ``POST|DELETE /api/user/for-you/hide/{code}``  "Not for me" (90 days) and its undo
- ``GET  /api/user/portfolio/buy-next`` the portfolio's "What to buy next" (``?pid=``)
- ``GET  /api/portfolio/sample-plan``   the same for a sample portfolio's holdings
                                        (``/sample-portfolio/[slug]``, public)

``POST /api/recommendations`` (TopStock AI's "suggest stocks") was removed with
the assistant on 2026-11-23.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from backend.routers.auth import get_current_user
from backend.services import recommend_service

router = APIRouter(prefix="/api", tags=["recommendations"])


@router.get("/user/for-you")
def get_for_you(current_user: dict = Depends(get_current_user)):
    """"Based on your shares": up to 15 companies, each tied to a share the
    reader owns, follows or reads about, in groups by that share (or a
    starter list when they have none). The page ``/for-you`` names them to
    Premium readers; the home bundle carries the top three."""
    return recommend_service.for_user(current_user)


def _hide_code(code: str) -> str:
    code = (code or "").strip().upper()
    if not code or len(code) > 20 or not code.isascii() or not code.replace("-", "").replace("&", "").isalnum():
        raise HTTPException(status_code=400, detail="bad_code")
    return code


@router.post("/user/for-you/hide/{code}")
def hide_for_you(code: str, current_user: dict = Depends(get_current_user)):
    """"Not for me": leave this company out of the reader's list for 90 days."""
    return {"hidden": recommend_service.hide(current_user, _hide_code(code))}


@router.delete("/user/for-you/hide/{code}")
def unhide_for_you(code: str, current_user: dict = Depends(get_current_user)):
    """Undo "Not for me"."""
    return {"hidden": recommend_service.hide(current_user, _hide_code(code), undo=True)}


@router.get("/user/portfolio/buy-next")
def get_buy_next(current_user: dict = Depends(get_current_user), pid: Optional[str] = None):
    """"What to buy next" for one portfolio (main when ``pid`` is absent)."""
    from backend.routers.portfolio import _pid, _state, _with_signals

    holdings = _with_signals(_state(current_user, _pid(pid))["holdings"], current_user.get("user_id"))
    return recommend_service.for_portfolio(current_user, holdings)


SAMPLE_MAX = 12


def parse_sample_holdings(h: str) -> list[dict]:
    """``CODE:QTY:PRICE,…`` -> holdings; a bad part is a 400, never a guess."""
    out: list[dict] = []
    for part in [x for x in (h or "").split(",") if x.strip()][:SAMPLE_MAX]:
        bits = part.strip().split(":")
        if len(bits) != 3:
            raise HTTPException(status_code=400, detail="bad_holding")
        code = bits[0].strip().upper()
        try:
            qty, price = int(bits[1]), float(bits[2])
        except ValueError:
            raise HTTPException(status_code=400, detail="bad_holding")
        if not code.isascii() or not code.replace("-", "").isalnum() or len(code) > 20 or qty <= 0 or not 0 < price < 1e6:
            raise HTTPException(status_code=400, detail="bad_holding")
        out.append({"trading_code": code, "qty": qty, "buy_price": price})
    return out


@router.get("/portfolio/sample-plan")
def get_sample_plan(h: str = Query("", max_length=400, description="CODE:QTY:PRICE,… (max 12)")):
    """"What to buy next" for a sample portfolio (2026-11-02): the sample
    pages show the whole portfolio check, the plan's buy ideas included. No
    reader, no watchlist — the holdings alone shape it."""
    holdings = parse_sample_holdings(h)
    if not holdings:
        raise HTTPException(status_code=400, detail="no_holdings")
    return recommend_service.for_portfolio({}, holdings, watchlist=[])
