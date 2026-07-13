"""
Daily market email — ONE shared email sent to lapsed power users.

Unlike the per-user re-engagement flow (campaign_service.py), this builds a
single email once per day (today's Buy signals, index/turnover moves, movers,
fresh dividends, and a scorecard of the previous day's picks) and sends the
*identical* content to an auto-selected audience. Only the per-user
unsubscribe + open-pixel links differ between recipients.

Trigger is manual: an admin reviews the pre-built email + audience on
/admin/campaigns and presses Send. No cron.

Audience (the ~300/day) — a funnel over the `users` collection:
  1. eligible : has email, not opted out, active, and a "power user"
                (non-empty watchlist OR portfolio), idle >= 7 days.
  2. cooldown : drop anyone emailed within the last 7 days (`last_emailed_at`)
                — this both protects deliverability and auto-rotates the pool.
  3. rank+cap : never-emailed first, then longest-since-emailed, freshest
                lapser as tiebreak; take the top `cap` (default 300).

Sends reuse email_service (Resend+Brevo, paced, per-provider daily cap) and the
`email_sends` / `email_campaigns` collections under a `daily-YYYYMMDD` id, so
re-pressing Send never double-emails and never exceeds `cap` for the day.
"""
import logging
import time
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from backend.config import PUBLIC_SITE_URL
from backend.services import email_templates, campaign_service
from backend.services.db_service import (
    get_db,
    load_companies,
    load_latest_prices,
    load_market_index,
    load_market_movers,
    load_dividend_declarations,
)
from backend.services.email_service import send_transactional
from backend.services.signal_service import build_signals

log = logging.getLogger("daily_email")

DEFAULT_CAP = 300
LAPSED_DAYS = 7      # idle at least this long to be re-engaged
COOLDOWN_DAYS = 7    # never email the same person more often than this
MAX_BUYS = 5         # how many Buy-signal stocks to feature

_PROJECTION = {
    "_id": 0, "user_id": 1, "email": 1, "display_name": 1,
    "last_seen_at": 1, "created_at": 1, "last_emailed_at": 1,
}
_EPOCH = datetime(1970, 1, 1)


# ---------------------------------------------------------------------------
# Small helpers
# ---------------------------------------------------------------------------

def _dhaka_now() -> datetime:
    """Dhaka is UTC+6 (no DST) — good enough for a daily campaign id / label."""
    return datetime.now(timezone.utc) + timedelta(hours=6)


def today_campaign_id() -> str:
    return f"daily-{_dhaka_now():%Y%m%d}"


def _date_label() -> str:
    d = _dhaka_now()
    return f"{d:%A}, {d.day} {d:%B}"  # e.g. "Tuesday, 14 July" (no %-d, Windows-safe)


def _ts(dt) -> Optional[float]:
    if not isinstance(dt, datetime):
        return None
    naive = dt.replace(tzinfo=None) if dt.tzinfo else dt
    return (naive - _EPOCH).total_seconds()


def _tag_url(url: str, campaign_id: str) -> str:
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}utm_source=email&utm_medium=daily&utm_campaign={campaign_id}"


# ---------------------------------------------------------------------------
# Audience selection
# ---------------------------------------------------------------------------

def _power_user() -> dict:
    return {"$or": [{"watchlist.0": {"$exists": True}}, {"portfolio.0": {"$exists": True}}]}


def _lapsed(cutoff: datetime) -> dict:
    return {"$or": [
        {"last_seen_at": {"$lt": cutoff}},
        {"$and": [{"last_seen_at": None}, {"created_at": {"$lt": cutoff}}]},
    ]}


def _cooldown(cutoff: datetime) -> dict:
    return {"$or": [
        {"last_emailed_at": {"$exists": False}},
        {"last_emailed_at": None},
        {"last_emailed_at": {"$lt": cutoff}},
    ]}


def _base_filter() -> dict:
    return {
        "is_active": {"$ne": False},
        "email_opt_out": {"$ne": True},
        "email": {"$type": "string"},
    }


def _rank_key(u: dict):
    """never-emailed first → longest-since-emailed → freshest lapser."""
    le_ts = _ts(u.get("last_emailed_at"))
    ls_ts = _ts(u.get("last_seen_at") or u.get("created_at")) or 0.0
    return (0 if le_ts is None else 1, le_ts or 0.0, -ls_ts)


