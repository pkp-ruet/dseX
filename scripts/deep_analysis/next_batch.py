"""
Pick the next batch of companies to deep-analyse, in RANKING order.

Reports are generated top-down through our leaderboard (highest score first).
"run next N" = the next N companies down the current ranking that do NOT yet
have a report. Progress tracks itself — the `deep_analysis` collection is the
bookmark, so successive runs march 1-10, 11-20, … with no stored counter.

Stale reports (fundamentals changed after generation) are treated as "done"
here — covering never-done companies comes first; refreshing stale ones is a
separate step (see `status.py`).

READ-ONLY. Prints the codes; the skill feeds them to the batch workflow.

Usage (from the repo root; .env supplies MONGODB_URI):

    py scripts/deep_analysis/next_batch.py            # next 10 (default)
    py scripts/deep_analysis/next_batch.py --n 20
    py scripts/deep_analysis/next_batch.py --n 10 --json   # just a JSON array of codes
"""
import argparse
import json
import pathlib
import sys

_HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(_HERE.parents[1]))  # repo root
sys.path.insert(0, str(_HERE))             # sibling import of save_analysis
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

from backend.services.db_service import close_db, load_companies  # noqa: E402
from backend.services.scoring_service import build_scores_df  # noqa: E402
from save_analysis import DEFAULT_OUT_DIR  # noqa: E402  (report folder = the bookmark)


def main() -> int:
    parser = argparse.ArgumentParser(description="Next N companies to deep-analyse, by ranking.")
    parser.add_argument("--n", type=int, default=10, help="Batch size (default 10)")
    parser.add_argument("--json", action="store_true", help="Print only a JSON array of codes")
    args = parser.parse_args()

    df = build_scores_df()
    if df is None or df.empty:
        print("No scores available — cannot rank.", file=sys.stderr)
        return 1

    # Ranking = scored companies, highest score first (same order as /dsestockranking).
    scored = df[df["score"].notna()].sort_values("score", ascending=False)
    ranked = [str(c) for c in scored["trading_code"].tolist()]
    total = len(ranked)

    # "Done" = a report file already exists in the repo folder (not the DB).
    done = (
        {p.stem.upper() for p in DEFAULT_OUT_DIR.glob("*.json")}
        if DEFAULT_OUT_DIR.exists() else set()
    )

    # Walk the ranking top-down; keep the rank position for display.
    pending = [(rank, code) for rank, code in enumerate(ranked, 1) if code not in done]
    batch = pending[:max(0, args.n)]
    codes = [code for _, code in batch]

    if args.json:
        print(json.dumps(codes))
        return 0

    done_ranked = sum(1 for c in ranked if c in done)
    if not codes:
        print(f"All {total} ranked companies already have a report "
              f"({done_ranked} done). Nothing to generate — use `status.py --list` to find "
              f"stale ones to refresh.")
        return 0

    names = {c["trading_code"]: c.get("company_name") for c in load_companies()}
    print(f"Next {len(codes)} to generate — ranks {batch[0][0]}–{batch[-1][0]} "
          f"({done_ranked} of {total} ranked companies already done):\n")
    for rank, code in batch:
        print(f"  {rank:>4}. {code:<12} {names.get(code) or ''}")
    print("\nCodes: " + ",".join(codes))
    print(f'\nWorkflow args: {{ "codes": {json.dumps(codes)}, "workdir": "_work" }}')
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    finally:
        close_db()
