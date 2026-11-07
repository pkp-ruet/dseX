"""
Recommendation engine — data side. The rules live in ``recommend.py`` (pure).

``pool()`` gates and scores the whole market once (cached 900s, reset by
``clear_all_caches()`` after every scrape); each reader's list is then only a
ranking of ~30 passers against their own stocks, so it is cheap to build on
every dashboard load.

Two pools (2026-11-08): ``pool()`` = the **buy** gate (today's Buy signal +
the safety checks) and ``explore_pool()`` = the **explore** gate (mostly
strong or better + the safety checks, any price). See ``recommend.py``.

Callers:
- ``for_user``   — "Picked for you" (explore): the page ``/picked-for-you``
                   (``/api/user/for-you``, all 15) and the dashboard's tile row
                   (home bundle, ``top=3``); never a Buy List member (those that
                   fit are named in ``buy_list.fits``); the empty watchlist's
                   "Suggested to follow".
- ``for_portfolio`` — the portfolio's "What to buy next" (buy, ``/api/user/portfolio/buy-next``).
- ``from_answers``  — TopStock AI's "suggest stocks" (buy, ``POST /api/recommendations``).
- ``buy_list_service`` — the Buy List's questions 1–3 (buy).

``users.for_you_seen = {day, codes, prev}`` remembers the reader's last list so
a pick can say "New"; written only when the day or the list changes.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from backend.services import custom_lists as cl
from backend.services import recommend as rc
from backend.services import research_lists as rl
from backend.services.db_service import _ttl_cache, get_db

logger = logging.getLogger(__name__)

_n = rl._n

# The pool's per-company lookups (news, financials, fair value) are Mongo
# round trips; a few threads cut a cold build from ~8s to ~2s. Kept small for
# the 512 MB instance.
_WORKERS = 4


def _users():
    return get_db()["users"]


# ---------------------------------------------------------------------------
# The market, gated and scored
# ---------------------------------------------------------------------------

@_ttl_cache(900)
def pool() -> dict:
    """``{as_of, funnel, cands, facts, levels}`` — ``cands`` = every company
    that passes the buy gate, with conviction, its one watch-out and the
    fair-value range (looked up for the passers only)."""
    return _build_pool(explore=False)


@_ttl_cache(900)
def explore_pool() -> dict:
    """The same shape for "Picked for you": every company that passes the
    explore gate (mostly strong or better + the safety checks, any price)."""
    return _build_pool(explore=True)


def _build_pool(explore: bool) -> dict:
    from backend.services.custom_lists_service import facts as signal_facts, question_table
    from backend.services.research_lists_service import _as_of, _ctx, _fair_value, _risk, report_snapshots
    from backend.services.signal_service import build_signals
    from backend.services.tiers import tier_key
    from utils.sector import sector_bn as _sector_bn

    facts = signal_facts()
    # Each company's strongest choice on the screener's six questions.
    levels = {code: cl.best_levels(sat) for code, sat in question_table().items()}
    try:
        sigs = build_signals()
    except Exception:  # noqa: BLE001 — every Buy check then fails; the card says nothing passes
        logger.exception("recommend: signals failed")
        sigs = {}

    ctx = _ctx()
    if explore:
        first = [f for f in facts.values() if tier_key(_n(f.get("score"))) in ("good", "excellent")]
    else:
        first = [f for f in facts.values() if f.get("signal") == "buy"]
    with ThreadPoolExecutor(_WORKERS) as ex:
        # Warm the gate's one slow check (a year of news) for everyone past
        # the first check at once.
        list(ex.map(lambda f: ctx.governance(f["code"]), first))
    gate = rc.gate_list(explore)
    run = rl.run_list(gate, list(facts.values()), ctx)
    snaps = report_snapshots([f["code"] for f in run["passed"]])
    with ThreadPoolExecutor(_WORKERS) as ex:
        extras = list(ex.map(lambda f: (_risk(f, snaps), _fair_value(f["code"])), run["passed"]))

    cands = []
    for f, (risk, fair) in zip(run["passed"], extras):
        sig = sigs.get(f["code"]) or {}
        c = {**f, "strength": sig.get("strength"), "reason_key": sig.get("reason_key"),
             "reason_en": sig.get("reason_en"), "reason_bn": sig.get("reason_bn"),
             "sector_bn": _sector_bn(f.get("sector")) or f.get("sector")}
        c["conviction"] = rc.conviction(c, levels.get(f["code"]), explore)
        c["risk"], c["fair_value"] = risk, fair
        # Each check it passed, with its own figure (the page's "Passed all 5
        # checks" fold). The governance news is already cached from the gate.
        try:
            c["gate_checks"] = rc.check_lines(c, rl.check_values(gate, f, ctx))
        except Exception:  # noqa: BLE001 — the card just shows no figures
            logger.warning("recommend: check figures failed for %s", f["code"], exc_info=True)
            c["gate_checks"] = []
        cands.append(c)
    cands.sort(key=lambda c: (-(c["conviction"] or 0.0), -(_n(c.get("score")) or 0.0), c["code"]))
    try:
        as_of = _as_of()
    except Exception:  # noqa: BLE001
        as_of = None
    return {"as_of": as_of, "funnel": rc.funnel_summary(run), "cands": cands,
            "facts": facts, "levels": levels}


# ---------------------------------------------------------------------------
# The reader
# ---------------------------------------------------------------------------

def _mine(holdings: list[dict], watchlist: list[str], facts: dict[str, dict]) -> list[dict]:
    """Holdings ∪ watchlist as the profile wants them. ``holdings`` are the
    portfolio GET's rows (with the per-holding ``signal``)."""
    rows: dict[str, dict] = {}
    for h in holdings or []:
        code = (h.get("trading_code") or "").upper()
        qty = int(h.get("qty") or 0)
        if not code or qty <= 0:
            continue
        price = _n((facts.get(code) or {}).get("ltp")) or _n(h.get("buy_price")) or 0.0
        sig = h.get("signal")
        r = rows.setdefault(code, {"code": code, "held": False, "watched": False, "value": 0.0,
                                   "holding_signal": None})
        r["held"] = True
        r["value"] += qty * price
        r["holding_signal"] = sig.get("signal") if isinstance(sig, dict) else sig
    for c in watchlist or []:
        code = (c or "").upper()
        if not code:
            continue
        rows.setdefault(code, {"code": code, "held": False, "watched": False, "value": 0.0,
                               "holding_signal": None})["watched"] = True
    return list(rows.values())


