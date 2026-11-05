"""The Friday letter — pure builders (2026-10-31, the Premium Desk plan).

One letter a week for every reader who holds or follows a share, in four
parts:

1. **Your shares this week** — how their shares moved since last Thursday's
   close, and what the watcher spotted on them (`portfolio_watch.digest`).
   This part is free: a free reader gets it in the push / email and in full on
   the Desk.
2. **The market in five lines** — mood, DSEX over the week, sectors, how
   many companies are healthy (built once from `market_state_service`).
3. **Serious problems this week** — companies that picked up or got rid of
   a serious problem (the risk register), and the reader's own on it.
4. **Next week on your shares** — results meetings and record dates.

Parts 2–4 are Premium on the Desk (screen-only, like every lock); the push
and email tell a free reader they are there. Loads, storage and sending live
in `weekly_letter_service.py`. Facts only: never a buy or sell call, never a
claim about how our picks did.
"""
from __future__ import annotations

from datetime import date
from typing import Optional

from backend.services import morning_brief as mb
from backend.services import portfolio_watch as watch

# A weekly move smaller than this reads "hardly moved".
QUIET_PCT = 1.0
MOVE_LINES = 4
WATCH_LINES = 3
LIST_CODES = 3
DATE_LINES = 6
NEXT_WEEK_DAYS = 7
FREE_PARTS = ("shares",)


def line(en: str, bn: str, url: Optional[str] = None, tone: str = "neutral",
         code: Optional[str] = None) -> dict:
    out = {"en": en, "bn": bn, "tone": tone}
    if url:
        out["url"] = url
    if code:
        out["code"] = code
    return out


def _pct(v: float) -> str:
    return f"{abs(v):.1f}%"


def _plural(n: int, one: str, many: str) -> str:
    return one if n == 1 else many


_SUFFIXES = (" limited", " ltd.", " ltd", " plc.", " plc", " company", " co.")


def short_name(name: Optional[str], code: str) -> str:
    """"SAIF Powertec Limited" → "SAIF Powertec"; the code when there is no name."""
    n = " ".join((name or "").split())
    if not n:
        return code
    changed = True
    while changed:
        changed = False
        for suf in _SUFFIXES:
            if n.lower().endswith(suf) and len(n) > len(suf) + 2:
                n, changed = n[: -len(suf)].rstrip(" ,."), True
    if n.lower().startswith("the "):
        n = n[4:]
    return n or code


def week_moves(closes_then: dict[str, float], closes_now: dict[str, float]) -> dict[str, float]:
    """{code: % move} between last week's close and this week's."""
    out = {}
    for code, now in closes_now.items():
        then = closes_then.get(code)
        if then and now and then > 0:
            out[code] = round((now - then) / then * 100.0, 2)
    return out


