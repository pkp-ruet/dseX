"use client";

import { useState } from "react";
import Link from "next/link";
import { type WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

interface Props {
  codes: string[];
  news: WatchlistNewsItem[];
  loading: boolean;
  /** Cap how many items render (data is already newest-first). */
  limit?: number;
  /** Drop the centered "Last 30 Days" header + wide wrapper (for embedding e.g. on the homepage). */
  compact?: boolean;
}

function NewsItem({ item }: { item: WatchlistNewsItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group relative flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm hover:shadow-md hover:border-[var(--primary)] transition-all duration-200">
      <div className="flex items-center justify-between gap-2">
        <Link
          prefetch={false} href={`/stock/${item.trading_code}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide bg-[var(--primary)] text-white hover:opacity-80 transition-opacity"
        >
          {item.trading_code}
        </Link>
        <span className="text-[11px] text-[var(--ink-muted)] shrink-0">
          {formatDate(item.post_date)}
        </span>
      </div>

      <p className="text-sm font-medium text-[var(--ink)] leading-snug">
        {item.title}
      </p>

      {item.body && (
        <>
          <p
            className={`text-xs text-[var(--ink-muted)] leading-relaxed ${
              expanded ? "" : "line-clamp-2"
            }`}
          >
            {item.body}
          </p>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="self-start text-[11px] font-semibold text-[var(--primary)] hover:underline"
            >
              Read more →
            </button>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-12 rounded-full bg-[var(--border)]" />
        <div className="h-3 w-16 rounded bg-[var(--border)]" />
      </div>
      <div className="h-3.5 w-full rounded bg-[var(--border)] mb-2" />
      <div className="h-3.5 w-3/4 rounded bg-[var(--border)]" />
    </div>
  );
}

export default function WatchlistNews({ codes, news, loading, limit, compact = false }: Props) {
  if (!codes.length) return null;

  // Show cached/fresh news whenever we have any; only fall back to skeleton
  // when we genuinely have nothing yet.
  const showSkeleton = loading && news.length === 0;
  const showEmpty = !loading && news.length === 0;
  const items = limit != null ? news.slice(0, limit) : news;
  const skeletonCount = Math.min(limit ?? 4, 4);

  return (
    <section className={compact ? "" : "mt-12 mx-auto max-w-3xl"}>
      {/* Header */}
      {!compact && (
        <div className="flex flex-col items-center text-center mb-6">
          <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-[var(--primary)] mb-1">
            Watchlist News
          </span>
          <h2 className="text-xl font-bold text-[var(--ink)]">Last 30 Days</h2>
          <div className="mt-3 flex items-center gap-3 w-full max-w-xs">
            <div className="h-px flex-1 bg-[var(--border)]" />
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>
        </div>
      )}

      {showSkeleton && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(skeletonCount)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {showEmpty && (
        <div className="text-center py-10">
          <p className="text-sm text-[var(--ink-muted)]">No recent news.</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((item, i) => (
            <NewsItem key={i} item={item} />
          ))}
        </div>
      )}

      {compact && items.length > 0 && (
        <Link
          href="/watchlist"
          className="mt-3 flex items-center justify-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-2.5 text-xs font-bold text-[var(--primary)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-2))] transition-colors"
        >
          View all news →
        </Link>
      )}
    </section>
  );
}
