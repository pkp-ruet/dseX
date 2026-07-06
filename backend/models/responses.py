from typing import Optional, Any
from pydantic import BaseModel


class StockSignal(BaseModel):
    """Canonical Buy/Hold/Sell action signal (services/signal_service.py)."""
    signal: str                          # buy | hold | sell | none
    reason_key: str
    reason_en: str
    reason_bn: str
    tier: Optional[str] = None           # excellent|good|average|weak|unknown
    momentum_grade: Optional[str] = None  # hot|warm|flat|cold|weak_liquidity|unknown


class HoldingSignal(BaseModel):
    """Personalized per-holding overlay (portfolio_signals enum, unchanged)."""
    signal: str                          # buy_more | hold | sell
    reason_key: str
    reason_en: str
    reason_bn: str


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
    signal: Optional[StockSignal] = None


class RecommendedStock(BaseModel):
    trading_code: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    score: Optional[float] = None
    tier: Optional[str] = None          # excellent|good|average|weak (services/tiers.py)
    ltp: Optional[float] = None
    change_pct: Optional[float] = None
    div_yield_pct: Optional[float] = None
    eps_yoy_pct: Optional[float] = None
    p1_biz: Optional[float] = None
    p3_moat: Optional[float] = None
    p4_val: Optional[float] = None
    p5_div: Optional[float] = None
    match_score: float = 0.0            # internal 0-100 ranking score
    reasons: list[str] = []            # 1-2 plain-language sentences
    signal: Optional[StockSignal] = None


class RecommendationResponse(BaseModel):
    generated_at: str
    answers_echo: dict[str, Any]
    relaxations: list[str] = []         # filters dropped to find enough matches
    saved: bool = False                 # true if persisted for a logged-in user
    picks: list[RecommendedStock]


class ScoreTiers(BaseModel):
    excellent: list[ScoreItem]
    good: list[ScoreItem]
    average: list[ScoreItem]
    weak: list[ScoreItem]


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
    avg_volume_7d: Optional[float] = None  # mean volume of the 7 trading days before the latest
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
    pe: Optional[float] = None
    pb: Optional[float] = None
    div_yield_pct: Optional[float] = None
    roe_pct: Optional[float] = None
    eps_yoy_pct: Optional[float] = None


class ValuationContext(BaseModel):
    current_pe: Optional[float] = None
    current_pb: Optional[float] = None
    own_avg_pe: Optional[float] = None
    own_avg_pb: Optional[float] = None
    sector_median_pe: Optional[float] = None
    sector_median_pb: Optional[float] = None
    eps: Optional[float] = None
    sector_implied_price: Optional[float] = None


class SectorContext(BaseModel):
    sector: Optional[str] = None
    peer_count: Optional[int] = None
    rank_in_sector: Optional[int] = None
    sector_avg_score: Optional[float] = None
    sector_median_pe: Optional[float] = None


class MomentumSnapshot(BaseModel):
    return_7d_pct: Optional[float] = None
    rs_vs_dsex_pct: Optional[float] = None
    volume_ratio: Optional[float] = None
    avg_turnover_7d_mn: Optional[float] = None
    up_days_7d: Optional[int] = None
    days_counted: Optional[int] = None
    pct_in_52w_range: Optional[float] = None
    momentum_grade: str  # hot|warm|flat|cold|weak_liquidity|unknown


class StockVerdict(BaseModel):
    """Descriptive prose only — action advice lives in StockSignal."""
    headline: str
    tagline: str
    sentences: list[str]


class CompanyDetailResponse(BaseModel):
    profile: CompanyProfile
    latest_price: LatestPrice
    score_row: Optional[dict[str, Any]] = None
    signal_flags: SignalFlags
    financials: list[dict[str, Any]]
    extended_financials: list[dict[str, Any]]
    shareholding: Optional[dict[str, Any]] = None
    shareholding_prev: Optional[dict[str, Any]] = None  # snapshot before the latest, for ownership-change deltas
    dividend_declaration: Optional[DividendDeclaration] = None
    news: list[dict[str, Any]]
    related_stocks: list[RelatedStock] = []
    momentum: Optional[MomentumSnapshot] = None
    verdict: Optional[StockVerdict] = None
    signal: Optional[StockSignal] = None
    valuation: Optional[ValuationContext] = None
    sector_context: Optional[SectorContext] = None
    bengali_summary: Optional[str] = None  # plain-Bangla "এক নজরে" (cached, generated post-scrape)


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
    scraped_at: Optional[str] = None
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
