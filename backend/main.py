import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import scores, companies, dividends, audit, prices, market_movers, market_intelligence, market_index, stock_lists, market_live, auth, user, portfolio, dse_today, admin, market_analysis, stock_visits

app = FastAPI(title="dseX API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend origins
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://dsex.vercel.app,https://dsex.app,https://topstockbd.com,https://www.topstockbd.com"
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
app.include_router(market_live.router)
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(portfolio.router)
app.include_router(dse_today.router)
app.include_router(admin.router)
app.include_router(market_analysis.router)
app.include_router(stock_visits.router)


@app.on_event("startup")
def startup():
    from backend.services.auth_service import ensure_users_indexes
    ensure_users_indexes()

    from backend.services.db_service import get_db
    from pymongo import ASCENDING
    db = get_db()
    db.stock_visits.create_index(
        [("trading_code", ASCENDING), ("date", ASCENDING)],
        unique=True,
    )
    db.stock_visits.create_index([("date", ASCENDING)])


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
