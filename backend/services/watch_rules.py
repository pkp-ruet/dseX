"""Watch rules — pure (THE Premium line, step 4, 2026-11-22).

The reader's own rules on each share: "tell me if GP's grade drops, if it
falls 5% in a day, if a dividend is declared …". Price alerts were the only
rule before; they stay in `price_alerts` (their own collection and job) and
count as rules. Every other kind is stored on the user as
`users.watch_rules: [{code, kind, value?, created_at}]` and checked by the
daily watcher after the close (`portfolio_daily`), against the facts it
already loads.

A rule that fires becomes a watcher event of kind `rule` (`rule` = which
rule): it is the reader's own, so Updates shows it open to every reader — a
free reader has 3 rules of any kind (armed price alerts included), Premium as
many as they need and a push the same evening. Where a rule and the watcher
would say the same thing on the same share (results, a grade change …) the
rule's event replaces the watcher's, so nobody reads it twice.

A free reader's rules past their limit (a lapsed Premium, or the 7-day taste
ending) are kept but paused: a paused rule that fires is stored with
`paused: True`, and the page says only that it fired.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Optional

# Every kind, in the order the sheet shows them. `value` = the default
# threshold (percent) and `values` the choices; `base` = the watcher event the
# rule replaces when both fire on the same share and day.
KINDS: dict[str, dict] = {
    "grade_down": {"en": "Our grade moves down", "bn": "আমাদের গ্রেড নেমে গেলে", "base": "grade"},
    "red_flag": {"en": "A serious problem is found", "bn": "গুরুতর কোনো সমস্যা ধরা পড়লে", "base": "red_flag"},
    "results": {"en": "Results are posted", "bn": "আর্থিক ফল প্রকাশ হলে", "base": "results"},
    "dividend": {"en": "A dividend is declared", "bn": "ডিভিডেন্ড ঘোষণা হলে", "base": None},
    "profit_drop": {"en": "Profit falls {v}% or more in its results", "bn": "আর্থিক ফলে মুনাফা {v}% বা বেশি কমলে",
                    "value": 20, "values": [10, 20, 30], "base": "results"},
    "dividend_cut": {"en": "The dividend is cut or skipped", "bn": "ডিভিডেন্ড কমালে বা না দিলে", "base": None},
    "last_day": {"en": "Tomorrow is the last day to buy for a dividend", "bn": "কাল ডিভিডেন্ড পেতে কেনার শেষ দিন হলে",
                 "base": None},
    "day_drop": {"en": "It falls {v}% or more in a day", "bn": "এক দিনে দাম {v}% বা বেশি কমলে",
                 "value": 5, "values": [3, 5, 8], "base": "drop"},
    "breakeven": {"en": "It is back to the price I paid", "bn": "আমার কেনা দামে ফিরলে", "base": "breakeven"},
    "grade_up": {"en": "Our grade moves up", "bn": "আমাদের গ্রেড উঠলে", "base": "grade"},
    "z_category": {"en": "It moves to the Z category", "bn": "জেড ক্যাটাগরিতে গেলে", "base": "category"},
    "owners_selling": {"en": "Founders or directors announce a sale", "bn": "উদ্যোক্তা বা পরিচালক বিক্রির ঘোষণা দিলে",
                       "base": None},
}

# Ticked in the sheet when a share has no rules yet (a suggestion, saved only
# when the reader saves: a free reader's 3 rules aren't spent for them).
SUGGESTED = ("grade_down", "red_flag", "results", "dividend")

# Rules one account can store, Premium included (a size cap, like HARD_LIMITS).
MAX_RULES = 100

LIMIT_DETAIL = "limit_reached:alerts"  # the shared cap with price alerts

_GRADE_ORDER = ["weak", "average", "good", "excellent"]
_NAMES = {"excellent": ("Strong all round", "শক্তিশালী"), "good": ("Mostly strong", "বেশ শক্তিশালী"),
          "average": ("Mixed", "মিশ্র"), "weak": ("Mostly weak", "বেশ দুর্বল")}
FRESH_DAYS = 3  # a declaration / sale notice counts as news this many days


def label(kind: str, value: Optional[float] = None) -> dict:
    """The rule in words, both languages."""
    k = KINDS[kind]
    v = value if value is not None else k.get("value")
    vs = f"{v:g}" if isinstance(v, (int, float)) else ""
    return {"en": k["en"].replace("{v}", vs), "bn": k["bn"].replace("{v}", vs)}


def clean_rules(raw: Any) -> list[dict]:
    """A reader's rules for one share, validated: known kinds, once each, a
    value only where the kind takes one (snapped to its choices)."""
    out: list[dict] = []
    seen: set[str] = set()
    for r in raw if isinstance(raw, list) else []:
        kind = (r or {}).get("kind") if isinstance(r, dict) else None
        if kind not in KINDS or kind in seen:
            continue
        seen.add(kind)
        rule: dict = {"kind": kind}
        if "values" in KINDS[kind]:
            v = r.get("value")
            choices = KINDS[kind]["values"]
            rule["value"] = v if v in choices else KINDS[kind]["value"]
        out.append(rule)
    return out


def replace_code(rules: list[dict], code: str, new: list[dict], now: Any) -> list[dict]:
    """The stored list with one share's rules replaced (kept in the order they
    were first made; a kind kept keeps its `created_at`)."""
    code = code.upper()
    old = {r["kind"]: r for r in rules if r.get("code") == code}
    others = [r for r in rules if r.get("code") != code]
    mine = []
    for r in new:
        was = old.get(r["kind"], {})
        rule = {"code": code, "created_at": was.get("created_at") or now, **r}
        if was.get("keep"):
            rule["keep"] = True
        mine.append(rule)
    return others + mine


def drop_codes(rules: list[dict], codes: Any) -> list[dict]:
    """The stored list without the rules on these shares. Watching a share is
    being on the watchlist (2026-11-25, one Watch button): a share that leaves
    the watchlist takes its rules with it."""
    gone = {str(c).upper() for c in codes or [] if c}
    return [r for r in rules if str(r.get("code") or "").upper() not in gone]


def unfollowed_codes(rules: list[dict], watchlist: Any) -> list[str]:
    """Shares with rules that are not on the watchlist, in the order their
    first rule was made (rules made before 2026-11-25 could sit on a share
    the reader only owned)."""
    on = {str(c).upper() for c in watchlist or [] if c}
    out: list[str] = []
    for r in rules:
        c = str(r.get("code") or "").upper()
        if c and c not in on and c not in out:
            out.append(c)
    return out


def set_keep(rules: list[dict], code: str, kind: str, keep: bool) -> Optional[list[dict]]:
    """The stored list with one rule marked "keep on" (or not), None when the
    reader has no such rule. A kept rule stays on before older ones when a
    free reader is past the cap (`active_rules`)."""
    code = code.upper()
    out, found = [], False
    for r in rules:
        if r.get("code") == code and r.get("kind") == kind:
            found = True
            r = {k: v for k, v in r.items() if k != "keep"}
            if keep:
                r["keep"] = True
        out.append(r)
    return out if found else None


def active_rules(rules: list[dict], limit: Optional[int], armed_alerts: int) -> tuple[list[dict], list[dict]]:
    """(active, paused). Without a cap every rule is active; with one, the
    rules the reader marked "keep on" first, then the oldest, up to the cap
    less the armed price alerts."""
    if limit is None:
        return list(rules), []
    room = max(0, limit - armed_alerts)
    ordered = sorted(rules, key=lambda r: (not r.get("keep"), str(r.get("created_at") or "")))
    return ordered[:room], ordered[room:]


def over_limit(current: int, new_total: int, limit: Optional[int]) -> bool:
    """A save is blocked only when it adds rules past the cap (a list already
    over it can shrink or stay)."""
    return limit is not None and new_total > limit and new_total > current


def next_trading_day(d: date) -> date:
    """The next DSE day (Sun–Thu; holidays are not modelled)."""
    n = d + timedelta(days=1)
    while n.weekday() in (4, 5):  # Friday, Saturday
        n += timedelta(days=1)
    return n


def _pct(a: Optional[float], b: Optional[float]) -> Optional[float]:
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)) or b == 0:
        return None
    return (a - b) / abs(b) * 100


def _ev(kind: str, code: str, key: str, level: str, en: str, bn: str,
        body_en: Optional[str] = None, body_bn: Optional[str] = None) -> dict:
    rl = label(kind)
    return {
        "id": f"rule-{kind}-{code}-{key}", "kind": "rule", "rule": kind, "code": code, "level": level,
        "title_en": en, "title_bn": bn,
        "body_en": body_en or f"Your rule: {rl['en'][0].lower()}{rl['en'][1:]}.",
        "body_bn": body_bn or f"আপনার নিয়ম: {rl['bn']}।",
    }


def _taka(v: Any) -> str:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return ""
    return f"৳{f:,.2f}" if f < 100 else f"৳{f:,.0f}"


def fire(code: str, rule: dict, facts: dict, day: str, today: date, events: list[dict]) -> Optional[dict]:
    """The event one rule raises today, or None. `events` = the watcher's own
    events for this reader today (breakeven is read from them)."""
    kind, v = rule["kind"], rule.get("value")
    if kind == "results" or kind == "profit_drop":
        rec = (facts.get("results") or {}).get(code)
        if not rec:
            return None
        end = rec.get("period_end")
        end_s = end.isoformat() if hasattr(end, "isoformat") else str(end or "")[:10]
        key = f"{end_s}-{rec.get('months') or 12}"
        pct = _pct(rec.get("eps_cum"), rec.get("eps_cum_prev"))
        if kind == "profit_drop":
            if pct is None or pct > -float(v or KINDS[kind]["value"]):
                return None
            return _ev(kind, code, key, "bad", f"{code}: profit fell {abs(pct):.0f}% in its latest results",
                       f"{code}: সর্বশেষ আর্থিক ফলে মুনাফা {abs(pct):.0f}% কমেছে")
        if pct is None:
            return _ev(kind, code, key, "watch", f"{code} posted its results", f"{code} আর্থিক ফল প্রকাশ করেছে")
        up = pct >= 0
        return _ev(kind, code, key, "good" if up else "watch",
                   f"{code} posted its results: profit {'up' if up else 'down'} {abs(pct):.0f}%",
                   f"{code} আর্থিক ফল প্রকাশ করেছে: মুনাফা {abs(pct):.0f}% {'বেড়েছে' if up else 'কমেছে'}")
    if kind in ("grade_down", "grade_up"):
        ch = (facts.get("grades") or {}).get(code)
        if not ch or ch.get("from_tier") not in _GRADE_ORDER or ch.get("to_tier") not in _GRADE_ORDER:
            return None
        better = _GRADE_ORDER.index(ch["to_tier"]) > _GRADE_ORDER.index(ch["from_tier"])
        if better != (kind == "grade_up"):
            return None
        a, b = _NAMES[ch["from_tier"]], _NAMES[ch["to_tier"]]
        return _ev(kind, code, day, "good" if better else "bad",
                   f"{code} moved from “{a[0]}” to “{b[0]}”", f"{code} “{a[1]}” থেকে “{b[1]}”-এ গেছে")
    if kind == "red_flag":
        rf = (facts.get("red_flags") or {}).get(code)
        if not rf:
            return None
        items = [i for i in rf.get("items") or [] if i.get("key")]
        if not items:
            return None
        en, bn = items[0].get("en"), items[0].get("bn")
        return _ev(kind, code, str(rf.get("day") or day)[:10], "bad", f"{code}: a serious problem was found",
                   f"{code}: গুরুতর একটি সমস্যা ধরা পড়েছে", en, bn or en)
    if kind == "z_category":
        cat = (facts.get("category") or {}).get(code)
        if not cat or str(cat[1]).upper() != "Z" or str(cat[0]).upper() == "Z":
            return None
        return _ev(kind, code, day, "bad", f"{code} moved to the Z category", f"{code} জেড ক্যাটাগরিতে গেছে")
    if kind == "day_drop":
        p = (facts.get("prices") or {}).get(code) or {}
        if str(p.get("date") or "")[:10] != str(facts.get("trade_day") or day)[:10]:
            return None
        cp = p.get("change_pct")
        ex = (facts.get("ex_moves") or {}).get(code)
        if ex and isinstance(ex.get("change_pct"), (int, float)):
            cp = ex["change_pct"]
        if not isinstance(cp, (int, float)) or cp > -float(v or KINDS[kind]["value"]):
            return None
        return _ev(kind, code, day, "bad", f"{code} fell {abs(cp):.1f}% today, to {_taka(p.get('ltp'))}",
                   f"{code}-এর দাম আজ {abs(cp):.1f}% কমে {_taka(p.get('ltp'))} হয়েছে")
    if kind == "breakeven":
        back = next((e for e in events if e.get("kind") == "breakeven" and e.get("code") == code), None)
        if not back:
            return None
        return _ev(kind, code, day, "good", back.get("title_en") or f"{code} is back to the price you paid",
                   back.get("title_bn") or f"{code} আপনার কেনা দামে ফিরেছে",
                   back.get("body_en"), back.get("body_bn"))
    if kind in ("dividend", "dividend_cut"):
        d = (facts.get("declared") or {}).get(code)
        if not d:
            return None
        key = str(d.get("declaration_date") or day)[:10]
        cash = d.get("cash_pct") or 0
        bonus = d.get("stock_pct") or 0
        if kind == "dividend":
            parts_en = [f"{cash:g}% cash" if cash else "", f"{bonus:g}% bonus shares" if bonus else ""]
            parts_bn = [f"{cash:g}% নগদ" if cash else "", f"{bonus:g}% বোনাস শেয়ার" if bonus else ""]
            what_en = " and ".join(x for x in parts_en if x) or "no dividend"
            what_bn = " ও ".join(x for x in parts_bn if x) or "কোনো ডিভিডেন্ড নয়"
            return _ev(kind, code, key, "good" if cash or bonus else "watch",
                       f"{code} declared {what_en}", f"{code} {what_bn} ঘোষণা করেছে")
        prev = (facts.get("dividend_prev") or {}).get(code) or {}
        before = prev.get("cash_pct") or 0
        if before <= 0 or cash >= before * 0.9:
            return None
        if cash <= 0:
            return _ev(kind, code, key, "bad", f"{code} declared no cash dividend this time",
                       f"{code} এবার কোনো নগদ ডিভিডেন্ড দেয়নি",
                       f"Last time it paid {before:g}% in cash.", f"আগেরবার নগদ দিয়েছিল {before:g}%।")
        return _ev(kind, code, key, "bad", f"{code} cut its cash dividend to {cash:g}%",
                   f"{code} নগদ ডিভিডেন্ড কমিয়ে {cash:g}% করেছে",
                   f"Last time it paid {before:g}%.", f"আগেরবার দিয়েছিল {before:g}%।")
    if kind == "last_day":
        nxt = next_trading_day(today).isoformat()
        row = next((r for r in (facts.get("buy_rows") or {}).get(code) or []
                    if str(r.get("buy_by") or "")[:10] == nxt and (r.get("cash_per_share") or 0) > 0), None)
        if not row:
            return None
        cash = _taka(row.get("cash_per_share"))
        return _ev(kind, code, nxt, "watch", f"Tomorrow is the last day to buy {code} for its {cash} dividend",
                   f"{code}-এর {cash} ডিভিডেন্ড পেতে কাল কেনার শেষ দিন",
                   f"The record date is {str(row.get('record_date') or '')[:10]}.",
                   f"রেকর্ড ডেট {str(row.get('record_date') or '')[:10]}।")
    if kind == "owners_selling":
        sale = (facts.get("insider_sells") or {}).get(code)
        if not sale:
            return None
        key = str(sale.get("post_date") or day)[:10]
        who = sale.get("name") or "A founder or director"
        n = sale.get("shares")
        n_en = f" {int(n):,} shares" if isinstance(n, (int, float)) else ""
        return _ev(kind, code, key, "watch", f"{code}: {who} announced a sale of{n_en or ' shares'}",
                   f"{code}: {who} শেয়ার বিক্রির ঘোষণা দিয়েছেন")
    return None


def evaluate(rules: list[dict], facts: dict, day: str, today: date, events: list[dict],
             paused: Optional[list[dict]] = None) -> list[dict]:
    """Every event the reader's rules raise today; a paused rule's event is
    marked `paused`. One event per share and kind of news: a profit-drop rule
    and a results rule on the same report give the profit drop."""
    out: list[dict] = []
    for group, is_paused in ((rules, False), (paused or [], True)):
        for r in group:
            code = (r.get("code") or "").upper()
            if not code or r.get("kind") not in KINDS:
                continue
            e = fire(code, r, facts, day, today, events)
            if e:
                out.append({**e, "paused": True} if is_paused else e)
    # The more specific of two rules on one report.
    drop_codes = {e["code"] for e in out if e["rule"] == "profit_drop"}
    out = [e for e in out if not (e["rule"] == "results" and e["code"] in drop_codes)]
    return out


def covered(fired: list[dict]) -> set[tuple[str, str]]:
    """(code, watcher kind) pairs a fired, active rule already says."""
    out = set()
    for e in fired:
        base = KINDS.get(e.get("rule"), {}).get("base")
        if base and not e.get("paused"):
            out.add((e["code"], base))
    return out
