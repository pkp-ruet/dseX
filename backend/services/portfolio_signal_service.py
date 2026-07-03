"""
Portfolio Buy More / Hold / Sell signal tracking.

The frontend shows a per-holding signal derived from company quality (score
tier) and the entry picture (P&L vs the valuation pillar). This service mirrors
that logic in Python so an end-of-day job can spot holdings whose signal
*changed* — most importantly a flip to Sell — and notify the owner.

Mirrors `frontend/lib/portfolio-analysis.ts:computeHoldingSignal`:
    tier unknown                          -> hold
    tier avoid                            -> sell
    loss > 5% and still expensive (p4<4)  -> sell   (expensive_expensive)
    strong/buy tier and cheap (p4>=7),
      not already up >= 5%                -> buy_more (down_strong / fair_attractive)
    everything else                       -> hold

State lives in its own `portfolio_signals` collection (one doc per
user+holding) rather than on the user doc: the checker sweeps all users at
once, and the portfolio router's `_normalize` would strip foreign keys from
holding subdocs on the next edit.

`changed_at` is the single source of truth for both channels — the in-app bell
reads recent flips via the API regardless of push state; web push (pref key
`portfolio_signals`) is best-effort on top, deduped per Dhaka day. The first
sweep for a holding only records a baseline and never notifies.
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from backend.services.db_service import get_db, load_latest_prices
from backend.services.tiers import tier_key

log = logging.getLogger("portfolio-signals")

# Flips older than this are dropped from the API response (in-app bell window).
_EVENT_RETENTION_DAYS = 7

SIGNAL_WORDS = {"buy_more": "Buy More", "hold": "Hold", "sell": "Sell"}


def _signals():
    return get_db()["portfolio_signals"]


def _users():
    return get_db()["users"]


def ensure_portfolio_signal_indexes() -> None:
    col = _signals()
    col.create_index("user_id", name="psig_user")
    col.create_index(
        [("user_id", 1), ("trading_code", 1)], unique=True, name="psig_user_code"
    )


# ---------------------------------------------------------------------------
# Signal computation (keep in lockstep with computeHoldingSignal on the frontend)
# ---------------------------------------------------------------------------

def compute_signal(
    score: Optional[float],
    p4: Optional[float],
    pnl_pct: Optional[float],
) -> str:
    """Return 'buy_more' | 'hold' | 'sell' for one holding."""
    tier = tier_key(score)
    if tier == "unknown":
        return "hold"
    if tier == "avoid":
        return "sell"
    if pnl_pct is None or p4 is None:
        return "hold"
    if pnl_pct < -5 and p4 < 4:
        return "sell"  # bought high, still expensive after the fall
    if tier in ("strong_buy", "buy") and p4 >= 7 and pnl_pct < 5:
        return "buy_more"  # strong company, price still cheap
    return "hold"


def _score_maps() -> dict:
    """{code: {"score": float|None, "p4": float|None}} from the scores snapshot."""
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    out: dict[str, dict] = {}
    if df.empty:
        return out
    cols = set(df.columns)
    for row in df.to_dict("records"):
        code = row.get("trading_code")
        if not code:
            continue
        score = row.get("score") if "score" in cols else None
        p4 = row.get("p4_val") if "p4_val" in cols else None
        out[str(code).upper()] = {
            "score": float(score) if score is not None and score == score else None,
            "p4": float(p4) if p4 is not None and p4 == p4 else None,
        }
    return out


# ---------------------------------------------------------------------------
# API read — recent flips for the in-app bell
# ---------------------------------------------------------------------------

def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.isoformat()
    return str(v)


def list_recent_events(user_id: str) -> list[dict]:
    """Signal flips within the retention window, newest first."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=_EVENT_RETENTION_DAYS)
    docs = list(_signals().find(
        {"user_id": user_id, "changed_at": {"$gte": cutoff}},
        {"_id": 0, "trading_code": 1, "signal": 1, "prev_signal": 1, "changed_at": 1},
    ))
    docs.sort(key=lambda d: d.get("changed_at") or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return [
        {
            "trading_code": (d.get("trading_code") or "").upper(),
            "signal": d.get("signal") or "hold",
            "prev_signal": d.get("prev_signal"),
            "changed_at": _iso(d.get("changed_at")),
        }
        for d in docs
    ]


# ---------------------------------------------------------------------------
# Checker (CLI / cron entrypoint)
# ---------------------------------------------------------------------------

def check_and_notify(not_before_dhaka_hour: Optional[int] = None) -> dict:
    """Recompute every holding's signal against the latest snapshot. On a change:
    persist it (`changed_at` powers the in-app bell) and, for flips *to Sell*,
    best-effort web-push the owner (pref `portfolio_signals`, deduped per day).

    Gated to market close like the price alerts — intraday quick-scrape runs
    return `gated` without touching the DB. Pass None to disable the gate."""
    from backend.services import push_service
    from backend.services.auth_service import _dhaka_day, _DHAKA_TZ

    now = datetime.now(timezone.utc)
    if not_before_dhaka_hour is not None:
        dhaka_hour = now.astimezone(_DHAKA_TZ).hour
        if dhaka_hour < not_before_dhaka_hour:
            log.info("portfolio signals gated — %02d:00 Dhaka is before close %02d:00; skipping",
                     dhaka_hour, not_before_dhaka_hour)
            return {"users": 0, "holdings": 0, "changed": 0, "pushed": 0, "failed": 0, "gated": True}

    ensure_portfolio_signal_indexes()
    push_service.ensure_push_indexes()
    day = _dhaka_day(now)

    users = list(_users().find(
        {"portfolio.0": {"$exists": True}},
        {"_id": 0, "user_id": 1, "portfolio": 1, "push_enabled": 1, "notification_prefs": 1},
    ))
    if not users:
        return {"users": 0, "holdings": 0, "changed": 0, "pushed": 0, "failed": 0}

    scores = _score_maps()
    prices = load_latest_prices()
    db = get_db()
    sends = db["push_sends"]
    push_ok = push_service.is_configured()

    holdings_seen = changed = pushed = failed = 0

    for user in users:
        uid = user.get("user_id")
        holdings = user.get("portfolio") or []
        if not uid or not holdings:
            continue

        held_codes: list[str] = []
        prev_state = {
            (d.get("trading_code") or "").upper(): d
            for d in _signals().find({"user_id": uid}, {"_id": 0, "trading_code": 1, "signal": 1})
        }
        sell_flips: list[str] = []

        for h in holdings:
            code = (h.get("trading_code") or "").upper()
            if not code:
                continue
            held_codes.append(code)
            holdings_seen += 1

            buy_price = float(h.get("buy_price") or 0)
            ltp_row = prices.get(code) or {}
            ltp = ltp_row.get("ltp")
            pnl_pct = (
                (float(ltp) - buy_price) / buy_price * 100
                if ltp and buy_price > 0 else None
            )
            srow = scores.get(code) or {}
            signal = compute_signal(srow.get("score"), srow.get("p4"), pnl_pct)

            prev = prev_state.get(code)
            if prev is None:
                # First sight of this holding — baseline only, never notify.
                _signals().update_one(
                    {"user_id": uid, "trading_code": code},
                    {"$set": {"signal": signal, "updated_at": now},
                     "$setOnInsert": {"prev_signal": None, "changed_at": None}},
                    upsert=True,
                )
                continue

            if (prev.get("signal") or "hold") == signal:
                _signals().update_one(
                    {"user_id": uid, "trading_code": code},
                    {"$set": {"updated_at": now}},
                )
                continue

            changed += 1
            _signals().update_one(
                {"user_id": uid, "trading_code": code},
                {"$set": {
                    "signal": signal,
                    "prev_signal": prev.get("signal"),
                    "changed_at": now,
                    "updated_at": now,
                }},
            )
            if signal == "sell":
                sell_flips.append(code)

        # Drop state for codes no longer held so a re-add starts from baseline.
        if held_codes:
            _signals().delete_many({"user_id": uid, "trading_code": {"$nin": held_codes}})

        # Best-effort push — one notification per user per day covering all flips.
        if not (sell_flips and push_ok):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(user.get("notification_prefs") or {})}
        if not (user.get("push_enabled") and prefs.get("portfolio_signals", True)):
            continue
        campaign_id = f"psig-{uid}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        if len(sell_flips) == 1:
            body = f"{sell_flips[0]} changed to Sell — time to review this holding"
        else:
            body = f"{', '.join(sell_flips[:3])} changed to Sell — time to review these holdings"
        payload = {
            "title": "Portfolio signal changed ⚠️",
            "body": body,
            "url": "/portfolio",
            "tag": "psig",
        }
        result = push_service.send_to_user(uid, payload)
        status = "sent" if result["sent"] > 0 else ("expired" if result["expired"] else "failed")
        if result["sent"] > 0:
            pushed += 1
        elif status == "failed":
            failed += 1
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {
                "campaign_id": campaign_id, "user_id": uid,
                "status": status, "result": result,
                "sent_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )

    counts = {"users": len(users), "holdings": holdings_seen,
              "changed": changed, "pushed": pushed, "failed": failed}
    log.info("portfolio signals done: %s", counts)
    return counts
