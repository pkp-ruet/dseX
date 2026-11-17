"""Buy List backtest — would the list's rules have picked shares that did
better than the alternatives? INTERNAL ONLY: never show these numbers on the
site (no performance claims, CLAUDE.md).

READ-ONLY. Never writes to MongoDB (signal_backtest's snapshot guard is
imported with it).

WHAT IT DOES
------------
On a grid of past trading days T it rebuilds the scores as of T (prices at T,
yearly accounts published by then — signal_backtest's point-in-time rules),
the momentum window as of T (52-week position, trading), the Buy signal, the
fair-value estimate at T's price, and then picks the Buy List both ways:

  * old  — the rules before 2026-11-18: the stock page's fair value, 10%
           under its centre with "the estimates agree" (``estimates_disagree``);
  * new  — today's rules: its usual price (own P/E and P/B history), 10% under
           it and under both measures; a ৳30 lakh normal-day trading floor;
           a bank or finance company's cash dividends in each of its last
           3 years.

Each then gets the caps (2 a sector, 3 financials, 10 in all) by the engine's
conviction. Forward returns are TOTAL returns: the entry price is put on the
exit day's footing for every dividend / bonus record date in between
(``db_service.adjustment_factor_fn``, the ledger in ``dividend_declarations``),
so a cash dividend counts and a bonus share isn't a fall.

Compared against: every graded company, the mostly-strong-or-better ones, and
every Buy signal, plus the equal-weight market (signal_backtest's benchmark).

KNOWN GAPS
----------
  * Not modelled: the auditor / regulator warning check (no point-in-time
    news), the stock report's red flags (snapshots start 2026-10), the
    latest-quarter rule and interim P/E (backtests skip quarterly reports),
    "two closes in a row" and every staying line (each T is a fresh pick).
  * Prices start 2025-05 and the dividend ledger 2025-06: early T have a
    short 52-week window, and returns before the ledger miss dividends.
  * Overlapping windows; few dates. Read the numbers as a direction, not a
    measurement — and never as something to publish.

USAGE (repo root; .env supplies MONGODB_URI)
  py scripts/buy_list_backtest.py
  py scripts/buy_list_backtest.py --freq 10 --horizons 21,63,126 --out report.md
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
from backend.services import buy_list as bl  # noqa: E402
from backend.services import recommend as rc  # noqa: E402
from backend.services import scoring_service, signal_service, top20_service  # noqa: E402
from backend.services.db_service import OWN_DIVIDENDS, adjustment_factor_fn, get_db, load_companies  # noqa: E402
from backend.services.fair_value import estimate_fair_value  # noqa: E402
from utils.sector import normalize_sector  # noqa: E402

OLD_MARGIN_PCT = 10.0


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

def load_actions(db) -> dict[str, list[dict]]:
    """{code: [{record_date, cash_ps, stock_pct}]} — the whole ledger."""
    faces = {c["trading_code"]: c.get("face_value") for c in load_companies()}
    out: dict[str, list[dict]] = defaultdict(list)
    for d in db.dividend_declarations.find({"record_date": {"$ne": None}, **OWN_DIVIDENDS},
                                           {"_id": 0, "trading_code": 1, "record_date": 1, "cash_pct": 1,
                                            "stock_pct": 1, "dividend_pct": 1}):
        rd = d["record_date"]
        rd = rd.strftime("%Y-%m-%d") if hasattr(rd, "strftime") else str(rd)[:10]
        cash = d.get("cash_pct") if d.get("cash_pct") is not None else d.get("dividend_pct")
        cash, stock = float(cash or 0), float(d.get("stock_pct") or 0)
        if cash <= 0 and stock <= 0:
            continue
        code = d["trading_code"]
        if any(a["record_date"] == rd for a in out[code]):
            continue
        face = faces.get(code)
        face = float(face) if isinstance(face, (int, float)) and face > 0 else 10.0
        out[code].append({"record_date": rd, "cash_pct": cash, "stock_pct": stock,
                          "cash_ps": round(cash * face / 100.0, 4)})
    return out


def cash_years_upto(max_year: int | None) -> dict[str, dict[int, float | None]]:
    """{code: {year: cash %}} from DSE's audited table (years ≤ ``max_year``)."""
    out: dict[str, dict[int, float | None]] = defaultdict(dict)
    for d in get_db().financials.find({}, {"_id": 0, "trading_code": 1, "year": 1, "cash_dividend_pct": 1}):
        try:
            y = int(d.get("year"))
        except (TypeError, ValueError):
            continue
        if max_year is None or y <= max_year:
            out[d["trading_code"]][y] = sb._num(d.get("cash_dividend_pct"))
    return out


