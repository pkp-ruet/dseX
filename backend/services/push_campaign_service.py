"""
Daily push digest — "your stocks today" at market close.

Reuses campaign_service's build-once market context and per-user helpers, but
renders a single short notification line instead of an HTML email and sends via
push_service. The line is the most interesting angle available that day
(milestone → held-stock event → best day this month → beat-the-market →
upcoming dividend → plain P/L → watchlist counts → daily-pick tease), in Bengali
by default (notification_prefs.language == "en" opts out). Deep links carry
`src=push-digest&v=<angle>` so PingTracker can attribute taps per variant.

Idempotent per Dhaka day: campaign_id defaults to `digest-<YYYY-MM-DD>` and every
send writes a `push_sends` row guarded by a unique (campaign_id, user_id) index,
so a re-run the same day is a no-op.
"""
import logging
import time
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from backend.services.db_service import get_db
from backend.services import campaign_service, push_service
from backend.services.auth_service import _dhaka_day, _DHAKA_TZ

log = logging.getLogger("push-digest")

_DIGEST_PROJECTION = {
    "_id": 0, "user_id": 1, "display_name": 1, "watchlist": 1,
    "portfolio": 1, "current_streak": 1, "last_checkin_date": 1,
    "notification_prefs": 1, "digest_state": 1,
}

# Round portfolio-value levels worth celebrating, largest first.
_MILESTONE_LEVELS = [
    (10_000_000, "৳১ কোটি", "Tk 1 crore"),
    (5_000_000, "৳৫০ লাখ", "Tk 50 lakh"),
    (2_500_000, "৳২৫ লাখ", "Tk 25 lakh"),
    (1_000_000, "৳১০ লাখ", "Tk 10 lakh"),
    (500_000, "৳৫ লাখ", "Tk 5 lakh"),
    (200_000, "৳২ লাখ", "Tk 2 lakh"),
    (100_000, "৳১ লাখ", "Tk 1 lakh"),
    (50_000, "৳৫০ হাজার", "Tk 50,000"),
]

_MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
              "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]


def _fmt_tk(n: float) -> str:
    return f"৳{abs(n):,.0f}"


def _lang(user: dict) -> str:
    """Digest language. Bengali is the default for this audience; users can
    opt into English via notification_prefs.language."""
    prefs = user.get("notification_prefs") or {}
    return "en" if prefs.get("language") == "en" else "bn"


def _track(url: str, variant: str, src: str = "push-digest") -> str:
    """Tag a push deep link so PingTracker records which notification drove the tap."""
    sep = "&" if "?" in url else "?"
    return f"{url}{sep}src={src}&v={variant}"


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
# Per-user data helpers
# ---------------------------------------------------------------------------

def _portfolio_day(ctx: dict, holdings: list[dict]) -> Optional[dict]:
    """Today's portfolio move (not all-time P/L — that's the email's job).
    Day P/L is reconstructed per holding from ltp + change_pct."""
    value = cost = day_pnl = 0.0
    priced = day_known = False
    movers: list[dict] = []
    for h in holdings:
        code = (h.get("trading_code") or "").upper()
        try:
            qty = float(h.get("qty") or 0)
            buy = float(h.get("buy_price") or 0)
        except (TypeError, ValueError):
            continue
        p = ctx["prices"].get(code, {})
        ltp = p.get("ltp")
        cost += qty * buy
        if ltp is None:
            continue
        priced = True
        value += qty * ltp
        chg = p.get("change_pct")
        if chg is not None and chg > -100:
            prev = ltp / (1 + chg / 100.0)
            move = qty * (ltp - prev)
            day_pnl += move
            day_known = True
            movers.append({"code": code, "change_pct": chg, "day_move": move})
    if not priced:
        return None
    biggest = max(movers, key=lambda m: abs(m["day_move"]), default=None)
    prev_total = value - (day_pnl if day_known else 0.0)
    day_pct = (day_pnl / prev_total * 100) if (day_known and prev_total) else None
    share = None
    if biggest and day_known and abs(day_pnl) > 1e-9:
        share = abs(biggest["day_move"]) / abs(day_pnl)
    return {
        "value": value, "total_pnl": value - cost,
        "day_pnl": day_pnl if day_known else None, "day_pct": day_pct,
        "biggest": biggest, "biggest_share": share,
    }


