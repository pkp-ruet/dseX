"""
Daily market email — ONE shared email sent to lapsed power users.

Unlike the per-user re-engagement flow (campaign_service.py), this builds the
body once per day and sends near-identical content to an auto-selected
audience; only the personal strip, unsubscribe link and open pixel differ.

The mail is a short paper, not a table of numbers — a fixed spine so it
becomes a habit, plus one slot that changes daily so five mornings running
never look the same:

  1. Today's story    three plain sentences + the Bengali summary
  2. In one glance    index / turnover / breadth, and the week underneath
  3. Your stocks      PER-USER: their own biggest movers (see personal_block)
  4. Three worth      strongest / biggest dividend / fastest growing, rotated
                      daily — the same three the homepage tells
  5. Today's buys     the top few, with "New today" on what actually changed
  6. One thing        a real concept taught off a real stock in today's data
  7. ↻ Rotating       Sun sectors · Mon dividends · Tue near-low ·
                      Wed unusual buying · Thu a deep report (Fri/Sat reuse
                      the two week-shaped ones); falls through when thin
  8. In the news      three company headlines
  9. Scorecard        how the last mail's featured picks moved since

Every block is failure-isolated through `_safe`: an empty or broken source
drops that block, never the email. On a data-starved day the mail degrades to
the story lede plus the glance and still renders.

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
from backend.services.daily_tips_service import get_daily_tips
from backend.services.db_service import (
    _ttl_cache,
    get_db,
    load_companies,
    load_latest_prices,
    load_market_index,
    load_market_news,
    load_dividend_declarations,
)
from backend.services.deep_analysis_service import list_report_codes, report_teaser
from backend.services.email_service import send_transactional
from backend.services.market_state_service import compute_market_state
from backend.services.scoring_service import build_scores_df
from backend.services.signal_service import build_signals
from backend.services.story_picks import STORY_META, market_day_index, pick_story_stocks

log = logging.getLogger("daily_email")

DEFAULT_CAP = 300
LAPSED_DAYS = 7      # idle at least this long to be re-engaged
COOLDOWN_DAYS = 7    # never email the same person more often than this
MAX_BUYS = 3         # Buy cards in the mail; the rest live behind "see all"
MAX_HEADLINES = 3
MAX_WATCHLIST = 3    # per-user movers in the personal strip

# The running "how our featured picks did" line. Flip to False to ship the
# mail with only the single-day scorecard and no aggregate track record.
SHOW_TRACK_RECORD = True
TRACK_RECORD_EMAILS = 6   # how many past daily emails the running line covers

# One doc per day: {date, codes[]}. Lets the mail mark a Buy as "new today"
# instead of showing the same five codes for a week with no way to tell.
_BUY_SET_COLLECTION = "daily_buy_sets"

_PROJECTION = {
    "_id": 0, "user_id": 1, "email": 1, "display_name": 1,
    "last_seen_at": 1, "created_at": 1, "last_emailed_at": 1,
    "watchlist": 1, "portfolio": 1,
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

def _f(v) -> Optional[float]:
    """Plain float or None — scores arrive as numpy scalars off the DataFrame."""
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f  # NaN


def _signed_pct(v: Optional[float], nd: int = 1) -> str:
    if v is None:
        return "—"
    return f"{'+' if v >= 0 else '−'}{abs(v):.{nd}f}%"


def _pct_str(v: Optional[float]) -> str:
    """One decimal only when it says something (10.5% but 12% not 12.0%)."""
    if v is None:
        return ""
    return str(int(v)) if float(v).is_integer() else f"{v:.1f}"


def _pretty_date(v) -> str:
    """'2026-08-14' / datetime → '14 Aug' (no %-d, Windows-safe)."""
    if not v:
        return ""
    try:
        d = v if isinstance(v, datetime) else datetime.fromisoformat(str(v)[:19])
    except ValueError:
        return ""
    return f"{d.day} {d:%b}"


def _trim(s: str, n: int) -> str:
    s = " ".join((s or "").split())
    return s if len(s) <= n else s[: n - 1].rstrip(" ,.;:-") + "…"


def _safe(fn, default=None, what: str = ""):
    """Run one content block; a failure drops that block, never the email."""
    try:
        return fn()
    except Exception:  # noqa: BLE001 — every block is a nice-to-have
        log.warning("daily email block failed: %s", what, exc_info=True)
        return default


def _stock_url(code: str, campaign_id: str, suffix: str = "") -> str:
    return _tag_url(f"{PUBLIC_SITE_URL}/stock/{code}{suffix}", campaign_id)


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


def _score_rows() -> list[dict]:
    """Every scored company as a plain dict with its Buy/Sell signal attached —
    the same shape `/api/scores` serves, which is what the story picker expects."""
    df = build_scores_df()
    if df is None or df.empty:
        return []
    rows = df.to_dict("records")
    signals = build_signals()
    for r in rows:
        r["signal"] = signals.get(r.get("trading_code"))
    return rows


# --- Buy signals ------------------------------------------------------------

def _prev_buy_codes() -> set:
    """Yesterday's Buy set, so today's mail can mark what actually changed.
    Buy signals are sticky; without this the same codes read as fresh news
    every single day."""
    today = _dhaka_now().strftime("%Y-%m-%d")
    doc = get_db()[_BUY_SET_COLLECTION].find_one(
        {"date": {"$lt": today}}, {"_id": 0, "codes": 1}, sort=[("date", -1)]
    )
    return set((doc or {}).get("codes") or [])


def _remember_buy_codes(codes: list[str]) -> None:
    today = _dhaka_now().strftime("%Y-%m-%d")
    get_db()[_BUY_SET_COLLECTION].update_one(
        {"date": today},
        {"$set": {"date": today, "codes": codes,
                  "updated_at": datetime.now(timezone.utc)}},
        upsert=True,
    )


def _select_buys(prices: dict, companies: dict, campaign_id: str) -> tuple[list[dict], int]:
    """The featured Buy cards plus how many Buy signals exist in total."""
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
            "reason_bn": sig.get("reason_bn"),
            "strength": sig.get("strength"),
            "score": sig.get("score") or 0,
        })
    # Strong buys first, then by fundamental score.
    buys.sort(key=lambda b: (0 if b["strength"] == "strong" else 1, -(b["score"] or 0)))
    total = len(buys)

    prev = _safe(_prev_buy_codes, set(), "prev buy codes") or set()
    _safe(lambda: _remember_buy_codes([b["code"] for b in buys]), None, "remember buy codes")

    top = buys[:MAX_BUYS]
    for b in top:
        # Only claim "new" when we actually have a previous day to compare to.
        b["is_new"] = bool(prev) and b["code"] not in prev
        b["url"] = _stock_url(b["code"], campaign_id)
    return top, total


# --- Block 2: today's story -------------------------------------------------

def _story_lead(state: dict, market: dict) -> Optional[dict]:
    """Three plain sentences: what happened, who moved, what it means. This is
    the block that turns a table of numbers into something worth reading."""
    stats = state.get("stats") or {}
    mood = state.get("mood") or {}
    lines: list[str] = []

    chg, up, down = market.get("dsex_chg"), market.get("up"), market.get("down")
    breadth = up is not None and down is not None
    if chg is None:
        opener = "Here's how the day went on the Dhaka Stock Exchange"
    elif abs(chg) < 0.05:
        opener = "The market index barely moved today"
    else:
        opener = f"The market index {'rose' if chg > 0 else 'fell'} {abs(chg):.1f}% today"
    if breadth:
        opener += f" — {up} shares up, {down} down"
    # With neither an index move nor a breadth count there is no day to narrate.
    if chg is None and not breadth:
        return None
    lines.append(opener + ".")

    bits: list[str] = []
    wk = stats.get("week_change_pct")
    if wk is not None:
        bits.append(f"Over the past week it's {'up' if wk >= 0 else 'down'} {abs(wk):.1f}%")
    sectors = [s for s in ((state.get("now") or {}).get("sectors") or [])
               if s.get("ret_1w") is not None]
    if len(sectors) >= 2:
        best, worst = sectors[0], sectors[-1]
        part = f"{best['name']} is holding up best ({_signed_pct(best['ret_1w'])} in a week)"
        if worst["ret_1w"] < best["ret_1w"]:
            part += f", while {worst['name']} is the weakest ({_signed_pct(worst['ret_1w'])})"
        bits.append(part)
    if bits:
        lines.append(". ".join(bits) + ".")

    takeaway = (mood.get("sentence2") or "").strip()
    if takeaway:
        lines.append(takeaway)

    if not lines:
        return None
    return {"lines": lines, "bn": (state.get("summary_bn") or "").strip() or None}


# --- Block 4: three worth knowing -------------------------------------------

def _three_stories(rows: list[dict], campaign_id: str) -> list[dict]:
    """The same three story slots the homepage shows — strongest, biggest
    dividend, fastest growing — rotated one step per day."""
    picks = pick_story_stocks(rows, len(rows))
    out = []
    for p in picks:
        r = p["row"]
        code = r.get("trading_code")
        meta = STORY_META[p["key"]]
        out.append({
            "key": p["key"],
            "label": meta["label"],
            "glyph": meta["glyph"],
            "code": code,
            "name": r.get("company_name"),
            "headline": p["headline"],
            "metric_label": p["metric_label"],
            "metric_value": p["metric_value"],
            "ltp": _f(r.get("ltp")),
            "change_pct": _f(r.get("change_pct")),
            "reason_en": p.get("reason_en"),
            "reason_bn": p.get("reason_bn"),
            "url": _stock_url(code, campaign_id),
        })
    return out


# --- Block 6: one thing to learn --------------------------------------------

def _learn_one_thing(campaign_id: str) -> Optional[dict]:
    """A real concept, taught off a real stock in today's data. Rotates daily
    through the conviction tips so it's never the same lesson twice running."""
    tips = (get_daily_tips() or {}).get("tips") or []
    tips = [t for t in tips if (t.get("why") or "").strip()]
    if not tips:
        return None
    tip = tips[market_day_index() % len(tips)]
    facts = tip.get("facts") or []
    code = tip.get("trading_code")
    return {
        "concept": tip["why"],
        "concept_bn": (tip.get("why_bn") or "").strip() or None,
        "code": code,
        "name": tip.get("company_name"),
        "fact_label": facts[0].get("label") if facts else None,
        "fact_value": facts[0].get("value") if facts else None,
        "url": _stock_url(code, campaign_id) if code else None,
    }