def _load_holdings(user: dict) -> list[dict]:
    from backend.routers.portfolio import get_portfolio
    return (get_portfolio(user) or {}).get("holdings") or []


def _load_watchlist(user: dict) -> list[str]:
    from backend.services.auth_service import get_user_watchlist
    return get_user_watchlist(user["user_id"]) if user.get("user_id") else []


def _profile(p: dict, user: Optional[dict], holdings, watchlist, stated: Optional[dict] = None) -> dict:
    mine = _mine(holdings, watchlist, p["facts"])
    if stated is None:
        stated = ((user or {}).get("last_recommendation") or {}).get("answers")
    pool_levels = [p["levels"].get(c["code"]) or {} for c in p["cands"]]
    return rc.build_profile(mine, p["facts"], p["levels"], stated, pool_levels)


def _today() -> str:
    from utils.market_hours import bst_today_iso
    return bst_today_iso()


def _track(user: dict, items: list[dict]) -> int:
    """Mark the picks that weren't in the reader's list yesterday; returns how many."""
    uid = user.get("user_id")
    if not uid:
        return 0
    codes = [i["code"] for i in items]
    doc, prev = rc.seen_update(user.get("for_you_seen"), _today(), codes)
    if doc is not None:
        try:
            _users().update_one({"user_id": uid}, {"$set": {"for_you_seen": doc}})
        except Exception:  # noqa: BLE001 — "New" is a nicety; never fail the list on it
            logger.warning("recommend: could not save for_you_seen for %s", uid, exc_info=True)
    return len(rc.mark_new(items, prev))


def _buy_list() -> list[dict]:
    """Today's Buy List items (cached 900s in its service). Empty when it
    fails — "Picked for you" then just leaves nothing out."""
    try:
        from backend.services import buy_list_service
        return buy_list_service.build().get("items") or []
    except Exception:  # noqa: BLE001
        logger.warning("recommend: buy list unavailable", exc_info=True)
        return []


# Buy List companies that fit the reader, named in one line on the page.
BUY_LIST_FITS = 5


def _explore(p: dict, prof: dict, n: int) -> tuple[list[dict], dict]:
    """(picks, buy_list) — the two lists never share a company (2026-11-08,
    user: "2 separate premium lists … may create confusion"). A company on
    today's Buy List is left out of the picks; the ones that would fit this
    reader are named instead (``buy_list.fits``), so a strong match is never
    lost, only pointed at the list that says "buy"."""
    bl = _buy_list()
    on = {i["code"] for i in bl}
    rest = [c for c in p["cands"] if c["code"] not in on]
    items = rc.recommend(rest, p["levels"], prof, p["facts"], n, explore=True)
    fits = rc.rank([c for c in p["cands"] if c["code"] in on], p["levels"], prof, explore=True)
    return items, {
        "count": len(bl),
        "fits": [{"code": c["code"], "name": c.get("name")} for _t, c, _f in fits[:BUY_LIST_FITS]],
        "fits_total": len(fits),
    }


def _envelope(p: dict, prof: dict, items: list[dict], new: int, buy_list: Optional[dict] = None) -> dict:
    personal = bool(prof["codes"])
    return {
        "as_of": p["as_of"],
        "mode": "personal" if personal else "generic",
        "based_on": {"held": len(prof["held"]), "watched": len(prof["watched"] - prof["held"])},
        "traits": [{"key": t["key"], "en": t["en"], "bn": t["bn"], "n": t.get("n"), "of": t.get("of"),
                    "asked": bool(t.get("asked"))} for t in prof["traits"][:3]],
        "funnel": p["funnel"],
        "items": items,
        "new": new,
        "counts": rc.counts(items),
        "note": rc.note(p["funnel"]["passed"], explore=True),
        "buy_list": buy_list or {"count": 0, "fits": [], "fits_total": 0},
    }