def total_return(entry: float, exitp: float, t: str, exit_day: str, acts: list[dict]) -> float:
    """Exit over the entry put on the exit day's footing (record dates T ≤ rd < exit day)."""
    rel = [a for a in acts if t <= a["record_date"] < exit_day]
    if rel:
        entry = adjustment_factor_fn(rel)(t, entry)
    return exitp / entry - 1.0 if entry and entry > 0 else 0.0


# ---------------------------------------------------------------------------
# The two lists
# ---------------------------------------------------------------------------

def candidate(r: dict, mom: dict, entry: float, comp: dict, years: dict) -> dict:
    """A score row at T shaped like the engine's pool candidate."""
    sector_class = normalize_sector(r.get("sector") or comp.get("sector") or "")
    fv = estimate_fair_value(r, None, comp, entry, sector_class) or {}
    c = {k: (None if isinstance(v, float) and v != v else v) for k, v in r.items()}
    hi_lo = mom or {}
    c.update({
        "code": r["trading_code"], "ltp": entry, "sector_class": sector_class,
        "sector": r.get("sector") or comp.get("sector"),
        "cat": r.get("market_cat") or comp.get("market_category"),
        "turnover_mn": hi_lo.get("avg_turnover_7d_mn"), "turnover_med30_mn": hi_lo.get("med_turnover_30d_mn"),
        "pct_in_range": hi_lo.get("pct_in_52w_range"),
        "fair_value": {"center": fv.get("center"), "estimates_disagree": fv.get("estimates_disagree"),
                       "methods": {m["name"]: m["price"] for m in fv.get("methods") or []}},
    })
    last = sb._num(c.get("last_reported_year"))
    recs = years.get(c["code"]) or {}
    if last is not None:
        c["cash_years"] = [[y, recs[y]] for y in range(int(last), int(last) - bl.BANK_CASH_YEARS, -1) if y in recs]
    return c


def gate_ok(c: dict, sig: dict) -> bool:
    """The engine's buy gate without the news check: a Buy, a profit, loans
    under saved profit, enough figures."""
    if sig.get("signal") != "buy":
        return False
    eps = sb._num(c.get("eps"))
    if eps is None or eps <= 0:
        return False
    if (c.get("sector_class") not in ("BANK", "NBFI", "INSURANCE")
            and c.get("debt_level") in ("over_mcap", "over_reserve")):
        return False
    dc = rc.completeness(c)
    return dc is not None and dc >= rc.MIN_COMPLETENESS


def old_ok(c: dict) -> bool:
    """The list's questions 1, 4 and 5 before 2026-11-18."""
    if not bl.strong_today(c):
        return False
    fv = c.get("fair_value") or {}
    ctr, px = sb._num(fv.get("center")), sb._num(c.get("ltp"))
    if fv.get("estimates_disagree") or not ctr or not px or (1 - px / ctr) * 100 < OLD_MARGIN_PCT:
        return False
    return bl.profit_ok(c)


def new_ok(c: dict) -> bool:
    return not bl.miss_keys(c)


def capped(cands: list[dict]) -> list[dict]:
    """The caps and the order, as on a first day (no seats, no grace)."""
    res = bl.choose(cands, prev_members=[], prev_passed=[c["code"] for c in cands])
    return res["members"]


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

