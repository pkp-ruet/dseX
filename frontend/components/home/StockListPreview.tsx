import Link from "next/link";
import { type ScoreItem } from "@/lib/api";
import { taka, signed } from "@/lib/formatters";

/** Compact A–Z slice of the full stock universe with a link to /stocks. */
export default function StockListPreview({
  items,
  totalCount,
}: {
  items: ScoreItem[];
  totalCount: number;
}) {
  const rows = [...items]
    .sort((a, b) => a.trading_code.localeCompare(b.trading_code))
    .slice(0, 7);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_30px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)] text-[0.6rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        <span>Stock</span>
        <span className="text-right">Price · Change</span>
      </div>
      <div className="divide-y divide-[var(--cell-rule)]">
        {rows.map((item) => {
          const chg = item.change_pct;
          const chgColor = chg == null ? "var(--text-muted)" : chg >= 0 ? "var(--positive)" : "var(--negative)";
          const sub = [item.company_name, item.sector].filter(Boolean).join(" · ");
          return (
            <Link
              key={item.trading_code}
              href={`/stock/${item.trading_code}`}
              className="grid grid-cols-[1fr_auto] gap-3 items-center px-4 py-2.5 hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-[var(--text)] tracking-wide">{item.trading_code}</span>
                  {item.market_category && (
                    <span className="text-[0.55rem] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-muted)]">
                      {item.market_category}
                    </span>
                  )}
                </span>
                <span className="block text-[0.68rem] text-[var(--text-muted)] truncate">{sub}</span>
              </span>
              <span className="text-right shrink-0">
                <span className="block text-sm font-semibold tabular-nums text-[var(--text)]">
                  {item.ltp != null ? taka(item.ltp, 2) : "--"}
                </span>
                <span className="block text-xs font-bold tabular-nums" style={{ color: chgColor }}>
                  {chg == null ? "--" : `${signed(chg)}%`}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <Link
        href="/stocks"
        className="block text-center px-4 py-3 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--surface-2)] border-t border-[var(--border)] transition-colors"
      >
        Browse all {totalCount}+ stocks →
      </Link>
    </div>
  );
}
