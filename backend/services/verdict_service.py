"""
Stock verdict generator — combines fundamentals with 7-day market momentum
into a 2-3 sentence plain description of what is happening, in English and
Bengali (docs/voice.md: calm, full sentences, the words investors use).

Descriptive prose only: the Buy/Sell call lives in signal_service and is
attached to the company response by the router — the verdict must describe,
never advise, so the two can never contradict each other.

Fundamentals are primary; momentum modifies tone.
"""
from typing import Optional

from backend.services.tiers import (
    TIER_WORDS as _TIER_WORD,
    TIER_WORDS_BN as _TIER_WORD_BN,
    tier_key as _tier_key,
)


# (tier, momentum_grade) -> (tagline_en, lead_en, tagline_bn, lead_bn)
_MATRIX = {
    ("excellent", "hot"): (
        "Strong company, and the price is rising",
        "The company's profit and finances are strong, and buyers are pushing the price up. The business and the market agree for now.",
        "শক্তিশালী কোম্পানি, দামও বাড়ছে",
        "কোম্পানির মুনাফা ও আর্থিক অবস্থা শক্ত, আর ক্রেতারা দাম বাড়াচ্ছেন। ব্যবসা আর বাজার এখন একই দিকে।",
    ),
    ("excellent", "warm"): (
        "Strong company, and the price is slowly rising",
        "The company is doing well, and its share price has been rising slowly.",
        "শক্তিশালী কোম্পানি, দাম ধীরে বাড়ছে",
        "কোম্পানি ভালো করছে, আর শেয়ারের দাম ধীরে ধীরে বাড়ছে।",
    ),
    ("excellent", "flat"): (
        "Strong company, but the price has not moved",
        "The company has strong profit and healthy finances, but its share price has hardly moved for weeks. The market has not paid it much attention yet.",
        "শক্তিশালী কোম্পানি, তবে দাম নড়ছে না",
        "কোম্পানির মুনাফা ভালো ও আর্থিক অবস্থা সুস্থ, তবে কয়েক সপ্তাহ ধরে শেয়ারের দাম প্রায় একই। বাজার এখনো এদিকে তেমন নজর দেয়নি।",
    ),
    ("excellent", "cold"): (
        "Strong company, but the price has fallen lately",
        "The company is financially strong, but its share price has fallen recently. The market is cautious even though the business is doing well.",
        "শক্তিশালী কোম্পানি, তবে সম্প্রতি দাম কমেছে",
        "কোম্পানির আর্থিক অবস্থা শক্ত, তবে সম্প্রতি শেয়ারের দাম কমেছে। ব্যবসা ভালো চললেও বাজার এখন সতর্ক।",
    ),
    ("excellent", "weak_liquidity"): (
        "Strong company, but few shares trade each day",
        "The company is financially strong, but very few of its shares are bought and sold each day. Selling a large amount quickly could be difficult.",
        "শক্তিশালী কোম্পানি, তবে লেনদেন কম",
        "কোম্পানির আর্থিক অবস্থা শক্ত, তবে প্রতিদিন এর শেয়ার খুব কম কেনাবেচা হয়। বেশি শেয়ার দ্রুত বিক্রি করা কঠিন হতে পারে।",
    ),
    ("excellent", "unknown"): (
        "Strong company, but little recent trading data",
        "The company's figures are strong, but there is not enough recent trading data to judge where the price is heading.",
        "শক্তিশালী কোম্পানি, সাম্প্রতিক লেনদেনের তথ্য কম",
        "কোম্পানির হিসাব শক্ত, তবে দামের গতি বোঝার মতো সাম্প্রতিক লেনদেনের তথ্য যথেষ্ট নেই।",
    ),

    ("good", "hot"): (
        "Good company, and buyers are active",
        "The company's figures are good, and buyers are pushing the price up. The market seems to agree with the quality.",
        "ভালো কোম্পানি, ক্রেতারাও সক্রিয়",
        "কোম্পানির হিসাব ভালো, আর ক্রেতারা দাম বাড়াচ্ছেন। বাজারও মান স্বীকার করছে বলে মনে হচ্ছে।",
    ),
    ("good", "warm"): (
        "Good company, and the price is rising steadily",
        "The company is in good financial shape, and its share price is rising steadily.",
        "ভালো কোম্পানি, দাম স্থিরভাবে বাড়ছে",
        "কোম্পানির আর্থিক অবস্থা ভালো, আর শেয়ারের দাম স্থিরভাবে বাড়ছে।",
    ),
    ("good", "flat"): (
        "Good company, but the price is quiet",
        "The company's figures are good, but the share price has not moved much in either direction.",
        "ভালো কোম্পানি, তবে দাম স্থির",
        "কোম্পানির হিসাব ভালো, তবে শেয়ারের দাম কোনো দিকেই তেমন নড়েনি।",
    ),
    ("good", "cold"): (
        "Good company, but the price has fallen lately",
        "The company's figures are good, but its share price has been falling lately. The market mood is against it for now.",
        "ভালো কোম্পানি, তবে সম্প্রতি দাম কমছে",
        "কোম্পানির হিসাব ভালো, তবে সম্প্রতি শেয়ারের দাম কমছে। বাজারের মনোভাব আপাতত এর বিপক্ষে।",
    ),
    ("good", "weak_liquidity"): (
        "Good company, but few shares trade each day",
        "The company is in good financial shape, but very few of its shares are bought and sold each day. Selling quickly could be difficult.",
        "ভালো কোম্পানি, তবে লেনদেন কম",
        "কোম্পানির আর্থিক অবস্থা ভালো, তবে প্রতিদিন এর শেয়ার খুব কম কেনাবেচা হয়। দ্রুত বিক্রি করা কঠিন হতে পারে।",
    ),
    ("good", "unknown"): (
        "Good company, but little recent trading data",
        "The company's figures are good, but there is not enough recent trading data to judge how the price is moving.",
        "ভালো কোম্পানি, সাম্প্রতিক লেনদেনের তথ্য কম",
        "কোম্পানির হিসাব ভালো, তবে দামের গতি বোঝার মতো সাম্প্রতিক লেনদেনের তথ্য যথেষ্ট নেই।",
    ),

    ("average", "hot"): (
        "Average company, but the price is rising fast",
        "The company's figures are average, neither strong nor weak. Buyers are pushing the price up quickly right now, which carries more risk than a long-term holding.",
        "মাঝারি কোম্পানি, তবে দাম দ্রুত বাড়ছে",
        "কোম্পানির হিসাব মাঝারি, শক্তও নয় দুর্বলও নয়। এখন ক্রেতারা দ্রুত দাম বাড়াচ্ছেন, যাতে দীর্ঘমেয়াদি বিনিয়োগের চেয়ে ঝুঁকি বেশি।",
    ),
    ("average", "warm"): (
        "Average company, with some buying interest",
        "The company's figures are average, and its share price is rising slowly. There is no strong reason yet to hold it for the long term.",
        "মাঝারি কোম্পানি, কিছুটা কেনার আগ্রহ আছে",
        "কোম্পানির হিসাব মাঝারি, আর শেয়ারের দাম ধীরে বাড়ছে। দীর্ঘমেয়াদে রাখার জোরালো কারণ এখনো নেই।",
    ),
    ("average", "flat"): (
        "Average company, and the price is quiet",
        "The company's profit and finances are average, and its share price is hardly moving. There is no clear reason to buy or sell right now.",
        "মাঝারি কোম্পানি, দামও স্থির",
        "কোম্পানির মুনাফা ও আর্থিক অবস্থা মাঝারি, আর শেয়ারের দাম প্রায় নড়ছে না। এখন কেনা বা বিক্রির স্পষ্ট কারণ নেই।",
    ),
    ("average", "cold"): (
        "Average company, and the price is falling",
        "The company's figures are average, and its share price is slowly going down.",
        "মাঝারি কোম্পানি, দাম কমছে",
        "কোম্পানির হিসাব মাঝারি, আর শেয়ারের দাম ধীরে ধীরে কমছে।",
    ),
    ("average", "weak_liquidity"): (
        "Average company, and few shares trade each day",
        "The company's figures are average, and very few of its shares are bought and sold each day. It may be hard to sell when you want to.",
        "মাঝারি কোম্পানি, লেনদেনও কম",
        "কোম্পানির হিসাব মাঝারি, আর প্রতিদিন এর শেয়ার খুব কম কেনাবেচা হয়। চাইলেই বিক্রি করা কঠিন হতে পারে।",
    ),
    ("average", "unknown"): (
        "Average company, but little recent trading data",
        "The company's figures are average, and there is not enough recent trading data to judge the share price.",
        "মাঝারি কোম্পানি, সাম্প্রতিক লেনদেনের তথ্য কম",
        "কোম্পানির হিসাব মাঝারি, আর দাম বোঝার মতো সাম্প্রতিক লেনদেনের তথ্য যথেষ্ট নেই।",
    ),

    ("weak", "hot"): (
        "Weak company, but the price is rising fast",
        "The company's profit and finances are weak, but its share price is rising fast right now. A quick gain is possible, but it is not a safe long-term holding.",
        "দুর্বল কোম্পানি, তবে দাম দ্রুত বাড়ছে",
        "কোম্পানির মুনাফা ও আর্থিক অবস্থা দুর্বল, তবে এখন শেয়ারের দাম দ্রুত বাড়ছে। দ্রুত লাভ হতে পারে, তবে দীর্ঘমেয়াদে রাখা নিরাপদ নয়।",
    ),
    ("weak", "warm"): (
        "Weak company, and the price is rising slowly",
        "The company's figures are weak, and its share price is rising slowly. Holding it for the long term carries real risk.",
        "দুর্বল কোম্পানি, দাম ধীরে বাড়ছে",
        "কোম্পানির হিসাব দুর্বল, আর শেয়ারের দাম ধীরে বাড়ছে। দীর্ঘমেয়াদে রাখায় সত্যিকারের ঝুঁকি আছে।",
    ),
    ("weak", "flat"): (
        "Weak company, and the price is quiet",
        "The company's figures are weak, and its share price is hardly moving. There is little here to support an investment.",
        "দুর্বল কোম্পানি, দামও স্থির",
        "কোম্পানির হিসাব দুর্বল, আর শেয়ারের দাম প্রায় নড়ছে না। বিনিয়োগের পক্ষে এখানে তেমন কিছু নেই।",
    ),
    ("weak", "cold"): (
        "Weak company, and the price is falling",
        "The company's figures are weak, and its share price keeps falling.",
        "দুর্বল কোম্পানি, দামও কমছে",
        "কোম্পানির হিসাব দুর্বল, আর শেয়ারের দাম কমেই চলেছে।",
    ),
    ("weak", "weak_liquidity"): (
        "Weak company, and few shares trade each day",
        "The company's figures are weak, and very few of its shares are bought and sold each day. You may not be able to sell when you want to.",
        "দুর্বল কোম্পানি, লেনদেনও কম",
        "কোম্পানির হিসাব দুর্বল, আর প্রতিদিন এর শেয়ার খুব কম কেনাবেচা হয়। চাইলেই বিক্রি করতে না-ও পারেন।",
    ),
    ("weak", "unknown"): (
        "Weak company, but little recent trading data",
        "The company's figures are weak, and there is not enough recent trading data to judge the share price.",
        "দুর্বল কোম্পানি, সাম্প্রতিক লেনদেনের তথ্য কম",
        "কোম্পানির হিসাব দুর্বল, আর দাম বোঝার মতো সাম্প্রতিক লেনদেনের তথ্য যথেষ্ট নেই।",
    ),

    ("unknown", "hot"): (
        "Not rated, and the price is rising fast",
        "We do not have enough information to rate this company. Its price is rising fast, but without the business figures that is a gamble.",
        "রেটিং নেই, দাম দ্রুত বাড়ছে",
        "এই কোম্পানির মূল্যায়ন করার মতো যথেষ্ট তথ্য আমাদের কাছে নেই। দাম দ্রুত বাড়ছে, তবে ব্যবসার হিসাব ছাড়া এটি অনুমাননির্ভর।",
    ),
    ("unknown", "warm"): (
        "Not rated yet",
        "We do not have enough information to rate this company's business.",
        "এখনো রেটিং নেই",
        "এই কোম্পানির ব্যবসা মূল্যায়ন করার মতো যথেষ্ট তথ্য আমাদের কাছে নেই।",
    ),
    ("unknown", "flat"): (
        "Not rated yet",
        "We do not have enough information to rate this company's business.",
        "এখনো রেটিং নেই",
        "এই কোম্পানির ব্যবসা মূল্যায়ন করার মতো যথেষ্ট তথ্য আমাদের কাছে নেই।",
    ),
    ("unknown", "cold"): (
        "Not rated, and the price is falling",
        "We do not have enough information to rate this company, and its price has been falling lately.",
        "রেটিং নেই, দাম কমছে",
        "এই কোম্পানির মূল্যায়ন করার মতো যথেষ্ট তথ্য নেই, আর সম্প্রতি দাম কমছে।",
    ),
    ("unknown", "weak_liquidity"): (
        "Not rated, and few shares trade each day",
        "We do not have enough information to rate this company, and very few of its shares are traded each day.",
        "রেটিং নেই, লেনদেনও কম",
        "এই কোম্পানির মূল্যায়ন করার মতো যথেষ্ট তথ্য নেই, আর প্রতিদিন এর শেয়ার খুব কম লেনদেন হয়।",
    ),
    ("unknown", "unknown"): (
        "Not rated yet",
        "We do not have enough information to give a clear view of this share.",
        "এখনো রেটিং নেই",
        "এই শেয়ার নিয়ে স্পষ্ট মত দেওয়ার মতো যথেষ্ট তথ্য আমাদের কাছে নেই।",
    ),
}


