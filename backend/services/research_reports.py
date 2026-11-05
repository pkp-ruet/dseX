"""Premium research reports (2026-11-05, user: "the 6 research lists … are not
premium standards … build more analytical and depth reports"; first batch, all
titles and words plain).

Three reports over the whole market, built from what the app already stores:

  * **Companies with serious problems** (`risk_register`) — every company with
    a red flag in its stock report (the newest `stock_report_snapshots` day),
    grouped by kind, what changed this week, and who is close to the Z
    category (`z_risk`).
  * **What the auditors found** (`auditor_tracker`) — every auditor's report
    that did not fully approve a company's accounts (`auditor_opinions`, read
    from DSE's PDFs by scrapers/auditor_opinion.py), the reasons in plain
    words, by sector and by how serious.
  * **Results season** (`season_list` / `results_season`) — every company's
    report for one period (a year, or the months to a quarter end): how many
    made more profit, by sector, the biggest moves, profit without cash, and
    for a year the dividends against last year.

Pure: data in, dicts out. The loading lives in research_reports_service.py.
Every sentence comes in English and Bengali (docs/voice.md). No buy / sell
words and no performance claims.
"""
from __future__ import annotations

import re
from datetime import date
from statistics import median
from typing import Optional


def bi(en: str, bn: str) -> dict:
    return {"en": en, "bn": bn}


def _n(v) -> Optional[float]:
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if f == f else None


def _iso(v) -> Optional[str]:
    if v is None:
        return None
    if hasattr(v, "date") and callable(v.date):
        v = v.date()
    return v.isoformat()[:10] if hasattr(v, "isoformat") else str(v)[:10]


# ---------------------------------------------------------------------------
# 1 · Companies with serious problems
# ---------------------------------------------------------------------------

# The stock report's red flags, most serious first: (key, title, what it means).
RISK_KINDS: list[tuple[str, dict, dict]] = [
    ("factory", bi("Factory found closed", "কারখানা বন্ধ পাওয়া গেছে"),
     bi("DSE visited the factory and found it closed or not making anything.",
        "ডিএসই কারখানা পরিদর্শন করে সেটি বন্ধ বা উৎপাদনহীন পেয়েছে।")),
    ("audit", bi("The auditor found a serious problem", "নিরীক্ষক গুরুতর সমস্যা পেয়েছেন"),
     bi("The auditor did not fully approve the accounts, for a reason that can hurt shareholders.",
        "নিরীক্ষক হিসাব পুরোপুরি অনুমোদন করেননি, এমন কারণে যা শেয়ারহোল্ডারদের ক্ষতি করতে পারে।")),
    ("losses", bi("Losses bigger than its capital", "মূলধনের চেয়ে বড় লোকসান"),
     bi("Its losses over the years are bigger than the money shareholders put in.",
        "বছরের পর বছর লোকসান শেয়ারহোল্ডারদের দেওয়া মূলধনের চেয়েও বেশি হয়ে গেছে।")),
    ("loans", bi("Loans bigger than the company", "কোম্পানির চেয়ে বড় ঋণ"),
     bi("It owes more than the whole company is worth on the market.",
        "বাজারে পুরো কোম্পানির যে দাম, তার চেয়েও বেশি ঋণ আছে।")),
    ("category", bi("In DSE's Z category", "ডিএসইর Z ক্যাটাগরিতে"),
     bi("It missed a dividend or its yearly meeting. Z shares are harder to trade.",
        "ডিভিডেন্ড বা বার্ষিক সভা বাদ পড়েছে। Z ক্যাটাগরির শেয়ার কেনাবেচা কঠিন।")),
    ("late", bi("Results are late", "ফল প্রকাশে দেরি"),
     bi("It has not published its yearly results long after its year ended.",
        "বছর শেষ হওয়ার অনেক পরেও বছরের ফল প্রকাশ করেনি।")),
    ("stale", bi("Accounts 2 or more years old", "হিসাব 2 বছর বা তার বেশি পুরোনো"),
     bi("Its newest audited accounts are old, so nobody knows how it is doing today.",
        "সর্বশেষ নিরীক্ষিত হিসাব পুরোনো, তাই এখন কোম্পানি কেমন চলছে কেউ জানে না।")),
    ("owners_30", bi("Owners hold less than 30%", "মালিকদের হাতে 30%-এর কম"),
     bi("The rules ask the founders and directors to hold at least 30% of the shares together.",
        "নিয়ম অনুযায়ী উদ্যোক্তা-পরিচালকদের মিলে অন্তত 30% শেয়ার ধরে রাখতে হয়।")),
    ("dse_query", bi("DSE questioned a price jump", "দাম বাড়া নিয়ে ডিএসইর প্রশ্ন"),
     bi("DSE asked the company why its price rose so fast while the price was running up.",
        "দাম দ্রুত বাড়ার সময় ডিএসই কোম্পানির কাছে কারণ জানতে চেয়েছে।")),
    ("rally", bi("Price jumped with no news", "খবর ছাড়াই দাম বেড়েছে"),
     bi("The price ran up a lot while the company said nothing new.",
        "কোম্পানির নতুন কোনো খবর ছাড়াই দাম অনেক বেড়েছে।")),
]
_KIND_ORDER = {k: i for i, (k, _, _) in enumerate(RISK_KINDS)}
_KIND_TITLE = {k: t for k, t, _ in RISK_KINDS}
_OTHER_TITLE = bi("Another serious problem", "অন্য গুরুতর সমস্যা")

