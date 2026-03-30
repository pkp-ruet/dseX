from datetime import date
from fastapi import APIRouter
from backend.services.db_service import load_dividend_declarations, load_companies
from backend.models.responses import DividendsUpcomingResponse, UpcomingDividend

router = APIRouter()


@router.get("/api/dividends/upcoming", response_model=DividendsUpcomingResponse)
def get_upcoming_dividends():
    decls = load_dividend_declarations()
    companies = {c["trading_code"]: c for c in load_companies()}
    today = date.today().isoformat()

    upcoming_decls = []
    upcoming_records = []

    for d in decls:
        code = d.get("trading_code", "")
        comp = companies.get(code, {})
        name = comp.get("company_name")
        div_pct = d.get("dividend_pct")

        decl_date = d.get("declaration_date")
        rec_date  = d.get("record_date")

        decl_str = decl_date if isinstance(decl_date, str) else (
            decl_date.isoformat() if hasattr(decl_date, "isoformat") else None
        )
        rec_str = rec_date if isinstance(rec_date, str) else (
            rec_date.isoformat() if hasattr(rec_date, "isoformat") else None
        )

        if decl_str and decl_str >= today:
            upcoming_decls.append(UpcomingDividend(
                trading_code=code,
                company_name=name,
                projected_date=decl_str,
                dividend_pct=div_pct,
            ))

        if rec_str and rec_str >= today:
            upcoming_records.append(UpcomingDividend(
                trading_code=code,
                company_name=name,
                record_date=rec_str,
                dividend_pct=div_pct,
            ))

    upcoming_decls.sort(key=lambda x: x.projected_date or "")
    upcoming_records.sort(key=lambda x: x.record_date or "")

    return DividendsUpcomingResponse(
        upcoming_declarations=upcoming_decls[:6],
        upcoming_record_dates=upcoming_records[:6],
    )
