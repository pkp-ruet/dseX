"""
Your own research lists — data side. Rules live in ``custom_lists.py`` (pure).

Storage: ``users.custom_lists`` = up to ``MAX_LISTS`` of

    {id, name, spec, alerts, members, joined, left, changed_on, checked_on,
     created_at, updated_at}

``members`` is every code that passed the list at the last daily check (None
until the first check), ``joined`` / ``left`` what changed on ``changed_on``.
The daily job (``run_alerts``, called from ``portfolio-daily``) re-runs every
Premium reader's lists and sends one push a day naming the newcomers.

Running a spec (``run``) is open to everyone — the screener (``/screener``)
shows a free reader how many companies pass and the first few; the rest is
screen-locked, like every other lock.
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

RESULT_CAP = 50
NEAR_CAP = 20  # stocks that miss exactly one check, shown under the passers
GOAL_TOP = 3  # = the screener's free rows, so the homepage card needs no lock


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


def run_template(template_id: str) -> dict:
    """A ready-made starting point, run — the screener's server-rendered view.
    KeyError on an unknown id (a retired one resolves to its replacement)."""
    template_id = cl.TEMPLATE_ALIASES.get(template_id, template_id)
    return run(cl.TEMPLATE_BY_ID[template_id]["spec"])


@_ttl_cache(900)
def question_table() -> dict[str, dict[str, list[bool]]]:
    """{code: {question: [True, choice 1, choice 2]}} for every rated company —
    the six questions' counts and each stock's strengths read off this."""
    ctx = _ctx()
    return {code: cl.question_sat(f, ctx) for code, f in facts().items() if rl._n(f.get("score")) is not None}


def _row(f: dict, rank: int) -> dict:
    return {
        "rank": rank, "code": f["code"], "name": f.get("name"), "sector": f.get("sector"),
        "price": rl._n(f.get("ltp")), "change_pct": rl._n(f.get("change_pct")),
        "score": rl._n(f.get("score")), "signal": f.get("signal") or "none",
    }


def _near_questions(answers: dict, sectors: list[str], lst: rl.ResearchList, ctx: rl.Ctx) -> dict:
    """Near misses for a screen built from the six questions: the stocks that
    meet every answer but one, counted per question."""
    table, fx = question_table(), facts()
    want = set(sectors)
    rows = [(fx[c], not want or fx[c].get("sector") in want, sat) for c, sat in table.items() if c in fx]
    misses = cl.question_misses(rows, answers)
    misses.sort(key=lambda m: lst.rank(m[0]), reverse=True)

    def label(qk):
        q = cl.Q_BY_KEY[qk]
        lvl = q.levels[answers[qk] - 1]
        return f"{q.title_en} ({lvl.label_en})", f"{q.title_bn} ({lvl.label_bn})"

    held: dict[str, int] = {}
    for _f, qk in misses:
        held[qk] = held.get(qk, 0) + 1
    order = [q.key for q in cl.QUESTIONS]
    by = []
    for qk, n in sorted(held.items(), key=lambda kv: (-kv[1], order.index(kv[0]))):
        en, bn = label(qk)
        by.append({"key": qk, "label_en": en, "label_bn": bn, "count": n})
    stocks = []
    for r, (f, qk) in enumerate(misses[:NEAR_CAP]):
        en, bn = label(qk)
        ven, vbn = cl.miss_value(f, qk, answers[qk], ctx)
        stocks.append(_row(f, r + 1) | {"levels": cl.best_levels(table[f["code"]]),
                                         "miss": {"key": qk, "label_en": en, "label_bn": bn,
                                                  "value_en": ven, "value_bn": vbn}})
    return {"by": "question", "total": len(misses), "by_check": by, "stocks": stocks}


def _near(spec: dict, lst: rl.ResearchList, ctx: rl.Ctx) -> dict:
    """The stocks that miss exactly one check: how many, how many each check
    holds back (keyed by the spec's check key, so the page can open that
    check's settings) and the first NEAR_CAP with the figure that missed."""
    keys = [c["key"] for c in spec["checks"]]
    skip = frozenset(i for i, k in enumerate(keys) if k == "sector")
    misses = rl.near_misses(lst, list(facts().values()), ctx, skip)
    held: dict[int, int] = {}
    for _f, i, _en, _bn in misses:
        held[i] = held.get(i, 0) + 1
    by_check = [{"key": keys[i], "label_en": lst.checks[i].label_en, "label_bn": lst.checks[i].label_bn,
                 "count": n} for i, n in sorted(held.items(), key=lambda kv: (-kv[1], kv[0]))]
    stocks = [_row(f, r + 1) | {"miss": {"key": keys[i], "label_en": lst.checks[i].label_en,
                                         "label_bn": lst.checks[i].label_bn, "value_en": en, "value_bn": bn}}
              for r, (f, i, en, bn) in enumerate(misses[:NEAR_CAP])]
    return {"by": "check", "total": len(misses), "by_check": by_check, "stocks": stocks}


def run(spec_in: dict, near: bool = True) -> dict:
    """The builder's live result: funnel, pass count, the first RESULT_CAP
    stocks with their own figure on every check and their strengths on the six
    questions, and (``near``) the stocks that miss by one. A spec that reads
    as six answers also gets ``answers`` + ``facets`` (how many each choice
    would leave); any other spec is a fine-tune screen (``answers`` None).
    Raises ValueError on a bad spec."""
    spec = cl.normalize_spec(spec_in, sectors(), allow_empty=True)
    ctx = _ctx()
    res = _run(spec, ctx)
    lst = res["_list"]
    table = question_table()
    stocks = []
    for i, f in enumerate(res["passed"][:RESULT_CAP]):
        stocks.append(_row(f, i + 1) | {
            "levels": cl.best_levels(table[f["code"]]) if f["code"] in table else None,
            "checks": [{"key": c["key"], "value_en": c["value_en"], "value_bn": c["value_bn"]}
                       for c in rl.check_values(lst, f, ctx)],
        })
    read = cl.answers_from_spec(spec)
    facets = None
    if read:
        fx, want = facts(), set(read["sectors"])
        rows = [(not want or (fx.get(c) or {}).get("sector") in want, sat) for c, sat in table.items()]
        facets = cl.facet_counts(rows, read["answers"])
    near_out = None
    if near:
        near_out = _near_questions(read["answers"], read["sectors"], lst, ctx) if read else _near(spec, lst, ctx)
    return {"spec": spec, "answers": read["answers"] if read else None, "sectors": read["sectors"] if read else None,
            "facets": facets, "universe": res["universe"], "funnel": res["funnel"],
            "passed": len(res["passed"]), "stocks": stocks, "near": near_out}


@_ttl_cache(900)
def goals_summary() -> list[dict]:
    """The goal starts, run — the homepage "Find stocks your way" card: each
    goal's pass count, what it asks in words (``wants``), its top ``GOAL_TOP``
    stocks with their strengths, and what sits past them as counts
    (``hidden`` + ``hidden_codes``, so the card can count the reader's own).
    Goals use no power checks and the top three are the screener's free rows,
    so nothing here is locked. A goal that no longer runs (its sector left
    the DSE) is skipped."""
    out = []
    for tp in cl.TEMPLATES:
        if tp["kind"] != "goal":
            continue
        try:
            res = run(tp["spec"], near=False)
        except ValueError:
            continue
        rest = res["stocks"][GOAL_TOP:]
        out.append({
            "id": tp["id"], "title_en": tp["title_en"], "title_bn": tp["title_bn"],
            "blurb_en": tp["blurb_en"], "blurb_bn": tp["blurb_bn"],
            "passed": res["passed"], "universe": res["universe"],
            "wants": cl.want_lines(tp.get("answers") or {}, tp.get("sectors") or []),
            "top": [s | {"checks": s["checks"][:2], "strengths": cl.strength_tags(s.get("levels"))}
                    for s in res["stocks"][:GOAL_TOP]],
            "hidden": cl.hidden_summary(rest, res.get("answers")),
            "hidden_codes": [s["code"] for s in rest],
        })
    return out


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
            live = run(d.get("spec") or {}, near=False)
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
        url = f"/screener?tab=saved&list={d['id']}&src=alert"
    else:
        total = sum(len(j) for _, j in changes)
        title = (f"আপনার {len(changes)}টি তালিকায় নতুন {total}টি শেয়ার" if bn
                 else f"{total} new stocks on {len(changes)} of your lists")
        names = " · ".join(f"{d['name']}: {', '.join(j[:2])}" for d, j in changes[:3])
        url = "/screener?tab=saved&src=alert"
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
