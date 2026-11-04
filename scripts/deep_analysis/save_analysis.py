"""
Validate a deep-analysis report and write it as a JSON file into the repo's
report folder (`data/deep_analysis/<CODE>.json`). **No database access.**

The skill never touches MongoDB. It produces one self-contained JSON file per
stock; seeding those files into the database is a separate step handled later.

This writer is the gate: it rejects a malformed / half-written report (clear
message, non-zero exit, nothing written) so bad LLM output never becomes an
official report file. Since 2026-11-05 (audit SP2) it also rejects a report
that breaks the writing rules of docs/voice.md: Bengali numerals, em dashes,
idioms, bare market words, and pointers at page parts that don't exist. On success it stamps metadata and writes the final doc.

The report should carry the `source_hash` and `data_completeness` copied from
its fact pack (the cost gate in `status.py` reads them back). If they're
missing, pass the fact pack with `--facts` and they'll be pulled from there.

Usage (from the repo root):

    py scripts/deep_analysis/save_analysis.py --code GP --file _work/GP.analysis.json --facts _work/GP.json
    py scripts/deep_analysis/save_analysis.py --dir _work        # every *.analysis.json in _work/
    py scripts/deep_analysis/save_analysis.py --check            # read-only: rule breaks in saved reports
    # optional: --out-dir some/other/folder   (default: data/deep_analysis)
"""
import argparse
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

_HERE = pathlib.Path(__file__).resolve().parent
REPO_ROOT = _HERE.parents[1]
DEFAULT_OUT_DIR = REPO_ROOT / "data" / "deep_analysis"
try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

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


# ---------------------------------------------------------------------------
# Writing rules (2026-11-05, audit SP2 — docs/voice.md). The 80 reports of
# July 2026 carried 5,673 em dashes, 471 Bengali numerals, "cushion" ×163,
# "fortress" ×32, "skin in the game" ×11, and 79 pointed the reader at a
# "value today box" and a Buy/Sell signal the page no longer shows.
# ---------------------------------------------------------------------------

# Bengali numerals render broken on some phones: Western digits only.
_BN_DIGITS = re.compile(r"[০-৯]")
# No half-sentences glued with dashes: an em dash anywhere, or an en dash /
# hyphen with spaces around it ("strong – but"). A range ("2021–2025") is fine.
_DASH = re.compile(r"—|\s[–-]\s")
# Idioms the voice guide rules out, and words that sound like a sales pitch.
IDIOMS = (
    "cushion", "fortress", "blue-chip", "blue chip", "skin in the game", "moat", "war chest",
    "catalyst", "bounce back", "on the line", "tailwind", "headwind", "double-edged",
    "sweet spot", "bellwether", "no-brainer", "rock-solid", "rock solid", "golden goose",
    "cash cow", "deep pockets",
)
_IDIOM = re.compile(r"\b(" + "|".join(re.escape(w) for w in IDIOMS) + r")\b", re.I)
# Parts of the page that are not there: the report must never point at them.
_PAGE_POINTERS = re.compile(
    r"value[\s-]today|buy\s*/\s*sell|signal shown|beside this report|live value (?:box|estimate)"
    r"|strong buy|\bDSEF\b", re.I)
# Market words a reader doesn't know, bare (say the idea in plain words).
_JARGON = re.compile(r"\b(EPS|P/E|P/B|NAV|ROE|TTM|YoY|CAGR|EBIT)\b|ইপিএস|পিই|এনএভি")


def _texts(doc: dict):
    """(where, text) for every reader-facing text field of a report."""
    for f in ("headline_en", "headline_bn", "bottom_line_en", "bottom_line_bn",
              "data_note_en", "data_note_bn"):
        if isinstance(doc.get(f), str):
            yield f, doc[f]
    for s in doc.get("sections") or []:
        if not isinstance(s, dict):
            continue
        for f in _SECTION_FIELDS:
            if isinstance(s.get(f), str):
                yield f"{s.get('key')}.{f}", s[f]


