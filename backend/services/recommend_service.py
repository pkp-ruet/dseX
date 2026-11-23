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
- ``for_user``   — "Based on your shares" (explore, rules in ``for_you.py``):
                   the page ``/for-you`` (``/api/user/for-you``, up to 15,
                   grouped by the reader's own shares) and the home row (home
                   bundle, ``top=3``); never a Buy List member; its free
                   ``starter`` list feeds the empty watchlist's "Suggested to
                   follow".
- ``for_portfolio`` — the portfolio's "What to buy next" (buy, ``/api/user/portfolio/buy-next``).
- ``buy_list_service`` — the Buy List's questions 1–3 (buy).

``users.for_you_seen = {day, codes, prev}`` remembers the reader's last list so
a pick can say "New"; written only when the day or the list changes.
"""
from __future__ import annotations

import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from typing import Optional

from backend.services import custom_lists as cl
from backend.services import for_you as fy
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
        c = _candidate(f, sigs.get(f["code"]) or {}, levels.get(f["code"]), explore, risk, fair)
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


def _candidate(f: dict, sig: dict, levels: Optional[dict], explore: bool,
               risk: Optional[dict], fair: Optional[dict]) -> dict:
    """One company as the pool carries it: its facts, the signal's strength
    and reason, conviction, its one watch-out and the fair-value range."""
    from utils.sector import sector_bn as _sector_bn

    c = {**f, "strength": sig.get("strength"), "reason_key": sig.get("reason_key"),
         "reason_en": sig.get("reason_en"), "reason_bn": sig.get("reason_bn"),
         "sector_bn": _sector_bn(f.get("sector")) or f.get("sector")}
    c["conviction"] = rc.conviction(c, levels, explore)
    c["risk"], c["fair_value"] = risk, fair
    return c


def candidates(codes: list[str]) -> dict[str, dict]:
    """{code: the pool's candidate dict} for these codes whether or not they
    pass the buy gate, each with ``failed`` = the gate checks it fails. The
    Buy List reads it for yesterday's members that left the pool (2026-11-18:
    one that only lost its Buy on the price gets a second close)."""
    from backend.services.research_lists_service import _ctx, _fair_value, _risk, report_snapshots
    from backend.services.signal_service import build_signals

    p = pool()
    facts, levels = p.get("facts") or {}, p.get("levels") or {}
    codes = [c for c in codes if c in facts]
    if not codes:
        return {}
    try:
        sigs = build_signals()
    except Exception:  # noqa: BLE001
        logger.exception("recommend: signals failed")
        sigs = {}
    ctx = _ctx()
    snaps = report_snapshots(codes)
    out = {}
    for code in codes:
        f = facts[code]
        failed = [ch.key for ch in rc.GATE if not rl.run_check(ch, f, ctx)[0]]
        c = _candidate(f, sigs.get(code) or {}, levels.get(code), False, _risk(f, snaps), _fair_value(code))
        c["failed"] = failed
        out[code] = c
    return out


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


def _profile(p: dict, holdings, watchlist) -> dict:
    mine = _mine(holdings, watchlist, p["facts"])
    pool_levels = [p["levels"].get(c["code"]) or {} for c in p["cands"]]
    return rc.build_profile(mine, p["facts"], p["levels"], pool_levels)


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
    fails — "Based on your shares" then just leaves nothing out."""
    try:
        from backend.services import buy_list_service
        return buy_list_service.build().get("items") or []
    except Exception:  # noqa: BLE001
        logger.warning("recommend: buy list unavailable", exc_info=True)
        return []


@_ttl_cache(900, max_entries=500)
def _visits(uid: str) -> dict:
    """{code: {days, last}} — the stock pages this reader opened in the last
    30 days, from the page views the ping already stores (``user_events``,
    indexed on user + time). Cached per reader; cleared after every scrape."""
    since = datetime.now(timezone.utc) - timedelta(days=fy.READ_WINDOW_DAYS)
    rows = get_db()["user_events"].find(
        {"user_id": uid, "ts": {"$gte": since}, "path": {"$regex": "^/stock/"}},
        {"_id": 0, "path": 1, "ts": 1},
    )
    return fy.visits_from_events(list(rows))