def select_daily_audience(cap: int = DEFAULT_CAP) -> list[dict]:
    now = datetime.now(timezone.utc)
    query = {**_base_filter(), "$and": [
        _power_user(),
        _lapsed(now - timedelta(days=LAPSED_DAYS)),
        _cooldown(now - timedelta(days=COOLDOWN_DAYS)),
    ]}
    docs = [d for d in get_db()["users"].find(query, _PROJECTION) if (d.get("email") or "").strip()]
    docs.sort(key=_rank_key)
    return docs[: max(0, cap)]


def daily_audience_summary(cap: int = DEFAULT_CAP) -> dict:
    """Counts for the admin card — the full funnel, before/after cooldown."""
    db = get_db()
    now = datetime.now(timezone.utc)
    lapsed = _lapsed(now - timedelta(days=LAPSED_DAYS))
    cooldown = _cooldown(now - timedelta(days=COOLDOWN_DAYS))
    base = _base_filter()

    eligible = db["users"].count_documents({**base, "$and": [_power_user(), lapsed]})
    ready = db["users"].count_documents({**base, "$and": [_power_user(), lapsed, cooldown]})
    return {
        "eligible": eligible,
        "in_cooldown": max(0, eligible - ready),
        "ready": ready,
        "selected": min(ready, cap),
        "cap": cap,
        "lapsed_days": LAPSED_DAYS,
        "cooldown_days": COOLDOWN_DAYS,
    }


def plan_send_count(cap: int = DEFAULT_CAP) -> int:
    """How many would actually go out now, honouring what's already been sent
    today (so re-pressing Send never exceeds `cap` for the day)."""
    cid = today_campaign_id()
    already = get_db()["email_sends"].count_documents({"campaign_id": cid})
    remaining = max(0, cap - already)
    return len(select_daily_audience(remaining)) if remaining else 0


# ---------------------------------------------------------------------------
# Content (built once per day, shared by every recipient)
# ---------------------------------------------------------------------------

def _recent_dividend_count(days: int = 7) -> int:
    cutoff = date.today() - timedelta(days=days)
    n = 0
    try:
        for d in load_dividend_declarations():
            decl = d.get("declaration_date")
            if not decl:
                continue
            try:
                if datetime.fromisoformat(str(decl)).date() >= cutoff:
                    n += 1
            except ValueError:
                continue
    except Exception:  # noqa: BLE001 — a nice-to-have, never block the email
        log.warning("recent dividend count failed", exc_info=True)
    return n


def _select_buys(prices: dict, companies: dict) -> list[dict]:
    buys = []
    for code, sig in build_signals().items():
        if sig.get("signal") != "buy":
            continue
        p = prices.get(code, {})
        buys.append({
            "code": code,
            "name": companies.get(code, {}).get("company_name"),
            "ltp": p.get("ltp"),
            "change_pct": p.get("change_pct"),
            "reason_en": sig.get("reason_en"),
            "strength": sig.get("strength"),
            "score": sig.get("score") or 0,
        })
    # Strong buys first, then by fundamental score.
    buys.sort(key=lambda b: (0 if b["strength"] == "strong" else 1, -(b["score"] or 0)))
    return buys[:MAX_BUYS]


def _mood(idx: dict) -> tuple[str, Optional[str]]:
    chg = idx.get("dsex_change_pct")
    up, down = idx.get("up_count"), idx.get("down_count")
    breadth_up = bool(up and down and up > down * 1.3)
    breadth_down = bool(up and down and down > up * 1.3)
    if (chg is not None and chg >= 0.3) or breadth_up:
        return "Green day — most stocks rose", "pos"
    if (chg is not None and chg <= -0.3) or breadth_down:
        return "Red day — most stocks fell", "neg"
    if chg is None and up is None:
        return "", None
    return "A quiet day on the market", "flat"


