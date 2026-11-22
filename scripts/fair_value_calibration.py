"""Fair price calibration — did shares under our fair price do better than
shares over it, and does the confidence mean anything? INTERNAL ONLY: never
show these numbers on the site (no performance claims, CLAUDE.md). It exists
to set the lines (how far under the fair price a share must be, by
confidence) from evidence instead of taste.

READ-ONLY. Never writes to MongoDB (signal_backtest's guards are imported
with it: the score snapshot and the fair price's weekly market copy).

WHAT IT DOES
------------
On a grid of past trading days T it rebuilds the scores as of T (prices at T,
yearly accounts published by then — signal_backtest's point-in-time rules).
Since 2026-11-22 every score row carries its fair price (``fair_center``,
``fair_half_width``, ``fair_conf``, ``value_gap_pct``) and the valuation
score worked out from it (``p4_val``, ``p4_basis`` "fair") beside the old
ratio score (``p4_ratio``). Each row's TOTAL return over the next N trading
days (dividends and bonus shares in, buy_list_backtest.total_return) is then
grouped:

  1. where today's price sat in the fair range, in range widths
     (``value_gap / half_width``): over the range · upper half · lower half ·
     under the range · far under (2+ widths);
  2. "under the range" split by confidence (high / medium / low);
  3. the price word from the new score against the old ratio score
     (low / fair / high price) — which of the two rulers sorted better;
  4. position, for strong-all-round and mostly-strong companies apart
     (where each group's Buy line should sit);
  5. "far under" (2+ widths) split by profit direction and confidence (what
     separates a bargain from a share that is cheap for a reason);
  6. under the centre, near its yearly top (85%+ of the range) or not
     (does the near-the-top block earn its place?);
  7. under the centre, by profit direction (where the profit check belongs).

Each for every graded company and for the mostly-strong-or-better ones.

KNOWN GAPS
----------
  * Prices start 2025-05: few dates, overlapping windows, one market regime.
    Read the numbers as a direction, never as something to publish.
  * The market context at T is rebuilt from the rows at T (the weekly stored
    copy is not used), peers are not filtered on trading, and quarterly
    reports are skipped (backtests read yearly accounts only).

USAGE (repo root; .env supplies MONGODB_URI)
  py scripts/fair_value_calibration.py
  py scripts/fair_value_calibration.py --freq 10 --horizons 21,63,126 --out calibration.md
"""
from __future__ import annotations

import argparse
import bisect
import pathlib
import sys
from collections import defaultdict
from datetime import date, timedelta

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

import signal_backtest as sb  # noqa: E402  (also blocks every snapshot write)
from buy_list_backtest import load_actions, total_return  # noqa: E402
from backend.services import scoring_service, top20_service  # noqa: E402
from backend.services.db_service import get_db  # noqa: E402
from backend.services.tiers import tier_key  # noqa: E402

POSITIONS = ("over the range", "upper half", "lower half", "under the range", "far under (2+ widths)")


def position(gap_pct, half) -> str | None:
    g, h = sb._num(gap_pct), sb._num(half)
    if g is None or not h or h <= 0:
        return None
    w = (g / 100.0) / h
    if w < -1:
        return "over the range"
    if w < 0:
        return "upper half"
    if w < 1:
        return "lower half"
    if w < 2:
        return "under the range"
    return "far under (2+ widths)"


TIER_NAME = {"excellent": "strong all round", "good": "mostly strong"}
PROFIT_DIRS = ("profit up", "profit down 0-10%", "profit down 10-25%", "profit down 25%+", "no figure")


def profit_dir(r: dict) -> str:
    e = sb._num(r.get("interim_eps_yoy_pct"))
    if e is None:
        e = sb._num(r.get("eps_yoy_pct"))
    if e is None:
        return "no figure"
    if e >= 0:
        return "profit up"
    if e > -10:
        return "profit down 0-10%"
    if e > -25:
        return "profit down 10-25%"
    return "profit down 25%+"


def word(p4) -> str | None:
    p = sb._num(p4)
    if p is None:
        return None
    return "low price" if p >= 7 else "fair price" if p >= 4 else "high price"