# One plain clause per tier — used when the momentum line must be rewritten
# because the 7-day grade alone would contradict what the price is doing.
# (subject_en, lead_en, subject_bn, lead_bn)
_TIER_SUBJECT = {
    "excellent": ("Strong company", "The company is financially strong.",
                  "শক্তিশালী কোম্পানি", "কোম্পানির আর্থিক অবস্থা শক্ত।"),
    "good": ("Good company", "The company is in good financial shape.",
             "ভালো কোম্পানি", "কোম্পানির আর্থিক অবস্থা ভালো।"),
    "average": ("Average company", "The company's figures are average, neither strong nor weak.",
                "মাঝারি কোম্পানি", "কোম্পানির হিসাব মাঝারি, শক্তও নয় দুর্বলও নয়।"),
    "weak": ("Weak company", "The company's figures are weak.",
             "দুর্বল কোম্পানি", "কোম্পানির হিসাব দুর্বল।"),
    "unknown": ("Not rated", "We do not have enough information to rate this company.",
                "রেটিং নেই", "এই কোম্পানির মূল্যায়ন করার মতো যথেষ্ট তথ্য নেই।"),
}

# 52-week position (%) at or below which "price rising" must say it is still
# near the yearly low (BRACBANK: "price slowly rising" at 12% of its range).
NEAR_LOW_PCT = 20.0
# A day move (%) against the weekly direction that the tagline must mention
# (LHB: "price moving up steadily" on a -3.7% day at 2x volume).
DAY_AGAINST_PCT = 2.0

