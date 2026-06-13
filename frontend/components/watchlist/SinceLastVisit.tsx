"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import {
  apiVisitWatchlist,
  getWatchlistNews,
  getDividendsUpcoming,
  type WatchlistNewsItem,
  type ScoreItem,
} from "@/lib/api";

interface Props {
  codes: string[];
  rows: ScoreItem[]; // already resolved rows from scores
}

interface Delta {
  newsCount: number;
  biggestMover: { code: string; pct: number } | null;
  dividendsSoon: number; // upcoming declarations + record dates in next 14 days for watched
  firstVisit: boolean;
}

export default function SinceLastVisit({ codes, rows }: Props) {
  const [delta, setDelta] = useState<Delta | null>(null);
  const [, setError] = useState<string | null>(null);

  useEffect(() => {
    if (codes.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const visit = await apiVisitWatchlist();
        const lastVisit = visit.previous_visit_at;
        const lvMs = lastVisit ? Date.parse(lastVisit) : null;

        const [newsList, divs] = await Promise.all([
          getWatchlistNews(codes).catch((): WatchlistNewsItem[] => []),
          getDividendsUpcoming().catch(() => null),
        ]);

        const newsCount =
          lvMs == null ? 0 : newsList.filter((n) => Date.parse(n.post_date) > lvMs).length;

        let biggest: { code: string; pct: number } | null = null;
        for (const r of rows) {
          if (r.change_pct == null) continue;
          if (!biggest || Math.abs(r.change_pct) > Math.abs(biggest.pct)) {
            biggest = { code: r.trading_code, pct: r.change_pct };
          }
        }

        let dividendsSoon = 0;
        if (divs) {
          const watchedSet = new Set(codes.map((c) => c.toUpperCase()));
          const horizon = Date.now() + 14 * 24 * 3600 * 1000;
          const isSoon = (d: string | null) => {
            if (!d) return false;
            const t = Date.parse(d);
            return t >= Date.now() && t <= horizon;
          };
          for (const item of divs.upcoming_declarations) {
            if (watchedSet.has(item.trading_code.toUpperCase()) && isSoon(item.projected_date)) {
              dividendsSoon += 1;
            }
          }
          for (const item of divs.upcoming_record_dates) {
            if (watchedSet.has(item.trading_code.toUpperCase()) && isSoon(item.record_date)) {
              dividendsSoon += 1;
            }
          }
        }

        if (!cancelled) {
          setDelta({
            newsCount,
            biggestMover: biggest,
            dividendsSoon,
            firstVisit: lvMs == null,
          });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [codes.join(","), rows.length]);

  if (codes.length === 0 || !delta) return null;

  if (delta.firstVisit) {
    return (
      <Card padding="none" className="mb-6 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-[var(--primary)] mb-1">
          Welcome to your watchlist
        </div>
        <p className="text-sm text-[var(--ink)]">
          Come back tomorrow — we&apos;ll show news, price moves, and dividend events on your stocks since your last visit.
        </p>
      </Card>
    );
  }

  const allZero =
    delta.newsCount === 0 && delta.biggestMover == null && delta.dividendsSoon === 0;

  return (
    <Card padding="none" className="mb-6 p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--primary)]">
          Since your last visit
        </h2>
      </div>

      {allZero ? (
        <p className="text-sm text-[var(--ink-muted)]">Nothing new on your stocks.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--ink-muted)]">Fresh news</div>
            <div className="mt-1 text-2xl font-bold text-[var(--ink)] nums">{delta.newsCount}</div>
            <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">
              {delta.newsCount === 1 ? "item posted" : "items posted"}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--ink-muted)]">Biggest mover today</div>
            {delta.biggestMover ? (
              <Link
                prefetch={false} href={`/stock/${delta.biggestMover.code}`}
                className="mt-1 block"
              >
                <div className="text-lg font-bold text-[var(--ink)]">
                  {delta.biggestMover.code}
                </div>
                <div
                  className={`text-sm font-semibold nums ${
                    delta.biggestMover.pct > 0
                      ? "text-[var(--positive)]"
                      : "text-[var(--negative)]"
                  }`}
                >
                  {delta.biggestMover.pct > 0 ? "+" : ""}
                  {delta.biggestMover.pct.toFixed(2)}%
                </div>
              </Link>
            ) : (
              <div className="mt-1 text-sm text-[var(--ink-muted)]">No price data</div>
            )}
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="text-xs text-[var(--ink-muted)]">Dividends ahead</div>
            <div className="mt-1 text-2xl font-bold text-[var(--ink)] nums">
              {delta.dividendsSoon}
            </div>
            <div className="text-[11px] text-[var(--ink-muted)] mt-0.5">in next 14 days</div>
          </div>
        </div>
      )}
    </Card>
  );
}