# --- Block 7: the rotating slot ---------------------------------------------
# DSE trades Sunday–Thursday, so the five trading days each get their own
# angle and the two closed days reuse the two week-shaped ones. Python's
# weekday(): Mon=0 … Sun=6.

_ROTATION_BY_WEEKDAY = {
    6: "sectors",     # Sunday
    0: "dividends",   # Monday
    1: "near_low",    # Tuesday
    2: "unusual",     # Wednesday
    3: "deep",        # Thursday
    4: "sectors",     # Friday — market closed, so the week in review
    5: "deep",        # Saturday
}
_ROTATION_ORDER = ("sectors", "dividends", "near_low", "unusual", "deep")


def _rot_sectors(state: dict, campaign_id: str) -> Optional[dict]:
    secs = [s for s in ((state.get("now") or {}).get("sectors") or [])
            if s.get("ret_1w") is not None]
    if len(secs) < 3:
        return None
    chosen = secs[:3]
    if secs[-1] not in chosen:
        chosen = chosen + [secs[-1]]
    items = [{
        "left": s["name"],
        "right": _signed_pct(s["ret_1w"]),
        "tone": "pos" if s["ret_1w"] >= 0 else "neg",
        "note": s.get("status"),
    } for s in chosen]
    return {
        "kind": "sectors",
        "title": "Which businesses are doing well",
        "subtitle": "Average move over the past week, by type of business.",
        "bn": "গত এক সপ্তাহে কোন ধরনের ব্যবসা ভালো করছে।",
        "items": items,
        "more_text": "See the full market picture",
        "more_url": _tag_url(f"{PUBLIC_SITE_URL}/market-analysis", campaign_id),
    }


