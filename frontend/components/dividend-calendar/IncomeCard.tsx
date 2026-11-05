"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import type { CorporateActionEvent, DividendForecast } from "@/lib/api";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { money } from "@/lib/formatters";
import PanelHead from "@/components/dividend-calendar/PanelHead";

/** The slim record / forecast rows the "Your dividends" tab needs. */
export type IncomeRecord = Pick<CorporateActionEvent, "trading_code" | "record_date" | "cash_per_share">;
export type IncomeForecast = Pick<DividendForecast, "trading_code" | "expected_record" | "last_cash_per_share">;

/** The reader's main-portfolio share counts by code; null until loaded or signed out. */
export function useMainQty(): Map<string, number> | null {
  const { isLoggedIn } = useAuth();
  const [qty, setQty] = useState<Map<string, number> | null>(null);
  useEffect(() => {
    if (!isLoggedIn) {
      setQty(null);
      return;
    }
    let live = true;
    loadMainHoldings()
      .then((hs) => {
        if (live) setQty(heldQty(hs));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoggedIn]);
  return qty;
}

/** Tax taken at source with a TIN (15% without one). */
export const DIVIDEND_TAX = 0.1;
const TAX = DIVIDEND_TAX;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

type Line = { code: string; cash: number; expected: boolean };
export type Month = { key: string; lines: Line[]; declared: number; expected: number };

/** Cash on the reader's shares by month of the record date, after tax:
 *  declared record dates, then "Coming next" companies at last year's cash
 *  (marked expected — since 2026-11-05 no estimate of the amount). */
export function incomeByMonth(
  qty: Map<string, number>,
  records: IncomeRecord[],
  forecast: IncomeForecast[],
  today: string,
): Month[] {
  const months = new Map<string, Month>();
  const add = (iso: string, code: string, cash: number, expected: boolean) => {
    const key = iso.slice(0, 7);
    const m = months.get(key) ?? { key, lines: [], declared: 0, expected: 0 };
    m.lines.push({ code, cash, expected });
    if (expected) m.expected += cash;
    else m.declared += cash;
    months.set(key, m);
  };
  const declared = new Set<string>();
  for (const e of records) {
    const q = qty.get(e.trading_code.toUpperCase());
    if (!q || !e.record_date || !e.cash_per_share || e.record_date < today) continue;
    declared.add(e.trading_code.toUpperCase());
    add(e.record_date, e.trading_code, q * e.cash_per_share * (1 - TAX), false);
  }
  for (const f of forecast) {
    const code = f.trading_code.toUpperCase();
    const q = qty.get(code);
    if (!q || declared.has(code) || !f.expected_record || !f.last_cash_per_share || f.expected_record < today) continue;
    add(f.expected_record, f.trading_code, q * f.last_cash_per_share * (1 - TAX), true);
  }
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function monthName(key: string, bn: boolean): string {
  const [y, m] = key.split("-").map(Number);
  return `${(bn ? MONTHS_BN : MONTHS)[m - 1]} ${y}`;
}

/**
 * "Your dividends" — the calendar's last tab, shown only to a signed-in reader
 * with shares in the main portfolio (`CalendarTabs`): the cash coming to their
 * shares, month by month, after 10% tax — declared record dates, then the
 * companies we expect to declare at last year's cash, marked "expected".
 */
export default function IncomeCard({ months }: { months: Month[] }) {
  const total = months.reduce((s, m) => s + m.declared + m.expected, 0);
  const expected = months.reduce((s, m) => s + m.expected, 0);
  const shares = new Set(months.flatMap((m) => m.lines.map((l) => l.code.toUpperCase()))).size;
  return (
    <>
    <PanelHead
      title={<T en="Your dividends" bn="আপনার ডিভিডেন্ড" />}
      lead={
        <T
          en="The cash coming to the shares in your portfolio, month by month, after 10% tax."
          bn="আপনার পোর্টফোলিওর শেয়ারে মাসে মাসে যে নগদ টাকা আসছে, 10% কর কাটার পর।"
        />
      }
    />
    <section className="soft-card dc-income">
      {months.length === 0 ? (
        <p className="dc-income-lead">
          <T
            en="None of the shares in your portfolio has a cash dividend coming in the next four months."
            bn="আপনার পোর্টফোলিওর কোনো শেয়ারে সামনের চার মাসে নগদ ডিভিডেন্ড নেই।"
          />
        </p>
      ) : (
        <>
          <p className="dc-income-big pv">{money(total)}</p>
          <p className="dc-income-lead">
            <T
              en={`Coming to ${shares} of your shares over the next ${months.length} ${months.length === 1 ? "month" : "months"}, after 10% tax.${expected > 0 ? ` About ${money(expected)} of it is for dividends not declared yet, counted at last year's amount.` : ""}`}
              bn={`সামনের ${months.length} মাসে আপনার ${shares}টি শেয়ারে আসছে, 10% কর কাটার পর।${expected > 0 ? ` এর মধ্যে প্রায় ${money(expected)} এখনো ঘোষণা না হওয়া ডিভিডেন্ডের, গত বছরের পরিমাণে ধরা।` : ""}`}
            />
          </p>
          <ul className="dc-income-list">
            {months.map((m) => (
              <li key={m.key} className="dc-income-row">
                <span className="min-w-0">
                  <b className="dc-income-month">
                    <T en={monthName(m.key, false)} bn={monthName(m.key, true)} />
                  </b>
                  <span className="dc-income-codes">
                    {m.lines.map((l, i) => (
                      <span key={`${l.code}-${i}`}>
                        {i > 0 && ", "}
                        <Link href={`/stock/${encodeURIComponent(l.code)}#dividends`} prefetch={false}>
                          {l.code}
                        </Link>
                        {l.expected && <T en=" (expected)" bn=" (আনুমানিক)" />}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="dc-income-amt">
                  {m.declared > 0 && <span className="pv">{money(m.declared)}</span>}
                  {m.expected > 0 && (
                    <span className="dc-income-exp pv">
                      <T en={`about ${money(m.expected)} expected`} bn={`প্রায় ${money(m.expected)} আনুমানিক`} />
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
    </>
  );
}
