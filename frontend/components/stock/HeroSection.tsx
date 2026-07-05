import Link from "next/link";
import WatchlistButton from "@/components/stock/WatchlistButton";
import AddToPortfolioButton from "@/components/stock/AddToPortfolioButton";
import PriceAlertButton from "@/components/stock/PriceAlertButton";
import { taka, signed } from "@/lib/formatters";
import { range52wInfo } from "@/lib/plain-language";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

// DSE market category, in plain English. Tone mirrors how the score treats it.
const CATEGORY_INFO: Record<string, { note: string; color: string; bg: string; border: string }> = {
  A: {
    note: "Category A — pays regular dividends and holds its yearly meetings on time. The top tier.",
    color: "var(--positive)", bg: "rgba(21,128,61,0.08)", border: "rgba(21,128,61,0.3)",
  },
  B: {
    note: "Category B — pays small or irregular dividends. Not the top tier.",
    color: "var(--watch)", bg: "rgba(180,83,9,0.08)", border: "rgba(180,83,9,0.3)",
  },
  N: {
    note: "Category N — newly listed company. No dividend track record yet.",
    color: "var(--primary)", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.3)",
  },
  Z: {
    note: "Category Z — hasn't paid dividends or held yearly meetings. Extra risky — be careful.",
    color: "var(--negative)", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.35)",
  },
};

export default function HeroSection({ detail }: Props) {
  const { profile, latest_price, score_row } = detail;
  const code = profile.trading_code;
  const staleData = score_row?.stale_data === true || score_row?.stale_data === "true";
  const lastReportedYear = score_row?.last_reported_year as number | null | undefined;
  const dataAgeYears = score_row?.data_age_years as number | null | undefined;

  const ltp = latest_price.ltp;
  const chg = latest_price.change_pct;
  const isPositive = chg != null && chg > 0;
  const isNegative = chg != null && chg < 0;

  const changeColor = chg == null ? "var(--text-muted)" : isPositive ? "var(--positive)" : isNegative ? "var(--negative)" : "var(--text-muted)";
  const changeBg     = chg == null ? "rgba(100,116,139,0.1)" : isPositive ? "rgba(21,128,61,0.1)" : isNegative ? "rgba(220,38,38,0.1)" : "rgba(100,116,139,0.1)";
  const changeBorder = chg == null ? "rgba(100,116,139,0.25)" : isPositive ? "rgba(21,128,61,0.35)"  : isNegative ? "rgba(220,38,38,0.35)"  : "rgba(100,116,139,0.25)";

  const range = range52wInfo(ltp, latest_price.w52_high, latest_price.w52_low);
  const rangeColor =
    range?.tone === "high" ? "var(--positive)" :
    range?.tone === "low"  ? "var(--negative)" : "var(--safe-buy)";

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
        <ol className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <li><Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li><Link href="/dsestockranking" className="hover:text-[var(--primary)] transition-colors">Rankings</Link></li>
          <li aria-hidden="true" className="opacity-40">/</li>
          <li aria-current="page" className="text-[var(--primary)] font-semibold">{code}</li>
        </ol>
      </nav>

      <div
        className="relative rounded-3xl overflow-hidden mb-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 40px rgba(15,23,42,0.08), 0 0 60px rgba(37,99,235,0.04)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "1px",
            background: "linear-gradient(90deg, transparent 0%, rgba(37,99,235,0.4) 50%, transparent 100%)",
          }}
        />

        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-6">

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">

              <div className="flex-1 min-w-0">
                {profile.company_name && (
                  <h1
                    className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] mb-3"
                    style={{ color: "var(--text)" }}
                  >
                    {profile.company_name}
                  </h1>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1 rounded-full"
                    style={{ background: "rgba(37,99,235,0.1)", color: "var(--primary)", border: "1px solid rgba(37,99,235,0.3)" }}
                  >
                    {code}
                  </span>
                  {profile.sector && (
                    <span
                      className="text-xs font-semibold px-3 py-1 rounded-full"
                      style={{ color: "var(--np-cautious)", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)" }}
                    >
                      {profile.sector}
                    </span>
                  )}
                  {categoryInfo && (
                    <span
                      title={categoryInfo.note}
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full cursor-help"
                      style={{
                        color: categoryInfo.color,
                        background: categoryInfo.bg,
                        border: `1px solid ${categoryInfo.border}`,
                      }}
                    >
                      {category === "Z" && <span aria-hidden="true">⚠️</span>}
                      Category {category}
                    </span>
                  )}
                  {staleData && lastReportedYear != null && (
                    <span
                      title="Score penalized — financials haven't been updated in 2+ years"
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1 rounded-full"
                      style={{
                        color: "var(--watch)",
                        background: "rgba(180,83,9,0.1)",
                        border: "1px solid rgba(180,83,9,0.35)",
                      }}
                    >
                      <span aria-hidden="true">⚠️</span>
                      Last reported: {lastReportedYear}
                      {dataAgeYears != null && dataAgeYears >= 2 ? ` — ${dataAgeYears}y stale` : ""}
                    </span>
                  )}
                  <WatchlistButton code={code} className="ml-1" />
                  <AddToPortfolioButton code={code} ltp={ltp} />
                  <PriceAlertButton
                    code={code}
                    ltp={ltp}
                    w52High={latest_price.w52_high}
                    w52Low={latest_price.w52_low}
                  />
                </div>
              </div>

              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "var(--text-muted)" }}>
                  Last Price
                </p>
                <div className="flex items-baseline gap-3 sm:justify-end">
                  <span
                    className="font-black tabular-nums leading-none tracking-tight"
                    style={{
                      color: "var(--text)",
                      fontSize: "clamp(3rem, 9vw, 4.5rem)",
                    }}
                  >
                    {ltp != null ? ltp.toFixed(1) : "--"}
                  </span>
                  <span className="text-xl sm:text-2xl font-semibold" style={{ color: "var(--text-muted)" }}>৳</span>
                </div>
                {chg != null && (
                  <span
                    className="inline-flex items-center gap-1.5 mt-3 text-base font-bold px-4 py-1.5 rounded-full"
                    style={{ color: changeColor, background: changeBg, border: `1px solid ${changeBorder}` }}
                  >
                    <span aria-hidden="true">{isPositive ? "▲" : isNegative ? "▼" : "—"}</span>
                    {signed(chg)}% today
                  </span>
                )}
                {busyLabel && (
                  <div className="mt-2">
                    <span
                      className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                      title="Compared with its average over the previous 7 trading days"
                      style={{
                        color: "var(--watch)",
                        background: "rgba(180,83,9,0.08)",
                        border: "1px solid rgba(180,83,9,0.3)",
                      }}
                    >
                      <span aria-hidden="true">🔥</span>
                      {busyLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {range && latest_price.w52_high != null && latest_price.w52_low != null && (
              <div className="pt-2">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-2 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  <span className="tabular-nums">Low {taka(latest_price.w52_low, 1)}</span>
                  <span className="text-center" style={{ color: rangeColor, fontWeight: 700 }}>{range.caption}</span>
                  <span className="tabular-nums">High {taka(latest_price.w52_high, 1)}</span>
                </div>
                <div
                  className="relative h-2 rounded-full"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full"
                    style={{
                      left: `${range.position * 100}%`,
                      width: "14px",
                      height: "14px",
                      background: rangeColor,
                      boxShadow: `0 0 0 3px var(--surface), 0 0 12px ${rangeColor}`,
                    }}
                  />
                </div>
                <p className="text-xs mt-2 text-center sm:text-left" style={{ color: "var(--text-muted)" }}>
                  Where today's price sits in its 52-week range
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
}
