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
    eps: Optional[float] = None
    div_yield_pct: Optional[float] = None
    p1_biz: Optional[float] = None
    p2_health: Optional[float] = None
    p3_moat: Optional[float] = None
    p4_val: Optional[float] = None
    p5_div: Optional[float] = None
    last_reported_year: Optional[int] = None
    data_age_years: Optional[int] = None
    stale_data: Optional[bool] = None


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


class RelatedStock(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    score: Optional[float] = None
    ltp: Optional[float] = None
    change_pct: Optional[float] = None


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
    related_stocks: list[RelatedStock] = []


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


class MarketSignalItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    ltp: Optional[float] = None
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    value_mn: Optional[float] = None
    avg_volume_7d: Optional[float] = None
    volume_ratio: Optional[float] = None
    score: Optional[float] = None


class SectorStrengthItem(BaseModel):
    sector: str
    avg_change_pct: float
    count: int


class MarketSummary(BaseModel):
    date: Optional[str] = None
    avg_change_pct: Optional[float] = None
    gainers: int = 0
    losers: int = 0
    flat: int = 0
    total: int = 0


class MarketIntelSignals(BaseModel):
    accumulation_radar: Optional[list[MarketSignalItem]] = None
    resilience_leaders: Optional[list[MarketSignalItem]] = None
    floor_watch: Optional[list[MarketSignalItem]] = None
    volume_breakouts: Optional[list[MarketSignalItem]] = None
    momentum_leaders: Optional[list[MarketSignalItem]] = None
    quality_laggards: Optional[list[MarketSignalItem]] = None
    volume_divergence: Optional[list[MarketSignalItem]] = None
    dividend_capture: Optional[list[MarketSignalItem]] = None
    hidden_gems: Optional[list[MarketSignalItem]] = None
    sector_strength: Optional[list[SectorStrengthItem]] = None


class MarketIntelligenceResponse(BaseModel):
    market_condition: str
    market_summary: MarketSummary
    signals: MarketIntelSignals


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


class MarketIndexResponse(BaseModel):
    date: Optional[str] = None
    dsex: Optional[float] = None
    dsex_change: Optional[float] = None
    dsex_change_pct: Optional[float] = None
    dses: Optional[float] = None
    dses_change: Optional[float] = None
    ds30: Optional[float] = None
    ds30_change: Optional[float] = None
    total_volume: Optional[float] = None
    total_value_mn: Optional[float] = None
    total_trades: Optional[float] = None
    volume_change_pct: Optional[float] = None
    turnover_change_pct: Optional[float] = None
    up_count: Optional[int] = None
    down_count: Optional[int] = None
    neutral_count: Optional[int] = None


class DseTodayTableItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    ltp: Optional[float] = None
    change_pct: Optional[float] = None
    volume: Optional[float] = None
    value_mn: Optional[float] = None


class DseTodayNewsItem(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    title: str
    body: Optional[str] = None
    post_date: Optional[str] = None


class DseTodayIntelligence(BaseModel):
    market_condition: str
    sector_strength: list[SectorStrengthItem]


class DseTodayResponse(BaseModel):
    header: MarketIndexResponse
    movers: MarketMoversResponse
    intelligence: DseTodayIntelligence
    table: list[DseTodayTableItem]
    news: list[DseTodayNewsItem]


class PopularStockItem(BaseModel):
    rank: int
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    visits_total: int
    ltp: Optional[float] = None
    change_pct: Optional[float] = None
    score: Optional[float] = None
    tier: Optional[str] = None


class PopularStocksResponse(BaseModel):
    as_of: str
    items: list[PopularStockItem]


class Top20Item(BaseModel):
    rank: int
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    ltp: Optional[float] = None
    return_7d_pct: Optional[float] = None
    rs_vs_dsex_pct: Optional[float] = None
    volume_ratio: Optional[float] = None
    avg_turnover_7d_mn: Optional[float] = None
    up_days_7d: int = 0
    days_counted: int = 0
    pct_in_52w_range: Optional[float] = None
    composite_score: float = 0.0
    rationale: str = ""


class Top20Response(BaseModel):
    generated_at: str
    as_of_date: Optional[str] = None
    market_condition: str
    dsex_7d_change_pct: Optional[float] = None
    universe_size: int = 0
    items: list[Top20Item]
