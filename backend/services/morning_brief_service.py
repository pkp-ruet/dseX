"""
The results calendar and the morning brief — loaders, storage, senders.
Rules are pure in `morning_brief.py`.

- `results_calendar()` (cached 900s): every results meeting in the next
  `BOARD_DAYS` days from one `company_news` query, each with what to expect.
  Served by `GET /api/results/upcoming` (the /results page's "Coming up") and,
  filtered to the reader's codes, by the home bundle (`results_soon`).
- `run_brief()`: the morning job (`python main.py morning-brief`, ~9 AM Dhaka,
  Sun–Thu). Premium readers only. The CLI first re-scrapes the news of every
  code they hold or follow (`brief_codes()`), so results and meeting notices
  posted overnight are in. Results events go through the watcher
  (`portfolio_watch.build_events`) and are stored in `portfolio_watch_events`
  under the watcher's own ids, so the after-close watcher does not push them
  again. Each reader's brief is stored in `morning_briefs` (unique user_id +
  day, 30-day TTL) for the dashboard, then pushed (pref `morning_brief`) — or
  emailed when the reader has no push device — once a day.
"""
from __future__ import annotations

import html
import logging
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from backend.services import morning_brief as mb
from backend.services.db_service import _ttl_cache, get_db

log = logging.getLogger("morning_brief")

# Board-meeting notices come 1–3 weeks before the meeting; a postponement can
# come later. Read this far back.
NOTICE_DAYS = 60
BRIEF_TTL_SECONDS = 30 * 24 * 3600


def _briefs():
    return get_db()["morning_briefs"]


def ensure_indexes() -> None:
    col = _briefs()
    col.create_index([("user_id", 1), ("day", 1)], unique=True)
    col.create_index("created_at", expireAfterSeconds=BRIEF_TTL_SECONDS)


def _dhaka_today() -> date:
    from backend.services.auth_service import _DHAKA_TZ

    return datetime.now(timezone.utc).astimezone(_DHAKA_TZ).date()


def _meetings_by_code(today: date) -> dict[str, list[dict]]:
    from backend.services.notices import parse_board_meeting

    since = datetime.combine(today - timedelta(days=NOTICE_DAYS), datetime.min.time())
    out: dict[str, list[dict]] = {}
    for d in get_db().company_news.find(
        {"title": {"$regex": r"board\s+meeting", "$options": "i"}, "post_date": {"$gte": since}},
        {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1},
    ):
        rec = parse_board_meeting(d.get("title") or "", d.get("body") or "", d.get("post_date"))
        code = (d.get("trading_code") or "").upper()
        if rec and code:
            out.setdefault(code, []).append(rec)
    return out


def _annual_eps(code: str) -> dict[int, float]:
    """{year: EPS} from DSE's audited table — the fallback base for a yearly
    meeting when last year's notice is not in the news we keep."""
    from backend.services.db_service import load_financials

    out = {}
    for r in load_financials(code) or []:
        y, eps = r.get("year"), r.get("eps") if r.get("eps") is not None else r.get("eps_basic")
        if y is not None and eps is not None and not r.get("provisional"):
            try:
                out[int(y)] = float(eps)
            except (TypeError, ValueError):
                continue
    return out


def _expect(meeting: dict) -> Optional[dict]:
    from backend.services.notices import load_company_notices

    try:
        n = load_company_notices(meeting["code"]) or {}
        annual_eps = _annual_eps(meeting["code"]) if meeting["purpose"] == "annual" else None
        return mb.expectation(meeting, n.get("interims") or [], n.get("annual") or [], annual_eps)
    except Exception:  # noqa: BLE001 — one company's notices never drop the calendar
        log.warning("expectation failed for %s", meeting.get("code"), exc_info=True)
        return None


@_ttl_cache(900, max_entries=4)
def _meetings(today_iso: str) -> tuple[list[dict], dict]:
    """(scheduled meetings, {code: company name}) — one news query."""
    from backend.services.db_service import load_companies

    today = date.fromisoformat(today_iso)
    meetings = mb.scheduled_meetings(_meetings_by_code(today), today, mb.BOARD_DAYS)
    names = {}
    try:
        names = {c.get("trading_code"): c.get("company_name") for c in load_companies() or []}
    except Exception:  # noqa: BLE001
        log.warning("company names failed", exc_info=True)
    return meetings, names


@_ttl_cache(900, max_entries=400)
def _row(today_iso: str, code: str, md: str, purpose: str, pe: Optional[str]) -> dict:
    """One calendar row with what to expect — cached per meeting, so the home
    bundle builds only the reader's few, not the whole season."""
    meetings, names = _meetings(today_iso)
    m = next((x for x in meetings if x["code"] == code and x["date"].isoformat() == md
              and x["purpose"] == purpose), None)
    if m is None:  # the cache turned over between calls
        m = {"code": code, "date": date.fromisoformat(md), "purpose": purpose,
             "period_end": date.fromisoformat(pe) if pe else None,
             "days": (date.fromisoformat(md) - date.fromisoformat(today_iso)).days}
    return mb.calendar_row(m, names.get(code), _expect(m))


