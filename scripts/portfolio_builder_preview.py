"""
Read-only look at the portfolio builder on live data — run it before
deploying a change to ``backend/services/portfolio_builder.py``.

    py scripts/portfolio_builder_preview.py                       # ৳1 lakh, every purpose
    py scripts/portfolio_builder_preview.py --amount 25000 --purpose income
    py scripts/portfolio_builder_preview.py --likes big,cash --leave banks,insurers
    py scripts/portfolio_builder_preview.py --amount 5000000 --bn
    py scripts/portfolio_builder_preview.py --held EBL:2000:25,CITYBANK:1500:28,GP:100:240   # start from these shares

Writes nothing (no reader, no saved plan). Checks to eyeball: familiar strong
names, no business over 30%, no share over 20%, banks + finance + insurers
under 30%, the totals adding up to the amount, and a sensible waiting share.
"""
from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.stdout.reconfigure(encoding="utf-8")

from backend.services import portfolio_builder as pb  # noqa: E402
from backend.services import portfolio_builder_service as svc  # noqa: E402


def _show(plan: dict, lang: str) -> None:
    a, t = plan["answers"], plan["totals"]
    print(f"\n=== {pb._taka(a['amount'])} · {a['purpose']} · {a['horizon']} · likes {a['likes']} · "
          f"leave out {a['leave_out']} ===")
    print(f"pool: {plan['pool']['strong']} strong, {plan['pool']['fit']} fit · target {plan['target']} shares")
    for i in plan["items"]:
        state = "now " if i["state"] == "now" else f"wait under {i['wait_under']}"
        print(f"  {i['code']:<12} {i['job']:<5} {state:<16} {i['qty']:>6} × {i['wait_under'] or i['price']:>8}"
              f" = {pb._taka(i['amount']):>12}  {i['weight_pct']:>5}%  {i['sector']}")
        print(f"      {i['why'][lang]}")
        if i["watch"]:
            print(f"      watch: {i['watch'][lang]}")
    print(f"  now {pb._taka(t['now'])} · kept {pb._taka(t['kept'])} · fee {pb._taka(t['fee'])} · "
          f"left {pb._taka(t['left'])} · cash a year {pb._taka(t['cash_year'])} · "
          f"{t['businesses']} businesses · finance {t['financial_pct']}%")
    for j in plan["jobs"]:
        print(f"  job {j['job']}: {pb._taka(j['amount'])} ({j['pct']}%)")
    for n in plan["notes"]:
        print(f"  note [{n['key']}]: {n[lang]}")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--amount", type=float, default=100_000)
    ap.add_argument("--purpose", default="")
    ap.add_argument("--horizon", default="gt3")
    ap.add_argument("--likes", default="")
    ap.add_argument("--leave", default="")
    ap.add_argument("--held", default="", help="CODE:QTY:PRICE,… — start from these shares")
    ap.add_argument("--bn", action="store_true")
    args = ap.parse_args()
    held = []
    for part in [x for x in args.held.split(",") if x.strip()]:
        code, qty, price = part.strip().upper().split(":")
        held.append({"trading_code": code, "qty": int(qty), "buy_price": float(price)})
    purposes = [args.purpose] if args.purpose else list(pb.PURPOSES)
    for p in purposes:
        plan = svc.preview({
            "amount": args.amount, "purpose": p, "horizon": args.horizon,
            "likes": [x for x in args.likes.split(",") if x],
            "leave_out": [x for x in args.leave.split(",") if x],
            "start": "mine" if held else "fresh",
        }, holdings=held or None)
        _show(plan, "bn" if args.bn else "en")
        if plan.get("held"):
            t = plan["totals"]
            print(f"  held {pb._taka(t['held'])} → {pb._taka(t['total_after'])} · {t['shares_after']} shares in "
                  f"{t['businesses_after']} businesses · held cash a year {pb._taka(t['cash_year_held'])}")


if __name__ == "__main__":
    main()
