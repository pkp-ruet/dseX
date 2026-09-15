from datetime import date
from typing import Iterable, Optional
from fastapi import APIRouter
from backend.services.db_service import load_dividend_declarations, load_companies
from backend.models.responses import DividendsUpcomingResponse, UpcomingDividend

router = APIRouter()


def compute_upcoming_dividends(
    codes: Optional[Iterable[str]] = None,
    limit: Optional[int] = 6,
) -> DividendsUpcomingResponse:
    """Upcoming declarations + record dates from the declaration ledger.

    `codes` narrows the result to those trading codes (the logged-in home bundle
    asks for the user's own stocks — the public widget's top-6 cut used to drop
    them). `limit=None` returns every match."""
    decls = load_dividend_declarations()
    companies = {c["trading_code"]: c for c in load_companies()}
    today = date.today().isoformat()
    wanted = {c.upper() for c in codes} if codes is not None else None

    upcoming_decls = []
    upcoming_records = []

    for d in decls:
        code = d.get("trading_code", "")
        if wanted is not None and code.upper() not in wanted:
            continue
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

    if limit is not None:
        upcoming_decls = upcoming_decls[:limit]
        upcoming_records = upcoming_records[:limit]

    return DividendsUpcomingResponse(
        upcoming_declarations=upcoming_decls,
        upcoming_record_dates=upcoming_records,
    )


@router.get("/api/dividends/upcoming", response_model=DividendsUpcomingResponse)
def get_upcoming_dividends():
    return compute_upcoming_dividends()