def shares_part(held: dict[str, int], watched: set[str], moves: dict[str, float],
                week_digest: Optional[dict], names: dict[str, str]) -> dict:
    """Part 1: the reader's own shares. Free."""
    mine = sorted(set(held) | set(watched))
    lines: list[dict] = []
    moved = {c: moves[c] for c in mine if c in moves}
    if moved:
        up = sum(1 for v in moved.values() if v > 0)
        down = sum(1 for v in moved.values() if v < 0)
        n = len(moved)
        lines.append(line(
            f"Of your {n} {_plural(n, 'share', 'shares')}, {up} rose and {down} fell this week.",
            f"আপনার {n}টি শেয়ারের মধ্যে এ সপ্তাহে {up}টির দাম বেড়েছে, {down}টির কমেছে।",
        ))
        big = sorted(((c, v) for c, v in moved.items() if abs(v) >= QUIET_PCT),
                     key=lambda cv: -abs(cv[1]))[:MOVE_LINES]
        for code, v in big:
            own_en = " You own it." if code in held else ""
            own_bn = " শেয়ারটি আপনার কাছে আছে।" if code in held else ""
            name = short_name(names.get(code), code)
            if v > 0:
                en, bn = f"{name} rose {_pct(v)} this week.{own_en}", f"{name}-এর দাম এ সপ্তাহে {_pct(v)} বেড়েছে।{own_bn}"
            else:
                en, bn = f"{name} fell {_pct(v)} this week.{own_en}", f"{name}-এর দাম এ সপ্তাহে {_pct(v)} কমেছে।{own_bn}"
            lines.append(line(en, bn, f"/stock/{code}", "good" if v > 0 else "bad", code))
        if not big:
            lines.append(line("None of your shares moved more than 1% this week.",
                              "এ সপ্তাহে আপনার কোনো শেয়ারের দাম 1%-এর বেশি ওঠানামা করেনি।"))
    d = week_digest or {}
    if d.get("total"):
        kinds = d.get("kinds") or []
        lines.append(line(
            f"We spotted {watch.kinds_phrase(kinds, 'en')} on your shares.",
            f"আপনার শেয়ারে আমরা {watch.kinds_phrase(kinds, 'bn')} পেয়েছি।",
        ))
        for e in (d.get("items") or [])[:WATCH_LINES]:
            code = (e.get("code") or "").upper()
            anchor = watch._STOCK_ANCHOR.get(e.get("kind"))
            url = f"/stock/{code}" + (f"#{anchor}" if anchor else "") if code else None
            tone = "bad" if e.get("level") == "bad" else "good" if e.get("level") == "good" else "neutral"
            lines.append(line(e.get("title_en") or "", e.get("title_bn") or e.get("title_en") or "", url, tone, code or None))
    elif mine:
        lines.append(line("Nothing new from the companies themselves this week.",
                          "এ সপ্তাহে কোম্পানিগুলোর দিক থেকে নতুন কিছু আসেনি।"))
    return {"key": "shares", "title_en": "Your shares this week", "title_bn": "এ সপ্তাহে আপনার শেয়ার",
            "lines": lines}


def market_part(state: Optional[dict]) -> dict:
    """Part 2: the market in five lines, from the market-state bundle (/dse-today).
    Built once for every reader."""
    s = state or {}
    mood = s.get("mood") or {}
    st = s.get("stats") or {}
    lines: list[dict] = []
    if mood.get("label"):
        lines.append(line(f"The market's mood at the last close: {mood['label']}.",
                          f"শেষ লেনদেনের দিনে বাজারের অবস্থা: {mood.get('label_bn') or mood['label']}।",
                          "/dse-today"))
    wk, dsex = st.get("week_change_pct"), st.get("dsex")
    if wk is not None and dsex:
        lvl = f"{dsex:,.0f}"
        if abs(wk) < 0.1:
            en, bn = f"DSEX ended the week about where it began, at {lvl}.", f"ডিএসইএক্স সপ্তাহ শেষ করেছে প্রায় শুরুর জায়গাতেই, {lvl}-এ।"
        elif wk > 0:
            en, bn = f"DSEX rose {_pct(wk)} this week, to {lvl}.", f"এ সপ্তাহে ডিএসইএক্স {_pct(wk)} বেড়ে {lvl}-এ।"
        else:
            en, bn = f"DSEX fell {_pct(wk)} this week, to {lvl}.", f"এ সপ্তাহে ডিএসইএক্স {_pct(wk)} কমে {lvl}-এ।"
        lines.append(line(en, bn, "/dse-today", "good" if wk > 0.1 else "bad" if wk < -0.1 else "neutral"))
    sectors = [r for r in ((s.get("now") or {}).get("sectors") or []) if r.get("ret_1w") is not None]
    if len(sectors) >= 2:
        best = max(sectors, key=lambda r: r["ret_1w"])
        worst = min(sectors, key=lambda r: r["ret_1w"])
        if best["ret_1w"] > 0:
            lines.append(line(f"{best['name']} did best this week, up {_pct(best['ret_1w'])}.",
                              f"এ সপ্তাহে সবচেয়ে ভালো করেছে {best['name']}, {_pct(best['ret_1w'])} বেড়েছে।", tone="good"))
        if worst["ret_1w"] < 0 and worst is not best:
            lines.append(line(f"{worst['name']} did worst, down {_pct(worst['ret_1w'])}.",
                              f"সবচেয়ে খারাপ করেছে {worst['name']}, {_pct(worst['ret_1w'])} কমেছে।", tone="bad"))
    q = (s.get("now") or {}).get("quality") or {}
    if q.get("total"):
        healthy = int(q.get("strong") or 0) + int(q.get("good") or 0)
        delta = ((q.get("trend") or {}).get("healthy_delta_1w"))
        more_en = more_bn = ""
        if delta:
            more_en = f", {abs(delta)} {'more' if delta > 0 else 'fewer'} than a week ago"
            more_bn = f", এক সপ্তাহ আগের চেয়ে {abs(delta)}টি {'বেশি' if delta > 0 else 'কম'}"
        lines.append(line(f"{healthy} of {q['total']} companies are mostly strong or better{more_en}.",
                          f"{q['total']}টি কোম্পানির মধ্যে {healthy}টি বেশিরভাগ দিকে শক্তিশালী বা তার বেশি{more_bn}।",
                          "/dsestockranking"))
    if mood.get("sentence2") and len(lines) < 5:
        lines.append(line(mood["sentence2"], mood.get("sentence2_bn") or mood["sentence2"]))
    return {"key": "market", "title_en": "The market in five lines", "title_bn": "পাঁচ লাইনে বাজার",
            "lines": lines[:5]}


