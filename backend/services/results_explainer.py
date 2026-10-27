"""
Results day, explained — a company's latest quarterly report in plain words.

DSE posts every Q1/Q2/Q3 result in one fixed template (parsed by
``interim_service``). The bare post says "EPS was Tk. 2.10 … as against Tk.
1.80"; this module says what that means for someone holding the share:

    headline   "Q2 results: profit up 17% on last year"
    lines      profit so far this year · the latest quarter on its own ·
               cash from the business · what the price now costs against the
               last 12 months' profit · how our score moved since the report
    meaning    one sentence: better, worse, or a mix — and what to check

Built from figures we already hold — nothing is forecast. The pure builder is
``explain``; ``company_results`` does the reads for the stock page, and
``portfolio_watch`` turns it into the results-day push.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Optional

from backend.services.db_service import _ttl_cache
from backend.services.interim_service import _MONTH_ABBR, _MONTH_BN, pct_change
from backend.services.tiers import TIER_WORDS, TIER_WORDS_BN, tier_key

# Same line the signal draws: a fall this big is the value-trap guard.
BIG_DROP_PCT = -25.0
MOVE_PCT = 10.0
# Lenders and insurers: operating cash swings with deposits, loans and claims,
# so a negative figure says nothing about the business (scoring ignores it too).
_CASH_NOT_MEANINGFUL = {"BANK", "NBFI", "INSURANCE"}


def _n(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f


def _tk(v: float) -> str:
    return f"−৳{abs(v):,.2f}" if v < 0 else f"৳{v:,.2f}"


def _x(v: float) -> str:
    s = f"{v:.1f}".rstrip("0").rstrip(".")
    return s


def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if isinstance(v, (date, datetime)):
        return v.isoformat()[:10]
    return str(v)[:10] or None


def _period(interim: dict) -> tuple[str, str]:
    end = interim.get("period_end")
    if isinstance(end, str):
        try:
            end = date.fromisoformat(end[:10])
        except ValueError:
            end = None
    months = int(interim.get("months") or 3)
    if not isinstance(end, date):
        return f"{months} months", f"{months} মাস"
    return (f"the {months} months to {_MONTH_ABBR[end.month]} {end.year}",
            f"{_MONTH_BN[end.month]} {end.year} পর্যন্ত {months} মাসে")


def _move_words(pct: Optional[float], cur: float, prev: float) -> tuple[str, str]:
    """'up 17%' / 'down 5%' / 'about the same' / 'turned to a loss' …"""
    if prev <= 0 < cur:
        return "back to a profit", "আবার মুনাফায় ফিরেছে"
    if cur < 0 <= prev:
        return "turned to a loss", "লোকসানে পড়েছে"
    if cur < 0 and prev < 0:
        return ("a smaller loss", "লোকসান কমেছে") if cur > prev else ("a bigger loss", "লোকসান বেড়েছে")
    if pct is None:
        return "no comparison", "তুলনা নেই"
    if abs(pct) < 3:
        return "about the same", "প্রায় আগের মতোই"
    return (f"up {abs(pct):.0f}%", f"{abs(pct):.0f}% বেশি") if pct > 0 else (f"down {abs(pct):.0f}%", f"{abs(pct):.0f}% কম")


def explain(interim: dict, row: Optional[dict] = None, score_before: Optional[float] = None,
            sector_class: str = "GENERAL") -> Optional[dict]:
    """The explainer for one company's latest quarterly report.

    ``interim`` = an ``interim_service`` record (raw or ``interim_facts``
    shape — both carry eps_cum / eps_cum_prev / eps_q / eps_q_prev /
    nocfps_cum / nocfps_cum_prev / months / quarter / period_end).
    ``row`` = the company's score row (ltp, eps, eps_basis, fy_eps, score).
    Returns None when the report can't be read."""
    row = row or {}
    cur, prev = _n(interim.get("eps_cum")), _n(interim.get("eps_cum_prev"))
    if cur is None or prev is None:
        return None
    months = int(interim.get("months") or 3)
    quarter = interim.get("quarter")
    per_en, per_bn = _period(interim)
    pct = pct_change(cur, prev)
    move_en, move_bn = _move_words(pct, cur, prev)

    lines: list[dict] = []
    tone = "good" if (pct or 0) >= MOVE_PCT or (prev <= 0 < cur) else \
        "bad" if (pct or 0) <= -MOVE_PCT or cur < 0 else "neutral"
    lines.append({
        "key": "profit", "tone": tone,
        "en": f"Profit in {per_en} was {_tk(cur)} a share, compared with {_tk(prev)} a year earlier ({move_en}).",
        "bn": f"{per_bn} শেয়ারপ্রতি মুনাফা {_tk(cur)}, এক বছর আগে ছিল {_tk(prev)} ({move_bn})।",
    })

    # The latest quarter on its own (only when the year-to-date covers more).
    q, qp = _n(interim.get("eps_q")), _n(interim.get("eps_q_prev"))
    q_pct = pct_change(q, qp) if months > 3 else None
    if months > 3 and q is not None and qp is not None:
        q_en, q_bn = _move_words(q_pct, q, qp)
        q_tone = "good" if (q_pct or 0) >= MOVE_PCT else "bad" if (q_pct or 0) <= -MOVE_PCT or q < 0 else "neutral"
        lines.append({
            "key": "quarter", "tone": q_tone,
            "en": f"In the latest 3 months alone, it was {_tk(q)} a share, compared with {_tk(qp)} ({q_en}).",
            "bn": f"শুধু সর্বশেষ 3 মাসে শেয়ারপ্রতি মুনাফা {_tk(q)}, এক বছর আগে ছিল {_tk(qp)} ({q_bn})।",
        })

    # Cash from the business.
    nocf, nocf_prev = _n(interim.get("nocfps_cum")), _n(interim.get("nocfps_cum_prev"))
    cash_bad = False
    if nocf is not None and sector_class not in _CASH_NOT_MEANINGFUL:
        prev_en = f" ({_tk(nocf_prev)} a year earlier)" if nocf_prev is not None else ""
        prev_bn = f" (এক বছর আগে {_tk(nocf_prev)})" if nocf_prev is not None else ""
        if nocf < 0:
            cash_bad = True
            lines.append({
                "key": "cash", "tone": "bad",
                "en": f"The business spent more cash than it brought in: {_tk(nocf)} a share{prev_en}.",
                "bn": f"ব্যবসায় যত নগদ এসেছে তার চেয়ে বেশি খরচ হয়েছে: শেয়ারপ্রতি {_tk(nocf)}{prev_bn}।",
            })
        else:
            lines.append({
                "key": "cash", "tone": "good" if cur > 0 and nocf >= cur * 0.8 else "neutral",
                "en": f"Cash from the business so far: {_tk(nocf)} a share{prev_en}.",
                "bn": f"এ পর্যন্ত ব্যবসা থেকে নগদ এসেছে শেয়ারপ্রতি {_tk(nocf)}{prev_bn}।",
            })

    # What the price costs now, on the last 12 months' profit.
    ltp, eps, fy_eps = _n(row.get("ltp")), _n(row.get("eps")), _n(row.get("fy_eps"))
    if ltp and eps is not None and row.get("eps_basis") == "ttm":
        if eps > 0:
            pe = ltp / eps
            fy_bit_en = fy_bit_bn = ""
            if fy_eps and fy_eps > 0 and abs(ltp / fy_eps - pe) >= 0.5:
                fy_bit_en = f" ({_x(ltp / fy_eps)}× on last year's audited profit)"
                fy_bit_bn = f" (গত বছরের নিরীক্ষিত মুনাফায় {_x(ltp / fy_eps)} গুণ)"
            lines.append({
                "key": "price", "tone": "neutral",
                "en": f"At today's price of ৳{ltp:,.1f}, the share costs {_x(pe)}× its profit over the last 12 months{fy_bit_en}.",
                "bn": f"আজকের ৳{ltp:,.1f} দামে শেয়ারটির দাম গত 12 মাসের মুনাফার {_x(pe)} গুণ{fy_bit_bn}।",
            })
        else:
            lines.append({
                "key": "price", "tone": "bad",
                "en": "It made a loss over the last 12 months, so the price cannot be compared with profit.",
                "bn": "গত 12 মাসে লোকসান হয়েছে, তাই মুনাফার সঙ্গে দাম তুলনা করা যায় না।",
            })

    # How our score moved since the report.
    s_now = _n(row.get("score"))
    if s_now is not None:
        t_en, t_bn = TIER_WORDS.get(tier_key(s_now)), TIER_WORDS_BN.get(tier_key(s_now))
        if score_before is not None and abs(s_now - score_before) >= 0.5:
            up = s_now > score_before
            lines.append({
                "key": "score", "tone": "good" if up else "bad",
                "en": f"Since the report came out, our score has moved from {score_before:.0f} to {s_now:.0f} ({t_en}).",
                "bn": f"প্রতিবেদন প্রকাশের পর আমাদের স্কোর {score_before:.0f} থেকে {s_now:.0f} ({t_bn}) হয়েছে।",
            })
        else:
            lines.append({
                "key": "score", "tone": "neutral",
                "en": f"Our score is {s_now:.0f}/100 ({t_en}).",
                "bn": f"আমাদের স্কোর {s_now:.0f}/100 ({t_bn})।",
            })

    # One sentence on what it means.
    if cur < 0:
        level = "bad"
        m_en = "The company is making a loss this year. It is wise to be careful until profit returns."
        m_bn = "এ বছর কোম্পানিটি লোকসানে আছে। মুনাফায় না ফেরা পর্যন্ত সাবধান থাকাই ভালো।"
    elif pct is not None and pct <= BIG_DROP_PCT:
        level = "bad"
        m_en = "Profit fell by a quarter or more. Our Buy rules hold off on a share like this until profit recovers."
        m_bn = "মুনাফা এক-চতুর্থাংশ বা তার বেশি কমেছে। মুনাফা না ফেরা পর্যন্ত আমাদের নিয়মে এমন শেয়ারে কেনার সংকেত দেওয়া হয় না।"
    elif (pct is not None and pct >= MOVE_PCT) or prev <= 0 < cur:
        if cash_bad:
            level = "watch"
            m_en = "Profit is up, but the cash didn't come in. It is worth checking whether customers are paying on time."
            m_bn = "মুনাফা বেড়েছে, তবে নগদ আসেনি। ক্রেতারা সময়মতো টাকা দিচ্ছেন কি না, তা দেখে নেওয়া ভালো।"
        else:
            level = "good"
            m_en = "The business is doing better than a year ago."
            m_bn = "এক বছর আগের চেয়ে ব্যবসা ভালো চলছে।"
        if q_pct is not None and q_pct <= -MOVE_PCT:
            level = "watch"
            m_en += " However, the latest quarter was slower, so the next report is worth watching."
            m_bn += " তবে সর্বশেষ প্রান্তিকে গতি কমেছে, তাই পরের প্রতিবেদনের দিকে নজর রাখা ভালো।"
    elif pct is not None and pct <= -MOVE_PCT:
        level = "watch"
        m_en = "Profit is lower than last year. The next report is worth watching."
        m_bn = "মুনাফা গত বছরের চেয়ে কম। পরের প্রতিবেদনের দিকে নজর রাখা ভালো।"
    else:
        level = "watch" if cash_bad else "neutral"
        m_en = "Profit is about the same as a year ago."
        m_bn = "মুনাফা এক বছর আগের মতোই আছে।"
        if cash_bad:
            m_en += " The cash going out is the thing to watch."
            m_bn += " নগদ বেরিয়ে যাওয়ার দিকটি নজরে রাখার মতো।"

    q_label = f"Q{quarter}" if quarter else f"{months}-month"
    q_label_bn = f"Q{quarter}" if quarter else f"{months} মাসের"
    if move_en.startswith(("up", "down")):
        head_en, head_bn = f"profit {move_en} on last year", f"মুনাফা আগের বছরের চেয়ে {move_bn}"
    elif move_en == "about the same":
        head_en, head_bn = "profit about the same as last year", f"মুনাফা {move_bn}"
    elif move_en.startswith("a "):
        head_en, head_bn = f"{move_en} than last year", move_bn
    else:
        head_en, head_bn = move_en, move_bn
    return {
        "quarter": quarter, "months": months,
        "period_end": _iso(interim.get("period_end")),
        "post_date": _iso(interim.get("post_date")),
        "period_en": per_en, "period_bn": per_bn,
        "eps_cum": cur, "eps_cum_prev": prev, "eps_yoy_pct": pct, "eps_q_yoy_pct": q_pct,
        "level": level,
        "headline_en": f"{q_label} results: {head_en}",
        "headline_bn": f"{q_label_bn} ফল: {head_bn}",
        "lines": lines,
        "meaning_en": m_en, "meaning_bn": m_bn,
    }


