"""
Score regression report — compare the scoring algorithm in the WORKING TREE
against what production currently serves, before deploying.

READ-ONLY: this script never writes to MongoDB. It imports only the pure
compute path (_compute_scores_df) and the snapshot reader; the snapshot
writer is monkeypatched to raise as a belt-and-braces guard.

Usage (from the repo root; .env supplies MONGODB_URI):

  py scripts/score_regression.py                     # baseline = live scores_snapshot
  py scripts/score_regression.py --dump base.pkl     # save current-code scores (run on main)
  py scripts/score_regression.py --baseline base.pkl # compare branch vs saved baseline
  py scripts/score_regression.py --out report.md     # also write the report to a file

Notes:
  * --mode snapshot (default) compares against what users see NOW — the delta
    includes price drift since the snapshot's computed_at, not just algorithm
    changes. For a pure algorithm diff, --dump on main then --baseline on the
    branch minutes apart.
  * Tier populations are reported at the canonical 75/60/45 boundaries and,
    for reference during the tier-unification rollout, at the legacy 75/55/35.
"""
import argparse
import sys
import pathlib

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

import pandas as pd  # noqa: E402

from backend.services import scoring_service  # noqa: E402


def _forbid_store(*_a, **_k):
    raise RuntimeError("score_regression is read-only — snapshot store blocked")


scoring_service._store_snapshot = _forbid_store  # hard guard

TIERS = [("excellent", 75), ("good", 60), ("average", 45), ("weak", None)]
PILLARS = [("p1_biz", 0.30), ("p2_health", 0.20), ("p3_moat", 0.20),
           ("p4_val", 0.15), ("p5_div", 0.15)]
# Green/red signal-flag predicates that read sub-metric columns (db_service.compute_signal_flags)
FLAG_PREDICATES = {
    "green: EPS consistent (p1_eps_consist >= 8)": lambda d: (d.get("p1_eps_consist") or 0) >= 8,
    "green: CFO positive (p2_cfo >= 4)":           lambda d: (d.get("p2_cfo") or 0) >= 4,
    "green: dividend consistent (p5_consist >= 7)": lambda d: (d.get("p5_consist") or 0) >= 7,
    "green: cheap vs history (p4_pe >= 8)":        lambda d: (d.get("p4_pe") or 0) >= 8,
    "red: pricey vs history (p4_pe <= 1)":         lambda d: (d.get("p4_pe") or 5) <= 1.0,
}


def tier_of(score, boundaries):
    if score is None or pd.isna(score):
        return "unscored"
    for name, floor in boundaries:
        if floor is None or score >= floor:
            return name
    return boundaries[-1][0]


def tier_counts(df, boundaries):
    out = {name: 0 for name, _ in boundaries}
    out["unscored"] = 0
    for s in df["score"].tolist():
        out[tier_of(s, boundaries)] += 1
    return out


def fmt_num(v, nd=1):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "-"
    return f"{v:.{nd}f}"


def section(lines, title):
    lines.append("")
    lines.append(f"## {title}")
    lines.append("")


