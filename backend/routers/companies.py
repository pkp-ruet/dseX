import math
from fastapi import APIRouter, HTTPException
from backend.services.db_service import (
    get_company, load_latest_prices, load_price_history,
    load_financials, load_extended_financials, load_shareholdings,
    load_company_news, load_dividend_declarations, load_all_company_codes,
    compute_52w_range, compute_signal_flags, load_news_for_codes,
    load_market_news,
)
from backend.services.scoring_service import get_company_score_row, build_scores_df
from backend.services.top20_service import compute_momentum_for_code
from backend.services.verdict_service import build_verdict
from backend.services.summaries_service import load_stock_summary, load_stock_summaries
from backend.models.responses import (
    CompanyDetailResponse, CompanyProfile, LatestPrice,
    SignalFlags, DividendDeclaration, RelatedStock,
    MomentumSnapshot, StockVerdict, ValuationContext, SectorContext,
)

router = APIRouter()


@router.get("/api/companies/codes")
def get_all_codes() -> list[str]:
    return load_all_company_codes()


@router.get("/api/news/multi")
def get_multi_news(codes: str):
    code_list = tuple(c.strip().upper() for c in codes.split(",") if c.strip())
    if not code_list:
        return []
    return load_news_for_codes(code_list)


@router.get("/api/news/today")
def get_todays_news():
    """Every story posted on the latest news day, market-wide (falls back to
    the last 7 days when the latest day has nothing). Same shape as the
    dse-today bundle's news list."""
    news = load_market_news(300)
    for n in news:
        tc = (n.get("trading_code") or "").strip()
        n["trading_code"] = tc or "—"
        title = n.get("title")
        n["title"] = (title.strip() if isinstance(title, str) and title.strip() else "Untitled")
    return news


