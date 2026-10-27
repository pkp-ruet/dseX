import Link from "next/link";
import type { DividendDeclarationRecord } from "@/lib/api";
import { formatDate, money } from "@/lib/formatters";
import { recordDateInfo, todayDhaka, toDate, isoLocal } from "@/lib/dividend-dates";
import SectionTitle from "@/components/stock/SectionTitle";
import DaysLeft from "@/components/stock/DaysLeft";
import DividendLedger, { type LedgerRow } from "@/components/stock/DividendLedger";
import { IconCalendar } from "@/components/stock/StockIcons";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";

const d2 = (iso: string) => <T en={formatDate(iso)} bn={bnDate(iso) || formatDate(iso)} />;

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

function periodLabelBn(r: DividendDeclarationRecord): string {
  const pe = toDate(r.period_end);
  if (pe) return `${pe.getFullYear()} অর্থবছর`;
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
    years.size >= 2 ? (
      <T
        en={`It paid a cash dividend in ${cashYears.size} of the ${years.size} years we have records for.`}
        bn={`আমাদের কাছে থাকা ${years.size} বছরের মধ্যে ${cashYears.size} বছর নগদ ডিভিডেন্ড দিয়েছে।`}
      />
    ) : null;

  return (
    <section id="dividends" className="mb-8 stock-anchor">
      <SectionTitle
        title={<T en="Dividend history" bn="ডিভিডেন্ডের ইতিহাস" />}
        sub={
          streakLine ?? (
            <T
              en="Every dividend the company has declared, and the dates to remember if you want the next one."
              bn="কোম্পানির ঘোষিত সব ডিভিডেন্ড, আর পরেরটি পেতে কোন তারিখগুলো মনে রাখতে হবে।"
            />
          )
        }
        right={
          <Link href="/dividend-calendar" className="text-xs font-semibold hover:underline whitespace-nowrap text-primary">
            <T en="All record dates →" bn="সব রেকর্ড ডেট →" />
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
          cash === 0 && stock === 0 ? (
            <T en="No dividend" bn="কোনো ডিভিডেন্ড নেই" />
          ) : (
            <T
              en={[cash > 0 ? `${cash}% cash` : null, stock > 0 ? `${stock}% bonus` : null].filter(Boolean).join(" + ")}
              bn={[cash > 0 ? `${cash}% নগদ` : null, stock > 0 ? `${stock}% বোনাস` : null].filter(Boolean).join(" + ")}
            />
          );
        const type = r.dividend_type || "Final";
        const typeBn = /interim/i.test(type) ? "অন্তর্বর্তী" : "চূড়ান্ত";
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
              <p className="text-sm font-bold leading-snug min-w-0 text-text-main">
                <T en="Next dividend. Record date: " bn="পরের ডিভিডেন্ড। রেকর্ড ডেট: " />
                {d2(recordIso)}
              </p>
              <DaysLeft
                date={recordIso}
                className="sm:ml-auto text-xs font-bold px-2 py-0.5 rounded-full tabular-nums nums whitespace-nowrap"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-muted">
                  <T en="Declared" bn="ঘোষিত" />
                </p>
                <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight break-words text-text-main">
                  {declared}
                </p>
                <p className="text-xs text-text-muted">
                  <T en={`${type} · ${periodLabel(r)}`} bn={`${typeBn} · ${periodLabelBn(r)}`} />
                </p>
              </div>
              {cashPerShare != null && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted">
                    <T en="Cash per share" bn="শেয়ারপ্রতি নগদ" />
                  </p>
                  <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight text-positive">{money(cashPerShare)}</p>
                  {yieldPct != null && (
                    <p className="text-xs leading-snug text-text-muted">
                      <T
                        en={`${yieldPct.toFixed(2)}% of today's price, before tax`}
                        bn={`আজকের দামের ${yieldPct.toFixed(2)}%, কর বাদের আগে`}
                      />
                    </p>
                  )}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-text-muted">
                  <T en="Last day to buy" bn="শেষ কেনার দিন" />
                </p>
                <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight" style={{ color: spotNow ? "var(--watch)" : "var(--text)" }}>
                  {d2(buyByIso)}
                </p>
                <p className="text-xs leading-snug text-text-muted">
                  {spotNow ? (
                    <T
                      en="Only the spot market is open now. A normal buy will no longer get this dividend."
                      bn="এখন শুধু স্পট মার্কেট খোলা। সাধারণভাবে কিনলে এই ডিভিডেন্ড আর পাবেন না।"
                    />
                  ) : (
                    <DaysLeft date={buyByIso} kind="buy" />
                  )}
                </p>
              </div>
              {r.agm_date && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-text-muted">
                    <T en="AGM" bn="এজিএম" />
                  </p>
                  <p className="text-base sm:text-lg font-bold tabular-nums nums leading-tight text-text-main">{d2(r.agm_date)}</p>
                  <p className="text-xs text-text-muted">
                    <T en="Shareholders approve the dividend here" bn="এখানে শেয়ারহোল্ডাররা ডিভিডেন্ড অনুমোদন করেন" />
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs mt-3 leading-snug text-text-muted">
              <T
                en="The shares must be in your BO account on the record date. Normal trades take two working days to settle, and DSE opens a spot market just before the record date, so buying about 3 trading days early is the safe choice. Please confirm the last day with your broker."
                bn="রেকর্ড ডেটে শেয়ার আপনার বিও অ্যাকাউন্টে থাকতে হবে। সাধারণ লেনদেন নিষ্পত্তি হতে দুই কার্যদিবস লাগে, আর রেকর্ড ডেটের ঠিক আগে DSE স্পট মার্কেট খোলে। তাই অন্তত 3 কার্যদিবস আগে কেনা নিরাপদ। শেষ দিনটি আপনার ব্রোকারের কাছ থেকে নিশ্চিত হয়ে নিন।"
              />
            </p>
          </div>
        );
      })()}

      <DividendLedger rows={ledger} face={face} />
    </section>
  );
}
