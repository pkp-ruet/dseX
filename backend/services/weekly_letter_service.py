"""The Friday letter — loads, storage and sending. Builders are pure in
`weekly_letter.py`.

`run_letter()` (CLI `python main.py weekly-letter`, Friday ~10 AM Dhaka via
`.github/workflows/weekly-letter.yml`) builds one letter for every reader who
holds or follows a share — free and Premium alike — stores it in
`weekly_letters` (unique user_id + week, 120-day TTL) for the Desk, then sends
it once: a push (pref `weekly_letter`, campaign `letter-{week}`) to readers
with a device, else an email (same campaign id in `email_sends`, never to an
`email_opt_out` reader). A free reader's push / email carries the free part
(their own shares) and says the other three parts are on the Desk.

The market part, the research-list news and the calendars are loaded once;
each reader then costs one events query.
"""
from __future__ import annotations

import html
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from backend.services import weekly_letter as wl
from backend.services.db_service import get_db

log = logging.getLogger("weekly_letter")

LETTER_TTL_SECONDS = 120 * 86400
FRIDAY = 4


def _letters():
    return get_db()["weekly_letters"]


def ensure_indexes() -> None:
    col = _letters()
    col.create_index([("user_id", 1), ("week", 1)], unique=True, name="letter_user_week")
    col.create_index("created_at", expireAfterSeconds=LETTER_TTL_SECONDS, name="letter_ttl")


def latest_letter(user_id: str) -> Optional[dict]:
    """The reader's newest letter (the Desk's "Friday letter" row), or None."""
    doc = _letters().find_one({"user_id": user_id}, {"_id": 0, "user_id": 0}, sort=[("week", -1)])
    if not doc:
        return None
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), datetime):
            doc[k] = doc[k].isoformat()
    return doc


# --------------------------------------------------------------------------- #
# Shared loads
# --------------------------------------------------------------------------- #