# A day on which our checks changed rather than the companies: this many
# flags moved at once (and this share of the flagged companies). On
# 2026-11-04 the auditor reasons were first read and 50 flags moved in a day;
# a normal day moves 2–12.
REBUILT_MIN = 20
REBUILT_SHARE = 0.08


def _kind_rank(key: str) -> int:
    return _KIND_ORDER.get(key, len(_KIND_ORDER))


def is_rebuilt(added: int, fixed: int, flagged: int) -> bool:
    n = added + fixed
    return n >= REBUILT_MIN and n >= REBUILT_SHARE * max(flagged, 1)


def week_changes(days: list[tuple[str, dict[str, set]]]) -> dict:
    """Flags added and removed across the snapshot days (oldest first),
    leaving out days on which our checks changed. A flag that came and went
    inside the window counts as neither. Only companies still in the newest
    day count as fixed (a share that stopped being graded isn't "fixed")."""
    state: dict[tuple[str, str], tuple[str, str]] = {}  # (code, key) → (added|fixed, day)
    skipped: list[str] = []
    for (_, prev), (day, cur) in zip(days, days[1:]):
        added = [(c, k) for c, keys in cur.items() for k in keys - prev.get(c, set())]
        fixed = [(c, k) for c, keys in prev.items() if c in cur for k in keys - cur[c]]
        if is_rebuilt(len(added), len(fixed), sum(1 for v in cur.values() if v)):
            skipped.append(day)
            continue
        for what, pairs, undoes in (("added", added, "fixed"), ("fixed", fixed, "added")):
            for ck in pairs:
                if state.get(ck, ("",))[0] == undoes:
                    del state[ck]
                else:
                    state[ck] = (what, day)
    newest = days[-1][1] if days else {}
    out: dict[str, list] = {"added": [], "fixed": []}
    for (code, key), (what, day) in state.items():
        if what == "fixed" and code not in newest:
            continue
        out[what].append({"code": code, "key": key, "date": day})
    for k in out:
        out[k].sort(key=lambda r: (_kind_rank(r["key"]), r["code"]))
    return {**out, "skipped": skipped, "since": days[0][0] if days else None}


