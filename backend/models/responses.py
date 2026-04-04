from typing import Optional, Any
from pydantic import BaseModel


class ScoreItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    market_category: Optional[str] = None
    score: Optional[float] = None
    ltp: Optional[float] = None
    change_pct: Optional[float] = None
    eps_yoy_pct: Optional[float] = None
    div_yield_pct: Optional[float] = None


class ScoreTiers(BaseModel):
    strong_buy: list[ScoreItem]
    safe_buy: list[ScoreItem]
    watch: list[ScoreItem]
    avoid: list[ScoreItem]


class ScoresResponse(BaseModel):
    algorithm: str
    computed_at: str
    tiers: ScoreTiers
    counts: dict[str, int]


class LatestPrice(BaseModel):
    ltp: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    date: Optional[Any] = None
    high: Optional[float] = None
    low: Optional[float] = None
    volume: Optional[float] = None
    ycp: Optional[float] = None
    w52_high: Optional[float] = None
    w52_low: Optional[float] = None


class CompanyProfile(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    market_category: Optional[str] = None
    face_value: Optional[float] = None
    total_shares: Optional[float] = None
    reserve_surplus_mn: Optional[float] = None
    total_loan_mn: Optional[float] = None
    paid_up_capital_mn: Optional[float] = None


class SignalFlags(BaseModel):
    green: list[str]
    red: list[str]


class DividendDeclaration(BaseModel):
    declaration_date: Optional[Any] = None
    record_date: Optional[Any] = None
    dividend_pct: Optional[float] = None
    dividend_type: Optional[str] = None


class CompanyDetailResponse(BaseModel):
    profile: CompanyProfile
    latest_price: LatestPrice
    score_row: Optional[dict[str, Any]] = None
    signal_flags: SignalFlags
    financials: list[dict[str, Any]]
    extended_financials: list[dict[str, Any]]
    shareholding: Optional[dict[str, Any]] = None
    dividend_declaration: Optional[DividendDeclaration] = None
    news: list[dict[str, Any]]


class UpcomingDividend(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    projected_date: Optional[Any] = None
    record_date: Optional[Any] = None
    dividend_pct: Optional[float] = None


class DividendsUpcomingResponse(BaseModel):
    upcoming_declarations: list[UpcomingDividend]
    upcoming_record_dates: list[UpcomingDividend]


class MarketMoverItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    ltp: Optional[float] = None
    change: Optional[float] = None
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    value_mn: Optional[float] = None


class MarketMoversResponse(BaseModel):
    date: Optional[str] = None
    gainers: list[MarketMoverItem]
    losers: list[MarketMoverItem]
    most_traded: list[MarketMoverItem]


class AuditCompanyRow(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    eps_years: int = 0
    profit_years: int = 0
    dividend_years: int = 0
    nav_years: int = 0
    cf_years: int = 0
    ebit_years: int = 0
    revenue_years: int = 0
    news_count: int = 0
    has_price: bool = False
    has_shareholding: bool = False


class AuditSummary(BaseModel):
    total: int
    has_financials: int
    has_cf: int
    missing_price: int


class AuditResponse(BaseModel):
    summary: AuditSummary
    companies: list[AuditCompanyRow]
