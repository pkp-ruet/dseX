"""
Re-engagement campaign engine.

Selects inactive users (by `last_seen_at`), classifies each into a content
segment (portfolio / watchlist / cold), builds the per-user email from market
data loaded ONCE per run, and sends via email_service with idempotency
(one row per campaign+user in `email_sends`).

Heavy market data (scores, prices, dividends, DSEX pulse) is computed once and
reused for every recipient — per-user work is just map lookups + that user's
own watchlist/portfolio.
"""
import logging
import math
import time
from datetime import datetime, timezone, timedelta, date
from typing import Optional

from backend.config import PUBLIC_SITE_URL, PUBLIC_API_BASE_URL
from backend.services.db_service import (
    get_db,
    load_companies,
    load_latest_prices,
    load_price_history,
    load_market_index,
    load_dividend_declarations,
    compute_52w_range,
    compute_market_intelligence,
    load_popular_stocks,
)
from backend.services import email_templates
from backend.services.email_service import (
    send_transactional,
    sign_email_token,
)

log = logging.getLogger("campaign")

_AUDIENCE_PROJECTION = {
    "_id": 0, "user_id": 1, "email": 1, "display_name": 1,
    "last_seen_at": 1, "created_at": 1, "watchlist": 1, "portfolio": 1,
}


# ---------------------------------------------------------------------------
# Link builders
# ---------------------------------------------------------------------------

def _cta_url(path: str, campaign_id: str) -> str:
    return (
        f"{PUBLIC_SITE_URL}{path}"
        f"?utm_source=email&utm_medium=reengage&utm_campaign={campaign_id}"
    )


def _pixel_url(user_id: str, campaign_id: str) -> str:
    token = sign_email_token(user_id, "open", campaign_id)
    return f"{PUBLIC_API_BASE_URL}/api/email/open?t={token}"


def _unsub_url(user_id: str) -> str:
    token = sign_email_token(user_id, "unsub")
    return f"{PUBLIC_API_BASE_URL}/api/email/unsubscribe?t={token}"


def _list_unsub_headers(user_id: str) -> dict:
    url = _unsub_url(user_id)
    return {
        "List-Unsubscribe": f"<{url}>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    }


# ---------------------------------------------------------------------------
# Audience selection
# ---------------------------------------------------------------------------

def _inactivity_filter(cutoff: datetime) -> dict:
    """Users idle since `cutoff`: either last seen before it, or never seen but
    registered before it (don't pester brand-new accounts that just haven't
    navigated yet)."""
    return {
        "$or": [
            {"last_seen_at": {"$lt": cutoff}},
            {"$and": [{"last_seen_at": None}, {"created_at": {"$lt": cutoff}}]},
        ]
    }


def select_audience(inactive_days: int, segments: Optional[list[str]] = None) -> list[dict]:
    db = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)
    query = {
        "is_active": {"$ne": False},
        "email_opt_out": {"$ne": True},
        "email": {"$type": "string"},
        **_inactivity_filter(cutoff),
    }
    docs = [
        d for d in db["users"].find(query, _AUDIENCE_PROJECTION)
        if (d.get("email") or "").strip()
    ]
    if segments:
        docs = [d for d in docs if classify_segment(d) in segments]
    return docs


def classify_segment(user: dict) -> str:
    if user.get("portfolio"):
        return "portfolio"
    if user.get("watchlist"):
        return "watchlist"
    return "cold"


def audience_summary(inactive_days: int) -> dict:
    """Counts for the admin UI: eligible per segment + opted-out / no-email."""
    db = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(days=inactive_days)
    inactivity = _inactivity_filter(cutoff)

    docs = select_audience(inactive_days)
    by_segment = {"portfolio": 0, "watchlist": 0, "cold": 0}
    for d in docs:
        by_segment[classify_segment(d)] += 1

    opted_out = db["users"].count_documents(
        {"is_active": {"$ne": False}, "email_opt_out": True, "email": {"$type": "string"}, **inactivity}
    )
    no_email = db["users"].count_documents(
        {"is_active": {"$ne": False}, "email": {"$exists": False}, **inactivity}
    )
    return {
        "inactive_days": inactive_days,
        "eligible": len(docs),
        "by_segment": by_segment,
        "opted_out": opted_out,
        "no_email": no_email,
    }


