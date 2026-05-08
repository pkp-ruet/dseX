"""
Admin score adjustments — manual percentage tweaks applied to a company's
final DSEF score (after the 0–100 scaling, before clamping).

Stored in collection `score_adjustments`:
  { trading_code, pct, reason, updated_by, updated_at }

`pct` is bounded to [-100, +500]. Final score is clamped to [0, 100] after the
adjustment is applied — see scoring_service.
"""
from datetime import datetime, timezone
from typing import Optional

from pymongo import ASCENDING

from backend.services.db_service import get_db
from backend.services.scoring_service import invalidate_scores_cache

PCT_MIN = -100.0
PCT_MAX = 500.0
COLLECTION = "score_adjustments"


def ensure_indexes() -> None:
    col = get_db()[COLLECTION]
    existing = {ix["name"] for ix in col.list_indexes()}
    if "trading_code_1" not in existing:
        col.create_index([("trading_code", ASCENDING)], unique=True, name="trading_code_1")


def load_adjustments_map() -> dict[str, float]:
    """Return {trading_code: pct} for all stored adjustments."""
    col = get_db()[COLLECTION]
    return {
        d["trading_code"]: float(d.get("pct", 0))
        for d in col.find({}, {"trading_code": 1, "pct": 1, "_id": 0})
    }


def list_adjustments() -> list[dict]:
    """Full list of adjustment documents (for the admin table)."""
    col = get_db()[COLLECTION]
    out = []
    for d in col.find({}, {"_id": 0}).sort("updated_at", -1):
        ua = d.get("updated_at")
        if isinstance(ua, datetime):
            d["updated_at"] = ua.isoformat()
        out.append(d)
    return out


def upsert_adjustment(
    trading_code: str,
    pct: float,
    reason: Optional[str],
    updated_by: Optional[str],
) -> dict:
    code = (trading_code or "").strip().upper()
    if not code:
        raise ValueError("trading_code is required")
    pct = float(pct)
    if pct < PCT_MIN or pct > PCT_MAX:
        raise ValueError(f"pct must be between {PCT_MIN} and {PCT_MAX}")

    db = get_db()
    if not db.companies.find_one({"trading_code": code}, {"_id": 1}):
        raise ValueError(f"Unknown trading_code: {code}")

    doc = {
        "trading_code": code,
        "pct": pct,
        "reason": (reason or "").strip() or None,
        "updated_by": updated_by,
        "updated_at": datetime.now(timezone.utc),
    }
    db[COLLECTION].update_one({"trading_code": code}, {"$set": doc}, upsert=True)
    invalidate_scores_cache()
    doc["updated_at"] = doc["updated_at"].isoformat()
    return doc


def delete_adjustment(trading_code: str) -> bool:
    code = (trading_code or "").strip().upper()
    res = get_db()[COLLECTION].delete_one({"trading_code": code})
    if res.deleted_count:
        invalidate_scores_cache()
        return True
    return False