def _daily_market_pct(ctx: dict) -> Optional[float]:
    """Today's DSEX % — ctx['pulse'] may hold the 30-day figure (email prefers it),
    so fall back to the raw daily index when the label isn't 'today'."""
    if "_daily_mkt" in ctx:
        return ctx["_daily_mkt"]
    pulse = ctx.get("pulse") or {}
    chg = pulse.get("change_pct") if pulse.get("change_label") == "today" else None
    if chg is None:
        try:
            from backend.services.db_service import load_market_index
            chg = (load_market_index() or {}).get("dsex_change_pct")
        except Exception:  # noqa: BLE001
            chg = None
    ctx["_daily_mkt"] = chg
    return chg


def _upcoming_dividend(ctx: dict, codes: list[str], within_days: int = 5) -> Optional[tuple[str, date]]:
    """Earliest dividend record date within `within_days` among `codes`."""
    best: Optional[tuple[str, date]] = None
    today = date.today()
    for code in codes:
        rd = (ctx.get("dividend_record") or {}).get(code)
        if not rd:
            continue
        if 0 <= (rd - today).days <= within_days and (best is None or rd < best[1]):
            best = (code, rd)
    return best


def _held_event(ctx: dict, codes: list[str], today: str) -> Optional[dict]:
    """Dividend declared today / fresh 52w extreme on held codes. Callers pass
    held-but-not-watched codes only — run_events already pings watchers, and a
    duplicate notification is how push permission gets revoked."""
    if not codes:
        return None
    div_events = ctx.get("_digest_div_events")
    if div_events is None:
        div_events = _dividend_events(today)
        ctx["_digest_div_events"] = div_events
    for code in codes:
        ev = div_events.get(code)
        if ev:
            return {"kind": "div", "code": code, "pct": ev.get("pct")}
    for code, (kind, _payload) in _extreme_events(ctx, set(codes)).items():
        return {"kind": kind, "code": code}
    return None


def _near_alert_angle(ctx: dict, user: dict, lang: str) -> Optional[dict]:
    """Armed price alert within 2% of its target → nudge. Crossed alerts are
    deliberately skipped: the dedicated hit push (notify-price-alerts) runs right
    after the digest in the same cron and must stay the only 'target hit'
    notification. Max one nudge per alert per week via digest_nudged_at."""
    alerts = (ctx.get("_digest_alerts") or {}).get(user["user_id"]) or []
    if not alerts:
        return None
    prefs = user.get("notification_prefs") or {}
    if prefs.get("price_alerts") is False:
        return None
    now = datetime.now(timezone.utc)
    best: Optional[dict] = None
    for a in alerts:
        code = (a.get("trading_code") or "").upper()
        ltp = (ctx["prices"].get(code) or {}).get("ltp")
        try:
            target = float(a.get("target_price") or 0)
        except (TypeError, ValueError):
            continue
        if not ltp or not target:
            continue
        direction = a.get("direction") or "above"
        if (direction == "above" and ltp >= target) or (direction == "below" and ltp <= target):
            continue
        nudged = a.get("digest_nudged_at")
        if nudged:
            if nudged.tzinfo is None:
                nudged = nudged.replace(tzinfo=timezone.utc)
            if now - nudged < timedelta(days=7):
                continue
        gap = abs(target - ltp) / ltp * 100
        if gap <= 2.0 and (best is None or gap < best["gap"]):
            best = {"id": a.get("id"), "code": code, "ltp": float(ltp),
                    "target": target, "gap": gap}
    if not best:
        return None
    bn = lang == "bn"
    code, ltp, target, gap = best["code"], best["ltp"], best["target"], best["gap"]
    return {
        "v": "near-alert", "url": f"/stock/{code}", "_alert_nudge": best["id"],
        "title": "টার্গেটের খুব কাছে 🎯" if bn else "Almost at your target 🎯",
        "body": (f"{code} এখন ৳{ltp:g} — আপনার ৳{target:g} টার্গেট থেকে মাত্র {gap:.1f}% দূরে" if bn
                 else f"{code} is at ৳{ltp:g} — just {gap:.1f}% from your ৳{target:g} target"),
    }


