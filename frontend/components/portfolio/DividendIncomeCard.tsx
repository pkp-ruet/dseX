"use client";

import Link from "next/link";
import PfCard from "./PfCard";
import Stat from "@/components/ui/Stat";
import { takaGroup, formatDate } from "@/lib/formatters";
import type { ScoreItem, DividendsUpcoming, DividendCalendarData } from "@/lib/api";
import type { AnalysisLang, ComputedRow } from "@/lib/portfolio-analysis";

// Numbers inside Bengali prose stay Western (9, 6.1%) — the Bengali numeral
// glyphs don't render reliably on all devices here.

/** One dividend event on a held stock, sized to the user's position. */
interface UpcomingPayout {
  code: string;
  kind: "record" | "declared";
  date: string | null;
  daysLeft: number | null;
  cashPct: number | null;
  stockPct: number | null;
  /** qty × cash per share — the taka that lands in the account (before tax). */
  payout: number | null;
  /** qty × bonus % — roughly how many new shares a stock dividend adds. */
  bonusShares: number | null;
  /** Headline % when the calendar has no cash/stock split for this row. */
  pct: number | null;
}

const SHOWN = 5;

function daysLeftLabel(n: number | null, bn: boolean): string {
  if (n == null) return "";
  if (n <= 0) return bn ? " · আজ" : " · today";
  if (n === 1) return bn ? " · আগামীকাল" : " · tomorrow";
  return bn ? ` · ${n} দিন পর` : ` · in ${n} days`;
}

function describeDividend(u: UpcomingPayout, bn: boolean): string {
  const parts: string[] = [];
  if (u.cashPct != null && u.cashPct > 0) parts.push(bn ? `${u.cashPct}% নগদ` : `${u.cashPct}% cash`);
  if (u.stockPct != null && u.stockPct > 0) parts.push(bn ? `${u.stockPct}% বোনাস শেয়ার` : `${u.stockPct}% bonus shares`);
  if (parts.length > 0) return parts.join(" + ");
  if (u.pct != null) return bn ? `${u.pct}% ডিভিডেন্ড` : `${u.pct}% dividend`;
  return bn ? "ডিভিডেন্ড" : "Dividend";
}

/**
 * Estimated yearly dividend income, plus the dividends about to land on held
 * stocks in taka: qty × cash per share from the corporate-action calendar
 * (`/api/dividend-calendar`), with the record date the user must still be a
 * shareholder on. Falls back to the headline % from `/api/dividends/upcoming`
 * for anything the calendar doesn't carry.
 *
 * 2026-10-26 clean look + Bengali: the yearly estimate leads as one big
 * number, then "coming up" as hairline rows (company name first, what and
 * when under it, the taka on the right). Every sentence flips with `lang`.
 */
