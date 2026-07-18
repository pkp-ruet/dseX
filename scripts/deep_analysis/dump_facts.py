"""
Dump a complete per-stock "fact pack" as JSON — the grounded context the
deep-analysis report is written from.

It composes the SAME service calls the stock-detail API uses
(`backend/routers/companies.py:get_company_detail`) — profile, financials,
cash-flow/balance-sheet, a summarised price history + 52-week range, ownership
(+ the prior snapshot), dividends, recent news, the full 5-pillar score row,
momentum, valuation & sector context, the Buy/Sell signal + green/red flags, and
the existing template verdict — and adds two computed extras the report needs:

  * a plain-word **scorecard** (Strong/Okay/Weak) derived deterministically from
    the pillar scores, so the report never invents these words; and
  * a grounded **fair_value** block from ``fair_value.py``.

It also writes a ``source_hash`` over the salient facts so re-runs can skip
unchanged stocks (see ``status.py``).

READ-ONLY: never writes to MongoDB.

Usage (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/dump_facts.py --code GP                 # -> stdout
    py scripts/deep_analysis/dump_facts.py --code GP --out facts     # -> facts/GP.json
    py scripts/deep_analysis/dump_facts.py --codes GP,BRACBANK --out facts
    py scripts/deep_analysis/dump_facts.py --all --out facts
"""
import argparse
import hashlib
import json
import math
import pathlib
import sys
from datetime import date, datetime, timedelta

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parents[1]))  # repo root (scripts/deep_analysis -> repo)
sys.path.insert(0, str(_HERE))             # sibling import of fair_value
try:
    sys.stdout.reconfigure(encoding="utf-8")  # Bengali / box chars on Windows
except Exception:
    pass

from backend.services.db_service import (  # noqa: E402
    get_company, load_companies, load_latest_prices, load_price_history,
    load_financials, load_extended_financials, load_shareholdings,
    load_company_news, load_dividend_declarations, compute_52w_range,
    compute_signal_flags, close_db,
)
from backend.services.scoring_service import get_company_score_row, build_scores_df  # noqa: E402
from backend.services.signal_service import get_signal  # noqa: E402
from backend.services.top20_service import compute_momentum_for_code  # noqa: E402
from backend.services.verdict_service import build_verdict  # noqa: E402
from utils.sector import normalize_sector  # noqa: E402
from fair_value import estimate_fair_value  # noqa: E402

# Keep each news body short so a whole fact pack fits comfortably in an agent's
# context (the full body rarely adds signal beyond the first paragraph).
_NEWS_LIMIT = 15
_NEWS_BODY_CHARS = 500


def _num(v):
    """Real finite number, else None."""
    if isinstance(v, bool) or not isinstance(v, (int, float)):
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _pos(v) -> bool:
    return isinstance(_num(v), (int, float)) and v > 0


def _r(v, n=1):
    v = _num(v)
    return round(v, n) if v is not None else None


def _to_crore(v, base):
    """Convert to crore taka. base='mn' for millions (÷10), 'raw' for raw taka (÷1e7)."""
    v = _num(v)
    if v is None:
        return None
    return v / 10.0 if base == "mn" else v / 1e7


def _rc(c):
    """Round a crore figure for display: whole number when large, else 1–2 dp."""
    c = _num(c)
    if c is None:
        return None
    a = abs(c)
    if a >= 1000:
        return round(c)
    if a >= 10:
        return round(c, 1)
    return round(c, 2)


def _safe(fn, *args):
    try:
        return fn(*args)
    except Exception:
        return None


def _jsonable(obj):
    """Recursively coerce numpy scalars -> native and NaN/Inf -> None (BSON/JSON-safe)."""
    if isinstance(obj, dict):
        return {k: _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_jsonable(v) for v in obj]
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, "item") and not isinstance(obj, (str, bytes)):
        try:
            return _jsonable(obj.item())  # numpy generic
        except Exception:
            return obj
    return obj


# ---------------------------------------------------------------------------
# Plain-word scorecard (deterministic — the report renders these, never invents)
# ---------------------------------------------------------------------------

def _word(v):
    v = _num(v)
    if v is None:
        return ("Not rated", "যাচাই হয়নি")
    if v >= 7:
        return ("Strong", "শক্তিশালী")
    if v >= 4:
        return ("Okay", "মোটামুটি")
    return ("Weak", "দুর্বল")


