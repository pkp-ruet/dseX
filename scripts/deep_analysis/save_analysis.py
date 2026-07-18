"""
Validate a deep-analysis report and upsert it into the `deep_analysis`
MongoDB collection (one document per trading_code).

The report JSON is written by Claude Code from a fact pack (see the skill
`.claude/skills/deep-stock-analysis`). This writer is the gate: it rejects a
malformed / half-written report (clear message, non-zero exit, nothing stored)
so bad LLM output can never silently land. It follows the idempotent upsert
pattern of `scoring_service._store_snapshot`.

The report should carry the `source_hash` and `data_completeness` copied from
its fact pack (the cost gate in `status.py` reads them back). If they are
missing you may supply the fact pack with `--facts` and they'll be pulled from
there.

Usage (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/save_analysis.py --code GP --file facts/GP.analysis.json
    py scripts/deep_analysis/save_analysis.py --code GP --file GP.analysis.json --facts facts/GP.json
    py scripts/deep_analysis/save_analysis.py --dir facts        # every *.analysis.json in facts/
"""
import argparse
import json
import pathlib
import sys
from datetime import datetime, timezone

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parents[1]))  # repo root
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from pymongo import ASCENDING, ReplaceOne  # noqa: E402
from backend.services.db_service import get_db, close_db  # noqa: E402

COLLECTION = "deep_analysis"
SCHEMA_VERSION = 1
MODEL = "claude-code"

# The durable narrative sections, in fixed order (must match the skill).
# Price-relative content (today's price, the cheap/fair/expensive stance, the
# scorecard, recent returns, the 52-week position) is intentionally NOT stored —
# it is computed live at serve time (Option A) so the report never goes stale.
SECTION_KEYS = [
    "story", "business_model", "earnings", "financial_health", "valuation",
    "dividend", "moat", "bull_case", "bear_case", "bottom_line",
]

_SECTION_FIELDS = ("title_en", "takeaway_en", "body_en", "title_bn", "takeaway_bn", "body_bn")


class ValidationError(ValueError):
    pass


def _nonempty_str(v) -> bool:
    return isinstance(v, str) and bool(v.strip())


def validate(doc: dict) -> None:
    """Raise ValidationError if the report is not a complete, well-formed bilingual doc."""
    if not isinstance(doc, dict):
        raise ValidationError("report is not a JSON object")

    if not _nonempty_str(doc.get("trading_code")):
        raise ValidationError("missing trading_code")
    code = doc["trading_code"]

    for f in ("headline_en", "headline_bn", "bottom_line_en", "bottom_line_bn",
              "disclaimer_en", "disclaimer_bn"):
        if not _nonempty_str(doc.get(f)):
            raise ValidationError(f"[{code}] missing/empty '{f}'")

    # Sections: exactly the durable set, correct keys in order, all six fields non-empty.
    sections = doc.get("sections")
    if not isinstance(sections, list) or len(sections) != len(SECTION_KEYS):
        raise ValidationError(
            f"[{code}] expected {len(SECTION_KEYS)} sections, got "
            f"{len(sections) if isinstance(sections, list) else 'none'}"
        )
    keys = [s.get("key") for s in sections if isinstance(s, dict)]
    if keys != SECTION_KEYS:
        raise ValidationError(f"[{code}] section keys/order must be {SECTION_KEYS}, got {keys}")
    for s in sections:
        for f in _SECTION_FIELDS:
            if not _nonempty_str(s.get(f)):
                raise ValidationError(f"[{code}] section '{s.get('key')}' missing/empty '{f}'")


def _load_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def prepare(doc: dict, facts: dict | None) -> dict:
    """Validate + attach storage metadata; returns the doc ready to upsert."""
    validate(doc)
    code = doc["trading_code"].strip().upper()
    doc["trading_code"] = code

    # Cost-gate fields: prefer the report's own copies, else the fact pack.
    if not doc.get("source_hash") and facts:
        doc["source_hash"] = facts.get("source_hash")
    if doc.get("data_completeness") is None and facts:
        doc["data_completeness"] = (facts.get("score") or {}).get("data_completeness")
    if not doc.get("source_hash"):
        print(f"[{code}] WARNING: no source_hash — status.py will always treat it as stale",
              file=sys.stderr)

    doc["schema_version"] = SCHEMA_VERSION
    doc["model"] = MODEL
    doc["lang"] = doc.get("lang") or "both"
    doc["generated_at"] = datetime.now(timezone.utc)
    return doc


def upsert_many(docs: list[dict]) -> int:
    col = get_db()[COLLECTION]
    if "trading_code_1" not in {ix["name"] for ix in col.list_indexes()}:
        col.create_index([("trading_code", ASCENDING)], unique=True, name="trading_code_1")
    ops = [ReplaceOne({"trading_code": d["trading_code"]}, d, upsert=True) for d in docs]
    if ops:
        col.bulk_write(ops, ordered=False)
    return len(ops)


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate + save deep-analysis reports.")
    parser.add_argument("--file", help="A single *.analysis.json report")
    parser.add_argument("--code", help="Expected trading code (checked against the report)")
    parser.add_argument("--facts", help="The fact pack JSON (source_hash / data_completeness fallback)")
    parser.add_argument("--dir", help="Directory of *.analysis.json reports (batch)")
    args = parser.parse_args()

    if not args.file and not args.dir:
        parser.error("give --file or --dir")

    # Collect (report_path, facts_path|None) pairs.
    jobs: list[tuple[pathlib.Path, pathlib.Path | None]] = []
    if args.dir:
        d = pathlib.Path(args.dir)
        if not d.is_dir():
            parser.error(f"--dir '{d}' is not a directory")
        for p in sorted(d.glob("*.analysis.json")):
            facts_p = d / f"{p.name[:-len('.analysis.json')]}.json"
            jobs.append((p, facts_p if facts_p.exists() else None))
        if not jobs:
            print(f"No *.analysis.json files in {d}", file=sys.stderr)
            return 1
    else:
        facts_p = pathlib.Path(args.facts) if args.facts else None
        jobs.append((pathlib.Path(args.file), facts_p))

    prepared: list[dict] = []
    failed = 0
    for report_p, facts_p in jobs:
        try:
            doc = _load_json(report_p)
            facts = _load_json(facts_p) if facts_p and facts_p.exists() else None
            if args.code and doc.get("trading_code", "").strip().upper() != args.code.strip().upper():
                raise ValidationError(
                    f"--code {args.code.upper()} != report trading_code {doc.get('trading_code')}"
                )
            prepared.append(prepare(doc, facts))
        except (ValidationError, json.JSONDecodeError) as e:
            failed += 1
            print(f"REJECTED {report_p.name}: {e}", file=sys.stderr)

    if not prepared:
        print("Nothing valid to save.", file=sys.stderr)
        return 1

    n = upsert_many(prepared)
    for d in prepared:
        h = (d.get("source_hash") or "")[:8]
        print(f"saved {d['trading_code']}: {len(d['sections'])} sections, hash={h}")
    print(f"\nUpserted {n} report(s), {failed} rejected.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        close_db()
