import Link from "next/link";
import { STOCK_LISTS } from "@/lib/stock-lists";
import { getGuide, type Guide } from "@/lib/guides";
import { crore } from "@/lib/formatters";
import type { Top20Item, MarketIndexData, MarketMoversData } from "@/lib/api";

const INSIGHT_PICKS = STOCK_LISTS.filter((l) => l.insightMode === true).slice(0, 6);

// Featured guides for the homepage blog preview — diverse, high-appeal entry points.
const FEATURED_GUIDE_SLUGS = ["how-to-start-investing", "apply-for-ipo", "fundamental-analysis"];
const FEATURED_GUIDES: Guide[] = FEATURED_GUIDE_SLUGS
  .map((slug) => getGuide(slug))
  .filter((g): g is Guide => g !== undefined);

function chgColor(val: number | null | undefined) {
  if (val == null) return "var(--text-muted)";
  if (val > 0) return "var(--positive)";
  if (val < 0) return "var(--negative)";
  return "var(--text-muted)";
}

function fmtSigned(val: number | null | undefined, decimals = 1) {
  if (val == null) return "—";
  return `${val > 0 ? "+" : ""}${val.toFixed(decimals)}%`;
}

/** Small colored eyebrow chip — matches the showcase tool-chip language. */
function CardEyebrow({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[0.68rem] font-extrabold uppercase tracking-[0.12em]"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 28%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

const CARD =
  "group flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm transition hover:shadow-md";

export default function ExploreMore({
  top20,
  totalStocks,
  index,
}: {
  top20: Top20Item[];
  totalStocks: number;
  index: MarketIndexData | null;
  movers: MarketMoversData | null;
}) {
  const top3 = top20.slice(0, 3);

  return (
    <section aria-label="Explore more of TopStockBD" className="flex flex-col">
      {/* Section header — same language as the showcase */}
      <div className="flex flex-col items-center text-center mb-8 sm:mb-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-8 sm:w-14" style={{ background: "linear-gradient(90deg, transparent, var(--primary))" }} />
          <span
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-[0.2em] text-white shadow-md"
            style={{
              background: "linear-gradient(100deg, var(--primary), var(--np-cautious))",
              boxShadow: "0 6px 20px -6px color-mix(in srgb, var(--primary) 60%, transparent)",
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            More from TopStockBD
          </span>
          <span className="h-px w-8 sm:w-14" style={{ background: "linear-gradient(90deg, var(--np-cautious), transparent)" }} />
        </div>
        <h2 className="font-display text-[clamp(1.8rem,5.5vw,2.75rem)] font-extrabold tracking-tight text-[var(--text)] leading-[1.08] max-w-2xl">
          Explore the{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--np-cautious) 70%, var(--positive))" }}
          >
            whole market
          </span>
        </h2>
        <p className="mt-3 text-[var(--text-muted)] max-w-md">
          Top movers, every listed stock, market analysis, ready-made stock lists and free guides — all in one place.
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-4 sm:gap-5">
        {/* Stock Insights — tall feature card */}
        <Link
          href="/stock-insights"
          className={`${CARD} md:col-span-2 md:row-span-2 hover:border-[color-mix(in_srgb,var(--np-cautious)_40%,var(--border))]`}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <CardEyebrow label="Stock Lists" color="var(--np-cautious)" />
            <span className="text-xs font-semibold text-[var(--np-cautious)] opacity-0 group-hover:opacity-100 transition-opacity">
              View all →
            </span>
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] leading-tight">
            Curated stock ideas, ready to explore
          </h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Hand-built lists — top dividends, highest EPS, most profitable and more.
          </p>

          <div className="mt-4 flex flex-col divide-y divide-[var(--cell-rule)]">
            {INSIGHT_PICKS.map((list) => (
              <div key={list.slug} className="flex items-start gap-3 py-2.5">
                <span className="text-xl leading-none mt-0.5 shrink-0" aria-hidden="true">{list.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text)] leading-snug group-hover:text-[var(--np-cautious)] transition-colors line-clamp-1">
                    {list.shortName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed line-clamp-1">
                    {list.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--np-cautious)]">
            Explore all stock lists →
          </span>
        </Link>

        {/* DSE Today — live market snapshot teaser */}
        <Link
          href="/dse-today"
          className={`${CARD} md:col-span-2 hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]`}
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <CardEyebrow label="DSE Today" color="var(--primary)" />
            <span className="text-xs font-semibold text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-opacity">
              Open →
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-3">
            {/* DSEX */}
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">DSEX</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-[1.7rem] font-extrabold tabular-nums nums text-[var(--text)] leading-none">
                  {index?.dsex != null ? Math.round(index.dsex).toLocaleString() : "—"}
                </span>
                <span className="text-sm font-bold tabular-nums nums" style={{ color: chgColor(index?.dsex_change_pct) }}>
                  {fmtSigned(index?.dsex_change_pct, 2)}
                </span>
              </div>
            </div>

            {/* Traded today (turnover) */}
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-bold uppercase tracking-wide text-[var(--text-muted)]">Traded today</span>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl sm:text-[1.7rem] font-extrabold tabular-nums nums text-[var(--text)] leading-none">
                  {index?.total_value_mn != null ? crore(index.total_value_mn) : "—"}
                </span>
                <span className="text-sm font-bold tabular-nums nums" style={{ color: chgColor(index?.turnover_change_pct) }}>
                  {fmtSigned(index?.turnover_change_pct, 1)}
                </span>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
            Today&apos;s market at a glance — plus all the latest news and top movers, refreshed every trading day.
          </p>

          <span className="mt-auto pt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--primary)]">
            See DSE Today →
          </span>
        </Link>

        {/* DSE Top 20 — small card */}
        <Link
          href="/dse-top-20"
          className={`${CARD} hover:border-[color-mix(in_srgb,var(--positive)_45%,var(--border))]`}
        >
          <CardEyebrow label="DSE Top 20" color="var(--positive)" />
          <p className="mt-3 text-sm font-semibold text-[var(--text)] leading-snug">This week&apos;s top movers</p>
          <div className="mt-2 flex flex-col divide-y divide-[var(--cell-rule)]">
            {top3.map((item) => {
              const color = chgColor(item.return_7d_pct);
              return (
                <div key={item.trading_code} className="flex items-center gap-2 py-1.5">
                  <span className="text-[0.62rem] font-extrabold tabular-nums nums text-[var(--text-muted)] w-3 shrink-0">{item.rank}</span>
                  <span className="ticker-tag text-[0.74rem]">{item.trading_code}</span>
                  <span className="ml-auto text-sm font-extrabold tabular-nums nums" style={{ color }}>
                    {item.return_7d_pct != null && item.return_7d_pct > 0 ? "▲ " : item.return_7d_pct != null && item.return_7d_pct < 0 ? "▼ " : ""}
                    {fmtSigned(item.return_7d_pct)}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--positive)]">
            See Top 20 →
          </span>
        </Link>

        {/* Browse all stocks — small card */}
        <Link
          href="/stocks"
          className={`${CARD} hover:border-[color-mix(in_srgb,var(--watch)_45%,var(--border))]`}
        >
          <CardEyebrow label="Browse Stocks" color="var(--watch)" />
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-extrabold tabular-nums nums text-[var(--text)] leading-none">
              {totalStocks}
            </span>
            <span className="text-sm font-semibold text-[var(--text-muted)]">stocks, A–Z</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["Banks", "Pharma", "Telecom", "Fuel & Power", "Cement", "IT"].map((label) => (
              <span
                key={label}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-[0.7rem] font-semibold text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)]"
              >
                {label}
              </span>
            ))}
          </div>
          <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--watch)]">
            Browse all →
          </span>
        </Link>

        {/* Learn / Guides — full-width blog preview */}
        <div className="flex flex-col rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6 shadow-sm md:col-span-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <CardEyebrow label="Free Guides" color="var(--primary)" />
            <Link
              href="/learn"
              className="text-xs font-semibold text-[var(--primary)] hover:underline"
            >
              Browse all guides →
            </Link>
          </div>

          <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--text)] leading-tight">
            New to investing? Start with the basics
          </h3>
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">
            Simple guides in plain words — from opening your first account to reading a company&apos;s numbers.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FEATURED_GUIDES.map((g) => (
              <Link
                key={g.slug}
                href={`/learn/${g.slug}`}
                prefetch={false}
                className="group/guide flex items-start gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-2)] p-3 transition hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-[var(--surface)]"
              >
                <span className="text-xl leading-none mt-0.5 shrink-0" aria-hidden="true">{g.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--text)] leading-snug line-clamp-2 transition-colors group-hover/guide:text-[var(--primary)]">
                    {g.title}
                  </span>
                  <span className="mt-1 block text-[0.7rem] font-medium text-[var(--text-muted)]">
                    {g.readTime}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
