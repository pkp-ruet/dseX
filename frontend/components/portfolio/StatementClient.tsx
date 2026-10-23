"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import Bn from "@/components/i18n/Bn";
import PremiumGate from "@/components/premium/PremiumGate";
import { useAuth } from "@/context/AuthContext";
import { apiGetPortfolio, MAIN_PORTFOLIO_ID, type PortfolioResponse } from "@/lib/api";
import { formatDate, takaGroup } from "@/lib/formatters";
import {
  DEFAULT_PORTFOLIO_SETTINGS,
  sellProfit,
  statementCsv,
  statementYears,
  yearStatement,
} from "@/lib/portfolio-ledger";
import { trackEvent } from "@/lib/track";

function Row({ label, value, tone = "text-text-main", bn }: { label: string; value: string; tone?: string; bn?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <div>
        <p className="text-sm text-text-main">{label}</p>
        {bn && <Bn className="text-xs text-text-muted">{bn}</Bn>}
      </div>
      <p className={`nums shrink-0 text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}

/**
 * The yearly statement: every buy, sale (with its profit), cash dividend and
 * bonus issue logged in the year, the totals, an estimate of fees and dividend
 * tax from the reader's own rates, and today's holdings. Print it (the page's
 * print CSS hides the site chrome) or download a CSV. Premium (screen-only).
 *
 * It is a record of what the reader logged in the app, not a broker or tax
 * document — the page says so.
 */
export default function StatementClient() {
  const { isLoggedIn, isLoading } = useAuth();
  const [pid, setPid] = useState(MAIN_PORTFOLIO_ID);
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [error, setError] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("pid");
      if (p) setPid(p);
    } catch {}
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setError(false);
    apiGetPortfolio(pid)
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, pid]);

  const log = useMemo(() => data?.log ?? [], [data]);
  const settings = data?.settings ?? DEFAULT_PORTFOLIO_SETTINGS;
  const years = useMemo(() => statementYears(log), [log]);
  const st = useMemo(() => yearStatement(log, year, settings), [log, year, settings]);
  const name = data?.name ?? "My portfolio";

  if (isLoading || (isLoggedIn && !data && !error)) {
    return (
      <Card padding="md">
        <Skeleton width="40%" height={20} className="mb-3" />
        <Skeleton width="100%" height={120} />
      </Card>
    );
  }
  if (!isLoggedIn) {
    return (
      <Card padding="md" className="text-center">
        <p className="font-semibold text-text-main">Sign in to see your statement</p>
        <div className="mt-4 flex justify-center gap-3">
          <Button href="/login" size="sm">Sign in</Button>
          <Button href="/register" variant="quiet" size="sm">Create account</Button>
        </div>
      </Card>
    );
  }
  if (error) {
    return <ErrorState size="inline" title="Couldn't load your statement" bn="হিসাব এখন লোড হচ্ছে না।" reload />;
  }

  function download() {
    const csv = statementCsv(st, data?.holdings ?? [], name);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topstockbd-statement-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    trackEvent("portfolio_statement", { action: "csv", year });
  }

  const entries = [...st.buys, ...st.sells, ...st.dividends, ...st.bonuses].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex flex-col gap-4">
      <div className="print-hide flex flex-wrap items-center gap-2">
        {years.map((y) => (
          <Chip key={y} active={y === year} onClick={() => setYear(y)}>
            {String(y)}
          </Chip>
        ))}
      </div>

      <PremiumGate
        preview="blur"
        peek={220}
        label="Your yearly statement"
        stakes={[
          entries.length
            ? `${entries.length} entries for ${year}, with totals, fees and dividend tax`
            : `Every buy, sale and dividend for ${year}, ready to print`,
        ]}
      >
        <Card padding="none" className="statement-sheet p-5 sm:p-6">
          <p className="text-xs font-semibold text-text-muted">TopStockBD · {name}</p>
          <h2 className="mt-1 text-xl font-bold text-text-main">Statement for {year}</h2>
          <Bn className="text-sm text-text-muted">{year} সালের হিসাব</Bn>

          <div className="mt-4 divide-y divide-border border-y border-border">
            <Row label="Money put in (buys)" bn="কেনায় খরচ" value={takaGroup(st.bought)} />
            <Row label="Money taken out (sales)" bn="বিক্রিতে পাওয়া" value={takaGroup(st.soldValue)} />
            <Row
              label="Profit from sales"
              bn="বিক্রি থেকে লাভ"
              value={`${st.profit >= 0 ? "+" : "−"}${takaGroup(Math.abs(st.profit))}`}
              tone={st.profit >= 0 ? "text-positive" : "text-negative"}
            />
            <Row label={`Fees, estimated at ${settings.fee_pct}% a side`} bn="আনুমানিক ব্রোকারেজ খরচ" value={`−${takaGroup(st.fees)}`} />
            <Row label="Cash dividends (before tax)" bn="নগদ ডিভিডেন্ড (কর বাদের আগে)" value={takaGroup(st.dividendsGross)} />
            <Row label={`Tax withheld, estimated at ${settings.div_tax_pct}%`} bn="আনুমানিক কর" value={`−${takaGroup(st.dividendsTax)}`} />
            <Row label="Cash dividends you received" bn="হাতে পাওয়া ডিভিডেন্ড" value={takaGroup(st.dividendsNet)} tone="text-positive" />
            <Row label="Bonus shares received" bn="বোনাস শেয়ার" value={st.bonusShares.toLocaleString()} />
          </div>

          <h3 className="mt-6 text-base font-bold text-text-main">Every entry</h3>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">Nothing logged for {year}.</p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="py-2 pr-2 font-semibold">Date</th>
                  <th className="py-2 pr-2 font-semibold">Stock</th>
                  <th className="py-2 pr-2 font-semibold">What</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => {
                  const what =
                    e.kind === "buy"
                      ? `Bought ${e.qty.toLocaleString()} @ ${takaGroup(e.price)}`
                      : e.kind === "sell"
                        ? `Sold ${e.qty.toLocaleString()} @ ${takaGroup(e.price)} (profit ${takaGroup(sellProfit(e))})`
                        : e.kind === "dividend"
                          ? `Cash dividend on ${(e.qty ?? 0).toLocaleString()} shares`
                          : `${e.pct}% bonus: +${(e.shares_added ?? 0).toLocaleString()} shares`;
                  const amount =
                    e.kind === "buy" || e.kind === "sell"
                      ? takaGroup(e.qty * e.price)
                      : e.kind === "dividend"
                        ? takaGroup(e.amount ?? 0)
                        : "—";
                  return (
                    <tr key={e.id}>
                      <td className="py-2 pr-2 whitespace-nowrap text-text-muted">
                        {formatDate(e.kind === "dividend" || e.kind === "bonus" ? e.record_date : e.date)}
                      </td>
                      <td className="py-2 pr-2 font-mono font-bold text-text-main">{e.code}</td>
                      <td className="py-2 pr-2 text-text-main">{what}</td>
                      <td className="nums py-2 text-right font-semibold text-text-main">{amount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          <h3 className="mt-6 text-base font-bold text-text-main">Holdings today</h3>
          <ul className="mt-2 divide-y divide-border text-sm">
            {(data?.holdings ?? []).map((h) => (
              <li key={h.id} className="flex justify-between gap-3 py-2">
                <span className="font-mono font-bold text-text-main">{h.trading_code}</span>
                <span className="nums text-text-main">
                  {h.qty.toLocaleString()} @ {takaGroup(h.buy_price)} = {takaGroup(h.qty * h.buy_price)}
                </span>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-xs text-text-muted">
            Built from what you logged in TopStockBD. Fees and tax are estimates from your own rates — your broker&apos;s
            statement and dividend slips are the official record. Not tax advice.
          </p>
          <Bn className="text-xs text-text-muted">
            TopStockBD-তে আপনি যা লিখেছেন তা থেকে তৈরি। খরচ ও কর আনুমানিক — আসল হিসাব আপনার ব্রোকারের স্টেটমেন্ট।
          </Bn>
        </Card>

        <div className="print-hide mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              trackEvent("portfolio_statement", { action: "print", year });
              window.print();
            }}
          >
            Print or save as PDF
          </Button>
          <Button type="button" variant="quiet" onClick={download}>
            Download CSV
          </Button>
        </div>
      </PremiumGate>

      <Link href="/portfolio" className="print-hide text-sm font-semibold text-primary-ink hover:underline">
        ← Back to your portfolio
      </Link>
    </div>
  );
}