# ---------------------------------------------------------------------------
# Market context (built once per run)
# ---------------------------------------------------------------------------

def _dsex_pulse() -> dict:
    idx = load_market_index()
    dsex = idx.get("dsex")
    chg = idx.get("dsex_change_pct")
    label = "today"
    total_value_mn = idx.get("total_value_mn")
    turnover_cr = (total_value_mn / 10.0) if total_value_mn else None  # 1 crore = 10 mn

    # Prefer a 30-day index move (more compelling for a re-engagement email).
    try:
        db = get_db()
        latest = db.dse_market_summary.find_one(
            {"dsex": {"$nin": [None, 0, 0.0]}}, sort=[("date", -1)]
        )
        if latest and latest.get("dsex") and latest.get("date") is not None:
            target = latest["date"] - timedelta(days=30)
            prev = db.dse_market_summary.find_one(
                {"date": {"$lte": target}, "dsex": {"$nin": [None, 0, 0.0]}},
                sort=[("date", -1)],
            )
            if prev and prev.get("dsex"):
                chg = round((latest["dsex"] - prev["dsex"]) / prev["dsex"] * 100, 1)
                label = "past 30 days"
    except Exception:  # noqa: BLE001 — fall back to the daily change
        log.warning("30-day DSEX pulse failed", exc_info=True)

    return {
        "dsex": dsex,
        "change_pct": chg,
        "change_label": label,
        "up_count": idx.get("up_count"),
        "down_count": idx.get("down_count"),
        "turnover_cr": turnover_cr,
    }


def build_market_context() -> dict:
    prices = load_latest_prices()
    companies = {c["trading_code"]: c for c in load_companies()}

    scores: dict[str, float] = {}
    strong: list[dict] = []
    div_yields: list[dict] = []
    try:
        from backend.services.scoring_service import build_scores_df
        df = build_scores_df()
        if not df.empty:
            for _, row in df.iterrows():
                v = row.get("score")
                if v is None or (isinstance(v, float) and math.isnan(v)):
                    continue
                code = row["trading_code"]
                name = companies.get(code, {}).get("company_name")
                s = float(v)
                scores[code] = s
                if s >= 75:
                    strong.append({
                        "code": code, "name": name, "score": s,
                        "ltp": prices.get(code, {}).get("ltp"),
                    })
                dy = row.get("div_yield_pct")
                if dy is not None and not (isinstance(dy, float) and math.isnan(dy)) and dy > 0:
                    div_yields.append({"code": code, "name": name, "yield_pct": float(dy)})
    except Exception:  # noqa: BLE001 — scores are a nice-to-have, never block a send
        log.warning("score load failed for campaign context", exc_info=True)
    strong.sort(key=lambda x: x["score"], reverse=True)
    div_yields.sort(key=lambda x: x["yield_pct"], reverse=True)

    # Dividends: upcoming record dates (≤21d) + count declared in the last 45d
    div_record: dict[str, date] = {}
    upcoming_dividends: list[dict] = []
    dividends_recent_count = 0
    today = date.today()
    recent_cutoff = today - timedelta(days=45)
    try:
        for d in load_dividend_declarations():
            decl = d.get("declaration_date")
            if decl:
                try:
                    if datetime.fromisoformat(str(decl)).date() >= recent_cutoff:
                        dividends_recent_count += 1
                except Exception:
                    pass
            rd = d.get("record_date")
            if not rd:
                continue
            try:
                rdd = datetime.fromisoformat(str(rd)).date()
            except Exception:
                continue
            if 0 <= (rdd - today).days <= 21:
                div_record[d["trading_code"]] = rdd
                upcoming_dividends.append({
                    "code": d["trading_code"],
                    "cash_pct": d.get("cash_dividend_pct"),
                    "record_date": rdd,
                })
    except Exception:  # noqa: BLE001
        log.warning("dividend load failed for campaign context", exc_info=True)
    upcoming_dividends.sort(key=lambda x: x["record_date"])

    # Strongest sectors today (reuses the cached market-intelligence compute)
    sectors: list[dict] = []
    try:
        mi = compute_market_intelligence()
        sectors = ((mi.get("signals") or {}).get("sector_strength") or [])[:4]
    except Exception:  # noqa: BLE001
        log.warning("sector strength failed for campaign context", exc_info=True)

    # Most-watched (social proof) from all-time visit data
    most_watched: list[dict] = []
    try:
        pop = load_popular_stocks(8)
        for it in (pop.get("items") or [])[:6]:
            most_watched.append({
                "code": it.get("trading_code"),
                "name": it.get("company_name"),
                "change_pct": it.get("change_pct"),
            })
    except Exception:  # noqa: BLE001
        log.warning("popular stocks failed for campaign context", exc_info=True)

    return {
        "prices": prices,
        "companies": companies,
        "scores": scores,
        "strong_buy": strong,
        "strong_buy_count": len(strong),
        "top_dividends": div_yields[:4],
        "dividend_record": div_record,
        "upcoming_dividends": upcoming_dividends[:3],
        "dividends_recent_count": dividends_recent_count,
        "sectors": sectors,
        "most_watched": most_watched,
        "pulse": _dsex_pulse(),
        "range_cache": {},  # lazy 52w high/low per code, computed once per run
    }


