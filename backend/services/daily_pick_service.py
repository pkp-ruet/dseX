"""
Daily picks service — three stocks chosen per day:
  - 1 from the DSE Top 20 momentum list (recent price action)
  - 2 from the DSEF fundamental scoring (score >= 65, top-quality companies)

Persistence: `daily_picks` collection with one row per (date, slot).
Display order in the public payload is randomized so no slot looks "first" by default.

Admin can refresh any individual slot: the current pick at that slot is added
to today's skip list, and a new candidate is drawn from the same source pool.
"""
import random
from datetime import datetime, timezone
from typing import Optional
from pymongo import ASCENDING, DESCENDING

from backend.services.db_service import get_db, load_latest_prices, load_companies
from backend.services.scoring_service import build_scores_df
from backend.services.top20_service import compute_top20


SOURCE_DSEF = "dsef"
SOURCE_TOP20 = "dse_top20"

# Slot 1 → momentum (top20). Slot 2, 3 → fundamental (DSEF, score >= 65).
SLOTS = [
    {"slot": 1, "source": SOURCE_TOP20},
    {"slot": 2, "source": SOURCE_DSEF},
    {"slot": 3, "source": SOURCE_DSEF},
]

# Plain English labels for the source — never use "DSEF" / "Top 20" wording.
SOURCE_LABEL = {
    SOURCE_TOP20: "Trending",
    SOURCE_DSEF:  "Top Quality",
}


def _today_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def ensure_daily_picks_indexes() -> None:
    """Set up indexes; migrates from the legacy single-pick-per-day schema."""
    db = get_db()
    existing = {ix["name"]: ix for ix in db.daily_picks.list_indexes()}
    # Drop legacy unique-on-date index if present
    if "date_1" in existing and existing["date_1"].get("unique"):
        try:
            db.daily_picks.drop_index("date_1")
        except Exception:
            pass
    db.daily_picks.create_index([("date", ASCENDING), ("slot", ASCENDING)], unique=True)
    db.daily_picks.create_index([("date", DESCENDING)])
    # One-shot: remove any legacy docs that don't have a slot field
    db.daily_picks.delete_many({"slot": {"$exists": False}})

    db.daily_pick_skips.create_index([("date", ASCENDING), ("trading_code", ASCENDING)], unique=True)
    db.daily_pick_skips.create_index([("date", DESCENDING)])


# ---------------------------------------------------------------------------
# Price helpers
# ---------------------------------------------------------------------------

def _next_day_return_pct(trading_code: str, pick_date: str) -> Optional[float]:
    db = get_db()
    try:
        pick_dt = datetime.strptime(pick_date, "%Y-%m-%d")
    except ValueError:
        return None
    docs = list(
        db.stock_prices.find(
            {"trading_code": trading_code, "date": {"$gte": pick_dt}},
            {"_id": 0, "date": 1, "ltp": 1},
        ).sort("date", ASCENDING).limit(2)
    )
    if len(docs) < 2:
        return None
    base = docs[0].get("ltp")
    nxt = docs[1].get("ltp")
    if not base or not nxt or base <= 0:
        return None
    return round((nxt - base) / base * 100, 2)


# ---------------------------------------------------------------------------
# Reason bullets — plain language, audience-friendly
# ---------------------------------------------------------------------------

def _reasons_for_dsef(row: dict) -> list[str]:
    """Reasons for a fundamentals-based (DSEF) pick."""
    reasons: list[str] = []

    eps_yoy = row.get("eps_yoy_pct")
    if eps_yoy is not None and eps_yoy >= 10:
        reasons.append(f"Profit grew {round(eps_yoy)}% compared to last year.")

    div_yield = row.get("div_yield_pct")
    p5_div = row.get("p5_div") or 0
    if div_yield is not None and div_yield >= 3 and p5_div >= 6:
        reasons.append(f"Pays a {div_yield:.1f}% dividend — and the company can afford it.")

    p4_val = row.get("p4_val") or 0
    if p4_val >= 7 and len(reasons) < 3:
        reasons.append("Currently cheaper than its usual price history.")

    p2_health = row.get("p2_health") or 0
    if p2_health >= 7 and len(reasons) < 3:
        reasons.append("Strong balance sheet — low debt, steady cash flow.")

    p3_moat = row.get("p3_moat") or 0
    if p3_moat >= 7 and len(reasons) < 3:
        reasons.append("Holds a strong position in its industry.")

    p1_biz = row.get("p1_biz") or 0
    if p1_biz >= 7 and len(reasons) < 3:
        reasons.append("Made profits consistently year after year.")

    if not reasons:
        score = row.get("score") or 0
        reasons.append(f"Overall grade: {score}/100 — one of the strongest names today.")

    return reasons[:3]