def risk_register(now: dict[str, dict], days: list[tuple[str, dict[str, set]]], info: dict[str, dict],
                  z_items: Optional[list[dict]] = None) -> dict:
    """`now` = {code: newest snapshot row (red_keys, red_lines)}, `days` =
    [(date, {code: red keys})] oldest first ending with the newest day,
    `info` = {code: {name, sector, tier, price}}."""
    items = []
    counts: dict[str, int] = {}
    for code, snap in now.items():
        keys = sorted(set(snap.get("red_keys") or []), key=_kind_rank)
        if not keys:
            continue
        lines = snap.get("red_lines") or {}
        problems = []
        for k in keys:
            counts[k] = counts.get(k, 0) + 1
            line = lines.get(k) if isinstance(lines.get(k), dict) else None
            problems.append({"key": k, "title": _KIND_TITLE.get(k, _OTHER_TITLE),
                             "en": (line or {}).get("en") or _KIND_TITLE.get(k, _OTHER_TITLE)["en"],
                             "bn": (line or {}).get("bn") or _KIND_TITLE.get(k, _OTHER_TITLE)["bn"]})
        meta = info.get(code) or {}
        items.append({"code": code, "name": meta.get("name") or code, "sector": meta.get("sector"),
                      "tier": meta.get("tier") or "unknown", "price": meta.get("price"), "problems": problems})
    items.sort(key=lambda r: (-len(r["problems"]), _kind_rank(r["problems"][0]["key"]), r["code"]))

    kinds = [{"key": k, "title": t, "means": m, "n": counts.get(k, 0)}
             for k, t, m in RISK_KINDS if counts.get(k)]
    for k in sorted(set(counts) - set(_KIND_ORDER)):
        kinds.append({"key": k, "title": _OTHER_TITLE, "means": _OTHER_TITLE, "n": counts[k]})

    ch = week_changes(days)

    def named(rows):
        return [{**r, "name": (info.get(r["code"]) or {}).get("name") or r["code"],
                 "title": _KIND_TITLE.get(r["key"], _OTHER_TITLE)} for r in rows]

    close = []
    for z in z_items or []:
        if (z.get("category") or "").upper() == "Z":
            continue
        meta = info.get(z["code"]) or {}
        close.append({"code": z["code"], "name": z.get("name") or meta.get("name") or z["code"],
                      "sector": z.get("sector") or meta.get("sector"), "level": z.get("level"),
                      "reasons": [{"en": r.get("en"), "bn": r.get("bn"), "level": r.get("level")}
                                  for r in z.get("reasons") or []]})

    many = sum(1 for r in items if len(r["problems"]) >= 2)
    return {
        "as_of": days[-1][0] if days else None,
        "universe": len(now),
        "flagged": len(items),
        "two_or_more": many,
        "kinds": kinds,
        "items": items,
        "week": {"since": ch["since"], "added": named(ch["added"]), "fixed": named(ch["fixed"]),
                 "skipped": ch["skipped"]},
        "close_to_z": close,
    }


# ---------------------------------------------------------------------------
# 2 · What the auditors found
# ---------------------------------------------------------------------------

AUDIT_GROUPS: list[tuple[str, dict, dict]] = [
    ("going_concern", bi("May not keep running", "চালু থাকা নিয়ে সন্দেহ"),
     bi("The auditor is not sure the company can keep running. This is the most serious warning an auditor gives.",
        "কোম্পানি চালু থাকতে পারবে কি না, নিরীক্ষক নিশ্চিত নন। নিরীক্ষকের দেওয়া সবচেয়ে গুরুতর সতর্কতা এটি।")),
    ("serious", bi("A serious problem in the accounts", "হিসাবে গুরুতর সমস্যা"),
     bi("A reason that can change what the company is worth, such as losses not counted or money that may not come back.",
        "এমন কারণ যা কোম্পানির মূল্য বদলে দিতে পারে, যেমন হিসাবে না ধরা লোকসান বা ফেরত না আসা টাকা।")),
    ("minor", bi("A smaller issue", "ছোট সমস্যা"),
     bi("A bookkeeping matter, such as a staff fund or tax. It rarely changes what the company is worth.",
        "হিসাব রাখার বিষয়, যেমন কর্মীদের তহবিল বা কর। সাধারণত কোম্পানির মূল্যে বড় প্রভাব ফেলে না।")),
    ("unknown", bi("Reason not clear", "কারণ স্পষ্ট নয়"),
     bi("We could not read the reason in the auditor's report. It is worth reading yourself.",
        "নিরীক্ষকের প্রতিবেদনে কারণটি আমরা পড়তে পারিনি। নিজে একবার পড়ে দেখা ভালো।")),
]
RECENT_DAYS = 30
EXCERPT_CHARS = 520


def audit_group(op: dict) -> str:
    if op.get("going_concern"):
        return "going_concern"
    sev = op.get("severity")
    return sev if sev in ("serious", "minor") else "unknown"