def _value_word(v):
    v = _num(v)
    if v is None:
        return ("Not rated", "যাচাই হয়নি")
    if v >= 7:
        return ("Good value", "দাম সস্তা")
    if v >= 5:
        return ("Fairly priced", "দাম যুক্তিসঙ্গত")
    if v >= 4:
        return ("Leaning pricey", "দাম একটু বেশি")
    return ("Pricey", "দাম চড়া")


_SCORECARD_AREAS = [
    ("profit", "Profit", "মুনাফা", "p1_biz"),
    ("safety", "Safety", "আর্থিক ভিত", "p2_health"),
    ("business", "Business", "ব্যবসার শক্তি", "p3_moat"),
    ("value", "Price value", "দামের যৌক্তিকতা", "p4_val"),
    ("dividend", "Dividend", "ডিভিডেন্ড", "p5_div"),
]


def _scorecard(score_row):
    if not score_row:
        return []
    out = []
    for key, label_en, label_bn, field in _SCORECARD_AREAS:
        v = _num(score_row.get(field))
        word_en, word_bn = (_value_word(v) if key == "value" else _word(v))
        out.append({
            "key": key, "label_en": label_en, "label_bn": label_bn,
            "word_en": word_en, "word_bn": word_bn,
            "score10": _r(v, 1),
        })
    return out


# ---------------------------------------------------------------------------
# Price trend summary (returns + monthly closes; never the full daily series)
# ---------------------------------------------------------------------------

def _parse_date(s):
    try:
        return datetime.fromisoformat(str(s)[:19])
    except Exception:
        return None


def _price_trend(history, momentum, ltp, w52_high, w52_low):
    pts = [(d.get("date"), _num(d.get("ltp"))) for d in (history or [])
           if d.get("date") and _num(d.get("ltp"))]
    trend = {"returns": {}, "monthly_closes": []}
    if not pts:
        return trend
    latest_date, latest_ltp = pts[-1]
    latest_dt = _parse_date(latest_date)

    def ret(days):
        if not latest_dt:
            return None
        cutoff = latest_dt - timedelta(days=days)
        prior = None
        for ds, lt in pts:
            dd = _parse_date(ds)
            if dd and dd <= cutoff:
                prior = lt
        if prior and prior > 0:
            return round((latest_ltp - prior) / prior * 100, 1)
        return None

    trend["returns"] = {"m1": ret(30), "m3": ret(90), "m6": ret(180), "y1": ret(365)}

    # Last close of each calendar month, capped to the last ~24 months.
    monthly = {}
    for ds, lt in pts:
        dd = _parse_date(ds)
        if dd:
            monthly[(dd.year, dd.month)] = {"date": str(ds)[:10], "close": lt}
    trend["monthly_closes"] = [monthly[k] for k in sorted(monthly)][-24:]

    pct = (momentum or {}).get("pct_in_52w_range")
    if pct is None and _pos(ltp) and _pos(w52_high) and _pos(w52_low) and w52_high > w52_low:
        pct = round((ltp - w52_low) / (w52_high - w52_low) * 100, 1)
    trend["pct_in_52w_range"] = pct
    return trend


# ---------------------------------------------------------------------------
# Sector context + peer set (mirrors the detail router)
# ---------------------------------------------------------------------------

def _sector_bits(scores_df, code, sector, score_row, prices, companies_by_code):
    related, sector_context = [], None
    if not sector or scores_df is None or scores_df.empty:
        return related, sector_context
    sl = scores_df[scores_df["sector"] == sector]
    if sl.empty:
        return related, sector_context
    ranked = sl[sl["score"].notna()].sort_values("score", ascending=False).reset_index(drop=True)
    rank_pos = ranked[ranked["trading_code"] == code].index
    avg = ranked["score"].mean() if not ranked.empty else None
    sector_context = {
        "sector": sector,
        "peer_count": int(len(sl)),
        "rank_in_sector": int(rank_pos[0]) + 1 if len(rank_pos) else None,
        "sector_avg_score": _r(float(avg), 1) if avg is not None and not math.isnan(avg) else None,
        "sector_median_pe": (score_row or {}).get("sector_median_pe"),
    }
    same = sl[sl["trading_code"] != code].sort_values(
        "score", ascending=False, na_position="last"
    ).head(5)
    for _, r in same.iterrows():
        rc = r["trading_code"]
        comp = companies_by_code.get(rc, {})
        px = prices.get(rc, {})
        related.append({
            "trading_code": rc,
            "company_name": comp.get("company_name"),
            "sector": r.get("sector"),
            "score": r.get("score"),
            "ltp": r.get("ltp"),
            "change_pct": px.get("change_pct"),
            "pe": r.get("current_pe"),
            "pb": r.get("current_pb"),
            "div_yield_pct": r.get("div_yield_pct"),
            "roe_pct": r.get("roe_pct"),
            "eps_yoy_pct": r.get("eps_yoy_pct"),
        })
    return related, sector_context


