"""
"Is this dividend safe?" — one plain read per company for the dividend
calendar (2026-10-29, the Free vs Premium plan: the calendar's facts are free,
what a dividend means is Premium).

Pure: it reads only fields the score row already carries (latest EPS, the
payout ratios and paying years from the dividend pillar, this year's interim
figures), so it never contradicts the stock page. Not advice: it says what
the figures show about the company's room to keep paying, never whether to
buy before the record date.
"""
from __future__ import annotations

import math
from typing import Optional

# The signal's value-trap line: a profit drop this deep is "cheap for a reason".
PROFIT_DROP_PCT = -25.0
# Above this share of profit paid out, there is little room if profit dips.
HIGH_PAYOUT_PCT = 75.0

_WORDS = {
    "safe": ("Looks steady", "স্থিতিশীল মনে হচ্ছে"),
    "watch": ("Worth a check", "যাচাই করে নিন"),
    "risk": ("At risk", "ঝুঁকিতে"),
}

# p5_consist (scoring_service._p5) → paying years out of the last five.
_PAID_YEARS = {10.0: "5", 7.0: "4", 4.0: "3"}


def _n(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def _paid(row: dict) -> Optional[str]:
    c = _n(row.get("p5_consist"))
    if c is None:
        return None
    return _PAID_YEARS.get(round(c, 1), "2 or fewer")


def _out(level: str, en: str, bn: str) -> dict:
    w_en, w_bn = _WORDS[level]
    return {"level": level, "word_en": w_en, "word_bn": w_bn, "line_en": en, "line_bn": bn}


def dividend_safety(row: Optional[dict], sector_class: str = "GENERAL") -> Optional[dict]:
    """{level safe|watch|risk, word_en/bn, line_en/bn} — the first rule that
    applies wins, worst first. None without a score row."""
    if not row:
        return None
    lender = sector_class in ("BANK", "NBFI", "INSURANCE")
    eps = _n(row.get("eps"))
    latest = _n(row.get("payout_latest_pct"))
    median = _n(row.get("payout_pct"))
    nocf = _n(row.get("interim_nocfps"))
    drop = _n(row.get("interim_eps_yoy_pct"))
    paid = _paid(row)

    if eps is not None and eps <= 0:
        return _out("risk",
                    "It made a loss in its latest results, so this dividend comes out of past savings.",
                    "সর্বশেষ ফলাফলে লোকসান হয়েছে, তাই এই ডিভিডেন্ড আগের জমানো টাকা থেকে দেওয়া।")
    if latest is not None and latest > 100:
        x = round(latest)
        return _out("risk",
                    f"Last year it paid out {x}% of its profit, more than it earned.",
                    f"গত বছর মুনাফার {x}% ডিভিডেন্ড দিয়েছে, যা আয়ের চেয়ে বেশি।")
    if drop is not None and drop <= -100:
        # Past −100% the year so far is a loss: a percentage would read oddly.
        return _out("watch",
                    "So far this year it is making a loss, after a profit a year ago, which can shrink the next dividend.",
                    "এ বছর এখন পর্যন্ত লোকসান, যেখানে আগের বছর মুনাফা ছিল, তাই পরের ডিভিডেন্ড কমতে পারে।")
    if drop is not None and drop <= PROFIT_DROP_PCT:
        x = round(abs(drop))
        return _out("watch",
                    f"Profit is down {x}% so far this year, which can shrink the next dividend.",
                    f"এ বছর এখন পর্যন্ত মুনাফা {x}% কম, তাই পরের ডিভিডেন্ড কমতে পারে।")
    if not lender and nocf is not None and nocf < 0:
        return _out("watch",
                    "So far this year its business has paid out more cash than it took in.",
                    "এ বছর এখন পর্যন্ত ব্যবসা থেকে যত নগদ এসেছে, বেরিয়ে গেছে তার চেয়ে বেশি।")
    if median is not None and median > HIGH_PAYOUT_PCT:
        x = round(median)
        return _out("watch",
                    f"It pays out about {x}% of its profit, which leaves little room if profit dips.",
                    f"মুনাফার প্রায় {x}% ডিভিডেন্ড দেয়, মুনাফা কমলে হাতে জায়গা কম থাকে।")
    if paid in ("3", "2 or fewer"):
        return _out("watch",
                    f"It paid a cash dividend in {paid} of the last 5 years, so payments are not regular.",
                    f"গত 5 বছরের {'2টি বা তার কম' if paid == '2 or fewer' else paid + 'টি'} বছরে নগদ ডিভিডেন্ড দিয়েছে, তাই নিয়মিত নয়।")
    if median is None and paid is None:
        return None
    if median is not None and paid is not None:
        x = round(median)
        return _out("safe",
                    f"It pays out about {x}% of its profit, and has paid cash in {paid} of the last 5 years.",
                    f"মুনাফার প্রায় {x}% ডিভিডেন্ড দেয়, আর গত 5 বছরের {paid}টিতেই নগদ দিয়েছে।")
    if median is not None:
        x = round(median)
        return _out("safe", f"It pays out about {x}% of its profit.", f"মুনাফার প্রায় {x}% ডিভিডেন্ড দেয়।")
    return _out("safe", f"It has paid cash in {paid} of the last 5 years.", f"গত 5 বছরের {paid}টিতে নগদ দিয়েছে।")
