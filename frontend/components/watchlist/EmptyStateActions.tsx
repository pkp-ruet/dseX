"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { flattenTiers, getScores, type ScoresResponse, type ScoreItem } from "@/lib/api";
import { addToWatchlist, getCachedWatchlist, subscribeWatchlist } from "@/lib/watchlist";
import { taka } from "@/lib/formatters";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

interface Props {
  /** Tighter top spacing + no heading when embedded in another card (homepage first-run). */
  compact?: boolean;
  /** Called after a stock is added (lets a parent collapse/celebrate). */
  onAdded?: () => void;
}

const SUGGEST_COUNT = 6;

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

  // Highest-rated companies first (flatten + score sort ≡ strongest tiers first).
  const suggestions: ScoreItem[] = (() => {
    if (!scores) return [];
    return flattenTiers(scores)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, SUGGEST_COUNT);
  })();

  function handleAdd(code: string) {
    addToWatchlist(code);
    onAdded?.();
  }

  return (
    <div className={`text-left ${compact ? "mt-3" : "mt-5"}`}>
      {!compact && (
        <p className="mb-2.5 text-xs font-bold uppercase tracking-[0.14em] text-text-muted">
          Suggested to follow
        </p>
      )}

      {scores === null ? (
        <ul className="flex flex-col gap-2" aria-busy="true" aria-label="Loading suggestions">
          {[...Array(4)].map((_, i) => (
            <li key={i} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pl-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton width={64} height={14} />
                <Skeleton width="55%" height={12} />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton width={48} height={14} />
                <Skeleton width={36} height={12} />
              </div>
              <Skeleton width={64} height={36} rounded="999px" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="flex flex-col gap-2">
          {suggestions.map((it) => {
            const code = it.trading_code.toUpperCase();
            const isWatched = watched.includes(code);
            const chg = it.change_pct;
            const chgClass =
              chg == null || chg === 0
                ? "text-text-muted"
                : chg > 0
                  ? "text-positive"
                  : "text-negative";
            return (
              <li
                key={code}
                className="group flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 pl-3.5 transition-all hover:border-primary/40 hover:shadow-soft"
              >
                <Link
                  href={`/stock/${code}`}
                  prefetch={false}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="text-sm font-bold leading-tight text-text-main transition-colors group-hover:text-primary">
                    {code}
                  </span>
                  <span className="truncate text-xs text-text-muted">
                    {it.company_name ?? ""}
                  </span>
                </Link>

                {/* Latest price + today's move */}
                <span className="flex shrink-0 flex-col items-end leading-tight">
                  <span className="text-sm font-bold tabular-nums text-text-main">
                    {taka(it.ltp, 1)}
                  </span>
                  <span className={`text-xs font-semibold tabular-nums ${chgClass}`}>
                    {chg == null ? "—" : `${chg > 0 ? "+" : ""}${chg.toFixed(1)}%`}
                  </span>
                </span>

                {isWatched ? (
                  <span
                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-positive/30 bg-positive/10 px-3 text-xs font-bold text-positive"
                    aria-label={`${code} added`}
                  >
                    {ICON_CHECK}
                    Added
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleAdd(code)}
                    aria-label={`Add ${code} to watchlist`}
                    className="shrink-0"
                  >
                    {ICON_PLUS}
                    Add
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