# ---------------------------------------------------------------------------
# Per-stock helpers
# ---------------------------------------------------------------------------

def _52w(ctx: dict, code: str) -> tuple[Optional[float], Optional[float]]:
    cache = ctx["range_cache"]
    if code in cache:
        return cache[code]
    hi = lo = None
    try:
        hi, lo = compute_52w_range(load_price_history(code))
    except Exception:  # noqa: BLE001
        pass
    cache[code] = (hi, lo)
    return hi, lo


def _badge_for_code(ctx: dict, code: str, ltp: Optional[float]) -> tuple[Optional[str], Optional[str]]:
    """Most attention-worthy badge for a watchlist row: near-52w-high → dividend
    → strong/safe buy → none."""
    hi, _lo = _52w(ctx, code)
    if ltp and hi and ltp >= 0.95 * hi:
        return "near 52w high", "high"
    rd = ctx["dividend_record"].get(code)
    if rd:
        return f"div record {rd.day} {rd.strftime('%b')}", "div"
    score = ctx["scores"].get(code)
    if score is not None:
        if score >= 75:
            return f"Strong Buy · {int(round(score))}", "tier"
        if score >= 55:
            return f"Safe Buy · {int(round(score))}", "tier"
    return None, None


def _watchlist_rows(ctx: dict, codes: list[str], limit: int = 6) -> list[dict]:
    seen, clean = set(), []
    for c in codes:
        cu = (c or "").upper()
        if cu and cu not in seen:
            seen.add(cu)
            clean.append(cu)
    # Surface the biggest movers first.
    clean.sort(key=lambda c: abs(ctx["prices"].get(c, {}).get("change_pct") or 0), reverse=True)
    rows = []
    for code in clean[:limit]:
        p = ctx["prices"].get(code, {})
        ltp = p.get("ltp")
        badge_text, badge_kind = _badge_for_code(ctx, code, ltp)
        rows.append({
            "code": code,
            "company_name": ctx["companies"].get(code, {}).get("company_name"),
            "ltp": ltp,
            "change_pct": p.get("change_pct"),
            "badge_text": badge_text,
            "badge_kind": badge_kind,
        })
    return rows


def _portfolio_summary(ctx: dict, holdings: list[dict]) -> Optional[dict]:
    value = cost = 0.0
    priced = False
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
        if ltp is not None:
            priced = True
            value += qty * ltp
        movers.append({"code": code, "change_pct": p.get("change_pct")})
    if not priced:
        return None
    pnl = value - cost
    pnl_pct = (pnl / cost * 100) if cost else None
    biggest = max(
        (m for m in movers if m["change_pct"] is not None),
        key=lambda m: abs(m["change_pct"]),
        default=None,
    )
    return {"value": value, "cost": cost, "pnl": pnl, "pnl_pct": pnl_pct, "biggest_mover": biggest}


def _weeks_away(user: dict) -> Optional[int]:
    seen = user.get("last_seen_at") or user.get("created_at")
    if not isinstance(seen, datetime):
        return None
    seen_n = seen.replace(tzinfo=None) if seen.tzinfo else seen
    days = (datetime.utcnow() - seen_n).days
    return days // 7 if days >= 14 else None