def _rot_dividends(state: dict, campaign_id: str) -> Optional[dict]:
    evs = (state.get("next") or {}).get("dividends") or []
    if not evs:
        return None
    items = []
    for e in evs[:4]:
        pct = _f(e.get("dividend_pct"))
        when = _pretty_date(e.get("date"))
        items.append({
            "left": e.get("trading_code"),
            "sub": _trim(e.get("company_name") or "", 24),
            "right": f"{_pct_str(pct)}% dividend" if pct else "Dividend",
            "tone": "warm",
            "note": (f"Record date {when}" if e.get("kind") == "record"
                     else f"Declared {when}".strip()),
            "url": _stock_url(e["trading_code"], campaign_id) if e.get("trading_code") else None,
        })
    return {
        "kind": "dividends",
        "title": "Dividends coming up",
        "subtitle": "You must own the share before the record date to get paid.",
        "bn": "রেকর্ড ডেটের আগে শেয়ার হাতে থাকলে তবেই ডিভিডেন্ড পাবেন।",
        "items": items,
        "more_text": "See every upcoming dividend",
        "more_url": _tag_url(f"{PUBLIC_SITE_URL}/market-analysis", campaign_id),
    }


def _rot_near_low(state: dict, campaign_id: str) -> Optional[dict]:
    fallen = (state.get("chances") or {}).get("fallen") or []
    if not fallen:
        return None
    items = []
    for f in fallen[:4]:
        m = _f(f.get("ret_1m"))
        note_bits = []
        if f.get("score") is not None:
            note_bits.append(f"Score {int(f['score'])}")
        if m is not None:
            note_bits.append(f"{_signed_pct(m)} in a month")
        items.append({
            "left": f.get("trading_code"),
            "sub": _trim(f.get("company_name") or "", 24),
            "right": f"৳{f['last_price']:,.1f}" if f.get("last_price") else "—",
            "note": " · ".join(note_bits),
            "url": _stock_url(f["trading_code"], campaign_id) if f.get("trading_code") else None,
        })
    return {
        "kind": "near_low",
        "title": "Solid companies near their lowest for the year",
        "subtitle": "Cheaper than they've been in twelve months — worth a look, not a rush.",
        "bn": "এক বছরের মধ্যে সবচেয়ে কম দামের কাছে আছে — দেখে রাখুন, তাড়াহুড়ো নয়।",
        "items": items,
        "more_text": "See what else has fallen",
        "more_url": _tag_url(f"{PUBLIC_SITE_URL}/market-analysis", campaign_id),
    }


