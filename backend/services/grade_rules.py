"""
A company's group, decided by rules (2026-11-05, user decision) — replaces the
75 / 60 / 45 score lines as what puts a company in a group. Pure: no DB.

Why: the score is a weighted average, so strength on one check hid a weakness
on another, and the group names said things the checks didn't (on 2026-11-05,
48 of 353 companies: "Strong all round" on two strong checks, "Mostly strong"
with a weak one, "Mostly weak" weak on one check or none — and "Mostly weak"
is a Sell). Now the name is true by construction.

1. **Each business check gets a word.** Strong at ``STRONG_AT`` (7) or more,
   weak under ``WEAK_BELOW`` (4), else fair. On 2026-11-05 data those lines
   meant: profit strong = a profit in each of the last 5 years, ROE ~15%;
   finances strong = no loans above saved profit; dividend weak = cash in 3 or
   fewer of 5 years, paying out more than it earns. A check with no figures at
   all (finances / business strength with no coverage — insurers' business
   strength) is left out, not counted as fair or weak.
2. **The group from the words** (``checks_group``):
   * Strong all round — strong on profit and on at least 2 more, weak on none.
   * Mostly strong — profit not weak; strong on 2+ with none weak, or on 3+
     with one weak.
   * Mostly weak — weak on 2+ and on more checks than it is strong on; or weak
     on profit and strong on nothing.
   * Mixed — the rest.
3. **Serious problems override** (``PROBLEMS``): one holds the group at Mixed
   at best; two or more make it Mostly weak.
4. **Settling** (``group_for``): a group moves only once the checks are
   ``CHECK_SETTLE`` past their lines; problems take effect at once.

The published score is then held inside its group's band (``held_score``), so
every reader of ``tiers.tier_key(score)`` sees the group and the ranking runs
group first. The score only orders companies inside a group.
"""
from __future__ import annotations

import math
from typing import Optional

STRONG_AT = 7.0
WEAK_BELOW = 4.0
# A group moves only once a check is this far past its line (no flicker for
# a check parked on 7.0 / 4.0).
CHECK_SETTLE = 0.3
# How close to a line counts as "close" for the stock page's watch line.
NEAR_LINE = 1.0

# The four business checks, in order of weight (profit leads).
CHECKS = ("p1_biz", "p2_health", "p3_moat", "p5_div")
# A check is left out when its part had no figures at all.
_COVERAGE = {"p2_health": "p2_coverage", "p3_moat": "p3_coverage"}

ORDER = ("weak", "average", "good", "excellent")   # worst → best
# The score range each group is shown in. The tops stop at .4 so a held score
# never rounds to the next group's whole number on screen ("75" beside
# "Mostly strong").
BANDS = {
    "excellent": (75.0, 100.0),
    "good": (60.0, 74.4),
    "average": (45.0, 59.4),
    "weak": (0.0, 44.4),
}
# A score held at its band's edge keeps its order inside this sliver, so
# companies held at the same edge don't tie (the ranking would sort them A-Z).
_HOLD_SLIVER = 0.09

# Serious problems, in the order they are named. Keys from
# scoring_service.grade_caps (going_concern, audit_serious, factory) plus the
# row's own facts.
PROBLEMS = ("going_concern", "audit_serious", "factory", "loans", "loss",
            "old_accounts", "z_category", "thin_data")

PROBLEM_WORDS = {
    "going_concern": ("its auditor doubts the business can keep running",
                      "নিরীক্ষক সন্দেহ করছেন ব্যবসাটি চালু রাখা যাবে কি না"),
    "audit_serious": ("its auditor did not fully approve its accounts, for a serious reason",
                      "নিরীক্ষক গুরুতর কারণে এর হিসাব পুরোপুরি অনুমোদন করেননি"),
    "factory": ("DSE found its factory closed",
                "ডিএসই এর কারখানা বন্ধ পেয়েছে"),
    "loans": ("its loans are bigger than the whole company's market value",
              "এর ঋণ কোম্পানির পুরো বাজারমূল্যের চেয়েও বেশি"),
    "loss": ("it made a loss in its latest results",
             "সর্বশেষ ফলে এর লোকসান হয়েছে"),
    "old_accounts": ("its latest accounts are 2 or more years old",
                     "এর সর্বশেষ হিসাব 2 বছর বা তার বেশি পুরোনো"),
    "z_category": ("DSE has put it in the Z category",
                   "ডিএসই একে জেড ক্যাটাগরিতে রেখেছে"),
    "thin_data": ("we have too few of its figures to call it strong",
                  "একে শক্তিশালী বলার মতো যথেষ্ট তথ্য আমাদের হাতে নেই"),
}