Pair = tuple[str, str]


def _price_story(tier: str, grade: str, momentum: Optional[dict],
                 latest_price: Optional[dict]) -> Optional[tuple[Pair, Pair]]:
    """((tagline_en, tagline_bn), (lead_en, lead_bn)) when the plain 7-day grade
    would mislead, else None. Uses the same window the momentum strip shows
    (7 days, 52-week position)."""
    m = momentum or {}
    pct52 = m.get("pct_in_52w_range")
    day = (latest_price or {}).get("change_pct")
    r7 = m.get("return_7d_pct")
    subj, lead, subj_bn, lead_bn = _TIER_SUBJECT.get(tier, _TIER_SUBJECT["unknown"])
    rising = grade in ("hot", "warm")
    if rising and isinstance(day, (int, float)) and day <= -DAY_AGAINST_PCT:
        return ((f"{subj}, price up this week but fell today",
                 f"{subj_bn}, এ সপ্তাহে দাম বেড়েছে তবে আজ কমেছে"),
                (f"{lead} The share price rose over the past week, but it fell {abs(day):.1f}% today.",
                 f"{lead_bn} গত এক সপ্তাহে শেয়ারের দাম বেড়েছে, তবে আজ {abs(day):.1f}% কমেছে।"))
    if grade == "cold" and isinstance(day, (int, float)) and day >= DAY_AGAINST_PCT:
        return ((f"{subj}, price down this week but rose today",
                 f"{subj_bn}, এ সপ্তাহে দাম কমেছে তবে আজ বেড়েছে"),
                (f"{lead} The share price fell over the past week, but it rose {day:.1f}% today.",
                 f"{lead_bn} গত এক সপ্তাহে শেয়ারের দাম কমেছে, তবে আজ {day:.1f}% বেড়েছে।"))
    if rising and isinstance(pct52, (int, float)) and pct52 <= NEAR_LOW_PCT:
        up = f" {r7:.1f}%" if isinstance(r7, (int, float)) else ""
        return ((f"{subj}, price recovering near this year's low",
                 f"{subj_bn}, এ বছরের সর্বনিম্নের কাছ থেকে দাম বাড়ছে"),
                (f"{lead} The share price rose{up} this week, but it is still close to its lowest level this year.",
                 f"{lead_bn} এ সপ্তাহে শেয়ারের দাম{up} বেড়েছে, তবে এখনো এ বছরের সর্বনিম্ন দামের কাছাকাছি।"))
    return None


