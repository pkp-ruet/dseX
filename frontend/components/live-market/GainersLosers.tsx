"use client";
import Link from "next/link";
import type { LivePriceItem } from "@/lib/api";

interface Props {
  gainers: LivePriceItem[];
  losers: LivePriceItem[];
}

function MoverCard({ item, isGainer }: { item: LivePriceItem; isGainer: boolean }) {
  const pctColor = isGainer
    ? "text-green-600 dark:text-green-400"
    : "text-red-500 dark:text-red-400";
  const border = isGainer ? "border-l-green-500" : "border-l-red-500";
  const sign = isGainer ? "+" : "";

  return (
    <Link
      href={`/stock/${item.code}`}
      className={`flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] border-l-4 ${border} hover:bg-[var(--bg-secondary)] transition-colors`}
    >
      <div className="min-w-0 flex-1 mr-2">
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-[var(--text)] text-sm">{item.code}</span>
          {item.ltp != null && (
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              ৳{item.ltp.toFixed(1)}
            </span>
          )}
        </div>
        {item.company_name && (
          <div className="text-xs text-[var(--text-muted)] truncate mt-0.5 leading-tight">
            {item.company_name}
          </div>
        )}
      </div>
      {item.change_pct != null && (
        <span className={`text-sm font-bold tabular-nums shrink-0 ${pctColor}`}>
          {sign}{item.change_pct.toFixed(2)}%
        </span>
      )}
    </Link>
  );
}

export default function GainersLosers({ gainers, losers }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <span className="text-green-500">▲</span> Top Gainers
        </h3>
        <div className="flex flex-col gap-1.5">
          {gainers.slice(0, 10).map((g) => (
            <MoverCard key={g.code} item={g} isGainer />
          ))}
          {gainers.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] py-2">No data</p>
          )}
        </div>
      </div>
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
          <span className="text-red-500">▼</span> Top Losers
        </h3>
        <div className="flex flex-col gap-1.5">
          {losers.slice(0, 10).map((l) => (
            <MoverCard key={l.code} item={l} isGainer={false} />
          ))}
          {losers.length === 0 && (
            <p className="text-xs text-[var(--text-muted)] py-2">No data</p>
          )}
        </div>
      </div>
    </div>
  );
}
