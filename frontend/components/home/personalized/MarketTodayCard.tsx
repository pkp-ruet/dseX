import Link from "next/link";
import type {
  MarketIndexData,
  DividendsUpcoming,
  MarketQuality,
  MarketQuestion,
  MarketMood,
  MarketSinceYesterday,
  MarketStats,
} from "@/lib/api";
import { signed } from "@/lib/formatters";
import DashHeader from "@/components/home/personalized/DashHeader";
import { IconChevron } from "@/components/home/personalized/DashIcons";

const MARKET_HREF = "/market-analysis";

function num(v: number | null | undefined, d = 2): string {
  if (v == null) return "--";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

const MOOD_COLOR: Record<MarketMood["tone"], string> = {
  up: "var(--positive)",
  down: "var(--negative)",
  weak: "var(--warm-ink)",
  steady: "var(--text)",
};

/**
 * The card's headline. Prefers the Market Analysis page's own verdict (the
 * backend mood — four bands, not just today's breadth) so the dashboard and the
 * page never disagree. Falls back to a plain breadth read while the bundle is
 * still loading or when it failed.
 */
function headline(mood: MarketMood | null | undefined, index: MarketIndexData | null): { text: string; color: string } {
  if (mood?.label) {
    const l = mood.label.toLowerCase();
    return {
      text: l === "steady" ? "The market is steady today." : `The market is ${l} today.`,
      color: MOOD_COLOR[mood.tone] ?? "var(--text)",
    };
  }
  const up = index?.up_count ?? null;
  const down = index?.down_count ?? null;
  if (up == null || down == null || up + down === 0) {
    return { text: "See how the whole market is doing today.", color: "var(--text)" };
  }
  const ratio = up / (up + down);
  if (ratio >= 0.58) return { text: "Buyers are in control today.", color: "var(--positive)" };
  if (ratio <= 0.42) return { text: "Sellers are in control today.", color: "var(--negative)" };
  return { text: "An even, mixed market today.", color: "var(--text)" };
}

/** One "since yesterday" sentence — the freshest hook the page has, so it's
 *  the line that earns the tap through. Breadth rank first, then the healthy
 *  count, then the index move. Null when there is nothing to say. */
function sinceLine(since: MarketSinceYesterday | null | undefined, stats: MarketStats | null | undefined): string | null {
  if (!since) return null;
  const br = since.breadth_rank;
  if (br && br.of >= 3) {
    return br.better_than >= br.of / 2
      ? `More shares rose today than on ${br.better_than} of the last ${br.of} days.`
      : `Fewer shares rose today than on ${br.of - br.better_than} of the last ${br.of} days.`;
  }
  if (since.healthy_delta) {
    const n = Math.abs(since.healthy_delta);
    return `${n} ${n === 1 ? "company" : "companies"} ${since.healthy_delta > 0 ? "more" : "fewer"} look healthy than yesterday.`;
  }
  const chg = stats?.dsex_change_pct;
  if (chg != null && Math.abs(chg) >= 0.05) {
    return `The index is ${chg > 0 ? "up" : "down"} ${Math.abs(chg).toFixed(1)}% since yesterday.`;
  }
  return null;
}

function IndexStat({ label, value, change }: { label: string; value: number | null; change: number | null }) {
  const up = (change ?? 0) >= 0;
  const color = change == null ? "var(--text-muted)" : up ? "var(--positive)" : "var(--negative)";
  return (
    <div className="flex flex-col">
      <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">{label}</span>
      <span className="text-lg sm:text-xl font-extrabold tabular-nums text-[var(--text)] leading-tight">{num(value)}</span>
      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
        {change == null ? "--" : `${up ? "▲" : "▼"} ${signed(change)}`}
      </span>
    </div>
  );
}

function Tile({
  href,
  value,
  valueColor,
  label,
}: {
  href: string;
  value: string;
  valueColor: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:shadow-sm active:bg-[var(--surface-2)]"
    >
      <span className="font-display text-xl font-extrabold tabular-nums nums leading-none" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="mt-1 text-[0.75rem] font-semibold text-[var(--text-muted)] leading-tight">{label}</span>
    </Link>
  );
}

/**
 * One "Market today" card for the logged-in home — and, since 2026-09-12, the
 * front door to `/market-analysis`:
 *
 *  • the headline is the backend mood (the page's own verdict), not a local
 *    breadth guess — the two can no longer disagree;
 *  • the ONE header link goes to Market Analysis ("Full picture"); the index
 *    row is the link to DSE Today, where those numbers live;
 *  • a "Since yesterday" line under the tiles changes daily and links through.
 *
 * The old pulsing "live" dot and footer button stay cut — the greeting's
 * MarketStatusPill is the one honest live cue on the page.
 */
export default function MarketTodayCard({
  index,
  dividends,
  mood,
  since,
  stats,
  quality,
  cheap,
}: {
  index: MarketIndexData | null;
  dividends?: DividendsUpcoming | null;
  /** The market-analysis verdict (from /api/market/state). */
  mood?: MarketMood | null;
  /** What changed vs the previous trading day (from /api/market/state). */
  since?: MarketSinceYesterday | null;
  stats?: MarketStats | null;
  /** Strong/good/total company-quality buckets (from /api/market/state). */
  quality?: MarketQuality | null;
  /** The "Are shares cheap or expensive?" Q&A row (from /api/market/state). */
  cheap?: MarketQuestion | null;
}) {
  const head = headline(mood, index);
  const line = sinceLine(since, stats);

  const up = index?.up_count ?? 0;
  const down = index?.down_count ?? 0;
  const flat = index?.neutral_count ?? 0;
  const breadthTotal = up + down + flat;

  // Are shares cheap? Reuse the market-analysis page's own answer + phrasing.
  const cheapColor =
    cheap?.tone === "pos" ? "var(--positive)" : cheap?.tone === "neg" ? "var(--negative)" : "var(--text)";
  const cheapValue = cheap ? (cheap.a === "About normal" ? "Normal" : cheap.a) : "—";
  const cheapLabel = cheap?.extra || "share prices vs usual";

  // How many companies look healthy = strong + good, of those scored. Always
  // green — it's a count of healthy companies, never shown in red.
  const total = quality?.total ?? 0;
  const healthy = total > 0 ? quality!.strong + quality!.good : null;
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
  const turnColor = turn == null ? "var(--text)" : turn >= 0 ? "var(--positive)" : "var(--negative)";

  return (
    <section className="soft-card overflow-hidden">
      <DashHeader title="Market today" href={MARKET_HREF} linkLabel="Full picture" />

      <div className="px-4 sm:px-5 py-4">
        <h3
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-tight"
          style={{ color: head.color }}
        >
          {head.text}
        </h3>

        {index && (
          <Link
            href="/dse-today"
            prefetch={false}
            aria-label="Today's index levels on DSE Today"
            className="mt-3.5 -mx-2 grid grid-cols-3 gap-4 rounded-xl px-2 py-1.5 transition-colors hover:bg-[var(--surface-2)] active:bg-[var(--surface-2)]"
          >
            <IndexStat label="DSEX" value={index.dsex} change={index.dsex_change} />
            <IndexStat label="DSES" value={index.dses} change={index.dses_change} />
            <IndexStat label="DS30" value={index.ds30} change={index.ds30_change} />
          </Link>
        )}

        {breadthTotal > 0 && (
          <div className="mt-4">
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-[var(--surface-2)]">
              <span className="h-full bg-[var(--positive)]" style={{ width: `${(up / breadthTotal) * 100}%` }} />
              <span className="h-full bg-[var(--text-muted)]" style={{ width: `${(flat / breadthTotal) * 100}%` }} />
              <span className="h-full bg-[var(--negative)]" style={{ width: `${(down / breadthTotal) * 100}%` }} />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs font-semibold tabular-nums">
              <span className="text-[var(--positive)]">{up} advancing</span>
              <span className="text-[var(--text-muted)]">{flat} unchanged</span>
              <span className="text-[var(--negative)]">{down} declining</span>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <Tile href={MARKET_HREF} value={cheapValue} valueColor={cheapColor} label={cheapLabel} />
          <Tile
            href={MARKET_HREF}
            value={healthy != null ? String(healthy) : "—"}
            valueColor={healthyColor}
            label={total > 0 ? `of ${total} look healthy` : "companies healthy"}
          />
          <Tile href="/dividend-calendar" value={String(divCount)} valueColor="var(--watch)" label="dividends coming up" />
          <Tile href="/dse-today" value={turnStr} valueColor={turnColor} label="turnover vs last day" />
        </div>

        {line && (
          <Link
            href={MARKET_HREF}
            prefetch={false}
            className="mt-3 flex items-center gap-2.5 rounded-xl bg-[var(--surface-2)] px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-2))] active:opacity-80"
          >
            <span className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
              Since yesterday
            </span>
            <span className="min-w-0 flex-1 text-[0.75rem] font-semibold leading-snug text-[var(--text)]">{line}</span>
            <span className="shrink-0 text-[var(--primary)]" aria-hidden>
              <IconChevron size={14} />
            </span>
          </Link>
        )}
      </div>
    </section>
  );
}