def results_calendar(codes: Optional[set[str]] = None) -> dict:
    """{as_of, meetings: [calendar rows]} — every company, or only `codes`."""
    today_iso = _dhaka_today().isoformat()
    meetings, _names = _meetings(today_iso)
    if codes is not None:
        want = {c.upper() for c in codes}
        meetings = [m for m in meetings if m["code"] in want]
    rows = [_row(today_iso, m["code"], m["date"].isoformat(), m["purpose"],
                 m["period_end"].isoformat() if m.get("period_end") else None) for m in meetings]
    return {"as_of": today_iso, "meetings": rows}


def today_brief(user_id: str) -> Optional[dict]:
    """The reader's brief for today (Dhaka), or None."""
    doc = _briefs().find_one({"user_id": user_id, "day": _dhaka_today().isoformat()},
                             {"_id": 0, "day": 1, "items": 1, "created_at": 1})
    if not doc or not doc.get("items"):
        return None
    made = doc.get("created_at")
    return {"day": doc["day"], "items": doc["items"],
            "made_at": made.isoformat() if isinstance(made, datetime) else None}


# --------------------------------------------------------------------------- #
# The morning job
# --------------------------------------------------------------------------- #

_USER_FIELDS = {"_id": 0, "user_id": 1, "email": 1, "name": 1, "portfolio": 1, "extra_portfolios": 1,
                "watchlist": 1, "premium_until": 1, "email_verified": 1, "created_at": 1,
                "push_enabled": 1, "notification_prefs": 1, "email_opt_out": 1}


def _readers(now: datetime) -> list[dict]:
    """Premium readers with something to brief on."""
    from backend.services import entitlements

    users = get_db()["users"].find(
        {"$or": [{"portfolio.0": {"$exists": True}}, {"extra_portfolios.holdings.0": {"$exists": True}},
                 {"watchlist.0": {"$exists": True}}]},
        _USER_FIELDS,
    )
    return [u for u in users if u.get("user_id") and entitlements.is_premium(u, now)]


def _codes_of(u: dict) -> tuple[dict[str, int], set[str]]:
    from backend.services.portfolio_daily import _portfolios_of

    held: dict[str, int] = {}
    for _pid, holdings, _log in _portfolios_of(u):
        for h in holdings:
            c = (h.get("trading_code") or "").upper()
            if c:
                held[c] = held.get(c, 0) + int(h.get("qty") or 0)
    watched = {str(c).upper() for c in (u.get("watchlist") or []) if c} - set(held)
    return held, watched


def brief_codes() -> list[str]:
    """Every code a Premium reader holds or follows — what the morning news
    scrape refreshes."""
    now = datetime.now(timezone.utc)
    out: set[str] = set()
    for u in _readers(now):
        held, watched = _codes_of(u)
        out |= set(held) | watched
    return sorted(out)


def _email_html(items: list[dict], lang: str, user_id: str) -> tuple[str, str]:
    from backend.services.campaign_service import _unsub_url
    from backend.config import PUBLIC_SITE_URL as SITE_URL

    bn = lang != "en"
    k = "title_bn" if bn else "title_en"
    subject = (f"বাজার খোলার আগে: আপনার শেয়ারে {len(items)}টি খবর" if bn
               else f"Before the bell: {len(items)} thing{'s' if len(items) != 1 else ''} on your shares")
    rows = "".join(
        f'<tr><td style="padding:10px 0;border-top:1px solid #DED6C3;font-size:15px;color:#2E2B26">'
        f'<a href="{html.escape(SITE_URL + mb.tagged(i["url"], "brief-email"))}" style="color:#2E2B26;text-decoration:none">'
        f'{html.escape(i[k])}</a></td></tr>'
        for i in items
    )
    head = "বাজার খোলার আগে" if bn else "Before the bell"
    lead = ("ডিএসই খোলার আগে আপনার শেয়ারের খবর।" if bn
            else "What to know about your shares before DSE opens at 10 AM.")
    unsub = "ইমেইল বন্ধ করুন" if bn else "Stop these emails"
    body = (
        '<div style="background:#FAF8F4;padding:24px 16px;font-family:Inter,Arial,sans-serif">'
        '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #DED6C3;border-radius:12px;padding:24px">'
        f'<div style="font-size:13px;color:#B0714E;font-weight:600">TopStockBD Premium</div>'
        f'<h1 style="font-size:22px;color:#2E2B26;margin:6px 0 4px">{head}</h1>'
        f'<p style="font-size:14px;color:#5C554A;margin:0 0 12px">{lead}</p>'
        f'<table role="presentation" width="100%" style="border-collapse:collapse">{rows}</table>'
        f'<p style="margin:20px 0 0"><a href="{html.escape(SITE_URL + "/?src=brief-email")}" '
        'style="display:inline-block;background:#B0714E;color:#FFFFFF;padding:10px 16px;border-radius:10px;'
        f'text-decoration:none;font-weight:600">{"আপনার দিন দেখুন" if bn else "Open your day"}</a></p>'
        f'<p style="font-size:12px;color:#5C554A;margin:20px 0 0"><a href="{html.escape(_unsub_url(user_id))}" '
        f'style="color:#5C554A">{unsub}</a></p>'
        '</div></div>'
    )
    return subject, body