# ---------------------------------------------------------------------------
# Render one user → {segment, subject, html, to_email, to_name}
# ---------------------------------------------------------------------------

def render_for_user(user: dict, ctx: dict, campaign_id: str) -> dict:
    segment = classify_segment(user)
    name = (user.get("display_name") or "").strip() or "there"
    first_name = name.split()[0] if name != "there" else "there"
    weeks = _weeks_away(user)
    uid = user["user_id"]
    pulse = ctx["pulse"]
    strong = ctx["strong_buy"]
    strong_count = ctx["strong_buy_count"]

    watchlist_rows = None
    portfolio = None

    if segment == "portfolio":
        portfolio = _portfolio_summary(ctx, user.get("portfolio") or [])
        if portfolio is None:  # no prices for any holding → fall back to cold
            segment = "cold"

    if segment == "watchlist":
        watchlist_rows = _watchlist_rows(ctx, user.get("watchlist") or [])
        if not watchlist_rows:
            segment = "cold"

    # Subject + CTA per segment
    if segment == "portfolio":
        pnl = portfolio.get("pnl") if portfolio else None
        direction = "up" if (pnl or 0) >= 0 else "down"
        subject = f"{first_name}, your portfolio is {direction} since you left"
        preheader = f"Your holdings + {strong_count} stocks just hit Strong Buy"
        cta_text, cta_path = "See your portfolio", "/portfolio"
    elif segment == "watchlist":
        top = watchlist_rows[0] if watchlist_rows else None
        if top and top.get("change_pct") is not None and abs(top["change_pct"]) >= 1:
            subject = f"{top['code']} moved {top['change_pct']:+.1f}% — your watchlist update"
        else:
            subject = f"{first_name}, your watchlist moved"
        preheader = f"{len(watchlist_rows)} stocks on your list · {strong_count} new Strong Buy"
        cta_text, cta_path = "See your watchlist", "/watchlist"
    else:
        chg = pulse.get("change_pct")
        if chg is not None:
            subject = f"DSEX is {chg:+.1f}% — {strong_count} Strong Buy stocks you're missing"
        else:
            subject = f"{strong_count} Strong Buy stocks on the DSE right now"
        preheader = "A quick market update from TopStock BD"
        cta_text, cta_path = "Explore today's market", "/dse-today"

    recap = {
        "dsex_chg": pulse.get("change_pct"),
        "dsex_label": pulse.get("change_label"),
        "strong_count": strong_count,
        "dividends_count": ctx.get("dividends_recent_count"),
    }

    html = email_templates.build_html(
        segment=segment,
        name=name,
        weeks_away=weeks,
        preheader=preheader,
        pulse=pulse,
        strong_buy=strong,
        strong_buy_count=strong_count,
        watchlist_rows=watchlist_rows,
        portfolio=portfolio,
        recap=recap,
        top_dividends=ctx.get("top_dividends"),
        upcoming_dividends=ctx.get("upcoming_dividends"),
        sectors=ctx.get("sectors"),
        most_watched=ctx.get("most_watched"),
        cta_text=cta_text,
        cta_url=_cta_url(cta_path, campaign_id),
        unsubscribe_url=_unsub_url(uid),
        pixel_url=_pixel_url(uid, campaign_id),
    )
    return {
        "segment": segment,
        "subject": subject,
        "html": html,
        "to_email": user.get("email"),
        "to_name": name if name != "there" else None,
    }


# ---------------------------------------------------------------------------
# Preview + test (admin, no audience write)
# ---------------------------------------------------------------------------

def _sample_user(segment: str, ctx: dict) -> dict:
    codes = [s["code"] for s in ctx["strong_buy"][:4]]
    if not codes:
        codes = list(ctx["prices"].keys())[:4]
    base = {
        "user_id": "preview",
        "email": "preview@example.com",
        "display_name": "Rahim",
        "last_seen_at": datetime.utcnow() - timedelta(days=42),
        "watchlist": [],
        "portfolio": [],
    }
    if segment == "watchlist":
        base["watchlist"] = codes
    elif segment == "portfolio":
        base["portfolio"] = [
            {"trading_code": c, "qty": 100, "buy_price": round((ctx["prices"].get(c, {}).get("ltp") or 100) * 0.9, 2)}
            for c in codes[:3]
        ]
    return base