def run(args):
    db = get_db()
    print("Loading prices...", file=sys.stderr)
    matrix, cal = sb.load_price_matrix(db)
    ew = sb.build_ew_index(matrix, cal)
    actions = load_actions(db)
    horizons = sorted(int(h) for h in args.horizons.split(","))
    lo, hi = args.min_history, len(cal) - min(horizons) - 1
    grid = [(i, cal[i]) for i in range(lo, hi + 1, args.freq)]
    print(f"Prices {cal[0]}..{cal[-1]}; {len(grid)} dates {grid[0][1]}..{grid[-1][1]}", file=sys.stderr)

    # universe -> table -> group -> horizon -> [(ret, excess)]
    obs = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: defaultdict(list))))
    for n, (ti, t) in enumerate(grid, 1):
        fin_max_year = (date.fromisoformat(t) - timedelta(days=args.lag_days)).year - 1
        prices_at = {}
        for code, (dts, lts) in matrix.items():
            j = bisect.bisect_right(dts, t) - 1
            if j >= 0:
                prices_at[code] = {"ltp": lts[j]}
        df = scoring_service._compute_scores_df(prices_override=prices_at, fin_max_year=fin_max_year)
        if df.empty:
            continue
        mw = top20_service._market_window_raw(as_of=t + "T23:59:59")
        mom = {c: top20_service._momentum_dict(raw) for c, raw in mw["rows"].items()}
        rows = []
        for r in df.to_dict("records"):
            code = r.get("trading_code")
            entry, _ = sb._asof(*matrix.get(code, ([], [])), t)
            if not code or not entry or entry <= 0 or sb._num(r.get("score")) is None:
                continue
            groups = {}
            if r.get("p4_basis") == "fair":
                pos = position(r.get("value_gap_pct"), r.get("fair_half_width"))
                if pos:
                    groups["1. where the price sat in the fair range"] = pos
                    if pos in ("under the range", "far under (2+ widths)"):
                        groups["2. under the range, by confidence"] = f"{r.get('fair_conf')} confidence"
                    tier = tier_key(sb._num(r.get("score")))
                    if tier in ("good", "excellent"):
                        groups[f"4. {TIER_NAME[tier]}, by position"] = pos
                    if pos == "far under (2+ widths)":
                        groups["5a. far under, by profit direction"] = profit_dir(r)
                        groups["5b. far under, by confidence"] = f"{r.get('fair_conf')} confidence"
                    if pos in ("lower half", "under the range", "far under (2+ widths)"):
                        pct = sb._num((mom.get(code) or {}).get("pct_in_52w_range"))
                        if pct is not None:
                            groups["6. under the centre, by place in its year"] = (
                                "near its yearly top (85%+)" if pct >= 85 else "not near its top")
                        groups["7. under the centre, by profit direction"] = profit_dir(r)
            if word(r.get("p4_val")):
                groups["3a. price word, new score"] = word(r.get("p4_val"))
            if word(r.get("p4_ratio")):
                groups["3b. price word, old ratio score"] = word(r.get("p4_ratio"))
            rows.append((code, entry, tier_key(sb._num(r.get("score"))), groups))
        print(f"  [{n}/{len(grid)}] {t}: {len(rows)} graded, "
              f"{sum(1 for *_x, g in rows if '1. where the price sat in the fair range' in g)} with a fair price",
              file=sys.stderr)

        for h in horizons:
            if ti + h >= len(cal):
                continue
            fday = cal[ti + h]
            mkt = ew[fday] / ew[t] - 1.0 if ew.get(t) else 0.0
            for code, entry, tier, groups in rows:
                exitp, exitd = sb._asof(*matrix.get(code, ([], [])), fday)
                if not exitp:
                    continue
                ret = total_return(entry, exitp, t, exitd or fday, actions.get(code, []))
                universes = ["every graded company"]
                if tier in ("good", "excellent"):
                    universes.append("mostly strong or better")
                for u in universes:
                    for table, group in groups.items():
                        obs[u][table][group][h].append((ret, ret - mkt))
    return obs, horizons, grid


ORDER = {
    "1. where the price sat in the fair range": POSITIONS,
    "2. under the range, by confidence": ("high confidence", "medium confidence", "low confidence"),
    "3a. price word, new score": ("low price", "fair price", "high price"),
    "3b. price word, old ratio score": ("low price", "fair price", "high price"),
    "4. strong all round, by position": POSITIONS,
    "4. mostly strong, by position": POSITIONS,
    "5a. far under, by profit direction": PROFIT_DIRS,
    "5b. far under, by confidence": ("high confidence", "medium confidence", "low confidence"),
    "6. under the centre, by place in its year": ("near its yearly top (85%+)", "not near its top"),
    "7. under the centre, by profit direction": PROFIT_DIRS,
}


def report(obs, horizons, grid) -> str:
    lines = ["# Fair price calibration (internal, never published)", "",
             f"{len(grid)} dates, {grid[0][1]} to {grid[-1][1]}. Total returns (dividends and bonus shares in). "
             "Excess = against the equal-weight market over the same days. Overlapping windows: a direction, "
             "not a measurement.", ""]
    for u, tables in obs.items():
        lines += [f"## {u}", ""]
        for h in horizons:
            lines += [f"### {h} trading days later", ""]
            for table in ORDER:
                groups = tables.get(table) or {}
                if not groups:
                    continue
                lines += [f"**{table}**", "",
                          "| group | rows | avg return | middle return | avg vs market | beat market | fell 15%+ |",
                          "|---|--:|--:|--:|--:|--:|--:|"]
                for g in ORDER[table]:
                    xs = (groups.get(g) or {}).get(h) or []
                    if not xs:
                        lines.append(f"| {g} | 0 | - | - | - | - | - |")
                        continue
                    rets = [a for a, _ in xs]
                    exc = [b for _, b in xs]
                    lines.append(
                        f"| {g} | {len(xs)} | {sb._pct(sum(rets) / len(rets))} | {sb._pct(sb._median(rets))} "
                        f"| {sb._pct(sum(exc) / len(exc))} | {sum(1 for e in exc if e > 0) / len(exc) * 100:.0f}% "
                        f"| {sum(1 for r in rets if r < -0.15) / len(rets) * 100:.0f}% |")
                lines.append("")
    return "\n".join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--freq", type=int, default=10, help="trading days between dates (default 10)")
    ap.add_argument("--horizons", default="21,63,126", help="forward horizons in trading days")
    ap.add_argument("--min-history", type=int, default=60)
    ap.add_argument("--lag-days", type=int, default=120,
                    help="yearly accounts count from this many days after the year ends")
    ap.add_argument("--out", metavar="PATH", help="also write the report here")
    args = ap.parse_args()
    obs, horizons, grid = run(args)
    text = report(obs, horizons, grid)
    sys.stdout.reconfigure(encoding="utf-8")
    print(text)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