@router.get("/api/summaries/multi")
def get_multi_summaries(codes: str):
    """Cached Bengali 'এক নজরে' one-liners for a set of codes → {code: summary}."""
    # Sorted + deduped so the TTL-cache key is stable regardless of order.
    code_list = tuple(sorted({c.strip().upper() for c in codes.split(",") if c.strip()}))[:100]
    if not code_list:
        return {}
    return load_stock_summaries(code_list)


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

    # Latest shareholding + the snapshot before it (holdings are unique per
    # as_of_date, sorted desc) so the frontend can show who bought/sold.
    shareholding = holdings[0] if holdings else None
    shareholding_prev = holdings[1] if len(holdings) > 1 else None

    # "Usual" volume baseline: mean of the last 7 traded days before the
    # latest one (price_history is sorted asc and already ltp > 0 filtered).
    avg_volume_7d = None
    if len(price_history) > 1:
        prior_vols = [
            float(d["volume"]) for d in price_history[:-1]
            if d.get("volume") and float(d["volume"]) > 0
        ][-7:]
        if prior_vols:
            avg_volume_7d = round(sum(prior_vols) / len(prior_vols))

    # Signal flags
    flags = compute_signal_flags(score_row, holdings, financials, company)

    # Clean score_row NaN
    if score_row:
        score_row = {
            k: (None if isinstance(v, float) and math.isnan(v) else v)
            for k, v in score_row.items()
        }

    def _clean(v):
        if isinstance(v, float) and math.isnan(v):
            return None
        return v

    # Related stocks (same sector, top 5 by score excluding self) + sector context.
    # Both reuse the single scores_df build below — no extra DB work.
    related: list[RelatedStock] = []
    sector_context_model = None
    sector = company.get("sector")
    if sector:
        scores_df = build_scores_df()
        if not scores_df.empty:
            sector_slice = scores_df[scores_df["sector"] == sector]

            # --- Sector context (includes self) -------------------------------
            ranked_sector = sector_slice[sector_slice["score"].notna()].sort_values(
                "score", ascending=False
            ).reset_index(drop=True)
            rank_pos = ranked_sector[ranked_sector["trading_code"] == trading_code].index
            avg_score = ranked_sector["score"].mean() if not ranked_sector.empty else None
            sector_context_model = SectorContext(
                sector=sector,
                peer_count=int(len(sector_slice)),
                rank_in_sector=(int(rank_pos[0]) + 1 if len(rank_pos) else None),
                sector_avg_score=(round(float(avg_score), 1) if avg_score is not None and not math.isnan(avg_score) else None),
                sector_median_pe=_clean(score_row.get("sector_median_pe")) if score_row else None,
            )

            # --- Related stocks (excludes self) -------------------------------
            same_sector = sector_slice[
                sector_slice["trading_code"] != trading_code
            ].sort_values("score", ascending=False, na_position="last").head(5)

            from backend.services.db_service import load_companies
            companies_by_code = {c["trading_code"]: c for c in load_companies()}

            for _, r in same_sector.iterrows():
                rc = r["trading_code"]
                comp = companies_by_code.get(rc, {})
                px = prices.get(rc, {})
                related.append(RelatedStock(
                    trading_code=rc,
                    company_name=comp.get("company_name"),
                    sector=_clean(r.get("sector")),
                    score=_clean(r.get("score")),
                    ltp=_clean(r.get("ltp")),
                    change_pct=_clean(px.get("change_pct")),
                    pe=_clean(r.get("current_pe")),
                    pb=_clean(r.get("current_pb")),
                    div_yield_pct=_clean(r.get("div_yield_pct")),
                    roe_pct=_clean(r.get("roe_pct")),
                    eps_yoy_pct=_clean(r.get("eps_yoy_pct")),
                ))

    # Momentum snapshot + hybrid verdict
    momentum_dict = None
    verdict_dict = None
    try:
        momentum_dict = compute_momentum_for_code(trading_code)
    except Exception:
        momentum_dict = None
    try:
        verdict_dict = build_verdict(score_row, momentum_dict, flags, latest, financials)
    except Exception:
        verdict_dict = None

    momentum_model = MomentumSnapshot(**momentum_dict) if momentum_dict else None
    verdict_model = StockVerdict(**verdict_dict) if verdict_dict else None

    # Valuation context — raw P/E & P/B vs own history vs sector median.
    # sector_implied_price = sector_median_pe × EPS (peer-relative, NOT intrinsic value).
    valuation_model = None
    if score_row:
        v_pe = _clean(score_row.get("current_pe"))
        v_eps = _clean(score_row.get("eps"))
        v_sector_pe = _clean(score_row.get("sector_median_pe"))
        implied = (
            round(v_sector_pe * v_eps, 2)
            if isinstance(v_sector_pe, (int, float)) and isinstance(v_eps, (int, float))
            and v_sector_pe > 0 and v_eps > 0
            else None
        )
        valuation_model = ValuationContext(
            current_pe=v_pe,
            current_pb=_clean(score_row.get("current_pb")),
            own_avg_pe=_clean(score_row.get("own_avg_pe")),
            own_avg_pb=_clean(score_row.get("own_avg_pb")),
            sector_median_pe=v_sector_pe,
            sector_median_pb=_clean(score_row.get("sector_median_pb")),
            eps=v_eps,
            sector_implied_price=implied,
        )

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
            avg_volume_7d=avg_volume_7d,
            ycp=latest.get("ycp"),
            w52_high=w52_high,
            w52_low=w52_low,
        ),
        score_row=score_row,
        signal_flags=SignalFlags(green=flags["green"], red=flags["red"]),
        financials=financials,
        extended_financials=ext_financials,
        shareholding=shareholding,
        shareholding_prev=shareholding_prev,
        dividend_declaration=div_decl_model,
        news=news,
        related_stocks=related,
        momentum=momentum_model,
        verdict=verdict_model,
        valuation=valuation_model,
        sector_context=sector_context_model,
        bengali_summary=load_stock_summary(trading_code),
    )
