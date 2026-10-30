"""
Results day, explained — a company's latest report in plain words.

DSE posts every Q1/Q2/Q3 result in one fixed template (parsed by
``interim_service``), and the full year in the dividend notice (parsed by
``notices``, 2026-10-28). Whichever covers the later period is the company's
latest result: a full year is read like a 12-month report, with the fourth
quarter on its own worked out from the 9-month figure. The bare post says "EPS was Tk. 2.10 … as against Tk.
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
    if months == 12:
        return (f"the year to {_MONTH_ABBR[end.month]} {end.year}",
                f"{_MONTH_BN[end.month]} {end.year}-এ শেষ হওয়া বছরে")
    return (f"the {months} months to {_MONTH_ABBR[end.month]} {end.year}",
            f"{_MONTH_BN[end.month]} {end.year} পর্যন্ত {months} মাসে")


def _as_date(v) -> Optional[date]:
    if isinstance(v, datetime):
        return v.date()
    if isinstance(v, date):
        return v
    if isinstance(v, str) and v:
        try:
            return date.fromisoformat(v[:10])
        except ValueError:
            return None
    return None


def full_year_result(annual: Optional[dict], interim: Optional[dict] = None) -> Optional[dict]:
    """A yearly notice (``notices.parse_annual_results`` shape) as an
    interim-shaped record (months 12, no quarter), so ``explain`` and the feed
    read it like any report. When ``interim`` is the same year's 9-month report,
    the fourth quarter on its own is the year minus those 9 months. None when
    the notice lacks this year's or last year's EPS."""
    if not annual:
        return None
    end = _as_date(annual.get("fy_end"))
    cur, prev = _n(annual.get("eps")), _n(annual.get("eps_prev"))
    if end is None or cur is None or prev is None:
        return None
    start = date(end.year if end.month == 12 else end.year - 1, end.month % 12 + 1, 1)
    q = qp = None
    if interim and int(interim.get("months") or 0) == 9:
        i_start = _as_date(interim.get("period_start"))
        i_end = _as_date(interim.get("period_end"))
        same_year = i_start == start if i_start else (
            i_end is not None and (end.year * 12 + end.month) - (i_end.year * 12 + i_end.month) == 3)
        c9, p9 = _n(interim.get("eps_cum")), _n(interim.get("eps_cum_prev"))
        if same_year and c9 is not None and p9 is not None:
            q, qp = round(cur - c9, 2), round(prev - p9, 2)
    return {
        "quarter": None,
        "months": 12,
        "full_year": True,
        "period_start": start,
        "period_end": end,
        "eps_cum": cur,
        "eps_cum_prev": prev,
        "eps_q": q,
        "eps_q_prev": qp,
        "nocfps_cum": _n(annual.get("nocfps")),
        "nocfps_cum_prev": _n(annual.get("nocfps_prev")),
        "nav": _n(annual.get("nav")),
        "post_date": _as_date(annual.get("post_date")),
    }


def newest_result(interim: Optional[dict], annual: Optional[dict]) -> Optional[dict]:
    """The company's latest result: the report covering the later period (a
    full year beats the 9 months that end before it)."""
    year = full_year_result(annual, interim)
    if interim is None:
        return year
    if year is None:
        return interim
    key = lambda r: (_as_date(r.get("period_end")) or date.min, int(r.get("months") or 0))  # noqa: E731
    return year if key(year) > key(interim) else interim


def load_latest_results(codes=None) -> dict[str, dict]:
    """{code: newest result} — the latest quarterly post or the yearly notice,
    whichever is newer. Two cached reads."""
    from backend.services.interim_service import load_interims
    try:
        from backend.services.notices import load_annual_results
        annual = load_annual_results(list(codes) if codes is not None else None)
    except Exception:  # noqa: BLE001 — quarters alone still make a feed
        annual = {}
    interims = load_interims(sorted(codes) if codes is not None else None)
    out = {}
    for code in set(interims) | set(annual):
        rec = newest_result(interims.get(code), annual.get(code))
        if rec:
            out[code] = rec
    return out


def is_newest_word(rec: dict, row: Optional[dict]) -> bool:
    """Is this result still the latest thing the company has reported? A
    quarter counts while the score row carries it (no newer audited year); a
    full year while DSE's audited table has no later year."""
    row = row or {}
    if rec.get("full_year"):
        end = _as_date(rec.get("period_end"))
        last = row.get("last_reported_year")
        try:
            return end is not None and (last is None or int(last) <= end.year)
        except (TypeError, ValueError):
            return end is not None
    return bool(row.get("interim_label_en"))


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


