"""
Deep-analysis coverage / staleness report — the cost gate for batch runs.

For each scored company it recomputes the current fact-pack `source_hash` and
compares it to the one stored on the `deep_analysis` document, classifying every
code as:

    missing      — no report stored yet
    stale        — stored report was built from older facts (hash changed)
    up-to-date   — stored hash matches current facts (skip it)

Feed the missing+stale list into the batch workflow so unchanged stocks are
never regenerated.

READ-ONLY. Building fact packs for the whole universe touches a lot of data, so
a full `--all` run takes a little while; scope it with --codes while iterating.

Usage (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/status.py                 # whole universe
    py scripts/deep_analysis/status.py --codes GP,BRACBANK
    py scripts/deep_analysis/status.py --list          # also print the code lists
"""
import argparse
import json
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parents[1]))  # repo root
sys.path.insert(0, str(_HERE))             # sibling import of dump_facts
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from backend.services.db_service import (  # noqa: E402
    close_db, load_companies, load_latest_prices, load_all_company_codes,
)
from backend.services.scoring_service import build_scores_df  # noqa: E402
from dump_facts import build_fact_pack  # noqa: E402
from save_analysis import DEFAULT_OUT_DIR  # noqa: E402


def _stored_hashes() -> dict:
    """{trading_code: source_hash} read from the report files in the repo folder."""
    out: dict = {}
    if not DEFAULT_OUT_DIR.exists():
        return out
    for p in DEFAULT_OUT_DIR.glob("*.json"):
        try:
            doc = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        code = (doc.get("trading_code") or p.stem).upper()
        out[code] = doc.get("source_hash")
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Deep-analysis coverage / staleness report.")
    parser.add_argument("--code", help="Single code")
    parser.add_argument("--codes", help="Comma-separated codes")
    parser.add_argument("--all", action="store_true", help="Whole universe (default)")
    parser.add_argument("--list", action="store_true", help="Print the missing/stale code lists")
    args = parser.parse_args()

    if args.code:
        codes = [args.code.strip().upper()]
    elif args.codes:
        codes = [c.strip().upper() for c in args.codes.split(",") if c.strip()]
    else:
        codes = load_all_company_codes()

    stored = _stored_hashes()
    scores_df = build_scores_df()
    companies_by_code = {c["trading_code"]: c for c in load_companies()}
    prices = load_latest_prices()

    buckets = {"missing": [], "stale": [], "up-to-date": [], "no-score": []}
    for code in codes:
        try:
            pack = build_fact_pack(code, scores_df, companies_by_code, prices)
        except Exception as e:
            print(f"[{code}] error: {e}", file=sys.stderr)
            continue
        if pack is None:
            continue
        # Unscored companies can't produce a meaningful report — flag separately.
        if not (pack.get("score") or {}).get("score"):
            buckets["no-score"].append(code)
            continue
        cur = pack["source_hash"]
        prev = stored.get(code)
        if prev is None:
            buckets["missing"].append(code)
        elif prev != cur:
            buckets["stale"].append(code)
        else:
            buckets["up-to-date"].append(code)

    print(f"Checked {len(codes)} code(s):")
    for k in ("missing", "stale", "up-to-date", "no-score"):
        print(f"  {k:<12} {len(buckets[k])}")

    todo = buckets["missing"] + buckets["stale"]
    if args.list:
        if todo:
            print("\nNeeds (re)generation:\n" + ",".join(todo))
        if buckets["no-score"]:
            print("\nSkipped (no score):\n" + ",".join(buckets["no-score"]))
    elif todo:
        print(f"\n{len(todo)} need (re)generation — re-run with --list to print them.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        close_db()
