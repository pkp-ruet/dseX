"use client";

import Link from "next/link";
import type { MarketDividendEvent } from "@/lib/api";
import { isoLocal, recordDateInfo, todayDhaka } from "@/lib/dividend-dates";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { T } from "@/components/i18n/T";
import RowLock from "@/components/premium/RowLock";
import LockPanel, { type Pair } from "@/components/premium/LockPanel";
import { CALENDAR_PREVIEW_ROWS } from "@/lib/free-share";
import MarketRow, { type RowTone } from "./MarketRow";
import MkCard from "./MkCard";
import ShowMore from "./ShowMore";

/**
 * "Money coming": dividends coming up, market-wide. The rows are Premium
 * (2026-10-25: replaced the free "Cash coming your way soon" list). Since
 * 2026-10-28 a free reader sees the shared row lock instead of a promotion
 * card: the first rows with the company hidden — the cash a share, the yield,
 * the record date and the last day to buy all shown — then one line saying
 * how many dividends are behind it and how many are their own stocks. The
 * real rows stay in the HTML (screen-only); a Premium reader gets them all.
 */
export default function MarketDividends({ items }: { items: MarketDividendEvent[] }) {
  const today = todayDhaka();
  const row = (d: MarketDividendEvent, masked = false) => {
    const r = dividendRow(d, today);
    return (
      <MarketRow
        key={`${d.trading_code}-${d.date}`}
        code={d.trading_code}
        name={d.company_name}
        sector={d.sector}
        price={d.last_price}
        masked={masked}
        meta={<T en={r.meta.en} bn={r.meta.bn} />}
        tone={r.tone}
        sub={
          <>
            {r.cash && (
              <span className="block font-semibold text-text-main">
                <T en={r.cash.en} bn={r.cash.bn} />
              </span>
            )}
            <span className="block">
              <T en={r.dates.en} bn={r.dates.bn} />
            </span>
          </>
        }
      />
    );
  };
  const open = items.filter((d) => {
    if (d.kind !== "record") return false;
    const info = recordDateInfo(d.date, today);
    return !info || info.buyDaysLeft >= 0;
  }).length;
  const n = items.length;

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
      {n === 0 ? (
        <p className="mk-empty">
          <T en="No dividend dates are coming up right now." bn="এই মুহূর্তে সামনে কোনো ডিভিডেন্ডের তারিখ নেই।" />
        </p>
      ) : (
        <RowLock
          preview={<div className="mk-rows">{items.slice(0, CALENDAR_PREVIEW_ROWS.market).map((d) => row(d, true))}</div>}
          panel={
            <LockPanel job="find"
              title={
                open > 0
                  ? {
                      en: `See the companies behind ${n} coming ${n === 1 ? "dividend" : "dividends"}, ${open} you can still buy for`,
                      bn: `সামনের ${n}টি ডিভিডেন্ডের কোম্পানি দেখুন, এর ${open}টির জন্য এখনো কেনা যায়`,
                    }
                  : {
                      en: `See the companies behind ${n} coming ${n === 1 ? "dividend" : "dividends"}`,
                      bn: `সামনের ${n}টি ডিভিডেন্ডের কোম্পানি দেখুন`,
                    }
              }
              codes={items.map((d) => d.trading_code)}
              count={n}
              lock="Market analysis: money coming"
              what={{ en: "The full dividend calendar", bn: "পুরো ডিভিডেন্ড ক্যালেন্ডার" }}
            />
          }
        >
          <ShowMore initial={4} noun="dividends" nounBn="ডিভিডেন্ড" className="mk-rows" rows={items.map((d) => row(d))} />
        </RowLock>
      )}
    </MkCard>
  );
}

/** One dividend event → the row's figure, tone and detail lines, in both
 *  languages (the rows are server-rendered now, so no language ternaries).
 *  Days are counted from the Dhaka calendar date, with the same buy-by
 *  arithmetic as the stock page and /dividend-calendar. */
function dividendRow(d: MarketDividendEvent, today: Date) {
  const day = (iso: string): Pair => ({ en: formatDate(iso), bn: bnDate(iso) || formatDate(iso) });
  let meta: Pair;
  let tone: RowTone;
  let dates: Pair;
  if (d.kind === "record") {
    const info = recordDateInfo(d.date, today);
    const rec = day(d.date);
    if (info) {
      const by = day(isoLocal(info.buyBy));
      if (info.buyDaysLeft > 0) {
        meta = {
          en: `${info.buyDaysLeft} day${info.buyDaysLeft === 1 ? "" : "s"} left to buy`,
          bn: `কেনার আর ${info.buyDaysLeft} দিন বাকি`,
        };
        tone = info.buyDaysLeft <= 3 ? "neg" : "pos";
      } else if (info.buyDaysLeft === 0) {
        meta = { en: "Last day to buy", bn: "আজ কেনার শেষ দিন" };
        tone = "neg";
      } else {
        meta = { en: "Too late to buy", bn: "কেনার সময় শেষ" };
        tone = "neutral";
      }
      dates = {
        en: `Record date ${rec.en} · buy by ${by.en}`,
        bn: `রেকর্ড ডেট ${rec.bn} · কিনতে হবে ${by.bn}-এর মধ্যে`,
      };
    } else {
      meta = { en: "Record date set", bn: "রেকর্ড ডেট ঠিক হয়েছে" };
      tone = "pos";
      dates = { en: `Record date ${rec.en}`, bn: `রেকর্ড ডেট ${rec.bn}` };
    }
  } else {
    const ann = day(d.date);
    meta = { en: "Just announced", bn: "সবে ঘোষণা" };
    tone = "accent";
    dates = {
      en: `Announced ${ann.en} · record date not set yet`,
      bn: `ঘোষণা ${ann.bn} · রেকর্ড ডেট এখনো ঠিক হয়নি`,
    };
  }

  let cash: Pair | null = null;
  if (d.cash_per_share != null && d.cash_per_share >= 0.05) {
    const ps = d.cash_per_share % 1 === 0 ? d.cash_per_share : d.cash_per_share.toFixed(2);
    cash = { en: `৳${ps} per share`, bn: `শেয়ারপ্রতি ৳${ps}` };
    if (d.yield_pct != null && d.yield_pct > 0) {
      cash = {
        en: `${cash.en} · ${d.yield_pct.toFixed(1)}% at today's price`,
        bn: `${cash.bn} · আজকের দামে ${d.yield_pct.toFixed(1)}%`,
      };
    }
  } else if (d.stock_pct != null && d.stock_pct > 0) {
    const pct = d.stock_pct % 1 === 0 ? d.stock_pct : d.stock_pct.toFixed(1);
    cash = { en: `${pct}% bonus shares`, bn: `${pct}% বোনাস শেয়ার` };
  }

  return { meta, tone, cash, dates };
}
