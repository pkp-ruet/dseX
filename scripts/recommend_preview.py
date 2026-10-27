"""
Read-only look at the recommendation engine on live data — run it before
deploying a change to ``backend/services/recommend.py``.

    py scripts/recommend_preview.py                     # funnel + generic list + sample readers
    py scripts/recommend_preview.py --codes GP,BATBC    # a reader who follows these
    py scripts/recommend_preview.py --held SQURPHARMA:100 --codes GP
    py scripts/recommend_preview.py --portfolio EBL:500,CITYBANK:400

Writes nothing (``track=False``). Checks to eyeball: familiar strong names
lead the generic list, no sector over three, every "Like X" / "Stronger than
X" names a real stock of the reader's, and no weak stock anywhere.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding="utf-8")  # Bengali in the --bn view

from backend.services import recommend_service as rs  # noqa: E402
from backend.services.signal_service import build_signals, holding_signal  # noqa: E402
from backend.services.tiers import tier_key  # noqa: E402


def _holdings(spec: str) -> list[dict]:
    """"CODE:QTY,…" -> portfolio-GET-shaped rows bought at today's price."""
    facts = rs.pool()["facts"]
    sigs = build_signals()
    out = []
    for part in [p for p in (spec or "").split(",") if p.strip()]:
        code, _, qty = part.strip().upper().partition(":")
        price = (facts.get(code) or {}).get("ltp") or 0.0
        sig = sigs.get(code)
        out.append({"trading_code": code, "qty": int(qty or 100), "buy_price": price,
                    "signal": holding_signal(sig, 0.0, (sig or {}).get("p4_val"))})
    return out


def _print_list(title: str, res: dict, bn: bool) -> None:
    print(f"\n=== {title} — {res['mode']}, based on {res['based_on']}")
    if res["traits"]:
        print("    traits:", " · ".join(t["en"] for t in res["traits"]))
    for i, it in enumerate(res["items"], 1):
        tag = it["tag_bn"] if bn else it["tag_en"]
        why = it["why_bn"] if bn else it["why_en"]
        print(f"{i:>2}. {it['code']:<11} {it['rank_score']:>5}  {(it['sector'] or '')[:18]:<18} [{tag}] {why}")
    if res.get("note"):
        print("    note:", res["note"]["en"])


def _print_plan(res: dict, bn: bool) -> None:
    L = "bn" if bn else "en"
    print("\n=== Portfolio — what to buy next")
    for g in res["gaps"]:
        print("  gap:", g[L])
    for p in res["picks"]:
        print(f"  {p['kind']:<10} {p['code']:<11} {p.get('replaces') or '':<10} {p['why_' + L]}  {p['suggest']}")
    if res.get("none_reason"):
        print("  none:", res["none_reason"][L])


def _samples() -> dict[str, tuple[str, list[str]]]:
    """Synthetic readers picked from today's data."""
    facts = rs.pool()["facts"]
    weak = sorted([f for f in facts.values() if tier_key(f.get("score")) == "weak" and f.get("sector")
                   in {"Pharmaceuticals & Chemicals", "Insurance", "Bank", "Textile"}],
                  key=lambda f: f.get("mcap_mn") or 0, reverse=True)
    payers = sorted([f for f in facts.values() if tier_key(f.get("score")) in ("good", "excellent")
                     and (f.get("div_yield_pct") or 0) >= 5], key=lambda f: -(f.get("div_yield_pct") or 0))
    return {
        "Bank-heavy portfolio": ("EBL:2000,CITYBANK:1500,BRACBANK:800", ["DUTCHBANGL"]),
        "Weak-stock watchlist": ("", [f["code"] for f in weak[:4]]),
        "Dividend lover": ("", [f["code"] for f in payers[:5]]),
        "One-stock beginner": ("SQURPHARMA:50", []),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--codes", default="", help="followed codes, comma-separated")
    ap.add_argument("--held", default="", help="owned CODE:QTY, comma-separated")
    ap.add_argument("--portfolio", default="", help="CODE:QTY holdings for 'what to buy next'")
    ap.add_argument("--bn", action="store_true", help="print the Bengali words")
    a = ap.parse_args()

    p = rs.pool()
    f = p["funnel"]
    print(f"as of {p['as_of']}: {f['rated']} rated · {f['buys']} Buy signals · {f['passed']} pass every check")
    for c in f["checks"]:
        print(f"    {c['left']:>3} left after: {c['en']}")

    user = {"user_id": None}
    if a.codes or a.held:
        _print_list("Your reader", rs.for_user(user, _holdings(a.held), [c.strip().upper() for c in a.codes.split(",") if c.strip()], track=False), a.bn)
    elif not a.portfolio:
        _print_list("No stocks yet", rs.generic(), a.bn)
        for title, (held, watched) in _samples().items():
            _print_list(f"{title} (held {held or '-'}, follows {','.join(watched) or '-'})",
                        rs.for_user(user, _holdings(held), watched, track=False), a.bn)
            if held:
                _print_plan(rs.for_portfolio(user, _holdings(held), watched), a.bn)
    if a.portfolio:
        _print_plan(rs.for_portfolio(user, _holdings(a.portfolio), []), a.bn)


if __name__ == "__main__":
    main()
