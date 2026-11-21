"use client";

import { useMemo } from "react";
import { usePremium } from "@/lib/premium";
import PremiumCard, { PremiumTicks } from "@/components/premium/PremiumCard";
import MaskedName from "@/components/premium/MaskedName";
import { T } from "@/components/i18n/T";
import { dayShort } from "@/components/dividend-calendar/dates";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import { DIVIDEND_TAX, useMainQty } from "@/components/dividend-calendar/IncomeCard";
import type { YoursInput } from "@/components/dividend-calendar/CalendarTabs";
import { money } from "@/lib/formatters";
import type { CalendarPromo } from "@/lib/dividend-promo";

/** What a Premium reader sees, in four plain lines. */
const GETS: { en: string; bn: string }[] = [
  { en: "Every record date ahead, not only this week", bn: "শুধু এই সপ্তাহ নয়, সামনের সব রেকর্ড ডেট" },
  { en: "Who declares next, and roughly when", bn: "এরপর কে ঘোষণা দেবে, আর মোটামুটি কবে" },
  { en: "Your own dividends in taka, month by month", bn: "আপনার নিজের ডিভিডেন্ড, মাসে মাসে টাকায়" },
  { en: "A reminder on each last day to buy", bn: "কেনার প্রতিটি শেষ দিনে মনে করিয়ে দেওয়া" },
];

const ROWS_SHOWN = 4;

const s = (n: number, one: string, many: string) => (n === 1 ? one : many);

type Mine = {
  total: number;
  shares: number;
  rows: { code: string; date: string }[];
  /** Shares we expect to pay (they paid last year, nothing declared yet). */
  expected: number;
};

/** The reader's own dividends, from their main portfolio: declared cash
 *  after tax, and how many more of their shares we expect to pay. */
function useMine(yours: YoursInput | undefined): Mine | null {
  const qty = useMainQty();
  return useMemo(() => {
    if (!yours || !qty || qty.size === 0) return null;
    let total = 0;
    const rows: Mine["rows"] = [];
    const declared = new Set<string>();
    for (const e of yours.records) {
      const code = e.trading_code.toUpperCase();
      const q = qty.get(code);
      if (!q || !e.record_date || !e.cash_per_share || e.record_date < yours.today) continue;
      total += q * e.cash_per_share * (1 - DIVIDEND_TAX);
      declared.add(code);
      rows.push({ code, date: e.record_date });
    }
    const expected = new Set(
      yours.forecast
        .map((f) => f.trading_code.toUpperCase())
        .filter((c) => qty.has(c) && !declared.has(c)),
    ).size;
    rows.sort((a, b) => a.date.localeCompare(b.date));
    return { total, shares: declared.size, rows, expected };
  }, [yours, qty]);
}

/**
 * THE Premium card on the dividend calendar (`#dc-premium`). Since THE Premium
 * line, step 2 (2026-11-22): the next week of record dates is free above it,
 * so the card sells what lies past the week and, above all, the reader's own
 * dividends — the part nobody else works out for them. Three parts:
 *  1. the promise, and what lies past the free week (counts);
 *  2. for a reader with shares: the taka coming to them after tax (free, a
 *     total), with which shares and the dates behind a mask;
 *  3. four ticks, then the price and one button.
 * The headline never changes after the portfolio loads; the personal box
 * appears inside the card.
 */
export default function DividendPromo({ promo, yours }: { promo: CalendarPromo; yours?: YoursInput }) {
  const mine = useMine(yours);
  const personal = mine != null && (mine.shares > 0 || mine.expected > 0);

  return (
    <PremiumCard
      anchor={CALENDAR_PREMIUM_ANCHOR}
      area="dividend-calendar"
      lock="dc-promo"
      src="dividend-calendar"
      track={{ variant: "v4", after: promo.after, next: promo.comingNext }}
      className="dc-promo"
      tag={{ en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" }}
      title={<T en="Never miss a dividend." bn="কোনো ডিভিডেন্ড আর মিস করবেন না।" />}
      lead={
        <T
          en={`This week is free above. After it come ${promo.after} more record date${s(promo.after, "", "s")}, and ${promo.comingNext} compan${s(promo.comingNext, "y", "ies")} we expect to declare next. Premium shows every one, and works out the dividends coming to your own shares.`}
          bn={`এই সপ্তাহেরগুলো ওপরে ফ্রি। এরপর আরও ${promo.after}টি রেকর্ড ডেট, আর ${promo.comingNext}টি কোম্পানি এরপর ঘোষণা দিতে পারে। প্রিমিয়াম সবগুলো দেখায়, আর আপনার নিজের শেয়ারে কত ডিভিডেন্ড আসছে তা হিসাব করে দেয়।`}
        />
      }
      cta={personal ? { en: "See which shares, and remind me", bn: "কোন শেয়ার দেখুন, মনে করিয়ে দিন" } : { en: "See every dividend ahead", bn: "সামনের সব ডিভিডেন্ড দেখুন" }}
      context={{ label: { en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }, stakes: GETS.slice(0, 3) }}
    >
      {personal && mine && <YourDividends mine={mine} />}
      <PremiumTicks items={GETS} />
    </PremiumCard>
  );
}

/** The reader's own total, free; which shares and when, masked. */
function YourDividends({ mine }: { mine: Mine }) {
  // The 7-day taste opens the reader's own dividends by name (step 6).
  const { sharesOpen } = usePremium();
  const rest = mine.rows.length - ROWS_SHOWN;
  return (
    <div className="dcp-you">
      <p className="dcp-you-k">
        <T en="Your dividends" bn="আপনার ডিভিডেন্ড" />
      </p>
      {mine.shares > 0 ? (
        <>
          <p className="dcp-you-big pv">{money(mine.total)}</p>
          <p className="dcp-you-line">
            <T
              en={`is coming to ${mine.shares} of your shares from dividends already declared, after 10% tax.`}
              bn={`ইতিমধ্যে ঘোষিত ডিভিডেন্ড থেকে আপনার ${mine.shares}টি শেয়ারে আসছে, 10% কর কাটার পর।`}
            />
          </p>
          <ul className="dcp-you-rows">
            {mine.rows.slice(0, ROWS_SHOWN).map((r) => {
              const d = dayShort(r.date);
              return (
                <li key={`${r.code}-${r.date}`}>
                  {sharesOpen ? <b className="dcp-you-code">{r.code}</b> : <MaskedName name={r.code} />}
                  <span className="dcp-you-date">
                    <T en={`Record date ${d.en}`} bn={`রেকর্ড ডেট ${d.bn}`} />
                  </span>
                </li>
              );
            })}
          </ul>
          {rest > 0 && (
            <p className="dcp-you-more">
              <T en={`And ${rest} more.`} bn={`আরও ${rest}টি।`} />
            </p>
          )}
        </>
      ) : null}
      {mine.expected > 0 && (
        <p className="dcp-you-line">
          <T
            en={`${mine.expected} more of your shares paid last year and haven't declared yet. Premium shows which, and roughly when.`}
            bn={`আপনার আরও ${mine.expected}টি শেয়ার গত বছর ডিভিডেন্ড দিয়েছিল, এবার এখনো ঘোষণা দেয়নি। কোনগুলো আর মোটামুটি কবে, প্রিমিয়াম দেখায়।`}
          />
        </p>
      )}
    </div>
  );
}