def company_results(code: str, score_row: Optional[dict], sector_class: str = "GENERAL") -> Optional[dict]:
    """The stock page's explainer — only while the report is the newest word
    on the company (the score row carries ``interim_*`` only then)."""
    if not score_row or not score_row.get("interim_label_en"):
        return None
    from backend.services.interim_service import load_interims
    from backend.services.score_history_service import score_before

    rec = load_interims([code]).get(code)
    if not rec:
        return None
    post = _iso(rec.get("post_date"))
    before = score_before(code, post) if post else None
    return explain(rec, score_row, before, sector_class)


# ---------------------------------------------------------------------------
# Every company's latest report — the /results page and the dashboard card
# ---------------------------------------------------------------------------

def feed_row(code: str, ex: dict, comp: dict, price: dict, score: Optional[float]) -> dict:
    """One row of the market-wide feed. Carries the free part of the explainer
    only (headline + the profit line); the rest stays on the stock page,
    behind its lock."""
    profit = next((l for l in ex["lines"] if l["key"] == "profit"), None) or {}
    return {
        "code": code,
        "name": comp.get("company_name") or code,
        "sector": comp.get("sector"),
        "price": _n(price.get("ltp")),
        "change_pct": _n(price.get("change_pct")),
        "score": score,
        "post_date": ex["post_date"],
        "quarter": ex["quarter"],
        "months": ex["months"],
        "period_end": ex["period_end"],
        "level": ex["level"],
        "eps_yoy_pct": ex["eps_yoy_pct"],
        "headline_en": ex["headline_en"],
        "headline_bn": ex["headline_bn"],
        "profit_en": profit.get("en"),
        "profit_bn": profit.get("bn"),
    }