def _closes(codes: set[str], week: str, today: date) -> tuple[dict[str, float], dict[str, float]]:
    """(close before the week began, latest close) per code."""
    from backend.services.db_service import use_official_close

    if not codes:
        return {}, {}
    since = (date.fromisoformat(week) - timedelta(days=12)).isoformat()
    then: dict[str, tuple[str, float]] = {}
    now: dict[str, tuple[str, float]] = {}
    cur = get_db().stock_prices.find(
        {"trading_code": {"$in": sorted(codes)}, "date": {"$gte": since, "$lte": today.isoformat()},
         "ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1, "close_price": 1, "ycp": 1},
    ).batch_size(1000)
    for d in cur:
        d = use_official_close(d)
        code, day, px = d["trading_code"], str(d["date"])[:10], d.get("ltp")
        if not px:
            continue
        target = then if day < week else now
        if code not in target or target[code][0] < day:
            target[code] = (day, float(px))
    return {c: v for c, (_d, v) in then.items()}, {c: v for c, (_d, v) in now.items()}


def _list_news(week: str) -> tuple[dict[str, list[str]], list[dict], bool]:
    """({list_id: joined codes}, list meta in display order, whether any list
    had a snapshot from before the week to compare with)."""
    from backend.services import research_lists as rl

    col = get_db()["research_list_snapshots"]
    latest, before = {}, {}
    for lst in rl.LISTS:
        new = col.find_one({"list_id": lst.id}, {"_id": 0, "codes": 1, "date": 1}, sort=[("date", -1)])
        old = col.find_one({"list_id": lst.id, "date": {"$lt": week}}, {"_id": 0, "codes": 1},
                           sort=[("date", -1)])
        if new and new.get("date", "") >= week:
            latest[lst.id] = new.get("codes") or []
            if old is not None:
                before[lst.id] = old.get("codes") or []
    meta = [{"id": l.id, "slug": l.slug, "title_en": l.title_en, "title_bn": l.title_bn} for l in rl.LISTS]
    return wl.new_on_lists(latest, before), meta, bool(before)


def _shared(week: str, today: date, codes: set[str]) -> dict:
    """Everything every letter reads, loaded once."""
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.db_service import load_companies
    from backend.services.market_state_service import compute_market_state
    from backend.services.morning_brief_service import results_calendar

    out: dict = {"moves": {}, "market": None, "joined": {}, "lists": [], "meetings": [],
                 "record": [], "names": {}, "tracked": True}
    try:
        then, now = _closes(codes, week, today)
        out["moves"] = wl.week_moves(then, now)
    except Exception:  # noqa: BLE001 — one source failing drops one line
        log.warning("weekly closes failed", exc_info=True)
    try:
        out["market"] = wl.market_part(compute_market_state())
    except Exception:  # noqa: BLE001
        log.warning("market part failed", exc_info=True)
        out["market"] = wl.market_part(None)
    try:
        out["joined"], out["lists"], out["tracked"] = _list_news(week)
    except Exception:  # noqa: BLE001
        log.warning("research list news failed", exc_info=True)
    try:
        out["meetings"] = results_calendar(codes).get("meetings") or []
    except Exception:  # noqa: BLE001
        log.warning("results calendar failed", exc_info=True)
    try:
        out["record"] = build_dividend_calendar().get("record_dates") or []
    except Exception:  # noqa: BLE001
        log.warning("dividend calendar failed", exc_info=True)
    try:
        out["names"] = {c.get("trading_code"): c.get("company_name") for c in load_companies() or []}
    except Exception:  # noqa: BLE001
        pass
    return out


def letter_for(u: dict, week: str, today: date, shared: dict) -> dict:
    from backend.services.morning_brief_service import _codes_of
    from backend.services.portfolio_daily import recent_events
    from backend.services.portfolio_watch import digest

    held, watched = _codes_of(u)
    mine = set(held) | watched
    try:
        week_digest = digest(recent_events(u["user_id"], days=7))
    except Exception:  # noqa: BLE001
        week_digest = None
    parts = [
        wl.shares_part(held, watched, shared["moves"], week_digest, shared["names"]),
        shared["market"] or wl.market_part(None),
        wl.lists_part(shared["joined"], shared["lists"], mine, shared["tracked"]),
        wl.dates_part(mine, held, shared["meetings"], shared["record"], today),
    ]
    return wl.build_letter(week, parts)


# --------------------------------------------------------------------------- #
# Email
# --------------------------------------------------------------------------- #


def _email_html(letter: dict, lang: str, user_id: str, premium: bool) -> tuple[str, str]:
    from backend.config import PUBLIC_SITE_URL as SITE_URL
    from backend.services.campaign_service import _unsub_url

    bn = lang != "en"
    k = "bn" if bn else "en"
    subject = "আপনার সাপ্তাহিক চিঠি" if bn else "Your weekly letter"
    parts = [p for p in letter["parts"] if premium or p.get("free")]
    blocks = []
    for p in parts:
        rows = "".join(
            f'<tr><td style="padding:8px 0;border-top:1px solid #DED6C3;font-size:15px;color:#2E2B26">'
            + (f'<a href="{html.escape(SITE_URL + wl_tag(ln["url"]))}" style="color:#2E2B26;text-decoration:none">'
               f'{html.escape(ln[k])}</a>' if ln.get("url") else html.escape(ln[k]))
            + "</td></tr>"
            for ln in p["lines"]
        )
        blocks.append(
            f'<h2 style="font-size:17px;color:#2E2B26;margin:20px 0 6px">{html.escape(p["title_bn" if bn else "title_en"])}</h2>'
            f'<table role="presentation" width="100%" style="border-collapse:collapse">{rows}</table>'
        )
    if not premium:
        more = ("আরও 3টি অংশ আপনার ডেস্কে: পাঁচ লাইনে বাজার, গবেষণা তালিকায় নতুন নাম, আর আগামী সপ্তাহে আপনার শেয়ার।"
                if bn else "3 more parts are on your Desk: the market in five lines, new names on our research lists, and next week on your shares.")
        blocks.append(f'<p style="font-size:14px;color:#2E2B26;margin:16px 0 0">{more}</p>')
    button = "আপনার ডেস্ক খুলুন" if bn else "Open your Desk"
    unsub = "ইমেইল বন্ধ করুন" if bn else "Stop these emails"
    lead = ("প্রতি শুক্রবার, আপনার শেয়ারের সপ্তাহ এক জায়গায়।" if bn
            else "Every Friday, your shares' week in one place.")
    body = (
        '<div style="background:#FAF8F4;padding:24px 16px;font-family:Inter,Arial,sans-serif">'
        '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DED6C3;border-radius:12px;padding:24px">'
        '<div style="font-size:13px;color:#9E5F40;font-weight:600">TopStockBD</div>'
        f'<h1 style="font-size:22px;color:#2E2B26;margin:6px 0 4px">{subject}</h1>'
        f'<p style="font-size:14px;color:#2E2B26;margin:0">{lead}</p>'
        + "".join(blocks)
        + f'<p style="margin:20px 0 0"><a href="{html.escape(SITE_URL + "/desk?src=letter-email#letter")}" '
        'style="display:inline-block;background:#9E5F40;color:#FFFFFF;padding:10px 16px;border-radius:10px;'
        f'text-decoration:none;font-weight:600">{button}</a></p>'
        f'<p style="font-size:12px;color:#2E2B26;margin:20px 0 0"><a href="{html.escape(_unsub_url(user_id))}" '
        f'style="color:#2E2B26">{unsub}</a></p>'
        '</div></div>'
    )
    return subject, body


def wl_tag(url: str) -> str:
    from backend.services.morning_brief import tagged

    return tagged(url, "letter-email")


# --------------------------------------------------------------------------- #
# The Friday job
# --------------------------------------------------------------------------- #

_USER_FIELDS = {"_id": 0, "user_id": 1, "email": 1, "name": 1, "portfolio": 1, "extra_portfolios": 1,
                "watchlist": 1, "premium_until": 1, "email_verified": 1, "created_at": 1,
                "push_enabled": 1, "notification_prefs": 1, "email_opt_out": 1}


def _readers(email: Optional[str] = None) -> list[dict]:
    q: dict = {"$or": [{"portfolio.0": {"$exists": True}}, {"extra_portfolios.holdings.0": {"$exists": True}},
                       {"watchlist.0": {"$exists": True}}]}
    if email:
        q = {"email": email.strip().lower()}
    return [u for u in get_db()["users"].find(q, _USER_FIELDS) if u.get("user_id")]


def _today() -> date:
    from backend.services.auth_service import _DHAKA_TZ

    return datetime.now(timezone.utc).astimezone(_DHAKA_TZ).date()


def run_letter(force: bool = False, send: bool = True, email: Optional[str] = None) -> dict:
    """Build, store and send this week's letters. Idempotent per week: a re-run
    rebuilds the stored letters and sends only to readers not yet sent to.

    `email` = a dry run for one account: the letter is built and returned,
    nothing is stored or sent."""
    from backend.services import email_service, entitlements, push_service
    from backend.services.campaign_service import _list_unsub_headers
    from backend.services.morning_brief_service import _codes_of
    from backend.services.portfolio_watch import week_start

    today = _today()
    if today.weekday() != FRIDAY and not force and not email:
        return {"skipped": "not friday"}
    week = week_start(today.isoformat())
    readers = _readers(email)
    counts = {"readers": len(readers), "letters": 0, "pushed": 0, "emailed": 0, "quiet": 0}
    if not readers:
        return counts

    codes: set[str] = set()
    for u in readers:
        held, watched = _codes_of(u)
        codes |= set(held) | watched
    shared = _shared(week, today, codes)

    if email:
        return {"week": week, "letter": letter_for(readers[0], week, today, shared)}

    ensure_indexes()
    push_service.ensure_push_indexes()
    now = datetime.now(timezone.utc)
    push_ok, email_ok = push_service.is_configured(), email_service.is_configured()
    db = get_db()
    push_sends, email_sends = db["push_sends"], db["email_sends"]
    campaign = f"letter-{week}"

    for u in readers:
        uid = u["user_id"]
        try:
            letter = letter_for(u, week, today, shared)
        except Exception:  # noqa: BLE001 — one reader never stops the run
            log.warning("letter failed for %s", uid, exc_info=True)
            continue
        _letters().update_one(
            {"user_id": uid, "week": week},
            {"$set": {"parts": letter["parts"], "updated_at": now},
             "$setOnInsert": {"user_id": uid, "week": week, "created_at": now}},
            upsert=True,
        )
        counts["letters"] += 1
        if not send:
            continue
        if not wl.worth_sending(letter):
            counts["quiet"] += 1
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if prefs.get("weekly_letter", True) is False:
            continue
        lang = prefs.get("language", "bn")
        premium = entitlements.is_premium(u, now)
        has_device = bool(u.get("push_enabled")) and db["push_subscriptions"].find_one({"user_id": uid}, {"_id": 1})
        if push_ok and has_device:
            if push_sends.find_one({"campaign_id": campaign, "user_id": uid}, {"_id": 1}):
                continue
            payload = wl.push_payload(letter, lang, premium)
            if not payload:
                continue
            result = push_service.send_to_user(uid, payload)
            if result["sent"]:
                counts["pushed"] += 1
            push_sends.update_one(
                {"campaign_id": campaign, "user_id": uid},
                {"$set": {"campaign_id": campaign, "user_id": uid,
                          "status": "sent" if result["sent"] else "failed",
                          "result": result, "sent_at": datetime.now(timezone.utc)}},
                upsert=True,
            )
            if result["sent"]:
                continue
        addr = (u.get("email") or "").strip()
        if not (email_ok and addr and not u.get("email_opt_out")):
            continue
        if email_sends.find_one({"campaign_id": campaign, "user_id": uid}, {"_id": 1}):
            continue
        subject, body = _email_html(letter, lang, uid, premium)
        status, err = "sent", None
        try:
            email_service.send_transactional(addr, u.get("name"), subject, body,
                                             tags=["letter"], headers=_list_unsub_headers(uid))
            counts["emailed"] += 1
        except Exception as exc:  # noqa: BLE001
            status, err = "failed", str(exc)[:200]
            log.warning("letter email failed for %s: %s", uid, exc)
        email_sends.update_one(
            {"campaign_id": campaign, "user_id": uid},
            {"$set": {"campaign_id": campaign, "user_id": uid, "email": addr, "status": status,
                      "error": err, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    log.info("weekly letter done: %s", counts)
    return counts