def writing_issues(doc: dict) -> list[str]:
    """Every break of the writing rules, one line each ("story.body_en: em dash or
    spaced dash (3)"). Empty when the report reads cleanly."""
    out: list[str] = []
    for where, text in _texts(doc):
        checks = (
            ("Bengali numerals (use Western digits)", _BN_DIGITS.findall(text)),
            ("em dash or spaced dash (use a full stop or a comma)", _DASH.findall(text)),
            ("idiom", [m.group(1).lower() for m in _IDIOM.finditer(text)]),
            ("points at a part of the page that isn't there", [m.group(0) for m in _PAGE_POINTERS.finditer(text)]),
            ("market word with no plain name", [m.group(0) for m in _JARGON.finditer(text)]),
        )
        for label, hits in checks:
            if hits:
                sample = ", ".join(sorted({h.strip() for h in hits if h.strip()})[:3])
                out.append(f"{where}: {label} ({len(hits)}{': ' + sample if sample else ''})")
    return out


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

    issues = writing_issues(doc)
    if issues:
        raise ValidationError(f"[{code}] breaks the writing rules:\n  " + "\n  ".join(issues))


def _load_json(path: pathlib.Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def prepare(doc: dict, facts: dict | None) -> dict:
    """Validate + attach metadata; returns the final report doc ready to write."""
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
    doc["generated_at"] = datetime.now(timezone.utc).isoformat()
    return doc


def write_report(doc: dict, out_dir: pathlib.Path) -> pathlib.Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{doc['trading_code']}.json"
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    return path


def check_folder(folder: pathlib.Path) -> int:
    """Print each saved report's writing-rule breaks; exit 1 when any has one."""
    bad = 0
    files = sorted(folder.glob("*.json"))
    for p in files:
        try:
            issues = writing_issues(_load_json(p))
        except json.JSONDecodeError as e:
            issues = [f"not valid JSON: {e}"]
        if issues:
            bad += 1
            print(f"{p.stem}: {len(issues)} field(s)")
            for i in issues[:6]:
                print(f"  {i}")
            if len(issues) > 6:
                print(f"  … and {len(issues) - 6} more")
    print(f"\n{bad} of {len(files)} report(s) break the writing rules.")
    return 1 if bad else 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate + write deep-analysis report files (no DB).")
    parser.add_argument("--file", help="A single *.analysis.json draft report")
    parser.add_argument("--code", help="Expected trading code (checked against the report)")
    parser.add_argument("--facts", help="The fact pack JSON (source_hash / data_completeness fallback)")
    parser.add_argument("--dir", help="Directory of *.analysis.json drafts (batch)")
    parser.add_argument("--out-dir", default=str(DEFAULT_OUT_DIR),
                        help=f"Where to write <CODE>.json (default: {DEFAULT_OUT_DIR})")
    parser.add_argument("--check", nargs="?", const=str(DEFAULT_OUT_DIR), metavar="FOLDER",
                        help="Read-only: list the writing-rule breaks in every saved report "
                             f"(default folder: {DEFAULT_OUT_DIR}); writes nothing")
    args = parser.parse_args()

    if args.check:
        return check_folder(pathlib.Path(args.check))
    if not args.file and not args.dir:
        parser.error("give --file, --dir or --check")

    out_dir = pathlib.Path(args.out_dir)

    # Collect (draft_path, facts_path|None) pairs.
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

    written, failed = 0, 0
    for draft_p, facts_p in jobs:
        try:
            doc = _load_json(draft_p)
            facts = _load_json(facts_p) if facts_p and facts_p.exists() else None
            if args.code and doc.get("trading_code", "").strip().upper() != args.code.strip().upper():
                raise ValidationError(
                    f"--code {args.code.upper()} != report trading_code {doc.get('trading_code')}"
                )
            doc = prepare(doc, facts)
            path = write_report(doc, out_dir)
            h = (doc.get("source_hash") or "")[:8]
            print(f"wrote {path}  ({len(doc['sections'])} sections, hash={h})")
            written += 1
        except (ValidationError, json.JSONDecodeError) as e:
            failed += 1
            print(f"REJECTED {draft_p.name}: {e}", file=sys.stderr)

    print(f"\nWrote {written} report file(s) to {out_dir}, {failed} rejected.")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
