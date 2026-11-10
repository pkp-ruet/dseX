"use client";

import Link from "@/components/ui/Link";
import type { MarketDividendEvent } from "@/lib/api";
import { money } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import MarketRow from "@/components/market-analysis/MarketRow";
import DividendDays from "@/components/dividend-calendar/DividendDays";
import { CALENDAR_PREMIUM_ANCHOR } from "@/components/dividend-calendar/RemindButton";
import AnswerLock from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { groupDays } from "@/lib/dividend-promo";

const ROWS = 4;
const LOCK_LINE = "কোন কোম্পানি, শেয়ারপ্রতি কত টাকা আর কেনার শেষ দিন কবে";

/**
 * "সামনে যাদের ডিভিডেন্ড রেকর্ড ডেট" on /share-bazar. Premium since 2026-11-04,
 * with the whole dividend calendar (user: "Lock those too"): a free reader
 * gets how many and the dates by day, in Bengali, no company; the rows sit
 * under one Premium line that opens the calendar's Premium card. The page is
 * a Bengali article for every reader, so the text here is Bengali only.
 */
export default function BazarDividends({ items }: { items: MarketDividendEvent[] }) {
  const premium = usePremiumOpen();
  if (items.length === 0) return null;
  const days = groupDays(items.map((d) => ({ date: d.date, cash: d.cash_per_share ?? 0 })));
  const n = new Set(items.map((d) => d.trading_code)).size;

  return (
    <section className="ms-card" style={{ marginTop: 16 }}>
      <h2 className="ms-section-title" style={{ marginBottom: 12 }}>সামনে যাদের ডিভিডেন্ড রেকর্ড ডেট</h2>

      {!premium && (
        <div className="bz-dv-free">
          <p className="ms-bn-text">
            সামনে {n}টি কোম্পানির ডিভিডেন্ডের রেকর্ড ডেট। কোন দিন কতগুলো:
          </p>
          <DividendDays days={days} shown={ROWS} only="bn" />
        </div>
      )}

      <AnswerLock
        variant="line"
        job="find"
        lock="bazar-dividends"
        href={`/dividend-calendar#${CALENDAR_PREMIUM_ANCHOR}`}
        what={{ en: "The dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" }}
        lines={[{ en: LOCK_LINE, bn: LOCK_LINE }]}
      >
        <div className="ms-srow-list">
          {items.slice(0, ROWS).map((d) => (
            <MarketRow
              key={`${d.trading_code}-${d.date}`}
              code={d.trading_code}
              name={d.company_name}
              sector={d.sector}
              price={d.last_price}
              meta={d.dividend_pct != null ? `নগদ ${d.dividend_pct}%` : d.stock_pct != null ? `বোনাস ${d.stock_pct}%` : "ডিভিডেন্ড"}
              tone="accent"
              sub={
                <>
                  রেকর্ড ডেট {bnDate(d.date)}
                  {d.buy_by ? <> · শেষ কেনার দিন {bnDate(d.buy_by)}</> : null}
                  {d.cash_per_share != null ? <> · শেয়ারপ্রতি {money(d.cash_per_share)}</> : null}
                </>
              }
            />
          ))}
        </div>
      </AnswerLock>

      <p className="ms-bn-note" style={{ marginTop: 12 }}>
        রেকর্ড ডেটে যার কাছে শেয়ার থাকবে, ডিভিডেন্ড সে-ই পাবে। সাধারণ বাজারে কেনা শেয়ার বিও অ্যাকাউন্টে আসতে দুই কর্মদিবস লাগে — তাই &ldquo;শেষ কেনার দিন&rdquo; রেকর্ড ডেটের আগে।{" "}
        <Link href="/dividend-calendar" className="ms-sector--link">পুরো ডিভিডেন্ড ক্যালেন্ডার</Link>
      </p>
    </section>
  );
}
