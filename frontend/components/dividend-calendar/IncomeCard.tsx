"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import type { CorporateActionEvent, DividendForecast } from "@/lib/api";
import { heldQty, loadMainHoldings } from "@/lib/main-holdings";
import { money } from "@/lib/formatters";

/** Tax taken at source with a TIN (15% without one). */
export const DIVIDEND_TAX = 0.1;
const TAX = DIVIDEND_TAX;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

type Line = { code: string; cash: number; expected: boolean };
type Month = { key: string; lines: Line[]; declared: number; expected: number };

/** Cash on the reader's shares by month of the record date, after tax:
 *  declared record dates, then "Coming next" estimates (marked expected). */
export function incomeByMonth(
  qty: Map<string, number>,
  records: Pick<CorporateActionEvent, "trading_code" | "record_date" | "cash_per_share">[],
  forecast: Pick<DividendForecast, "trading_code" | "expected_record" | "expected_cash_per_share">[],
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
    if (!q || declared.has(code) || !f.expected_record || !f.expected_cash_per_share || f.expected_record < today) continue;
    add(f.expected_record, f.trading_code, q * f.expected_cash_per_share * (1 - TAX), true);
  }
  return [...months.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function monthName(key: string, bn: boolean): string {
  const [y, m] = key.split("-").map(Number);
  return `${(bn ? MONTHS_BN : MONTHS)[m - 1]} ${y}`;
}

/**
 * "Your dividend income by month" (2026-10-31, the Premium Desk plan): the
 * cash coming to the reader's own shares (main portfolio), month by month,
 * after 10% tax — declared record dates, then our estimates for companies that
 * haven't declared yet, marked "expected". Signed-in readers with shares only.
 * Since 2026-11-04 the whole calendar is Premium (the page's one gate), so
 * nothing in here locks on its own.
 */
export default function IncomeCard({
  records,
  forecast,
  today,
}: {
  records: CorporateActionEvent[];
  forecast: DividendForecast[];
  today: string;
}) {
  const { isLoggedIn } = useAuth();
  const [qty, setQty] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
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

  const months = useMemo(() => (qty ? incomeByMonth(qty, records, forecast, today) : []), [qty, records, forecast, today]);
  if (!isLoggedIn || !qty || qty.size === 0) return null;

  const total = months.reduce((s, m) => s + m.declared + m.expected, 0);
  const expected = months.reduce((s, m) => s + m.expected, 0);
  const shares = new Set(months.flatMap((m) => m.lines.map((l) => l.code.toUpperCase()))).size;
  return (
    <section className="soft-card dc-income" aria-labelledby="dc-income-title">
      <h2 id="dc-income-title" className="dc-income-title">
        <T en="Your dividends" bn="আপনার ডিভিডেন্ড" />
      </h2>
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
              en={`Coming to ${shares} of your shares over the next ${months.length} ${months.length === 1 ? "month" : "months"}, after 10% tax.${expected > 0 ? ` About ${money(expected)} of it is our estimate for dividends not declared yet.` : ""}`}
              bn={`সামনের ${months.length} মাসে আপনার ${shares}টি শেয়ারে আসছে, 10% কর কাটার পর।${expected > 0 ? ` এর মধ্যে প্রায় ${money(expected)} এখনো ঘোষণা না হওয়া ডিভিডেন্ডের অনুমান।` : ""}`}
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
  );
}
