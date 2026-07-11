"""Signal backtest — Phase 1 ("Mode P"): does the canonical Buy/Sell signal
actually predict forward returns?

READ-ONLY. Never writes to MongoDB — the snapshot writer is monkeypatched to
raise, same guard as score_regression.py.

WHAT IT DOES
------------
For a grid of past dates T, it reconstructs what the signal *would have said*
at T and measures what happened next:

  * price-driven inputs (valuation p4_val, momentum, 52-week range) are rebuilt
    as-of T from historical `stock_prices` — faithful, no look-ahead;
  * fundamentals (tier/score) are recomputed against today's financials but
    with fiscal years after T's publication cutoff dropped (`--lag-days`), so a
    January-2023 date does not "know" the FY2023 annual report. Pass
    `--no-pit-fundamentals` to disable that cutoff (faster, but then buy
    returns are look-ahead-inflated).

Each scored company at each T becomes an observation with its forward return at
1/3/6-month horizons and the DSEX return over the same window (excess = the
number that matters — in DSE almost everything moves with the index).

KNOWN BIASES (Phase 1)
----------------------
  * Survivorship — a stock that stopped trading before T+H keeps its last
    traded price (no zero). Count of such stale exits is reported per bucket;
    treat buy returns as an upper bound.
  * Restatement — today's stored financials may differ from what was public at
    T. Minor; not corrected here.
  * Overlapping windows — grid dates are sampled every `--freq` trading days but
    horizons overlap, so observations are correlated. A per-date consistency
    line ("edge positive in X/N months") is reported instead of a fake t-stat.

USAGE (from repo root; .env supplies MONGODB_URI)
  py scripts/signal_backtest.py
  py scripts/signal_backtest.py --from 2023-01-01 --to 2025-01-01 --freq 21
  py scripts/signal_backtest.py --horizons 21,63,126 --slice-horizon 63
  py scripts/signal_backtest.py --no-pit-fundamentals        # strict Mode P
  py scripts/signal_backtest.py --out report.md --dump obs.csv
"""
import argparse
import bisect
import csv
import pathlib
import sys
from collections import defaultdict
from datetime import date, timedelta

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from backend.services import scoring_service, signal_service, top20_service  # noqa: E402
from backend.services.db_service import get_db  # noqa: E402


def _forbid_store(*_a, **_k):
    raise RuntimeError("signal_backtest is read-only — snapshot store blocked")


scoring_service._store_snapshot = _forbid_store  # hard guard

# Regime classification from the trailing-7d DSEX change the momentum window
# already computes as-of T.
REGIME_RISING, REGIME_FALLING = 1.5, -1.5

CHEAP_Q = 0.80  # top-20% p4_val at each T = the "cheapest quintile" baseline


# ---------------------------------------------------------------------------
# Data loading (one bulk pass; all as-of / forward lookups happen in memory)
# ---------------------------------------------------------------------------

def _d10(d) -> str:
    """Normalise any stored date (datetime or ISO string) to 'YYYY-MM-DD'."""
    s = d.isoformat() if hasattr(d, "isoformat") else str(d)
    return s[:10]


def load_price_matrix(db):
    """Return ({code: (dates_asc, ltps_asc)}, market_calendar_asc)."""
    tmp: dict[str, list[tuple[str, float]]] = defaultdict(list)
    all_dates: set[str] = set()
    cur = db.stock_prices.find(
        {"ltp": {"$gt": 0}},
        {"_id": 0, "trading_code": 1, "date": 1, "ltp": 1},
    )
    for doc in cur:
        code = doc.get("trading_code")
        ltp = doc.get("ltp")
        if not code or ltp is None or ltp <= 0:
            continue
        ds = _d10(doc["date"])
        tmp[code].append((ds, float(ltp)))
        all_dates.add(ds)
    matrix: dict[str, tuple[list[str], list[float]]] = {}
    for code, rows in tmp.items():
        rows.sort()
        # collapse duplicate days (keep last seen for a date) — rare, but keeps
        # the arrays strictly increasing for bisect.
        dd: dict[str, float] = {}
        for ds, v in rows:
            dd[ds] = v
        keys = sorted(dd)
        matrix[code] = (keys, [dd[k] for k in keys])
    return matrix, sorted(all_dates)


