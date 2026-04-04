import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import scores, companies, dividends, audit, prices, market_movers

app = FastAPI(title="dseX API", version="1.0.0")

# ---------------------------------------------------------------------------
# CORS — allow Next.js frontend origins
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,https://dsex.vercel.app,https://dsex.app"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET"],
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


@app.get("/health")
def health():
    from backend.services.db_service import get_db
    try:
        get_db().command("ping")
        db_status = "connected"
    except Exception:
        db_status = "error"
    return {"status": "ok", "db": db_status}
