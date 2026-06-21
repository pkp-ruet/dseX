import Link from "next/link";
import { type MarketIndexData } from "@/lib/api";
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

export default function LiveMarketBand({ index }: { index: MarketIndexData }) {
  const up = index.up_count ?? 0;
  const down = index.down_count ?? 0;
  const flat = index.neutral_count ?? 0;
  const total = Math.max(up + down + flat, 1);

  return (
    <section className="soft-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 sm:px-5 pt-3.5">
        <span className="w-2 h-2 rounded-full bg-[var(--positive)] animate-pulse" />
        <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--text)]">
          Dhaka Stock Exchange
        </span>
        <Link
          href="/dse-today"
          className="ml-auto inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] active:scale-95"
        >
          DSE Today
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="px-4 sm:px-5 py-4">
        {/* Indices + breadth */}
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
    </section>
  );
}