export default function DividendIncomeCard({
  rows,
  priceMap,
  dividends,
  calendar,
  lang = "en",
}: {
  rows: ComputedRow[];
  priceMap: Map<string, ScoreItem>;
  dividends: DividendsUpcoming | null;
  calendar: Pick<DividendCalendarData, "record_dates"> | null;
  lang?: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const bnText = bn ? "font-bn" : "";

  let income = 0;
  let payers = 0;
  for (const r of rows) {
    const y = priceMap.get(r.holding.trading_code)?.div_yield_pct;
    const value = r.current_value ?? r.cost_basis;
    if (y != null && y > 0 && value > 0) {
      income += (y / 100) * value;
      payers += 1;
    }
  }

  const qtyByCode = new Map(
    rows.map((r) => [r.holding.trading_code.toUpperCase(), r.holding.qty] as const),
  );
  const nameByCode = new Map(
    rows.map((r) => [
      r.holding.trading_code.toUpperCase(),
      r.company_name ?? priceMap.get(r.holding.trading_code)?.company_name ?? null,
    ] as const),
  );
  const seen = new Set<string>();
  const upcoming: UpcomingPayout[] = [];

  // Record dates inside the calendar's window, sized to the position. One row
  // per code — the calendar is sorted by record date, so the nearest wins.
  for (const e of calendar?.record_dates ?? []) {
    const code = e.trading_code.toUpperCase();
    const qty = qtyByCode.get(code);
    if (qty == null || seen.has(code) || !e.record_date) continue;
    seen.add(code);
    const cps = e.cash_per_share;
    upcoming.push({
      code,
      kind: "record",
      date: e.record_date,
      daysLeft: e.record_days_left,
      cashPct: e.cash_pct,
      stockPct: e.stock_pct,
      payout: cps != null && cps > 0 ? qty * cps : null,
      bonusShares:
        e.stock_pct != null && e.stock_pct > 0 ? Math.floor((qty * e.stock_pct) / 100) : null,
      pct: null,
    });
  }
  // Fallback rows (headline % only) for anything the calendar didn't cover.
  const fallback = (kind: UpcomingPayout["kind"], code: string, date: string | null, pct: number | null) =>
    upcoming.push({
      code, kind, date, daysLeft: null, cashPct: null, stockPct: null,
      payout: null, bonusShares: null, pct,
    });
  for (const d of dividends?.upcoming_record_dates ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!qtyByCode.has(code) || seen.has(code)) continue;
    seen.add(code);
    fallback("record", code, d.record_date, d.dividend_pct);
  }
  for (const d of dividends?.upcoming_declarations ?? []) {
    const code = d.trading_code.toUpperCase();
    if (!qtyByCode.has(code) || seen.has(code)) continue;
    seen.add(code);
    fallback("declared", code, d.projected_date, d.dividend_pct);
  }
  upcoming.sort((a, b) => (a.date ?? "9999").localeCompare(b.date ?? "9999"));
  const totalPayout = upcoming.reduce((acc, u) => acc + (u.payout ?? 0), 0);

  if (income <= 0 && upcoming.length === 0) return null;

  const n = rows.length;

  return (
    <PfCard
      title={L("Dividend income", "ডিভিডেন্ড আয়")}
      bn="ডিভিডেন্ড আয়"
      note={L("Cash your stocks pay you, on top of any price gains.", "দামের লাভের বাইরে, আপনার শেয়ার আপনাকে যে নগদ টাকা দেয়।")}
      lang={lang}
      dataCard="dividend-income"
    >
      {income > 0 && (
        <div className={bnText} lang={bn ? "bn" : undefined}>
          <Stat
            size="xl"
            tone="positive"
            value={
              <span className="pv">
                ≈ {takaGroup(income)}
                <span className="ml-1 text-base font-semibold text-text-muted">{L("/ year", "/ বছর")}</span>
              </span>
            }
            label={L("A rough yearly estimate", "বছরে মোটামুটি যত আসতে পারে")}
          />
          <p className="pf-fine">
            {L(
              `From ${payers} of your ${n} stock${n === 1 ? "" : "s"}, at today's dividend rates and prices. What you really get depends on what each company declares.`,
              `আপনার ${n}টি শেয়ারের মধ্যে ${payers}টির আজকের ডিভিডেন্ড হার ও দাম ধরে হিসাব। আসলে কত পাবেন, তা নির্ভর করে প্রতিটি কোম্পানি কত ঘোষণা করে তার ওপর।`,
            )}
          </p>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className={income > 0 ? "mt-4" : ""}>
          <div
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-b border-cell-rule pb-2 ${bnText}`}
            lang={bn ? "bn" : undefined}
          >
            <h4 className="m-0 text-sm font-bold text-text-main">{L("Coming up on your stocks", "আপনার শেয়ারে সামনে যা আসছে")}</h4>
            {totalPayout > 0 && (
              <p className="m-0 whitespace-nowrap text-sm font-semibold text-text-muted">
                <span className="pv pf-num font-bold pf-up">≈ {takaGroup(totalPayout)}</span> {L("on its way", "আসছে")}
              </p>
            )}
          </div>
          <ul className="pf-rows">
            {upcoming.slice(0, SHOWN).map((u) => {
              const name = nameByCode.get(u.code) || u.code;
              return (
                <li key={u.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      prefetch={false}
                      href={`/stock/${u.code}`}
                      className="flex min-h-10 min-w-0 flex-col justify-center hover:text-primary-ink active:opacity-70"
                    >
                      <span className="truncate text-sm font-semibold text-text-main">{name}</span>
                      <span className={`text-xs font-semibold text-text-muted ${bnText}`} lang={bn ? "bn" : undefined}>
                        {name !== u.code && <span className="text-text-main">{u.code} · </span>}
                        {describeDividend(u, bn)}
                      </span>
                    </Link>
                    <p className={`m-0 text-xs text-text-muted ${bnText}`} lang={bn ? "bn" : undefined}>
                      {u.kind === "record" ? L("Record date", "রেকর্ড ডেট") : L("Expected", "সম্ভাব্য তারিখ")}
                      {u.date ? ` · ${formatDate(u.date)}` : ""}
                      {daysLeftLabel(u.daysLeft, bn)}
                    </p>
                  </div>
                  {(u.payout != null || (u.bonusShares != null && u.bonusShares > 0)) && (
                    <div className="text-right">
                      {u.payout != null && (
                        <p className="pv pf-num m-0 text-sm font-bold pf-up">≈ {takaGroup(u.payout)}</p>
                      )}
                      {u.bonusShares != null && u.bonusShares > 0 && (
                        <p className={`pv pf-num m-0 text-xs font-semibold text-text-muted ${bnText}`} lang={bn ? "bn" : undefined}>
                          {L(`+${u.bonusShares} shares`, `+${u.bonusShares}টি শেয়ার`)}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {totalPayout > 0 && (
            <p className={`pf-fine ${bnText}`} lang={bn ? "bn" : undefined}>
              {L(
                "Cash amounts are before tax. To get them, you must still hold the shares on the record date.",
                "নগদ টাকার হিসাব কর কাটার আগের। পেতে হলে রেকর্ড ডেটে শেয়ারগুলো আপনার কাছে থাকতে হবে।",
              )}
            </p>
          )}
        </div>
      )}
    </PfCard>
  );
}
