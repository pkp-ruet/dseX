"""Buy List, the week in numbers — INTERNAL ONLY, never shown on the site (no
performance claims; this counts what the list did, not how its shares did).

READ-ONLY: reads ``buy_list_snapshots`` (one row per trading day) and prints,
for each of the last N trading days and for the week (Sunday to Thursday):

  * how many were on the list, passed every question, were held out by a cap
    ("also"), and were kept on grace;
  * who joined and who left, and the reasons the page gave for leaving;
  * the middle gap to our fair price on the list, how many are held above
    their buy price, how many trade slowly, and how sure we are of their fair
    prices (from 2026-11-22: ``fair.sure``).

Use it after the price plan's phases 1-3 to see whether the list is still too
short or too jumpy: a healthy list keeps most of its shares through a week and
says why each one left.

USAGE (repo root; .env supplies MONGODB_URI)
  py scripts/buy_list_week.py
  py scripts/buy_list_week.py --days 15 --out week.md
"""
from __future__ import annotations

import argparse
import pathlib
import statistics
import sys
from collections import Counter
from datetime import date, timedelta

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.services.db_service import get_db  # noqa: E402


def week_start(day: str) -> str:
    d = date.fromisoformat(day)
    return (d - timedelta(days=(d.weekday() + 1) % 7)).isoformat()


def day_line(doc: dict, prev: dict | None) -> tuple[str, dict]:
    p = doc.get("payload") or {}
    items = p.get("items") or []
    members = doc.get("members") or [i["code"] for i in items]
    was = set((prev or {}).get("members") or [])
    joined = [c for c in members if c not in was] if prev else []
    left = sorted(was - set(members)) if prev else []
    gaps = [i["margin_pct"] for i in items if isinstance(i.get("margin_pct"), (int, float))]
    held = sum(1 for i in items if i.get("held"))
    slow = sum(1 for i in items if ((i.get("watch") or {}).get("short") or {}).get("en") == "Trades slowly")
    sure = Counter(((i.get("fair") or {}).get("sure") or {}).get("level") or "not recorded" for i in items)
    reasons = {x["code"]: (x.get("reason") or {}).get("en") for x in (p.get("changes") or {}).get("left") or []}
    line = (f"| {doc['date']} | {len(members)} | {len(doc.get('passed') or [])} | {len(doc.get('also') or [])} "
            f"| {len(doc.get('grace') or [])} | {', '.join(joined) or '-'} | {', '.join(left) or '-'} "
            f"| {statistics.median(gaps) if gaps else '-'}% | {held} | {slow} "
            f"| {', '.join(f'{k} {v}' for k, v in sure.most_common()) or '-'} |")
    return line, {"joined": joined, "left": left, "reasons": reasons, "members": members}


def run(days: int) -> str:
    docs = list(get_db().buy_list_snapshots.find({}, {"_id": 0}).sort("date", -1).limit(days + 1))
    docs.reverse()
    if not docs:
        return "No stored Buy List days yet."
    out = ["# Buy List, the week in numbers (internal, never published)", "",
           "| day | on the list | passed all | held out by a cap | on grace | joined | left "
           "| middle gap to fair price | held above buy price | trades slowly | how sure of the fair price |",
           "|---|--:|--:|--:|--:|---|---|--:|--:|--:|---|"]
    rows = []
    prev = None
    for doc in docs:
        line, info = day_line(doc, prev)
        if prev is not None or len(docs) == 1:
            out.append(line)
            rows.append((doc["date"], info))
        prev = doc
    out.append("")
    weeks: dict[str, dict] = {}
    for day, info in rows:
        w = weeks.setdefault(week_start(day), {"joined": set(), "left": set(), "start": None, "end": None, "reasons": {}})
        w["start"] = w["start"] or set(info["members"]) | set(info["left"]) - set(info["joined"])
        w["end"] = set(info["members"])
        w["joined"] |= set(info["joined"])
        w["left"] |= set(info["left"])
        w["reasons"].update(info["reasons"])
    for ws, w in sorted(weeks.items()):
        kept = len(w["start"] & w["end"]) if w["start"] else 0
        out += [f"## Week of {ws}", "",
                f"- On the list at the end: {len(w['end'])}; kept all week: {kept} of {len(w['start'] or [])}",
                f"- Joined: {', '.join(sorted(w['joined'])) or 'none'}",
                f"- Left: {', '.join(sorted(w['left'])) or 'none'}"]
        for code in sorted(w["left"]):
            if w["reasons"].get(code):
                out.append(f"  - {code}: {w['reasons'][code]}")
        out.append("")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--days", type=int, default=10, help="trading days to show (default 10)")
    ap.add_argument("--out", metavar="PATH", help="also write the report here")
    args = ap.parse_args()
    text = run(args.days)
    sys.stdout.reconfigure(encoding="utf-8")
    print(text)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