def run_brief(force: bool = False) -> dict:
    """Build, store and send today's briefs. Idempotent per Dhaka day."""
    from backend.services import email_service, push_service
    from backend.services import portfolio_watch as watch
    from backend.services.campaign_service import _list_unsub_headers
    from backend.services.corporate_actions_service import build_dividend_calendar
    from backend.services.db_service import load_companies
    from backend.services.portfolio_daily import _events, _facts
    from backend.services.portfolio_daily import ensure_indexes as ensure_watch_indexes

    now = datetime.now(timezone.utc)
    today = _dhaka_today()
    day = today.isoformat()
    if today.weekday() in (4, 5) and not force:  # Friday, Saturday: DSE is shut
        return {"skipped": "weekend"}

    ensure_indexes()
    ensure_watch_indexes()
    push_service.ensure_push_indexes()
    readers = _readers(now)
    counts = {"readers": len(readers), "briefs": 0, "pushed": 0, "emailed": 0, "quiet": 0}
    if not readers:
        return counts

    per: dict[str, tuple[dict[str, int], set[str]]] = {}
    held_all: set[str] = set()
    followed_all: set[str] = set()
    for u in readers:
        held, watched = _codes_of(u)
        per[u["user_id"]] = (held, watched)
        held_all |= set(held)
        followed_all |= set(held) | watched

    meetings = mb.scheduled_meetings(_meetings_by_code(today), today, mb.WEEK_DAYS)
    try:
        record_rows = build_dividend_calendar().get("record_dates") or []
    except Exception:  # noqa: BLE001
        log.warning("calendar read failed", exc_info=True)
        record_rows = []
    try:
        names = {c.get("trading_code"): c.get("company_name") for c in load_companies() or []}
    except Exception:  # noqa: BLE001
        names = {}
    facts = _facts(held_all, today, followed_all)
    push_ok = push_service.is_configured()
    email_ok = email_service.is_configured()
    db = get_db()
    push_sends, email_sends = db["push_sends"], db["email_sends"]
    campaign = f"brief-{day}"

    for u in readers:
        uid = u["user_id"]
        held, watched = per[uid]
        # Results posted since the watcher last ran: stored under the
        # watcher's ids, so its after-close run sees them as already told.
        fresh = []
        for e in watch.build_events(held, facts, day, watched):
            if e.get("kind") != "results":
                continue
            res = _events().update_one(
                {"user_id": uid, "id": e["id"]},
                {"$setOnInsert": {**e, "user_id": uid, "created_at": now, "via": "brief"}},
                upsert=True,
            )
            if res.upserted_id is not None:
                fresh.append(e)
        items = mb.build_brief(held, watched, today=today, meetings=meetings,
                               record_rows=record_rows, results=fresh, names=names)
        if not items:
            counts["quiet"] += 1
            continue
        _briefs().update_one(
            {"user_id": uid, "day": day},
            {"$set": {"items": items}, "$setOnInsert": {"user_id": uid, "day": day, "created_at": now}},
            upsert=True,
        )
        counts["briefs"] += 1
        if not mb.worth_sending(items, today):
            continue

        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if prefs.get("morning_brief") is False:
            continue
        lang = prefs.get("language", "bn")
        has_device = bool(u.get("push_enabled")) and db["push_subscriptions"].find_one({"user_id": uid}, {"_id": 1})
        if push_ok and has_device:
            if push_sends.find_one({"campaign_id": campaign, "user_id": uid}, {"_id": 1}):
                continue
            result = push_service.send_to_user(uid, mb.push_payload(items, lang))
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
        # No push device (or every device failed): email, when we may.
        email = (u.get("email") or "").strip()
        if not (email_ok and email and not u.get("email_opt_out")):
            continue
        if email_sends.find_one({"campaign_id": campaign, "user_id": uid}, {"_id": 1}):
            continue
        subject, body = _email_html(items, lang, uid)
        status, err = "sent", None
        try:
            email_service.send_transactional(email, u.get("name"), subject, body,
                                             tags=["brief"], headers=_list_unsub_headers(uid))
            counts["emailed"] += 1
        except Exception as exc:  # noqa: BLE001
            status, err = "failed", str(exc)[:200]
            log.warning("brief email failed for %s: %s", uid, exc)
        email_sends.update_one(
            {"campaign_id": campaign, "user_id": uid},
            {"$set": {"campaign_id": campaign, "user_id": uid, "email": email, "status": status,
                      "error": err, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

    log.info("morning brief done: %s", counts)
    return counts