def _rot_unusual(state: dict, campaign_id: str) -> Optional[dict]:
    us = (state.get("next") or {}).get("unusual") or []
    if not us:
        return None
    items = []
    for u in us[:4]:
        ratio = _f(u.get("volume_ratio"))
        items.append({
            "left": u.get("trading_code"),
            "sub": _trim(u.get("company_name") or "", 24),
            "right": _signed_pct(_f(u.get("change_pct"))),
            "tone": "pos" if (_f(u.get("change_pct")) or 0) >= 0 else "neg",
            "note": f"{ratio:.1f}× its normal trading today" if ratio else None,
            "url": _stock_url(u["trading_code"], campaign_id) if u.get("trading_code") else None,
        })
    return {
        "kind": "unusual",
        "title": "Being bought more than usual",
        "subtitle": "Trading far above their own recent average, with the price holding up.",
        "bn": "আজ এদের কেনাবেচা স্বাভাবিকের চেয়ে অনেক বেশি, দামও পড়েনি।",
        "items": items,
        "more_text": "See today's whole market",
        "more_url": _tag_url(f"{PUBLIC_SITE_URL}/dse-today", campaign_id),
    }


def _rot_deep(state: dict, campaign_id: str) -> Optional[dict]:
    codes = list_report_codes()
    if not codes:
        return None
    code = codes[market_day_index() % len(codes)]
    t = report_teaser(code)
    if not t or not (t.get("headline_en") or t.get("bottom_line_en")):
        return None
    return {
        "kind": "deep",
        "title": "Report of the day",
        "subtitle": f"A full write-up on {code}, free to read.",
        "bn": None,
        "items": [],
        "prose": {
            "code": code,
            "headline": t.get("headline_en"),
            "headline_bn": t.get("headline_bn"),
            "bottom_line": t.get("bottom_line_en"),
            "bottom_line_bn": t.get("bottom_line_bn"),
        },
        "more_text": f"Read the full {code} report",
        "more_url": _stock_url(code, campaign_id, "/analysis"),
    }