def _reads(user: dict, exclude: set[str], known: set[str], now: datetime) -> list[dict]:
    uid = user.get("user_id")
    if not uid:
        return []
    try:
        return fy.read_anchors(_visits(uid), exclude, known, now)
    except Exception:  # noqa: BLE001 — reads only add ties; never fail the list on them
        logger.warning("recommend: visits unavailable for %s", uid, exc_info=True)
        return []


def explore_list(p: dict, user: dict, holdings: list[dict], watchlist: list[str],
                 n: int = fy.N_PICKS, now: Optional[datetime] = None) -> dict:
    """The page's list before tracking: groups, items, the starter list.

    Never a company on today's Buy List (2026-11-08, user: "2 separate
    premium lists … may create confusion"), never one the reader owns,
    follows, read about or hid with "Not for me"."""
    now = now or datetime.now(timezone.utc)
    facts, levels = p["facts"], p["levels"]
    mine = _mine(holdings, watchlist, facts)
    prof = rc.build_profile(mine, facts, levels)
    reads = _reads(user, prof["codes"], set(facts), now)
    hidden = fy.hidden_codes(user.get("for_you_hidden"), now)
    bl = _buy_list()
    on = {i["code"] for i in bl}
    skip = on | prof["codes"] | {r["code"] for r in reads} | hidden
    cands = [c for c in p["cands"] if c["code"] not in skip]
    groups, items = fy.build(mine, reads, cands, facts, levels, prof, n)
    personal = bool(fy.anchors(mine, reads, facts))
    start = fy.starter([c for c in p["cands"] if c["code"] not in (on | prof["codes"] | hidden)], levels)
    return {
        "mode": "personal" if personal else "generic",
        "based_on": {"held": len(prof["held"]), "watched": len(prof["watched"] - prof["held"]),
                     "read": len(reads)},
        "groups": groups,
        # A reader with nothing to match gets the starter list as the list.
        "items": items if personal else start,
        "starter": start,
        "hidden": len(hidden),
        "buy_list": {"count": len(bl), "fits": [], "fits_total": 0},
    }


def for_user(user: dict, holdings: Optional[list[dict]] = None, watchlist: Optional[list[str]] = None,
             n: int = fy.N_PICKS, track: bool = True, top: Optional[int] = None) -> dict:
    """"Based on your shares" (``/for-you``). ``holdings`` / ``watchlist`` are
    passed in by the home bundle (already loaded there); other callers leave
    them None. ``top`` keeps only the first few items (the home row) —
    ``counts`` and ``groups`` still describe the whole list."""
    p = explore_pool()
    if holdings is None:
        holdings = _load_holdings(user)
    if watchlist is None:
        watchlist = _load_watchlist(user)
    out = explore_list(p, user, holdings, watchlist, n)
    new = _track(user, out["items"]) if track else 0
    env = {
        "as_of": p["as_of"],
        **out,
        "traits": [],
        "funnel": p["funnel"],
        "new": new,
        "counts": fy.counts(out["items"]),
        "note": rc.note(p["funnel"]["passed"], explore=True),
    }
    if top is not None:
        env["items"] = env["items"][:top]
    return env


def hide(user: dict, code: str, undo: bool = False) -> list[str]:
    """"Not for me": hide one company from this reader's list for 90 days
    (``users.for_you_hidden``), or put it back. Returns the hidden codes."""
    now = datetime.now(timezone.utc)
    entries = (fy.unhide(user.get("for_you_hidden"), code) if undo
               else fy.hide(user.get("for_you_hidden"), code, now))
    _users().update_one({"user_id": user["user_id"]}, {"$set": {"for_you_hidden": entries}})
    return sorted(fy.hidden_codes(entries, now))


def for_portfolio(user: dict, holdings: list[dict], watchlist: Optional[list[str]] = None) -> dict:
    """The portfolio's "What to buy next" for one portfolio's holdings."""
    p = pool()
    if watchlist is None:
        watchlist = _load_watchlist(user)
    prof = _profile(p, holdings, watchlist)
    rows = rc.holding_rows(holdings, p["facts"])
    plan = rc.portfolio_plan(rows, p["cands"], p["levels"], prof, p["facts"], p["funnel"]["buys"])
    return {"as_of": p["as_of"], "funnel": p["funnel"], **plan}
