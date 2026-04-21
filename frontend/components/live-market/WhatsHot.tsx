"use client";
import Link from "next/link";
import type { LivePriceItem } from "@/lib/api";

interface Props {
  items: LivePriceItem[];
}

export default function WhatsHot({ items }: Props) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
        🔥 What&apos;s Hot
        <span className="text-xs font-normal text-[var(--text-muted)]">— volume × momentum</span>
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.slice(0, 8).map((item, i) => {
          const sign = (item.change_pct ?? 0) >= 0 ? "+" : "";
          return (
            <Link
              key={item.code}
              href={`/stock/${item.code}`}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-orange-400 transition-colors"
            >
              <span className="text-xs text-[var(--text-muted)] w-4">{i + 1}</span>
              <span className="font-semibold text-sm text-[var(--text)]">{item.code}</span>
              {item.ltp != null && (
                <span className="text-xs text-[var(--text-muted)] tabular-nums">৳{item.ltp.toFixed(1)}</span>
              )}
              {item.change_pct != null && (
                <span className="text-xs font-bold text-green-600 dark:text-green-400 tabular-nums">
                  {sign}{item.change_pct.toFixed(1)}%
                </span>
              )}
              {item.volume != null && (
                <span className="text-xs text-[var(--text-muted)]">
                  {item.volume >= 1_000_000
                    ? `${(item.volume / 1_000_000).toFixed(1)}M`
                    : item.volume >= 1_000
                    ? `${(item.volume / 1_000).toFixed(0)}K`
                    : item.volume}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