# ---------------------------------------------------------------------------
# Render one user → {title, body, url, tag, v} | None
# ---------------------------------------------------------------------------

def _with_streak(user: dict, payload: dict, lang: str) -> dict:
    """Append a loss-aversion streak nudge when they have a run going and haven't
    checked in yet today."""
    streak = int(user.get("current_streak") or 0)
    today = _dhaka_day(datetime.now(timezone.utc))
    if streak >= 2 and user.get("last_checkin_date") != today:
        if lang == "bn":
            payload["body"] += f" — টানা {streak} দিন 🔥"
        else:
            payload["body"] += f" — Day {streak} 🔥 keep it going"
    return payload


def _portfolio_angle(
    pf: dict, state: dict, ctx: dict, held: list[str],
    watch_set: set[str], lang: str, today: str, month: str,
) -> dict:
    """Pick the most interesting portfolio story available today. Each angle
    withholds the 'which stock' — that's what earns the tap."""
    bn = lang == "bn"
    day_pnl, day_pct = pf.get("day_pnl"), pf.get("day_pct")

    # 1) Crossed a round value level since the last digest (rare, celebratory).
    prev_value = (state or {}).get("last_value")
    if prev_value and pf["value"] > prev_value:
        for level, label_bn, label_en in _MILESTONE_LEVELS:
            if prev_value < level <= pf["value"]:
                return {
                    "v": "milestone",
                    "title": "নতুন মাইলফলক 🎉" if bn else "New milestone 🎉",
                    "body": (f"আপনার পোর্টফোলিও {label_bn} ছাড়িয়ে গেছে — দেখে নিন" if bn
                             else f"Your portfolio just crossed {label_en} — take a look"),
                    "url": "/portfolio",
                }

    # 2) A held stock made news today (dividend declared / 52w extreme).
    held_only = [c for c in held if c not in watch_set]
    ev = _held_event(ctx, held_only, today)
    if ev:
        code = ev["code"]
        if ev["kind"] == "div":
            pct = ev.get("pct")
            if bn:
                body = (f"{code} আজ {pct}% ডিভিডেন্ড ঘোষণা করেছে — স্টকটা আপনার কাছে আছে" if pct
                        else f"{code} আজ ডিভিডেন্ড ঘোষণা করেছে — স্টকটা আপনার কাছে আছে")
            else:
                body = (f"{code} declared a {pct}% dividend today — you hold it" if pct
                        else f"{code} declared a dividend today — you hold it")
            return {"v": "event-div", "url": f"/stock/{code}", "body": body,
                    "title": "ডিভিডেন্ড ঘোষণা 💸" if bn else "Dividend declared 💸"}
        hi = ev["kind"] == "52wh"
        return {
            "v": "event-52w", "url": f"/stock/{code}",
            "title": ("৫২-সপ্তাহের চূড়া 📈" if hi else "৫২-সপ্তাহের তলানি 📉") if bn
                     else ("52-week high 📈" if hi else "52-week low 📉"),
            "body": (f"আপনার {code} আজ ৫২ সপ্তাহের {'সর্বোচ্চ' if hi else 'সর্বনিম্ন'} দামে" if bn
                     else f"{code} in your portfolio hit a new 52-week {'high' if hi else 'low'}"),
        }

    # 3) Best day this month (needs at least one prior tracked day this month).
    best = (state or {}).get("best_day_pnl")
    if ((state or {}).get("best_month") == month and best is not None
            and day_pnl is not None and day_pnl > 0 and day_pnl > best
            and (day_pct or 0) >= 1.0):
        tk = _fmt_tk(day_pnl)
        return {
            "v": "best-day", "url": "/portfolio",
            "title": "এই মাসের সেরা দিন 🚀" if bn else "Your best day this month 🚀",
            "body": (f"আজ +{tk} — এই মাসে আপনার সেরা দিন! কোন স্টক এগিয়ে দিল দেখুন" if bn
                     else f"Up {tk} today — your best day this month. See which stock led"),
        }

    # 4) Market fell, portfolio didn't — comparative framing beats a raw number.
    mkt = _daily_market_pct(ctx)
    if mkt is not None and mkt <= -0.2 and day_pnl is not None and day_pnl >= 0:
        if bn:
            body = (f"DSEX আজ {abs(mkt):.1f}% পড়েছে — আপনার পোর্টফোলিও উল্টো বেড়েছে {_fmt_tk(day_pnl)}"
                    if day_pnl > 0 else
                    f"DSEX আজ {abs(mkt):.1f}% পড়েছে, কিন্তু আপনার পোর্টফোলিও পড়েনি")
        else:
            body = (f"DSEX fell {abs(mkt):.1f}% today — your portfolio rose {_fmt_tk(day_pnl)} anyway"
                    if day_pnl > 0 else
                    f"DSEX fell {abs(mkt):.1f}% today — your portfolio held its ground")
        return {"v": "beat-market", "url": "/portfolio", "body": body,
                "title": "বাজারকে হারিয়েছেন 💪" if bn else "You beat the market 💪"}

    # 5) Quiet day → look forward: a record date coming up on a held/watched stock.
    if day_pct is not None and abs(day_pct) < 0.25:
        up_div = _upcoming_dividend(ctx, held + sorted(watch_set))
        if up_div:
            code, rd = up_div
            return {
                "v": "upcoming-div", "url": f"/stock/{code}",
                "title": "সামনে ডিভিডেন্ড 💸" if bn else "Dividend coming up 💸",
                "body": (f"{code}-এর রেকর্ড ডেট {rd.day} {_MONTHS_BN[rd.month - 1]} — মিস করবেন না" if bn
                         else f"{code}'s record date is {rd.day} {rd.strftime('%b')} — don't miss it"),
            }

    # 6) Plain day P/L — hide the leader's name when one stock dominated.
    if day_pnl is not None:
        up = day_pnl >= 0
        tk = _fmt_tk(day_pnl)
        concentrated = (pf.get("biggest_share") or 0) >= 0.6 and abs(day_pnl) >= 200
        if bn:
            body = (f"পোর্টফোলিও আজ {'+' if up else '−'}{tk} — একটা স্টকই বেশিরভাগটা {'এনেছে' if up else 'কমিয়েছে'}। কোনটা?"
                    if concentrated else
                    f"আপনার পোর্টফোলিও আজ {'বেড়েছে' if up else 'কমেছে'} {tk}")
        else:
            body = (f"Your portfolio is {'up' if up else 'down'} {tk} today — one stock did most of it. Which?"
                    if concentrated else
                    f"Your portfolio is {'up' if up else 'down'} {tk} today")
        return {"v": "pnl", "url": "/portfolio", "body": body,
                "title": "আপনার টাকার খবর 💰" if bn else "Your money today 💰"}

    # No change_pct data at all → honest all-time line instead of a fake "today".
    total = pf["total_pnl"]
    up = total >= 0
    return {
        "v": "pnl-total", "url": "/portfolio",
        "title": "আপনার টাকার খবর 💰" if bn else "Your money today 💰",
        "body": (f"আপনার পোর্টফোলিও এখন মোট {'লাভে' if up else 'লসে'} {_fmt_tk(total)}" if bn
                 else f"Your portfolio is {'up' if up else 'down'} {_fmt_tk(total)} overall"),
    }