def _corporate_action_clause(momentum: Optional[dict]) -> Optional[Pair]:
    ca = (momentum or {}).get("corporate_action")
    if not ca:
        return None
    en, bn = [], []
    if ca.get("cash_pct"):
        en.append(f"{ca['cash_pct']:g}% cash dividend")
        bn.append(f"{ca['cash_pct']:g}% নগদ ডিভিডেন্ড")
    if ca.get("stock_pct"):
        en.append(f"{ca['stock_pct']:g}% bonus shares")
        bn.append(f"{ca['stock_pct']:g}% বোনাস শেয়ার")
    what_en = " and ".join(en) or "dividend"
    what_bn = " ও ".join(bn) or "ডিভিডেন্ড"
    return (f"The record date for its {what_en} passed this week. The price drop after a record date is the "
            f"dividend leaving the price, not selling, and the weekly change shown here is adjusted for it.",
            f"এ সপ্তাহে এর {what_bn}-এর রেকর্ড ডেট পার হয়েছে। রেকর্ড ডেটের পর দাম কমা মানে ডিভিডেন্ড দামের "
            f"বাইরে যাওয়া, বিক্রির চাপ নয়; এখানে সাপ্তাহিক পরিবর্তন সেটি সমন্বয় করে দেখানো হয়েছে।")