_ROTATION_BUILDERS = {
    "sectors": _rot_sectors,
    "dividends": _rot_dividends,
    "near_low": _rot_near_low,
    "unusual": _rot_unusual,
    "deep": _rot_deep,
}


def _rotating_block(state: dict, campaign_id: str) -> Optional[dict]:
    """Today's angle, falling through to the next one that has data so a thin
    day never leaves a hole in the middle of the mail."""
    first = _ROTATION_BY_WEEKDAY.get(_dhaka_now().weekday(), "sectors")
    order = [first] + [k for k in _ROTATION_ORDER if k != first]
    for kind in order:
        block = _safe(lambda k=kind: _ROTATION_BUILDERS[k](state, campaign_id),
                      None, f"rotating:{kind}")
        if block and (block.get("items") or block.get("prose")):
            return block
    return None


# --- Block 8: headlines -----------------------------------------------------

def _headlines(campaign_id: str) -> list[dict]:
    """The freshest company news, one per company so three different names show."""
    out, seen = [], set()
    for n in load_market_news(limit=40) or []:
        code = n.get("trading_code")
        title = (n.get("title") or "").strip()
        if not code or not title or code in seen:
            continue
        seen.add(code)
        out.append({
            "code": code,
            "name": n.get("company_name"),
            "title": _trim(title, 105),
            "when": _pretty_date(n.get("post_date")),
            "url": _stock_url(code, campaign_id),
        })
        if len(out) >= MAX_HEADLINES:
            break
    return out


# --- Block 9: how the featured picks did ------------------------------------

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
    return {"items": items, "up_count": up, "total": len(items), "date_label": label,
            "record": _safe(lambda: _track_record(prices, today_id), None, "track record")}


def _track_record(prices: dict, today_id: str) -> Optional[dict]:
    """Across the last few daily emails, how many featured picks are higher now
    than when we showed them. Bounded and factual — set SHOW_TRACK_RECORD=False
    to leave it out entirely."""
    if not SHOW_TRACK_RECORD:
        return None
    docs = list(
        get_db()["email_campaigns"]
        .find({"campaign_id": {"$regex": "^daily-", "$lt": today_id},
               "featured.0": {"$exists": True}}, {"_id": 0, "featured": 1})
        .sort("campaign_id", -1).limit(TRACK_RECORD_EMAILS)
    )
    total = up = 0
    for d in docs:
        for f in d.get("featured") or []:
            base = f.get("ltp")
            cur = (prices.get(f.get("code")) or {}).get("ltp")
            if base and cur:
                total += 1
                if cur > base:
                    up += 1
    if total < 5:  # too thin to mean anything
        return None
    return {"up": up, "total": total, "emails": len(docs)}