def _watchlist_angle(ctx: dict, codes: list[str], lang: str) -> Optional[dict]:
    """Counts over names — '2 jumped, 1 hit a high' earns a tap; the names are
    the payoff on /watchlist."""
    bn = lang == "bn"
    rows = [r for r in campaign_service._watchlist_rows(ctx, codes, limit=8)
            if r.get("change_pct") is not None]
    if not rows:
        return None
    nup = sum(1 for r in rows if r["change_pct"] >= 2)
    ndown = sum(1 for r in rows if r["change_pct"] <= -2)
    nhigh = sum(1 for r in rows if r.get("badge_kind") == "high")
    top = rows[0]
    title = "আপনার ওয়াচলিস্ট 📊" if bn else "Your watchlist today 📊"

    if nup + ndown >= 2:
        parts = []
        if nup:
            parts.append(f"{nup}টা স্টক আজ লাফিয়েছে" if bn else f"{nup} jumped")
        if ndown:
            parts.append(f"{ndown}টা পড়েছে" if bn else f"{ndown} fell")
        if nhigh:
            parts.append(f"{nhigh}টা ৫২-সপ্তাহ চূড়ার কাছে" if bn else f"{nhigh} near a 52w high")
        body = " · ".join(parts) + (" — কোনগুলো দেখুন" if bn else " — see which")
        return {"v": "watch-counts", "title": title, "body": body, "url": "/watchlist"}

    if abs(top["change_pct"]) >= 1.5:
        body = (f"{top['code']} আজ {top['change_pct']:+.1f}% — লিস্টের বাকিগুলোও দেখুন" if bn
                else f"{top['code']} {top['change_pct']:+.1f}% today — check the rest of your list")
        return {"v": "watch-mover", "title": title, "body": body, "url": "/watchlist"}

    badge = next((r for r in rows if r.get("badge_text")), None)
    if badge:
        code, kind = badge["code"], badge.get("badge_kind")
        if bn:
            body = {"high": f"{code} ৫২-সপ্তাহের চূড়ার খুব কাছে",
                    "div": f"{code}-এর ডিভিডেন্ড রেকর্ড ডেট কাছেই",
                    "tier": f"{code} এখন Strong Buy তালিকায়"}.get(kind, f"{code}: {badge['badge_text']}")
        else:
            body = f"{code}: {badge['badge_text']}"
        return {"v": "watch-badge", "title": title, "body": body, "url": f"/stock/{code}"}

    up_div = _upcoming_dividend(ctx, [r["code"] for r in rows])
    if up_div:
        code, rd = up_div
        return {
            "v": "upcoming-div", "url": f"/stock/{code}",
            "title": "সামনে ডিভিডেন্ড 💸" if bn else "Dividend coming up 💸",
            "body": (f"{code}-এর রেকর্ড ডেট {rd.day} {_MONTHS_BN[rd.month - 1]} — মিস করবেন না" if bn
                     else f"{code}'s record date is {rd.day} {rd.strftime('%b')} — don't miss it"),
        }

    body = (f"{top['code']} আজ {top['change_pct']:+.1f}%" if bn
            else f"{top['code']} {top['change_pct']:+.1f}% today")
    return {"v": "watch-mover", "title": title, "body": body, "url": "/watchlist"}


