"use client";

import Link from "next/link";
import type { AdminAnalyticsResponse, AdminPopularStock, ScoreItem } from "@/lib/api";
import { COLORS } from "./shared";

function RankedList({
  title,
  subtitle,
  items,
  priceMap,
  barColor,
  showQty,
}: {
  title: string;
  subtitle: string;
  items: AdminPopularStock[];
  priceMap: Map<string, ScoreItem>;
  barColor: string;
  showQty?: boolean;
}) {
  const max = items.reduce((a, i) => Math.max(a, i.count), 0) || 1;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <h3 className="text-sm font-bold text-[var(--text)]">{title}</h3>
        <p className="text-[11px] text-[var(--text-muted)]">{subtitle}</p>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {items.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">No data yet.</p>
        )}
        {items.map((it, i) => {
          const name = priceMap.get(it.code.toUpperCase())?.company_name ?? null;
          return (
            <Link
              key={it.code}
              prefetch={false} href={`/stock/${it.code}`}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="text-[11px] font-bold text-[var(--text-muted)] w-5 tabular-nums shrink-0">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[var(--text)]">{it.code}</span>
                  {showQty && it.total_qty != null && (
                    <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                      {Math.round(it.total_qty).toLocaleString()} shares
                    </span>
                  )}
                </span>
                {name && <span className="block text-[11px] text-[var(--text-muted)] truncate">{name}</span>}
                <span className="mt-1 block h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${(it.count / max) * 100}%`, background: barColor }} />
                </span>
              </span>
              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: barColor }}>
                {it.count}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function AdoptionTab({
  data,
  priceMap,
}: {
  data: AdminAnalyticsResponse;
  priceMap: Map<string, ScoreItem>;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RankedList
        title="Most watched"
        subtitle="Stocks on the most user watchlists"
        items={data.popular_stocks.most_watched}
        priceMap={priceMap}
        barColor={COLORS.primary}
      />
      <RankedList
        title="Most held"
        subtitle="Stocks in the most user portfolios"
        items={data.popular_stocks.most_held}
        priceMap={priceMap}
        barColor={COLORS.positive}
        showQty
      />
    </div>
  );
}
