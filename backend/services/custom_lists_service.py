"""
Your own research lists — data side. Rules live in ``custom_lists.py`` (pure).

Storage: ``users.custom_lists`` = up to ``MAX_LISTS`` of

    {id, name, spec, alerts, members, joined, left, changed_on, checked_on,
     created_at, updated_at}

``members`` is every code that passed the list at the last daily check (None
until the first check), ``joined`` / ``left`` what changed on ``changed_on``.
The daily job (``run_alerts``, called from ``portfolio-daily``) re-runs every
Premium reader's lists and sends one push a day naming the newcomers.

Running a spec (``run``) is open to everyone — the builder shows a free reader
how many companies pass; which ones is screen-locked, like every other lock.
Saving is Premium and enforced here.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.services import custom_lists as cl
from backend.services import research_lists as rl
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

RESULT_CAP = 30


def _users():
    return get_db()["users"]


@_ttl_cache(900)
def facts() -> dict[str, dict]:
    """The research-list facts plus today's Buy/Sell signal per company."""
    from backend.services.research_lists_service import build_facts
    from backend.services.signal_service import build_signals

    base = build_facts()
    try:
        sigs = build_signals()
    except Exception:  # noqa: BLE001 — the Buy check just fails for everyone
        logger.exception("custom lists: signals failed")
        sigs = {}
    return {code: {**f, "signal": (sigs.get(code) or {}).get("signal") or "none"}
            for code, f in base.items()}


def sectors() -> list[str]:
    return sorted({f.get("sector") for f in facts().values() if f.get("sector")})


def catalog() -> dict:
    return cl.catalog(sectors())


def _ctx() -> rl.Ctx:
    from backend.services.research_lists_service import _ctx as base_ctx
    return base_ctx()


def _run(spec: dict, ctx: Optional[rl.Ctx] = None) -> dict:
    lst = cl.build_list(spec)
    return rl.run_list(lst, list(facts().values()), ctx or _ctx()) | {"_list": lst}


def run(spec_in: dict) -> dict:
    """The builder's live result: funnel, pass count, the first RESULT_CAP
    stocks with their own figure on every check. Raises ValueError on a bad spec."""
    spec = cl.normalize_spec(spec_in, sectors())
    ctx = _ctx()
    res = _run(spec, ctx)
    lst = res["_list"]
    stocks = []
    for i, f in enumerate(res["passed"][:RESULT_CAP]):
        stocks.append({
            "rank": i + 1, "code": f["code"], "name": f.get("name"), "sector": f.get("sector"),
            "price": rl._n(f.get("ltp")), "change_pct": rl._n(f.get("change_pct")),
            "score": rl._n(f.get("score")), "signal": f.get("signal") or "none",
            "checks": [{"key": c["key"], "value_en": c["value_en"], "value_bn": c["value_bn"]}
                       for c in rl.check_values(lst, f, ctx)],
        })
    return {"spec": spec, "universe": res["universe"], "funnel": res["funnel"],
            "passed": len(res["passed"]), "stocks": stocks}


# ---------------------------------------------------------------------------
# Saved lists
# ---------------------------------------------------------------------------

def _iso(v) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else v


