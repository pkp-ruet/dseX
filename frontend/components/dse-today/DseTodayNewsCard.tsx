"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import type { DseTodayNewsItem } from "@/lib/api";

/**
 * One news story on the DSE Today page — a self-contained premium card:
 * ticker chip + company + date on top, the headline, then an expandable body.
 */
export default function DseTodayNewsCard({ item }: { item: DseTodayNewsItem }) {
  const [expanded, setExpanded] = useState(false);
  const body = (item.body ?? "").trim();
  const hasBody = body.length > 0;

  return (
    <article
      className="soft-card hover-lift flex flex-col gap-2.5 p-3.5 sm:p-4"
      style={{ borderLeft: "3px solid var(--primary)" }}
    >
      {/* Source row — ticker · company · date */}
      <div className="flex items-center gap-2">
        <Link prefetch={false} href={`/stock/${item.trading_code}`} className="ticker-tag text-[11px] shrink-0">
          {item.trading_code}
        </Link>
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-[var(--text-muted)]">
          {item.company_name ?? ""}
        </span>
        {item.post_date && (
          <span className="shrink-0 text-[10px] font-bold tabular-nums uppercase tracking-wide text-[var(--text-muted)]">
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
