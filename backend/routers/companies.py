import math
from fastapi import APIRouter, HTTPException
from backend.services.db_service import (
    get_company, load_latest_prices, load_price_history,
    load_financials, load_extended_financials, load_shareholdings,
    load_company_news, load_dividend_declarations, load_all_company_codes,
    compute_52w_range, compute_signal_flags,
)
from backend.services.scoring_service import get_company_score_row
from backend.models.responses import (
    CompanyDetailResponse, CompanyProfile, LatestPrice,
    SignalFlags, DividendDeclaration,
)

router = APIRouter()


@router.get("/api/companies/codes")
def get_all_codes() -> list[str]:
    return load_all_company_codes()


@router.get("/api/company/{code}", response_model=CompanyDetailResponse)
def get_company_detail(code: str):
    company = get_company(code.upper())
    if not company:
        raise HTTPException(status_code=404, detail=f"Company '{code}' not found")

    trading_code = company["trading_code"]

    prices = load_latest_prices()
    latest = prices.get(trading_code, {})

    price_history = load_price_history(trading_code)
    w52_high, w52_low = compute_52w_range(price_history)

    financials = load_financials(trading_code)
    ext_financials = load_extended_financials(trading_code)
    holdings = load_shareholdings(trading_code)
    news = load_company_news(trading_code, limit=20)
    div_decls = load_dividend_declarations()

    score_row = get_company_score_row(trading_code)

    # Dividend declaration for this company
    div_decl = next((d for d in div_decls if d.get("trading_code") == trading_code), None)
    div_decl_model = None
    if div_decl:
        div_decl_model = DividendDeclaration(
            declaration_date=div_decl.get("declaration_date"),
            record_date=div_decl.get("record_date"),
            dividend_pct=div_decl.get("dividend_pct"),
            dividend_type=div_decl.get("dividend_type"),
        )

    # Latest shareholding
    shareholding = holdings[0] if holdings else None

    # Signal flags
    flags = compute_signal_flags(score_row, holdings, financials, company)

    # Clean score_row NaN
    if score_row:
        score_row = {
            k: (None if isinstance(v, float) and math.isnan(v) else v)
            for k, v in score_row.items()
        }

    return CompanyDetailResponse(
        profile=CompanyProfile(
            trading_code=trading_code,
            company_name=company.get("company_name"),
            sector=company.get("sector"),
            market_category=company.get("market_category"),
            face_value=company.get("face_value"),
            total_shares=company.get("total_shares"),
            reserve_surplus_mn=company.get("reserve_surplus_mn"),
            total_loan_mn=company.get("total_loan_mn"),
            paid_up_capital_mn=company.get("paid_up_capital_mn"),
        ),
        latest_price=LatestPrice(
            ltp=latest.get("ltp"),
            change=latest.get("change"),
            change_pct=latest.get("change_pct"),
            date=latest.get("date"),
            high=latest.get("high"),
            low=latest.get("low"),
            volume=latest.get("volume"),
            ycp=latest.get("ycp"),
            w52_high=w52_high,
            w52_low=w52_low,
        ),
        score_row=score_row,
        signal_flags=SignalFlags(green=flags["green"], red=flags["red"]),
        financials=financials,
        extended_financials=ext_financials,
        shareholding=shareholding,
        dividend_declaration=div_decl_model,
        news=news,
    )
