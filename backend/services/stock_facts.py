"""
Plain-language facts for the stock page — "Good signs" / "Watch-outs", the
ownership read, Health Check wording overrides and the ONE valuation verdict —
in English and everyday Bengali (Western digits, per project convention).

Everything here is a pure function of data the detail route already loaded
(score row, audited financials, shareholding snapshots, company profile, news),
so the rules are unit-testable without a database. The page used to build this
text in the browser from hardcoded templates ("Made profits in 4 out of the
last 5 years" for every company, govt-owned firms told their owners hold "only
0%"); now the backend says it once, from the numbers, and the frontend renders it.

Each item: {"key", "tone": "good" | "watch", "en", "bn"}.
"""
import math
import re
from datetime import datetime, timedelta, timezone
from typing import Optional

# Ownership-change move (percentage points) above which we ask for a check
# instead of praising: real insider buying is gradual; a 10 pp jump in nine
# months is usually a holder being reclassified (NAVANAPHAR 31.6% -> 42.2%).
OWNERSHIP_JUMP_PP = 5.0
OWNERSHIP_MOVE_PP = 0.5

# Interim year-to-date EPS change (%) that is worth a sentence either way.
INTERIM_MOVE_PCT = 10.0

# A dividend under this yield is "small" however reliable it is.
SMALL_YIELD_PCT = 4.0

# Valuation bands on the P4 pillar — the same cut-offs the Buy/Sell signal uses
# (signal_service.CHEAP_P4 / EXPENSIVE_P4), so every label on a page agrees.
CHEAP_P4 = 7.0
EXPENSIVE_P4 = 4.0

GOVT_CONTROL_PCT = 50.0

# The ownership read compares the latest shareholding report with the newest
# one at least this many days older. DSE posts these monthly now; one month's
# move is mostly noise, and consecutive reports are usually identical.
OWNERSHIP_LOOKBACK_DAYS = 150

_LENDER_CLASSES = {"BANK", "NBFI"}
_NO_DEBT_FLAG_CLASSES = {"BANK", "NBFI", "INSURANCE"}


