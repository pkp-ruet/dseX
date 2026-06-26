"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getScores, type ScoresResponse, type ScoreItem } from "@/lib/api";
import { addToWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { taka } from "@/lib/formatters";

interface Props {
  /** Tighter top spacing + no heading when embedded in another card (homepage first-run). */
  compact?: boolean;
  /** Called after a stock is added (lets a parent collapse/celebrate). */
  onAdded?: () => void;
}

const SUGGEST_COUNT = 6;
// Strongest-rated tiers first; we pad down so there are always enough picks.
const TIER_ORDER: Array<keyof ScoresResponse["tiers"]> = ["strong_buy", "safe_buy", "watch"];

const ICON_PLUS = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const ICON_CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/**
 * Empty-watchlist on-ramp. Instead of a "blind" bulk add (one tap dumping five
 * unseen tickers into the list), we surface the top-rated companies by name with
 * a quality-score badge, each added one at a time — so the user knows exactly what
 * they're following. The page/card above this always has a search box for adding
 * any other stock.
 */
export default function EmptyStateActions({ compact = false, onAdded }: Props = {}) {
  const [scores, setScores] = useState<ScoresResponse | null>(null);
  const [watched, setWatched] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    getScores()
      .then((s) => {
        if (!cancelled) setScores(s);
      })
      .catch(() => {});
    setWatched(getCachedWatchlist());
    const off = subscribeWatchlist(() => setWatched(getCachedWatchlist()));
    return () => {
      cancelled = true;
      off();
    };
  }, []);

  const suggestions: ScoreItem[] = (() => {
    if (!scores) return [];
    const out: ScoreItem[] = [];
    for (const key of TIER_ORDER) {
      const tier = [...(scores.tiers[key] ?? [])].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
      for (const it of tier) {
        out.push(it);
        if (out.length >= SUGGEST_COUNT) return out;
      }
    }
    return out;
  })();

  function handleAdd(code: string) {
    addToWatchlist(code);
    onAdded?.();
  }

  return (
    <div className={`text-left ${compact ? "mt-3" : "mt-5"}`}>
      {!compact && (
        <p className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
          Suggested to follow
        </p>
      )}

      {scores === null ? (
        <ul className="flex flex-col gap-2">
          {[...Array(4)].map((_, i) => (
            <li
              key={i}
              className="h-[60px] animate-pulse rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
            />
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((it) => {
            const code = it.trading_code.toUpperCase();
            const isWatched = watched.includes(code);
            const chg = it.change_pct;
            const chgColor =
              chg == null || chg === 0
                ? "var(--text-muted)"
                : chg > 0
                  ? "var(--positive)"
                  : "var(--negative)";
            return (
              <li
                key={code}
                className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 pl-3.5 transition-all hover:border-[color-mix(in_srgb,var(--primary)_45%,var(--border))] hover:shadow-sm"
              >
                <Link
                  href={`/stock/${code}`}
                  prefetch={false}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="text-sm font-bold leading-tight text-[var(--text)] transition-colors group-hover:text-[var(--primary)]">
                    {code}
                  </span>
                  <span className="truncate text-xs text-[var(--text-muted)]">
                    {it.company_name ?? ""}
                  </span>
                </Link>

                {/* Latest price + today's move */}
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                    {taka(it.ltp, 1)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums" style={{ color: chgColor }}>
                    {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={() => handleAdd(code)}
                  disabled={isWatched}
                  aria-label={isWatched ? `${code} added` : `Add ${code} to watchlist`}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-all ${
                    isWatched
                      ? "cursor-default border border-[color-mix(in_srgb,var(--positive)_30%,var(--border))] bg-[color-mix(in_srgb,var(--positive)_10%,transparent)] text-[var(--positive)]"
                      : "text-white hover:brightness-110 active:scale-95"
                  }`}
                  style={isWatched ? undefined : { background: "var(--primary)" }}
                >
                  {isWatched ? ICON_CHECK : ICON_PLUS}
                  {isWatched ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
