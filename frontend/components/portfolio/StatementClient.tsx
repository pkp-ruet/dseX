"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import Skeleton from "@/components/ui/Skeleton";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import AnswerLock from "@/components/premium/AnswerLock";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
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

function Row({ label, value, tone = "text-text-main", bn }: { label: string; value: string; tone?: string; bn: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <p className="text-sm text-text-main">
        <T en={label} bn={bn} />
      </p>
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
  const { lang } = useLang();
  const L = (en: string, bn: string) => (lang === "bn" ? bn : en);
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
        <p className="font-semibold text-text-main">
          <T en="Sign in to see your statement" bn="আপনার বার্ষিক হিসাব দেখতে সাইন ইন করুন" />
        </p>
        <div className="mt-4 flex justify-center gap-3">
          <Button href="/login" size="sm">
            <T en="Sign in" bn="সাইন ইন" />
          </Button>
          <Button href="/register" variant="quiet" size="sm">
            <T en="Create an account" bn="অ্যাকাউন্ট খুলুন" />
          </Button>
        </div>
      </Card>
    );
  }
  if (error) {
    return <ErrorState size="inline" title={<T en="We couldn't load your statement" bn="আপনার বার্ষিক হিসাব এখন লোড করা যাচ্ছে না" />} reload />;
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

      <AnswerLock
        job="watch"
        lock="Yearly statement"
        what={{ en: "Your yearly statement", bn: "আপনার বার্ষিক হিসাব" }}
        lines={[
          entries.length
            ? { en: `${entries.length} entries for ${year}: every buy, sale, dividend and bonus`, bn: `${year} সালের ${entries.length}টি লেনদেন: প্রতিটি কেনা, বেচা, ডিভিডেন্ড আর বোনাস` }
            : { en: `Every buy, sale and dividend for ${year}`, bn: `${year} সালের প্রতিটি কেনা, বেচা আর ডিভিডেন্ড` },
          { en: "Totals with estimated fees and dividend tax, ready to print or download", bn: "আনুমানিক খরচ আর ডিভিডেন্ডের করসহ মোট হিসাব, প্রিন্ট বা ডাউনলোডের জন্য তৈরি" },
        ]}
      >
        <Card padding="none" className="statement-sheet p-5 sm:p-6">
          <p className="text-xs font-semibold text-text-muted">TopStockBD · {name}</p>
          <h2 className="mt-1 text-xl font-bold text-text-main">
            <T en={`Statement for ${year}`} bn={`${year} সালের হিসাব`} />
          </h2>

          <div className="mt-4 divide-y divide-border border-y border-border">
            <Row label="Money put in (buys)" bn="কেনায় দেওয়া টাকা" value={takaGroup(st.bought)} />
            <Row label="Money taken out (sales)" bn="বিক্রি থেকে পাওয়া টাকা" value={takaGroup(st.soldValue)} />
            <Row
              label="Profit from sales"
              bn="বিক্রি থেকে মুনাফা"
              value={`${st.profit >= 0 ? "+" : "−"}${takaGroup(Math.abs(st.profit))}`}
              tone={st.profit >= 0 ? "text-positive" : "text-negative"}
            />
            <Row label={`Fees, estimated at ${settings.fee_pct}% a side`} bn={`ব্রোকারেজ খরচ, প্রতি লেনদেনে আনুমানিক ${settings.fee_pct}%`} value={`−${takaGroup(st.fees)}`} />
            <Row label="Cash dividends (before tax)" bn="নগদ ডিভিডেন্ড (কর বাদের আগে)" value={takaGroup(st.dividendsGross)} />
            <Row label={`Tax withheld, estimated at ${settings.div_tax_pct}%`} bn={`কেটে রাখা কর, আনুমানিক ${settings.div_tax_pct}%`} value={`−${takaGroup(st.dividendsTax)}`} />
            <Row label="Cash dividends you received" bn="হাতে পাওয়া ডিভিডেন্ড" value={takaGroup(st.dividendsNet)} tone="text-positive" />
            <Row label="Bonus shares received" bn="বোনাস শেয়ার" value={st.bonusShares.toLocaleString()} />
          </div>

          <h3 className="mt-6 text-base font-bold text-text-main">
            <T en="Every entry" bn="প্রতিটি লেনদেন" />
          </h3>
          {entries.length === 0 ? (
            <p className="mt-2 text-sm text-text-muted">
              <T en={`Nothing was logged for ${year}.`} bn={`${year} সালে কিছু লেখা হয়নি।`} />
            </p>
          ) : (
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="py-2 pr-2 font-semibold"><T en="Date" bn="তারিখ" /></th>
                  <th className="py-2 pr-2 font-semibold"><T en="Share" bn="শেয়ার" /></th>
                  <th className="py-2 pr-2 font-semibold"><T en="What" bn="বিবরণ" /></th>
                  <th className="py-2 text-right font-semibold"><T en="Amount" bn="পরিমাণ" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {entries.map((e) => {
                  const what =
                    e.kind === "buy"
                      ? L(`Bought ${e.qty.toLocaleString()} @ ${takaGroup(e.price)}`, `${e.qty.toLocaleString()}টি কেনা @ ${takaGroup(e.price)}`)
                      : e.kind === "sell"
                        ? L(
                            `Sold ${e.qty.toLocaleString()} @ ${takaGroup(e.price)} (profit ${takaGroup(sellProfit(e))})`,
                            `${e.qty.toLocaleString()}টি বিক্রি @ ${takaGroup(e.price)} (মুনাফা ${takaGroup(sellProfit(e))})`,
                          )
                        : e.kind === "dividend"
                          ? L(`Cash dividend on ${(e.qty ?? 0).toLocaleString()} shares`, `${(e.qty ?? 0).toLocaleString()}টি শেয়ারে নগদ ডিভিডেন্ড`)
                          : L(
                              `${e.pct}% bonus: +${(e.shares_added ?? 0).toLocaleString()} shares`,
                              `${e.pct}% বোনাস: +${(e.shares_added ?? 0).toLocaleString()}টি শেয়ার`,
                            );
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

          <h3 className="mt-6 text-base font-bold text-text-main">
            <T en="Your shares today" bn="আজ আপনার শেয়ার" />
          </h3>
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
            <T
              en="Built from what you logged in TopStockBD. Fees and tax are estimates from your own rates. Your broker's statement and dividend slips are the official record. This is not tax advice."
              bn="TopStockBD-তে আপনি যা লিখেছেন, তা থেকে তৈরি। খরচ ও কর আপনার নিজের হার ধরে আনুমানিক। আসল হিসাব আপনার ব্রোকারের স্টেটমেন্ট আর ডিভিডেন্ড স্লিপ। এটি কর পরামর্শ নয়।"
            />
          </p>
        </Card>

        <div className="print-hide mt-3 flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              trackEvent("portfolio_statement", { action: "print", year });
              window.print();
            }}
          >
            <T en="Print or save as PDF" bn="প্রিন্ট করুন বা PDF সেভ করুন" />
          </Button>
          <Button type="button" variant="quiet" onClick={download}>
            <T en="Download CSV" bn="CSV ডাউনলোড করুন" />
          </Button>
        </div>
      </AnswerLock>

      <Link href="/portfolio" className="print-hide text-sm font-semibold text-primary-ink hover:underline">
        <T en="← Back to your portfolio" bn="← আপনার পোর্টফোলিওতে ফিরুন" />
      </Link>
    </div>
  );
}
