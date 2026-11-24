"""
The reader survey's storage (rules: `survey.py`).

`survey_responses` — one document per reader per round (unique `round, user_id`):
the reader's plan and facts when they first saw it, the answers saved after
each screen, the furthest screen reached, status shown / started / finished,
and whether they agreed to be contacted. The pop-up's own state (how many times
shown, "Later", "Don't ask again", done) lives on the user as `survey_state`,
so every device agrees.
"""
from __future__ import annotations

import html
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from pymongo.errors import DuplicateKeyError

from backend.services import survey as sv
from backend.services.db_service import _ttl_cache, get_db

log = logging.getLogger(__name__)

COLLECTION = "survey_responses"


def _col():
    return get_db()[COLLECTION]


def ensure_indexes() -> None:
    col = _col()
    col.create_index([("round", 1), ("user_id", 1)], unique=True, name="round_user")
    col.create_index([("round", 1), ("status", 1)], name="round_status")


def _now() -> datetime:
    return datetime.now(timezone.utc)


@_ttl_cache(3600, max_entries=2000, keep=False)
def active_days(user_id: str) -> int:
    """Dhaka days with any page view in the last 30 (the `user_id, ts` index)."""
    since = _now() - timedelta(days=30)
    rows = get_db()["user_events"].aggregate([
        {"$match": {"user_id": user_id, "ts": {"$gte": since}}},
        {"$group": {"_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts", "timezone": "+06:00"}}}},
        {"$count": "n"},
    ])
    for r in rows:
        return int(r.get("n") or 0)
    return 0


def _is_admin(user: dict) -> bool:
    from backend.services.entitlements import is_admin

    return is_admin(user)


def _response(user_id: str) -> Optional[dict]:
    return _col().find_one({"round": sv.ROUND, "user_id": user_id}, {"_id": 0})


def _dates(until_raw, seg: str) -> tuple[Optional[str], Optional[str]]:
    """(ends_on, ended_on) as Dhaka dates for the Premium questions."""
    until = sv.as_utc(until_raw)
    if not until:
        return None, None
    day = sv.dhaka_date(until).isoformat()
    return (day, None) if seg in ("premium", "ending") else (None, day)


def state_for(user: dict) -> dict:
    """What the survey needs: may it open by itself now, the reader's plan
    branch and dates, and any answers saved so far (to resume)."""
    now = _now()
    uid = user["user_id"]
    doc = _response(uid) or {}
    seg = doc.get("segment") or sv.segment(user, now)
    st = sv.round_state(user.get("survey_state"))
    admin = _is_admin(user)
    ok, why = sv.asking(st, seg, now, admin=admin)
    if ok:
        acc = sv.account_days(user, now)
        act = active_days(uid) if seg not in sv.FIRST_WAVE else sv.MIN_ACTIVE_DAYS
        ok, why = sv.due(st, seg, now, acc_days=acc, active_days=act, admin=admin)
    # The plan as it was when they were first asked, so a resumed survey keeps its branch.
    ends_on, ended_on = _dates(doc.get("premium_until") or user.get("premium_until"), seg)
    return {
        "round": sv.ROUND,
        "open": sv.round_open(sv.dhaka_date(now)),
        "due": ok,
        "why": why,
        "segment": seg,
        "ends_on": ends_on,
        "ended_on": ended_on,
        # The old free month (2026-10, removed): "why didn't you buy it", not "continue".
        "trial": (doc.get("premium_source") or user.get("premium_source")) == "trial",
        "answers": doc.get("answers") or {},
        "step": int(doc.get("step") or 0),
        "status": doc.get("status"),
        "contact": bool(doc.get("contact")),
        "screens": sv.SCREENS,
    }


def _facts(user: dict, now: datetime, seg: str) -> dict:
    """The reader as they were when first asked (kept, never asked of them)."""
    return {
        "round": sv.ROUND,
        "user_id": user["user_id"],
        "segment": seg,
        "paid_plan": user.get("paid_plan"),
        "premium_source": user.get("premium_source"),
        "premium_until": sv.as_utc(user.get("premium_until")),
        "account_days": sv.account_days(user, now),
        "active_days_30": active_days(user["user_id"]),
        "has_portfolio": bool(user.get("portfolio")),
        "watchlist_n": len(user.get("watchlist") or []),
        "name": user.get("display_name") or user.get("name"),
        "email": user.get("email"),
        "phone": user.get("phone"),
        "created_at": now,
    }


def _upsert(user_id: str, update: dict) -> None:
    """One response doc per reader per round. Two first writes at once (the
    pop-up's "shown" and a first save) can both try to insert: retry once."""
    query = {"round": sv.ROUND, "user_id": user_id}
    try:
        _col().update_one(query, update, upsert=True)
    except DuplicateKeyError:
        _col().update_one(query, update, upsert=True)


