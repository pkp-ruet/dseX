"""Portfolio builder — data side. The rules live in ``portfolio_builder.py`` (pure).

The pool is the recommendation engine's explore pool (``recommend_service.
explore_pool()``, cached 900s), each company with its dividend safety word
and, for a strong company kept off the Buy only by its price, our buy price
(``stock_report.buy_price_for``, the stock page's figure).

The free plan (2026-11-23, user decision): a signed-in free reader builds ONE
plan, open in full; building again — a new answer, "Not for me" — is Premium.
A Premium reader builds as often as they want. Checked here as well as on the
screen: the claim on ``users.builder_free_at`` is atomic, so two taps can't
give two free plans. A build that finds no company doesn't use it.

Plans are kept in their own collection (``builder_plans``, the last ``KEEP``
per reader), never on the user document every signed-in request reads.
"""
from __future__ import annotations

import logging
import secrets
from datetime import datetime, timezone
from typing import Optional

from backend.services import portfolio_builder as pb
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

COLLECTION = "builder_plans"
KEEP = 10

# entitlements-style detail the frontend matches (`lib/premium.ts:isLimitError`).
LIMIT_BUILDER = "limit_reached:portfolio_builder"


class BuilderLimit(Exception):
    """A free reader's second build."""


_indexed = False


def _col():
    global _indexed
    col = get_db()[COLLECTION]
    if not _indexed:
        try:
            col.create_index([("user_id", 1), ("created_at", -1)])
            col.create_index([("user_id", 1), ("id", 1)], unique=True)
            _indexed = True
        except Exception:  # noqa: BLE001 — reads still work without the index
            logger.warning("portfolio builder: index creation failed", exc_info=True)
    return col


def _users():
    return get_db()["users"]


def _buy_below(c: dict) -> Optional[float]:
    """The stock page's buy price: the highest price at which the Buy rule
    holds, never above the near-the-top line."""
    try:
        from backend.services.signal_detail import stop_line
        from backend.services.signal_service import NEAR_HIGH_PCT
        from backend.services.stock_report import buy_price_for

        near = stop_line(c.get("hi52"), c.get("lo52"), NEAR_HIGH_PCT)
        return buy_price_for(c, pb._n(c.get("ltp")), near)
    except Exception:  # noqa: BLE001 — no buy price: it can't wait, so it's left out
        logger.warning("portfolio builder: buy price failed for %s", c.get("code"), exc_info=True)
        return None


@_ttl_cache(900)
def pool() -> dict:
    """{as_of, cands} — the explore pool, each company with what the rules read."""
    from backend.services import recommend_service
    from backend.services.dividend_safety import dividend_safety

    p = recommend_service.explore_pool()
    cands = []
    for c in p.get("cands") or []:
        c2 = dict(c)  # the engine's cached dicts are shared
        try:
            c2["div_safety"] = (dividend_safety(c, c.get("sector_class") or "GENERAL") or {}).get("level")
        except Exception:  # noqa: BLE001
            c2["div_safety"] = None
        if c.get("signal") != "buy" and c.get("reason_key") in pb.WAIT_REASONS:
            c2["buy_below"] = _buy_below(c)
        cands.append(c2)
    return {"as_of": p.get("as_of"), "cands": cands}


def _fdr_rate() -> Optional[float]:
    try:
        from backend.services.fair_context import FDR_RATE_PCT
        return FDR_RATE_PCT
    except Exception:  # noqa: BLE001
        return None


def preview(answers: dict, holdings: Optional[list[dict]] = None) -> dict:
    """A plan with no reader and nothing saved (the preview script).
    ``holdings`` = [{trading_code, qty, buy_price}] for "start from my shares"."""
    p = pool()
    held = holdings_for({"portfolio": holdings}) if holdings else None
    return pb.build(p["cands"], answers, fdr_rate=_fdr_rate(), as_of=p.get("as_of"), holdings=held)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(v) -> Optional[str]:
    return v.isoformat() if isinstance(v, datetime) else v


