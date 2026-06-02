import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import scores, companies, dividends, audit, prices, market_movers, market_intelligence, market_index, stock_lists, auth, user, portfolio, dse_today, admin, market_analysis, stock_visits, top20, daily_pick

app = FastAPI(title="dseX API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend origins
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,https://dsex.vercel.app,https://dsex.app,https://topstockbd.com,https://www.topstockbd.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(scores.router)
app.include_router(companies.router)
app.include_router(dividends.router)
app.include_router(audit.router)
app.include_router(prices.router)
app.include_router(market_movers.router)
app.include_router(market_intelligence.router)
app.include_router(market_index.router)
app.include_router(stock_lists.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(portfolio.router)
app.include_router(dse_today.router)
app.include_router(admin.router)
app.include_router(market_analysis.router)
app.include_router(stock_visits.router)
app.include_router(top20.router)
app.include_router(daily_pick.router)


@app.on_event("startup")
def startup():
    from backend.services.auth_service import ensure_users_indexes
    ensure_users_indexes()

    from backend.services.daily_pick_service import ensure_daily_picks_indexes
    ensure_daily_picks_indexes()

    from backend.services.score_adjustments_service import ensure_indexes as ensure_score_adj_indexes
    ensure_score_adj_indexes()

    from backend.services.db_service import get_db
    from pymongo import ASCENDING
    db = get_db()
    _migrate_stock_visits_to_single_row(db)
    db.stock_visits.create_index([("trading_code", ASCENDING)], unique=True)
    db.stock_visits.create_index([("count", -1)])


@app.on_event("shutdown")
def shutdown():
    from backend.services.db_service import close_db
    close_db()


def _migrate_stock_visits_to_single_row(db) -> None:
    """One-shot: collapse daily-bucketed stock_visits rows into one row per company.
    Idempotent — safe to run on every startup."""
    from datetime import datetime, timezone

    existing = {ix["name"]: ix for ix in db.stock_visits.list_indexes()}
    if "trading_code_1_date_1" in existing:
        db.stock_visits.drop_index("trading_code_1_date_1")
    if "date_1" in existing:
        db.stock_visits.drop_index("date_1")

    sample = db.stock_visits.find_one({"date": {"$exists": True}}, {"_id": 1})
    if not sample:
        return

    totals = db.stock_visits.aggregate([
        {"$group": {
            "_id": "$trading_code",
            "total": {"$sum": "$count"},
            "last": {"$max": "$date"},
        }},
    ])
    rollups = list(totals)
    db.stock_visits.delete_many({})
    if rollups:
        now = datetime.now(timezone.utc)
        db.stock_visits.insert_many([
            {
                "trading_code": r["_id"],
                "count": int(r["total"]),
                "last_visited_at": r["last"] or now,
            }
            for r in rollups if r["_id"]
        ])


@app.get("/health")
def health():
    from backend.services.db_service import get_db
    try:
        get_db().command("ping")
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}


@app.head("/health")
def health_head():
    # HEAD for uptime monitors (GET still runs DB ping + JSON body).
    return Response(status_code=200)
