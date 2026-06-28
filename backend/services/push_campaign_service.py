"""
Daily push digest — "your stocks today" at market close.

Reuses campaign_service's build-once market context and per-user helpers
(_portfolio_summary / _watchlist_rows / _badge_for_code), but renders a single
short notification line instead of an HTML email and sends via push_service.

Idempotent per Dhaka day: campaign_id defaults to `digest-<YYYY-MM-DD>` and every
send writes a `push_sends` row guarded by a unique (campaign_id, user_id) index,
so a re-run the same day is a no-op.
"""
import logging
import time
from datetime import datetime, timezone
from typing import Optional

from backend.services.db_service import get_db
from backend.services import campaign_service, push_service
from backend.services.auth_service import _dhaka_day, _DHAKA_TZ

log = logging.getLogger("push-digest")

_DIGEST_PROJECTION = {
    "_id": 0, "user_id": 1, "display_name": 1, "watchlist": 1,
    "portfolio": 1, "current_streak": 1, "last_checkin_date": 1,
}


def _fmt_tk(n: float) -> str:
    return f"৳{abs(n):,.0f}"


# ---------------------------------------------------------------------------
# Audience
# ---------------------------------------------------------------------------

def select_push_audience(pref_key: str = "daily_digest") -> list[dict]:
    """Users with at least one live push subscription, push-enabled, and who
    haven't switched this notification type off."""
    db = get_db()
    user_ids = db["push_subscriptions"].distinct("user_id")
    if not user_ids:
        return []
    query = {
        "user_id": {"$in": user_ids},
        "is_active": {"$ne": False},
        "push_enabled": {"$ne": False},
        f"notification_prefs.{pref_key}": {"$ne": False},
    }
    return list(db["users"].find(query, _DIGEST_PROJECTION))


# ---------------------------------------------------------------------------
# Render one user → {title, body, url, tag} | None
# ---------------------------------------------------------------------------

def _with_streak(user: dict, payload: dict) -> dict:
    """Append a loss-aversion streak nudge when they have a run going and haven't
    checked in yet today."""
    streak = int(user.get("current_streak") or 0)
    today = _dhaka_day(datetime.now(timezone.utc))
    if streak >= 2 and user.get("last_checkin_date") != today:
        payload["body"] += f" — Day {streak} 🔥 keep it going"
    return payload


def render_digest_for_user(user: dict, ctx: dict) -> Optional[dict]:
    """One short, personal line. Priority: portfolio P/L → watchlist mover/alert →
    cold market pulse. Returns None when there's nothing worth pinging about."""
    # 1) Portfolio P/L
    holdings = user.get("portfolio") or []
    if holdings:
        pf = campaign_service._portfolio_summary(ctx, holdings)
        if pf and pf.get("pnl") is not None:
            pnl = pf["pnl"]
            up = pnl >= 0
            body = f"Your portfolio is {'up' if up else 'down'} {_fmt_tk(pnl)} today"
            biggest = pf.get("biggest_mover")
            if biggest and biggest.get("change_pct") is not None:
                body += f" · {biggest['code']} {biggest['change_pct']:+.1f}%"
            return _with_streak(user, {
                "title": "Your money today 💰", "body": body,
                "url": "/portfolio", "tag": "daily-digest",
            })

    # 2) Watchlist biggest mover / alert badge
    codes = user.get("watchlist") or []
    if codes:
        rows = [r for r in campaign_service._watchlist_rows(ctx, codes, limit=6)
                if r.get("change_pct") is not None]
        if rows:
            top = rows[0]
            badge = next((r for r in rows if r.get("badge_text")), None)
            # If nothing moved much but a stock has a standing alert, lead with it.
            if badge and abs(top.get("change_pct") or 0) < 1.5:
                body = f"{badge['code']}: {badge['badge_text']}"
                url = f"/stock/{badge['code']}"
            else:
                body = f"{top['code']} {top['change_pct']:+.1f}% today"
                url = "/watchlist"
            return _with_streak(user, {
                "title": "Your watchlist today 📊", "body": body,
                "url": url, "tag": "daily-digest",
            })

    # 3) Cold fallback — market pulse + strong-buy count
    pulse = ctx.get("pulse") or {}
    chg = pulse.get("change_pct")
    strong = ctx.get("strong_buy_count") or 0
    if chg is not None:
        body = f"DSEX {chg:+.1f}% today"
        if strong:
            body += f" · {strong} Strong Buy stocks to explore"
        return _with_streak(user, {
            "title": "DSE today", "body": body,
            "url": "/dse-today", "tag": "daily-digest",
        })
    return None


