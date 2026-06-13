import Link from "next/link";
import { taka } from "@/lib/formatters";
import type { Top20Item } from "@/lib/api";

interface Props {
  items: Top20Item[];
}

function chgColor(val: number | null) {
  if (val == null) return "var(--text-muted)";
  if (val > 0) return "var(--positive)";
  if (val < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function fmtSigned(val: number | null) {
  if (val == null) return "—";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

export default function Top20MomentumTeaser({ items }: Props) {
  if (items.length === 0) return null;
  const top5 = items.slice(0, 5);

  return (
    <section aria-label="DSE Top 20">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="w-1 h-4 rounded-full bg-[var(--positive)] shrink-0 self-center" />
          <span className="text-sm font-extrabold text-[var(--text)]">DSE Top 20</span>
          <span className="text-xs text-[var(--text-muted)] truncate">· this week&apos;s movers</span>
        </div>
        <Link href="/dse-top-20" className="text-xs font-semibold text-[var(--primary)] hover:underline shrink-0">
          View all →
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {top5.map((item) => {
          const days = item.days_counted || 7;
          const color = chgColor(item.return_7d_pct);
          return (
            <Link
              key={item.trading_code}
              prefetch={false} href={`/stock/${item.trading_code}`}
              className="group soft-card hover-lift snap-start shrink-0 w-[158px] p-3 flex flex-col gap-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-5 rounded-md bg-[var(--surface-2)] text-[0.62rem] font-extrabold tabular-nums text-[var(--text-muted)]">
                  {item.rank}
                </span>
                <span className="ticker-tag text-[0.8rem]">{item.trading_code}</span>
                <span className="ml-auto text-[var(--primary)] opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-xs font-bold">↗</span>
              </div>

              <span
                className="self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-lg font-extrabold tabular-nums leading-none"
                style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
              >
                {item.return_7d_pct != null && item.return_7d_pct > 0 ? "▲" : item.return_7d_pct != null && item.return_7d_pct < 0 ? "▼" : ""}
                {fmtSigned(item.return_7d_pct)}
              </span>
              <span className="text-[0.62rem] font-semibold text-[var(--text-muted)] -mt-1">
                {item.up_days_7d}/{days} days up · 7d
              </span>

              <div className="flex items-baseline justify-between border-t border-[var(--cell-rule)] pt-2 mt-auto">
                <span className="text-[0.58rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">LTP</span>
                <span className="text-sm font-bold tabular-nums text-[var(--text)]">
                  {item.ltp != null ? taka(item.ltp, 1) : "—"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