def risks_part(week: Optional[dict], on_list: set[str], mine: set[str], names: dict[str, str]) -> dict:
    """Part 3 (2026-11-05, replaced "New on our research lists" when the lists
    were removed): serious problems this week, from the risk register
    (`research_reports.risk_register`). `week` = its {added, fixed} rows (None
    when the register couldn't be read), `on_list` = every code on it today."""
    url = "/stock-insights/risk-register"
    lines: list[dict] = []
    if week is None:
        lines.append(line("Our list of companies with serious problems is on the Desk.",
                          "গুরুতর সমস্যার কোম্পানির তালিকা ডেস্কে আছে।", url))
    else:
        added = week.get("added") or []
        fixed = week.get("fixed") or []
        new_co = len({r["code"] for r in added})
        gone_co = len({r["code"] for r in fixed})
        if new_co or gone_co:
            lines.append(line(
                f"{new_co} {_plural(new_co, 'company', 'companies')} picked up a serious problem this week, "
                f"and {gone_co} got rid of one.",
                f"এ সপ্তাহে {new_co}টি কোম্পানিতে নতুন গুরুতর সমস্যা দেখা দিয়েছে, আর {gone_co}টির একটি সমস্যা মিটেছে।",
                url))
        else:
            lines.append(line("No company picked up or got rid of a serious problem this week.",
                              "এ সপ্তাহে কোনো কোম্পানিতে নতুন গুরুতর সমস্যা আসেনি, কোনোটি মেটেওনি।", url))
        for rows, tone, en_w, bn_w in ((added, "bad", "new this week", "এ সপ্তাহে নতুন"),
                                       (fixed, "good", "gone this week", "এ সপ্তাহে মিটেছে")):
            for r in rows:
                if r["code"] not in mine:
                    continue
                t = r.get("title") or {}
                nm = names.get(r["code"]) or r["code"]
                lines.append(line(f"{nm}: {t.get('en', '')} ({en_w}).", f"{nm}: {t.get('bn', '')} ({bn_w})।",
                                  f"/stock/{r['code']}#an-safety", tone))
    yours = sorted(on_list & mine)
    if yours:
        more = len(yours) - LIST_CODES
        shown = ", ".join(yours[:LIST_CODES]) + (f" and {more} more" if more > 0 else "")
        shown_bn = ", ".join(yours[:LIST_CODES]) + (f" ও আরও {more}টি" if more > 0 else "")
        verb = "is" if len(yours) == 1 else "are"
        lines.append(line(f"{len(yours)} of your shares {verb} on the list today: {shown}.",
                          f"আপনার {len(yours)}টি শেয়ার আজ এই তালিকায় আছে: {shown_bn}।", url, "bad"))
    elif week is not None:
        lines.append(line("None of your shares is on the list today.",
                          "আপনার কোনো শেয়ার আজ এই তালিকায় নেই।", url, "good"))
    return {"key": "risks", "title_en": "Serious problems this week", "title_bn": "এ সপ্তাহের গুরুতর সমস্যা",
            "lines": lines}


def _lab(label_en: Optional[str]) -> str:
    """"Q1 results" stays, "Yearly results" → "yearly results" mid-sentence."""
    lab = label_en or "results"
    return lab if lab[:1] == "Q" else lab[:1].lower() + lab[1:]