def _cold_angle(ctx: dict, lang: str) -> dict:
    """No portfolio, no watchlist → tease the daily pick instead of a bare index
    line. This is the segment most likely to churn; give them a reason to come."""
    bn = lang == "bn"
    mkt = _daily_market_pct(ctx)
    tease = ("আজকের সেরা স্টক বাছাই তৈরি — দেখে নিন" if bn
             else "today's top stock picks are ready — take a look")
    body = f"DSEX আজ {mkt:+.1f}% · {tease}" if (bn and mkt is not None) else \
           f"DSEX {mkt:+.1f}% today · {tease}" if mkt is not None else tease
    return {"v": "pick", "url": "/stock-recommendation", "body": body,
            "title": "আজকের বাজার" if bn else "DSE today"}


def render_digest_for_user(user: dict, ctx: dict) -> Optional[dict]:
    """One short, personal line — the most interesting angle available today.
    Returns the payload plus a `_state` dict the caller persists after a
    successful send (milestone/best-day tracking) and a `v` variant label."""
    lang = _lang(user)
    today = _dhaka_day(datetime.now(timezone.utc))
    month = today[:7]
    holdings = user.get("portfolio") or []
    watch = [c.upper() for c in (user.get("watchlist") or []) if c]
    watch_set = set(watch)

    payload = None
    state_update = None

    if holdings:
        pf = _portfolio_day(ctx, holdings)
        if pf:
            state = user.get("digest_state") or {}
            held = [(h.get("trading_code") or "").upper() for h in holdings
                    if h.get("trading_code")]
            payload = _portfolio_angle(pf, state, ctx, held, watch_set, lang, today, month)
            # Track state for tomorrow's milestone/best-day checks. Persisted only
            # after a successful send so an unsent milestone fires the next day.
            state_update = {
                "digest_state.last_value": pf["value"],
                "digest_state.last_day": today,
            }
            day_pnl = pf.get("day_pnl")
            if state.get("best_month") != month:
                state_update["digest_state.best_month"] = month
                state_update["digest_state.best_day_pnl"] = day_pnl if day_pnl is not None else 0.0
            elif day_pnl is not None and day_pnl > (state.get("best_day_pnl") or 0):
                state_update["digest_state.best_day_pnl"] = day_pnl

    # A price target about to hit outranks routine angles — the user set that
    # target themselves — but not the rarer celebratory/event ones.
    if payload is None or payload.get("v") not in ("milestone", "event-div", "event-52w", "best-day"):
        near = _near_alert_angle(ctx, user, lang)
        if near:
            payload = near

    if payload is None and watch:
        payload = _watchlist_angle(ctx, watch, lang)
    if payload is None:
        payload = _cold_angle(ctx, lang)

    payload["url"] = _track(payload.get("url") or "/", payload.get("v", "digest"))
    payload["tag"] = "daily-digest"
    if state_update:
        payload["_state"] = state_update
    return _with_streak(user, payload, lang)


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
    # Load once — _held_event would otherwise re-scan declarations per user.
    ctx["_digest_div_events"] = _dividend_events(today)
    # Armed price alerts by user — powers the near-target nudge angle.
    alerts_by_user: dict[str, list[dict]] = {}
    try:
        for a in db["price_alerts"].find({"is_active": True}):
            alerts_by_user.setdefault(a.get("user_id"), []).append(a)
    except Exception:  # noqa: BLE001 — nudges are a nice-to-have, never block the digest
        log.warning("price alert load failed for digest", exc_info=True)
    ctx["_digest_alerts"] = alerts_by_user
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
        # Internal keys — the browser payload carries only title/body/url/tag.
        state_update = payload.pop("_state", None)
        alert_nudge = payload.pop("_alert_nudge", None)
        variant = payload.pop("v", None)

        attempted += 1
        result = push_service.send_to_user(uid, payload)
        if result["sent"] > 0:
            status, sent = "sent", sent + 1
            # Persist milestone/best-day tracking only when the user actually got
            # the notification, so an unsent milestone still fires tomorrow.
            if state_update:
                try:
                    db["users"].update_one({"user_id": uid}, {"$set": state_update})
                except Exception:  # noqa: BLE001 — tracking must never fail the run
                    log.warning("digest_state write failed for %s", uid, exc_info=True)
            # Start the weekly nudge cooldown for the alert we just teased.
            if alert_nudge:
                try:
                    db["price_alerts"].update_one(
                        {"id": alert_nudge},
                        {"$set": {"digest_nudged_at": datetime.now(timezone.utc)}},
                    )
                except Exception:  # noqa: BLE001
                    log.warning("alert nudge write failed for %s", uid, exc_info=True)
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
                "variant": variant,
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
            events[code] = {"title": "Dividend declared 💸", "body": body,
                            "url": f"/stock/{code}", "pct": pct}
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