# --- Per-user: your watchlist today -----------------------------------------

def _user_codes(user: dict) -> list[str]:
    codes, seen = [], set()
    for c in (user.get("watchlist") or []):
        c = (c or "").strip().upper()
        if c and c not in seen:
            seen.add(c)
            codes.append(c)
    for h in (user.get("portfolio") or []):
        c = ((h or {}).get("trading_code") or "").strip().upper()
        if c and c not in seen:
            seen.add(c)
            codes.append(c)
    return codes


def personal_block(user: dict, content: dict) -> Optional[dict]:
    """The recipient's own biggest movers. Every recipient of this mail owns a
    watchlist or a portfolio, so this is the one part written for them alone —
    built at render time off prices the shared content already loaded."""
    codes = _user_codes(user)
    if not codes:
        return None
    prices = content.get("_prices") or {}
    names = content.get("_names") or {}
    signals = content.get("_signals") or {}
    campaign_id = content.get("campaign_id", "")

    rows = []
    for code in codes:
        p = prices.get(code)
        if not p:
            continue
        chg = _f(p.get("change_pct"))
        rows.append({
            "code": code,
            "name": _trim(names.get(code) or "", 22),
            "ltp": _f(p.get("ltp")),
            "change_pct": chg,
            "signal": (signals.get(code) or {}).get("signal"),
            "url": _stock_url(code, campaign_id),
            "_sort": abs(chg) if chg is not None else -1.0,
        })
    if not rows:
        return None
    rows.sort(key=lambda r: r["_sort"], reverse=True)
    top = rows[:MAX_WATCHLIST]
    for r in top:
        r.pop("_sort", None)
    movers = [r for r in top if (r.get("change_pct") or 0) != 0]
    return {"items": top, "total": len(rows), "quiet": not movers}


# --- Subject / preheader ----------------------------------------------------

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


def _pick_subject(idx: dict, buys: list[dict], buys_total: int, div_count: int,
                  stories: list[dict], rot: Optional[dict]) -> str:
    """Best angle of the day — driven by the data, so no two days repeat."""
    chg = idx.get("dsex_change_pct")
    n = buys_total or len(buys)   # the count the reader will find on the site
    new_n = sum(1 for b in buys if b.get("is_new"))

    if n and chg is not None and abs(chg) >= 1.0:
        d = "jumped" if chg > 0 else "dropped"
        return f"DSEX {d} {abs(chg):.1f}% today — {n} stock{'s' if n > 1 else ''} worth a look"
    if new_n:
        first = next(b["code"] for b in buys if b.get("is_new"))
        return f"New buy signal today: {first}"
    if rot and rot.get("kind") == "dividends" and rot.get("items"):
        return f"{rot['items'][0]['left']} and {len(rot['items']) - 1} more have a dividend date coming"
    if stories:
        s = stories[0]
        return f"{s['code']}: {_trim(s['headline'], 60)}"
    if n:
        return f"Today's top buy: {buys[0]['code']} — {n} buy signal{'s' if n > 1 else ''} on the DSE"
    if div_count:
        return f"{div_count} new dividend{'s' if div_count > 1 else ''} declared on the DSE today"
    if chg is not None and abs(chg) >= 0.5:
        return f"The DSE is {'up' if chg > 0 else 'down'} {abs(chg):.1f}% today — your 1-minute recap"
    return "Your 1-minute Dhaka Stock Exchange recap"


def _preheader(buys_total: int, stories: list[dict], learn: Optional[dict]) -> str:
    bits = []
    if buys_total:
        bits.append(f"{buys_total} buy signal{'s' if buys_total > 1 else ''}")
    if stories:
        bits.append("three stocks worth knowing")
    if learn:
        bits.append("one thing to learn")
    bits.append("today's headlines")
    return ", ".join(bits[:3]).capitalize() + " — in one minute."


