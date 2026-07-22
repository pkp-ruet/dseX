"""
Seed the durable deep-analysis reports from ``data/deep_analysis/*.json`` into
the MongoDB ``deep_analysis`` collection.

This is the DB-write step the skill deliberately keeps separate: generation
(``save_analysis.py``) only ever writes JSON files; this script pushes those
files into the database that the backend serves from. It is idempotent — an
upsert keyed on ``trading_code`` (one report per company) — so re-running it
just refreshes whatever changed.

Every file is re-validated with the same gate ``save_analysis`` uses, so a
malformed file on disk can never reach the database.

Usage (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/seed_db.py                # seed every report file
    py scripts/deep_analysis/seed_db.py --code GP      # seed one
    py scripts/deep_analysis/seed_db.py --dry-run      # validate + report, write nothing
"""
import argparse
import json
import pathlib
import sys
from datetime import datetime, timezone

_HERE = pathlib.Path(__file__).resolve().parent
REPO_ROOT = _HERE.parents[1]
DEFAULT_DIR = REPO_ROOT / "data" / "deep_analysis"

sys.path.insert(0, str(REPO_ROOT))
try:
    sys.stdout.reconfigure(encoding="utf-8")  # Bengali content on Windows consoles
except Exception:
    pass

# Same validation gate the file writer uses (module lives next to this one).
import save_analysis  # noqa: E402
from pymongo import ASCENDING  # noqa: E402
from db.connection import get_db, close_connection  # noqa: E402


def _load(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _collect(dir_path: pathlib.Path, code: str | None) -> list[pathlib.Path]:
    if code:
        p = dir_path / f"{code.strip().upper()}.json"
        return [p] if p.exists() else []
    return sorted(p for p in dir_path.glob("*.json"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed deep-analysis reports into MongoDB.")
    parser.add_argument("--dir", default=str(DEFAULT_DIR),
                        help=f"Folder of <CODE>.json report files (default: {DEFAULT_DIR})")
    parser.add_argument("--code", help="Seed only this trading code")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate and report, but do not write to the database")
    args = parser.parse_args()

    dir_path = pathlib.Path(args.dir)
    if not dir_path.is_dir():
        print(f"report dir '{dir_path}' not found", file=sys.stderr)
        return 1

    files = _collect(dir_path, args.code)
    if not files:
        where = f"code {args.code.upper()}" if args.code else f"any *.json in {dir_path}"
        print(f"No report files found for {where}.", file=sys.stderr)
        return 1

    db = None
    if not args.dry_run:
        db = get_db()
        # Self-heal the unique index (models.ensure_indexes also declares it).
        db.deep_analysis.create_index([("trading_code", ASCENDING)], unique=True)

    seeded = skipped = failed = 0
    try:
        for path in files:
            try:
                doc = _load(path)
                save_analysis.validate(doc)  # raises ValidationError on bad content
                code = doc["trading_code"].strip().upper()
                doc["trading_code"] = code
            except (save_analysis.ValidationError, json.JSONDecodeError) as e:
                failed += 1
                print(f"REJECTED {path.name}: {e}", file=sys.stderr)
                continue

            if args.dry_run:
                print(f"ok (dry-run)  {code}  ({len(doc['sections'])} sections)")
                skipped += 1
                continue

            doc["seeded_at"] = datetime.now(timezone.utc).isoformat()
            doc.pop("_id", None)
            db.deep_analysis.update_one(
                {"trading_code": code}, {"$set": doc}, upsert=True
            )
            h = (doc.get("source_hash") or "")[:8]
            print(f"seeded  {code}  ({len(doc['sections'])} sections, hash={h})")
            seeded += 1

        if not args.dry_run:
            total = db.deep_analysis.count_documents({})
            print(f"\nSeeded {seeded}, rejected {failed}. "
                  f"Collection now holds {total} report(s).")
        else:
            print(f"\nDry run: {skipped} valid, {failed} rejected. Nothing written.")
    finally:
        if not args.dry_run:
            close_connection()

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
