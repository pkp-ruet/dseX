import Link from "next/link";
import type { MarketIndexData, DividendsUpcoming, MarketQuality, MarketQuestion } from "@/lib/api";
import { signed } from "@/lib/formatters";
import DashHeader from "@/components/home/personalized/DashHeader";

function num(v: number | null | undefined, d = 2): string {
  if (v == null) return "--";
  return v.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}

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

/** One "Market today" card for the logged-in home — merges the old index band
 *  (DSEX/DSES/DS30 + breadth bar) and the market-analysis snapshot (mood
 *  headline + deep-linked tiles) into a single piece of chrome.
 *  Exactly one header link (DSE Today) + the four tiles as links; the old
 *  footer button and pulsing "live" dot were cut — the dot was always green
 *  even when the market was closed, and the greeting's MarketStatusPill is the
 *  one honest live cue on the page. */
export default function MarketTodayCard({
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
      <DashHeader title="Market today" href="/dse-today" linkLabel="DSE Today" />

      <div className="px-4 sm:px-5 py-4">
        <h3
          className="font-display text-lg sm:text-xl font-extrabold tracking-tight leading-tight"
          style={{ color: mood.color }}
        >
          {mood.text}
        </h3>

        {index && (
          <div className="mt-3.5 grid grid-cols-3 gap-4">
            <IndexStat label="DSEX" value={index.dsex} change={index.dsex_change} />
            <IndexStat label="DSES" value={index.dses} change={index.dses_change} />
            <IndexStat label="DS30" value={index.ds30} change={index.ds30_change} />
          </div>
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
          <Tile href="/market-analysis" value={cheapValue} valueColor={cheapColor} label={cheapLabel} />
          <Tile
            href="/market-analysis"
            value={healthy != null ? String(healthy) : "—"}
            valueColor={healthyColor}
            label={total > 0 ? `of ${total} look healthy` : "companies healthy"}
          />
          <Tile href="/dividend-calendar" value={String(divCount)} valueColor="var(--watch)" label="dividends coming up" />
          <Tile href="/dse-today" value={turnStr} valueColor={turnColor} label="turnover vs last day" />
        </div>

      </div>
    </section>
  );
}
