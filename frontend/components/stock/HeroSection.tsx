import Link from "next/link";
import WatchlistButton from "@/components/stock/WatchlistButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import PriceAlertButton from "@/components/stock/PriceAlertButton";
import ShareButton from "@/components/stock/ShareButton";
import CategoryChip from "@/components/stock/CategoryChip";
import YourPosition from "@/components/stock/YourPosition";
import { StockLangToggle } from "@/components/stock/LangToggle";
import { IconAlert, IconFlame } from "@/components/stock/StockIcons";
import { taka, signed } from "@/lib/formatters";
import { range52wInfo } from "@/lib/plain-language";
import { sectorSlug } from "@/lib/sector";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

/** Token-tinted chip colours (CategoryChip takes raw CSS colour strings). */
const tint = (token: string, pct: number) => `color-mix(in srgb, var(--${token}) ${pct}%, transparent)`;

// DSE market category, in plain English. Tone mirrors how the score treats it.
const CATEGORY_INFO: Record<string, { note: string; color: string; bg: string; border: string }> = {
  A: {
    note: "Category A — pays regular dividends and holds its yearly meetings on time. The top tier.",
    color: "var(--positive)", bg: tint("positive", 8), border: tint("positive", 30),
  },
  B: {
    note: "Category B — pays small or irregular dividends. Not the top tier.",
    color: "var(--watch)", bg: tint("watch", 8), border: tint("watch", 30),
  },
  N: {
    note: "Category N — newly listed company. No dividend track record yet.",
    color: "var(--primary-ink)", bg: tint("primary", 8), border: tint("primary", 30),
  },
  Z: {
    note: "Category Z — hasn't paid dividends or held yearly meetings. Extra risky — be careful.",
    color: "var(--negative)", bg: tint("negative", 8), border: tint("negative", 35),
  },
};