# The latest quarter counts as above / below the year's own pace when it is
# this far from what that pace would have given.
PACE_BAND_PCT = 10.0


def pace_of_year(cur: Optional[float], prev: Optional[float], q: Optional[float],
                 qp: Optional[float], months: int) -> Optional[dict]:
    """Better or worse than expected, where "expected" is the year's own pace
    (2026-10-31): up to the latest quarter, profit ran at some rate against the
    same months last year; at that rate the latest 3 months would have been
    last year's same quarter × that rate. The quarter came in above that (by
    PACE_BAND_PCT or more), below it, or in line.

    Only for a report with earlier months to set the pace (6, 9 or 12 months,
    with the latest quarter known) and positive profit in the earlier months
    of both years and in last year's quarter — a pace from a loss means
    nothing. None otherwise."""
    if months <= 3 or None in (cur, prev, q, qp):
        return None
    early_now, early_prev = cur - q, prev - qp
    if early_now <= 0 or early_prev <= 0 or qp <= 0:
        return None
    rate = early_now / early_prev
    expected = qp * rate
    gap = (q - expected) / expected * 100.0
    word = "above" if gap >= PACE_BAND_PCT else "below" if gap <= -PACE_BAND_PCT else "in_line"
    run = (rate - 1.0) * 100.0
    if abs(run) < 1:
        run_en, run_bn = "about level with last year", "গত বছরের প্রায় সমান"
    elif run > 0:
        run_en, run_bn = f"{run:.0f}% ahead of last year", f"গত বছরের চেয়ে {run:.0f}% বেশি"
    else:
        run_en, run_bn = f"{-run:.0f}% behind last year", f"গত বছরের চেয়ে {-run:.0f}% কম"
    end_en = {"above": "above the pace of the year so far",
              "below": "below the pace of the year so far",
              "in_line": "in line with the pace of the year so far"}[word]
    end_bn = {"above": "বছরের এ পর্যন্ত গতির চেয়ে ভালো",
              "below": "বছরের এ পর্যন্ত গতির চেয়ে খারাপ",
              "in_line": "বছরের এ পর্যন্ত গতির মতোই"}[word]
    head_en = {"above": "Came in above the pace of the year so far.",
               "below": "Came in below the pace of the year so far.",
               "in_line": "Came in at the pace of the year so far."}[word]
    head_bn = {"above": "বছরের এ পর্যন্ত গতির চেয়ে ভালো এসেছে।",
               "below": "বছরের এ পর্যন্ত গতির চেয়ে খারাপ এসেছে।",
               "in_line": "বছরের এ পর্যন্ত গতির মতোই এসেছে।"}[word]
    return {
        "word": word,
        "expected": round(expected, 2),
        "quarter": q,
        "headline_en": head_en,
        "headline_bn": head_bn,
        "en": (f"Before the latest 3 months, profit was running {run_en}. At that pace the latest 3 months "
               f"would have been about {_tk(expected)} a share; it came in at {_tk(q)}, {end_en}."),
        "bn": (f"সর্বশেষ 3 মাসের আগে মুনাফা চলছিল {run_bn}। সেই গতিতে সর্বশেষ 3 মাসে শেয়ারপ্রতি মুনাফা হতো "
               f"প্রায় {_tk(expected)}; এসেছে {_tk(q)}, যা {end_bn}।"),
    }


