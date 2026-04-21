"use client";
import type { LiveBreadth } from "@/lib/api";

interface Props {
  breadth: LiveBreadth | null | undefined;
}

export default function BreadthBar({ breadth }: Props) {
  if (!breadth || breadth.total === 0) return null;

  const { advances, declines, unchanged, total } = breadth;
  const advPct = Math.round((advances / total) * 100);
  const decPct = Math.round((declines / total) * 100);
  const flatPct = 100 - advPct - decPct;

  const sentiment =
    advPct > 55 ? "Bullish" : decPct > 55 ? "Bearish" : "Mixed";
  const sentimentColor =
    advPct > 55
      ? "text-green-600 dark:text-green-400"
      : decPct > 55
      ? "text-red-500 dark:text-red-400"
      : "text-[var(--text-muted)]";

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-5 py-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-[var(--text)]">Market Breadth</span>
        <span className={`text-xs font-semibold ${sentimentColor}`}>{sentiment}</span>
      </div>
      <div className="flex rounded-full overflow-hidden h-3 mb-3">
        <div
          className="bg-green-500 transition-all duration-700"
          style={{ width: `${advPct}%` }}
          title={`Advances: ${advances}`}
        />
        <div
          className="bg-[var(--text-muted)] opacity-30"
          style={{ width: `${flatPct}%` }}
          title={`Unchanged: ${unchanged}`}
        />
        <div
          className="bg-red-500 transition-all duration-700"
          style={{ width: `${decPct}%` }}
          title={`Declines: ${declines}`}
        />
      </div>
      <div className="flex gap-4 text-xs">
        <span className="text-green-600 dark:text-green-400 font-medium">▲ {advances} Up</span>
        <span className="text-[var(--text-muted)]">— {unchanged} Flat</span>
        <span className="text-red-500 dark:text-red-400 font-medium">▼ {declines} Down</span>
        <span className="ml-auto text-[var(--text-muted)]">{total} total</span>
      </div>
    </div>
  );
}
