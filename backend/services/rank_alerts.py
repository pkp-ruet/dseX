"""
Rank alerts (Premium, 2026-10-31, the Premium Desk plan step 3): "tell me when
this share enters the top 20" and "tell me if it drops below Good".

Stored on ``users.rank_alerts`` ([{id, code, kind, created_at, was, tier}],
at most ``MAX_ALERTS``). Checked once a day from ``portfolio_daily``: an alert
fires when its condition turns true (``was`` False → True), so a share that
sits in the top 20 doesn't ping every day; it fires again only after leaving
and coming back. The grade uses ``score_history.settle`` so a score parked on
the Good line can't flicker an alert.

Pure rules first, then the reads / the push.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

from backend.services import rank_history as rh
from backend.services import score_history as sh
from backend.services.tiers import tier_key

log = logging.getLogger(__name__)

KINDS = ("top20", "below_good")
MAX_ALERTS = 50
LIMIT_RANK_ALERTS = "limit_reached:rank_alerts"
PREMIUM_REQUIRED = "premium_required:rank_alerts"

_GOOD_OR_BETTER = {"good", "excellent"}


def condition(kind: str, rank: Optional[int], tier: Optional[str]) -> bool:
    if kind == "top20":
        return rank is not None and rank <= rh.TOP_N
    if kind == "below_good":
        return tier in ("average", "weak")
    return False


def new_alert(code: str, kind: str, rank: Optional[int], score: Optional[float], now: datetime) -> dict:
    tier = tier_key(sh._n(score))
    return {
        "id": uuid.uuid4().hex[:12],
        "code": code.upper(),
        "kind": kind,
        "created_at": now,
        "was": condition(kind, rank, tier),
        "tier": tier,
    }


def check(alerts: list[dict], ranks: dict[str, int], scores: dict[str, Optional[float]]) -> tuple[list[dict], list[dict]]:
    """(alerts with today's state, the ones that fired today). A code with no
    score today (suspended, unrated) keeps its state and never fires."""
    updated, fired = [], []
    for a in alerts:
        a = dict(a)
        code = a.get("code")
        if code not in scores or sh._n(scores.get(code)) is None:
            updated.append(a)
            continue
        tier = sh.settle(a.get("tier"), sh._n(scores[code]))
        now_true = condition(a.get("kind"), ranks.get(code), tier)
        if now_true and not a.get("was"):
            fired.append({**a, "rank": ranks.get(code), "tier_now": tier, "score": sh._n(scores[code])})
        a["was"] = now_true
        a["tier"] = tier
        updated.append(a)
    return updated, fired


_TIER_EN = {"excellent": "Excellent", "good": "Good", "average": "Average", "weak": "Weak"}
_TIER_BN = {"excellent": "চমৎকার", "good": "ভালো", "average": "মাঝারি", "weak": "দুর্বল"}


def line(f: dict, lang: str) -> str:
    bn = lang != "en"
    code = f["code"]
    if f["kind"] == "top20":
        return (f"{code} এখন র‍্যাঙ্কিংয়ের প্রথম 20-এ, {f.get('rank')} নম্বরে" if bn
                else f"{code} is now in the top 20, at number {f.get('rank')}")
    t = f.get("tier_now") or "average"
    return (f"{code}-এর গ্রেড ভালো থেকে নেমে {_TIER_BN.get(t, t)} হয়েছে" if bn
            else f"{code} dropped below Good: it is now graded {_TIER_EN.get(t, t)}")


def push_payload(fired: list[dict], lang: str = "bn") -> Optional[dict]:
    if not fired:
        return None
    bn = lang != "en"
    if len(fired) == 1:
        f = fired[0]
        return {
            "title": "র‍্যাঙ্কিং অ্যালার্ট" if bn else "Ranking alert",
            "body": line(f, lang),
            "url": f"/stock/{f['code']}?src=rank-alert",
            "tag": "rank",
        }
    return {
        "title": f"{len(fired)}টি র‍্যাঙ্কিং অ্যালার্ট" if bn else f"{len(fired)} ranking alerts",
        "body": " · ".join(line(f, lang) for f in fired[:3]),
        "url": "/dsestockranking?src=rank-alert",
        "tag": "rank",
    }


# --------------------------------------------------------------------------- #
# Reads and writes
# --------------------------------------------------------------------------- #

def _users():
    from backend.services.db_service import get_db

    return get_db()["users"]


def today_scores() -> dict[str, Optional[float]]:
    """{code: score} from today's score table (what the rankings page shows)."""
    from backend.services.scoring_service import build_scores_df

    df = build_scores_df()
    if df is None or df.empty:
        return {}
    out = {}
    for code, score in zip(df["trading_code"], df["score"]):
        if code:
            out[str(code).upper()] = sh._n(score)
    return out


def list_alerts(user: dict) -> list[dict]:
    return [_public(a) for a in (user.get("rank_alerts") or [])]


def _public(a: dict) -> dict:
    ca = a.get("created_at")
    return {"id": a.get("id"), "code": a.get("code"), "kind": a.get("kind"),
            "created_at": ca.isoformat() if hasattr(ca, "isoformat") else ca}


def add_alert(user: dict, code: str, kind: str) -> list[dict]:
    """Raises ValueError("unknown_code" | "bad_kind" | "limit")."""
    if kind not in KINDS:
        raise ValueError("bad_kind")
    code = code.strip().upper()
    scores = today_scores()
    if code not in scores or scores[code] is None:
        raise ValueError("unknown_code")
    current = user.get("rank_alerts") or []
    if any(a.get("code") == code and a.get("kind") == kind for a in current):
        return list_alerts(user)
    if len(current) >= MAX_ALERTS:
        raise ValueError("limit")
    ranks = rh.ranks_for_day(scores)
    alert = new_alert(code, kind, ranks.get(code), scores[code], datetime.now(timezone.utc))
    _users().update_one({"user_id": user["user_id"]}, {"$push": {"rank_alerts": alert}})
    return [*list_alerts(user), _public(alert)]


def remove_alert(user: dict, alert_id: str) -> list[dict]:
    _users().update_one({"user_id": user["user_id"]}, {"$pull": {"rank_alerts": {"id": alert_id}}})
    return [a for a in list_alerts(user) if a["id"] != alert_id]


def run_rank_alerts(now: datetime, day: str, push_ok: bool) -> int:
    """Check every Premium reader's rank alerts and send one push per reader
    per day (campaign ``rank-{uid}-{day}``, pref ``portfolio_watch``). A lapsed
    plan's alerts are kept but not checked. Returns readers pushed."""
    from backend.services import entitlements, push_service
    from backend.services.db_service import get_db

    users = list(_users().find(
        {"rank_alerts.0": {"$exists": True}},
        {"_id": 0, "user_id": 1, "email": 1, "premium_until": 1, "rank_alerts": 1,
         "push_enabled": 1, "notification_prefs": 1},
    ))
    if not users:
        return 0
    scores = today_scores()
    if not scores:
        return 0
    ranks = rh.ranks_for_day(scores)
    sends = get_db()["push_sends"]
    pushed = 0
    for u in users:
        if not entitlements.is_premium(u, now):
            continue
        uid = u["user_id"]
        updated, fired = check(u.get("rank_alerts") or [], ranks, scores)
        _users().update_one({"user_id": uid}, {"$set": {"rank_alerts": updated}})
        if not (fired and push_ok and u.get("push_enabled")):
            continue
        prefs = {**push_service.DEFAULT_PREFS, **(u.get("notification_prefs") or {})}
        if not prefs.get("portfolio_watch", True):
            continue
        campaign_id = f"rank-{uid}-{day}"
        if sends.find_one({"campaign_id": campaign_id, "user_id": uid}, {"_id": 1}):
            continue
        result = push_service.send_to_user(uid, push_payload(fired, prefs.get("language", "bn")))
        sends.update_one(
            {"campaign_id": campaign_id, "user_id": uid},
            {"$set": {"campaign_id": campaign_id, "user_id": uid,
                      "status": "sent" if result["sent"] else "failed",
                      "result": result, "sent_at": datetime.now(timezone.utc)}},
            upsert=True,
        )
        if result["sent"]:
            pushed += 1
    return pushed