def _avg_volume_7d(history):
    if not history or len(history) < 2:
        return None
    prior = [float(d["volume"]) for d in history[:-1]
             if _pos(d.get("volume"))][-7:]
    return round(sum(prior) / len(prior)) if prior else None


# ---------------------------------------------------------------------------
# figures — every key number PRE-CONVERTED to crore taka / taka-per-share and
# rounded, so the report copies them instead of doing (error-prone) arithmetic
# on raw taka. Only unambiguous absolute figures + clean ratios are exposed;
# margin %s are deliberately omitted because the scraped `revenue` line is not a
# clean gross-sales base for every sector.
# ---------------------------------------------------------------------------

def _figures(financials, ext, company, shareholding):
    by_year: dict = {}

    for row in (financials or []):
        y = row.get("year")
        if y is None:
            continue
        d = by_year.setdefault(y, {"year": y})
        d["eps_taka"] = _r(row.get("eps"), 2)
        d["net_profit_crore"] = _rc(_to_crore(row.get("profit_mn"), "mn"))
        d["cash_dividend_pct"] = _r(row.get("cash_dividend_pct"), 1)
        d["stock_dividend_pct"] = _r(row.get("stock_dividend_pct"), 1)
        d["dps_taka"] = _r(row.get("dps"), 2)
        d["nav_per_share_taka"] = _r(row.get("nav_per_share"), 2)

    for row in (ext or []):
        y = row.get("year")
        if y is None:
            continue
        d = by_year.setdefault(y, {"year": y})
        d["revenue_crore"] = _rc(_to_crore(row.get("revenue"), "raw"))
        d["operating_profit_crore"] = _rc(_to_crore(row.get("ebit"), "raw"))  # EBIT
        d["operating_cash_flow_crore"] = _rc(_to_crore(row.get("operating_cf"), "raw"))
        capex = row.get("capex")
        d["capex_crore"] = _rc(_to_crore(abs(capex) if _num(capex) is not None else None, "raw"))
        d["total_debt_crore"] = _rc(_to_crore(row.get("total_debt"), "raw"))
        d["total_equity_crore"] = _rc(_to_crore(row.get("total_equity"), "raw"))
        d["total_assets_crore"] = _rc(_to_crore(row.get("total_assets"), "raw"))
        d["cash_crore"] = _rc(_to_crore(row.get("cash_and_equivalents"), "raw"))
        # Debt-to-equity is a clean, sector-neutral ratio (computed from raw to avoid rounding drift).
        teq, tdebt = _num(row.get("total_equity")), _num(row.get("total_debt"))
        if teq and teq > 0 and tdebt is not None:
            d["debt_to_equity"] = _r(tdebt / teq, 2)

    per_year = [by_year[y] for y in sorted(by_year)]
    latest = per_year[-1] if per_year else None

    growth: dict = {}
    if len(per_year) >= 2:
        first = per_year[0]

        def _chg(key):
            a, b = _num(first.get(key)), _num(latest.get(key))
            if a is not None and b is not None and a != 0:
                return _r((b - a) / abs(a) * 100, 0)
            return None

        growth = {
            "span": f"{first['year']}–{latest['year']}",
            "net_profit_change_pct": _chg("net_profit_crore"),
            "eps_change_pct": _chg("eps_taka"),
            "revenue_change_pct": _chg("revenue_crore"),
        }

    company = company or {}
    profile = {
        "face_value_taka": _r(company.get("face_value"), 2),
        "shares_crore": _rc(_to_crore(company.get("total_shares"), "raw")),  # count, in crore
        "paid_up_capital_crore": _rc(_to_crore(company.get("paid_up_capital_mn"), "mn")),
        "reserve_surplus_crore": _rc(_to_crore(company.get("reserve_surplus_mn"), "mn")),
        "total_loan_crore": _rc(_to_crore(company.get("total_loan_mn"), "mn")),
        "listing_year": company.get("listing_year"),
    }

    sh = shareholding or {}
    ownership = {
        "sponsor_director_pct": _r(sh.get("sponsor_director_pct"), 2),
        "govt_pct": _r(sh.get("govt_pct"), 2),
        "institute_pct": _r(sh.get("institute_pct"), 2),
        "foreign_pct": _r(sh.get("foreign_pct"), 2),
        "public_pct": _r(sh.get("public_pct"), 2),
    }

    return {
        "units_note": (
            "All *_crore values are crore taka (1 crore = 10,000,000 taka); *_taka values are "
            "taka per share; *_pct are percentages. These are already converted and rounded — "
            "QUOTE THEM DIRECTLY and do NOT convert the raw financials/extended_financials yourself."
        ),
        "per_year": per_year,
        "latest": latest,
        "growth": growth,
        "profile": profile,
        "ownership": ownership,
    }


