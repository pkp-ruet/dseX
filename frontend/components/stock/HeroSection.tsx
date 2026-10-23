import Link from "next/link";
import WatchlistButton from "@/components/stock/WatchlistButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import PriceAlertButton from "@/components/stock/PriceAlertButton";
import ShareButton from "@/components/stock/ShareButton";
import CategoryChip from "@/components/stock/CategoryChip";
import YourPosition from "@/components/stock/YourPosition";
import { StockLangToggle } from "@/components/stock/LangToggle";
import { IconAlert, IconFlame } from "@/components/stock/StockIcons";
import Chip from "@/components/ui/Chip";
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

      {/* Hero — open on the canvas, no box (2026-10 redesign: space before boxes).
          The price is the biggest thing on the page. */}
      <header id="ch-overview" className="stock-anchor mb-6 flex flex-col gap-5">
        {/* Identity: name + the page-wide EN / বাংলা switch, then quiet chips */}
        <div className="flex items-start justify-between gap-3">
          {profile.company_name && (
            <h1 className="min-w-0 break-words text-2xl font-bold leading-tight tracking-tight text-text-main text-balance sm:text-4xl">
              {profile.company_name}
            </h1>
          )}
          <StockLangToggle size="sm" className="shrink-0" />
        </div>

        <div className="-mt-2 flex flex-wrap items-center gap-2">
          <Chip>{code}</Chip>
          {profile.sector && (
            <Link
              href={`/sector/${sectorSlug(profile.sector)}`}
              prefetch={false}
              title={`See every ${profile.sector} company`}
              className="inline-flex min-h-6 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold text-text-main hover:border-text-muted"
            >
              {profile.sector} <span aria-hidden="true">→</span>
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
            <Chip tone="watch" icon={<IconAlert size={12} />}>
              Last reported {lastReportedYear}
              {dataAgeYears != null && dataAgeYears >= 2 ? ` · ${dataAgeYears} years old` : ""}
            </Chip>
          )}
        </div>

        {/* Price — number first, change under it, coloured text only */}
        <div className="flex flex-col gap-1.5">
          <span className="nums text-4xl font-bold leading-none tracking-tight text-text-main sm:text-5xl">
            {ltp != null ? taka(ltp, 1) : "--"}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {chg != null && (
              <span className={`nums text-base font-bold ${isPositive ? "text-positive" : isNegative ? "text-negative" : "text-text-muted"}`}>
                <span aria-hidden="true">{isPositive ? "▲ " : isNegative ? "▼ " : ""}</span>
                {signed(chg)}% today
              </span>
            )}
            <span className="text-xs font-semibold text-text-muted">Official closing price</span>
          </div>
          {busyLabel && (
            <div className="mt-1">
              <Chip tone="watch" icon={<IconFlame size={12} />}>
                <span title="Compared with its average over the previous 7 trading days">{busyLabel}</span>
              </Chip>
            </div>
          )}
        </div>

        {/* Actions — one quiet row */}
        <div className="flex flex-wrap items-center gap-2">
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

        {range && latest_price.w52_high != null && latest_price.w52_low != null && (
          <div>
            {/* Grid, not justify-between: at 360px the caption wraps in the middle
                cell while Low / High stay pinned to the bar's two ends. */}
            <div className="mb-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-xs font-semibold text-text-muted">
              <span className="nums whitespace-nowrap">Low {taka(latest_price.w52_low, 1)}</span>
              <span className={`text-center font-bold leading-tight ${rangeTextCls}`}>{range.caption}</span>
              <span className="nums whitespace-nowrap">High {taka(latest_price.w52_high, 1)}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-surface-2">
              <div
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-[3px] ring-bg ${rangeDotCls}`}
                style={{ left: `${range.position * 100}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-text-muted">Where today&apos;s price sits in its 52-week range</p>
          </div>
        )}

        {/* The reader's own stake — renders only for a signed-in holder / watcher */}
        <YourPosition code={code} ltp={ltp} />
      </header>
    </>
  );
}