def _reasons_for_momentum(item: dict) -> list[str]:
    """Reasons for a momentum-based (DSE Top 20) pick."""
    reasons: list[str] = []

    r7 = item.get("return_7d_pct")
    if r7 is not None:
        if r7 >= 1:
            reasons.append(f"Up {r7:.1f}% in the last week.")
        elif r7 > -1:
            reasons.append("Holding steady this week despite market moves.")

    rs = item.get("rs_vs_dsex_pct")
    if rs is not None:
        if rs >= 2:
            reasons.append(f"Beating the broader market by {rs:.1f}% this week.")
        elif rs <= -2 and (r7 is None or r7 >= 0):
            reasons.append("Holding up better than the market overall.")

    vr = item.get("volume_ratio")
    if vr is not None and len(reasons) < 3:
        if vr >= 2:
            reasons.append("Buyers are piling in — volume is more than 2× normal.")
        elif vr >= 1.4:
            reasons.append("Trading volume is noticeably higher than usual.")

    ud = item.get("up_days_7d") or 0
    days = item.get("days_counted") or 0
    if days >= 5 and ud >= max(4, days - 1) and len(reasons) < 3:
        reasons.append(f"Closed up on {ud} of the last {days} trading days.")

    if not reasons:
        reasons.append("Showing strong recent price action and trader interest.")

    return reasons[:3]


# ---------------------------------------------------------------------------
# Candidate pools
# ---------------------------------------------------------------------------

def _dsef_candidates(top_n: int = 40) -> list[dict]:
    """Top-N DSEF-ranked rows by score (descending).
    Pool is the top fundamentally-ranked stocks; selector then samples from it
    with date-seeded randomness so quality picks vary daily within the top tier."""
    df = build_scores_df()
    if df.empty:
        return []
    scored = df[df["score"].notna()].sort_values("score", ascending=False).head(top_n)
    return scored.to_dict("records")


def _top20_candidates() -> list[dict]:
    """DSE Top 20 momentum list."""
    payload = compute_top20()
    return payload.get("items", []) or []


def _today_skipped_codes() -> set[str]:
    db = get_db()
    today = _today_iso()
    return {
        d["trading_code"]
        for d in db.daily_pick_skips.find({"date": today}, {"trading_code": 1, "_id": 0})
    }


def _picked_today_codes(exclude_slot: Optional[int] = None) -> set[str]:
    """Codes already picked today across other slots — never duplicate within a day."""
    db = get_db()
    today = _today_iso()
    q: dict = {"date": today}
    if exclude_slot is not None:
        q["slot"] = {"$ne": exclude_slot}
    return {
        d["trading_code"]
        for d in db.daily_picks.find(q, {"trading_code": 1, "_id": 0})
    }


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

def _select_for_slot(slot: int, source: str, exclude: set[str]) -> Optional[dict]:
    """Pick one candidate for the given slot from the right source pool.
    Excludes codes in `exclude`. Returns a dict with a normalised shape."""
    if source == SOURCE_DSEF:
        candidates = _dsef_candidates()
        # Date-seeded shuffle so picks rotate across the top-40 daily
        seed = abs(hash(f"{_today_iso()}|dsef|{slot}")) % (2**31)
        rng = random.Random(seed)
        shuffled = list(candidates)
        rng.shuffle(shuffled)
        for row in shuffled:
            code = row.get("trading_code")
            if not code or code in exclude:
                continue
            return _materialize_dsef_pick(slot, row)
        return None

    if source == SOURCE_TOP20:
        candidates = _top20_candidates()
        # Try in ranked order
        for item in candidates:
            code = item.get("trading_code")
            if not code or code in exclude:
                continue
            return _materialize_momentum_pick(slot, item)
        return None

    return None


def _materialize_dsef_pick(slot: int, row: dict) -> dict:
    """Convert a DSEF score row into a daily_picks document."""
    companies = {c["trading_code"]: c for c in load_companies()}
    code = row["trading_code"]
    comp = companies.get(code, {})
    prices = load_latest_prices()
    p = prices.get(code, {})

    return {
        "date": _today_iso(),
        "slot": slot,
        "source": SOURCE_DSEF,
        "trading_code": code,
        "company_name": comp.get("company_name") or row.get("company_name"),
        "sector": row.get("sector") or comp.get("sector"),
        "score": float(row.get("score") or 0),
        "ltp_at_pick": p.get("ltp"),
        "change_pct_at_pick": p.get("change_pct"),
        "return_7d_pct": None,
        "reasons": _reasons_for_dsef(row),
        "picked_at": datetime.now(timezone.utc),
    }