# ---------------------------------------------------------------------------
# Source hash (cost gate) — over the salient facts only
# ---------------------------------------------------------------------------

def compute_source_hash(pack: dict) -> str:
    sr = pack.get("score") or {}
    fv = pack.get("fair_value") or {}
    news = pack.get("news") or []
    salient = {
        "score": _r(sr.get("score"), 0),
        "p1": _r(sr.get("p1_biz")), "p2": _r(sr.get("p2_health")),
        "p3": _r(sr.get("p3_moat")), "p4": _r(sr.get("p4_val")), "p5": _r(sr.get("p5_div")),
        "pe": _r(sr.get("current_pe")), "pb": _r(sr.get("current_pb")),
        "eps": _r(sr.get("eps"), 2), "eps_yoy": _r(sr.get("eps_yoy_pct"), 0),
        "div_yield": _r(sr.get("div_yield_pct")),
        "fv_low": fv.get("low"), "fv_high": fv.get("high"), "fv_stance": fv.get("stance"),
        "last_year": sr.get("last_reported_year"),
        "stale": bool(sr.get("stale_data")),
        "latest_news": news[0].get("post_date") if news else None,
    }
    blob = json.dumps(salient, sort_keys=True, ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Fact pack builder
# ---------------------------------------------------------------------------

def build_fact_pack(code, scores_df=None, companies_by_code=None, prices=None):
    """Assemble the full fact pack for one code, or None if the company is
    missing / excluded. Pass shared ``scores_df`` / ``companies_by_code`` /
    ``prices`` when iterating many codes to avoid rebuilding them each time."""
    code = code.strip().upper()
    company = get_company(code)
    if not company:
        return None

    if prices is None:
        prices = load_latest_prices()
    if scores_df is None:
        scores_df = build_scores_df()
    if companies_by_code is None:
        companies_by_code = {c["trading_code"]: c for c in load_companies()}

    latest = prices.get(code, {})
    ltp = latest.get("ltp")
    history = load_price_history(code)
    w52_high, w52_low = compute_52w_range(history)
    financials = load_financials(code)
    ext = load_extended_financials(code)
    holdings = load_shareholdings(code)
    news = load_company_news(code, limit=_NEWS_LIMIT)
    for n in news:
        b = n.get("body")
        if isinstance(b, str) and len(b) > _NEWS_BODY_CHARS:
            n["body"] = b[:_NEWS_BODY_CHARS] + "…"
    div_decl = next(
        (d for d in load_dividend_declarations() if d.get("trading_code") == code), None
    )

    score_row = get_company_score_row(code)
    flags = compute_signal_flags(score_row, holdings, financials, company)
    momentum = _safe(compute_momentum_for_code, code)
    verdict = _safe(build_verdict, score_row, momentum, flags, latest, financials)
    signal = _safe(get_signal, code)

    sector = company.get("sector")
    sector_class = normalize_sector(sector or "")
    related, sector_context = _sector_bits(
        scores_df, code, sector, score_row, prices, companies_by_code
    )
    fair_value = _safe(estimate_fair_value, score_row, financials, company, ltp, sector_class)

    # Valuation context (same derivation as the detail router).
    valuation = None
    if score_row:
        eps = _num(score_row.get("eps"))
        s_pe = _num(score_row.get("sector_median_pe"))
        implied = round(s_pe * eps, 2) if (_pos(s_pe) and _pos(eps)) else None
        valuation = {
            "current_pe": score_row.get("current_pe"),
            "current_pb": score_row.get("current_pb"),
            "own_avg_pe": score_row.get("own_avg_pe"),
            "own_avg_pb": score_row.get("own_avg_pb"),
            "sector_median_pe": score_row.get("sector_median_pe"),
            "sector_median_pb": score_row.get("sector_median_pb"),
            "eps": score_row.get("eps"),
            "sector_implied_price": implied,
        }

    pack = {
        "trading_code": code,
        "company_name": company.get("company_name"),
        "sector_class": sector_class,
        "as_of_price_date": latest.get("date"),
        "profile": {
            "sector": sector,
            "market_category": company.get("market_category"),
            "face_value": company.get("face_value"),
            "total_shares": company.get("total_shares"),
            "paid_up_capital_mn": company.get("paid_up_capital_mn"),
            "reserve_surplus_mn": company.get("reserve_surplus_mn"),
            "total_loan_mn": company.get("total_loan_mn"),
            "listing_year": company.get("listing_year"),
            "instrument_type": company.get("instrument_type"),
        },
        "price": {
            "ltp": ltp,
            "change": latest.get("change"),
            "change_pct": latest.get("change_pct"),
            "date": latest.get("date"),
            "high": latest.get("high"),
            "low": latest.get("low"),
            "volume": latest.get("volume"),
            "avg_volume_7d": _avg_volume_7d(history),
            "ycp": latest.get("ycp"),
            "w52_high": w52_high,
            "w52_low": w52_low,
        },
        "price_trend": _price_trend(history, momentum, ltp, w52_high, w52_low),
        "scorecard": _scorecard(score_row),
        "fair_value": fair_value,
        "valuation": valuation,
        "figures": _figures(financials, ext, company, holdings[0] if holdings else None),
        "sector_context": sector_context,
        "score": score_row,
        "signal": signal,
        "signal_flags": flags,
        "verdict": verdict,
        "momentum": momentum,
        "financials": financials,
        "extended_financials": ext,
        "shareholding": holdings[0] if holdings else None,
        "shareholding_prev": holdings[1] if len(holdings) > 1 else None,
        "dividend_declaration": div_decl,
        "news": news,
        "peers": related,
    }
    pack = _jsonable(pack)
    pack["source_hash"] = compute_source_hash(pack)
    return pack


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _resolve_codes(args) -> list[str]:
    if args.all:
        from backend.services.db_service import load_all_company_codes
        return load_all_company_codes()
    if args.codes:
        return [c.strip().upper() for c in args.codes.split(",") if c.strip()]
    if args.code:
        return [args.code.strip().upper()]
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Dump per-stock fact packs as JSON.")
    parser.add_argument("--code", help="Single trading code, e.g. GP")
    parser.add_argument("--codes", help="Comma-separated codes, e.g. GP,BRACBANK")
    parser.add_argument("--all", action="store_true", help="Every non-excluded company")
    parser.add_argument("--out", help="Output directory (writes <CODE>.json). Omit to print to stdout.")
    args = parser.parse_args()

    codes = _resolve_codes(args)
    if not codes:
        parser.error("give --code, --codes, or --all")

    out_dir = None
    if args.out:
        out_dir = pathlib.Path(args.out)
        out_dir.mkdir(parents=True, exist_ok=True)

    # Build shared inputs once for a multi-code run.
    scores_df = build_scores_df()
    companies_by_code = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    ok = failed = 0
    for code in codes:
        try:
            pack = build_fact_pack(code, scores_df, companies_by_code, prices)
        except Exception as e:
            failed += 1
            print(f"[{code}] FAILED: {e}", file=sys.stderr)
            continue
        if pack is None:
            failed += 1
            print(f"[{code}] not found or excluded", file=sys.stderr)
            continue
        text = json.dumps(pack, indent=2, ensure_ascii=False)
        if out_dir:
            (out_dir / f"{code}.json").write_text(text, encoding="utf-8")
            print(f"[{code}] wrote {out_dir / f'{code}.json'}")
        else:
            print(text)
        ok += 1

    if out_dir:
        print(f"\nDone: {ok} written, {failed} failed.", file=sys.stderr)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        close_db()