def load_dsex(db):
    """DSEX index series (dates_asc, levels_asc). Used only to report coverage —
    the index history is far shorter than the price history, so it is NOT the
    backtest benchmark (see build_ew_index)."""
    docs = list(db.dse_market_summary.find({}, {"_id": 0, "date": 1, "dsex": 1}))
    rows = sorted((_d10(d["date"]), float(d["dsex"]))
                  for d in docs if d.get("dsex"))
    return [r[0] for r in rows], [r[1] for r in rows]


def build_ew_index(matrix, market_cal):
    """Equal-weight daily-return index of all traded codes, chained from 1.0.

    This is the backtest benchmark: it spans the full price history (unlike the
    DSEX index, which is only scraped for a short recent window), and "beat the
    equal-weight universe" is the honest bar for a stock-picker. Returns
    {date: index_level}.
    """
    pon = {code: dict(zip(dts, lts)) for code, (dts, lts) in matrix.items()}
    ew = {}
    level = 1.0
    for di, d in enumerate(market_cal):
        if di == 0:
            ew[d] = level
            continue
        prev = market_cal[di - 1]
        rets = []
        for series in pon.values():
            a, b = series.get(d), series.get(prev)
            if a and b and b > 0:
                rets.append(a / b - 1.0)
        if rets:
            level *= (1.0 + sum(rets) / len(rets))
        ew[d] = level
    return ew


def _asof(dates: list[str], values: list, dstr: str):
    """(value, its_date) for the latest entry on/before dstr, else (None, None)."""
    i = bisect.bisect_right(dates, dstr) - 1
    if i < 0:
        return None, None
    return values[i], dates[i]


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

def _median(xs):
    if not xs:
        return None
    s = sorted(xs)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def _stats(rows):
    n = len(rows)
    if n == 0:
        return {"n": 0}
    fwd = [r["fwd"] for r in rows]
    exc = [r["excess"] for r in rows]
    return {
        "n": n,
        "mean_fwd": sum(fwd) / n,
        "med_fwd": _median(fwd),
        "mean_exc": sum(exc) / n,
        "med_exc": _median(exc),
        "size_exc": sum(r.get("size_excess", r["excess"]) for r in rows) / n,
        "hit": sum(1 for x in fwd if x > 0) / n,
        "win": sum(1 for x in exc if x > 0) / n,
        "down15": sum(1 for x in fwd if x < -0.15) / n,
        "stale": sum(1 for r in rows if r.get("stale")),
    }


def _pct(x, nd=1):
    if x is None:
        return "-"
    return f"{x * 100:+.{nd}f}%"


def _valuation_bucket(p4):
    if p4 is None:
        return "unknown"
    if p4 >= signal_service.CHEAP_P4:
        return "cheap"
    if p4 < signal_service.EXPENSIVE_P4:
        return "expensive"
    return "mid"