def preview_html(segment: str, campaign_id: str = "preview") -> str:
    ctx = build_market_context()
    user = _sample_user(segment, ctx)
    return render_for_user(user, ctx, campaign_id)["html"]


def send_test(segment: str, to_email: str, to_name: Optional[str]) -> str:
    ctx = build_market_context()
    user = _sample_user(segment, ctx)
    user.update({"email": to_email, "display_name": to_name or "there", "user_id": "test"})
    r = render_for_user(user, ctx, "test")
    return send_transactional(
        to_email, to_name, r["subject"], r["html"],
        tags=["test"], headers=_list_unsub_headers("test"),
    )


# ---------------------------------------------------------------------------
# Run a campaign (designed for FastAPI BackgroundTasks)
# ---------------------------------------------------------------------------

def run_campaign(
    campaign_id: str,
    segments: Optional[list[str]],
    inactive_days: int,
    limit: Optional[int] = None,
    created_by: Optional[str] = None,
    pace_seconds: float = 0.6,  # stay under Resend's default 2 req/s
) -> dict:
    db = get_db()
    sends = db["email_sends"]
    campaigns = db["email_campaigns"]
    now = datetime.now(timezone.utc)

    ctx = build_market_context()
    audience = select_audience(inactive_days, segments)

    campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {
            "campaign_id": campaign_id,
            "segments": segments,
            "inactive_days": inactive_days,
            "limit": limit,
            "created_by": created_by,
            "created_at": now,
            "status": "sending",
            "eligible": len(audience),
        }},
        upsert=True,
    )

    sent = failed = skipped = 0
    attempted = 0
    for user in audience:
        if limit and attempted >= limit:
            break
        uid = user["user_id"]
        email = (user.get("email") or "").strip()
        if not email:
            skipped += 1
            continue
        # Idempotency — never email the same user twice for one campaign.
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            skipped += 1
            continue

        attempted += 1
        segment = classify_segment(user)
        status, msg_id, err = "failed", None, None
        try:
            rendered = render_for_user(user, ctx, campaign_id)
            segment = rendered["segment"]
            msg_id = send_transactional(
                email, rendered["to_name"], rendered["subject"], rendered["html"],
                tags=[campaign_id], headers=_list_unsub_headers(uid),
            )
            status, sent = "sent", sent + 1
        except Exception as exc:  # noqa: BLE001 — one bad send must not abort the run
            err = str(exc)[:300]
            failed += 1
            log.warning("send failed for %s: %s", uid, err)

        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {
                "campaign_id": campaign_id,
                "user_id": uid,
                "email": email,
                "segment": segment,
                "status": status,
                "brevo_message_id": msg_id,
                "error": err,
                "sent_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        if pace_seconds:
            time.sleep(pace_seconds)

    counts = {"sent": sent, "failed": failed, "skipped": skipped, "attempted": attempted}
    campaigns.update_one(
        {"campaign_id": campaign_id},
        {"$set": {"status": "done", "counts": counts, "finished_at": datetime.now(timezone.utc)}},
    )
    log.info("campaign %s done: %s", campaign_id, counts)
    return {"campaign_id": campaign_id, "eligible": len(audience), **counts}


def campaign_stats(campaign_id: str) -> dict:
    """Live aggregation from email_sends — drives the admin progress poll."""
    db = get_db()
    pipeline = [
        {"$match": {"campaign_id": campaign_id}},
        {"$group": {
            "_id": "$status",
            "n": {"$sum": 1},
            "opened": {"$sum": {"$cond": [{"$gt": ["$open_count", 0]}, 1, 0]}},
        }},
    ]
    sent = failed = opened = 0
    for row in db["email_sends"].aggregate(pipeline):
        if row["_id"] == "sent":
            sent = row["n"]
            opened = row.get("opened", 0)
        elif row["_id"] == "failed":
            failed = row["n"]
    camp = db["email_campaigns"].find_one({"campaign_id": campaign_id}, {"_id": 0})
    return {
        "campaign_id": campaign_id,
        "status": (camp or {}).get("status", "unknown"),
        "eligible": (camp or {}).get("eligible"),
        "sent": sent,
        "failed": failed,
        "opened": opened,
    }