def for_user(user: dict, holdings: Optional[list[dict]] = None, watchlist: Optional[list[str]] = None,
             n: int = rc.N_PICKS, track: bool = True, top: Optional[int] = None) -> dict:
    """The reader's companies to explore. ``holdings`` / ``watchlist`` are
    passed in by the home bundle (already loaded there); other callers leave
    them None. ``top`` keeps only the first few items (the dashboard's tile
    row) — ``counts`` still describes the whole list."""
    p = explore_pool()
    if holdings is None:
        holdings = _load_holdings(user)
    if watchlist is None:
        watchlist = _load_watchlist(user)
    prof = _profile(p, user, holdings, watchlist)
    items, bl = _explore(p, prof, n)
    new = _track(user, items) if track else 0
    env = _envelope(p, prof, items, new, bl)
    if top is not None:
        env["items"] = env["items"][:top]
    return env


def generic(n: int = rc.N_PICKS) -> dict:
    """The no-stocks list — conviction alone."""
    p = explore_pool()
    prof = rc.empty_profile()
    items, bl = _explore(p, prof, n)
    return _envelope(p, prof, items, 0, bl)


def for_portfolio(user: dict, holdings: list[dict], watchlist: Optional[list[str]] = None) -> dict:
    """The portfolio's "What to buy next" for one portfolio's holdings."""
    p = pool()
    if watchlist is None:
        watchlist = _load_watchlist(user)
    prof = _profile(p, user, holdings, watchlist)
    rows = rc.holding_rows(holdings, p["facts"])
    plan = rc.portfolio_plan(rows, p["cands"], p["levels"], prof, p["facts"], p["funnel"]["buys"])
    return {"as_of": p["as_of"], "funnel": p["funnel"], **plan}


# ---------------------------------------------------------------------------
# TopStock AI's "suggest stocks"
# ---------------------------------------------------------------------------

N_ANSWERS = 5

# Filters dropped, in order, when too few stocks pass — the sector is the last
# thing given up (same order the old quiz engine used).
_RELAX = [set(), {"budget"}, {"budget", "sectors"}]


def _budget_ok(c: dict, budget: Optional[str]) -> bool:
    price = _n(c.get("ltp"))
    if budget == "under_50":
        return price is not None and price < 50
    if budget == "50_to_200":
        return price is not None and 50 <= price <= 200
    return True


def _as_recommended(it: dict, c: dict, sig: Optional[dict]) -> dict:
    """An engine item in the old ``RecommendedStock`` shape (+ the engine's words)."""
    pts_en = [p["en"] for p in it["points"]]
    pts_bn = [p["bn"] for p in it["points"]]
    return {
        "trading_code": it["code"], "company_name": it["name"], "sector": it["sector"],
        "score": it["score"], "tier": it["tier"], "ltp": it["price"], "change_pct": it["change_pct"],
        "div_yield_pct": it["div_yield_pct"], "eps_yoy_pct": _n(c.get("eps_yoy_pct")),
        "p1_biz": _n(c.get("p1_biz")), "p3_moat": _n(c.get("p3_moat")),
        "p4_val": _n(c.get("p4_val")), "p5_div": _n(c.get("p5_div")),
        "reasons": [it["why_en"], *pts_en][:3], "reasons_bn": [it["why_bn"], *pts_bn][:3],
        "signal": sig,
        "kind": it["kind"], "tag_en": it["tag_en"], "tag_bn": it["tag_bn"],
        "why_en": it["why_en"], "why_bn": it["why_bn"], "points": it["points"],
        "watch": it["watch"], "strong": it["strong"], "anchor": it["anchor"],
    }


def from_answers(answers: dict, user: Optional[dict] = None, n: int = N_ANSWERS) -> dict:
    """Quiz answers act as stated tastes on top of the reader's own stocks;
    the sector and budget answers stay hard filters until too few pass."""
    from backend.services.signal_service import build_signals, wire_fields

    p = pool()
    holdings = _load_holdings(user) if user else []
    watchlist = _load_watchlist(user) if user else []
    prof = _profile(p, user, holdings, watchlist, stated=answers)
    wanted = {s.strip() for s in (answers.get("sectors") or []) if isinstance(s, str) and s.strip()}

    chosen: list[dict] = []
    dropped: set[str] = set()
    for drop in _RELAX:
        dropped = drop
        chosen = [c for c in p["cands"]
                  if ("budget" in drop or _budget_ok(c, answers.get("budget")))
                  and ("sectors" in drop or not wanted or c.get("sector") in wanted)]
        if len(chosen) >= n:
            break

    items = rc.recommend(chosen, p["levels"], prof, p["facts"], n)
    try:
        sigs = build_signals()
    except Exception:  # noqa: BLE001
        sigs = {}
    by_code = {c["code"]: c for c in chosen}
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "answers_echo": dict(answers),
        "relaxations": sorted(dropped),
        "saved": False,
        "picks": [_as_recommended(it, by_code[it["code"]], wire_fields(sigs.get(it["code"]))) for it in items],
    }