def holdings_for(user: dict) -> list[dict]:
    """The reader's main portfolio at today's prices, one row a share, as
    "start from my shares" reads it (phase 2)."""
    from backend.services import recommend_service
    from backend.services.db_service import load_latest_prices
    from utils.sector import normalize_sector, sector_bn

    rows = [h for h in user.get("portfolio") or [] if h.get("trading_code")]
    if not rows:
        return []
    facts = recommend_service.explore_pool().get("facts") or {}
    prices = load_latest_prices()
    agg: dict[str, dict] = {}
    for h in rows:
        code = str(h["trading_code"]).upper()
        try:
            qty, cost = float(h.get("qty") or 0), float(h.get("buy_price") or 0)
        except (TypeError, ValueError):
            continue
        a = agg.setdefault(code, {"qty": 0.0, "cost": 0.0})
        a["qty"] += qty
        a["cost"] += qty * cost
    out = []
    for code, a in agg.items():
        f = facts.get(code) or {}
        ltp = pb._n(f.get("ltp")) or pb._n((prices.get(code) or {}).get("ltp"))
        if not ltp or a["qty"] <= 0:
            continue
        sector = f.get("sector")
        out.append({
            "code": code, "name": f.get("name") or code, "qty": int(a["qty"]),
            "buy_price": round(a["cost"] / a["qty"], 2), "ltp": ltp, "value": a["qty"] * ltp,
            "sector": sector, "sector_bn": sector_bn(sector) or sector,
            "sector_class": f.get("sector_class") or normalize_sector(sector or ""),
            "score": f.get("score"), "cat": f.get("cat"),
            "div_latest_dps": f.get("div_latest_dps"), "div_yield_pct": f.get("div_yield_pct"),
        })
    return out


def build_for(user: dict, raw_answers: dict) -> dict:
    """Build a plan for this reader and keep it. ValueError for bad answers,
    ``BuilderLimit`` for a free reader who has used the free plan."""
    from backend.services.entitlements import is_premium

    answers = pb.clean_answers(raw_answers)
    uid = user["user_id"]
    premium = is_premium(user)
    if not premium and user.get("builder_free_at"):
        raise BuilderLimit()

    p = pool()
    holdings = holdings_for(user) if answers["start"] == "mine" else None
    plan = pb.build(p["cands"], answers, fdr_rate=_fdr_rate(), as_of=p.get("as_of"), holdings=holdings)
    state = pb.builder_state(user)
    if not plan["items"]:
        # Nothing fits: the reader keeps the free plan for another try.
        return {"plan": plan, "id": None, "builder": state}

    now = _now()
    if premium:
        _users().update_one({"user_id": uid, "builder_free_at": {"$exists": False}},
                            {"$set": {"builder_free_at": now}})
        _users().update_one({"user_id": uid}, {"$inc": {"builder_count": 1}})
    else:
        res = _users().update_one({"user_id": uid, "builder_free_at": {"$exists": False}},
                                  {"$set": {"builder_free_at": now}, "$inc": {"builder_count": 1}})
        if res.matched_count == 0:
            raise BuilderLimit()

    pid = secrets.token_hex(6)
    col = _col()
    col.insert_one({"user_id": uid, "id": pid, "created_at": now, "plan": plan})
    try:
        old = [d["id"] for d in col.find({"user_id": uid}, {"id": 1}).sort("created_at", -1).skip(KEEP)]
        if old:
            col.delete_many({"user_id": uid, "id": {"$in": old}})
    except Exception:  # noqa: BLE001 — an extra kept plan is harmless
        logger.warning("portfolio builder: trimming old plans failed", exc_info=True)

    state = {"free_used": True, "count": state["count"] + 1}
    return {"plan": plan, "id": pid, "created_at": now.isoformat(), "builder": state}


def _public(doc: dict) -> dict:
    # `changes` = what the plan watch noticed since it was built ({code: tag}).
    return {"id": doc.get("id"), "created_at": _iso(doc.get("created_at")), "plan": doc.get("plan"),
            "changes": doc.get("changes") or {}}


# ---------------------------------------------------------------------------
# Plan watch (phase 2): after the close, what changed in each reader's plan
# ---------------------------------------------------------------------------

def _newest_plans(now: datetime) -> list[dict]:
    """Each reader's newest plan built in the last WATCH_DAYS days."""
    from datetime import timedelta

    from backend.services.plan_watch import WATCH_DAYS

    since = now - timedelta(days=WATCH_DAYS)
    return list(_col().aggregate([
        {"$match": {"created_at": {"$gte": since}}},
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$user_id", "id": {"$first": "$id"}, "plan": {"$first": "$plan"}}},
    ]))


def _gate_fail(codes: set[str], facts: dict[str, dict]) -> dict[str, dict]:
    """{code: {en, bn}} — the first explore-gate check each company fails."""
    from backend.services import recommend as rc
    from backend.services import research_lists as rl
    from backend.services.research_lists_service import _ctx

    if not codes:
        return {}
    ctx = _ctx()
    out: dict[str, dict] = {}
    for code in codes:
        f = facts.get(code)
        if not f:
            out[code] = {"en": "We no longer grade it", "bn": "এখন আমাদের গ্রেড নেই"}
            continue
        for ch in rc.EXPLORE_GATE:
            ok, en, bn = rl.run_check(ch, f, ctx)
            if not ok:
                out[code] = {"en": en, "bn": bn}
                break
    return out


