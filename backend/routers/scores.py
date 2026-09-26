import hmac
import math
import os
import threading
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from backend.config import ADMIN_EMAILS
from backend.routers.auth import get_current_user_optional
from backend.services.scoring_service import (
    build_scores_df, invalidate_scores_cache, reload_after_scrape,
)
from backend.services.db_service import load_companies, load_latest_prices
from backend.services.signal_service import build_signals, wire_fields
from backend.services.tiers import TIER_KEYS, tier_key
from backend.models.responses import ScoresResponse, ScoreItem, ScoreTiers, StockSignal

router = APIRouter()


def _json_float(v):
    """JSON has no NaN/Inf — convert to None for API responses."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


@router.post("/api/scores/refresh")
def refresh_scores(
    recompute: bool = False,
    x_revalidate_secret: Optional[str] = Header(default=None),
    user: Optional[dict] = Depends(get_current_user_optional),
):
    """Drop every in-process cache so the next request reads fresh data.

    Called by `scrape-all` after it stores the new snapshot (shared-secret
    header `x-revalidate-secret` = REVALIDATE_SECRET), or by an admin.
    `recompute=true` (admin only) also reruns the full scoring pipeline — use it
    after deploying a scoring change. This used to be public and always
    recomputed, so anyone could pin the web process's CPU and memory with it."""
    is_admin = bool(user) and (user.get("email") or "").lower() in ADMIN_EMAILS
    secret = os.getenv("REVALIDATE_SECRET")
    by_secret = bool(secret and x_revalidate_secret
                     and hmac.compare_digest(x_revalidate_secret, secret))
    if not (is_admin or by_secret):
        raise HTTPException(status_code=403, detail="Not allowed")
    if recompute:
        if not is_admin:
            raise HTTPException(status_code=403, detail="Recompute is admin-only")
        invalidate_scores_cache()
    reload_after_scrape()
    return {"status": "recomputed" if recompute else "caches cleared"}


# The finished response, rebuilt only when one of its inputs is a new object
# (every input is itself cached, so identity changes exactly when data changes).
# Holding the inputs keeps their ids from being reused.
_response_memo: dict = {"inputs": None, "resp": None}
_response_lock = threading.Lock()


@router.get("/api/scores", response_model=ScoresResponse)
def get_scores(response: Response):
    # Browsers re-requested this ~250 KB payload on every client-side page.
    response.headers["Cache-Control"] = "public, max-age=300"
    inputs = (build_scores_df(), load_companies(), build_signals(), load_latest_prices())
    with _response_lock:
        memo = _response_memo
        if memo["inputs"] is not None and all(a is b for a, b in zip(memo["inputs"], inputs)):
            return memo["resp"]
    resp = _build_scores_response(*inputs)
    with _response_lock:
        _response_memo.update(inputs=inputs, resp=resp)
    return resp


def _build_scores_response(df, companies_list, signals, prices) -> ScoresResponse:
    companies = {c["trading_code"]: c for c in companies_list}

    tiers: dict[str, list[ScoreItem]] = {k: [] for k in TIER_KEYS}

    if not df.empty:
        scored = df[df["score"].notna()].sort_values("score", ascending=False)
        for row in scored.to_dict("records"):
            code  = row["trading_code"]
            score = row["score"]
            comp  = companies.get(code, {})
            _lry = row.get("last_reported_year")
            _day = row.get("data_age_years")
            _stale = row.get("stale_data")
            item = ScoreItem(
                trading_code=code,
                company_name=comp.get("company_name"),
                sector=row.get("sector"),
                market_category=comp.get("market_category"),
                score=_json_float(score),
                ltp=_json_float(row.get("ltp")),
                change_pct=None,
                eps_yoy_pct=_json_float(row.get("eps_yoy_pct")),
                eps=_json_float(row.get("eps")),
                div_yield_pct=_json_float(row.get("div_yield_pct")),
                p1_biz=_json_float(row.get("p1_biz")),
                p2_health=_json_float(row.get("p2_health")),
                p3_moat=_json_float(row.get("p3_moat")),
                p4_val=_json_float(row.get("p4_val")),
                p5_div=_json_float(row.get("p5_div")),
                last_reported_year=int(_lry) if _lry is not None and not (isinstance(_lry, float) and math.isnan(_lry)) else None,
                data_age_years=int(_day) if _day is not None and not (isinstance(_day, float) and math.isnan(_day)) else None,
                stale_data=bool(_stale) if _stale is not None and not (isinstance(_stale, float) and math.isnan(_stale)) else None,
            )
            sig = wire_fields(signals.get(code))
            if sig:
                item.signal = StockSignal(**sig)
            tiers[tier_key(score)].append(item)

    # Inject latest price change_pct
    for tier_list in tiers.values():
        for item in tier_list:
            p = prices.get(item.trading_code, {})
            item.change_pct = _json_float(p.get("change_pct"))
            if p.get("ltp") is not None:
                item.ltp = _json_float(p.get("ltp"))

    return ScoresResponse(
        algorithm="DSEF",
        computed_at=datetime.now(timezone.utc).isoformat(),
        tiers=ScoreTiers(**tiers),
        counts={k: len(v) for k, v in tiers.items()},
    )
