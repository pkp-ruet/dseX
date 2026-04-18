import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import scores, companies, dividends, audit, prices, market_movers, market_intelligence, market_index

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
    allow_methods=["GET", "HEAD"],
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