export default function HeroSection({ detail }: Props) {
  const { profile, latest_price, score_row } = detail;
  const code = profile.trading_code;
  const staleData = score_row?.stale_data === true || score_row?.stale_data === "true";
  const lastReportedYear = score_row?.last_reported_year as number | null | undefined;
  const dataAgeYears = score_row?.data_age_years as number | null | undefined;
  const score = (score_row?.score as number | null | undefined) ?? null;

  const ltp = latest_price.ltp;
  const chg = latest_price.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;

  const changeCls =
    chg == null
      ? "text-text-muted bg-text-muted/10 border-text-muted/25"
      : isPositive
        ? "text-positive bg-positive/10 border-positive/30"
        : isNegative
          ? "text-negative bg-negative/10 border-negative/30"
          : "text-text-muted bg-text-muted/10 border-text-muted/25";

  const range = range52wInfo(ltp, latest_price.w52_high, latest_price.w52_low);
  const rangeTextCls =
    range?.tone === "high" ? "text-positive" : range?.tone === "low" ? "text-negative" : "text-info";
  const rangeDotCls =
    range?.tone === "high" ? "bg-positive" : range?.tone === "low" ? "bg-negative" : "bg-info";

  const category = (profile.market_category ?? "").trim().toUpperCase();
  const categoryInfo = CATEGORY_INFO[category];

  // "Unusually busy" chip: today's volume vs the average of the prior 7 traded days.
  const vol = latest_price.volume;
  const avgVol = latest_price.avg_volume_7d;
  const volRatio = vol != null && avgVol != null && avgVol > 0 && vol > 0 ? vol / avgVol : null;
  const busyLabel =
    volRatio != null && volRatio >= 2
      ? `Traded ${volRatio >= 10 ? Math.round(volRatio) : volRatio.toFixed(1)}× its usual volume today`
      : null;

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-1 text-xs text-text-muted">
          <li><Link href="/" className="inline-flex items-center min-h-10 hover:text-primary transition-colors">Home</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li><Link href="/dsestockranking" className="inline-flex items-center min-h-10 hover:text-primary transition-colors">Rankings</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li aria-current="page" className="font-semibold text-text-main">{code}</li>
        </ol>
      </nav>

      <div className="relative rounded-3xl overflow-hidden mb-8 bg-surface border border-border shadow-soft">
        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-6">

            {/* Identity row: name + chips + actions (left), language toggle then price (right) */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">

              <div className="flex-1 min-w-0">
                {/* Name and the page-wide EN / বাংলা switch share the top line; on a phone the
                    switch sits top-right and the name wraps beside it. */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  {profile.company_name && (
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight break-words text-text-main">
                      {profile.company_name}
                    </h1>
                  )}
                  <StockLangToggle size="sm" className="shrink-0 sm:hidden" />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full bg-primary/10 text-primary-ink border border-primary/30">
                    {code}
                  </span>
                  {profile.sector && (
                    <Link
                      href={`/sector/${sectorSlug(profile.sector)}`}
                      prefetch={false}
                      title={`See every ${profile.sector} company`}
                      className="inline-flex items-center text-xs font-semibold px-3 py-1 rounded-full text-watch bg-watch/10 border border-watch/25 transition-opacity hover:opacity-80"
                    >
                      {profile.sector} →
                    </Link>
                  )}
                  {categoryInfo && (
                    <CategoryChip
                      category={category}
                      note={categoryInfo.note}
                      color={categoryInfo.color}
                      bg={categoryInfo.bg}
                      border={categoryInfo.border}
                    />
                  )}
                  {staleData && lastReportedYear != null && (
                    <span
                      title="Score penalized — financials haven't been updated in 2+ years"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full text-watch bg-watch/10 border border-watch/30"
                    >
                      <IconAlert size={12} />
                      Last reported: {lastReportedYear}
                      {dataAgeYears != null && dataAgeYears >= 2 ? ` — ${dataAgeYears}y stale` : ""}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <WatchlistButton code={code} />
                  <AddToPortfolioButton code={code} ltp={ltp} />
                  <PriceAlertButton
                    code={code}
                    ltp={ltp}
                    w52High={latest_price.w52_high}
                    w52Low={latest_price.w52_low}
                  />
                  <ShareButton code={code} companyName={profile.company_name} score={score} ltp={ltp} />
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0 sm:flex sm:flex-col sm:items-end">
                {/* From sm up the switch is the top-right corner of the card */}
                <StockLangToggle size="sm" className="hidden sm:inline-flex mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest mb-2 text-text-muted">
                  Last Price
                </p>
                <div className="flex items-baseline gap-3 sm:justify-end">
                  <span className="text-5xl font-black tabular-nums leading-none tracking-tight text-text-main">
                    {ltp != null ? ltp.toFixed(1) : "--"}
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold text-text-muted">৳</span>
                </div>
                {chg != null && (
                  <span className={`inline-flex items-center gap-1.5 mt-3 text-base font-bold px-4 py-1.5 rounded-full border ${changeCls}`}>
                    <span aria-hidden="true">{isPositive ? "▲" : isNegative ? "▼" : "—"}</span>
                    {signed(chg)}% today
                  </span>
                )}
                {busyLabel && (
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full text-watch bg-watch/10 border border-watch/30"
                      title="Compared with its average over the previous 7 trading days"
                    >
                      <IconFlame size={12} />
                      {busyLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {range && latest_price.w52_high != null && latest_price.w52_low != null && (
              <div className="pt-2">
                {/* Grid, not justify-between: at 360px the caption wraps in the middle
                    cell while Low / High stay pinned to the bar's two ends. */}
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 mb-2 text-xs font-medium text-text-muted">
                  <span className="tabular-nums whitespace-nowrap">Low {taka(latest_price.w52_low, 1)}</span>
                  <span className={`text-center leading-tight font-bold ${rangeTextCls}`}>{range.caption}</span>
                  <span className="tabular-nums whitespace-nowrap">High {taka(latest_price.w52_high, 1)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-surface-2 border border-border">
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full w-3.5 h-3.5 ring-[3px] ring-surface ${rangeDotCls}`}
                    style={{ left: `${range.position * 100}%` }}
                  />
                </div>
                <p className="text-xs mt-2 text-center sm:text-left text-text-muted">
                  Where today&apos;s price sits in its 52-week range
                </p>
              </div>
            )}

            {/* The reader's own stake — renders only for a signed-in holder / watcher */}
            <YourPosition code={code} ltp={ltp} />

          </div>
        </div>
      </div>
    </>
  );
}
