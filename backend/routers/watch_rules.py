"""Watch rules (THE Premium line, step 4, 2026-11-22; rules in
`services/watch_rules.py`).

`users.watch_rules: [{code, kind, value?, created_at}]`. A free reader has
`FREE_LIMITS["alerts"]` rules (3) counted together with their armed price
alerts; Premium as many as they need, up to `watch_rules.MAX_RULES`. A save
over the cap is a 403 `limit_reached:alerts` (the limit popup's "alerts"
kind); a list already over it (a lapsed Premium) can shrink or stay.
"""
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.routers.auth import get_current_user
from backend.services import entitlements
from backend.services import watch_rules as wr
from backend.services.db_service import get_db

router = APIRouter(prefix="/api/user/watch-rules", tags=["watch-rules"])

_CODE = re.compile(r"^[A-Z0-9&.\-]{1,20}$")


class RuleIn(BaseModel):
    kind: str = Field(max_length=30)
    value: float | None = Field(default=None, ge=0, le=100, allow_inf_nan=False)


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
                   "paused": (r["code"], r["kind"]) in paused_keys} for r in rules],
        "limit": limit,
        "used": len(rules) + armed,
        "armed_alerts": armed,
    }


@router.get("")
def list_rules(current_user: dict = Depends(get_current_user)):
    return _out(_stored(current_user), current_user, _armed(current_user["user_id"]))


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
    get_db().users.update_one({"user_id": uid}, {"$set": {"watch_rules": rules}})
    return _out(rules, current_user, armed)
