"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DividendPromo from "@/components/premium/DividendPromo";
import { useLang } from "@/context/LangContext";
import type { MarketDividendEvent } from "@/lib/api";
import { isoLocal, recordDateInfo, todayDhaka } from "@/lib/dividend-dates";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
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
        ? `সামনে ${open.length}টি কোম্পানির রেকর্ড ডেট, যার জন্য এখনো কেনা যায়`
        : `${open.length} record ${open.length === 1 ? "date is" : "dates are"} coming that you can still buy for`
      : null,
    yours > 0
      ? bn
        ? `এর মধ্যে ${yours}টি আপনার শেয়ার`
        : `${yours} of them ${yours === 1 ? "is" : "are"} on your own shares`
      : null,
    declared > 0
      ? bn
        ? `${declared}টি নতুন ঘোষণা`
        : `${declared} new ${declared === 1 ? "declaration" : "declarations"}`
      : null,
  ].filter((s): s is string => !!s);

  return <DividendPromo stakes={stakes} />;
}

/** One dividend event → the row's figure, tone and detail lines, in the
 *  reader's language (these rows show only after mount, for Premium readers).
 *  Days are counted from the Dhaka calendar date, with the same buy-by
 *  arithmetic as the stock page and /dividend-calendar. */
function dividendRow(d: MarketDividendEvent, today: Date, bn: boolean) {
  const day = (iso: string) => (bn ? bnDate(iso) : formatDate(iso));
  let meta: string;
  let tone: RowTone;
  let dates: string;
  if (d.kind === "record") {
    const info = recordDateInfo(d.date, today);
    if (info) {
      if (info.buyDaysLeft > 0) {
        meta = bn
          ? `কেনার আর ${info.buyDaysLeft} দিন বাকি`
          : `${info.buyDaysLeft} day${info.buyDaysLeft === 1 ? "" : "s"} left to buy`;
        tone = info.buyDaysLeft <= 3 ? "neg" : "pos";
      } else if (info.buyDaysLeft === 0) {
        meta = bn ? "আজ কেনার শেষ দিন" : "Last day to buy";
        tone = "neg";
      } else {
        meta = bn ? "কেনার সময় শেষ" : "Too late to buy";
        tone = "neutral";
      }
      dates = bn
        ? `রেকর্ড ডেট ${day(d.date)} · কিনতে হবে ${day(isoLocal(info.buyBy))}-এর মধ্যে`
        : `Record date ${day(d.date)} · buy by ${day(isoLocal(info.buyBy))}`;
    } else {
      meta = bn ? "রেকর্ড ডেট ঠিক হয়েছে" : "Record date set";
      tone = "pos";
      dates = bn ? `রেকর্ড ডেট ${day(d.date)}` : `Record date ${day(d.date)}`;
    }
  } else {
    meta = bn ? "সবে ঘোষণা" : "Just announced";
    tone = "accent";
    dates = bn
      ? `ঘোষণা ${day(d.date)} · রেকর্ড ডেট এখনো ঠিক হয়নি`
      : `Announced ${day(d.date)} · record date not set yet`;
  }

  let cash: string | null = null;
  if (d.cash_per_share != null && d.cash_per_share >= 0.05) {
    const ps = d.cash_per_share % 1 === 0 ? d.cash_per_share : d.cash_per_share.toFixed(2);
    cash = bn ? `শেয়ারপ্রতি ৳${ps}` : `৳${ps} per share`;
    if (d.yield_pct != null && d.yield_pct > 0)
      cash += bn ? ` · আজকের দামে ${d.yield_pct.toFixed(1)}%` : ` · ${d.yield_pct.toFixed(1)}% at today's price`;
  } else if (d.stock_pct != null && d.stock_pct > 0) {
    const pct = d.stock_pct % 1 === 0 ? d.stock_pct : d.stock_pct.toFixed(1);
    cash = bn ? `${pct}% বোনাস শেয়ার` : `${pct}% bonus shares`;
  }

  return { meta, tone, cash, dates };
}

function DividendRows({ items }: { items: MarketDividendEvent[] }) {
  const today = todayDhaka();
  const { bn } = useLang();
  return (
    <MkCard
      title={<T en="Dividends coming soon" bn="সামনের ডিভিডেন্ড" />}
      note={
        <T
          en="You need to own the share on the record date. A normal buy takes three trading days to settle, so the “buy by” day is the one that matters."
          bn="রেকর্ড ডেটে শেয়ারটি আপনার কাছে থাকতে হবে। সাধারণ কেনা নিষ্পত্তি হতে তিন লেনদেন দিন লাগে, তাই “কিনতে হবে” তারিখটিই আসল।"
        />
      }
      right={
        <Link href="/dividend-calendar" className="mk-link">
          <T en="Full calendar →" bn="পুরো ক্যালেন্ডার →" />
        </Link>
      }
    >
      {items.length === 0 ? (
        <p className="mk-empty">
          <T en="No dividend dates are coming up right now." bn="এই মুহূর্তে সামনে কোনো ডিভিডেন্ডের তারিখ নেই।" />
        </p>
      ) : (
        <ShowMore
          initial={4}
          noun="dividends"
          nounBn="ডিভিডেন্ড"
          className="mk-rows"
          rows={items.map((d) => {
            const r = dividendRow(d, today, bn);
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