def excerpt(text: Optional[str], limit: int = EXCERPT_CHARS) -> Optional[str]:
    """The auditor's own words, cut at a sentence end under `limit`."""
    t = re.sub(r"\s+", " ", text or "").strip()
    if len(t) < 60:
        return None
    if len(t) <= limit:
        return t
    cut = t[:limit]
    end = max(cut.rfind(". "), cut.rfind("; "))
    return (cut[: end + 1] if end > limit * 0.4 else cut.rsplit(" ", 1)[0] + " …").strip()


def auditor_tracker(opinions: list[dict], info: dict[str, dict], sector_sizes: dict[str, int],
                    today: date, words: dict[str, tuple[str, str]], serious_keys: set[str]) -> dict:
    """`opinions` = `auditor_opinions` rows (last 400 days); `words` =
    audit_opinion.REASON_WORDS; `serious_keys` = audit_opinion.SERIOUS."""
    by_code: dict[str, list[dict]] = {}
    for op in opinions:
        if op.get("trading_code"):
            by_code.setdefault(op["trading_code"], []).append(op)

    items = []
    reasons: dict[str, int] = {}
    sectors: dict[str, int] = {}
    groups: dict[str, int] = {}
    for code, ops in by_code.items():
        ops.sort(key=lambda o: (o.get("year") or 0, _iso(o.get("posted")) or ""), reverse=True)
        op = ops[0]
        meta = info.get(code) or {}
        g = audit_group(op)
        groups[g] = groups.get(g, 0) + 1
        keys = [k for k in (op.get("reasons") or []) if k != "going_concern"] + list(op.get("minor") or [])
        for k in dict.fromkeys(keys):
            reasons[k] = reasons.get(k, 0) + 1
        sec = meta.get("sector") or "Other"
        sectors[sec] = sectors.get(sec, 0) + 1
        posted = _iso(op.get("posted"))
        try:
            fresh = posted is not None and (today - date.fromisoformat(posted)).days <= RECENT_DAYS
        except ValueError:
            fresh = False
        earlier = sorted({o.get("year") for o in ops[1:] if o.get("year") and o.get("year") != op.get("year")},
                         reverse=True)
        items.append({
            "code": code, "name": meta.get("name") or code, "sector": meta.get("sector"),
            "tier": meta.get("tier") or "unknown", "group": g, "year": op.get("year"), "posted": posted,
            "url": op.get("url"), "new": fresh,
            "reasons": [{"key": k, "serious": k in serious_keys,
                         "en": words.get(k, (k, k))[0], "bn": words.get(k, (k, k))[1]}
                        for k in dict.fromkeys(keys)],
            "excerpt": excerpt(op.get("basis_excerpt")) if op.get("text_ok", True) else None,
            "earlier": earlier,
        })
    # Newest report first inside each group.
    items.sort(key=lambda r: (r["posted"] or "", r["code"]), reverse=True)
    items_by_group = {k: [r for r in items if r["group"] == k] for k, _, _ in AUDIT_GROUPS}

    reason_rows = sorted(
        ({"key": k, "n": n, "serious": k in serious_keys, "en": words.get(k, (k, k))[0],
          "bn": words.get(k, (k, k))[1]} for k, n in reasons.items()),
        key=lambda r: (not r["serious"], -r["n"], r["key"]))
    sector_rows = sorted(
        ({"sector": s, "n": n, "of": sector_sizes.get(s)} for s, n in sectors.items()),
        key=lambda r: (-r["n"], r["sector"]))
    universe = sum(sector_sizes.values()) or None
    return {
        "as_of": today.isoformat(),
        "universe": universe,
        "companies": len(items),
        "counts": {k: groups.get(k, 0) for k, _, _ in AUDIT_GROUPS},
        "recent": sum(1 for r in items if r["new"]),
        "repeat": sum(1 for r in items if r["earlier"]),
        "groups": [{"key": k, "title": t, "means": m, "items": items_by_group[k]}
                   for k, t, m in AUDIT_GROUPS if items_by_group[k]],
        "reasons": reason_rows,
        "sectors": sector_rows,
    }


# ---------------------------------------------------------------------------
# 3 · Results season
# ---------------------------------------------------------------------------