# What each group means — the rule in words. Mirrored by frontend
# lib/constants.ts TIER_MEANINGS / TIER_MEANINGS_BN (test_agreement).
GROUP_RULES = {
    "excellent": ("Strong on profit and on at least 2 more checks, weak on none",
                  "মুনাফায় শক্তিশালী, আরও অন্তত 2টি যাচাইয়ে শক্তিশালী, কোনোটিতে দুর্বল নয়"),
    "good": ("Strong on 2 checks with none weak, or on 3 with one weak (never profit)",
             "2টি যাচাইয়ে শক্তিশালী আর কোনোটিতে দুর্বল নয়, বা 3টিতে শক্তিশালী আর 1টিতে দুর্বল (মুনাফা নয়)"),
    "average": ("In between, or held here by one serious problem",
                "মাঝামাঝি, বা একটি গুরুতর সমস্যার কারণে এখানে আটকে আছে"),
    "weak": ("Weak on more checks than it is strong on, weak on profit with nothing strong, or two serious problems",
             "যতগুলোতে শক্তিশালী তার চেয়ে বেশি যাচাইয়ে দুর্বল, বা মুনাফায় দুর্বল আর কিছুতেই শক্তিশালী নয়, বা দুটি গুরুতর সমস্যা"),
}


def _num(v) -> Optional[float]:
    if v is None or isinstance(v, bool):
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) else f


def check_values(row: dict) -> dict[str, float]:
    """The checks this company can be judged on: {check key: 0-10}. A check
    with no figures at all is left out (insurers' business strength)."""
    out = {}
    for k in CHECKS:
        v = _num(row.get(k))
        if v is None:
            continue
        cov = _COVERAGE.get(k)
        if cov is not None:
            c = _num(row.get(cov))
            if c is not None and c <= 0:
                continue
        out[k] = v
    return out


def word(v: float, hi: float = STRONG_AT, lo: float = WEAK_BELOW) -> str:
    return "strong" if v >= hi else "weak" if v < lo else "fair"


def check_words(values: dict[str, float], hi: float = STRONG_AT, lo: float = WEAK_BELOW) -> dict[str, str]:
    return {k: word(v, hi, lo) for k, v in values.items()}


def checks_group(values: dict[str, float], hi: float = STRONG_AT, lo: float = WEAK_BELOW) -> str:
    """The group the four checks alone give (step 2)."""
    words = check_words(values, hi, lo)
    s = sum(1 for w in words.values() if w == "strong")
    w = sum(1 for w in words.values() if w == "weak")
    profit = words.get("p1_biz")
    p_strong, p_weak = profit == "strong", profit in (None, "weak")
    if p_strong and w == 0 and s >= 3:
        return "excellent"
    if not p_weak and ((s >= 2 and w == 0) or (s >= 3 and w == 1)):
        return "good"
    if (w >= 2 and w > s) or (p_weak and s == 0):
        return "weak"
    return "average"


def with_problems(group: str, problems: list[str]) -> str:
    """Step 3: one serious problem → Mixed at best; two or more → Mostly weak."""
    if len(problems) >= 2:
        return "weak"
    if problems and ORDER.index(group) > ORDER.index("average"):
        return "average"
    return group


def _final(values, problems, hi, lo) -> str:
    return with_problems(checks_group(values, hi, lo), problems)


def group_for(values: dict[str, float], problems: list[str], prev: Optional[str] = None) -> str:
    """The company's group, settled against ``prev`` (its group last time):
    a move down needs the checks ``CHECK_SETTLE`` under their lines, a move up
    ``CHECK_SETTLE`` over them. Never past the strict answer, never the wrong
    way. Problems are facts and move it at once."""
    strict = _final(values, problems, STRONG_AT, WEAK_BELOW)
    if prev not in ORDER or prev == strict:
        return strict
    p, s = ORDER.index(prev), ORDER.index(strict)
    if s < p:   # down: would easier lines keep it higher?
        lenient = ORDER.index(_final(values, problems, STRONG_AT - CHECK_SETTLE, WEAK_BELOW - CHECK_SETTLE))
        return ORDER[min(p, lenient)]
    harsh = ORDER.index(_final(values, problems, STRONG_AT + CHECK_SETTLE, WEAK_BELOW + CHECK_SETTLE))
    return ORDER[max(p, harsh)]


def held_score(score: Optional[float], group: str) -> Optional[float]:
    """The published score, held inside its group's band so tier_key(score)
    reads the group. The score still orders companies inside a group: one
    inside its band is untouched (1 decimal); one held at an edge sits just
    inside it, in the order of its own score (2 decimals) — held down from
    above at the top, lifted from below at the bottom."""
    s = _num(score)
    if s is None or group not in BANDS:
        return s
    lo, hi = BANDS[group]
    if s > hi:
        return round(hi - (100.0 - min(s, 100.0)) / (100.0 - hi) * _HOLD_SLIVER, 2)
    if s < lo:
        return round(lo + max(s, 0.0) / lo * _HOLD_SLIVER, 2)
    return round(s, 1)


