import Link from "next/link";
import { type ScoreItem } from "@/lib/api";
import { taka, signed } from "@/lib/formatters";
import Card from "@/components/ui/Card";

/** Compact A–Z slice of the full stock universe as colorful tiles → /stocks. */
export default function StockListPreview({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const rows = [...items]
    .sort((a, b) => a.trading_code.localeCompare(b.trading_code))
    .slice(0, 8);

  return (
    <Card padding="sm" className="overflow-hidden">
      <div className="flex items-center gap-2 px-1 pt-1 pb-3">
        <span className="text-sm">🔤</span>
        <span className="text-[0.78rem] font-extrabold text-[var(--text)]">Browse Stocks A–Z</span>
        <span className="ml-auto text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Live Price
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {rows.map((item) => {
          const chg = item.change_pct;
          const up = chg != null && chg >= 0;
          const chgColor = chg == null ? "var(--text-muted)" : up ? "var(--positive)" : "var(--negative)";
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className="hover-lift group flex flex-col gap-2 rounded-xl p-3 bg-[var(--surface)] border border-[var(--border)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="ticker-tag text-[0.78rem]">{item.trading_code}</span>
                {item.market_category && (
                  <span className="text-[0.68rem] font-extrabold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-2)] text-[var(--text-muted)]">
                    {item.market_category}
                  </span>
                )}
              </div>

              <span className="text-[0.68rem] text-[var(--text-muted)] truncate leading-tight">
                {item.company_name}
              </span>

              <div className="flex items-end justify-between gap-2 mt-auto">
                <span className="text-sm font-extrabold tabular-nums nums text-[var(--text)]">
                  {item.ltp != null ? taka(item.ltp, 2) : "--"}
                </span>
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[0.68rem] font-extrabold tabular-nums nums text-white"
                  style={{ background: chgColor }}
                >
                  {chg != null && (up ? "▲" : "▼")}
                  {chg == null ? "--" : `${signed(chg)}%`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/stocks"
        className="block text-center mt-3 px-4 py-2.5 rounded-xl text-xs font-bold text-[var(--primary)] bg-[var(--surface-2)] hover:bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-2))] transition-colors"
      >
        Browse all {totalCount}+ stocks →
      </Link>
    </Card>
  );
}