def _set_state(user_id: str, raw: dict) -> None:
    st = dict(raw)
    get_db()["users"].update_one({"user_id": user_id}, {"$set": {"survey_state": st}})


def record_event(user: dict, action: str) -> dict:
    """shown · later · never — the pop-up's own state on the account."""
    now = _now()
    uid = user["user_id"]
    st = sv.next_state(user.get("survey_state"), action, now)
    if action == "shown":
        st["last_shown_at"] = now
        seg = (_response(uid) or {}).get("segment") or sv.segment(user, now)
        _upsert(uid, {"$setOnInsert": {**_facts(user, now, seg), "status": "shown", "step": 0, "answers": {}},
                      "$set": {"shown_at": now}, "$inc": {"shows": 1}})
    _set_state(uid, st)
    return {"state": st["state"], "shows": st["shows"]}


def save(user: dict, *, answers: dict, step: int, finish: bool, contact: Optional[bool],
         lang: Optional[str], device: Optional[dict], from_path: Optional[str]) -> dict:
    """Merge the answers in, keep the furthest screen, finish on the last one."""
    now = _now()
    uid = user["user_id"]
    doc = _response(uid) or {}
    seg = doc.get("segment") or sv.segment(user, now)
    merged = sv.merge(doc.get("answers"), answers, seg)
    was_finished = doc.get("status") == "finished"
    status = "finished" if (finish or was_finished) else ("started" if merged else (doc.get("status") or "shown"))
    fields: dict = {
        "answers": merged,
        "status": status,
        "step": max(int(doc.get("step") or 0), max(0, min(int(step), sv.SCREENS + 1))),
        "updated_at": now,
    }
    if lang in ("en", "bn"):
        fields["lang"] = lang
    if contact is not None:
        fields["contact"] = bool(contact)
    if finish and not was_finished:
        fields["finished_at"] = now
    on_insert = {k: v for k, v in _facts(user, now, seg).items() if k not in fields}
    if device and not doc.get("device"):
        fields["device"] = device
    if from_path and not doc.get("from_path"):
        fields["from_path"] = from_path[:200]
    _upsert(uid, {"$set": fields, "$setOnInsert": on_insert})
    if finish:
        _set_state(uid, sv.next_state(user.get("survey_state"), "finish", now))
    return {"status": status, "answers": merged, "step": fields["step"]}


# --------------------------------------------------------------------------- #
# Admin
# --------------------------------------------------------------------------- #

def admin_summary(round_id: Optional[str] = None) -> dict:
    now = _now()
    docs = list(_col().find({"round": round_id or sv.ROUND}, {"_id": 0}))
    # Did a reader who answered about renewing renew since? (Premium now ends
    # later than it did when they answered.)
    asked = [d for d in docs if "continue" in (d.get("answers") or {}) or "ended_why" in (d.get("answers") or {})]
    if asked:
        current = {
            u["user_id"]: sv.as_utc(u.get("premium_until"))
            for u in get_db()["users"].find(
                {"user_id": {"$in": [d["user_id"] for d in asked]}}, {"_id": 0, "user_id": 1, "premium_until": 1}
            )
        }
        for d in asked:
            then, nowu = sv.as_utc(d.get("premium_until")), current.get(d["user_id"])
            d["renewed"] = bool(nowu and (then is None or nowu > then + timedelta(days=1)) and nowu > now)
    return sv.summary(docs, now)


# --------------------------------------------------------------------------- #
# The one email to Premium readers whose plan ends soon or has ended
# --------------------------------------------------------------------------- #

_MONTHS_BN = ("জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই",
              "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর")


def _day_words(until: datetime, bn: bool) -> str:
    d = sv.dhaka_date(until)
    return f"{d.day} {_MONTHS_BN[d.month - 1]}" if bn else f"{d.day} {d.strftime('%b')}"


