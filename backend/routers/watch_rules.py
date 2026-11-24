"""Watch rules (THE Premium line, step 4, 2026-11-22; rules in
`services/watch_rules.py`).

`users.watch_rules: [{code, kind, value?, created_at}]`. A free reader has
`FREE_LIMITS["alerts"]` rules (3) counted together with their armed price
alerts; Premium as many as they need, up to `watch_rules.MAX_RULES`. A save
over the cap is a 403 `limit_reached:alerts` (the limit popup's "alerts"
kind); a list already over it (a lapsed Premium) can shrink or stay.

Watching a share = being on the watchlist (2026-11-25, one Watch button):
saving rules on a share adds it to the watchlist, taking a share off the
watchlist drops its rules (`routers/user.py`), and the first read moves any
older rule's share onto the watchlist.
"""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import entitlements
from backend.services.auth_service import add_to_user_watchlist, get_user_watchlist
from backend.services.entitlements import HARD_LIMITS, watchlist_add_blocked
from backend.services import watch_rules as wr
from backend.services.db_service import get_db

router = APIRouter(prefix="/api/user/watch-rules", tags=["watch-rules"])

_CODE = re.compile(r"^[A-Z0-9&.\-]{1,20}$")


class RuleIn(BaseModel):
    kind: str = Field(max_length=30)
    value: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)


class KeepIn(BaseModel):
    code: str = Field(max_length=20)
    kind: str = Field(max_length=30)
    keep: bool


class RulesIn(BaseModel):
    rules: list[RuleIn] = Field(default_factory=list, max_length=len(wr.KINDS))


def _clean(code: str) -> str:
    code = (code or "").strip().upper()
    if not _CODE.match(code):
        raise HTTPException(status_code=400, detail="bad_code")
    return code


def _stored(user: dict) -> list[dict]:
    return [r for r in user.get("watch_rules") or [] if isinstance(r, dict) and r.get("code") and r.get("kind") in wr.KINDS]


def _armed(uid: str) -> int:
    return get_db().price_alerts.count_documents({"user_id": uid, "is_active": True})


def _out(rules: list[dict], user: dict, armed: int) -> dict:
    limit = entitlements.limits_for(user)["alerts"]
    _, paused = wr.active_rules(rules, limit, armed)
    paused_keys = {(r["code"], r["kind"]) for r in paused}
    return {
        "rules": [{"code": r["code"], "kind": r["kind"], **({"value": r["value"]} if "value" in r else {}),
                   "keep": bool(r.get("keep")),
                   "paused": (r["code"], r["kind"]) in paused_keys} for r in rules],
        "limit": limit,
        "used": len(rules) + armed,
        "armed_alerts": armed,
    }


def _follow(uid: str, codes: list[str]) -> None:
    """Put these shares on the reader's watchlist, within the hard cap."""
    if not codes:
        return
    current = get_user_watchlist(uid)
    room = HARD_LIMITS["watchlist"] - len(current)
    new = [c for c in codes if c not in current][: max(0, room)]
    if new:
        add_to_user_watchlist(uid, new)


@router.get("")
def list_rules(current_user: dict = Depends(get_current_user)):
    rules = _stored(current_user)
    # Rules made before 2026-11-25 could sit on a share that isn't followed.
    missing = wr.unfollowed_codes(rules, get_user_watchlist(current_user["user_id"])) if rules else []
    if missing:
        _follow(current_user["user_id"], missing)
    return _out(rules, current_user, _armed(current_user["user_id"]))


@router.post("/keep")
def keep_rule(body: KeepIn, current_user: dict = Depends(get_current_user)):
    """Mark one rule "keep on": past a free reader's cap, kept rules stay on
    before older ones. It never adds a rule, so it needs no limit check."""
    code = _clean(body.code)
    if body.kind not in wr.KINDS:
        raise HTTPException(status_code=400, detail="bad_kind")
    rules = wr.set_keep(_stored(current_user), code, body.kind, body.keep)
    if rules is None:
        raise HTTPException(status_code=404, detail="no_rule")
    get_db().users.update_one({"user_id": current_user["user_id"]}, {"$set": {"watch_rules": rules}})
    return _out(rules, current_user, _armed(current_user["user_id"]))


@router.put("/{code}")
def set_rules(code: str, body: RulesIn, current_user: dict = Depends(get_current_user)):
    code = _clean(code)
    uid = current_user["user_id"]
    have = _stored(current_user)
    new = wr.clean_rules([r.model_dump() for r in body.rules])
    if new and not get_db().companies.find_one({"trading_code": code}, {"_id": 1}):
        raise HTTPException(status_code=404, detail="unknown_code")
    rules = wr.replace_code(have, code, new, datetime.now(timezone.utc).isoformat())
    if len(rules) > wr.MAX_RULES:
        raise HTTPException(status_code=403, detail=wr.LIMIT_DETAIL)
    armed = _armed(uid)
    limit = entitlements.limits_for(current_user)["alerts"]
    if wr.over_limit(len(have) + armed, len(rules) + armed, limit):
        raise HTTPException(status_code=403, detail=wr.LIMIT_DETAIL)
    followed = get_user_watchlist(uid)
    if new and code not in followed:
        if watchlist_add_blocked(followed, followed + [code], HARD_LIMITS["watchlist"]):
            raise HTTPException(
                status_code=400,
                detail=f"A watchlist can hold up to {HARD_LIMITS['watchlist']} stocks.",
            )
        add_to_user_watchlist(uid, [code])
    get_db().users.update_one({"user_id": uid}, {"$set": {"watch_rules": rules}})
    return _out(rules, current_user, armed)