def _pick_subject(idx: dict, buys: list[dict], div_count: int) -> str:
    """Best angle of the day — varies with the data, so no two days repeat."""
    chg = idx.get("dsex_change_pct")
    n = len(buys)
    if n and chg is not None and abs(chg) >= 1.0:
        d = "jumped" if chg > 0 else "dropped"
        return f"DSEX {d} {abs(chg):.1f}% today — {n} stock{'s' if n > 1 else ''} worth a look"
    if n:
        return f"Today's top buy: {buys[0]['code']} — {n} buy signal{'s' if n > 1 else ''} on the DSE"
    if div_count:
        return f"{div_count} new dividend{'s' if div_count > 1 else ''} declared on the DSE today"
    if chg is not None and abs(chg) >= 0.5:
        return f"The DSE is {'up' if chg > 0 else 'down'} {abs(chg):.1f}% today — your 1-minute recap"
    return "Your 1-minute Dhaka Stock Exchange recap"


def _yesterday_scorecard(prices: dict, today_id: str) -> Optional[dict]:
    """How the most recent previous daily email's featured buys have moved since."""
    doc = get_db()["email_campaigns"].find_one(
        {"campaign_id": {"$regex": "^daily-", "$lt": today_id}, "featured.0": {"$exists": True}},
        sort=[("campaign_id", -1)],
    )
    if not doc:
        return None
    items, up = [], 0
    for f in doc.get("featured", [])[:3]:
        code, base = f.get("code"), f.get("ltp")
        cur = (prices.get(code) or {}).get("ltp")
        if code and base and cur:
            chg = round((cur - base) / base * 100, 1)
            items.append({"code": code, "change_pct": chg})
            if chg > 0:
                up += 1
    if not items:
        return None
    label = None
    try:
        dt = datetime.strptime(doc["campaign_id"].replace("daily-", ""), "%Y%m%d")
        label = f"{dt.day} {dt:%b}"
    except ValueError:
        pass
    return {"items": items, "up_count": up, "total": len(items), "date_label": label}


def build_daily_content(campaign_id: str) -> dict:
    prices = load_latest_prices()
    companies = {c["trading_code"]: c for c in load_companies()}

    buys = _select_buys(prices, companies)
    for b in buys:
        b["url"] = _tag_url(f"{PUBLIC_SITE_URL}/stock/{b['code']}", campaign_id)

    idx = load_market_index() or {}
    tv_mn = idx.get("total_value_mn")
    market = {
        "dsex": idx.get("dsex"),
        "dsex_chg": idx.get("dsex_change_pct"),
        "turnover_cr": (tv_mn / 10.0) if tv_mn else None,  # 1 crore = 10 mn
        "turnover_chg": idx.get("turnover_change_pct"),
        "up": idx.get("up_count"),
        "down": idx.get("down_count"),
    }

    movers = load_market_movers() or {}
    g = (movers.get("gainers") or [None])[0]
    mt = (movers.get("most_traded") or [None])[0]
    div_count = _recent_dividend_count()
    extras = {
        "top_gainer": {"code": g.get("trading_code"), "change_pct": g.get("change_pct")} if g else None,
        "most_traded": {"code": mt.get("trading_code"),
                        "value_cr": (mt.get("value_mn") / 10.0) if mt and mt.get("value_mn") else None} if mt else None,
        "dividends_count": div_count,
    }

    mood, mood_kind = _mood(idx)
    n = len(buys)
    tagline_bn = (
        f"আজকের বাজারের এক নজরে আপডেট — নিচে আজকের {n}টি কেনার মতো শেয়ার দেখে নিন।"
        if n else "আজকের ঢাকা স্টক এক্সচেঞ্জের এক নজরে আপডেট।"
    )

    return {
        "campaign_id": campaign_id,
        "date_label": _date_label(),
        "mood": mood,
        "mood_kind": mood_kind,
        "bengali_tagline": tagline_bn,
        "preheader": "Today's top buys, index moves and what changed — in one minute.",
        "subject": _pick_subject(idx, buys, div_count),
        "market": market,
        "buys": buys,
        "scorecard": _yesterday_scorecard(prices, campaign_id),
        "extras": extras,
        "cta_text": "Open TopStock BD",
        "cta_url": _tag_url(f"{PUBLIC_SITE_URL}/", campaign_id),
        # stored on the campaign doc so tomorrow's email can score these picks
        "featured": [{"code": b["code"], "ltp": b["ltp"]} for b in buys if b.get("ltp")],
    }


# ---------------------------------------------------------------------------
# Render / preview / test
# ---------------------------------------------------------------------------

def render_daily_html(content: dict, *, user_id: str, campaign_id: str) -> str:
    return email_templates.build_daily_html(
        content=content,
        unsubscribe_url=campaign_service._unsub_url(user_id),
        pixel_url=campaign_service._pixel_url(user_id, campaign_id),
    )