def _cta(buys_total: int, campaign_id: str) -> tuple[str, str]:
    if buys_total > MAX_BUYS:
        return (f"See all {buys_total} buy signals",
                _tag_url(f"{PUBLIC_SITE_URL}/dsestockranking", campaign_id))
    return "Open TopStock BD", _tag_url(f"{PUBLIC_SITE_URL}/", campaign_id)


# --- Assembly ---------------------------------------------------------------

@_ttl_cache(300, max_entries=4)
def build_daily_content(campaign_id: str) -> dict:
    prices = load_latest_prices()
    companies = {c["trading_code"]: c for c in load_companies()}
    names = {c: (companies.get(c) or {}).get("company_name") for c in companies}
    signals = _safe(build_signals, {}, "signals") or {}
    state = _safe(compute_market_state, {}, "market state") or {}
    rows = _safe(_score_rows, [], "score rows") or []

    idx = load_market_index() or {}
    tv_mn = idx.get("total_value_mn")
    market = {
        "dsex": idx.get("dsex"),
        "dsex_chg": idx.get("dsex_change_pct"),
        "turnover_cr": (tv_mn / 10.0) if tv_mn else None,  # 1 crore = 10 mn
        "turnover_chg": idx.get("turnover_change_pct"),
        "up": idx.get("up_count"),
        "down": idx.get("down_count"),
        "week_chg": (state.get("stats") or {}).get("week_change_pct"),
    }

    buys, buys_total = _safe(lambda: _select_buys(prices, companies, campaign_id),
                             ([], 0), "buys") or ([], 0)
    stories = _safe(lambda: _three_stories(rows, campaign_id), [], "stories") or []
    learn = _safe(lambda: _learn_one_thing(campaign_id), None, "learn")
    rotating = _rotating_block(state, campaign_id)
    headlines = _safe(lambda: _headlines(campaign_id), [], "headlines") or []
    scorecard = _safe(lambda: _yesterday_scorecard(prices, campaign_id), None, "scorecard")

    div_count = _recent_dividend_count()
    mood, mood_kind = _mood(idx)
    cta_text, cta_url = _cta(buys_total, campaign_id)

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
        "preheader": _preheader(buys_total, stories, learn),
        "subject": _pick_subject(idx, buys, buys_total, div_count, stories, rotating),
        "market": market,
        "story": _safe(lambda: _story_lead(state, market), None, "story lead"),
        "stories": stories,
        "buys": buys,
        "buys_total": buys_total,
        "learn": learn,
        "rotating": rotating,
        "headlines": headlines,
        "scorecard": scorecard,
        "cta_text": cta_text,
        "cta_url": cta_url,
        # stored on the campaign doc so tomorrow's email can score these picks
        "featured": [{"code": b["code"], "ltp": b["ltp"]} for b in buys if b.get("ltp")],
        # render-time inputs for the per-user block; not part of the shared copy
        "_prices": prices,
        "_names": names,
        "_signals": signals,
    }


# ---------------------------------------------------------------------------
# Render / preview / test
# ---------------------------------------------------------------------------

def render_daily_html(content: dict, *, user_id: str, campaign_id: str,
                      user: Optional[dict] = None) -> str:
    """The shared mail plus, when we know who's reading, their own movers."""
    personal = _safe(lambda: personal_block(user, content), None, "personal block") if user else None
    return email_templates.build_daily_html(
        content=content,
        unsubscribe_url=campaign_service._unsub_url(user_id),
        pixel_url=campaign_service._pixel_url(user_id, campaign_id),
        personal=personal,
    )


