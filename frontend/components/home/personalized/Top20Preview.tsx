import Link from "next/link";
import type { Top20Item } from "@/lib/api";

function fmtSigned(val: number | null): string {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${val.toFixed(1)}%`;
}

/** Compact Trending Stocks preview styled like LiveRankingPreview: 5 rows
 *  (rank · ticker · 7d return · LTP) + a "See all" footer. */
export default function Top20Preview({ items }: { items: Top20Item[] }) {
  const rows = items.slice(0, 5);
  if (rows.length === 0) return null;

  const cols = "grid-cols-[1.75rem_1fr_5.5rem_4.75rem]";

  return (
    <div className="soft-card overflow-hidden">
      <div className={`grid ${cols} gap-3 px-4 py-3 border-b-2 border-[var(--border)] bg-[var(--surface-2)] text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-[var(--text)]`}>
        <span className="text-right">#</span>
        <span>Stock</span>
        <span className="text-right leading-tight">7-Day Return</span>
        <span className="text-right">LTP</span>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item) => {
          const v = item.return_7d_pct;
          const color = v == null ? "var(--text-muted)" : v > 0 ? "var(--positive)" : v < 0 ? "var(--negative)" : "var(--text-muted)";
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className={`group grid ${cols} gap-3 items-center px-4 py-3 border-l-[3px] hover:bg-[var(--surface-2)] transition-colors`}
              style={{ borderLeftColor: `color-mix(in srgb, ${color} 26%, transparent)` }}
            >
              <span className="text-right text-xs font-bold tabular-nums text-[var(--text-muted)]">{item.rank}</span>
              <span className="min-w-0">
                <span className="ticker-tag text-[0.8rem]">{item.trading_code}</span>
                {item.company_name && (
                  <span className="block mt-0.5 text-[0.66rem] text-[var(--text-muted)] truncate">
                    {item.company_name}
                  </span>
                )}
              </span>
              <span className="justify-self-end text-sm font-extrabold tabular-nums" style={{ color }}>
                {v != null && v > 0 ? "▲" : v != null && v < 0 ? "▼" : ""}
                {fmtSigned(v)}
              </span>
              <span className="fr-price justify-self-end">
                <span className="fr-price-cur">৳</span>
                <span className="fr-price-val">{item.ltp != null ? item.ltp.toFixed(2) : "--"}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/dse-trending-stocks"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        See all Trending Stocks →
      </Link>
    </div>
  );
}
