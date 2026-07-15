"use client";

import { useMemo } from "react";
import type { DseTodayNewsItem } from "@/lib/api";
import { usePersonalCodes } from "@/lib/use-personal-codes";
import DseTodayNewsCard, { type NewsSource } from "@/components/dse-today/DseTodayNewsCard";

/**
 * Wraps a market-wide news list and, for signed-in users, pulls stories on the
 * stocks they own or watch to the top — with clear "Portfolio" / "Watchlist"
 * indication — leaving the rest of the market below. Logged-out users (and the
 * first paint, before personal codes hydrate) see the exact same flat list as
 * before, so there's no SSR hydration mismatch.
 */
export default function PersonalNewsFeed({ items }: { items: DseTodayNewsItem[] }) {
  const { portfolio, watchlist } = usePersonalCodes();

  const { personal, others } = useMemo(() => {
    const rank: Record<NonNullable<NewsSource>, number> = { portfolio: 0, watchlist: 1, other: 2 };
    const sourceOf = (code: string): NewsSource => {
      const c = code.toUpperCase();
      if (portfolio.has(c)) return "portfolio";
      if (watchlist.has(c)) return "watchlist";
      return "other";
    };

    const personal: { item: DseTodayNewsItem; source: NewsSource }[] = [];
    const others: DseTodayNewsItem[] = [];
    for (const item of items) {
      const source = sourceOf(item.trading_code);
      if (source === "other") others.push(item);
      else personal.push({ item, source });
    }

    // Portfolio before watchlist; newest-first within each. (Source list is
    // already newest-first from the server, so `others` keeps its order.)
    personal.sort((a, b) => {
      const byGroup = rank[a.source!] - rank[b.source!];
      if (byGroup !== 0) return byGroup;
      return dateVal(b.item.post_date) - dateVal(a.item.post_date);
    });

    return { personal, others };
  }, [items, portfolio, watchlist]);

  // Nothing personal → render the plain market list unchanged.
  if (personal.length === 0) {
    return <NewsGrid items={items.map((item) => ({ item, source: null as NewsSource }))} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <GroupHeader label="News on your stocks" count={personal.length} tone="var(--primary)" />
        <NewsGrid items={personal} />
      </div>

      {others.length > 0 && (
        <div>
          <GroupHeader label="Rest of the market" count={others.length} tone="var(--text-muted)" />
          <NewsGrid items={others.map((item) => ({ item, source: "other" as NewsSource }))} />
        </div>
      )}
    </div>
  );
}

function NewsGrid({ items }: { items: { item: DseTodayNewsItem; source: NewsSource }[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map(({ item, source }, i) => (
        <DseTodayNewsCard
          key={`${item.trading_code}-${item.post_date ?? i}-${i}`}
          item={item}
          source={source}
        />
      ))}
    </div>
  );
}

function GroupHeader({ label, count, tone }: { label: string; count: number; tone: string }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
        style={{
          color: tone,
          background: `color-mix(in srgb, ${tone} 10%, transparent)`,
          border: `1px solid color-mix(in srgb, ${tone} 30%, transparent)`,
        }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} aria-hidden />
        {label}
        <span className="tabular-nums opacity-60">{count}</span>
      </span>
      <span className="h-px flex-1" style={{ background: "var(--border)" }} aria-hidden />
    </div>
  );
}

function dateVal(d: string | null): number {
  if (!d) return 0;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? 0 : t;
}
