"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/premium/AnswerLock";
import { useAuth } from "@/context/AuthContext";
import { apiGetPortfolio, type CorporateActionEvent, type DividendForecast } from "@/lib/api";
import { money } from "@/lib/formatters";
import { usePremium } from "@/lib/premium";

/** Tax taken at source with a TIN (15% without one). */
const TAX = 0.1;

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];

type Line = { code: string; cash: number; expected: boolean };
type Month = { key: string; lines: Line[]; declared: number; expected: number };

/** Cash on the reader's shares by month of the record date, after tax:
 *  declared record dates, then "Coming next" estimates (marked expected). */
export function incomeByMonth(
  qty: Map<string, number>,
  records: CorporateActionEvent[],
  forecast: DividendForecast[],
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
 * The months and companies are free; the taka is Premium (screen-only).
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
  const { isPremium } = usePremium();
  const [qty, setQty] = useState<Map<string, number> | null>(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    let live = true;
    apiGetPortfolio()
      .then((p) => {
        if (!live) return;
        const m = new Map<string, number>();
        for (const h of p.holdings ?? []) {
          const c = h.trading_code.toUpperCase();
          m.set(c, (m.get(c) ?? 0) + (h.qty || 0));
        }
        setQty(m);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [isLoggedIn]);

  const months = useMemo(() => (qty ? incomeByMonth(qty, records, forecast, today) : []), [qty, records, forecast, today]);
  if (!isLoggedIn || !qty || qty.size === 0) return null;

  const total = months.reduce((s, m) => s + m.declared + m.expected, 0);
  return (
    <section className="soft-card dc-income" aria-labelledby="dc-income-title">
      <h2 id="dc-income-title" className="dc-income-title">
        <T en="Your dividend income by month" bn="মাস অনুযায়ী আপনার ডিভিডেন্ড আয়" />
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
          <p className="dc-income-lead">
            <T
              en={`Cash comes to your shares in ${months.length} ${months.length === 1 ? "month" : "months"} ahead, by the month of each record date, after 10% tax.`}
              bn={`সামনের ${months.length}টি মাসে আপনার শেয়ারে নগদ আসবে, রেকর্ড ডেটের মাস অনুযায়ী, 10% কর কাটার পর।`}
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
                <Locked as="span" className="dc-income-amt">
                  {m.declared > 0 && <span>{money(m.declared)}</span>}
                  {m.expected > 0 && (
                    <span className="dc-income-exp">
                      <T en={`about ${money(m.expected)} expected`} bn={`প্রায় ${money(m.expected)} আনুমানিক`} />
                    </span>
                  )}
                </Locked>
              </li>
            ))}
          </ul>
          <Locked className="dc-income-total">
            <T en={`In all, about ${money(total)} after tax.`} bn={`সব মিলিয়ে কর কাটার পর প্রায় ${money(total)}।`} />
          </Locked>
          {!isPremium && (
            <p className="dc-income-total">
              <a href="#dc-premium" className="font-semibold text-primary-ink hover:underline active:opacity-70">
                <T en="Premium shows the taka for each month" bn="প্রতি মাসে কত টাকা, তা প্রিমিয়ামে দেখবেন" />
              </a>
            </p>
          )}
        </>
      )}
    </section>
  );
}