def _materialize_momentum_pick(slot: int, item: dict) -> dict:
    """Convert a Top20 momentum item into a daily_picks document."""
    companies = {c["trading_code"]: c for c in load_companies()}
    code = item["trading_code"]
    comp = companies.get(code, {})
    prices = load_latest_prices()
    p = prices.get(code, {})

    # Cross-reference DSEF score for grading (bring forward whichever exists)
    df = build_scores_df()
    score: Optional[float] = None
    if not df.empty:
        sub = df[df["trading_code"] == code]
        if not sub.empty:
            sc = sub.iloc[0].get("score")
            if sc is not None and not (isinstance(sc, float) and sc != sc):  # NaN guard
                score = float(sc)

    return {
        "date": _today_iso(),
        "slot": slot,
        "source": SOURCE_TOP20,
        "trading_code": code,
        "company_name": comp.get("company_name") or item.get("company_name"),
        "sector": item.get("sector") or comp.get("sector"),
        "score": score,
        "ltp_at_pick": item.get("ltp") or p.get("ltp"),
        "change_pct_at_pick": p.get("change_pct"),
        "return_7d_pct": item.get("return_7d_pct"),
        "reasons": _reasons_for_momentum(item),
        "picked_at": datetime.now(timezone.utc),
    }


# ---------------------------------------------------------------------------
# Public read paths
# ---------------------------------------------------------------------------

def _ensure_today_picks() -> list[dict]:
    """Read today's three picks; fill missing slots by selecting fresh candidates."""
    db = get_db()
    today = _today_iso()

    existing = {
        d["slot"]: d
        for d in db.daily_picks.find({"date": today}, {"_id": 0})
    }

    base_exclude = _today_skipped_codes()

    for slot_def in SLOTS:
        slot = slot_def["slot"]
        if slot in existing:
            continue
        exclude = base_exclude | _picked_today_codes(exclude_slot=slot)
        picked = _select_for_slot(slot, slot_def["source"], exclude)
        if not picked:
            continue
        try:
            db.daily_picks.insert_one(dict(picked))
        except Exception:
            # Race: another worker inserted; ignore
            pass
        # Track that this code is now picked today
        existing[slot] = picked

    # Re-read so we have clean shape (no _id)
    docs = list(db.daily_picks.find({"date": today}, {"_id": 0}).sort("slot", ASCENDING))
    return docs


def _public_pick_payload(doc: dict) -> dict:
    """Strip storage-only fields from a pick document for public consumption.

    The Buy/Hold/Sell signal is attached at read time from the live signal
    service (current state — never persisted into daily_picks docs)."""
    from backend.services.signal_service import build_signals, wire_fields
    return {
        "slot": doc.get("slot"),
        "source": doc.get("source"),
        "source_label": SOURCE_LABEL.get(doc.get("source") or "", "Pick"),
        "trading_code": doc.get("trading_code"),
        "company_name": doc.get("company_name"),
        "sector": doc.get("sector"),
        "score": doc.get("score"),
        "ltp": doc.get("ltp_at_pick"),
        "change_pct": doc.get("change_pct_at_pick"),
        "return_7d_pct": doc.get("return_7d_pct"),
        "reasons": doc.get("reasons") or [],
        "signal": wire_fields(build_signals().get((doc.get("trading_code") or "").upper())),
    }


def _yesterday_payload() -> Optional[dict]:
    """Most-recent past pick day with all 3 picks + their next-day returns."""
    db = get_db()
    today = _today_iso()
    last_doc = db.daily_picks.find_one(
        {"date": {"$lt": today}}, {"_id": 0}, sort=[("date", DESCENDING)]
    )
    if not last_doc:
        return None
    last_date = last_doc["date"]
    docs = list(
        db.daily_picks.find({"date": last_date}, {"_id": 0}).sort("slot", ASCENDING)
    )
    if not docs:
        return None
    items = []
    for d in docs:
        items.append({
            "slot": d.get("slot"),
            "trading_code": d.get("trading_code"),
            "company_name": d.get("company_name"),
            "next_day_return_pct": _next_day_return_pct(d["trading_code"], last_date),
        })
    return {"date": last_date, "picks": items}


def get_today_picks(seed: Optional[int] = None) -> dict:
    """Public payload — three picks (random display order) + yesterday's recap."""
    docs = _ensure_today_picks()
    payloads = [_public_pick_payload(d) for d in docs]

    # Random ordering — seeded by date so same visitor on reload sees same order,
    # but a different order each day. Admin actions will jitter the order via
    # picked_at, so we'll respect insertion order on load and just shuffle once.
    if seed is None:
        seed_str = _today_iso() + "|" + ",".join(p.get("trading_code") or "" for p in payloads)
        seed = abs(hash(seed_str)) % (2**31)
    rng = random.Random(seed)
    rng.shuffle(payloads)

    return {
        "date": _today_iso(),
        "picks": payloads,
        "yesterday": _yesterday_payload(),
    }