def run(args):
    db = get_db()
    print("Loading prices...", file=sys.stderr)
    matrix, cal = sb.load_price_matrix(db)
    ew = sb.build_ew_index(matrix, cal)
    actions = load_actions(db)
    comps = {c["trading_code"]: c for c in load_companies()}
    horizons = sorted(int(h) for h in args.horizons.split(","))
    lo, hi = args.min_history, len(cal) - min(horizons) - 1
    grid = [(i, cal[i]) for i in range(lo, hi + 1, args.freq)]
    print(f"Prices {cal[0]}..{cal[-1]} ({len(cal)} days); {len(grid)} dates {grid[0][1]}..{grid[-1][1]}",
          file=sys.stderr)

    obs = defaultdict(lambda: defaultdict(list))   # variant -> horizon -> [ret, excess]
    picks = defaultdict(lambda: defaultdict(set))  # variant -> date -> codes
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
        years = cash_years_upto(fin_max_year)

        groups: dict[str, list[dict]] = defaultdict(list)
        old_c, new_c = [], []
        for r in df.to_dict("records"):
            code = r.get("trading_code")
            entry, _ = sb._asof(*matrix.get(code, ([], [])), t)
            if not code or not entry or entry <= 0 or sb._num(r.get("score")) is None:
                continue
            sig = signal_service._signal_for_row(r, mom.get(code))
            c = candidate(r, mom.get(code), entry, comps.get(code) or {}, years)
            c["strength"], c["reason_key"] = sig.get("strength"), sig.get("reason_key")
            c["conviction"] = rc.conviction(c, None)
            groups["every graded company"].append(c)
            if sig.get("tier") in ("good", "excellent"):
                groups["mostly strong or better"].append(c)
            if sig.get("signal") == "buy":
                groups["every Buy signal"].append(c)
            if gate_ok(c, sig):
                if old_ok(c):
                    old_c.append(c)
                if new_ok(c):
                    new_c.append(c)
        groups["Buy List, old rules (all passers)"] = old_c
        groups["Buy List, new rules (all passers)"] = new_c
        groups["Buy List, old rules (top 10)"] = capped(old_c)
        groups["Buy List, new rules (top 10)"] = capped(new_c)
        print(f"  [{n}/{len(grid)}] {t}: buys {len(groups['every Buy signal'])}, "
              f"old {len(old_c)}→{len(groups['Buy List, old rules (top 10)'])}, "
              f"new {len(new_c)}→{len(groups['Buy List, new rules (top 10)'])}", file=sys.stderr)

        for h in horizons:
            if ti + h >= len(cal):
                continue
            fday = cal[ti + h]
            mkt = ew[fday] / ew[t] - 1.0 if ew.get(t) else 0.0
            for name, cs in groups.items():
                for c in cs:
                    exitp, exitd = sb._asof(*matrix.get(c["code"], ([], [])), fday)
                    if not exitp:
                        continue
                    ret = total_return(c["ltp"], exitp, t, exitd or fday, actions.get(c["code"], []))
                    obs[name][h].append((ret, ret - mkt))
                    picks[name][t].add(c["code"])
    return obs, picks, horizons, grid


def report(obs, picks, horizons, grid) -> str:
    lines = ["# Buy List backtest (internal, never published)", "",
             f"{len(grid)} dates, {grid[0][1]} to {grid[-1][1]}. Total returns (dividends and bonus shares in). "
             "Excess = against the equal-weight market over the same days.", ""]
    for h in horizons:
        lines += [f"## {h} trading days later", "",
                  "| group | picks | avg return | middle return | avg vs market | beat market | fell 15%+ |",
                  "|---|--:|--:|--:|--:|--:|--:|"]
        for name, by_h in obs.items():
            xs = by_h.get(h) or []
            if not xs:
                lines.append(f"| {name} | 0 | - | - | - | - | - |")
                continue
            rets = [a for a, _ in xs]
            exc = [b for _, b in xs]
            lines.append(f"| {name} | {len(xs)} | {sb._pct(sum(rets) / len(rets))} | {sb._pct(sb._median(rets))} "
                         f"| {sb._pct(sum(exc) / len(exc))} | {sum(1 for e in exc if e > 0) / len(exc) * 100:.0f}% "
                         f"| {sum(1 for r in rets if r < -0.15) / len(rets) * 100:.0f}% |")
        lines.append("")
    lines += ["## Who each list picked", ""]
    for name in ("Buy List, old rules (top 10)", "Buy List, new rules (top 10)"):
        lines.append(f"**{name}**")
        for t, codes in sorted(picks.get(name, {}).items()):
            lines.append(f"- {t}: {', '.join(sorted(codes)) or '(none)'}")
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
    obs, picks, horizons, grid = run(args)
    text = report(obs, picks, horizons, grid)
    sys.stdout.reconfigure(encoding="utf-8")
    print(text)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8")


if __name__ == "__main__":
    main()
