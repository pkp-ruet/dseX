"""What the auditor actually said — the reason behind a qualified opinion
(2026-11-05, audit RP8 / round 3).

DSE posts a qualified opinion as one line plus a PDF
(dsebd.org/Auditors_opinion/YEAR/CODE_YEAR.pdf). 109 companies (30%) carried
one, all treated as the same red flag: a note about the staff provident fund
weighed as much as deposits at failing banks with no loss written down
(MPETROLEUM, JAMUNAOIL, PADMAOIL). This module reads the "Basis for Qualified
Opinion" part of the PDF's text and sorts its reasons into serious and minor.

Pure: text in, verdict out. The fetching lives in scrapers/auditor_opinion.py,
the stored verdicts in the `auditor_opinions` collection.

Severity:
  * serious  — any serious reason (going concern, losses not written down,
               money that may not be recovered, figures the auditor couldn't
               check, money to related companies, wrong past accounts, a plant
               that stopped, possible misuse of money)
  * minor    — only minor reasons (provident fund, gratuity, workers' profit
               fund, deferred tax, leases, share money, VAT / tax, unclaimed
               dividend)
  * unknown  — no reason found (a scanned PDF, an unusual layout)
Only "serious" (and going concern) caps the grade; "unknown" keeps today's
red flag but no cap (user decision 2026-11-05: cap once the PDF shows a
serious reason).
"""
from __future__ import annotations

import re
from typing import Optional

# Where the reasons are: from the qualification heading to the next section.
# The heading is "Basis for Qualified Opinion"; a PDF without it (SONALIPAPR)
# repeats "Qualified Opinion" as its section title after the cover lines that
# name every paragraph ("has given the Qualified Opinion & Emphasis of Matters").
_BASIS_HEADING = re.compile(r"basis\s+for\s+(?:qualified|adverse|disclaimer\s+of)\s+opinion", re.I)
_QUALIFIED = re.compile(r"qualified\s+opinion", re.I)
_BASIS_END = re.compile(
    r"emphasis\s+of\s+matters?|other\s+matters?|key\s+audit\s+matters?|material\s+uncertainty"
    r"|responsibilities\s+of|report\s+on\s+other\s+legal|we\s+conducted\s+our\s+audit", re.I)

SERIOUS = {
    "going_concern": re.compile(r"going\s+concern", re.I),
    "credit_loss": re.compile(
        r"expected\s+credit\s+loss|credit\s+risk|impairment|allowance\s+for"
        r"|(?:no|not)\s+(?:such\s+)?(?:been\s+)?(?:provision|allowance)", re.I),
    "recovery": re.compile(r"recoverab|uncollect|doubtful\s+of\s+recover|not\s+been\s+recovered"
                           r"|no\s+significant\s+recovery|long\s+outstanding", re.I),
    "evidence": re.compile(r"(?:could\s+not|unable\s+to|not\s+able\s+to)\s+(?:obtain|verify|confirm|physically)"
                           r"|could\s+(?:not\s+)?be\s+(?:shown|produced|verified)|no\s+(?:paper|document)s?\b", re.I),
    "related_party": re.compile(r"related\s+part(?:y|ies)|sister\s+concerns?", re.I),
    "restated": re.compile(r"restat|under-?\s?stated|over-?\s?stated", re.I),
    "idle_plant": re.compile(r"non-?\s*operational|shut\s*down|ceased\s+(?:its\s+)?(?:operation|production)", re.I),
    "fraud": re.compile(r"misappropriat|fraud|embezzl", re.I),
}
MINOR = {
    "provident_fund": re.compile(r"provident\s+fund", re.I),
    "gratuity": re.compile(r"gratuity", re.I),
    "wppf": re.compile(r"workers'?\s*profit|\bwppf\b|participation\s+fund", re.I),
    "deferred_tax": re.compile(r"deferred\s+tax", re.I),
    "lease": re.compile(r"ifrs\s*16|\blease", re.I),
    "share_money": re.compile(r"share\s+money\s+deposit", re.I),
    "vat_tax": re.compile(r"\bvat\b|income\s+tax|tax\s+(?:provision|liabilit)", re.I),
    "unclaimed": re.compile(r"unclaimed|unpaid\s+dividend", re.I),
}

