import Link from "next/link";
import { taka, pct } from "@/lib/formatters";
import type { PopularStockItem } from "@/lib/api";

interface Props {
  items: PopularStockItem[];
}

const MEDAL: Record<number, string> = {
  1: "#B8860B", // gold
  2: "#6B7280", // silver
  3: "#B45309", // bronze
};

function chgColor(val: number | null) {
  if (val == null) return "var(--text-muted)";
  if (val > 0) return "var(--positive)";
  if (val < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function fmtChg(val: number | null) {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${pct(val)}`;
}

export default function PopularTeaser({ items }: Props) {
  if (items.length === 0) return null;
  const top5 = items.slice(0, 5);

  return (
    <section aria-label="Most popular stocks">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-[var(--primary)] shrink-0 self-center" />
          <span className="text-sm font-extrabold text-[var(--text)]">Most Popular</span>
          <span className="text-xs text-[var(--text-muted)] truncate">· trending now</span>
        </div>
        <Link href="/dse-popular-stocks" className="text-xs font-semibold text-[var(--primary)] hover:underline shrink-0">
          View all →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {top5.map((item) => {
          const medal = MEDAL[item.rank];
          const color = chgColor(item.change_pct);
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className="soft-card hover-lift snap-start shrink-0 w-[150px] p-3 flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[0.72rem] font-extrabold tabular-nums shrink-0"
                  style={
                    medal
                      ? { color: medal, background: `color-mix(in srgb, ${medal} 16%, transparent)`, border: `1.5px solid ${medal}` }
                      : { color: "var(--text-muted)", background: "var(--surface-2)", border: "1px solid var(--border)" }
                  }
                >
                  {item.rank}
                </span>
                <span className="ticker-tag text-[0.8rem]">{item.trading_code}</span>
              </div>

              <div className="flex items-baseline justify-between border-t border-[var(--cell-rule)] pt-2 mt-auto">
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {item.ltp != null ? taka(item.ltp, 1) : "—"}
                </span>
                <span className="text-xs font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                  {fmtChg(item.change_pct)}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