MOVE_PCT = 10          # the /results page's line for "up" / "down"
SEASON_MIN = 20        # reports a period needs before it counts as a season
SEASONS_KEPT = 4
TOP_MOVES = 5
MIN_BASE = 0.10        # ৳ a share: a smaller base makes "+1000%" moves that say nothing
_MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September",
              "October", "November", "December"]
_MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর",
              "অক্টোবর", "নভেম্বর", "ডিসেম্বর"]
NO_CASH_LINE = {"BANK", "NBFI", "INSURANCE"}  # cash from operations means something else for lenders


def season_id(period_end: date, full_year: bool) -> str:
    return f"{period_end.isoformat()}-{'y' if full_year else 'q'}"


def season_title(period_end: date, full_year: bool) -> dict:
    m_en, m_bn, y = _MONTHS_EN[period_end.month - 1], _MONTHS_BN[period_end.month - 1], period_end.year
    if full_year:
        return bi(f"Yearly results for the year to {m_en} {y}", f"{m_bn} {y} পর্যন্ত বছরের ফল")
    return bi(f"Results up to {m_en} {y}", f"{m_bn} {y} পর্যন্ত ফল")


def season_list(records: list[dict]) -> list[dict]:
    """The newest seasons with at least SEASON_MIN reports, newest first."""
    counts: dict[tuple[date, bool], int] = {}
    for r in records:
        pe = r.get("period_end")
        if isinstance(pe, date):
            k = (pe, bool(r.get("full_year")))
            counts[k] = counts.get(k, 0) + 1
    keep = sorted((k for k, n in counts.items() if n >= SEASON_MIN), key=lambda k: (k[0], k[1]), reverse=True)
    return [{"id": season_id(pe, fy), "period_end": pe.isoformat(), "full_year": fy, "n": counts[(pe, fy)],
             "title": season_title(pe, fy)} for pe, fy in keep[:SEASONS_KEPT]]


def profit_move(cur: Optional[float], prev: Optional[float]) -> tuple[Optional[str], Optional[float]]:
    """('up' | 'same' | 'down' | 'to_profit' | 'to_loss' | 'loss', pct)."""
    if cur is None or prev is None:
        return None, None
    if prev <= 0 < cur:
        return "to_profit", None
    if cur <= 0 < prev:
        return "to_loss", None
    if cur <= 0 and prev <= 0:
        return "loss", None
    pct = round((cur - prev) / abs(prev) * 100, 1)
    return ("up" if pct >= MOVE_PCT else "down" if pct <= -MOVE_PCT else "same"), pct


_BUCKET = {"up": "up", "to_profit": "up", "same": "same", "down": "down", "to_loss": "down", "loss": "loss"}


def dividend_move(cash_pct: Optional[float], stock_pct: Optional[float], prev_cash: Optional[float]) -> Optional[str]:
    """'raised' | 'same' | 'cut' | 'none' | 'first' | None (no declaration read)."""
    if cash_pct is None:
        return None
    if cash_pct <= 0:
        return "none" if not (stock_pct or 0) > 0 else "bonus_only"
    if not prev_cash:
        return "first"
    if cash_pct > prev_cash + 0.01:
        return "raised"
    if cash_pct < prev_cash - 0.01:
        return "cut"
    return "same"


