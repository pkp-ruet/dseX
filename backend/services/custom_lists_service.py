"""
Saved screens — data side. The screener's rules live in ``screener.py`` (pure,
public figures, since 2026-11-01); screens saved before that keep their old
checks (``custom_lists.py``) and run on them until the reader edits one.

Storage: ``users.custom_lists`` = up to ``MAX_LISTS`` of

    {id, name, spec, alerts, members, joined, left, changed_on, checked_on,
     created_at, updated_at}

``spec`` is a screener spec (``{"v": 2, "filters", "sort", "dir"}``) or an old
``{"checks", "sort"}`` one. ``members`` is every code that passed at the last
daily check (None until the first check), ``joined`` / ``left`` what changed
on ``changed_on``. The daily job (``run_alerts``, called from
``portfolio-daily``) re-runs every Premium reader's screens and sends one push
a day naming the newcomers. Saving is Premium and enforced in the router.

``facts`` / ``question_table`` stay here for the recommendation engine, which
still reads each company's strengths on the old six questions.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.services import custom_lists as cl
from backend.services import research_lists as rl
from backend.services import screener as sc
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

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


def _ctx() -> rl.Ctx:
    from backend.services.research_lists_service import _ctx as base_ctx
    return base_ctx()


@_ttl_cache(900)
def question_table() -> dict[str, dict[str, list[bool]]]:
    """{code: {question: [True, choice 1, choice 2]}} for every rated company —
    the six questions' counts and each stock's strengths read off this."""
    ctx = _ctx()
    return {code: cl.question_sat(f, ctx) for code, f in facts().items() if rl._n(f.get("score")) is not None}


# ---------------------------------------------------------------------------
# Saved lists
# ---------------------------------------------------------------------------

def _iso(v) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else v


def _live(spec: dict) -> dict:
    """A saved spec, run: {passed, codes, top}. ValueError when it no longer
    runs (a sector that left the DSE)."""
    from backend.services import screener_service as ss

    if sc.is_v2(spec):
        res = ss.run(spec)
        return {"passed": res["passed"], "codes": res["codes"],
                "top": [ss.stock_brief(r) for r in res["rows"][:3]]}
    spec = cl.normalize_spec(spec, sectors())
    passed = rl.run_list(cl.build_list(spec), list(facts().values()), _ctx())["passed"]
    return {"passed": len(passed), "codes": [f["code"] for f in passed],
            "top": [{"code": f["code"], "name": f.get("name"), "price": rl._n(f.get("ltp")),
                     "change_pct": rl._n(f.get("change_pct"))} for f in passed[:3]]}


def _public(doc: dict, live: Optional[dict] = None) -> dict:
    names = {c: (facts().get(c) or {}).get("name") or c for c in (doc.get("joined") or []) + (doc.get("left") or [])}
    spec = doc.get("spec") or {}
    out = {
        "id": doc["id"], "name": doc.get("name"), "spec": spec,
        "summary": sc.summary(spec) if sc.is_v2(spec) else cl.summary(spec),
        "alerts": bool(doc.get("alerts", True)),
        "joined": [{"code": c, "name": names.get(c, c)} for c in doc.get("joined") or []],
        "left": [{"code": c, "name": names.get(c, c)} for c in doc.get("left") or []],
        "changed_on": doc.get("changed_on"),
        "created_at": _iso(doc.get("created_at")),
        "updated_at": _iso(doc.get("updated_at")),
        "legacy": not sc.is_v2(spec),
    }
    if not sc.is_v2(spec):
        # An old screen opens in the new screener as the closest filters.
        filters, dropped = sc.from_checks(spec.get("checks") or [])
        out["filters_spec"] = {"v": 2, "filters": filters, "sort": sc.DEFAULT_SORT, "dir": sc.DEFAULT_DIR}
        out["dropped"] = [{"key": k, "en": cl.BY_KEY[k].name_en, "bn": cl.BY_KEY[k].name_bn}
                          for k in dropped if k in cl.BY_KEY]
    if live is not None:
        out["passed"] = live["passed"]
        out["top"] = live["top"]
    return out


def _docs(user_id: str) -> list[dict]:
    u = _users().find_one({"user_id": user_id}, {"_id": 0, "custom_lists": 1}) or {}
    return list(u.get("custom_lists") or [])


def list_for_user(user_id: str) -> list[dict]:
    out = []
    for d in _docs(user_id):
        try:
            live = _live(d.get("spec") or {})
        except ValueError:
            live = None  # a sector that left the DSE — the card says so
        out.append(_public(d, live) | {"broken": live is None})
    return out


def saved_news(user_id: str) -> list[dict]:
    """The reader's saved screens as of the last daily check — no live run, so
    it is cheap enough for the home bundle. ``new_today`` = the codes that
    joined at that check (empty when the last check changed nothing)."""
    out = []
    for d in _docs(user_id):
        members = d.get("members")
        changed = bool(d.get("changed_on")) and d.get("changed_on") == d.get("checked_on")
        joined = (d.get("joined") or []) if changed else []
        names = {c: (facts().get(c) or {}).get("name") or c for c in joined}
        out.append({
            "id": d["id"], "name": d.get("name"),
            "passed": len(members) if members is not None else None,
            "checked_on": d.get("checked_on"),
            "new_today": [{"code": c, "name": names[c]} for c in joined],
        })
    return out


def create(user_id: str, name, spec_in, alerts: bool = True) -> dict:
    docs = _docs(user_id)
    if len(docs) >= cl.MAX_LISTS:
        raise ValueError("too_many_lists")
    from backend.services import screener_service as ss

    spec = sc.normalize_spec(spec_in, ss.sectors())
    if not spec["filters"]:
        raise ValueError("no_filters")  # "every company" is not worth watching
    now = datetime.now(timezone.utc)
    doc = {
        "id": uuid.uuid4().hex[:10], "name": cl.clean_name(name), "spec": spec,
        "alerts": bool(alerts), "members": None, "joined": [], "left": [],
        "changed_on": None, "checked_on": None, "created_at": now, "updated_at": now,
    }
    # Today's passers are the baseline: tomorrow's newcomers are the news.
    doc["members"] = _live(spec)["codes"][:cl.MEMBERS_CAP]
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
        from backend.services import screener_service as ss

        spec = sc.normalize_spec(spec_in, ss.sectors())
        if not spec["filters"]:
            raise ValueError("no_filters")
        if spec != doc.get("spec"):
            # New rules, new baseline — yesterday's members mean nothing now.
            doc["spec"] = sets["custom_lists.$.spec"] = spec
            doc["members"] = sets["custom_lists.$.members"] = _live(spec)["codes"][:cl.MEMBERS_CAP]
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
        title = (f"'{d['name']}' স্ক্রিনে নতুন {len(joined)}টি শেয়ার" if bn
                 else f"{len(joined)} new {'share' if len(joined) == 1 else 'shares'} on your screen '{d['name']}'")
        url = f"/screener?tab=saved&list={d['id']}&src=alert"
    else:
        total = sum(len(j) for _, j in changes)
        title = (f"আপনার {len(changes)}টি স্ক্রিনে নতুন {total}টি শেয়ার" if bn
                 else f"{total} new shares on {len(changes)} of your screens")
        names = " · ".join(f"{d['name']}: {', '.join(j[:2])}" for d, j in changes[:3])
        url = "/screener?tab=saved&src=alert"
    body = (f"আজ সব ফিল্টারে মিলেছে: {names}" if bn else f"Matched every filter today: {names}")
    return {"title": title, "body": body, "url": url, "tag": "customlists"}


def run_alerts(now: datetime, day: str, push_ok: bool) -> int:
    """Re-run every Premium reader's lists, store who joined / left, and send
    one push per reader per day. Free readers' lists (a lapsed plan) are left
    as they are. Returns how many readers were pushed."""
    from backend.services import entitlements, push_service

    sends = get_db()["push_sends"]
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
            spec = d.get("spec") or {}
            key = repr(spec)
            if key not in cache:
                try:
                    cache[key] = _live(spec)["codes"][:cl.MEMBERS_CAP]
                except ValueError:
                    continue
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