def sort_feed(rows: list[dict]) -> list[dict]:
    """Newest report first; on the same day, the biggest profit move first."""
    return sorted(rows, key=lambda r: (r.get("post_date") or "", abs(r.get("eps_yoy_pct") or 0)), reverse=True)


def _scores_before(posts: dict[str, str]) -> dict[str, Optional[float]]:
    """{code: score on the last snapshot before its post date} — one read."""
    from backend.services.db_service import get_db

    best: dict[str, tuple[str, float]] = {}
    for d in get_db()["signal_snapshots"].find(
        {"trading_code": {"$in": list(posts)}, "score": {"$ne": None}},
        {"_id": 0, "trading_code": 1, "date": 1, "score": 1},
    ):
        code, day, s = d.get("trading_code"), str(d.get("date") or "")[:10], _n(d.get("score"))
        if s is None or not day or day >= posts[code]:
            continue
        if code not in best or day > best[code][0]:
            best[code] = (day, s)
    return {c: best[c][1] if c in best else None for c in posts}


@_ttl_cache(900)
def all_results() -> list[dict]:
    """Every company's latest quarterly report (while it is the newest word on
    the company), newest first. Cached 900s."""
    from backend.services.db_service import load_companies, load_latest_prices
    from backend.services.interim_service import load_interims
    from backend.services.scoring_service import build_scores_df
    from utils.sector import normalize_sector

    df = build_scores_df()
    if df is None or df.empty or "interim_label_en" not in df.columns:
        return []
    rows = {r["trading_code"]: {k: (None if isinstance(v, float) and v != v else v) for k, v in r.items()}
            for r in df[df["interim_label_en"].notna()].to_dict("records")}
    interims = {c: rec for c, rec in load_interims(sorted(rows)).items() if c in rows}
    posts = {c: _iso(rec.get("post_date")) for c, rec in interims.items() if rec.get("post_date")}
    try:
        before = _scores_before(posts)
    except Exception:  # noqa: BLE001 — the score line just says "our score: N"
        before = {}
    companies = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()
    out = []
    for code, rec in interims.items():
        row = rows[code]
        ex = explain(rec, row, before.get(code), normalize_sector(row.get("sector") or ""))
        if ex and ex.get("post_date"):
            out.append(feed_row(code, ex, companies.get(code) or {}, prices.get(code) or {}, _n(row.get("score"))))
    return sort_feed(out)