def results_season(records: list[dict], sid: str, info: dict[str, dict], ledger_cash: dict[str, dict[int, float]],
                   meetings: list[dict], sector_class: dict[str, str]) -> Optional[dict]:
    """One season's report. `records` = every report of the market (see
    research_reports_service.season_records); `meetings` = the results
    calendar (`morning_brief_service.results_calendar()["meetings"]`)."""
    seasons = season_list(records)
    season = next((s for s in seasons if s["id"] == sid), None)
    if season is None:
        return None
    pe, fy = date.fromisoformat(season["period_end"]), season["full_year"]
    rows = []
    for r in records:
        if r.get("period_end") != pe or bool(r.get("full_year")) != fy:
            continue
        code = r["code"]
        meta = info.get(code) or {}
        cur, prev = _n(r.get("eps_cum")), _n(r.get("eps_cum_prev"))
        move, pct = profit_move(cur, prev)
        if move is None:
            continue
        cash = _n(r.get("nocfps_cum"))
        cash_out = (cash is not None and cash < 0 and _BUCKET[move] == "up"
                    and sector_class.get(code, "GENERAL") not in NO_CASH_LINE)
        div = None
        if fy:
            prev_cash = (ledger_cash.get(code) or {}).get(pe.year - 1)
            d = dividend_move(_n(r.get("cash_pct")), _n(r.get("stock_pct")), prev_cash)
            if d:
                div = {"move": d, "cash_pct": _n(r.get("cash_pct")), "prev_cash_pct": prev_cash,
                       "stock_pct": _n(r.get("stock_pct"))}
        rows.append({
            "code": code, "name": meta.get("name") or code, "sector": meta.get("sector"),
            "tier": meta.get("tier") or "unknown", "posted": _iso(r.get("post_date")),
            "months": int(r.get("months") or 12), "eps": cur, "eps_prev": prev, "move": move, "pct": pct,
            "bucket": _BUCKET[move], "cash_out": cash_out, "dividend": div,
        })
    rows.sort(key=lambda x: (x["posted"] or "", x["code"]), reverse=True)

    buckets = {b: sum(1 for x in rows if x["bucket"] == b) for b in ("up", "same", "down", "loss")}
    pcts = [x["pct"] for x in rows if x["pct"] is not None]
    by_sector: dict[str, list[dict]] = {}
    for x in rows:
        by_sector.setdefault(x["sector"] or "Other", []).append(x)
    sectors = []
    for s, xs in by_sector.items():
        if len(xs) < 3:
            continue
        sp = [x["pct"] for x in xs if x["pct"] is not None]
        sectors.append({"sector": s, "n": len(xs), "up": sum(1 for x in xs if x["bucket"] == "up"),
                        "same": sum(1 for x in xs if x["bucket"] == "same"),
                        "down": sum(1 for x in xs if x["bucket"] in ("down", "loss")),
                        "median_pct": round(median(sp), 1) if len(sp) >= 3 else None})
    sectors.sort(key=lambda r: (-r["n"], r["sector"]))

    movable = [x for x in rows if x["pct"] is not None and abs(x["eps_prev"] or 0) >= MIN_BASE]
    top_up = sorted((x for x in movable if x["bucket"] == "up"), key=lambda x: -x["pct"])[:TOP_MOVES]
    top_down = sorted((x for x in movable if x["bucket"] == "down"), key=lambda x: x["pct"])[:TOP_MOVES]
    codes = lambda xs: [x["code"] for x in xs]  # noqa: E731

    divs = None
    if fy:
        dm: dict[str, int] = {}
        for x in rows:
            if x["dividend"]:
                dm[x["dividend"]["move"]] = dm.get(x["dividend"]["move"], 0) + 1
        divs = {"declared": sum(dm.values()), **{k: dm.get(k, 0) for k in
                                                ("raised", "same", "cut", "none", "first", "bonus_only")}}

    reported = {x["code"] for x in rows}
    want = "annual" if fy else None
    coming = []
    for m in meetings or []:
        if m.get("code") in reported or (m.get("days") or 0) < 0:
            continue
        if (m.get("period_end") or "") != pe.isoformat():
            continue
        if (m.get("purpose") == "annual") != (want == "annual"):
            continue
        coming.append({"code": m["code"], "name": m.get("name") or m["code"], "date": m.get("date")})
    coming.sort(key=lambda m: (m["date"] or "", m["code"]))

    return {
        "season": season,
        "seasons": seasons,
        "reported": len(rows),
        "counts": buckets,
        "median_pct": round(median(pcts), 1) if pcts else None,
        "to_profit": sum(1 for x in rows if x["move"] == "to_profit"),
        "to_loss": sum(1 for x in rows if x["move"] == "to_loss"),
        "sectors": sectors,
        "top_up": codes(top_up),
        "top_down": codes(top_down),
        "turned_profit": codes(x for x in rows if x["move"] == "to_profit"),
        "turned_loss": codes(x for x in rows if x["move"] == "to_loss"),
        "cash_out": codes(x for x in rows if x["cash_out"]),
        "dividends": divs,
        "coming": coming,
        "rows": rows,
    }
