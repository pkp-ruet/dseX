"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DividendPromo from "@/components/premium/DividendPromo";
import { useLang } from "@/context/LangContext";
import type { MarketDividendEvent } from "@/lib/api";
import { isoLocal, recordDateInfo, todayDhaka } from "@/lib/dividend-dates";
import { formatDate } from "@/lib/formatters";
import { usePremium } from "@/lib/premium";
import MarketRow, { type RowTone } from "./MarketRow";
import MkCard from "./MkCard";
import { usePersonalCodesCtx } from "./PersonalCodes";
import ShowMore from "./ShowMore";

/**
 * "Money coming" (2026-10-25: replaced the free "Cash coming your way soon"
 * list). Everyone who isn't Premium gets the dividend-calendar promotion with
 * their own stakes — how many record dates are coming and how many are on
 * their own stocks; Premium readers get the rows, the calendar they paid for.
 * Server render + first paint are the promotion (the server knows no user).
 */
export default function MarketDividends({ items }: { items: MarketDividendEvent[] }) {
  const { isPremium } = usePremium();
  const { bn } = useLang();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (mounted && isPremium) return <DividendRows items={items} />;

  const today = todayDhaka();
  const open = items.filter((d) => {
    if (d.kind !== "record") return false;
    const info = recordDateInfo(d.date, today);
    return !info || info.buyDaysLeft >= 0;
  });
  const declared = items.filter((d) => d.kind === "declared").length;
  const mine = new Set<string>([...portfolio, ...watchlist]);
  const yours = new Set(items.map((d) => d.trading_code.toUpperCase()).filter((c) => mine.has(c))).size;

  const stakes = [
    open.length > 0
      ? bn
        ? `${open.length}টি কোম্পানির রেকর্ড ডেট সামনে — এখনো কেনা যায়`
        : `${open.length} record ${open.length === 1 ? "date is" : "dates are"} coming that you can still buy for`
      : null,
    yours > 0
      ? bn
        ? `এর মধ্যে ${yours}টি আপনার শেয়ার`
        : `${yours} of them ${yours === 1 ? "is" : "are"} on your own stocks`
      : null,
    declared > 0
      ? bn
        ? `${declared}টি নতুন ঘোষণা`
        : `${declared} new ${declared === 1 ? "declaration" : "declarations"}`
      : null,
  ].filter((s): s is string => !!s);

  return <DividendPromo stakes={stakes} />;
}

/** One dividend event → the row's figure, tone and detail lines. Days are
 *  counted from the Dhaka calendar date, with the same buy-by arithmetic as
 *  the stock page and /dividend-calendar. */
function dividendRow(d: MarketDividendEvent, today: Date) {
  let meta: string;
  let tone: RowTone;
  let dates: string;
  if (d.kind === "record") {
    const info = recordDateInfo(d.date, today);
    if (info) {
      if (info.buyDaysLeft > 0) {
        meta = `${info.buyDaysLeft} day${info.buyDaysLeft === 1 ? "" : "s"} left to buy`;
        tone = info.buyDaysLeft <= 3 ? "neg" : "pos";
      } else if (info.buyDaysLeft === 0) {
        meta = "Last day to buy";
        tone = "neg";
      } else {
        meta = "Too late to buy";
        tone = "neutral";
      }
      dates = `Record ${formatDate(d.date)} · buy by ${formatDate(isoLocal(info.buyBy))}`;
    } else {
      meta = "Cash date set";
      tone = "pos";
      dates = `Record ${formatDate(d.date)}`;
    }
  } else {
    meta = "Just announced";
    tone = "accent";
    dates = `Announced ${formatDate(d.date)} · record date not set yet`;
  }

  let cash: string | null = null;
  if (d.cash_per_share != null && d.cash_per_share >= 0.05) {
    cash = `৳${d.cash_per_share % 1 === 0 ? d.cash_per_share : d.cash_per_share.toFixed(2)} per share`;
    if (d.yield_pct != null && d.yield_pct > 0) cash += ` · ${d.yield_pct.toFixed(1)}% at today's price`;
  } else if (d.stock_pct != null && d.stock_pct > 0) {
    cash = `${d.stock_pct % 1 === 0 ? d.stock_pct : d.stock_pct.toFixed(1)}% bonus shares`;
  }

  return { meta, tone, cash, dates };
}

function DividendRows({ items }: { items: MarketDividendEvent[] }) {
  const today = todayDhaka();
  return (
    <MkCard
      title="Cash coming soon"
      bn="সামনে যেসব লভ্যাংশ আসছে"
      note="Own the share before the record date — normal buys take three trading days to land, so “buy by” is the day that matters."
      right={
        <Link href="/dividend-calendar" className="mk-link">
          Full calendar →
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="mk-empty">No cash dates coming up right now.</p>
      ) : (
        <ShowMore
          initial={4}
          noun="dividends"
          className="mk-rows"
          rows={items.map((d) => {
            const r = dividendRow(d, today);
            return (
              <MarketRow
                key={`${d.trading_code}-${d.date}`}
                code={d.trading_code}
                name={d.company_name}
                sector={d.sector}
                price={d.last_price}
                meta={r.meta}
                tone={r.tone}
                sub={
                  <>
                    {r.cash && <span className="block font-semibold text-text-main">{r.cash}</span>}
                    <span className="block">{r.dates}</span>
                  </>
                }
              />
            );
          })}
        />
      )}
    </MkCard>
  );
}