def _when(d: date, today: date) -> tuple[str, str]:
    """("on Tue 4 Nov" | "tomorrow", the Bengali)."""
    en, bn = mb.day_words(d, today)
    return (en if en == "tomorrow" else f"on {en}"), bn


def dates_part(mine: set[str], held: dict[str, int], meetings: list[dict], record_rows: list[dict],
               today: date) -> dict:
    """Part 4: results meetings and record dates on the reader's shares in the
    next seven days. `meetings` = results calendar rows; `record_rows` = the
    dividend calendar's record dates."""
    rows: list[tuple[str, dict]] = []
    for m in meetings:
        code = (m.get("code") or "").upper()
        if code not in mine or not m.get("date"):
            continue
        d = date.fromisoformat(m["date"][:10])
        if not 0 < (d - today).days <= NEXT_WEEK_DAYS:
            continue
        w_en, w_bn = _when(d, today)
        rows.append((m["date"][:10], line(
            f"{code}: the board meets {w_en} on its {_lab(m.get('label_en'))}.",
            f"{code}: {m.get('label_bn') or 'আর্থিক ফল'} নিয়ে পর্ষদ সভা {w_bn}।",
            f"/stock/{code}#results", code=code)))
    for r in record_rows:
        code = (r.get("trading_code") or "").upper()
        rd = r.get("record_date")
        if code not in mine or not rd:
            continue
        d = date.fromisoformat(rd[:10])
        if not 0 < (d - today).days <= NEXT_WEEK_DAYS:
            continue
        w_en, w_bn = _when(d, today)
        cash = r.get("cash_per_share")
        qty = held.get(code) or 0
        if cash and qty:
            tk = cash * qty
            extra_en, extra_bn = (f" Your {qty:,} shares get about ৳{tk:,.0f} before tax.",
                                  f" আপনার {qty:,}টি শেয়ারে কর কাটার আগে প্রায় ৳{tk:,.0f}।")
        elif cash:
            extra_en, extra_bn = f" ৳{cash:,.2f} a share.", f" শেয়ারপ্রতি ৳{cash:,.2f}।"
        else:
            extra_en = extra_bn = ""
        rows.append((rd[:10], line(f"{code}: record date {w_en}.{extra_en}",
                                   f"{code}: রেকর্ড ডেট {w_bn}।{extra_bn}",
                                   f"/stock/{code}#dividends", code=code)))
    rows.sort(key=lambda x: x[0])
    lines = [ln for _d, ln in rows[:DATE_LINES]]
    if not lines:
        lines.append(line("No results meetings or record dates on your shares next week.",
                          "আগামী সপ্তাহে আপনার শেয়ারে কোনো ফলাফলের সভা বা রেকর্ড ডেট নেই।"))
    return {"key": "dates", "title_en": "Next week on your shares", "title_bn": "আগামী সপ্তাহে আপনার শেয়ার",
            "lines": lines}


def build_letter(week: str, parts: list[dict]) -> dict:
    """The stored letter. Each part says whether it is free."""
    return {"week": week,
            "parts": [{**p, "free": p["key"] in FREE_PARTS} for p in parts]}


def worth_sending(letter: dict) -> bool:
    """Send when the reader's own part has something (it always has at least
    the up/down line when any of their shares traded)."""
    shares = next((p for p in letter.get("parts") or [] if p["key"] == "shares"), None)
    return bool(shares and shares.get("lines"))


def push_payload(letter: dict, lang: str = "bn", premium: bool = False) -> Optional[dict]:
    """The Friday push: the reader's own first lines; a free reader is told the
    other three parts are on the Desk."""
    shares = next((p for p in letter.get("parts") or [] if p["key"] == "shares"), None)
    if not shares or not shares.get("lines"):
        return None
    bn = lang != "en"
    k = "bn" if bn else "en"
    body = " ".join(ln[k] for ln in shares["lines"][:2])
    if not premium:
        body += " " + ("আরও 3টি অংশ আপনার ডেস্কে।" if bn else "3 more parts on your Desk.")
    return {"title": "আপনার সাপ্তাহিক চিঠি" if bn else "Your weekly letter",
            "body": body[:300], "url": "/desk?src=letter#letter", "tag": "letter"}