def preview_daily_html() -> str:
    cid = today_campaign_id()
    return render_daily_html(build_daily_content(cid), user_id="preview", campaign_id=cid)


def send_daily_test(to_email: str, to_name: Optional[str], user_id: Optional[str]) -> tuple[str, str]:
    cid = today_campaign_id()
    content = build_daily_content(cid)
    uid = user_id or "test"
    html = render_daily_html(content, user_id=uid, campaign_id=cid)
    return send_transactional(
        to_email, to_name, content["subject"], html,
        tags=["daily-test"], headers=campaign_service._list_unsub_headers(uid),
    )


def daily_overview(cap: int = DEFAULT_CAP) -> dict:
    """Everything the admin card needs before a send: today's subject, the
    featured buys, the audience funnel, and how many already went out."""
    cid = today_campaign_id()
    content = build_daily_content(cid)
    already = get_db()["email_sends"].count_documents({"campaign_id": cid})
    return {
        "campaign_id": cid,
        "date_label": content["date_label"],
        "subject": content["subject"],
        "mood": content["mood"],
        "buys": [
            {"code": b["code"], "name": b["name"], "change_pct": b["change_pct"], "strength": b["strength"]}
            for b in content["buys"]
        ],
        "audience": daily_audience_summary(cap),
        "already_sent": already,
    }


# ---------------------------------------------------------------------------
# Send (FastAPI BackgroundTask)
# ---------------------------------------------------------------------------

def run_daily_campaign(
    campaign_id: str,
    cap: int = DEFAULT_CAP,
    created_by: Optional[str] = None,
    subject_override: Optional[str] = None,
    pace_seconds: float = 0.6,
) -> dict:
    db = get_db()
    sends = db["email_sends"]
    campaigns = db["email_campaigns"]
    now = datetime.now(timezone.utc)

    content = build_daily_content(campaign_id)
    subject = (subject_override or "").strip() or content["subject"]

    # Respect the day's cap across repeated presses of Send.
    already = sends.count_documents({"campaign_id": campaign_id})
    remaining = max(0, cap - already)
    audience = select_daily_audience(remaining) if remaining else []

    campaigns.update_one(
        {"campaign_id": campaign_id},
        {
            "$set": {
                "campaign_id": campaign_id,
                "kind": "daily",
                "cap": cap,
                "subject": subject,
                "selected": len(audience),
                "featured": content["featured"],
                "status": "sending",
            },
            "$setOnInsert": {"created_at": now, "created_by": created_by},
        },
        upsert=True,
    )

    sent = failed = skipped = 0
    for user in audience:
        uid = user["user_id"]
        email = (user.get("email") or "").strip()
        if not email:
            skipped += 1
            continue
        # Idempotency — one send per (campaign, user); safe on re-press / restart.
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            skipped += 1
            continue

        name = (user.get("display_name") or "").strip() or None
        status, msg_id, err, provider = "failed", None, None, None
        try:
            html = render_daily_html(content, user_id=uid, campaign_id=campaign_id)
            msg_id, provider = send_transactional(
                email, name, subject, html,
                tags=[campaign_id], headers=campaign_service._list_unsub_headers(uid),
            )
            status, sent = "sent", sent + 1
            # Frequency guard for the next N days.
            db["users"].update_one({"user_id": uid}, {"$set": {"last_emailed_at": now}})
        except Exception as exc:  # noqa: BLE001 — one bad send must not abort the run
            err = str(exc)[:300]
            failed += 1
            log.warning("daily send failed for %s: %s", uid, err)

        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {
                "campaign_id": campaign_id,
                "user_id": uid,
                "email": email,
                "segment": "daily",
                "status": status,
                "brevo_message_id": msg_id,  # legacy field name; holds the provider's msg id
                "provider": provider,
                "error": err,
                "sent_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        if pace_seconds:
            time.sleep(pace_seconds)

    counts = {"sent": sent, "failed": failed, "skipped": skipped, "attempted": len(audience)}
    campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "done", "counts": counts, "finished_at": datetime.now(timezone.utc)}},
    )
    log.info("daily campaign %s done: %s", campaign_id, counts)
    return {"campaign_id": campaign_id, **counts}
