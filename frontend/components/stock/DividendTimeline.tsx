import Link from "next/link";
import type { DividendDeclarationRecord } from "@/lib/api";
import { formatDate, money } from "@/lib/formatters";
import { recordDateInfo, todayDhaka, toDate, isoLocal } from "@/lib/dividend-dates";
import SectionTitle from "@/components/stock/SectionTitle";
import DaysLeft from "@/components/stock/DaysLeft";
import DividendLedger, { type LedgerRow } from "@/components/stock/DividendLedger";
import { IconCalendar } from "@/components/stock/StockIcons";

interface Props {
  code: string;
  rows: DividendDeclarationRecord[];
  faceValue: number | null;
  ltp: number | null;
}

function pctOf(r: DividendDeclarationRecord): { cash: number; stock: number } {
  const cash = r.cash_pct ?? r.dividend_pct ?? 0;
  const stock = r.stock_pct ?? 0;
  return { cash: Number(cash) || 0, stock: Number(stock) || 0 };
}

function periodLabel(r: DividendDeclarationRecord): string {
  const pe = toDate(r.period_end);
  if (pe) return `FY ${pe.getFullYear()}`;
  const d = toDate(r.declaration_date);
  return d ? String(d.getFullYear()) : "—";
}

/**
 * Every dividend this company has declared, newest first, with the one that
 * still has a record date ahead pulled out as a countdown card: how much cash
 * per share, the yield at today's price, the record date, and the last normal-
 * market day to buy (three Bangladesh trading days before — same rule as the
 * dividend calendar). The ledger comes from `/api/company/:code/dividend-history`.
 */
export default function DividendTimeline({ rows, faceValue, ltp }: Props) {
  if (!rows.length) return null;

  const face = faceValue && faceValue > 0 ? faceValue : 10;
  const today = todayDhaka();

  // Soonest declaration whose record date is today or later.
  const upcoming = rows
    .map((r) => ({ r, info: recordDateInfo(r.record_date, today) }))
    .filter((x) => x.info && x.info.recordDaysLeft >= 0)
    .sort((a, b) => a.info!.recordDaysLeft - b.info!.recordDaysLeft)[0] ?? null;

  const sorted = [...rows].sort((a, b) => {
    const da = toDate(a.declaration_date)?.getTime() ?? 0;
    const db = toDate(b.declaration_date)?.getTime() ?? 0;
    return db - da;
  });

  const ledger: LedgerRow[] = sorted.map((r) => ({ r, period: periodLabel(r), ...pctOf(r) }));

  // Quick streak line: distinct fiscal years with any cash dividend.
  const years = new Set<string>();
  const cashYears = new Set<string>();
  for (const row of ledger) {
    if (row.period === "—") continue;
    years.add(row.period);
    if (row.cash > 0) cashYears.add(row.period);
  }
  const streakLine =
    years.size >= 2
      ? `Paid cash in ${cashYears.size} of the last ${years.size} years we have on record.`
      : null;

  return (
    <section id="dividends" className="mb-8 scroll-mt-[112px]">
      <SectionTitle
        title="Dividend Timeline"
        sub={<>{streakLine ?? "Every dividend the company has declared, and the dates that matter if you want the next one."}</>}
        bn="কোম্পানি কবে কত লভ্যাংশ দিয়েছে, আর পরের লভ্যাংশ পেতে কোন তারিখ মনে রাখতে হবে।"
        right={
          <Link href="/dividend-calendar" className="text-xs font-semibold hover:underline whitespace-nowrap" style={{ color: "var(--primary)" }}>
            All record dates →
          </Link>
        }
      />

      {upcoming && upcoming.info && (() => {
        const { r, info } = upcoming;
        const { cash, stock } = pctOf(r);
        const cashPerShare = cash > 0 ? (cash / 100) * face : null;
        const yieldPct = cashPerShare != null && ltp != null && ltp > 0 ? (cashPerShare / ltp) * 100 : null;
        const buyByIso = isoLocal(info.buyBy);
        const recordIso = isoLocal(info.recordDate);
        const spotNow = info.buyDaysLeft < 0;
        const declared =
          cash === 0 && stock === 0
            ? "No dividend"
            : [cash > 0 ? `${cash}% cash` : null, stock > 0 ? `${stock}% bonus` : null].filter(Boolean).join(" + ");
        return (
          <div
            className="rounded-2xl p-4 sm:p-5 mb-4 min-w-0"
            style={{
              background: "color-mix(in srgb, var(--positive) 6%, var(--surface))",
              border: "1px solid color-mix(in srgb, var(--positive) 25%, transparent)",
            }}
          >
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{ width: 28, height: 28, color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}
              >
                <IconCalendar size={15} />
              </span>
              <p className="text-sm font-bold leading-snug min-w-0" style={{ color: "var(--text)" }}>
                Next dividend — record date {formatDate(recordIso)}
              </p>
              <DaysLeft
                date={recordIso}
                className="sm:ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full tabular-nums nums whitespace-nowrap"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>Declared</p>
                <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight break-words" style={{ color: "var(--text)" }}>
                  {declared}
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{r.dividend_type || "Final"} · {periodLabel(r)}</p>
              </div>
              {cashPerShare != null && (
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>Cash per share</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight" style={{ color: "var(--positive)" }}>{money(cashPerShare)}</p>
                  {yieldPct != null && (
                    <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>{yieldPct.toFixed(2)}% of today&apos;s price, before tax</p>
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>Buy by</p>
                <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight" style={{ color: spotNow ? "var(--watch)" : "var(--text)" }}>
                  {formatDate(buyByIso)}
                </p>
                <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {spotNow ? "Spot market now — normal buys no longer qualify" : <DaysLeft date={buyByIso} suffix="left to buy" past="passed" />}
                </p>
              </div>
              {r.agm_date && (
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>AGM</p>
                  <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight" style={{ color: "var(--text)" }}>{formatDate(r.agm_date)}</p>
                  <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Shareholders approve it here</p>
                </div>
              )}
            </div>

            <p className="text-[11px] mt-3 leading-snug" style={{ color: "var(--text-muted)" }}>
              Shares must be in your BO account on the record date. Normal-market trades settle on T+2 and DSE opens a spot window just before, so buying about 3 trading days early is the safe side. Confirm the cut-off with your broker.
            </p>
          </div>
        );
      })()}

      <DividendLedger rows={ledger} face={face} />
    </section>
  );
}
