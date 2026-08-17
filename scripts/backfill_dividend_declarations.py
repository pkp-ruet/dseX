"""Rebuild `dividend_declarations` from the news already stored in MongoDB.

The declarations collection used to keep only the latest declaration per company
(unique index on trading_code) and parsed a single percentage out of the body. The
raw "Dividend Declaration" news items are still in `company_news` for the whole
lookback window, so the full history — interim + final, cash/stock split, AGM
dates, period ends — can be rebuilt offline without re-hitting DSE.

Usage:
    py scripts/backfill_dividend_declarations.py            # dry run, prints a diff
    py scripts/backfill_dividend_declarations.py --write    # apply
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from db.connection import get_db  # noqa: E402
from db.models import ensure_indexes  # noqa: E402
from scrapers.news import (  # noqa: E402
    apply_declaration_amendment,
    build_declaration_doc,
    is_declaration_news,
    save_declaration,
)


def _d(value):
    return value.date().isoformat() if hasattr(value, "date") else "—"


def find_stale_docs(db, real_items: list[dict]) -> list[dict]:
    """Declaration docs that came from a *follow-up* notice, not a declaration.

    The old scraper stored whatever "Dividend Declaration"-titled news came last,
    including "(Additional Information)" notices — which is how EPGL ended up with
    a 54.14% dividend parsed out of a sponsor-shareholding sentence. A doc is stale
    when its company has real declaration news but that doc's date isn't one of
    them, and it isn't simply older history (before the oldest real declaration we
    can still see for that company).
    """
    valid: dict[str, set] = {}
    oldest: dict[str, object] = {}
    for item in real_items:
        code = item["trading_code"]
        valid.setdefault(code, set()).add(item["post_date"])
        if code not in oldest or item["post_date"] < oldest[code]:
            oldest[code] = item["post_date"]

    stale = []
    for doc in db.dividend_declarations.find({}):
        code = doc.get("trading_code")
        if code not in valid:
            continue                                  # news aged out — leave alone
        decl_date = doc.get("declaration_date")
        if decl_date in valid[code]:
            continue
        if decl_date is None or decl_date < oldest[code]:
            continue                                  # genuine older history
        stale.append(doc)
    return stale


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="apply changes (default: dry run)")
    parser.add_argument("--limit", type=int, default=0, help="only process N news items")
    parser.add_argument(
        "--no-prune", action="store_true",
        help="keep declaration docs that were written from follow-up notices",
    )
    args = parser.parse_args()

    db = get_db()

    news = list(
        db.company_news.find(
            {"title": {"$regex": "Dividend Declaration"}},
            {"_id": 0, "trading_code": 1, "title": 1, "body": 1, "post_date": 1, "scraped_at": 1},
        ).sort("post_date", 1)
    )
    if args.limit:
        news = news[: args.limit]

    print(f"declaration news items in company_news : {len(news)}")
    print(f"docs currently in dividend_declarations: {db.dividend_declarations.count_documents({})}")

    real = [item for item in news if is_declaration_news(item)]
    follow_ups = [item for item in news if not is_declaration_news(item)]
    docs = [build_declaration_doc(item) for item in real]

    with_record = sum(1 for d in docs if d["record_date"])
    with_agm = sum(1 for d in docs if d["agm_date"])
    with_stock = sum(1 for d in docs if d["stock_pct"])
    no_cash = sum(1 for d in docs if not d["cash_pct"])
    print(
        f"declarations {len(docs)} | follow-up notices {len(follow_ups)} | "
        f"record_date {with_record} | agm_date {with_agm} | "
        f"stock dividend {with_stock} | zero cash {no_cash}"
    )

    stale = [] if args.no_prune else find_stale_docs(db, real)
    if stale:
        print(f"\n-- {len(stale)} doc(s) written from follow-up notices, to be removed --")
        for doc in stale:
            print(
                f"  {doc['trading_code']:<12} {_d(doc.get('declaration_date'))} "
                f"pct {doc.get('dividend_pct')}  «{doc.get('title')}»"
            )

    if not args.write:
        print("\n-- sample (dry run, nothing written) --")
        for d in docs[-12:]:
            print(
                f"  {d['trading_code']:<12} {_d(d['declaration_date'])} {d['dividend_type']:<8} "
                f"cash {d['cash_pct']:>6}%  stock {d['stock_pct']:>5}%  "
                f"record {_d(d['record_date'])}  agm {_d(d['agm_date'])}"
            )
        print("\nRe-run with --write to apply.")
        return 0

    ensure_indexes()

    inserted = sum(1 for doc in docs if save_declaration(db, doc))
    # Follow-ups are applied after, in date order, so a corrected record date wins.
    amended = sum(
        1 for item in sorted(follow_ups, key=lambda i: i["post_date"])
        if apply_declaration_amendment(db, item)
    )

    removed = 0
    if stale:
        res = db.dividend_declarations.delete_many({"_id": {"$in": [d["_id"] for d in stale]}})
        removed = res.deleted_count

    total = db.dividend_declarations.count_documents({})
    print(
        f"\nwrote {len(docs)} declarations ({inserted} new), applied {amended} amendments, "
        f"removed {removed} follow-up artifacts — collection now holds {total}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