def main():
    ap = argparse.ArgumentParser(description="DSEF score regression report (read-only)")
    ap.add_argument("--dump", metavar="PATH", help="compute with working-tree code, save pickle, exit")
    ap.add_argument("--baseline", metavar="PATH", help="compare against a saved pickle instead of the live snapshot")
    ap.add_argument("--out", metavar="PATH", help="also write the markdown report to this file")
    ap.add_argument("--top", type=int, default=30, help="size of the top-N stability check (default 30)")
    ap.add_argument("--movers", type=int, default=15, help="how many biggest movers to detail (default 15)")
    args = ap.parse_args()

    print("Computing scores with working-tree code (read-only)...", file=sys.stderr)
    cand = scoring_service._compute_scores_df()
    if cand.empty:
        print("ERROR: candidate compute returned no rows", file=sys.stderr)
        return 2

    if args.dump:
        cand.to_pickle(args.dump)
        print(f"Saved {len(cand)} scored rows to {args.dump}", file=sys.stderr)
        return 0

    if args.baseline:
        base = pd.read_pickle(args.baseline)
        base_label = f"baseline pickle ({args.baseline})"
    else:
        base = scoring_service._load_snapshot_df()
        base_label = "live scores_snapshot (what prod serves now)"
    if base.empty:
        print("ERROR: baseline is empty — is scores_snapshot populated?", file=sys.stderr)
        return 2

    b = base.set_index("trading_code")
    c = cand.set_index("trading_code")
    joined = b[["score"]].join(c[["score"]], how="outer", lsuffix="_old", rsuffix="_new")

    lines: list[str] = []
    lines.append("# Score regression report")
    lines.append("")
    lines.append(f"- Baseline: {base_label} — {len(base)} rows")
    lines.append(f"- Candidate: working-tree `_compute_scores_df()` — {len(cand)} rows")
    if not args.baseline and "computed_at" in base.columns:
        lines.append(f"- NOTE: snapshot mode — delta includes data drift since the snapshot, not just code")

    # 1. Universe
    section(lines, "Universe")
    added = sorted(set(c.index) - set(b.index))
    removed = sorted(set(b.index) - set(c.index))
    lines.append(f"- entered: {len(added)}" + (f" — {', '.join(added[:15])}" if added else ""))
    lines.append(f"- left: {len(removed)}" + (f" — {', '.join(removed[:15])}" if removed else ""))

    # 2. Distribution
    section(lines, "Score distribution")
    lines.append("| stat | old | new | delta |")
    lines.append("|---|---|---|---|")
    for stat, fn in [("mean", "mean"), ("median", "median")]:
        ov, nv = getattr(b["score"], fn)(), getattr(c["score"], fn)()
        lines.append(f"| {stat} | {fmt_num(ov)} | {fmt_num(nv)} | {fmt_num(nv - ov, 2)} |")
    for q in (0.10, 0.90):
        ov, nv = b["score"].quantile(q), c["score"].quantile(q)
        lines.append(f"| p{int(q * 100)} | {fmt_num(ov)} | {fmt_num(nv)} | {fmt_num(nv - ov, 2)} |")
    delta = (joined["score_new"] - joined["score_old"]).dropna()
    lines.append("")
    lines.append(f"Per-stock delta: mean {fmt_num(delta.mean(), 2)}, "
                 f"median {fmt_num(delta.median(), 2)}, "
                 f"min {fmt_num(delta.min(), 1)}, max {fmt_num(delta.max(), 1)}; "
                 f"|delta| > 10 for {(delta.abs() > 10).sum()} stocks, "
                 f"> 20 for {(delta.abs() > 20).sum()}.")

    # 3. Tier populations + transition matrix (canonical 75/60/45)
    section(lines, "Tier populations (canonical 75/60/45)")
    tc_old, tc_new = tier_counts(b, TIERS), tier_counts(c, TIERS)
    lines.append("| tier | old | new | delta |")
    lines.append("|---|---|---|---|")
    for name, _ in TIERS:
        lines.append(f"| {name} | {tc_old[name]} | {tc_new[name]} | {tc_new[name] - tc_old[name]:+d} |")

    lines.append("")
    lines.append("Transition matrix (rows = old tier, cols = new tier):")
    lines.append("")
    names = [n for n, _ in TIERS]
    matrix = {o: {n: 0 for n in names + ["gone"]} for o in names}
    entrants = {n: 0 for n in names}
    for code_, row in joined.iterrows():
        ot = tier_of(row["score_old"], TIERS) if not pd.isna(row["score_old"]) else None
        nt = tier_of(row["score_new"], TIERS) if not pd.isna(row["score_new"]) else None
        if ot in matrix:
            matrix[ot][nt if nt in names else "gone"] += 1
        elif nt in names:
            entrants[nt] += 1
    lines.append("| old \\ new | " + " | ".join(names) + " | gone |")
    lines.append("|---|" + "---|" * (len(names) + 1))
    for o in names:
        lines.append(f"| {o} | " + " | ".join(str(matrix[o][n]) for n in names) + f" | {matrix[o]['gone']} |")
    if any(entrants.values()):
        lines.append(f"| (new codes) | " + " | ".join(str(entrants[n]) for n in names) + " | - |")

    # 4. Top-N stability
    section(lines, f"Top-{args.top} stability")
    top_old = list(b["score"].dropna().sort_values(ascending=False).head(args.top).index)
    top_new = list(c["score"].dropna().sort_values(ascending=False).head(args.top).index)
    stayed = [x for x in top_new if x in top_old]
    lines.append(f"- stayed in top-{args.top}: {len(stayed)}/{args.top}")
    lines.append(f"- entered: {', '.join(x for x in top_new if x not in top_old) or '(none)'}")
    lines.append(f"- dropped: {', '.join(x for x in top_old if x not in top_new) or '(none)'}")

    # 5. Biggest movers with pillar attribution
    section(lines, f"Biggest movers (top {args.movers} by |delta|)")
    both = joined.dropna(subset=["score_old", "score_new"]).copy()
    both["delta"] = both["score_new"] - both["score_old"]
    movers = both.reindex(both["delta"].abs().sort_values(ascending=False).index).head(args.movers)
    lines.append("| code | old | new | delta | main pillar drivers | notes |")
    lines.append("|---|---|---|---|---|---|")
    for code_ in movers.index:
        od = b.loc[code_].to_dict() if code_ in b.index else {}
        nd = c.loc[code_].to_dict() if code_ in c.index else {}
        contribs = []
        for col, w in PILLARS:
            o_p = od.get(col)
            n_p = nd.get(col)
            if o_p is None or n_p is None or pd.isna(o_p) or pd.isna(n_p):
                continue
            dc = (n_p - o_p) * w * 10
            if abs(dc) >= 0.5:
                contribs.append((abs(dc), f"{col} {dc:+.1f}"))
        contribs.sort(reverse=True)

        def _val(v):
            return None if v is None or (isinstance(v, float) and pd.isna(v)) else v

        notes = []
        for field in ("stale_data", "adjustment_pct"):
            ov, nv = _val(od.get(field)), _val(nd.get(field))
            if ov is not None and nv is not None and ov != nv:
                notes.append(f"{field}: {ov} -> {nv}")
        cat_mult = _val(nd.get("category_mult"))
        if cat_mult is not None and cat_mult < 1.0:
            notes.append(f"cat {nd.get('market_cat')} x{cat_mult}")
        completeness = _val(nd.get("data_completeness"))
        if completeness is not None and completeness < 0.7:
            notes.append(f"completeness {completeness}")
        lines.append(
            f"| {code_} | {fmt_num(od.get('score'))} | {fmt_num(nd.get('score'))} "
            f"| {movers.loc[code_, 'delta']:+.1f} "
            f"| {', '.join(t for _, t in contribs[:3]) or '-'} "
            f"| {'; '.join(dict.fromkeys(notes)) or '-'} |"
        )

    # 6. Sub-metric coverage
    section(lines, "Column coverage (% non-null)")
    lines.append("| column | old | new |")
    lines.append("|---|---|---|")
    cols = sorted(set(b.columns) | set(c.columns))
    skip = {"computed_at"}
    flagged = []
    for col in cols:
        if col in skip:
            continue
        o_cov = round(b[col].notna().mean() * 100) if col in b.columns else None
        n_cov = round(c[col].notna().mean() * 100) if col in c.columns else None
        mark = ""
        if o_cov is not None and n_cov is not None and n_cov < o_cov - 5:
            mark = "  <-- dropped"
            flagged.append(col)
        lines.append(f"| {col} | {o_cov if o_cov is not None else 'absent'} "
                     f"| {n_cov if n_cov is not None else 'ABSENT'} |{mark}")
    if flagged:
        lines.append("")
        lines.append(f"WARNING: coverage dropped >5pp for: {', '.join(flagged)}")

    # 7. Downstream consumer invariants
    section(lines, "Downstream consumer invariants")

    def pool(df, floor):
        stale = df["stale_data"].fillna(False) if "stale_data" in df.columns else False
        return int(((df["score"] >= floor) & ~stale).sum())

    lines.append("| gate | old | new |")
    lines.append("|---|---|---|")
    lines.append(f"| recommendations pool (score >= 45, not stale) | {pool(b, 45)} | {pool(c, 45)} |")
    lines.append(f"| buy-tier pools: daily picks / hidden gems (>= 60, not stale) | {pool(b, 60)} | {pool(c, 60)} |")
    lines.append(f"| campaign top-rated list (>= 75) | {int((b['score'] >= 75).sum())} | {int((c['score'] >= 75).sum())} |")
    lines.append("")
    lines.append("Signal-flag predicate counts:")
    lines.append("| predicate | old | new |")
    lines.append("|---|---|---|")
    for label, pred in FLAG_PREDICATES.items():
        o_n = sum(1 for _, r in b.iterrows() if pred({k: (None if pd.isna(v) else v) if isinstance(v, float) else v for k, v in r.items()}))
        n_n = sum(1 for _, r in c.iterrows() if pred({k: (None if pd.isna(v) else v) if isinstance(v, float) else v for k, v in r.items()}))
        lines.append(f"| {label} | {o_n} | {n_n} |")

    # 8. New-field summaries (candidate only)
    section(lines, "New fields (candidate)")
    if "category_mult" in c.columns:
        vc = c["category_mult"].value_counts().sort_index()
        lines.append("Category multiplier: " + ", ".join(f"x{k} -> {v} stocks" for k, v in vc.items()))
    if "data_completeness" in c.columns:
        dcv = c["data_completeness"].dropna()
        lines.append(f"Data completeness: mean {fmt_num(dcv.mean(), 2)}, "
                     f"< 0.7 for {(dcv < 0.7).sum()} stocks, "
                     f"= 1.0 for {(dcv >= 0.999).sum()} stocks")
    for col in ("p1_coverage", "p2_coverage", "p3_coverage"):
        if col in c.columns:
            cv = c[col].dropna()
            lines.append(f"{col}: mean {fmt_num(cv.mean(), 2)}, full for {(cv >= 0.999).sum()} stocks")

    report = "\n".join(lines)
    print(report)
    if args.out:
        pathlib.Path(args.out).write_text(report, encoding="utf-8")
        print(f"\nReport written to {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
