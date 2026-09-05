"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import type { DseTodayNewsItem } from "@/lib/api";

/**
 * Where a story sits relative to the signed-in user:
 * - `portfolio` — a stock they own
 * - `watchlist` — a stock they watch (but don't own)
 * - `other`     — rest of the market (de-emphasized when a personal group exists)
 * - `null`      — no personalization context → default look (unchanged)
 */
export type NewsSource = "portfolio" | "watchlist" | "other" | null;

const BORDER_BY_SOURCE: Record<NonNullable<NewsSource>, string> = {
  portfolio: "var(--positive)",
  watchlist: "var(--primary)",
  other: "var(--border)",
};

/**
 * One news story on the DSE Today / Today's News pages — a self-contained
 * premium card: ticker chip + optional "your stock" pill + company + date on
 * top, the headline, then an expandable body. The left border and pill are
 * tinted by `source` so portfolio / watchlist stories are recognizable at a
 * glance when they're pulled to the top of the feed.
 */
export default function DseTodayNewsCard({
  item,
  source = null,
}: {
  item: DseTodayNewsItem;
  source?: NewsSource;
}) {
  const [expanded, setExpanded] = useState(false);
  const body = (item.body ?? "").trim();
  const hasBody = body.length > 0;

  // Default (no personalization) keeps the original clay border.
  const borderColor = source ? BORDER_BY_SOURCE[source] : "var(--primary)";
  const isPortfolio = source === "portfolio";
  const isWatchlist = source === "watchlist";
  const pillColor = isPortfolio ? "var(--positive)" : "var(--primary-ink)";

  return (
    <article
      className="soft-card hover-lift flex flex-col gap-2.5 p-3.5 sm:p-4"
      style={{ borderLeft: `3px solid ${borderColor}` }}
    >
      {/* Source row — ticker · your-stock pill · company · date */}
      <div className="flex items-center gap-2">
        <Link prefetch={false} href={`/stock/${item.trading_code}`} className="ticker-tag text-[11px] shrink-0">
          {item.trading_code}
        </Link>
        {(isPortfolio || isWatchlist) && (
          <span
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-bold"
            style={{
              color: pillColor,
              background: `color-mix(in srgb, ${isPortfolio ? "var(--positive)" : "var(--primary)"} 12%, transparent)`,
            }}
          >
            {isPortfolio ? "Portfolio" : "Watchlist"}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--text-muted)]">
          {item.company_name ?? ""}
        </span>
        {item.post_date && (
          <span className="shrink-0 text-[11px] font-bold tabular-nums uppercase tracking-wide text-[var(--text-muted)]">
            {formatDate(item.post_date)}
          </span>
        )}
      </div>

      {/* Headline */}
      <h3 className="text-sm font-semibold leading-snug text-[var(--text)]">{item.title}</h3>

      {/* Body */}
      {hasBody && (
        <>
          <p
            className={`text-[13px] leading-relaxed text-[var(--text-muted)] ${expanded ? "" : "line-clamp-3"}`}
          >
            {body}
          </p>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="self-start text-xs font-bold text-[var(--primary-ink)] transition-opacity hover:opacity-70"
          >
            {expanded ? "Show less" : "Read more →"}
          </button>
        </>
      )}
    </article>
  );
}