def _num(v):
    """NaN/None-safe float (pandas rows leak NaN)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f  # NaN != NaN


# ---------------------------------------------------------------------------
# Core: build observations
# ---------------------------------------------------------------------------

def build_observations(args):
    db = get_db()
    print("Loading price history (one bulk pass)...", file=sys.stderr)
    matrix, market_cal = load_price_matrix(db)
    ew = build_ew_index(matrix, market_cal)
    dsex_dates, dsex_vals = load_dsex(db)   # coverage note only, not the benchmark

    horizons = sorted(int(h) for h in args.horizons.split(","))
    max_h = max(horizons)
    ncal = len(market_cal)
    if ncal <= args.min_history + max_h + 1:
        print(f"ERROR: only {ncal} trading days available; need > "
              f"{args.min_history + max_h + 1} for min-history {args.min_history} "
              f"+ max-horizon {max_h}.", file=sys.stderr)
        return None

    # Grid: every `freq` trading days, leaving room for min-history before and
    # max-horizon after.
    lo = args.min_history
    hi = ncal - max_h - 1
    grid_idx = list(range(lo, hi + 1, args.freq))
    grid = []
    for i in grid_idx:
        t = market_cal[i]
        if args.from_date and t < args.from_date:
            continue
        if args.to_date and t > args.to_date:
            continue
        grid.append((i, t))
    if not grid:
        print("ERROR: date grid is empty (check --from/--to vs available span).",
              file=sys.stderr)
        return None

    span = f"{market_cal[0]} .. {market_cal[-1]} ({ncal} trading days)"
    print(f"Data span: {span}", file=sys.stderr)
    print(f"Backtesting {len(grid)} dates: {grid[0][1]} .. {grid[-1][1]} "
          f"(every {args.freq} trading days)", file=sys.stderr)

    obs = []                                   # per (code, T, horizon)
    mkt_ret = defaultdict(list)                # horizon -> [equal-weight mkt return per date]
    regime_by_date = {}

    for n, (ti, T) in enumerate(grid, 1):
        print(f"  [{n}/{len(grid)}] {T}", file=sys.stderr)
        fin_max_year = None
        if not args.no_pit_fundamentals:
            fin_max_year = (date.fromisoformat(T) - timedelta(days=args.lag_days)).year - 1

        prices_at_T = {}
        for code, (dts, lts) in matrix.items():
            j = bisect.bisect_right(dts, T) - 1
            if j >= 0:
                prices_at_T[code] = {"ltp": lts[j]}

        df = scoring_service._compute_scores_df(
            prices_override=prices_at_T, fin_max_year=fin_max_year)
        if df.empty:
            continue

        # momentum + regime as-of T. Pass an end-of-day arg so the internal
        # `<= as_of` compare includes T whether dates are stored as strings or
        # datetimes.
        mw = top20_service._market_window_raw(as_of=T + "T23:59:59")
        momentum = {c: top20_service._momentum_dict(raw)
                    for c, raw in mw["rows"].items()}
        # regime = trailing 7-trading-day change of the equal-weight index
        # (DSEX 7d is unusable — the index series is too short historically).
        chg7 = None
        if ti >= 7 and ew.get(market_cal[ti - 7]):
            chg7 = (ew[T] / ew[market_cal[ti - 7]] - 1.0) * 100.0
        regime = ("unknown" if chg7 is None
                  else "rising" if chg7 > REGIME_RISING
                  else "falling" if chg7 < REGIME_FALLING
                  else "sideways")
        regime_by_date[T] = regime

        records = df.to_dict("records")
        # per-T cheap-quintile threshold on p4_val
        p4s = sorted(x for x in (_num(r.get("p4_val")) for r in records) if x is not None)
        cheap_thr = None
        if p4s:
            cheap_thr = p4s[min(len(p4s) - 1, int(CHEAP_Q * len(p4s)))]

        # equal-weight market forward return for this T, per horizon
        mfwd = {}
        for h in horizons:
            fdate = market_cal[ti + h]
            mfwd[h] = (ew[fdate] / ew[T] - 1.0) if ew.get(T) else 0.0
            mkt_ret[h].append(mfwd[h])

        for r in records:
            code = r.get("trading_code")
            if not code:
                continue
            sig = signal_service._signal_for_row(r, momentum.get(code))
            entry, _ = _asof(*matrix.get(code, ([], [])), T)
            if not entry or entry <= 0:
                continue
            p4 = _num(r.get("p4_val"))
            tier = sig["tier"]
            base = {
                "date": T, "code": code, "signal": sig["signal"],
                "reason": sig["reason_key"], "tier": tier,
                "val_bucket": _valuation_bucket(p4),
                "grade": (momentum.get(code) or {}).get("momentum_grade", "unknown"),
                "regime": regime,
                "mcap_mn": _num(r.get("mcap_mn")),
                "sector": r.get("sector"),
                "p4v": p4,
                "pct52": (momentum.get(code) or {}).get("pct_in_52w_range"),
                "rs": (momentum.get(code) or {}).get("rs_vs_dsex_pct"),
                "eps": _num(r.get("eps")),
                "eps_yoy": _num(r.get("eps_yoy_pct")),
                "p2_health": _num(r.get("p2_health")),
                "p1_biz": _num(r.get("p1_biz")),
                "data_completeness": _num(r.get("data_completeness")),
                "good_plus": tier in ("good", "excellent"),
                "cheap_q": (cheap_thr is not None and p4 is not None and p4 >= cheap_thr),
            }
            for h in horizons:
                fdate = market_cal[ti + h]
                exitp, exitd = _asof(*matrix.get(code, ([], [])), fdate)
                if not exitp or exitp <= 0:
                    continue
                # stale exit = last available price is >10 trading days before
                # the target forward date (suspended / delisted).
                stale = False
                if exitd:
                    k = bisect.bisect_right(market_cal, exitd) - 1
                    stale = (ti + h - k) > 10
                fwd = exitp / entry - 1.0
                obs.append({**base, "horizon": h, "fwd": fwd,
                            "excess": fwd - mfwd[h], "stale": stale})

    # Size-neutral ("characteristic-adjusted") excess: benchmark each stock
    # against the mean forward return of same-date, same-horizon stocks in its
    # own market-cap quartile. The equal-weight market is dominated by small
    # caps, which ran far ahead of large caps this period, so raw excess is
    # really a size bet; this isolates stock-PICKING skill within a size class.
    by_dh = defaultdict(list)
    for o in obs:
        if o.get("mcap_mn") is not None:
            by_dh[(o["date"], o["horizon"])].append(o)
    for lst in by_dh.values():
        lst.sort(key=lambda o: o["mcap_mn"])
        n = len(lst)
        qsum = defaultdict(lambda: [0.0, 0])
        for idx, o in enumerate(lst):
            o["mcap_q"] = min(3, idx * 4 // n) if n else 0
            qsum[o["mcap_q"]][0] += o["fwd"]
            qsum[o["mcap_q"]][1] += 1
        for o in lst:
            s, c = qsum[o["mcap_q"]]
            o["size_excess"] = o["fwd"] - (s / c if c else 0.0)
    for o in obs:
        o.setdefault("size_excess", o["excess"])
        o.setdefault("mcap_q", None)

    dsex_cov = (f"{dsex_dates[0]}..{dsex_dates[-1]} ({len(dsex_dates)} days)"
                if dsex_dates else "none")
    return {
        "obs": obs, "mkt_ret": mkt_ret, "horizons": horizons,
        "grid": grid, "span": span, "regime_by_date": regime_by_date,
        "dsex_cov": dsex_cov,
        "fin_max_year_used": (None if args.no_pit_fundamentals else True),
        "args": args,
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

_HDR = ("| bucket | N | mean fwd | med fwd | mean exc | med exc | **size-adj exc** "
        "| hit>0 | beat mkt | fell>15% | stale |")
_SEP = "|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|"


def _row(label, st):
    if st.get("n", 0) == 0:
        return f"| {label} | 0 | - | - | - | - | - | - | - | - | - |"
    return (f"| {label} | {st['n']} | {_pct(st['mean_fwd'])} | {_pct(st['med_fwd'])} "
            f"| {_pct(st['mean_exc'])} | {_pct(st['med_exc'])} | {_pct(st['size_exc'])} "
            f"| {st['hit']*100:.0f}% | {st['win']*100:.0f}% | {st['down15']*100:.0f}% "
            f"| {st['stale']} |")


def render(res):
    args = res["args"]
    obs, horizons = res["obs"], res["horizons"]
    L = []
    L.append("# Signal backtest report (Phase 1 · Mode P)")
    L.append("")
    L.append(f"- Data span: {res['span']}")
    L.append(f"- Grid: {len(res['grid'])} dates, every {args.freq} trading days, "
             f"horizons {horizons} (trading days)")
    L.append(f"- Observations: {len(obs)} (code × date × horizon)")
    if args.no_pit_fundamentals:
        L.append("- WARNING **--no-pit-fundamentals: fundamentals use today's reports at every past "
                 "date -> buy returns are LOOK-AHEAD-INFLATED. Directional only.**")
    else:
        L.append(f"- Fundamentals point-in-time: fiscal years after T-{args.lag_days}d dropped "
                 f"(Dec-FYE approximation; June-FYE names are treated conservatively).")
    L.append("- WARNING Survivorship: stale-exit column counts holdings that stopped trading before "
             "T+H (valued at last trade, not zero) -- buy returns are an upper bound.")
    L.append("- Benchmark = **equal-weight index of all traded codes** (spans the full price "
             f"history). DSEX index history is too short to use (coverage: {res['dsex_cov']}).")
    L.append("- **size-adj exc** = return minus same-date same-horizon peers in the SAME market-cap "
             "quartile. This is the honest skill metric: the equal-weight market is small-cap "
             "heavy, so plain 'mean exc' rewards a size tilt, not stock-picking (see Size check).")
    L.append("- 'beat mkt' = share of observations with positive plain excess.")
    L.append(f"- Regimes at entry: " + ", ".join(
        f"{rg} {sum(1 for v in res['regime_by_date'].values() if v == rg)}"
        for rg in ("rising", "sideways", "falling", "unknown")) + " (backtest dates).")

    def buckets_for(h):
        rows = [o for o in obs if o["horizon"] == h]
        return {
            "BUY": [o for o in rows if o["signal"] == "buy"],
            "none (control)": [o for o in rows if o["signal"] == "none"],
            "SELL": [o for o in rows if o["signal"] == "sell"],
            "— baseline: all scored stocks": rows,
            "— baseline: Good+ tier": [o for o in rows if o["good_plus"]],
            "— baseline: cheapest p4 quintile": [o for o in rows if o["cheap_q"]],
        }

    # Headline scorecard, one table per horizon
    for h in horizons:
        L.append("")
        L.append(f"## Forward {h} trading days (~{round(h/21)} mo)")
        L.append("")
        L.append(_HDR)
        L.append(_SEP)
        for label, rws in buckets_for(h).items():
            L.append(_row(label, _stats(rws)))
        # Equal-weight market benchmark row (one value per grid date)
        mr = res["mkt_ret"].get(h, [])
        if mr:
            mst = {"n": len(mr), "mean_fwd": sum(mr)/len(mr), "med_fwd": _median(mr),
                   "mean_exc": 0.0, "med_exc": 0.0, "size_exc": 0.0,
                   "hit": sum(1 for x in mr if x > 0)/len(mr), "win": 0.0,
                   "down15": sum(1 for x in mr if x < -0.15)/len(mr), "stale": 0}
            L.append(_row("MARKET (equal-weight, per date)", mst))

    # Slices at the chosen horizon
    sh = args.slice_horizon if args.slice_horizon in horizons else horizons[len(horizons)//2]
    buy = [o for o in obs if o["horizon"] == sh and o["signal"] == "buy"]

    # Size check — shows the equal-weight benchmark's size skew and that the
    # size-adjusted metric neutralises it.
    L.append("")
    L.append(f"## Size check — why 'size-adj exc' exists (fwd {sh}d)")
    L.append("")
    L.append("| mcap quartile | all scored: mean exc | all scored: size-adj | BUY: mean exc | BUY: size-adj (N) |")
    L.append("|---|--:|--:|--:|--:|")
    allsh = [o for o in obs if o["horizon"] == sh and o.get("mcap_q") is not None]
    qlabels = {0: "Q1 smallest", 1: "Q2", 2: "Q3", 3: "Q4 largest"}

    def _me(lst, key):
        return _pct(sum(o[key] for o in lst) / len(lst)) if lst else "-"

    for q in (0, 1, 2, 3):
        a = [o for o in allsh if o["mcap_q"] == q]
        bq = [o for o in a if o["signal"] == "buy"]
        L.append(f"| {qlabels[q]} | {_me(a,'excess')} | {_me(a,'size_excess')} "
                 f"| {_me(bq,'excess')} | {_me(bq,'size_excess')} ({len(bq)}) |")
    L.append("")
    L.append("Plain excess swings hard across quartiles (a benchmark artifact — the equal-weight "
             "market is small-cap heavy); size-adj is ~flat for 'all scored' by construction. The "
             "BUY size-adj column is the real signal skill within each size class.")

    def slice_table(title, keyfn):
        L.append("")
        L.append(f"### BUY signals by {title} (fwd {sh}d)")
        L.append("")
        L.append(_HDR)
        L.append(_SEP)
        groups = defaultdict(list)
        for o in buy:
            groups[keyfn(o)].append(o)
        for k in sorted(groups, key=lambda x: -len(groups[x])):
            L.append(_row(str(k), _stats(groups[k])))

    L.append("")
    L.append(f"## Where BUY works — slices at {sh} trading days")
    slice_table("fundamental tier", lambda o: o["tier"])
    slice_table("valuation bucket", lambda o: o["val_bucket"])
    slice_table("entry momentum grade", lambda o: o["grade"])
    slice_table("market regime at entry", lambda o: o["regime"])

    # Consistency across dates (buy, slice horizon)
    L.append("")
    L.append(f"## Consistency of the BUY edge across dates (fwd {sh}d)")
    per_date = defaultdict(list)
    for o in buy:
        per_date[o["date"]].append(o["size_excess"])
    date_means = {d: sum(v)/len(v) for d, v in per_date.items() if v}
    if date_means:
        pos = sum(1 for v in date_means.values() if v > 0)
        L.append("")
        L.append(f"- BUY beat same-size peers (size-adj > 0) in **{pos}/{len(date_means)}** backtest dates.")
        L.append(f"- Best month {_pct(max(date_means.values()))}, "
                 f"worst {_pct(min(date_means.values()))}, "
                 f"median {_pct(_median(list(date_means.values())))}.")

    # Verdict
    L.append("")
    L.append("## Verdict")
    bs = _stats(buy)
    gp = _stats([o for o in obs if o["horizon"] == sh and o["good_plus"]])
    if bs.get("n", 0):
        beat0 = "beats" if bs["size_exc"] > 0 else "does NOT beat"
        vs_gp = _pct(bs["size_exc"] - gp.get("size_exc", 0))
        adds = bs["size_exc"] > gp.get("size_exc", 0)
        reg_means = {rg: _stats([o for o in buy if o["regime"] == rg]) for rg in
                     ("falling", "sideways", "rising")}
        reg_means = {rg: st["size_exc"] for rg, st in reg_means.items() if st.get("n", 0)}
        worst_reg = min(reg_means, key=reg_means.get) if reg_means else "n/a"
        L.append("")
        L.append(f"- At {sh}d, on the size-adjusted skill metric, **BUY {beat0} same-size peers** "
                 f"by {_pct(bs['size_exc'])} (N={bs['n']}; plain excess vs market {_pct(bs['mean_exc'])}).")
        L.append(f"- vs. 'just buy Good+ tier' (size-adjusted): {vs_gp} — "
                 f"{'the valuation/momentum overlay ADDS value' if adds else 'the overlay does NOT beat the tier alone; consider simplifying'}.")
        L.append(f"- Weakest regime for BUY: **{worst_reg}** (size-adjusted).")
        L.append("- Caveat: 9 overlapping windows over ~14 months, survivorship-biased up. "
                 "Directional, not conclusive — persist `signal_snapshot` (Phase 3) for real power.")
    else:
        L.append("- No BUY observations at the slice horizon — widen the grid or span.")

    return "\n".join(L)


def dump_csv(obs, path):
    if not obs:
        return
    fields = ["date", "code", "horizon", "signal", "reason", "tier",
              "val_bucket", "grade", "regime", "mcap_mn", "sector",
              "p4v", "pct52", "rs",
              "eps", "eps_yoy", "p2_health", "p1_biz", "data_completeness",
              "good_plus", "cheap_q", "mcap_q", "fwd", "excess", "size_excess", "stale"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for o in obs:
            w.writerow({k: o.get(k) for k in fields})


def main():
    ap = argparse.ArgumentParser(description="Buy/Sell signal forward-return backtest (read-only)")
    ap.add_argument("--from", dest="from_date", metavar="YYYY-MM-DD", default=None)
    ap.add_argument("--to", dest="to_date", metavar="YYYY-MM-DD", default=None)
    ap.add_argument("--freq", type=int, default=21, help="trading days between grid dates (default 21)")
    ap.add_argument("--horizons", default="21,63,126", help="forward horizons in trading days, CSV")
    ap.add_argument("--slice-horizon", type=int, default=63, help="horizon for slice tables")
    ap.add_argument("--min-history", type=int, default=60,
                    help="trading days of price history required before the first grid date "
                         "(momentum needs ~30; the 52w range uses whatever exists, so early "
                         "dates just get a shorter range)")
    ap.add_argument("--lag-days", type=int, default=120,
                    help="fundamentals publication lag: fiscal years after T-lag are dropped")
    ap.add_argument("--no-pit-fundamentals", action="store_true",
                    help="disable the fundamentals cutoff (faster; look-ahead-biased)")
    ap.add_argument("--out", metavar="PATH", help="also write the markdown report to this file")
    ap.add_argument("--dump", metavar="PATH", help="write per-observation rows to a CSV")
    args = ap.parse_args()

    # Windows consoles default to cp1252; the report uses arrows/box chars.
    for _stream in (sys.stdout, sys.stderr):
        try:
            _stream.reconfigure(encoding="utf-8")
        except Exception:
            pass

    res = build_observations(args)
    if res is None:
        return 2
    if not res["obs"]:
        print("ERROR: no observations produced.", file=sys.stderr)
        return 2

    report = render(res)
    print(report)
    if args.out:
        pathlib.Path(args.out).write_text(report, encoding="utf-8")
        print(f"\nReport written to {args.out}", file=sys.stderr)
    if args.dump:
        dump_csv(res["obs"], args.dump)
        print(f"Observations written to {args.dump}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