def _supporting_clauses(tier: str,
                        score_row: Optional[dict],
                        signal_flags: Optional[dict],
                        momentum: Optional[dict],
                        financials: Optional[list]) -> list[Pair]:
    """Pick at most one clause from each of: dividend, valuation, range, risk."""
    out: list[Pair] = []
    sr = score_row or {}

    # Heavy loans lead — the tier lead can no longer claim a healthy balance sheet.
    level = sr.get("debt_level")
    if level == "over_mcap":
        out.append(("However, its loans are larger than the value of the whole company, which is a real risk.",
                    "তবে এর ঋণ পুরো কোম্পানির বাজারমূল্যের চেয়েও বেশি, যা বড় ঝুঁকি।"))
    elif level == "over_reserve":
        out.append(("However, its loans are larger than the profit it has kept over the years.",
                    "তবে এর ঋণ বছরের পর বছর জমানো মুনাফার চেয়ে বেশি।"))

    # This year's interim trend leads when it cuts against last year's numbers.
    iy = sr.get("interim_eps_yoy_pct")
    label = sr.get("interim_label_en")
    label_bn = sr.get("interim_label_bn") or label
    if isinstance(iy, (int, float)) and label and abs(iy) >= 10:
        fy = sr.get("eps_yoy_pct")
        if iy < 0 and isinstance(fy, (int, float)) and fy > 0:
            out.append((f"Profit rose last year, but so far this year it is down {abs(iy):.0f}% ({label}).",
                        f"গত বছর মুনাফা বেড়েছিল, তবে এ বছর এ পর্যন্ত {abs(iy):.0f}% কম ({label_bn})।"))
        elif iy < 0:
            out.append((f"Profit so far this year is down {abs(iy):.0f}% compared with the same months last year ({label}).",
                        f"এ বছর এ পর্যন্ত মুনাফা আগের বছরের একই সময়ের চেয়ে {abs(iy):.0f}% কম ({label_bn})।"))
        else:
            out.append((f"Profit so far this year is up {iy:.0f}% compared with the same months last year ({label}).",
                        f"এ বছর এ পর্যন্ত মুনাফা আগের বছরের একই সময়ের চেয়ে {iy:.0f}% বেশি ({label_bn})।"))

    # Dividend clause
    p5 = sr.get("p5_div")
    div_y = sr.get("div_yield_pct")
    if (p5 is not None and p5 >= 7) or (div_y is not None and div_y >= 5):
        out.append(("It has paid dividends regularly in past years.",
                    "আগের বছরগুলোতে নিয়মিত ডিভিডেন্ড দিয়েছে।"))

    # Valuation clause
    p4_pe = sr.get("p4_pe")
    if p4_pe is not None and p4_pe >= 8:
        out.append(("Its price is lower now than its average over the past few years.",
                    "গত কয়েক বছরের গড়ের তুলনায় এখন দাম কম।"))
    elif p4_pe is not None and p4_pe <= 1:
        out.append(("Its price is higher now than its 5-year average.",
                    "5 বছরের গড়ের তুলনায় এখন দাম বেশি।"))

    # 52w range clause
    pct = (momentum or {}).get("pct_in_52w_range")
    if pct is not None:
        if pct >= 85 and tier in ("excellent", "good"):
            out.append(("The price is close to its highest level this year, so it is not cheap to buy now.",
                        "দাম এ বছরের সর্বোচ্চের কাছাকাছি, তাই এখন কেনা সস্তা নয়।"))
        elif pct <= 15 and tier in ("excellent", "good"):
            out.append(("The price is close to its lowest level this year.",
                        "দাম এ বছরের সর্বনিম্নের কাছাকাছি।"))

    # Risk clause (latest EPS negative)
    if financials:
        latest = financials[-1] if financials else None
        if latest:
            eps = latest.get("eps")
            if isinstance(eps, (int, float)) and eps < 0:
                out.append(("The company made a loss in its most recent year.",
                            "সর্বশেষ বছরে কোম্পানিটি লোকসান করেছে।"))

    # Cap to 2 supporting clauses to keep output to 2-3 sentences total
    return out[:2]


