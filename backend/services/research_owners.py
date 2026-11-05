"""Who is buying, who is selling — a Premium research report (2026-11-05).

Two sources DSE publishes separately and nobody joins up:

  * **Owners' trades** — every sponsor / director buy or sale notice of the
    last year, matched to its completion (`notices.pair_insider_trades`):
    net shares and taka per company, the people behind it, and trades
    announced but not (yet) done.
  * **The big money** — the monthly ownership report (`shareholdings`):
    how the share held by institutions and by foreign investors moved over
    the latest month, 3 months and a year, in percentage points and in taka
    (points × today's market value).

Plus where the groups agree (two or more of founders / institutions /
foreigners moved the same way over 3 months) and the 30% rule (founders and
directors must hold 30% together).

Pure: data in, dicts out. Facts only — never a buy or sell call.
"""
from __future__ import annotations

from datetime import date, timedelta
from typing import Optional

from backend.services.research_reports import _iso, _n, bi

MOVE_PP = 0.5          # a month's move in institutions / foreigners worth naming
AGREE_PP = 0.5         # 3-month move per group for "the groups agree"
JUMP_PP = 10.0         # bigger moves are usually a reclassification, not trading
RULE_PCT = 30.0        # founders + directors must hold this much together
LAPSED_DAYS = 45       # a declaration with no completion after this lapsed
MONTH_GAP = (20, 45)   # days between "this month's" report and the one before
QUARTER_MIN = 80       # days back for the 3-month comparison
YEAR_MIN = 330         # days back for the 1-year comparison

ROLE_WORDS = {
    "sponsor": ("Sponsor", "উদ্যোক্তা"),
    "sponsor_director": ("Sponsor director", "উদ্যোক্তা পরিচালক"),
    "corporate_director": ("Company on the board", "বোর্ডে থাকা প্রতিষ্ঠান"),
    "corporate_sponsor": ("Sponsor company", "উদ্যোক্তা প্রতিষ্ঠান"),
    "director": ("Director", "পরিচালক"),
    "md": ("Managing director", "ব্যবস্থাপনা পরিচালক"),
    "chairman": ("Chairman", "চেয়ারম্যান"),
    "other": ("Linked to a director", "পরিচালকের সঙ্গে যুক্ত"),
}

GROUPS = {
    "sponsor": bi("Founders and directors", "উদ্যোক্তা ও পরিচালক"),
    "institute": bi("Institutions", "প্রাতিষ্ঠানিক বিনিয়োগকারী"),
    "foreign": bi("Foreign investors", "বিদেশি বিনিয়োগকারী"),
}
_FIELD = {"sponsor": "sponsor_director_pct", "institute": "institute_pct", "foreign": "foreign_pct"}


def _d(v) -> Optional[date]:
    s = _iso(v)
    try:
        return date.fromisoformat(s) if s else None
    except ValueError:
        return None


def _meta(code: str, info: dict) -> dict:
    m = info.get(code) or {}
    return {"code": code, "name": m.get("name") or code, "sector": m.get("sector"), "tier": m.get("tier") or "unknown"}


# --------------------------------------------------------------- owners' trades

