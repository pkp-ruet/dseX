import math
from fastapi import APIRouter, HTTPException
from backend.services.db_service import (
    get_company, load_latest_prices, load_price_history,
    load_financials, load_extended_financials, load_shareholdings,
    load_company_news, load_dividend_declarations, load_all_company_codes,
    compute_52w_range, compute_signal_flags, load_news_for_codes,
    load_market_news, load_corporate_actions, adjust_price_rows,
)
from backend.services.stock_facts import (
    ownership_caption, ownership_change, health_overrides, valuation_verdict,
    eps_basis_label, own_pe_label,
)
from backend.services.sub_industry import sub_industry, peer_group_key, peer_note
from utils.sector import normalize_sector
from backend.services.scoring_service import get_company_score_row, build_scores_df
from backend.services.signal_service import get_signal, wire_fields
from backend.services.top20_service import compute_momentum_for_code
from backend.services.verdict_service import build_verdict
from backend.services.summaries_service import load_stock_summary, load_stock_summaries
from backend.services.deep_analysis_service import (
    load_report, report_teaser, list_report_codes, compute_fair_value,
)
from backend.models.responses import (
    CompanyDetailResponse, CompanyProfile, LatestPrice,
    SignalFlags, DividendDeclaration, RelatedStock,
    MomentumSnapshot, StockVerdict, StockSignal, ValuationContext, SectorContext,
    FairValue, DeepAnalysisTeaser, DeepAnalysisReport, DeepAnalysisResponse,
)

router = APIRouter()


def _int_or_none(v):
    """DSE scrapes some integers as strings / floats — coerce, else None."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if math.isnan(f):
        return None
    return int(f)


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
    # 52-week range on prices adjusted for dividend / bonus record dates.
    w52_high, w52_low = compute_52w_range(
        adjust_price_rows(price_history, load_corporate_actions().get(trading_code, [])))

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

    # Signal flags — a year of news for the governance scan (the page shows 20).
    sector_class = normalize_sector(company.get("sector") or "")
    flags = compute_signal_flags(score_row, holdings, financials, company,
                                 load_company_news(trading_code, limit=200))

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

    def _month_year(raw):
        """Shareholding 'Jun 30, 2025' -> ('Jun 2025', 'জুন 2025')."""
        from datetime import datetime as _dt
        from backend.services.interim_service import _MONTH_ABBR, _MONTH_BN
        text = str(raw or "").strip()
        for fmt, part in (("%b %d, %Y", text), ("%B %d, %Y", text), ("%Y-%m-%d", text[:10])):
            try:
                d = _dt.strptime(part, fmt)
            except ValueError:
                continue
            return f"{_MONTH_ABBR[d.month]} {d.year}", f"{_MONTH_BN[d.month]} {d.year}"
        return None, None

    # Ownership read (bilingual) — who controls the company + who moved.
    ownership = None
    if shareholding:
        since_en, since_bn = _month_year((shareholding_prev or {}).get("as_of_date"))
        ownership = {
            "caption": ownership_caption(shareholding),
            "change": ownership_change(shareholding, shareholding_prev, since_en, since_bn),
        }
    overrides = health_overrides(score_row or {}, financials, sector_class)

    # Related stocks (same sector, top 5 by score excluding self) + sector context.
    # Both reuse the single scores_df build below — no extra DB work.
    related: list[RelatedStock] = []
    sector_context_model = None
    peer_note_model = None
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
            # Narrowed to the sub-industry when one is set and has peers
            # (services/sub_industry.py), else the whole DSE sector + a note.
            others = sector_slice[sector_slice["trading_code"] != trading_code]
            group = peer_group_key(trading_code, sector)
            same_group = others[others["trading_code"].map(lambda c: peer_group_key(c, sector)) == group]
            peer_note_model = peer_note(trading_code, sector, int(len(same_group)))
            pool = same_group if len(same_group) else others
            same_sector = pool.sort_values("score", ascending=False, na_position="last").head(5)

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
                    sub_industry=sub_industry(rc),
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

    # Canonical Buy/Sell signal (else none) — attached by the router (single source;
    # the verdict stays purely descriptive so the two can never disagree).
    try:
        signal_model = StockSignal(**wire_fields(get_signal(trading_code)))
    except Exception:
        signal_model = None

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
            eps_basis=eps_basis_label(score_row),
            own_avg_pe_label=own_pe_label(score_row.get("own_avg_pe_years"),
                                          score_row.get("listing_year"),
                                          score_row.get("fy_eps_year")),
            verdict=valuation_verdict(score_row.get("p4_val")),
        )

    # Live "value today" box + deep-analysis teaser. Both are best-effort — a
    # failure here must never break the whole detail response. The full report
    # is intentionally NOT included; the /analysis sub-page fetches it.
    fair_value_model = None
    try:
        fv = compute_fair_value(trading_code)
        fair_value_model = FairValue(**fv) if fv else None
    except Exception:
        fair_value_model = None

    deep_analysis_model = None
    try:
        teaser = report_teaser(trading_code)
        deep_analysis_model = DeepAnalysisTeaser(**teaser) if teaser else None
    except Exception:
        deep_analysis_model = None

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
            listing_year=_int_or_none(company.get("listing_year")),
            market_lot=_int_or_none(company.get("market_lot")),
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
            value_mn=latest.get("value_mn"),
            trade_count=_int_or_none(latest.get("trade_count")),
        ),
        score_row=score_row,
        signal_flags=SignalFlags(green=flags["green"], red=flags["red"], items=flags.get("items", [])),
        financials=financials,
        extended_financials=ext_financials,
        shareholding=shareholding,
        shareholding_prev=shareholding_prev,
        dividend_declaration=div_decl_model,
        news=news,
        related_stocks=related,
        momentum=momentum_model,
        verdict=verdict_model,
        signal=signal_model,
        valuation=valuation_model,
        sector_context=sector_context_model,
        bengali_summary=load_stock_summary(trading_code),
        fair_value=fair_value_model,
        deep_analysis=deep_analysis_model,
        ownership=ownership,
        health_overrides=overrides,
        peer_note=peer_note_model,
    )


@router.get("/api/deep-analysis/codes")
def get_deep_analysis_codes() -> list[str]:
    """Every trading code that has a deep-analysis report (for sitemap / static params)."""
    return list_report_codes()


@router.get("/api/company/{code}/analysis", response_model=DeepAnalysisResponse)
def get_company_analysis(code: str):
    """Full durable narrative for one code + the live value box beside it.

    404 when no report has been written for the code yet (the frontend hides the
    sub-page and its teaser in that case)."""
    report = load_report(code)
    if not report:
        raise HTTPException(status_code=404, detail=f"No deep analysis for '{code}'")

    fair_value_model = None
    try:
        fv = compute_fair_value(report["trading_code"])
        fair_value_model = FairValue(**fv) if fv else None
    except Exception:
        fair_value_model = None

    return DeepAnalysisResponse(
        report=DeepAnalysisReport(**report),
        fair_value=fair_value_model,
    )