def _public(doc: dict, live: Optional[dict] = None) -> dict:
    names = {c: (facts().get(c) or {}).get("name") or c for c in (doc.get("joined") or []) + (doc.get("left") or [])}
    out = {
        "id": doc["id"], "name": doc.get("name"), "spec": doc.get("spec"),
        "summary": cl.summary(doc.get("spec") or {}),
        "alerts": bool(doc.get("alerts", True)),
        "joined": [{"code": c, "name": names.get(c, c)} for c in doc.get("joined") or []],
        "left": [{"code": c, "name": names.get(c, c)} for c in doc.get("left") or []],
        "changed_on": doc.get("changed_on"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
    }
    if live is not None:
        out["passed"] = live["passed"]
        out["top"] = [{"code": s["code"], "name": s["name"], "price": s["price"], "change_pct": s["change_pct"],
                       "score": s["score"], "signal": s["signal"]} for s in live["stocks"][:3]]
    return out


def _docs(user_id: str) -> list[dict]:
    u = _users().find_one({"user_id": user_id}, {"_id": 0, "custom_lists": 1}) or {}
    return list(u.get("custom_lists") or [])


def list_for_user(user_id: str) -> list[dict]:
    out = []
    for d in _docs(user_id):
        try:
            live = run(d.get("spec") or {})
        except ValueError:
            live = None  # a sector that left the DSE — the card says so
        out.append(_public(d, live) | {"broken": live is None})
    return out


def create(user_id: str, name, spec_in, alerts: bool = True) -> dict:
    docs = _docs(user_id)
    if len(docs) >= cl.MAX_LISTS:
        raise ValueError("too_many_lists")
    spec = cl.normalize_spec(spec_in, sectors())
    now = datetime.now(timezone.utc)
    doc = {
        "id": uuid.uuid4().hex[:10], "name": cl.clean_name(name), "spec": spec,
        "alerts": bool(alerts), "members": None, "joined": [], "left": [],
        "changed_on": None, "checked_on": None, "created_at": now, "updated_at": now,
    }
    # Today's passers are the baseline: tomorrow's newcomers are the news.
    doc["members"] = [f["code"] for f in _run(spec)["passed"]][:cl.MEMBERS_CAP]
    _users().update_one({"user_id": user_id}, {"$push": {"custom_lists": doc}})
    return _public(doc)


def update(user_id: str, list_id: str, name=None, spec_in=None, alerts: Optional[bool] = None) -> dict:
    docs = _docs(user_id)
    doc = next((d for d in docs if d.get("id") == list_id), None)
    if not doc:
        raise KeyError(list_id)
    sets: dict = {"custom_lists.$.updated_at": datetime.now(timezone.utc)}
    if name is not None:
        doc["name"] = sets["custom_lists.$.name"] = cl.clean_name(name)
    if alerts is not None:
        doc["alerts"] = sets["custom_lists.$.alerts"] = bool(alerts)
    if spec_in is not None:
        spec = cl.normalize_spec(spec_in, sectors())
        if spec != doc.get("spec"):
            # New rules, new baseline — yesterday's members mean nothing now.
            doc["spec"] = sets["custom_lists.$.spec"] = spec
            doc["members"] = sets["custom_lists.$.members"] = \
                [f["code"] for f in _run(spec)["passed"]][:cl.MEMBERS_CAP]
            doc["joined"] = sets["custom_lists.$.joined"] = []
            doc["left"] = sets["custom_lists.$.left"] = []
            doc["changed_on"] = sets["custom_lists.$.changed_on"] = None
    _users().update_one({"user_id": user_id, "custom_lists.id": list_id}, {"$set": sets})
    return _public(doc)


def delete(user_id: str, list_id: str) -> None:
    res = _users().update_one({"user_id": user_id}, {"$pull": {"custom_lists": {"id": list_id}}})
    if not res.modified_count:
        raise KeyError(list_id)


# ---------------------------------------------------------------------------
# The daily check + push
# ---------------------------------------------------------------------------

def push_payload(changes: list[tuple[dict, list[str]]], lang: str = "bn") -> Optional[dict]:
    """One notification for a reader's lists that gained stocks today.
    ``changes`` = [(list doc, joined codes)]."""
    changes = [(d, j) for d, j in changes if j]
    if not changes:
        return None
    bn = lang != "en"
    if len(changes) == 1:
        d, joined = changes[0]
        names = ", ".join(joined[:3]) + ("…" if len(joined) > 3 else "")
        title = (f"'{d['name']}' তালিকায় নতুন {len(joined)}টি শেয়ার" if bn
                 else f"{len(joined)} new on your list '{d['name']}'")
        url = f"/my-lists?list={d['id']}&src=alert"
    else:
        total = sum(len(j) for _, j in changes)
        title = (f"আপনার {len(changes)}টি তালিকায় নতুন {total}টি শেয়ার" if bn
                 else f"{total} new stocks on {len(changes)} of your lists")
        names = " · ".join(f"{d['name']}: {', '.join(j[:2])}" for d, j in changes[:3])
        url = "/my-lists?src=alert"
    body = (f"আজ সব শর্ত পূরণ করেছে: {names}" if bn else f"Passed every check today: {names}")
    return {"title": title, "body": body, "url": url, "tag": "customlists"}


def run_alerts(now: datetime, day: str, push_ok: bool) -> int:
    """Re-run every Premium reader's lists, store who joined / left, and send
    one push per reader per day. Free readers' lists (a lapsed plan) are left
    as they are. Returns how many readers were pushed."""
    from backend.services import entitlements, push_service

    sends = get_db()["push_sends"]
    ctx = _ctx()
    cache: dict[str, list[str]] = {}
    pushed = 0
    for u in _users().find(
        {"custom_lists.0": {"$exists": True}},
        {"_id": 0, "user_id": 1, "email": 1, "premium_until": 1, "custom_lists": 1,
         "push_enabled": 1, "notification_prefs": 1},
    ):
        if not entitlements.is_premium(u, now):
            continue
        uid = u["user_id"]
        changes = []
        for d in u.get("custom_lists") or []:
            if d.get("checked_on") == day:
                continue
            try:
                spec = cl.normalize_spec(d.get("spec") or {}, sectors())
            except ValueError:
                continue
            key = repr(spec)
            if key not in cache:
                cache[key] = [f["code"] for f in _run(spec, ctx)["passed"]][:cl.MEMBERS_CAP]
            now_codes = cache[key]
            joined, left = cl.diff_members(d.get("members"), now_codes)
            sets = {"custom_lists.$.members": now_codes, "custom_lists.$.checked_on": day}
            if joined or left:
                sets.update({"custom_lists.$.joined": joined, "custom_lists.$.left": left,
                             "custom_lists.$.changed_on": day})
            _users().update_one({"user_id": uid, "custom_lists.id": d["id"]}, {"$set": sets})
            if joined and d.get("alerts", True):
                changes.append((d, joined))
        if not (changes and push_ok and u.get("push_enabled")):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not prefs.get("portfolio_watch", True):
            continue
        campaign_id = f"clist-{uid}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        result = push_service.send_to_user(uid, push_payload(changes, prefs.get("language", "bn")))
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        if result["sent"]:
            pushed += 1
    return pushed