def trade_rows(trades: dict[str, list[dict]], info: dict[str, dict], today: date) -> dict:
    """Per company: net shares / taka over the year's completed trades, and the
    open or lapsed declarations."""
    buying, selling, pending, lapsed = [], [], [], []
    for code, ts in trades.items():
        if not (info.get(code) or {}).get("graded"):
            continue  # funds, bonds and ungraded shares are left out
        price = _n((info.get(code) or {}).get("price"))
        done = [t for t in ts if t.get("status") == "done" and t.get("shares")]
        net = sum(t["shares"] * (1 if t["side"] == "buy" else -1) for t in done)
        people = [{
            "name": t.get("name"), "role": t.get("role") or "other",
            "role_en": ROLE_WORDS.get(t.get("role") or "other", ROLE_WORDS["other"])[0],
            "role_bn": ROLE_WORDS.get(t.get("role") or "other", ROLE_WORDS["other"])[1],
            "side": t["side"], "shares": t.get("shares"), "status": t.get("status"),
            "date": _iso(t.get("done") or t.get("declared")),
        } for t in ts[:4]]
        for t in ts:
            if t.get("status") != "declared":
                continue
            d = _d(t.get("declared"))
            if d is None:
                continue
            row = {**_meta(code, info), "side": t["side"], "shares": t.get("shares"),
                   "tk": round(t["shares"] * price) if t.get("shares") and price else None,
                   "declared": d.isoformat(), "by": _iso(t.get("by_date")),
                   "name_of": t.get("name"),
                   "role_en": ROLE_WORDS.get(t.get("role") or "other", ROLE_WORDS["other"])[0],
                   "role_bn": ROLE_WORDS.get(t.get("role") or "other", ROLE_WORDS["other"])[1]}
            (lapsed if (today - d).days > LAPSED_DAYS else pending).append(row)
        if not done or net == 0:
            continue
        row = {**_meta(code, info), "net_shares": net, "net_tk": round(abs(net) * price) if price else None,
               "buys": sum(1 for t in done if t["side"] == "buy"),
               "sells": sum(1 for t in done if t["side"] == "sell"),
               "last": max(_iso(t["done"]) for t in done), "people": people}
        (buying if net > 0 else selling).append(row)
    key = lambda r: -(r.get("net_tk") or 0)  # noqa: E731
    buying.sort(key=key)
    selling.sort(key=key)
    pending.sort(key=lambda r: r["declared"], reverse=True)
    lapsed.sort(key=lambda r: r["declared"], reverse=True)
    return {"buying": buying, "selling": selling, "pending": pending, "lapsed": lapsed,
            "buy_tk": sum(r["net_tk"] or 0 for r in buying), "sell_tk": sum(r["net_tk"] or 0 for r in selling)}


# --------------------------------------------------------------- ownership moves

def _back(rows: list[dict], newest: date, lo: int, hi: Optional[int] = None) -> Optional[dict]:
    """The newest row at least `lo` (and at most `hi`) days older than `newest`."""
    for r in rows[1:]:
        d = _d(r.get("as_of_date"))
        if d is None:
            continue
        gap = (newest - d).days
        if gap >= lo and (hi is None or gap <= hi):
            return r
        if hi is not None and gap > hi:
            return None
    return None


def moves(rows: list[dict]) -> Optional[dict]:
    """{date, month: {field: pp}, quarter: {...}, year: {...}, now: {...}} from a
    company's reports, newest first. A move past JUMP_PP is kept but marked."""
    if not rows:
        return None
    newest = _d(rows[0].get("as_of_date"))
    if newest is None:
        return None
    out = {"date": newest.isoformat(), "now": {}, "from": {}}
    for g, f in _FIELD.items():
        out["now"][g] = _n(rows[0].get(f))
    for span, (lo, hi) in (("month", MONTH_GAP), ("quarter", (QUARTER_MIN, None)), ("year", (YEAR_MIN, None))):
        old = _back(rows, newest, lo, hi)
        if old is None:
            out[span] = None
            continue
        out["from"][span] = _iso(old.get("as_of_date"))
        out[span] = {}
        for g, f in _FIELD.items():
            a, b = _n(old.get(f)), _n(rows[0].get(f))
            out[span][g] = round(b - a, 2) if a is not None and b is not None else None
    return out


def _tk(pp: Optional[float], mcap_mn: Optional[float]) -> Optional[int]:
    return round(abs(pp) / 100 * mcap_mn * 1e6) if pp is not None and mcap_mn else None


