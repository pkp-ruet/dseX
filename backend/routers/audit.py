from fastapi import APIRouter
from backend.services.db_service import get_db, load_companies, load_latest_prices
from backend.models.responses import AuditResponse, AuditSummary, AuditCompanyRow

router = APIRouter()


@router.get("/api/audit", response_model=AuditResponse)
def get_audit():
    db = get_db()
    companies = load_companies()
    prices = load_latest_prices()

    # Aggregate financials counts per trading_code
    fin_agg = {}
    for doc in db.financials.find({}, {"trading_code": 1, "eps": 1, "eps_cont_basic": 1,
                                        "eps_basic": 1, "profit_mn": 1,
                                        "cash_dividend_pct": 1, "nav_per_share": 1, "_id": 0}):
        code = doc.get("trading_code")
        if not code:
            continue
        r = fin_agg.setdefault(code, {"eps": 0, "profit": 0, "dividend": 0, "nav": 0})
        eps = doc.get("eps_cont_basic") or doc.get("eps_basic")
        if eps is not None:
            r["eps"] += 1
        if doc.get("profit_mn") is not None:
            r["profit"] += 1
        if doc.get("cash_dividend_pct") is not None:
            r["dividend"] += 1
        if doc.get("nav_per_share") is not None:
            r["nav"] += 1

    # Aggregate ext financials counts
    ext_agg = {}
    for doc in db.company_financials_ext.find({}, {"trading_code": 1, "operating_cf": 1,
                                                    "ebit": 1, "revenue": 1, "_id": 0}):
        code = doc.get("trading_code")
        if not code:
            continue
        r = ext_agg.setdefault(code, {"cf": 0, "ebit": 0, "revenue": 0})
        if doc.get("operating_cf") is not None:
            r["cf"] += 1
        if doc.get("ebit") is not None:
            r["ebit"] += 1
        if doc.get("revenue") is not None:
            r["revenue"] += 1

    # News counts
    news_agg = {}
    for doc in db.company_news.aggregate([
        {"$group": {"_id": "$trading_code", "count": {"$sum": 1}}}
    ]):
        news_agg[doc["_id"]] = doc["count"]

    # Shareholding set
    has_holding = set(
        doc["trading_code"] for doc in db.shareholdings.find(
            {}, {"trading_code": 1, "_id": 0}
        )
    )

    rows = []
    for comp in companies:
        code = comp["trading_code"]
        fin = fin_agg.get(code, {})
        ext = ext_agg.get(code, {})
        rows.append(AuditCompanyRow(
            trading_code=code,
            company_name=comp.get("company_name"),
            eps_years=fin.get("eps", 0),
            profit_years=fin.get("profit", 0),
            dividend_years=fin.get("dividend", 0),
            nav_years=fin.get("nav", 0),
            cf_years=ext.get("cf", 0),
            ebit_years=ext.get("ebit", 0),
            revenue_years=ext.get("revenue", 0),
            news_count=news_agg.get(code, 0),
            has_price=code in prices,
            has_shareholding=code in has_holding,
        ))

    total = len(rows)
    has_financials = sum(1 for r in rows if r.eps_years >= 3 and r.profit_years >= 3)
    has_cf = sum(1 for r in rows if r.cf_years >= 1)
    missing_price = sum(1 for r in rows if not r.has_price)

    return AuditResponse(
        summary=AuditSummary(
            total=total,
            has_financials=has_financials,
            has_cf=has_cf,
            missing_price=missing_price,
        ),
        companies=rows,
    )