def _preview_user() -> Optional[dict]:
    """A real recipient, purely so the admin preview shows the personal strip
    the way an actual reader will get it."""
    return get_db()["users"].find_one(
        {**_base_filter(), "$and": [_power_user()]},
        {"_id": 0, "watchlist": 1, "portfolio": 1},
    )


def preview_daily_html() -> str:
    cid = today_campaign_id()
    user = _safe(_preview_user, None, "preview user")
    return render_daily_html(build_daily_content(cid), user_id="preview",
                             campaign_id=cid, user=user)


def send_daily_test(to_email: str, to_name: Optional[str], user_id: Optional[str]) -> tuple[str, str]:
    cid = today_campaign_id()
    content = build_daily_content(cid)
    uid = user_id or "test"
    user = None
    if user_id:
        user = get_db()["users"].find_one(
            {"user_id": user_id}, {"_id": 0, "watchlist": 1, "portfolio": 1}
        )
    html = render_daily_html(content, user_id=uid, campaign_id=cid, user=user)
    return send_transactional(
        to_email, to_name, content["subject"], html,
        tags=["daily-test"], headers=campaign_service._list_unsub_headers(uid),
    )


def _block_manifest(content: dict) -> list[dict]:
    """What actually made it into today's mail — so the admin can see at a
    glance whether a block came up empty before pressing Send."""
    rot = content.get("rotating") or {}
    story = content.get("story") or {}
    learn = content.get("learn") or {}
    sc = content.get("scorecard") or {}
    buys_total = content.get("buys_total") or 0
    return [
        {"key": "story", "label": "Today's story",
         "detail": f"{len(story.get('lines') or [])} lines"
                   + (" + Bengali" if story.get("bn") else ""),
         "ok": bool(story.get("lines"))},
        {"key": "stories", "label": "Three worth knowing",
         "detail": ", ".join(s["code"] for s in content.get("stories") or []) or "not filled",
         "ok": len(content.get("stories") or []) == 3},
        {"key": "buys", "label": "Today's buys",
         "detail": f"{len(content.get('buys') or [])} shown of {buys_total}"
                   + (f" · {sum(1 for b in content.get('buys') or [] if b.get('is_new'))} new"
                      if any(b.get("is_new") for b in content.get("buys") or []) else ""),
         "ok": bool(content.get("buys"))},
        {"key": "learn", "label": "One thing to learn",
         "detail": learn.get("code") or "no tips today", "ok": bool(learn)},
        {"key": "rotating", "label": "Rotating slot",
         "detail": rot.get("title") or "empty", "ok": bool(rot)},
        {"key": "headlines", "label": "Headlines",
         "detail": f"{len(content.get('headlines') or [])} stories",
         "ok": bool(content.get("headlines"))},
        {"key": "scorecard", "label": "Scorecard",
         "detail": (f"{sc.get('up_count')}/{sc.get('total')} up"
                    + (f" · record {sc['record']['up']}/{sc['record']['total']}"
                       if sc.get("record") else "")) if sc else "no past email yet",
         "ok": bool(sc)},
    ]


def daily_overview(cap: int = DEFAULT_CAP) -> dict:
    """Everything the admin card needs before a send: today's subject, the
    featured buys, which blocks filled, the audience funnel, and how many
    already went out."""
    cid = today_campaign_id()
    content = build_daily_content(cid)
    already = get_db()["email_sends"].count_documents({"campaign_id": cid})
    return {
        "campaign_id": cid,
        "date_label": content["date_label"],
        "subject": content["subject"],
        "preheader": content["preheader"],
        "mood": content["mood"],
        "buys": [
            {"code": b["code"], "name": b["name"], "change_pct": b["change_pct"],
             "strength": b["strength"], "is_new": b.get("is_new", False)}
            for b in content["buys"]
        ],
        "buys_total": content.get("buys_total", 0),
        "blocks": _block_manifest(content),
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
            html = render_daily_html(content, user_id=uid, campaign_id=campaign_id, user=user)
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