# Plain words for each reason (docs/voice.md), the report names them.
REASON_WORDS = {
    "going_concern": ("doubt that the business can keep running", "ব্যবসা চালিয়ে যেতে পারবে কি না, সে নিয়ে সন্দেহ"),
    "credit_loss": ("losses it has not written down", "যে লোকসান এখনো হিসাবে ধরা হয়নি"),
    "recovery": ("money owed to it that may never come back", "পাওনা টাকা, যা হয়তো আর ফেরত আসবে না"),
    "evidence": ("figures the auditor could not check", "যেসব হিসাব নিরীক্ষক যাচাই করতে পারেননি"),
    "related_party": ("money given to related companies", "সম্পর্কিত কোম্পানিকে দেওয়া টাকা"),
    "restated": ("past accounts that were wrong", "আগের বছরের ভুল হিসাব"),
    "idle_plant": ("a plant that has stopped running", "বন্ধ হয়ে থাকা কারখানা বা প্ল্যান্ট"),
    "fraud": ("possible misuse of money", "টাকার সম্ভাব্য অপব্যবহার"),
    "provident_fund": ("the staff provident fund", "কর্মীদের প্রভিডেন্ট ফান্ড"),
    "gratuity": ("staff gratuity", "কর্মীদের গ্র্যাচুইটি"),
    "wppf": ("the workers' profit fund", "শ্রমিকদের মুনাফা অংশগ্রহণ তহবিল"),
    "deferred_tax": ("how it counted deferred tax", "ডেফার্ড ট্যাক্সের হিসাব"),
    "lease": ("how it booked its leases", "লিজের হিসাব"),
    "share_money": ("share money not yet turned into shares", "শেয়ারে রূপান্তর না হওয়া শেয়ার মানি"),
    "vat_tax": ("VAT and tax", "ভ্যাট আর কর"),
    "unclaimed": ("unclaimed dividends", "দাবি না করা ডিভিডেন্ড"),
}


def basis_text(text: str) -> str:
    """The qualification's reasons: from its heading to the next section, else
    the first 3,000 characters."""
    t = re.sub(r"\s+", " ", text or "")
    m = _BASIS_HEADING.search(t)
    if not m:
        hits = list(_QUALIFIED.finditer(t))
        m = hits[-1] if hits else None
    if not m:
        return t[:3000]
    rest = t[m.end():]
    e = _BASIS_END.search(rest)
    return rest[: e.start()] if e and e.start() > 40 else rest[:3000]


def classify(text: str, title: str = "") -> dict:
    """{severity, going_concern, reasons, minor} from the PDF's text (and the
    post's title, which names a going-concern paragraph even when the PDF is
    a scan)."""
    basis = basis_text(text)
    serious = [k for k, rx in SERIOUS.items() if rx.search(basis)]
    minor = [k for k, rx in MINOR.items() if rx.search(basis)]
    going = "going_concern" in serious or bool(SERIOUS["going_concern"].search(title or ""))
    if going and "going_concern" not in serious:
        serious.insert(0, "going_concern")
    severity = "serious" if serious else "minor" if minor else "unknown"
    return {"severity": severity, "going_concern": going, "reasons": serious, "minor": minor,
            "basis_excerpt": basis[:1200]}


def reason_phrase(keys: list[str], lang: str = "en", limit: int = 2) -> Optional[str]:
    """ "losses it has not written down and figures the auditor could not
    check" — the first `limit` reasons in words."""
    words = [REASON_WORDS[k][0 if lang == "en" else 1] for k in keys if k in REASON_WORDS][:limit]
    if not words:
        return None
    if lang == "en":
        return words[0] if len(words) == 1 else f"{words[0]} and {words[1]}"
    return words[0] if len(words) == 1 else f"{words[0]} আর {words[1]}"
