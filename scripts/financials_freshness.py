"""Which companies' Amarstock data (cash flow, borrowings, margins) runs behind
DSE's own yearly table — read-only (2026-11-05, audit DT4).

On 2026-11-04 the Amarstock rows stopped at FY2024 for 126 companies whose DSE
table already had FY2025 (UCB, UNILEVERCL …), so the finances and business
parts of the grade ran a year behind the profit figures. This lists them with
when each was last read (`scraped_at`, written by the cash-flow scraper from
2026-11-05), so a gap can be traced to the source or the scraper.

  py scripts/financials_freshness.py            # summary + the companies a year+ behind
  py scripts/financials_freshness.py --all      # every company
"""
import argparse
import pathlib
import sys
from collections import Counter

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv  # noqa: E402

load_dotenv()

from db.connection import get_db  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--all", action="store_true", help="list every company, not only those behind")
    args = ap.parse_args()
    db = get_db()
    dse = {d["_id"]: d["y"] for d in db.financials.aggregate([{"$group": {"_id": "$trading_code", "y": {"$max": "$year"}}}])}
    ext = {d["_id"]: (d["y"], d.get("at")) for d in db.company_financials_ext.aggregate(
        [{"$group": {"_id": "$trading_code", "y": {"$max": "$year"}, "at": {"$max": "$scraped_at"}}}])}
    rows = []
    for code in sorted(set(dse) | set(ext)):
        dy = dse.get(code)
        ey, at = ext.get(code, (None, None))
        gap = (dy - ey) if (dy is not None and ey is not None) else None
        rows.append((code, dy, ey, gap, at))
    print("Amarstock behind DSE by (years):", dict(sorted(Counter(r[3] for r in rows).items(), key=lambda kv: (kv[0] is None, kv[0] or 0))))
    print(f"{'code':12s} {'DSE':>5s} {'Amarstock':>9s} {'gap':>4s}  last read")
    for code, dy, ey, gap, at in rows:
        if args.all or (gap is not None and gap >= 1) or ey is None:
            print(f"{code:12s} {dy or '-':>5} {ey or '-':>9} {gap if gap is not None else '-':>4}  {at or 'never recorded'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
