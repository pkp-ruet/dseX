import Link from "next/link";
import { type MarketIndexData, type MarketMoverItem } from "@/lib/api";
import { signed } from "@/lib/formatters";

function num(v: number | null | undefined, d = 2): string {
  if (v == null) return "--";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

function IndexStat({ label, value, change }: { label: string; value: number | null; change: number | null }) {
  const up = (change ?? 0) >= 0;
  const color = change == null ? "var(--text-muted)" : up ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex flex-col">
      <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <span className="text-lg sm:text-xl font-extrabold tabular-nums text-[var(--text)] leading-tight">{num(value)}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {change == null ? "--" : `${up ? "▲" : "▼"} ${signed(change)}`}
      </span>
    </div>
  );
}

export default function LiveMarketBand({
  index,
  gainers,
}: {
  index: MarketIndexData;
  gainers: MarketMoverItem[];
}) {
  const up = index.up_count ?? 0;
  const down = index.down_count ?? 0;
  const flat = index.neutral_count ?? 0;
  const total = Math.max(up + down + flat, 1);
  const topGainers = gainers.slice(0, 3);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_4px_16px_rgba(15,23,42,0.05)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-3.5">
        <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--text)]">
          Live Market
        </span>
        <span className="text-[0.66rem] text-[var(--text-muted)]">· Dhaka Stock Exchange</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 px-4 sm:px-5 py-4">
        {/* Indices + breadth */}
        <div>
          <div className="grid grid-cols-3 gap-4">
            <IndexStat label="DSEX" value={index.dsex} change={index.dsex_change} />
            <IndexStat label="DSES" value={index.dses} change={index.dses_change} />
            <IndexStat label="DS30" value={index.ds30} change={index.ds30_change} />
          </div>

          <div className="mt-4">
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-[var(--surface-2)]">
              <span className="h-full bg-[var(--positive)]" style={{ width: `${(up / total) * 100}%` }} />
              <span className="h-full bg-[var(--text-muted)]" style={{ width: `${(flat / total) * 100}%` }} />
              <span className="h-full bg-[var(--negative)]" style={{ width: `${(down / total) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold tabular-nums">
              <span className="text-[var(--positive)]">{up} advancing</span>
              <span className="text-[var(--text-muted)]">{flat} unchanged</span>
              <span className="text-[var(--negative)]">{down} declining</span>
            </div>
          </div>
        </div>

        {/* Top gainers */}
        <div className="md:w-56 md:border-l md:border-[var(--border)] md:pl-5 pt-3 md:pt-0 border-t md:border-t-0 border-[var(--border)]">
          <span className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Top Gainers
          </span>
          <div className="mt-2 flex flex-col gap-1.5">
            {topGainers.map((g) => (
              <Link
                key={g.trading_code}
                href={`/stock/${g.trading_code}`}
                className="flex items-center justify-between gap-2 text-sm hover:text-[var(--primary)] transition-colors"
              >
                <span className="font-mono font-bold text-[var(--text)] truncate">{g.trading_code}</span>
                <span className="font-semibold tabular-nums text-[var(--positive)]">
                  {g.change_pct == null ? "--" : `+${g.change_pct.toFixed(2)}%`}
                </span>
              </Link>
            ))}
          </div>
          <Link
            href="/dse-today"
            className="mt-2.5 inline-block text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            DSE Today →
          </Link>
        </div>
      </div>
    </section>
  );
}