def results_for(codes, days: int = 21, limit: int = 6, today: Optional[date] = None) -> list[dict]:
    """The dashboard card: reports on these codes posted in the last ``days``."""
    from datetime import timedelta
    from utils.market_hours import bst_today_iso

    want = {str(c).upper() for c in codes or () if c}
    if not want:
        return []
    cutoff = ((today or date.fromisoformat(bst_today_iso())) - timedelta(days=days)).isoformat()
    return [r for r in all_results() if r["code"] in want and (r.get("post_date") or "") >= cutoff][:limit]


def results_summary(days: int = 7, top: int = 3, today: Optional[date] = None) -> dict:
    """The dashboard's promotion for /results: how many companies posted
    results in the last ``days`` and how they read, plus the newest ``top``
    reports whatever their date (a quiet week still shows something)."""
    from datetime import timedelta
    from utils.market_hours import bst_today_iso

    rows = all_results()
    cutoff = ((today or date.fromisoformat(bst_today_iso())) - timedelta(days=days)).isoformat()
    recent = [r for r in rows if (r.get("post_date") or "") >= cutoff]
    counts = {"good": 0, "watch": 0, "bad": 0, "neutral": 0}
    for r in recent:
        counts[r["level"]] = counts.get(r["level"], 0) + 1
    return {"days": days, "recent": len(recent), "counts": counts, "total": len(rows),
            "latest": rows[:top]}
