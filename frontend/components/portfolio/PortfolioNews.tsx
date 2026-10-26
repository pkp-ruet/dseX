"use client";

import { useState } from "react";
import Link from "next/link";
import type { WatchlistNewsItem } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Skeleton from "@/components/ui/Skeleton";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/** Rows shown before "See all". */
const FIRST_ROWS = 6;

/**
 * News on the reader's stocks, inside the portfolio's "News on your stocks"
 * card (2026-10-26): headline only, one hairline row each — company code,
 * date, the headline. "Read more" opens the full announcement in place.
 * The watchlist page keeps its own list (`watchlist/WatchlistNews`).
 */
export default function PortfolioNews({
  news,
  loading,
  names,
  lang,
}: {
  news: WatchlistNewsItem[];
  loading: boolean;
  /** Company names by code, to show beside the code. */
  names?: Map<string, string | null | undefined>;
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [all, setAll] = useState(false);

  if (loading && news.length === 0) {
    return (
      <ul className="pf-rows" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex flex-col gap-2 py-3">
            <Skeleton width={120} height={12} />
            <Skeleton width="85%" height={14} />
          </li>
        ))}
      </ul>
    );
  }
  if (news.length === 0) {
    return (
      <p className={`text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
        {L("No news on your stocks in the last 30 days.", "গত 30 দিনে আপনার শেয়ারের কোনো খবর নেই।")}
      </p>
    );
  }

  const items = all ? news : news.slice(0, FIRST_ROWS);
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <>
      <ul className="pf-rows">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          const name = names?.get(item.trading_code.toUpperCase());
          return (
            <li key={`${item.trading_code}-${item.post_date}-${i}`} className="py-3">
              <p className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0 truncate">
                  <Link prefetch={false} href={`/stock/${item.trading_code}`} className="font-bold text-text-main hover:underline">
                    {item.trading_code}
                  </Link>
                  {name && <span className="text-text-muted"> · {name}</span>}
                </span>
                <span className="shrink-0 text-text-muted">{formatDate(item.post_date)}</span>
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-text-main">{item.title}</p>
              {item.body && (
                <>
                  {isOpen && (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-text-main">{item.body}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    className={`pf-link ${bn ? "font-bn" : ""}`}
                  >
                    {isOpen ? L("Show less", "কম দেখুন") : L("Read more", "আরও পড়ুন")}
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      {news.length > FIRST_ROWS && (
        <div className="pf-card-foot">
          <button type="button" onClick={() => setAll((v) => !v)} aria-expanded={all} className={`pf-link ${bn ? "font-bn" : ""}`}>
            {all ? L("Show fewer", "কম দেখুন") : L(`See all ${news.length}`, `সব ${news.length}টি দেখুন`)}
          </button>
        </div>
      )}
    </>
  );
}
