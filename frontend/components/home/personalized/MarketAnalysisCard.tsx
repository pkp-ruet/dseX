import Link from "next/link";
import type { MarketIndexData } from "@/lib/api";

function fmtSigned(v: number | null | undefined, d = 2): string {
  if (v == null) return "—";
  return `${v > 0 ? "+" : ""}${v.toFixed(d)}%`;
}

function chgColor(v: number | null | undefined): string {
  if (v == null) return "var(--text-muted)";
  if (v > 0) return "var(--positive)";
  if (v < 0) return "var(--negative)";
  return "var(--text-muted)";
}

const CHART_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-6" />
  </svg>
);

/** Feature card on the logged-in home — the whole-market view, in plain words.
 *  Styled to sit alongside the live-market band, just before the ranking table. */
export default function MarketAnalysisCard({ index }: { index: MarketIndexData | null }) {
  const up = index?.up_count ?? null;
  const down = index?.down_count ?? null;
  const mood =
    up != null && down != null
      ? down > up
        ? "More shares are falling than rising today."
        : up > down
          ? "More shares are rising than falling today."
          : "The market is fairly even today."
      : "See how the whole market is doing today.";

  return (
    <Link
      href="/market-analysis"
      className="group block soft-card overflow-hidden transition hover:shadow-md hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]"
    >
      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pt-3.5">
        <span className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}
            aria-hidden
          >
            {CHART_ICON}
          </span>
          <span className="text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[var(--text)]">
            Market Analysis
          </span>
        </span>
        <span className="text-xs font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
          Open →
        </span>
      </div>

      <div className="px-4 sm:px-5 py-4">
        <h3 className="font-display text-lg sm:text-xl font-extrabold tracking-tight text-[var(--text)] leading-tight">
          The whole market, in plain words
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)] leading-snug">
          {mood} See what&apos;s strong, what&apos;s cheap, and where to look.
        </p>

        <div className="mt-3.5 flex flex-wrap items-end gap-x-6 gap-y-2">
          <div className="flex flex-col">
            <span className="text-[0.62rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">DSEX</span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-extrabold tabular-nums nums text-[var(--text)] leading-none">
                {index?.dsex != null ? Math.round(index.dsex).toLocaleString() : "—"}
              </span>
              <span className="text-sm font-bold tabular-nums nums" style={{ color: chgColor(index?.dsex_change_pct) }}>
                {fmtSigned(index?.dsex_change_pct)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold tabular-nums nums">
            <span className="text-[var(--positive)]">▲ {index?.up_count ?? "—"}</span>
            <span className="text-[var(--negative)]">▼ {index?.down_count ?? "—"}</span>
            <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              up / down
            </span>
          </div>
        </div>

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]">
          Open market analysis →
        </span>
      </div>
    </Link>
  );
}