def get_pick_history(days: int = 30) -> list[dict]:
    """Returns picks grouped by date, newest first, for the public history page."""
    db = get_db()
    docs = list(
        db.daily_picks.find({}, {"_id": 0}).sort([("date", DESCENDING), ("slot", ASCENDING)])
    )
    grouped: dict[str, list[dict]] = {}
    for d in docs:
        grouped.setdefault(d["date"], []).append(d)

    out = []
    sorted_dates = sorted(grouped.keys(), reverse=True)
    for dt in sorted_dates[:days]:
        items = []
        for d in grouped[dt]:
            items.append({
                "slot": d.get("slot"),
                "source": d.get("source"),
                "source_label": SOURCE_LABEL.get(d.get("source") or "", "Pick"),
                "trading_code": d.get("trading_code"),
                "company_name": d.get("company_name"),
                "sector": d.get("sector"),
                "score": d.get("score"),
                "ltp_at_pick": d.get("ltp_at_pick"),
                "return_7d_pct": d.get("return_7d_pct"),
                "next_day_return_pct": _next_day_return_pct(d["trading_code"], dt),
                "reasons": d.get("reasons") or [],
            })
        out.append({"date": dt, "picks": items})
    return out


# ---------------------------------------------------------------------------
# Admin actions
# ---------------------------------------------------------------------------

def admin_get_state() -> dict:
    """Admin view: all picks today (in slot order) + skip log."""
    db = get_db()
    today = _today_iso()
    # Make sure today's slots are filled before returning
    _ensure_today_picks()
    docs = list(
        db.daily_picks.find({"date": today}, {"_id": 0}).sort("slot", ASCENDING)
    )
    picks = [
        {
            **_public_pick_payload(d),
            "picked_at": d.get("picked_at").isoformat() if isinstance(d.get("picked_at"), datetime) else d.get("picked_at"),
        }
        for d in docs
    ]
    skip_docs = list(
        db.daily_pick_skips.find({"date": today}, {"_id": 0}).sort("skipped_at", DESCENDING)
    )
    skips = []
    for s in skip_docs:
        skipped_at = s.get("skipped_at")
        if isinstance(skipped_at, datetime):
            skipped_at = skipped_at.isoformat()
        skips.append({
            "trading_code": s.get("trading_code"),
            "company_name": s.get("company_name"),
            "score_when_skipped": s.get("score_when_skipped"),
            "from_slot": s.get("from_slot"),
            "skipped_at": skipped_at,
            "skipped_by": s.get("skipped_by"),
        })
    return {
        "date": today,
        "picks": picks,
        "skips_today": skips,
        "yesterday": _yesterday_payload(),
    }


def refresh_slot(slot: int, refreshed_by_user_id: Optional[str] = None) -> dict:
    """Admin action: skip the current stock at the given slot and pick a new one
    from the same source pool. Returns the updated state."""
    if slot not in {s["slot"] for s in SLOTS}:
        raise ValueError(f"Invalid slot: {slot}")

    slot_def = next(s for s in SLOTS if s["slot"] == slot)
    db = get_db()
    today = _today_iso()

    current = db.daily_picks.find_one({"date": today, "slot": slot}, {"_id": 0})
    skipped_code: Optional[str] = None
    if current:
        skipped_code = current.get("trading_code")
        try:
            db.daily_pick_skips.insert_one({
                "date": today,
                "trading_code": skipped_code,
                "company_name": current.get("company_name"),
                "score_when_skipped": current.get("score"),
                "from_slot": slot,
                "skipped_at": datetime.now(timezone.utc),
                "skipped_by": refreshed_by_user_id,
            })
        except Exception:
            pass  # already recorded
        db.daily_picks.delete_one({"date": today, "slot": slot})

    # Build exclusion set
    exclude = _today_skipped_codes() | _picked_today_codes(exclude_slot=slot)

    new_pick = _select_for_slot(slot, slot_def["source"], exclude)
    if not new_pick:
        # Roll back — restore the original
        if current:
            db.daily_picks.insert_one(dict(current))
        raise RuntimeError(
            f"No remaining {SOURCE_LABEL.get(slot_def['source'], 'pick')} candidates"
        )

    db.daily_picks.insert_one(dict(new_pick))

    return {
        "skipped": skipped_code,
        "new_code": new_pick.get("trading_code"),
        "slot": slot,
        "state": admin_get_state(),
    }
