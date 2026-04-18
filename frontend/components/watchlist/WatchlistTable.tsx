"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getScores, type ScoreItem, type ScoresResponse } from "@/lib/api";
import { getTier, TIER_LABELS, TIER_COLORS, type TierKey } from "@/lib/constants";
import { taka } from "@/lib/formatters";
import { getWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import StarButton from "@/components/ui/StarButton";

function flatten(scores: ScoresResponse | null): ScoreItem[] {
  if (!scores) return [];
  return Object.values(scores.tiers).flat();
}

export default function WatchlistTable() {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCodes(getWatchlist());
    return subscribeWatchlist(() => setCodes(getWatchlist()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    getScores()
      .then((d) => {
        if (!cancelled) setScores(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const all = flatten(scores);
    const map = new Map(all.map((it) => [it.trading_code.toUpperCase(), it]));
    return codes
      .map((c) => map.get(c.toUpperCase()))
      .filter((it): it is ScoreItem => Boolean(it));
  }, [scores, codes]);

  if (codes.length === 0) {
    return (
      <div className="watchlist-empty">
        <h2>Your watchlist is empty</h2>
        <p>
          Click the star icon next to any stock on the{" "}
          <Link href="/" className="text-[var(--primary)] underline">homepage</Link> or{" "}
          <Link href="/dsestockranking" className="text-[var(--primary)] underline">leaderboard</Link>{" "}
          to add it here.
        </p>
      </div>
    );
  }

  if (loading) return <div className="watchlist-loading">Loading watchlist…</div>;
  if (error) return <div className="watchlist-error">Failed to load: {error}</div>;

  const missing = codes.length - rows.length;

  return (
    <div className="watchlist-wrap">
      <table className="watchlist-table">
        <thead>
          <tr>
            <th></th>
            <th>Code</th>
            <th>Company</th>
            <th className="num">LTP</th>
            <th className="num">Chg %</th>
            <th className="num">Score</th>
            <th>Tier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it) => {
            const tier: TierKey = getTier(it.score);
            const chg = it.change_pct;
            const chgCls = chg == null ? "" : chg > 0 ? "up" : chg < 0 ? "dn" : "flat";
            return (
              <tr key={it.trading_code}>
                <td><StarButton code={it.trading_code} /></td>
                <td>
                  <Link href={`/stock/${it.trading_code}`} className="watchlist-ticker">
                    {it.trading_code}
                  </Link>
                </td>
                <td className="watchlist-company">{it.company_name ?? "—"}</td>
                <td className="num">{it.ltp != null ? taka(it.ltp, 1) : "—"}</td>
                <td className={`num watchlist-chg ${chgCls}`}>
                  {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
                </td>
                <td className="num watchlist-score">
                  {it.score != null ? it.score.toFixed(1) : "—"}
                </td>
                <td>
                  <span
                    className="watchlist-tier"
                    style={{ background: TIER_COLORS[tier] }}
                  >
                    {TIER_LABELS[tier]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {missing > 0 && (
        <p className="watchlist-missing">
          {missing} ticker{missing > 1 ? "s" : ""} not found in current scores (may be delisted or unscored).
        </p>
      )}
    </div>
  );
}