# ---------------------------------------------------------------------------
# Run (CLI / cron entrypoint)
# ---------------------------------------------------------------------------

def run_digest(
    campaign_id: Optional[str] = None,
    limit: Optional[int] = None,
    pace_seconds: float = 0.0,
    not_before_dhaka_hour: Optional[int] = None,
) -> dict:
    """Send the daily digest. When `not_before_dhaka_hour` is set, skip entirely if
    the current Dhaka hour is earlier than it, so intraday quick-scrape runs don't
    fire an early digest: the first run at/after that hour sends, earlier runs skip,
    and later same-day runs dedupe via push_sends. Pass None to disable the gate."""
    now = datetime.now(timezone.utc)
    today = _dhaka_day(now)
    campaign_id = campaign_id or f"digest-{today}"

    # Market-close gate — the digest is an end-of-day summary, so hold it until
    # ~2 PM Dhaka even when quick-scrape runs several times during the session.
    if not_before_dhaka_hour is not None:
        dhaka_hour = now.astimezone(_DHAKA_TZ).hour
        if dhaka_hour < not_before_dhaka_hour:
            log.info("digest %s gated — %02d:00 Dhaka is before market close %02d:00; skipping",
                     campaign_id, dhaka_hour, not_before_dhaka_hour)
            return {"campaign_id": campaign_id, "eligible": 0, "sent": 0,
                    "failed": 0, "skipped": 0, "gated": True}

    push_service.ensure_push_indexes()  # idempotent — CLI runs don't hit FastAPI startup
    db = get_db()
    sends = db["push_sends"]

    if not push_service.is_configured():
        log.warning("VAPID keys not set — skipping push digest")
        return {"campaign_id": campaign_id, "eligible": 0, "sent": 0, "failed": 0, "skipped": 0}

    ctx = campaign_service.build_market_context()
    audience = select_push_audience("daily_digest")

    sent = failed = skipped = 0
    attempted = 0
    for user in audience:
        if limit and attempted >= limit:
            break
        uid = user["user_id"]
        # Idempotency — never digest the same user twice in one day.
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            skipped += 1
            continue
        payload = render_digest_for_user(user, ctx)
        if not payload:
            skipped += 1
            continue

        attempted += 1
        result = push_service.send_to_user(uid, payload)
        if result["sent"] > 0:
            status, sent = "sent", sent + 1
        elif result["expired"] > 0 and result["failed"] == 0:
            status, skipped = "expired", skipped + 1
        else:
            status, failed = "failed", failed + 1

        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {
                "campaign_id": campaign_id,
                "user_id": uid,
                "status": status,
                "result": result,
                "sent_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        if pace_seconds:
            time.sleep(pace_seconds)

    counts = {
        "campaign_id": campaign_id, "eligible": len(audience),
        "sent": sent, "failed": failed, "skipped": skipped,
    }
    log.info("push digest %s done: %s", campaign_id, counts)
    return counts


# ---------------------------------------------------------------------------
# Event-triggered pushes (dividend declared / 52-week extreme) — post-scrape
# ---------------------------------------------------------------------------

def _push_watchers() -> list[dict]:
    """Push-enabled users with a non-empty watchlist → [{user_id, watch, prefs}]."""
    db = get_db()
    user_ids = db["push_subscriptions"].distinct("user_id")
    if not user_ids:
        return []
    out: list[dict] = []
    cursor = db["users"].find(
        {"user_id": {"$in": user_ids}, "is_active": {"$ne": False}, "push_enabled": {"$ne": False}},
        {"_id": 0, "user_id": 1, "watchlist": 1, "notification_prefs": 1},
    )
    for u in cursor:
        watch = {(c or "").upper() for c in (u.get("watchlist") or []) if c}
        if not watch:
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        out.append({"user_id": u["user_id"], "watch": watch, "prefs": prefs})
    return out


def _dividend_events(today: str) -> dict[str, dict]:
    """Codes whose dividend was declared today (Dhaka) → notification payload."""
    from backend.services.db_service import load_dividend_declarations

    events: dict[str, dict] = {}
    try:
        for d in load_dividend_declarations():
            decl = d.get("declaration_date")
            if not decl or str(decl)[:10] != today:
                continue
            code = (d.get("trading_code") or "").upper()
            if not code:
                continue
            pct = d.get("dividend_pct") or d.get("cash_dividend_pct")
            dtype = str(d.get("dividend_type") or "").strip().lower()
            label = f"{dtype} dividend".strip() if dtype else "dividend"
            body = f"{code} just declared a {pct}% {label}" if pct else f"{code} just declared a {label}"
            events[code] = {"title": "Dividend declared 💸", "body": body, "url": f"/stock/{code}"}
    except Exception:  # noqa: BLE001
        log.warning("dividend events load failed", exc_info=True)
    return events


def _extreme_events(ctx: dict, codes: set[str]) -> dict[str, tuple[str, dict]]:
    """Watched codes at a fresh 52-week high/low → (pref_key-suffix, payload)."""
    events: dict[str, tuple[str, dict]] = {}
    prices = ctx.get("prices") or {}
    for code in codes:
        ltp = (prices.get(code) or {}).get("ltp")
        if not ltp:
            continue
        hi, lo = campaign_service._52w(ctx, code)
        if hi and ltp >= hi:
            events[code] = ("52wh", {
                "title": "52-week high 📈",
                "body": f"{code} hit a new 52-week high",
                "url": f"/stock/{code}",
            })
        elif lo and ltp <= lo:
            events[code] = ("52wl", {
                "title": "52-week low 📉",
                "body": f"{code} hit a new 52-week low",
                "url": f"/stock/{code}",
            })
    return events


def run_events(limit_per_event: Optional[int] = None, pace_seconds: float = 0.0) -> dict:
    """Send dividend + 52-week-extreme pushes to users watching the affected stock.
    Idempotent per event per Dhaka day via push_sends (campaign_id = evt-<kind>-<code>-<day>)."""
    push_service.ensure_push_indexes()
    today = _dhaka_day(datetime.now(timezone.utc))
    campaign_base = f"events-{today}"

    if not push_service.is_configured():
        log.warning("VAPID keys not set — skipping event pushes")
        return {"campaign_id": campaign_base, "events": 0, "sent": 0, "failed": 0, "skipped": 0}

    watchers = _push_watchers()
    if not watchers:
        return {"campaign_id": campaign_base, "events": 0, "sent": 0, "failed": 0, "skipped": 0}
    watched_codes: set[str] = set().union(*[w["watch"] for w in watchers])

    ctx = campaign_service.build_market_context()

    # Build the event queue: (code, payload, pref_key, campaign_id)
    queue: list[tuple[str, dict, str, str]] = []
    for code, payload in _dividend_events(today).items():
        queue.append((code, payload, "dividends", f"evt-div-{code}-{today}"))
    for code, (kind, payload) in _extreme_events(ctx, watched_codes).items():
        queue.append((code, payload, "price_extremes", f"evt-{kind}-{code}-{today}"))

    db = get_db()
    sends = db["push_sends"]
    sent = failed = skipped = 0
    for code, payload, pref_key, campaign_id in queue:
        recipients = [w for w in watchers if code in w["watch"] and w["prefs"].get(pref_key, True)]
        n = 0
        for w in recipients:
            if limit_per_event and n >= limit_per_event:
                break
            uid = w["user_id"]
            if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
                skipped += 1
                continue
            n += 1
            result = push_service.send_to_user(uid, {**payload, "tag": campaign_id})
            if result["sent"] > 0:
                status, sent = "sent", sent + 1
            elif result["expired"] > 0 and result["failed"] == 0:
                status, skipped = "expired", skipped + 1
            else:
                status, failed = "failed", failed + 1
            sends.update_one(
                {"campaign_id": campaign_id, "user_id": uid},
                {"$set": {
                    "campaign_id": campaign_id, "user_id": uid,
                    "status": status, "result": result,
                    "sent_at": datetime.now(timezone.utc),
                }},
                upsert=True,
            )
            if pace_seconds:
                time.sleep(pace_seconds)

    counts = {"campaign_id": campaign_base, "events": len(queue),
              "sent": sent, "failed": failed, "skipped": skipped}
    log.info("push events done: %s", counts)
    return counts