def explain(interim: dict, row: Optional[dict] = None, score_before: Optional[float] = None,
            sector_class: str = "GENERAL") -> Optional[dict]:
    """The explainer for one company's latest report (a quarter, or a full
    year from ``full_year_result``).

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
    full_year = months == 12
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
                "en": (f"Cash from the business over the year: {_tk(nocf)} a share{prev_en}." if full_year
                       else f"Cash from the business so far: {_tk(nocf)} a share{prev_en}."),
                "bn": (f"বছরজুড়ে ব্যবসা থেকে নগদ এসেছে শেয়ারপ্রতি {_tk(nocf)}{prev_bn}।" if full_year
                       else f"এ পর্যন্ত ব্যবসা থেকে নগদ এসেছে শেয়ারপ্রতি {_tk(nocf)}{prev_bn}।"),
            })

    # What the price costs now, on the last 12 months' profit.
    ltp, eps, fy_eps = _n(row.get("ltp")), _n(row.get("eps")), _n(row.get("fy_eps"))
    if full_year and ltp:
        # A full year is its own last 12 months: the price against the year's profit.
        if cur > 0:
            lines.append({
                "key": "price", "tone": "neutral",
                "en": f"At today's price of ৳{ltp:,.1f}, the share costs {_x(ltp / cur)}× the year's profit"
                      + (f" ({_x(ltp / prev)}× on the year before)." if prev > 0 else "."),
                "bn": f"আজকের ৳{ltp:,.1f} দামে শেয়ারটির দাম বছরের মুনাফার {_x(ltp / cur)} গুণ"
                      + (f" (আগের বছরের মুনাফায় {_x(ltp / prev)} গুণ)।" if prev > 0 else "।"),
            })
        else:
            lines.append({
                "key": "price", "tone": "bad",
                "en": "It made a loss for the year, so the price cannot be compared with profit.",
                "bn": "বছরে লোকসান হয়েছে, তাই মুনাফার সঙ্গে দাম তুলনা করা যায় না।",
            })
    elif ltp and eps is not None and row.get("eps_basis") == "ttm":
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
        if full_year:
            m_en = "The company made a loss for the year. It is wise to be careful until profit returns."
            m_bn = "বছরটিতে কোম্পানিটি লোকসান করেছে। মুনাফায় না ফেরা পর্যন্ত সাবধান থাকাই ভালো।"
        else:
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

    end_d = _as_date(interim.get("period_end"))
    if full_year and end_d:
        q_label, q_label_bn = f"FY{end_d.year}", f"{end_d.year} অর্থবছরের"
    else:
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
        "quarter": quarter, "months": months, "full_year": full_year,
        "period_end": _iso(interim.get("period_end")),
        "post_date": _iso(interim.get("post_date")),
        "period_en": per_en, "period_bn": per_bn,
        "eps_cum": cur, "eps_cum_prev": prev, "eps_yoy_pct": pct, "eps_q_yoy_pct": q_pct,
        "level": level,
        "headline_en": f"{q_label} results: {head_en}",
        "headline_bn": f"{q_label_bn} ফল: {head_bn}",
        "lines": lines,
        "meaning_en": m_en, "meaning_bn": m_bn,
        # Better or worse than the year's own pace (Premium on /results).
        "pace": pace_of_year(cur, prev, q, qp, months),
    }


def company_results(code: str, score_row: Optional[dict], sector_class: str = "GENERAL") -> Optional[dict]:
    """The stock page's explainer — only while the report is the newest word
    on the company (``is_newest_word``)."""
    if not score_row:
        return None
    from backend.services.score_history_service import score_before

    rec = load_latest_results([code]).get(code)
    if not rec or not is_newest_word(rec, score_row):
        return None
    post = _iso(rec.get("post_date"))
    before = score_before(code, post) if post else None
    return explain(rec, score_row, before, sector_class)


# ---------------------------------------------------------------------------
# Every company's latest report — the /results page and the dashboard card
# ---------------------------------------------------------------------------

def feed_row(code: str, ex: dict, comp: dict, price: dict, score: Optional[float]) -> dict:
    """One row of the market-wide feed: the headline and the profit line (free),
    plus the one "what it means" sentence (Premium on /results since
    2026-10-29, a screen-only lock). The cash, price and score lines stay on
    the stock page."""
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
        "full_year": bool(ex.get("full_year")),
        "period_end": ex["period_end"],
        "level": ex["level"],
        "eps_yoy_pct": ex["eps_yoy_pct"],
        # The two figures the profit line already prints (this year so far vs
        # the same months last year), so the /results row can lead with them.
        "eps_cum": ex["eps_cum"],
        "eps_cum_prev": ex["eps_cum_prev"],
        "headline_en": ex["headline_en"],
        "headline_bn": ex["headline_bn"],
        "profit_en": profit.get("en"),
        "profit_bn": profit.get("bn"),
        "meaning_en": ex.get("meaning_en"),
        "meaning_bn": ex.get("meaning_bn"),
        "pace": ex.get("pace"),
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
    """Every company's latest report — a quarter or a full year, while it is
    the newest word on the company — newest first. Cached 900s. Before
    2026-10-28 a company left this feed on its results day: the yearly notice
    superseded its 9-month report but wasn't read as a result itself."""
    from backend.services.db_service import load_companies, load_latest_prices
    from backend.services.scoring_service import build_scores_df
    from utils.sector import normalize_sector

    df = build_scores_df()
    if df is None or df.empty:
        return []
    rows = {r["trading_code"]: {k: (None if isinstance(v, float) and v != v else v) for k, v in r.items()}
            for r in df[df["score"].notna()].to_dict("records")} if "score" in df.columns else {}
    interims = {c: rec for c, rec in load_latest_results(sorted(rows)).items()
                if c in rows and is_newest_word(rec, rows[c])}
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