def build_verdict(score_row: Optional[dict],
                  momentum: Optional[dict],
                  signal_flags: Optional[dict],
                  latest_price: Optional[dict],
                  financials: Optional[list]) -> dict:
    score = (score_row or {}).get("score") if score_row else None
    tier = _tier_key(score)
    grade = (momentum or {}).get("momentum_grade", "unknown")

    tagline, lead, tagline_bn, lead_bn = _MATRIX.get((tier, grade), _MATRIX[(tier, "unknown")])

    story = _price_story(tier, grade, momentum, latest_price)
    if story:
        (tagline, tagline_bn), (lead, lead_bn) = story
    if (score_row or {}).get("debt_level") in ("over_mcap", "over_reserve"):
        lead = (lead.replace("profit and finances are strong", "profit is strong")
                    .replace("strong profit and healthy finances", "strong profit")
                    .replace("The company's figures are strong", "The company's profit is strong"))
        lead_bn = (lead_bn.replace("মুনাফা ও আর্থিক অবস্থা শক্ত", "মুনাফা শক্ত")
                          .replace("মুনাফা ভালো ও আর্থিক অবস্থা সুস্থ", "মুনাফা ভালো")
                          .replace("কোম্পানির হিসাব শক্ত", "কোম্পানির মুনাফা শক্ত"))
    clauses = _supporting_clauses(tier, score_row, signal_flags, momentum, financials)
    sentences = [lead] + [c[0] for c in clauses]
    sentences_bn = [lead_bn] + [c[1] for c in clauses]
    ca = _corporate_action_clause(momentum)
    if ca:
        sentences.insert(1, ca[0])
        sentences_bn.insert(1, ca[1])

    return {
        "headline": _TIER_WORD[tier],
        "tagline": tagline,
        "sentences": sentences,
        "headline_bn": _TIER_WORD_BN[tier],
        "tagline_bn": tagline_bn,
        "sentences_bn": sentences_bn,
    }