def run_plan_watch(now: datetime, day: str, push_ok: bool) -> dict:
    """Run from ``portfolio_daily`` after the close: store each reader's plan
    news as watcher events (kind ``plan``), tag the plan, push Premium readers
    once (campaign ``planwatch-{uid}-{day}``)."""
    from backend.services import entitlements, plan_watch as pw, push_service, recommend_service
    from backend.services.db_service import load_latest_prices
    from backend.services.stock_report_service import red_flag_changes

    counts = {"plans": 0, "events": 0, "pushed": 0}
    plans = [p for p in _newest_plans(now) if (p.get("plan") or {}).get("items")]
    if not plans:
        return counts
    counts["plans"] = len(plans)

    explore = recommend_service.explore_pool()
    pool_codes = {c["code"] for c in explore.get("cands") or []}
    facts = explore.get("facts") or {}
    all_codes = {str(i.get("code") or "").upper() for p in plans for i in p["plan"]["items"]} - {""}
    prices = load_latest_prices()
    closes = {c: float(prices[c]["ltp"]) for c in all_codes if c in prices and prices[c].get("ltp")}
    gate_fail = _gate_fail(all_codes - pool_codes, facts)
    try:
        red_new = red_flag_changes(all_codes)
    except Exception:  # noqa: BLE001 — the other news still goes out
        logger.warning("plan watch: red flags failed", exc_info=True)
        red_new = {}

    db = get_db()
    events_col, sends = db["portfolio_watch_events"], db["push_sends"]
    uids = [p["_id"] for p in plans]
    fields = {"_id": 0, "user_id": 1, "portfolio": 1, "extra_portfolios": 1, "watchlist": 1, "email": 1,
              "email_verified": 1, "created_at": 1, "premium_until": 1, "taste_started_at": 1,
              "trial_started_at": 1, "push_enabled": 1, "notification_prefs": 1}
    users = {u["user_id"]: u for u in _users().find({"user_id": {"$in": uids}}, fields)}

    for p in plans:
        uid, pid = p["_id"], p.get("id")
        u = users.get(uid)
        if not u or not pid:
            continue
        held = {str(h.get("trading_code") or "").upper() for h in u.get("portfolio") or []}
        for ep in u.get("extra_portfolios") or []:
            held |= {str(h.get("trading_code") or "").upper() for h in ep.get("holdings") or []}
        followed = {str(c).upper() for c in u.get("watchlist") or [] if c}
        events = pw.plan_events(pid, p["plan"], day, closes, pool_codes, gate_fail, red_new, held, followed)
        fresh = []
        for e in events:
            res = events_col.update_one({"user_id": uid, "id": e["id"]},
                                        {"$setOnInsert": {**e, "user_id": uid, "created_at": now}}, upsert=True)
            if res.upserted_id is not None:
                fresh.append(e)
        if not fresh:
            continue
        counts["events"] += len(fresh)
        tags = pw.change_tags(fresh)
        if tags:
            _col().update_one({"user_id": uid, "id": pid},
                              {"$set": {f"changes.{code}": tag for code, tag in tags.items()}})

        # Same evening for Premium (and the 7-day taste); free readers see it in Updates.
        if not push_ok or not entitlements.shares_open(u, now):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not (u.get("push_enabled") and prefs.get("portfolio_watch", True)):
            continue
        campaign_id = f"planwatch-{uid}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        payload = pw.push_payload(fresh, pid, prefs.get("language", "bn"))
        if not payload:
            continue
        result = push_service.send_to_user(uid, payload)
        counts["pushed"] += 1 if result.get("sent") else 0
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result.get("sent") else "failed",
                      "result": result, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
    return counts


def plans_for(user: dict) -> dict:
    """The reader's kept plans, newest first: summaries, and the newest in full."""
    docs = list(_col().find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).limit(KEEP))
    return {
        "plans": [{**pb.summary(d), "created_at": _iso(d.get("created_at"))} for d in docs],
        "latest": _public(docs[0]) if docs else None,
        "builder": pb.builder_state(user),
    }


def plan_by_id(user: dict, pid: str) -> Optional[dict]:
    doc = _col().find_one({"user_id": user["user_id"], "id": pid}, {"_id": 0})
    return _public(doc) if doc else None