def ownership_lists(holdings: dict[str, list[dict]], info: dict[str, dict]) -> dict:
    """Institutions and foreigners in / out this month, the groups agreeing over
    3 months, and the 30% rule."""
    lists = {g: {"in": [], "out": []} for g in ("institute", "foreign")}
    agree_buy, agree_sell, under30, months = [], [], [], {}
    for code, rows in holdings.items():
        if not (info.get(code) or {}).get("graded"):
            continue
        mv = moves(rows)
        if not mv:
            continue
        months[mv["date"][:7]] = months.get(mv["date"][:7], 0) + 1
        mcap = _n((info.get(code) or {}).get("mcap_mn"))
        base = _meta(code, info)
        m = mv.get("month") or {}
        for g in ("institute", "foreign"):
            pp = m.get(g)
            if pp is None or abs(pp) < MOVE_PP:
                continue
            lists[g]["in" if pp > 0 else "out"].append({
                **base, "pp": pp, "tk": _tk(pp, mcap), "from_pct": round((mv["now"][g] or 0) - pp, 2),
                "to_pct": mv["now"][g], "since": mv["from"].get("month"), "date": mv["date"],
                "jump": abs(pp) >= JUMP_PP})
        q = mv.get("quarter") or {}
        ups = [g for g in _FIELD if (q.get(g) or 0) >= AGREE_PP and abs(q.get(g) or 0) < JUMP_PP]
        downs = [g for g in _FIELD if (q.get(g) or 0) <= -AGREE_PP and abs(q.get(g) or 0) < JUMP_PP]
        if len(ups) >= 2 and not downs:
            agree_buy.append({**base, "groups": ups, "pp": {g: q.get(g) for g in _FIELD}, "since": mv["from"].get("quarter")})
        elif len(downs) >= 2 and not ups:
            agree_sell.append({**base, "groups": downs, "pp": {g: q.get(g) for g in _FIELD}, "since": mv["from"].get("quarter")})
        sp = mv["now"].get("sponsor")
        govt = _n(rows[0].get("govt_pct")) or 0
        # 0 is a missing figure on DSE's page, not an owner group holding nothing.
        if sp is not None and 0 < sp < RULE_PCT and govt < 50:  # a government company answers to its ministry, not this rule
            y = (mv.get("year") or {}).get("sponsor")
            under30.append({**base, "pct": sp, "year_pp": y, "since": mv["from"].get("year"),
                            "trend": None if y is None else "up" if y >= 0.1 else "down" if y <= -0.1 else "flat"})
    for g in lists:
        lists[g]["in"].sort(key=lambda r: (r["jump"], -(r["tk"] or 0), -r["pp"]))
        lists[g]["out"].sort(key=lambda r: (r["jump"], -(r["tk"] or 0), r["pp"]))
    agree_buy.sort(key=lambda r: (-len(r["groups"]), -sum(v or 0 for v in r["pp"].values())))
    agree_sell.sort(key=lambda r: (-len(r["groups"]), sum(v or 0 for v in r["pp"].values())))
    under30.sort(key=lambda r: r["pct"])
    month = max(months, key=months.get) if months else None
    return {"institute": lists["institute"], "foreign": lists["foreign"],
            "agree": {"buying": agree_buy, "selling": agree_sell}, "under30": under30, "month": month}


def owners_report(trades: dict[str, list[dict]], holdings: dict[str, list[dict]],
                  info: dict[str, dict], today: date) -> dict:
    t = trade_rows(trades, info, today)
    o = ownership_lists(holdings, info)

    def tk_sum(rows):
        return sum(r["tk"] or 0 for r in rows if not r["jump"])

    return {
        "as_of": today.isoformat(),
        "month": o["month"],
        "trades": t,
        "institute": o["institute"],
        "foreign": o["foreign"],
        "agree": o["agree"],
        "under30": o["under30"],
        "groups": GROUPS,
        "totals": {
            "trade_buyers": len(t["buying"]), "trade_sellers": len(t["selling"]),
            "inst_in": len(o["institute"]["in"]), "inst_out": len(o["institute"]["out"]),
            "inst_in_tk": tk_sum(o["institute"]["in"]), "inst_out_tk": tk_sum(o["institute"]["out"]),
            "foreign_in": len(o["foreign"]["in"]), "foreign_out": len(o["foreign"]["out"]),
            "agree_buy": len(o["agree"]["buying"]), "agree_sell": len(o["agree"]["selling"]),
            "under30": len(o["under30"]),
        },
    }
