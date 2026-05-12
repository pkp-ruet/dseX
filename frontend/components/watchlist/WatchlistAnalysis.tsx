"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getScores,
  getNearExtremes,
  type ScoreItem,
  type ScoresResponse,
  type NearExtremesData,
  type NearExtremeItem,
} from "@/lib/api";
import { taka } from "@/lib/formatters";

type Tier = "strong_buy" | "safe_buy" | "watch" | "avoid";

const TIER_LABEL: Record<Tier, string> = {
  strong_buy: "Strong Buy",
  safe_buy: "Safe Buy",
  watch: "Watch",
  avoid: "Avoid",
};

function tierOf(scores: ScoresResponse | null, code: string): Tier | null {
  if (!scores) return null;
  const c = code.toUpperCase();
  for (const k of ["strong_buy", "safe_buy", "watch", "avoid"] as Tier[]) {
    if (scores.tiers[k].some((it) => it.trading_code.toUpperCase() === c)) return k;
  }
  return null;
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function MoverCard({
  label,
  item,
  metric,
  value,
  tone,
}: {
  label: string;
  item: ScoreItem | null;
  metric: string;
  value: string;
  tone: "up" | "dn" | "flat";
}) {
  if (!item) {
    return (
      <div className="wla-mover-card">
        <div className="wla-mover-label">{label}</div>
        <div className="wla-mover-empty">No data</div>
      </div>
    );
  }
  return (
    <Link href={`/stock/${item.trading_code}`} className="wla-mover-card">
      <div className="wla-mover-label">{label}</div>
      <div className="wla-mover-code">{item.trading_code}</div>
      <div className={`wla-mover-value wla-mover-${tone}`}>{value}</div>
      <div className="wla-mover-metric">{metric}</div>
    </Link>
  );
}

export default function WatchlistAnalysis({ codes }: { codes: string[] }) {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [extremes, setExtremes] = useState<NearExtremesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([getScores(), getNearExtremes()])
      .then(([s, e]) => {
        if (cancelled) return;
        if (s.status === "fulfilled") setScores(s.value);
        if (e.status === "fulfilled") setExtremes(e.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const codeSet = useMemo(
    () => new Set(codes.map((c) => c.toUpperCase())),
    [codes]
  );

  const rows = useMemo<ScoreItem[]>(() => {
    if (!scores) return [];
    const flat = [
      ...scores.tiers.strong_buy,
      ...scores.tiers.safe_buy,
      ...scores.tiers.watch,
      ...scores.tiers.avoid,
    ];
    return flat
      .filter((it) => codeSet.has(it.trading_code.toUpperCase()))
      .sort((a, b) => a.trading_code.localeCompare(b.trading_code));
  }, [scores, codeSet]);

  const pulse = useMemo(() => {
    if (!rows.length) return null;
    const scoreVals = rows.map((r) => r.score).filter((v): v is number => v != null);
    const chgVals = rows.map((r) => r.change_pct).filter((v): v is number => v != null);
    const tierCounts: Record<Tier, number> = { strong_buy: 0, safe_buy: 0, watch: 0, avoid: 0 };
    for (const r of rows) {
      const t = tierOf(scores, r.trading_code);
      if (t) tierCounts[t] += 1;
    }
    const nearHighSet = new Set((extremes?.near_high ?? []).map((x) => x.trading_code.toUpperCase()));
    const nearLowSet = new Set((extremes?.near_low ?? []).map((x) => x.trading_code.toUpperCase()));
    const nearHigh = rows.filter((r) => nearHighSet.has(r.trading_code.toUpperCase())).length;
    const nearLow = rows.filter((r) => nearLowSet.has(r.trading_code.toUpperCase())).length;
    return {
      avgScore: scoreVals.length ? scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length : null,
      avgChg: chgVals.length ? chgVals.reduce((a, b) => a + b, 0) / chgVals.length : null,
      tierCounts,
      nearHigh,
      nearLow,
    };
  }, [rows, scores, extremes]);

  const movers = useMemo(() => {
    if (rows.length < 2) return null;
    const byChg = rows.filter((r) => r.change_pct != null).sort((a, b) => (b.change_pct! - a.change_pct!));
    const byEps = rows.filter((r) => r.eps_yoy_pct != null).sort((a, b) => (b.eps_yoy_pct! - a.eps_yoy_pct!));
    const byDiv = rows.filter((r) => r.div_yield_pct != null && r.div_yield_pct > 0).sort((a, b) => (b.div_yield_pct! - a.div_yield_pct!));
    return {
      gainer: byChg[0] ?? null,
      loser:  byChg.length ? byChg[byChg.length - 1] : null,
      bestEps: byEps[0] ?? null,
      worstEps: byEps.length ? byEps[byEps.length - 1] : null,
      topDiv: byDiv[0] ?? null,
    };
  }, [rows]);

  const nearExtremeRows = useMemo(() => {
    const near_high: NearExtremeItem[] = (extremes?.near_high ?? []).filter((it) =>
      codeSet.has(it.trading_code.toUpperCase())
    );
    const near_low: NearExtremeItem[] = (extremes?.near_low ?? []).filter((it) =>
      codeSet.has(it.trading_code.toUpperCase())
    );
    return { near_high, near_low };
  }, [extremes, codeSet]);

  const takeaways = useMemo(() => {
    if (!pulse || !rows.length) return [];
    const out: string[] = [];
    const goodTier = pulse.tierCounts.strong_buy + pulse.tierCounts.safe_buy;
    out.push(
      `${goodTier} of your ${rows.length} stock${rows.length > 1 ? "s" : ""} ` +
      `${goodTier === 1 ? "sits" : "sit"} in Strong Buy or Safe Buy; average DSEF score ` +
      `${pulse.avgScore != null ? Math.round(pulse.avgScore) : "—"}.`
    );
    if (pulse.nearHigh > 0) {
      const names = nearExtremeRows.near_high.slice(0, 3).map((x) => x.trading_code).join(", ");
      out.push(
        `${names} ${pulse.nearHigh > 1 ? "sit" : "sits"} within 5% of 52-week high — momentum strong but limited upside; watch for resistance.`
      );
    }
    if (pulse.nearLow > 0) {
      const names = nearExtremeRows.near_low.slice(0, 3).map((x) => x.trading_code).join(", ");
      out.push(
        `${names} ${pulse.nearLow > 1 ? "trade" : "trades"} within 5% of 52-week low — possible support zone or value trap; verify fundamentals.`
      );
    }
    if (pulse.tierCounts.avoid > 0) {
      const avoidNames = rows
        .filter((r) => tierOf(scores, r.trading_code) === "avoid")
        .slice(0, 3)
        .map((r) => r.trading_code)
        .join(", ");
      out.push(
        `${avoidNames} ${pulse.tierCounts.avoid > 1 ? "are" : "is"} flagged as Avoid by DSEF — consider trimming or replacing.`
      );
    }
    return out.slice(0, 4);
  }, [pulse, rows, nearExtremeRows, scores]);

  if (codes.length === 0) return null;

  if (loading) {
    return (
      <section className="wla-section">
        <h2 className="wla-section-title">Watchlist Analysis</h2>
        <div className="wla-loading">Analyzing your watchlist…</div>
      </section>
    );
  }

  if (!rows.length) {
    return (
      <section className="wla-section">
        <h2 className="wla-section-title">Watchlist Analysis</h2>
        <div className="wla-empty">
          No scored stocks in your watchlist yet. Add tickers from the leaderboard or homepage.
        </div>
      </section>
    );
  }

  return (
    <section className="wla-section">
      <h2 className="wla-section-title">Watchlist Analysis</h2>

      {/* 1. Pulse strip */}
      {pulse && (
        <div className="wla-pulse">
          <div className="wla-pulse-cell">
            <div className="wla-pulse-label">Avg score</div>
            <div className="wla-pulse-val">{pulse.avgScore != null ? Math.round(pulse.avgScore) : "—"}</div>
            <div className="wla-pulse-sub">out of 100</div>
          </div>
          <div className="wla-pulse-cell">
            <div className="wla-pulse-label">Avg today</div>
            <div className={`wla-pulse-val ${pulse.avgChg != null ? (pulse.avgChg > 0 ? "up" : pulse.avgChg < 0 ? "dn" : "") : ""}`}>
              {fmtPct(pulse.avgChg)}
            </div>
            <div className="wla-pulse-sub">across {rows.length} stock{rows.length > 1 ? "s" : ""}</div>
          </div>
          <div className="wla-pulse-cell">
            <div className="wla-pulse-label">Tier mix</div>
            <div className="wla-pulse-tiers">
              {(Object.keys(pulse.tierCounts) as Tier[]).map((t) =>
                pulse.tierCounts[t] > 0 ? (
                  <span key={t} className={`wla-tier-pill wla-tier-${t}`}>
                    {pulse.tierCounts[t]} {TIER_LABEL[t]}
                  </span>
                ) : null
              )}
            </div>
          </div>
          <div className="wla-pulse-cell">
            <div className="wla-pulse-label">Near 52w</div>
            <div className="wla-pulse-val">
              <span className="up">{pulse.nearHigh}↑</span> · <span className="dn">{pulse.nearLow}↓</span>
            </div>
            <div className="wla-pulse-sub">high / low (within 5%)</div>
          </div>
        </div>
      )}

      {/* 2. Movers */}
      {movers && (
        <div className="wla-panel">
          <h3 className="wla-panel-title">Movers in your watchlist</h3>
          <div className="wla-mover-grid">
            <MoverCard
              label="Top gainer (1d)"
              item={movers.gainer}
              metric="Today"
              value={fmtPct(movers.gainer?.change_pct)}
              tone={movers.gainer?.change_pct != null && movers.gainer.change_pct > 0 ? "up" : "flat"}
            />
            <MoverCard
              label="Top loser (1d)"
              item={movers.loser}
              metric="Today"
              value={fmtPct(movers.loser?.change_pct)}
              tone={movers.loser?.change_pct != null && movers.loser.change_pct < 0 ? "dn" : "flat"}
            />
            <MoverCard
              label="Best EPS growth YoY"
              item={movers.bestEps}
              metric="EPS YoY"
              value={fmtPct(movers.bestEps?.eps_yoy_pct, 0)}
              tone={movers.bestEps?.eps_yoy_pct != null && movers.bestEps.eps_yoy_pct > 0 ? "up" : "flat"}
            />
            <MoverCard
              label="Highest dividend yield"
              item={movers.topDiv}
              metric="Div yield"
              value={movers.topDiv?.div_yield_pct != null ? `${movers.topDiv.div_yield_pct.toFixed(1)}%` : "—"}
              tone="up"
            />
          </div>
        </div>
      )}

      {/* 3. Near 52w extremes */}
      {(nearExtremeRows.near_high.length > 0 || nearExtremeRows.near_low.length > 0) && (
        <div className="wla-panel">
          <h3 className="wla-panel-title">52-week extremes</h3>
          <div className="wla-extremes-grid">
            <div>
              <div className="wla-extremes-sub">Near high · potential resistance</div>
              {nearExtremeRows.near_high.length === 0 ? (
                <div className="wla-row-empty">None</div>
              ) : (
                <table className="wla-mini-table">
                  <tbody>
                    {nearExtremeRows.near_high.map((it) => (
                      <tr key={it.trading_code}>
                        <td>
                          <Link href={`/stock/${it.trading_code}`} className="wla-code-link">{it.trading_code}</Link>
                        </td>
                        <td className="num">{it.ltp != null ? taka(it.ltp, 1) : "—"}</td>
                        <td className="num wla-gap">−{it.gap_pct != null ? Math.abs(it.gap_pct).toFixed(1) : "—"}%</td>
                        <td className={`num ${(it.change_pct ?? 0) > 0 ? "up" : (it.change_pct ?? 0) < 0 ? "dn" : ""}`}>
                          {fmtPct(it.change_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div>
              <div className="wla-extremes-sub">Near low · potential support</div>
              {nearExtremeRows.near_low.length === 0 ? (
                <div className="wla-row-empty">None</div>
              ) : (
                <table className="wla-mini-table">
                  <tbody>
                    {nearExtremeRows.near_low.map((it) => (
                      <tr key={it.trading_code}>
                        <td>
                          <Link href={`/stock/${it.trading_code}`} className="wla-code-link">{it.trading_code}</Link>
                        </td>
                        <td className="num">{it.ltp != null ? taka(it.ltp, 1) : "—"}</td>
                        <td className="num wla-gap">+{it.gap_pct != null ? Math.abs(it.gap_pct).toFixed(1) : "—"}%</td>
                        <td className={`num ${(it.change_pct ?? 0) > 0 ? "up" : (it.change_pct ?? 0) < 0 ? "dn" : ""}`}>
                          {fmtPct(it.change_pct)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Takeaways */}
      {takeaways.length > 0 && (
        <div className="wla-panel wla-takeaways">
          <h3 className="wla-panel-title">Watchlist takeaways</h3>
          <ul>
            {takeaways.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
          <p className="wla-disclaimer">
            Auto-generated from public DSE data and DSEF scores. Not investment advice.
          </p>
        </div>
      )}
    </section>
  );
}