def problem_keys(caps: list[str], *, loss_now: bool, old_accounts: bool,
                 z_category: bool, thin_data: bool) -> list[str]:
    """Every serious problem, in PROBLEMS order (no repeats)."""
    found = set(caps or [])
    if loss_now:
        found.add("loss")
    if old_accounts:
        found.add("old_accounts")
    if z_category:
        found.add("z_category")
    if thin_data:
        found.add("thin_data")
    return [k for k in PROBLEMS if k in found]


# ---------------------------------------------------------------------------
# Words for the stock page
# ---------------------------------------------------------------------------

def _join(parts: list[str], bn: bool) -> str:
    if len(parts) <= 1:
        return "".join(parts)
    if bn:
        return ", ".join(parts[:-1]) + " আর " + parts[-1]
    return ", ".join(parts[:-1]) + " and " + parts[-1]


def strict_group(values: dict[str, float], problems: list[str]) -> str:
    """The group today's checks and problems give, without settling."""
    return _final(values, problems, STRONG_AT, WEAK_BELOW)


def held_back_by(values: dict[str, float], problems: list[str], group: str) -> list[str]:
    """The serious problems that put the company in ``group`` below what its
    checks alone say (empty when the checks decided it, or settling holds it)."""
    if not problems:
        return []
    by_checks = checks_group(values)
    decided = with_problems(by_checks, problems)
    return list(problems) if decided == group and decided != by_checks else []


def near_line(values: dict[str, float], band: float = CHECK_SETTLE) -> list[str]:
    """Checks sitting within ``band`` of the strong or weak line."""
    return [k for k in CHECKS if k in values
            and (abs(values[k] - STRONG_AT) < band or abs(values[k] - WEAK_BELOW) < band)]


def problem_note(values: dict[str, float], problems: list[str], group: str,
                 words: dict[str, tuple[str, str]]) -> Optional[tuple[str, str]]:
    """(en, bn) when serious problems decided the group, else None. ``words``
    = tiers.GROUP_WORDS-style {group: (en, bn)}."""
    if not held_back_by(values, problems, group):
        return None
    by_checks = checks_group(values)
    reasons = [PROBLEM_WORDS[k] for k in problems if k in PROBLEM_WORDS][:3]
    en = _join([r[0] for r in reasons], False)
    bn = _join([r[1] for r in reasons], True)
    g_en, g_bn = words.get(group, ("", ""))
    if len(problems) >= 2:
        return (f"It is “{g_en}” because of {len(problems)} serious problems: {en}.",
                f"{len(problems)}টি গুরুতর সমস্যার কারণে এটি “{g_bn}”: {bn}।")
    c_en, c_bn = words.get(by_checks, ("", ""))
    return (f"Its checks alone would make it “{c_en}”, but {en}, so it is held at “{g_en}”.",
            f"শুধু যাচাইয়ের হিসাবে এটি “{c_bn}” হতো, কিন্তু {bn}, তাই এটিকে “{g_bn}”-এ রাখা হয়েছে।")


def group_watch(values: dict[str, float], problems: list[str], near: float = NEAR_LINE) -> dict:
    """Which check could move the group soon: {"down": move | None, "up": move | None},
    move = {check, from, to, group}. A check is "close" within ``near`` of its
    line. Profit is looked at first."""
    now = _final(values, problems, STRONG_AT, WEAK_BELOW)
    out = {"down": None, "up": None}
    for k in CHECKS:
        v = values.get(k)
        if v is None:
            continue
        w = word(v)
        # (from, to, the value it would take)
        steps = []
        if w == "strong" and v < STRONG_AT + near:
            steps.append(("down", "fair", STRONG_AT - 0.01))
        if w == "fair" and v < WEAK_BELOW + near:
            steps.append(("down", "weak", WEAK_BELOW - 0.01))
        if w == "fair" and v >= STRONG_AT - near:
            steps.append(("up", "strong", STRONG_AT))
        if w == "weak" and v >= WEAK_BELOW - near:
            steps.append(("up", "fair", WEAK_BELOW))
        for way, to, nv in steps:
            if out[way]:
                continue
            g = _final({**values, k: nv}, problems, STRONG_AT, WEAK_BELOW)
            if (way == "down" and ORDER.index(g) < ORDER.index(now)) or \
               (way == "up" and ORDER.index(g) > ORDER.index(now)):
                out[way] = {"check": k, "from": w, "to": to, "group": g}
    return out
