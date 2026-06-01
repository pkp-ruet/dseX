import Link from "next/link";
import { type ScoreItem, type DividendsUpcoming } from "@/lib/api";
import { analyzeWatchlist, type WatchlistPoint } from "@/lib/watchlist-analysis";

const ICON: Record<WatchlistPoint["kind"], { glyph: string; color: string }> = {
  gainer: { glyph: "▲", color: "var(--positive)" },
  loser: { glyph: "▼", color: "var(--negative)" },
  dividend: { glyph: "৳", color: "var(--watch)" },
};

const TONE_COLOR: Record<"positive" | "negative" | "neutral", string> = {
  positive: "var(--positive)",
  negative: "var(--negative)",
  neutral: "var(--text)",
};

/** Daily watchlist digest: headline move + 3 key points (movers + dividends). */
export default function WatchlistSummaryCard({
  codes,
  priceMap,
  dividends,
}: {
  codes: string[];
  priceMap: Map<string, ScoreItem>;
  dividends: DividendsUpcoming | null;
}) {
  const summary = analyzeWatchlist(codes, priceMap, dividends);
  if (!summary) return null;

  const up = summary.avgChange != null && summary.avgChange >= 0;

  return (
    <section className="soft-card overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--border)]">
        <h2 className="text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--text)]">
          ★ Today&apos;s Watchlist Summary
        </h2>
        <Link href="/watchlist" className="text-xs font-semibold text-[var(--primary)] hover:underline">
          View all →
        </Link>
      </div>

      <div className="px-4 sm:px-5 py-4">
        {/* Headline: average move today */}
        <div className="flex items-baseline gap-2.5 flex-wrap">
          {summary.avgChange != null ? (
            <span
              className="font-display text-2xl sm:text-[1.6rem] font-bold tabular-nums leading-none"
              style={{ color: TONE_COLOR[summary.tone] }}
            >
              {up ? "▲" : "▼"} {up ? "+" : ""}
              {summary.avgChange.toFixed(2)}%
            </span>
          ) : (
            <span className="font-display text-lg font-bold text-[var(--text)]">No moves yet today</span>
          )}
          {summary.total > 0 && (
            <span className="text-xs font-semibold text-[var(--text-muted)]">
              {summary.upCount} of {summary.total} advancing
            </span>
          )}
        </div>
        <span className="mt-1 block text-[0.62rem] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
          Avg watchlist move today
        </span>

        {/* Key points */}
        {summary.points.length > 0 && (
          <ul className="mt-3.5 flex flex-col gap-2">
            {summary.points.map((p, i) => {
              const ic = ICON[p.kind];
              return (
                <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--text)]">
                  <span
                    className="shrink-0 mt-0.5 text-xs font-bold leading-none"
                    style={{ color: ic.color }}
                    aria-hidden="true"
                  >
                    {ic.glyph}
                  </span>
                  <span>{p.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