def _f(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(x) or math.isinf(x) else x


def _r(v: float, nd: int = 1) -> str:
    """Tidy number for prose: 42.0 -> '42', 42.24 -> '42.2'."""
    s = f"{v:.{nd}f}"
    return s.rstrip("0").rstrip(".") if "." in s else s


def _crore(mn: float) -> str:
    return f"{mn / 10:,.0f}"


def _taka(v: float, nd: int = 2) -> str:
    """৳1.64 / −৳2.59 (minus outside the symbol)."""
    return f"{'−' if v < 0 else ''}৳{_r(abs(v), nd)}"


def _year(v) -> Optional[int]:
    x = _f(v)
    return int(x) if x is not None else None


_MONTH_BN_FULL = ["", "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
                  "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]


def item(key: str, tone: str, en: str, bn: str) -> dict:
    return {"key": key, "tone": tone, "en": en, "bn": bn}


# ---------------------------------------------------------------------------
# Profit history — the single counter behind the signal AND the profit caption
# ---------------------------------------------------------------------------

def profit_years(financials: list[dict], window: int = 5) -> tuple[int, int]:
    """(profitable years, years reported) over the last `window` audited years
    with an EPS figure — the same window the P1 consistency metric scores."""
    eps = [_f(r.get("eps")) for r in financials or []]
    eps = [e for e in eps if e is not None][-window:]
    return sum(1 for e in eps if e > 0), len(eps)


def profit_years_item(financials: list[dict]) -> Optional[dict]:
    pos, total = profit_years(financials)
    if total < 3:
        return None
    if pos == total:
        return item("profit_every_year", "good",
                    f"It made a profit in each of the last {total} years.",
                    f"গত {total} বছরের প্রতিটিতে মুনাফা করেছে।")
    if pos >= total - 1:
        return item("profit_most_years", "good",
                    f"It made a profit in {pos} of the last {total} years.",
                    f"গত {total} বছরের মধ্যে {pos} বছর মুনাফা করেছে।")
    return None


# ---------------------------------------------------------------------------
# Ownership
# ---------------------------------------------------------------------------

def ownership_baseline(holdings: list[dict]) -> Optional[dict]:
    """The report the latest one (``holdings[0]``, newest first) is compared
    with: the newest at least OWNERSHIP_LOOKBACK_DAYS older, else the oldest."""
    if not holdings or len(holdings) < 2:
        return None

    def day(rec):
        try:
            return datetime.strptime(str((rec or {}).get("as_of_date") or "")[:10], "%Y-%m-%d")
        except ValueError:
            return None

    latest = day(holdings[0])
    if latest is not None:
        for rec in holdings[1:]:
            d = day(rec)
            if d is not None and (latest - d).days >= OWNERSHIP_LOOKBACK_DAYS:
                return rec
    return holdings[-1]


def _pct(rec: Optional[dict], key: str) -> Optional[float]:
    return _f((rec or {}).get(key))


def ownership_caption(sh: Optional[dict]) -> Optional[dict]:
    """Who controls the company, in one line. Government control is its own
    message — a state-owned company has no "sponsor" group by design, so 0%
    sponsors is not "limited alignment"."""
    if not sh:
        return None
    spon = _pct(sh, "sponsor_director_pct") or 0.0
    govt = _pct(sh, "govt_pct") or 0.0
    if govt >= GOVT_CONTROL_PCT:
        g = round(govt)
        return {"tone": "neutral",
                "en": f"The government owns {g}% of the shares and controls the company, so there is no separate sponsor group.",
                "bn": f"সরকার {g}% শেয়ারের মালিক এবং কোম্পানিটি সরকারের নিয়ন্ত্রণে, তাই আলাদা উদ্যোক্তা গোষ্ঠী নেই।"}
    r = round(spon)
    gov_en = f" The government also holds {round(govt)}%." if govt >= 5 else ""
    gov_bn = f" সরকারেরও {round(govt)}% শেয়ার আছে।" if govt >= 5 else ""
    if spon >= 50:
        en, bn = (f"Sponsors and directors own {r}% of the shares. Much of their own money depends on the company doing well.",
                  f"উদ্যোক্তা-পরিচালকদের হাতে {r}% শেয়ার। কোম্পানির সাফল্যের ওপর তাঁদের নিজের অনেক টাকা নির্ভর করছে।")
    elif spon >= 30:
        en, bn = (f"Sponsors and directors own {r}% of the shares, a healthy stake in their own company.",
                  f"উদ্যোক্তা-পরিচালকদের হাতে {r}% শেয়ার, নিজেদের কোম্পানিতে এটি ভালো অংশ।")
    elif spon >= 20 or govt + spon >= 30:
        en, bn = (f"Sponsors and directors own {r}% of the shares. This is on the low side.",
                  f"উদ্যোক্তা-পরিচালকদের হাতে {r}% শেয়ার। এটি তুলনামূলক কম।")
    else:
        en, bn = (f"Sponsors and directors own only {r}% of the shares, so little of their own money is at stake.",
                  f"উদ্যোক্তা-পরিচালকদের হাতে মাত্র {r}% শেয়ার, অর্থাৎ কোম্পানিতে তাঁদের নিজের টাকা কম খাটছে।")
    return {"tone": "neutral", "en": en + gov_en, "bn": bn + gov_bn}


def ownership_change(sh: Optional[dict], prev: Optional[dict],
                     since_en: Optional[str] = None, since_bn: Optional[str] = None) -> Optional[dict]:
    """Read of the move between two shareholding snapshots.

    "People close to the company are buying" is said ONLY when the sponsor /
    director stake itself rose — an institutions' rise is reported as that
    (ACMELAB: sponsors -2.0 pp, institutions +2.5 pp used to read as insiders
    buying). A sponsor move above OWNERSHIP_JUMP_PP is flagged for checking."""
    if not sh or not prev:
        return None
    since_en = f" since {since_en}" if since_en else " since the last report"
    since_bn = f"{since_bn}-এর পর থেকে " if since_bn else "আগের প্রতিবেদনের পর থেকে "

    def move(key):
        a, b = _pct(prev, key), _pct(sh, key)
        if a is None or b is None:
            return None
        return a, b, b - a

    spon = move("sponsor_director_pct")
    others = [(k, w_en, w_bn, move(k)) for k, w_en, w_bn in (
        ("institute_pct", "institutions", "প্রতিষ্ঠানগুলো"),
        ("foreign_pct", "foreign investors", "বিদেশি বিনিয়োগকারীরা"),
    )]
    others = [(k, e, b, m) for k, e, b, m in others if m and abs(m[2]) >= OWNERSHIP_MOVE_PP]

    if spon and abs(spon[2]) >= OWNERSHIP_MOVE_PP:
        a, b, d = spon
        A, B, D = _r(a), _r(b), _r(abs(d))
        if abs(d) > OWNERSHIP_JUMP_PP:
            return {"tone": "watch", "key": "sponsor_jump",
                    "en": f"Please check this. The sponsors' and directors' holding moved from {A}% to {B}%{since_en}, "
                          f"a change of {D} points. A move this large is often a change in how holders are grouped, "
                          f"not real buying, so read the company's notice before treating it as a good sign.",
                    "bn": f"এটি যাচাই করে নিন। {since_bn}উদ্যোক্তা-পরিচালকদের শেয়ার {A}% থেকে {B}% হয়েছে, {D} পয়েন্টের পরিবর্তন। "
                          f"এত বড় পরিবর্তন অনেক সময় আসল কেনাবেচা নয়, শেয়ারধারীদের শ্রেণি বদল। ভালো লক্ষণ ধরার আগে কোম্পানির ঘোষণাটি পড়ে নিন।"}
        if d > 0:
            return {"tone": "positive", "key": "sponsor_up",
                    "en": f"Sponsors and directors raised their holding from {A}% to {B}%{since_en}. "
                          f"The people who run the company are buying more of it, which is a good sign.",
                    "bn": f"{since_bn}উদ্যোক্তা-পরিচালকরা তাঁদের অংশ {A}% থেকে বাড়িয়ে {B}% করেছেন। "
                          f"কোম্পানি যাঁরা চালান তাঁরাই আরও কিনছেন, যা ভালো লক্ষণ।"}
        tail_en = tail_bn = ""
        up = next(((e, bn, m) for _, e, bn, m in others if m[2] > 0), None)
        if up:
            tail_en = f" Over the same time, {up[0]} raised theirs to {_r(up[2][1])}%."
            tail_bn = f" একই সময়ে {up[1]} তাঁদের অংশ বাড়িয়ে {_r(up[2][1])}% করেছে।"
        return {"tone": "watch", "key": "sponsor_down",
                "en": f"Sponsors and directors lowered their holding from {A}% to {B}%{since_en}. "
                      f"It is worth finding out why.{tail_en}",
                "bn": f"{since_bn}উদ্যোক্তা-পরিচালকরা তাঁদের অংশ {A}% থেকে কমিয়ে {B}% করেছেন। "
                      f"কেন কমালেন, তা জেনে নেওয়া ভালো।{tail_bn}"}

    if not others:
        return None
    k, w_en, w_bn, (a, b, d) = max(others, key=lambda t: abs(t[3][2]))
    A, B = _r(a), _r(b)
    if d > 0:
        return {"tone": "positive", "key": f"{k}_up",
                "en": f"{w_en[0].upper() + w_en[1:]} raised their holding from {A}% to {B}%{since_en}, which is a good sign.",
                "bn": f"{since_bn}{w_bn} তাঁদের অংশ {A}% থেকে বাড়িয়ে {B}% করেছে, যা ভালো লক্ষণ।"}
    return {"tone": "watch", "key": f"{k}_down",
            "en": f"{w_en[0].upper() + w_en[1:]} lowered their holding from {A}% to {B}%{since_en}. It is worth finding out why.",
            "bn": f"{since_bn}{w_bn} তাঁদের অংশ {A}% থেকে কমিয়ে {B}% করেছে। কেন কমাল, তা জেনে নেওয়া ভালো।"}


# ---------------------------------------------------------------------------
# Governance / regulatory red flags from the news feed
# ---------------------------------------------------------------------------

# (key, pattern over "title + body", English, Bengali). Matched case-insensitively.
_GOVERNANCE_RULES = [
    ("qualified_opinion",
     re.compile(r"(?<!un)qualified\s+(?:audit\s+)?opinion", re.IGNORECASE),
     "The auditor gave a qualified opinion on the latest accounts, meaning some figures could not be fully confirmed.",
     "নিরীক্ষক সর্বশেষ হিসাবে শর্তসাপেক্ষ মতামত দিয়েছেন, অর্থাৎ কিছু হিসাব পুরোপুরি নিশ্চিত করা যায়নি।"),
    ("going_concern",
     re.compile(r"going\s+concern", re.IGNORECASE),
     "The auditor raised doubts about whether the business can keep running.",
     "ব্যবসা চালিয়ে যেতে পারবে কি না, তা নিয়ে নিরীক্ষক সন্দেহ প্রকাশ করেছেন।"),
    # A company-specific step by the regulator — "pursuant to the direction of the
    # BSEC ... postponed" (NAVANAPHAR), "BSEC ... decided to reject" (AL-HAJTEX),
    # an enquiry committee (MITHUNKNIT). Routine consents and citations of a
    # general "BSEC Directive No. ..." are not matched.
    ("bsec_action",
     re.compile((
         r"(?:direction|instruction|order)\s+of\s+the\s+(?:BSEC|Bangladesh\s+Securities\s+(?:and|&)\s+Exchange\s+Commission)"
         r"|\b(?:BSEC|Bangladesh\s+Securities\s+(?:and|&)\s+Exchange\s+Commission)\b[^.]{0,160}?"
         r"\b(?:directed|instructed|ordered|rejected|decided\s+to\s+reject|declined|not\s+in\s+a\s+position|"
         r"froze|frozen|penali[sz]ed|fined|show[- ]cause|enquiry\s+committee|inquiry\s+committee|investigat\w+)"
     ), re.IGNORECASE),
     "The market regulator, BSEC, gave the company an instruction or turned down one of its requests.",
     "নিয়ন্ত্রক সংস্থা বিএসইসি কোম্পানিটিকে নির্দেশনা দিয়েছে বা এর কোনো আবেদন নাকচ করেছে।"),
    ("board_postponed",
     re.compile(r"(?:board\s+meetings?|meetings?\s+of\s+the\s+board)[^.]{0,160}?postpone\w*"
                r"|postpone\w*\s+of\s+board\s+meeting", re.IGNORECASE),
     "A board meeting was postponed.",
     "পরিচালনা পর্ষদের একটি সভা স্থগিত হয়েছে।"),
    ("agm_postponed",
     re.compile(r"(?:annual\s+general\s+meeting|\bAGM\b)[^.]{0,160}?postpone\w*"
                r"|postpone\w*\s+of\s+(?:the\s+)?(?:\d+\w*\s+)?AGM", re.IGNORECASE),
     "The annual general meeting (AGM) was postponed.",
     "এজিএম স্থগিত হয়েছে।"),
    ("penalty",
     re.compile(r"\b(?:penalised|penalized|penalty|fined)\b", re.IGNORECASE),
     "The company was fined or penalised.",
     "কোম্পানিকে জরিমানা করা হয়েছে।"),
]


def _as_dt(v) -> Optional[datetime]:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str) and v:
        try:
            d = datetime.fromisoformat(v.replace("Z", "+00:00"))
            return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


def governance_items(news: list[dict], now: Optional[datetime] = None, days: int = 365) -> list[dict]:
    """One watch-out per kind of governance / regulatory event in the last year."""
    now = _as_dt(now) or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    found: dict[str, tuple[datetime, dict]] = {}
    for n in news or []:
        when = _as_dt(n.get("post_date"))
        if when is not None and when < cutoff:
            continue
        text = f"{n.get('title') or ''}. {n.get('body') or n.get('news') or ''}"
        for key, pat, en, bn in _GOVERNANCE_RULES:
            if not pat.search(text):
                continue
            if key in found and when is not None and found[key][0] >= when:
                continue
            date_en = f" ({when.strftime('%d %b %Y').lstrip('0')})" if when else ""
            date_bn = f" ({when.day} {_MONTH_BN_FULL[when.month]} {when.year})" if when else ""
            found[key] = (when or now, item(key, "watch", en[:-1] + date_en + ".", bn[:-1] + date_bn + "।"))
    order = [k for k, *_ in _GOVERNANCE_RULES]
    # A BSEC action that postponed a board meeting is one event — keep the regulator line.
    if "bsec_action" in found and "board_postponed" in found:
        found.pop("board_postponed")
    return [found[k][1] for k in order if k in found]


# ---------------------------------------------------------------------------
# Valuation — the ONE verdict every box on the page uses
# ---------------------------------------------------------------------------

def valuation_verdict(p4: Optional[float]) -> Optional[str]:
    p4 = _f(p4)
    if p4 is None:
        return None
    if p4 >= CHEAP_P4:
        return "cheap"
    if p4 >= EXPENSIVE_P4:
        return "fair"
    return "expensive"


def own_pe_label(years: Optional[int], listing_year: Optional[int],
                 last_year: Optional[int]) -> Optional[dict]:
    """'5-year average' only when five years are behind it; a younger listing
    gets 'average since listing (2022)'."""
    n = _year(years) or 0
    if n < 2:
        return None
    ly = _year(listing_year)
    last_year = _year(last_year)
    # Listed inside the 5-year window: the history IS "since listing", however
    # many of those years carried a P/E (NAVANAPHAR: listed 2022, 3 P/E years).
    if ly is not None and last_year is not None and last_year - ly + 1 <= 5:
        return {"en": f"average since listing ({ly})", "bn": f"তালিকাভুক্তির ({ly}) পর থেকে গড়",
                "short_en": "average since listing", "short_bn": "তালিকাভুক্তির পর থেকে গড়"}
    return {"en": f"{n}-year average", "bn": f"{n} বছরের গড়",
            "short_en": f"{n}-year average", "short_bn": f"{n} বছরের গড়"}


def eps_basis_label(score_row: dict) -> Optional[dict]:
    """Which EPS the P/E is on — 'last 12 months to Mar 2026' or 'FY2025'."""
    sr = score_row or {}
    if sr.get("eps_basis") == "ttm" and sr.get("interim_period_end"):
        try:
            end = datetime.fromisoformat(str(sr["interim_period_end"])[:10])
        except ValueError:
            end = None
        if end:
            from backend.services.interim_service import _MONTH_ABBR, _MONTH_BN
            return {"basis": "ttm",
                    "en": f"last 12 months to {_MONTH_ABBR[end.month]} {end.year}",
                    "bn": f"{_MONTH_BN[end.month]} {end.year} পর্যন্ত শেষ 12 মাস",
                    "short_en": "last 12 months", "short_bn": "শেষ 12 মাস"}
    fy = _year(sr.get("fy_eps_year"))
    if fy:
        return {"basis": "fy", "en": f"FY{fy}", "bn": f"{fy} অর্থবছর",
                "short_en": f"FY{fy}", "short_bn": f"{fy} অর্থবছর"}
    return None


# ---------------------------------------------------------------------------
# Health Check wording overrides (the pillar triplets stay in the frontend)
# ---------------------------------------------------------------------------

def _row(status, headline, one, more, headline_bn, one_bn, more_bn) -> dict:
    return {"status": status, "headline": headline, "oneLine": one, "learnMore": more,
            "headlineBn": headline_bn, "oneLineBn": one_bn, "learnMoreBn": more_bn}


def health_overrides(score_row: dict, financials: list[dict], sector_class: str) -> dict[str, dict]:
    """{pillar_key: row} where the generic band text would contradict the numbers."""
    sr = score_row or {}
    out: dict[str, dict] = {}

    # p1 — "Weak Profit: loses money or barely breaks even" is wrong for a
    # company that made money every year (WALTONHIL). Middle wording instead.
    p1 = _f(sr.get("p1_biz"))
    pos, total = profit_years(financials)
    if p1 is not None and p1 < 4 and total >= 3 and pos == total:
        eps = [e for e in (_f(r.get("eps")) for r in financials or []) if e is not None][-total:]
        if eps and eps[-1] < eps[0] * 0.8:
            out["p1_biz"] = _row(
                "fair", "Profit is shrinking", "It makes a profit every year, but the profit is getting smaller.",
                "The company has not made a loss, but it now earns less for each share than it used to. It is worth watching whether profit recovers.",
                "মুনাফা কমছে", "প্রতি বছর মুনাফা করে, তবে মুনাফা কমে আসছে।",
                "কোম্পানিটি লোকসান করেনি, তবে আগের চেয়ে শেয়ারপ্রতি আয় কম। মুনাফা আবার বাড়ে কি না, তা দেখার বিষয়।")
        else:
            out["p1_biz"] = _row(
                "fair", "Uneven profit", "It makes a profit every year, but the amount changes a lot.",
                "The company has made a profit every year, but the amount changes a lot from year to year. It is worth watching the next year or two before investing a large amount.",
                "অসমান মুনাফা", "প্রতি বছর মুনাফা করে, তবে অঙ্কটা অনেক ওঠানামা করে।",
                "কোম্পানিটি প্রতি বছর মুনাফা করেছে, তবে অঙ্কটা বছর বছর অনেক বদলায়। বড় অঙ্কে বিনিয়োগের আগে আগামী এক-দুই বছর দেখে নেওয়া ভালো।")

    # p2 — lenders are judged on their capital cushion, not loans.
    p2 = _f(sr.get("p2_health"))
    if p2 is not None and sector_class in _LENDER_CLASSES:
        if p2 >= 7:
            out["p2_health"] = _row(
                "strong", "Strong capital", "It lends with plenty of its own money behind it.",
                "For a bank or finance company, borrowing is part of the business. What matters is how much of its own money stands behind the loans it gives, and here that amount is healthy.",
                "মূলধন শক্ত", "ঋণের পেছনে যথেষ্ট নিজস্ব টাকা আছে।",
                "ব্যাংক বা আর্থিক প্রতিষ্ঠানের জন্য ধার নেওয়া ব্যবসারই অংশ। আসল বিষয় হলো দেওয়া ঋণের পেছনে নিজের কতটা টাকা আছে, আর এখানে তা যথেষ্ট।")
        elif p2 >= 4:
            out["p2_health"] = _row(
                "fair", "Adequate capital", "Its own money behind its loans is enough, but not large.",
                "The bank has enough of its own money behind its loans, but not much extra room if many loans go bad.",
                "মূলধন চলনসই", "ঋণের পেছনে নিজস্ব টাকা যথেষ্ট, তবে বেশি নয়।",
                "ঋণের পেছনে ব্যাংকের নিজস্ব টাকা যথেষ্ট, তবে অনেক ঋণ খেলাপি হলে বাড়তি জায়গা কম।")
        else:
            out["p2_health"] = _row(
                "weak", "Thin capital", "Little of its own money stands behind its loans.",
                "Only a small amount of the bank's own money stands behind its loans, so bad loans can quickly hurt shareholders.",
                "মূলধন দুর্বল", "ঋণের পেছনে নিজস্ব টাকা কম।",
                "ঋণের পেছনে ব্যাংকের নিজস্ব টাকা সামান্য, তাই খেলাপি ঋণ দ্রুত শেয়ারহোল্ডারদের ক্ষতি করতে পারে।")
    elif p2 is not None:
        level = sr.get("debt_level")
        neg_cash = (_f(sr.get("interim_nocfps")) or 0) < 0
        if level == "over_mcap":
            out["p2_health"] = _row(
                "weak", "Too much debt", "Its loans are larger than the value of the whole company.",
                "The company owes more than the stock market says the whole company is worth. Heavy loans make a company fragile when business slows or interest rates rise.",
                "ঋণ অনেক বেশি", "ঋণ পুরো কোম্পানির বাজারমূল্যের চেয়েও বেশি।",
                "শেয়ারবাজারে পুরো কোম্পানির যে মূল্য, কোম্পানির দেনা তার চেয়েও বেশি। ব্যবসা কমলে বা সুদের হার বাড়লে বেশি ঋণ কোম্পানিকে নাজুক করে তোলে।")
        elif level == "over_reserve":
            out["p2_health"] = _row(
                "fair", "High debt", "Its loans are larger than the profit it has saved over the years.",
                "The company can pay its bills, but its loans are larger than the profit it has kept from past years. That leaves less room if business slows.",
                "ঋণ বেশি", "বছরের পর বছর জমানো মুনাফার চেয়ে ঋণ বেশি।",
                "কোম্পানি তার খরচ মেটাতে পারে, তবে আগের বছরগুলোর জমানো মুনাফার চেয়ে ঋণ বেশি। ব্যবসা কমলে হাতে জায়গা কম থাকবে।")
        elif p2 >= 7 and neg_cash:
            out["p2_health"] = _row(
                "fair", "Low debt, less cash", "Debt is low, but the business spent more cash than it brought in this year.",
                "The company owes little, but so far this year its day-to-day business has spent more cash than it brought in. It is worth watching whether that changes.",
                "ঋণ কম, নগদ কমছে", "ঋণ কম, তবে এ বছর ব্যবসায় যত নগদ এসেছে তার চেয়ে বেশি খরচ হয়েছে।",
                "কোম্পানির ঋণ কম, তবে এ বছর এ পর্যন্ত দৈনন্দিন ব্যবসায় যত নগদ এসেছে তার চেয়ে বেশি খরচ হয়েছে। পরিস্থিতি বদলায় কি না, তা দেখার বিষয়।")

    # p5 — "Strong Dividend" must mean a real amount, not just reliability.
    p5 = _f(sr.get("p5_div"))
    dy = _f(sr.get("div_yield_pct"))
    if p5 is not None and p5 >= 7 and dy is not None and dy < SMALL_YIELD_PCT:
        out["p5_div"] = _row(
            "fair", "Steady but small dividend", f"It pays every year, but only about {_r(dy)}% of the price.",
            "The company pays a dividend reliably, but at today's price the yearly cash is small. It suits investors who value steadiness more than income.",
            "নিয়মিত, তবে কম ডিভিডেন্ড", f"প্রতি বছর দেয়, তবে দামের তুলনায় মাত্র {_r(dy)}%।",
            "কোম্পানিটি নিয়মিত ডিভিডেন্ড দেয়, তবে আজকের দামে বছরের নগদ অঙ্ক কম। আয়ের চেয়ে স্থিরতাকে যাঁরা বেশি গুরুত্ব দেন, তাঁদের জন্য উপযোগী।")
    return out


# ---------------------------------------------------------------------------
# Good signs / Watch-outs
# ---------------------------------------------------------------------------

# A good sign is dropped when any of these watch-outs is present.
_CONTRADICTS = {
    "cash_from_business": {"negative_cash_this_year"},
    "cheap_vs_history": {"pricey_vs_history"},
    "profit_every_year": {"loss_latest"},
    "profit_most_years": {"loss_latest"},
    "dividend_every_year": {"paid_more_than_earned"},
    "profit_up_this_year": {"profit_down_this_year", "slowing_this_year"},
}


def resolve_contradictions(items: list[dict]) -> list[dict]:
    watch = {i["key"] for i in items if i["tone"] == "watch"}
    return [i for i in items
            if not (i["tone"] == "good" and _CONTRADICTS.get(i["key"], set()) & watch)]


def build_items(score_row: Optional[dict], holdings: list[dict], financials: list[dict],
                company: dict, news: Optional[list[dict]] = None,
                sector_class: str = "GENERAL", now: Optional[datetime] = None) -> list[dict]:
    sr = score_row or {}
    out: list[dict] = []
    is_lender = sector_class in _LENDER_CLASSES

    # ---- Profits ---------------------------------------------------------
    py = profit_years_item(financials)
    if py:
        out.append(py)
    latest_eps = next((e for e in (_f(r.get("eps")) for r in reversed(financials or [])) if e is not None), None)
    if latest_eps is not None and latest_eps < 0:
        out.append(item("loss_latest", "watch", "It made a loss in the most recent year.",
                        "সর্বশেষ বছরে লোকসান করেছে।"))

    iy = _f(sr.get("interim_eps_yoy_pct"))
    fy_yoy = _f(sr.get("eps_yoy_pct"))
    lab_en, lab_bn = sr.get("interim_label_en"), sr.get("interim_label_bn")
    if iy is not None and lab_en:
        if iy <= -INTERIM_MOVE_PCT and fy_yoy is not None and fy_yoy > 0:
            out.append(item("slowing_this_year", "watch",
                            f"Profit rose last year, but this year it is down {_r(abs(iy))}% compared with the same months last year ({lab_en}).",
                            f"গত বছর মুনাফা বেড়েছিল, তবে এ বছর আগের বছরের একই সময়ের চেয়ে {_r(abs(iy))}% কম ({lab_bn})।"))
        elif iy <= -INTERIM_MOVE_PCT:
            out.append(item("profit_down_this_year", "watch",
                            f"Profit so far this year is down {_r(abs(iy))}% compared with the same months last year ({lab_en}).",
                            f"এ বছর এ পর্যন্ত মুনাফা আগের বছরের একই সময়ের চেয়ে {_r(abs(iy))}% কম ({lab_bn})।"))
        elif iy >= INTERIM_MOVE_PCT:
            out.append(item("profit_up_this_year", "good",
                            f"Profit so far this year is up {_r(iy)}% compared with the same months last year ({lab_en}).",
                            f"এ বছর এ পর্যন্ত মুনাফা আগের বছরের একই সময়ের চেয়ে {_r(iy)}% বেশি ({lab_bn})।"))
        q = _f(sr.get("interim_q_yoy_pct"))
        if q is not None and q <= -25 and iy > -INTERIM_MOVE_PCT:
            out.append(item("latest_quarter_down", "watch",
                            f"Profit in the latest quarter fell {_r(abs(q))}% from a year earlier.",
                            f"সর্বশেষ প্রান্তিকে মুনাফা আগের বছরের একই প্রান্তিকের চেয়ে {_r(abs(q))}% কম।"))

    # ---- Cash ------------------------------------------------------------
    nocf = _f(sr.get("interim_nocfps"))
    if nocf is not None and nocf < 0 and not is_lender:
        prev = _f(sr.get("interim_nocfps_prev"))
        prev_en = f", compared with {_taka(prev)} a year earlier" if prev is not None else ""
        prev_bn = f"; আগের বছর একই সময়ে ছিল {_taka(prev)}" if prev is not None else ""
        out.append(item("negative_cash_this_year", "watch",
                        f"This year the business spent more cash than it brought in ({_taka(nocf)} a share, {lab_en or 'latest report'}{prev_en}).",
                        f"এ বছর ব্যবসায় যত নগদ এসেছে তার চেয়ে বেশি খরচ হয়েছে (শেয়ারপ্রতি {_taka(nocf)}, {lab_bn or 'সর্বশেষ প্রতিবেদন'}{prev_bn})।"))
    elif (_f(sr.get("p2_cfo")) or 0) >= 4 and not is_lender:
        out.append(item("cash_from_business", "good", "Its day-to-day business brings in real cash.",
                        "দৈনন্দিন ব্যবসা থেকে সত্যিকারের নগদ টাকা আসে।"))

    # ---- Dividend --------------------------------------------------------
    if (_f(sr.get("p5_consist")) or 0) >= 7:
        out.append(item("dividend_every_year", "good", "It pays a dividend every year.",
                        "প্রতি বছর নিয়মিত ডিভিডেন্ড দেয়।"))
    payout = _f(sr.get("payout_latest_pct"))
    if payout is not None and payout > 100:
        out.append(item("paid_more_than_earned", "watch",
                        f"Last year it paid more in dividends than it earned ({_r(payout, 0)}% of profit). The extra came from savings.",
                        f"গত বছর আয়ের চেয়ে বেশি ডিভিডেন্ড দিয়েছে (মুনাফার {_r(payout, 0)}%)। বাড়তি অংশ এসেছে জমানো টাকা থেকে।"))
    elif payout is not None and payout > 90:
        out.append(item("high_payout", "watch",
                        f"It pays out {_r(payout, 0)}% of its profit as dividends. That may be hard to keep up.",
                        f"মুনাফার {_r(payout, 0)}% ডিভিডেন্ড হিসেবে দেয়। এই হার ধরে রাখা কঠিন হতে পারে।"))

    # ---- Valuation (own history) -----------------------------------------
    lbl = own_pe_label(sr.get("own_avg_pe_years"), sr.get("listing_year"), _year(sr.get("fy_eps_year")))
    hist_en = lbl["en"] if lbl else "its usual level"
    hist_bn = lbl["bn"] if lbl else "স্বাভাবিক মাত্রা"
    p4_pe = _f(sr.get("p4_pe"))
    if p4_pe is not None and p4_pe >= 8:
        out.append(item("cheap_vs_history", "good",
                        f"Its price is low compared with its own past. The P/E is below its {hist_en}.",
                        f"নিজের অতীতের তুলনায় দাম কম। পিই এর {hist_bn}-এর নিচে।"))
    elif p4_pe is not None and p4_pe <= 1.0 and score_row:
        out.append(item("pricey_vs_history", "watch",
                        f"Its price is high compared with its own past. The P/E is well above its {hist_en}.",
                        f"নিজের অতীতের তুলনায় দাম বেশি। পিই এর {hist_bn}-এর অনেক ওপরে।"))

    # ---- Ownership -------------------------------------------------------
    sh = holdings[0] if holdings else None
    if sh:
        spon = _pct(sh, "sponsor_director_pct") or 0.0
        govt = _pct(sh, "govt_pct") or 0.0
        if govt >= GOVT_CONTROL_PCT:
            out.append(item("govt_controlled", "good",
                            f"The government controls it with {round(govt)}% of the shares, a stable main owner.",
                            f"সরকারের হাতে {round(govt)}% শেয়ার, অর্থাৎ প্রধান মালিক স্থির।"))
        elif spon > 30:
            out.append(item("sponsor_alignment", "good",
                            f"Sponsors and directors own {round(spon)}% of the shares, so much of their own money is at stake.",
                            f"উদ্যোক্তা-পরিচালকদের হাতে {round(spon)}% শেয়ার, অর্থাৎ কোম্পানিতে তাঁদের নিজের অনেক টাকা খাটছে।"))
        base = ownership_baseline(holdings)
        chg = ownership_change(sh, base)
        if chg and chg.get("key") == "sponsor_jump":
            a, b = _pct(base, "sponsor_director_pct"), _pct(sh, "sponsor_director_pct")
            # A big move either way is flagged; the verb follows the direction
            # (a 42% -> 32% fall used to read "jumped").
            up = a is not None and b is not None and b > a
            out.append(item("sponsor_jump", "watch",
                            f"The sponsors' and directors' holding {'rose' if up else 'fell'} from {_r(a)}% to {_r(b)}%. This is unusually large, so check whether the holders were simply regrouped.",
                            f"উদ্যোক্তা-পরিচালকদের শেয়ার {_r(a)}% থেকে {'বেড়ে' if up else 'কমে'} {_r(b)}% হয়েছে। এটি অস্বাভাবিক বড় পরিবর্তন, তাই শেয়ারধারীদের শ্রেণি বদল হয়েছে কি না যাচাই করুন।"))

    # ---- Debt (not for lenders / insurers) -------------------------------
    if sector_class not in _NO_DEBT_FLAG_CLASSES:
        loan = _f(company.get("total_loan_mn"))
        level = sr.get("debt_level")
        mcap = _f(sr.get("mcap_mn"))
        res = _f(company.get("reserve_surplus_mn"))
        if level == "over_mcap" and loan is not None and mcap:
            out.append(item("loan_over_mcap", "watch",
                            f"Its loans (৳{_crore(loan)} crore) are larger than the value of the whole company (৳{_crore(mcap)} crore).",
                            f"এর ঋণ (৳{_crore(loan)} কোটি) পুরো কোম্পানির বাজারমূল্যের (৳{_crore(mcap)} কোটি) চেয়েও বেশি।"))
        elif level == "over_reserve" and loan is not None and res:
            out.append(item("loan_over_reserve", "watch",
                            f"Its loans (৳{_crore(loan)} crore) are larger than the profit it has kept over the years (৳{_crore(res)} crore).",
                            f"এর ঋণ (৳{_crore(loan)} কোটি) বছরের পর বছর জমানো মুনাফার (৳{_crore(res)} কোটি) চেয়ে বেশি।"))

    # ---- Category, governance, data freshness ----------------------------
    cat = (company.get("market_category") or "").strip()
    # "-" is DSE's blank (no category shown), not a tier below A.
    if cat and cat != "-" and cat.upper() != "A":
        out.append(item("category_not_a", "watch",
                        f"It is in category {cat}, not the top category (A).",
                        f"এটি {cat} ক্যাটাগরিতে আছে, সবচেয়ে ভালো A ক্যাটাগরিতে নয়।"))
    out.extend(governance_items(news or [], now=now))
    nfy = _year(sr.get("newer_dividend_fy"))
    have = _year(sr.get("fy_eps_year"))
    if nfy and have:
        out.append(item("data_behind", "watch",
                        f"A dividend for FY{nfy} has been declared, but our yearly figures stop at FY{have}. Some numbers here are a year old.",
                        f"{nfy} অর্থবছরের ডিভিডেন্ড ঘোষণা হয়েছে, তবে আমাদের বার্ষিক হিসাব {have} অর্থবছর পর্যন্ত। এখানকার কিছু সংখ্যা এক বছর পুরোনো।"))

    return resolve_contradictions(out)


def build_flags(score_row, holdings, financials, company, news=None,
                sector_class: str = "GENERAL", now=None) -> dict:
    """The /api/company payload's ``signal_flags``: English strings in
    green/red (back-compat for the OG card and the assistant) + bilingual items."""
    items = build_items(score_row, holdings, financials, company, news, sector_class, now)
    return {
        "green": [i["en"] for i in items if i["tone"] == "good"],
        "red": [i["en"] for i in items if i["tone"] == "watch"],
        "items": items,
    }