def email_html(user_id: str, seg: str, until: datetime, bn: bool) -> tuple[str, str]:
    from backend.config import PUBLIC_SITE_URL as SITE_URL
    from backend.services.campaign_service import _unsub_url

    day = _day_words(until, bn)
    if bn:
        subject = "TopStockBD আরও ভালো করতে আপনার 2 মিনিট"
        lead = (f"আপনার প্রিমিয়াম শেষ হবে {day}। " if seg == "ending" else f"আপনার প্রিমিয়াম শেষ হয়েছে {day}। ")
        body = ("আমরা ছোট একটা দল। এরপর কী বানাব, তা ঠিক করি আপনাদের কথা শুনেই: কোনটা কাজে লাগছে, "
                "কোথায় আটকে যাচ্ছেন, আর কোনটার জন্য টাকা দিতে রাজি। 9টি ছোট প্রশ্ন, মোটামুটি 2 মিনিট, "
                "যেকোনো প্রশ্ন বাদ দিতে পারেন। প্রতিটি উত্তর আমরা নিজেরা পড়ি, কিছুই কারও সঙ্গে শেয়ার করা হয় না।")
        button, unsub = "প্রশ্নগুলোর উত্তর দিন", "ইমেইল বন্ধ করুন"
    else:
        subject = "Two minutes to help us make TopStockBD better"
        lead = (f"Your Premium ends on {day}. " if seg == "ending" else f"Your Premium ended on {day}. ")
        body = ("We are a small team, and what we build next comes from what readers like you tell us: what helps, "
                "what gets in the way, and what is worth paying for. Nine short questions, about two minutes, and "
                "you can skip any of them. We read every answer ourselves and never share them.")
        button, unsub = "Answer the questions", "Stop these emails"
    ask = ("আপনার অভিজ্ঞতা জানতে চাই।" if bn else "We would like to hear how it went for you.")
    url = f"{SITE_URL}/feedback?src=survey-email"
    out = (
        '<div style="background:#F1F4F8;padding:24px 16px;font-family:Inter,Arial,sans-serif">'
        '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #D5DDE8;border-radius:12px;padding:24px">'
        '<div style="font-size:13px;color:#1E5BB0;font-weight:600">TopStockBD</div>'
        f'<h1 style="font-size:22px;color:#16202D;margin:6px 0 10px">{html.escape(subject)}</h1>'
        f'<p style="font-size:15px;color:#16202D;margin:0 0 10px">{html.escape(lead + ask)}</p>'
        f'<p style="font-size:15px;color:#16202D;margin:0">{html.escape(body)}</p>'
        f'<p style="margin:20px 0 0"><a href="{html.escape(url)}" '
        'style="display:inline-block;background:#1E5BB0;color:#FFFFFF;padding:10px 16px;border-radius:10px;'
        f'text-decoration:none;font-weight:600">{html.escape(button)}</a></p>'
        f'<p style="font-size:12px;color:#16202D;margin:20px 0 0"><a href="{html.escape(_unsub_url(user_id))}" '
        f'style="color:#16202D">{html.escape(unsub)}</a></p>'
        '</div></div>'
    )
    return subject, out


def email_ending_and_ended(*, write: bool = False, include_push: bool = False) -> dict:
    """One email (campaign `survey-<round>`) to readers whose Premium ends within
    ENDING_DAYS or has ended, who haven't finished or declined the survey, have
    an email, haven't opted out, and (unless `include_push`) have no push
    device. Dry run unless `write`. Idempotent: `email_sends` keeps one row per
    reader for the campaign."""
    from backend.services import email_service, push_service
    from backend.services.campaign_service import _list_unsub_headers

    db = get_db()
    now = _now()
    campaign = f"survey-{sv.ROUND}"
    counts = {"ending": 0, "ended": 0, "skipped_push": 0, "skipped_done": 0, "skipped_no_email": 0,
              "already": 0, "sent": 0, "failed": 0}
    if write and not email_service.is_configured():
        raise RuntimeError("no email provider configured")
    with_device = {s["user_id"] for s in db["push_subscriptions"].find({}, {"_id": 0, "user_id": 1})}
    users = db["users"].find(
        {"premium_until": {"$exists": True, "$ne": None}},
        {"_id": 0, "user_id": 1, "email": 1, "name": 1, "display_name": 1, "premium_until": 1,
         "email_opt_out": 1, "push_enabled": 1, "survey_state": 1, "notification_prefs": 1},
    )
    for u in users:
        seg = sv.segment(u, now)
        if seg not in sv.FIRST_WAVE or _is_admin(u):
            continue
        st = sv.round_state(u.get("survey_state"))
        if st["state"] in ("done", "declined"):
            counts["skipped_done"] += 1
            continue
        addr = (u.get("email") or "").strip()
        if not addr or u.get("email_opt_out"):
            counts["skipped_no_email"] += 1
            continue
        if not include_push and u.get("push_enabled") and u["user_id"] in with_device:
            counts["skipped_push"] += 1
            continue
        if db["email_sends"].find_one({"campaign_id": campaign, "user_id": u["user_id"]}, {"_id": 1}):
            counts["already"] += 1
            continue
        counts[seg] += 1
        if not write:
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        bn = prefs.get("language", "bn") != "en"
        subject, body = email_html(u["user_id"], seg, sv.as_utc(u["premium_until"]), bn)
        status, err = "sent", None
        try:
            email_service.send_transactional(addr, u.get("display_name") or u.get("name"), subject, body,
                                             tags=["survey"], headers=_list_unsub_headers(u["user_id"]))
            counts["sent"] += 1
        except Exception as exc:  # noqa: BLE001
            status, err = "failed", str(exc)[:200]
            counts["failed"] += 1
            log.warning("survey email failed for %s: %s", u["user_id"], exc)
        db["email_sends"].update_one(
            {"campaign_id": campaign, "user_id": u["user_id"]},
            {"$set": {"campaign_id": campaign, "user_id": u["user_id"], "email": addr, "status": status,
                      "error": err, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    return counts
