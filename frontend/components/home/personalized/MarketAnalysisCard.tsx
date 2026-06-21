import Link from "next/link";
import type { MarketIndexData, DividendsUpcoming, MarketQuality, MarketQuestion } from "@/lib/api";

const CHART_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 3v18h18" />
    <path d="M7 14l3-3 3 3 5-6" />
  </svg>
);

/** Plain-English read on the day's breadth (no jargon). */
function readMood(up: number | null, down: number | null): { text: string; color: string } {
  if (up == null || down == null || up + down === 0) {
    return { text: "See how the whole market is doing today.", color: "var(--text)" };
  }
  const ratio = up / (up + down);
  if (ratio >= 0.58) return { text: "Buyers are in control today.", color: "var(--positive)" };
  if (ratio <= 0.42) return { text: "Sellers are in control today.", color: "var(--negative)" };
  return { text: "An even, mixed market today.", color: "var(--text)" };
}

function Tile({
  href,
  value,
  emoji,
  valueColor,
  label,
}: {
  href: string;
  value: string;
  emoji?: string;
  valueColor: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:shadow-sm"
    >
      <span className="flex items-center gap-1.5 leading-none">
        <span className="font-display text-xl font-extrabold tabular-nums nums" style={{ color: valueColor }}>
          {value}
        </span>
        {emoji && <span className="text-sm">{emoji}</span>}
      </span>
      <span className="mt-1 text-[0.7rem] font-semibold text-[var(--text-muted)] leading-tight">{label}</span>
    </Link>
  );
}

/** Feature card on the logged-in home — a quick "what's the whole market doing"
 *  snapshot that links into the full analysis. Deliberately avoids repeating the
 *  index/value shown by the live-market band directly above it; instead it
 *  surfaces breadth-driven mood + four at-a-glance, deep-linked stats. */
export default function MarketAnalysisCard({
  index,
  dividends,
  quality,
  cheap,
}: {
  index: MarketIndexData | null;
  dividends?: DividendsUpcoming | null;
  /** Strong/good/total company-quality buckets (from /api/market/state). */
  quality?: MarketQuality | null;
  /** The "Are shares cheap or expensive?" Q&A row (from /api/market/state). */
  cheap?: MarketQuestion | null;
}) {
  const mood = readMood(index?.up_count ?? null, index?.down_count ?? null);

  // Are shares cheap? Reuse the market-analysis page's own answer + phrasing.
  const cheapColor =
    cheap?.tone === "pos" ? "var(--positive)" : cheap?.tone === "neg" ? "var(--negative)" : "var(--text)";
  const cheapValue = cheap ? (cheap.a === "About normal" ? "Normal" : cheap.a) : "—";
  const cheapLabel = cheap?.extra || "share prices vs usual";

  // How many companies look healthy = strong + good, of those scored.
  const total = quality?.total ?? 0;
  const healthy = total > 0 ? (quality!.strong + quality!.good) : null;
  // Always a positive (green) number — it's a count of *healthy* companies, so
  // never show it in red even when the share is low.
  const healthyColor = healthy == null ? "var(--text)" : "var(--positive)";

  // Unique companies with a dividend declaration or record date coming up.
  const divCount = new Set(
    [
      ...(dividends?.upcoming_declarations ?? []),
      ...(dividends?.upcoming_record_dates ?? []),
    ].map((d) => d.trading_code.toUpperCase()),
  ).size;

  const turn = index?.turnover_change_pct ?? null;
  const turnStr = turn == null ? "—" : `${turn >= 0 ? "↑" : "↓"} ${Math.abs(turn).toFixed(0)}%`;
  const turnColor =
    turn == null ? "var(--text)" : turn >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className="soft-card overflow-hidden">
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
        <Link
          href="/market-analysis"
          className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--primary)_30%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] px-2.5 py-1 text-[0.68rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] active:scale-95"
        >
          Open
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="px-4 sm:px-5 py-4">
        <h3 className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-tight" style={{ color: mood.color }}>
          {mood.text}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)] leading-snug">
          What&apos;s strong, what&apos;s cheap, and where to look right now.
        </p>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <Tile
            href="/market-analysis"
            value={cheapValue}
            emoji="🏷️"
            valueColor={cheapColor}
            label={cheapLabel}
          />
          <Tile
            href="/market-analysis"
            value={healthy != null ? String(healthy) : "—"}
            emoji="💚"
            valueColor={healthyColor}
            label={total > 0 ? `of ${total} look healthy` : "companies healthy"}
          />
          <Tile
            href="/market-analysis"
            value={String(divCount)}
            emoji="💰"
            valueColor="var(--watch)"
            label="dividends coming up"
          />
          <Tile
            href="/dse-today"
            value={turnStr}
            valueColor={turnColor}
            label="turnover vs last day"
          />
        </div>

        <Link
          href="/market-analysis"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_9%,var(--surface))] py-2.5 text-[0.82rem] font-bold text-[var(--primary)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--primary)_16%,var(--surface))] hover:shadow active:scale-[0.99]"
        >
          Open market analysis
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
