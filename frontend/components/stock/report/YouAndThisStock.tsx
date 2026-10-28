"use client";

import { useMyStake } from "@/components/stock/YourPosition";
import { Locked, LockedPreview } from "@/components/stock/report/ReportSection";
import { Hidden, PartTag, numberLines } from "@/components/stock/report/preview";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { DateT, money, perShare } from "@/components/stock/report/fmt";
import { T } from "@/components/i18n/T";
import type { InsideLine, StockReport } from "@/lib/stock-report";

/** Fees on a DSE trade, each side (the portfolio's default estimate). */
const FEE = 0.004;

/**
 * "You and this stock" (2026-10-28) — only for a signed-in reader who holds
 * or follows the share. Their position is free; what it means for their own
 * money (the dividend on their shares, the break-even after fees, what buying
 * more does to their average) is Premium. Built on the client from the
 * portfolio the hero already loads; the backend adds nothing here.
 */
export default function YouAndThisStock({
  code, ltp, report, n,
}: {
  code: string;
  ltp: number | null;
  report: StockReport;
  n: number;
}) {
  const open = usePremiumOpen();
  const { isLoggedIn, mine, watched, meta } = useMyStake(code);
  if (!isLoggedIn || (!mine.length && !watched)) return null;

  const div = report.sections.dividend?.latest ?? null;
  const tax = (report.sections.dividend?.tax_pct ?? 10) / 100;
  const upcomingCash = div && div.upcoming && div.cash_ps != null && div.cash_ps > 0 ? div.cash_ps : null;
  const buyBelow = report.sections.price?.buy_below ?? null;

  const qty = mine.reduce((s, h) => s + (Number(h.qty) || 0), 0);
  const cost = mine.reduce((s, h) => s + (Number(h.qty) || 0) * (Number(h.buy_price) || 0), 0);
  const avg = qty > 0 ? cost / qty : null;
  const sig = mine.find((h) => h.signal && h.signal.signal !== "none")?.signal ?? null;

  const lines: { en: string; bn: string }[] = [];
  const inside: InsideLine[] = [];
  let freeLine: { en: string; bn: string };

  if (qty > 0 && avg != null) {
    freeLine = {
      en: `You own ${qty.toLocaleString("en-US")} shares at an average of ${money(avg)}.`,
      bn: `আপনার ${qty.toLocaleString("en-US")}টি শেয়ার আছে, গড় দাম ${money(avg)}।`,
    };
    if (upcomingCash != null) {
      const net = qty * upcomingCash * (1 - tax);
      lines.push({
        en: `Your ${qty.toLocaleString("en-US")} shares get about ${money(net)} after tax if you hold them on the record date.`,
        bn: `রেকর্ড ডেটে ধরে রাখলে আপনার ${qty.toLocaleString("en-US")}টি শেয়ারে কর কাটার পর প্রায় ${money(net)} পাবেন।`,
      });
      inside.push({ en: "The cash the coming dividend pays on your shares", bn: "আসন্ন ডিভিডেন্ডে আপনার শেয়ারে কত নগদ আসবে" });
    }
    const even = (avg * (1 + FEE)) / (1 - FEE);
    lines.push({
      en: `To come out even after fees, you need to sell above ${money(even)}${ltp != null ? (ltp >= even ? ". Today's price is above that." : ". Today's price is below that.") : "."}`,
      bn: `ফি বাদ দিয়ে সমান থাকতে হলে ${money(even)}-এর ওপরে বিক্রি করতে হবে${ltp != null ? (ltp >= even ? "। আজকের দাম তার ওপরে।" : "। আজকের দাম তার নিচে।") : "।"}`,
    });
    inside.push({ en: "Your break-even price after fees", bn: "ফি বাদ দিয়ে আপনার সমান থাকার দাম" });
    if (ltp != null && ltp > 0) {
      const more = Math.max(1, Math.round(qty / 4));
      const newAvg = (cost + more * ltp) / (qty + more);
      lines.push({
        en: `Buying ${more.toLocaleString("en-US")} more at today's ${money(ltp)} would move your average from ${money(avg)} to ${money(newAvg)}.`,
        bn: `আজকের ${money(ltp)} দামে আরও ${more.toLocaleString("en-US")}টি কিনলে আপনার গড় দাম ${money(avg)} থেকে হবে ${money(newAvg)}।`,
      });
      inside.push({ en: "What buying more would do to your average", bn: "আরও কিনলে আপনার গড় দাম কত হবে" });
    }
  } else {
    const base = meta?.price_at_add ?? null;
    const move = base != null && base > 0 && ltp != null ? ((ltp - base) / base) * 100 : null;
    freeLine = {
      en: `You follow this share${move != null ? `. It is ${move >= 0 ? "up" : "down"} ${Math.abs(move).toFixed(1)}% since you added it` : ""}.`,
      bn: `আপনি এই শেয়ারটি ফলো করছেন${move != null ? `। যোগ করার পর থেকে দাম ${Math.abs(move).toFixed(1)}% ${move >= 0 ? "বেড়েছে" : "কমেছে"}` : ""}।`,
    };
    if (ltp != null && ltp > 0) {
      const shares = Math.floor(10000 / ltp);
      if (shares > 0) {
        const cashPart = upcomingCash != null ? shares * upcomingCash * (1 - tax) : null;
        lines.push({
          en: `৳10,000 buys ${shares} shares today${cashPart != null ? `, and they would get about ${money(cashPart)} after tax on the record date` : ""}.`,
          bn: `আজ ৳10,000-এ ${shares}টি শেয়ার পাওয়া যায়${cashPart != null ? `, আর রেকর্ড ডেটে কর কাটার পর প্রায় ${money(cashPart)} পাওয়া যাবে` : ""}।`,
        });
        inside.push({ en: "What ৳10,000 buys today and the cash it would get", bn: "আজ ৳10,000-এ কী পাওয়া যায় আর কত নগদ আসবে" });
      }
    }
    if (buyBelow != null) {
      lines.push({
        en: `Our buy-below price is ${money(buyBelow)}${ltp != null ? (ltp <= buyBelow ? ", and today's price is under it." : `, ${(((ltp - buyBelow) / ltp) * 100).toFixed(0)}% under today's price.`) : "."} You can set an alert there in the price section.`,
        bn: `আমাদের কেনার সীমা ${money(buyBelow)}${ltp != null ? (ltp <= buyBelow ? ", আর আজকের দাম তার নিচে।" : `, আজকের দামের চেয়ে ${(((ltp - buyBelow) / ltp) * 100).toFixed(0)}% কম।`) : "।"} দামের অংশে সেখানে অ্যালার্ট দিতে পারেন।`,
      });
      inside.push({ en: "How far today's price is from our buy-below price", bn: "আজকের দাম আমাদের কেনার সীমা থেকে কত দূরে" });
    }
  }

  return (
    <section id="rp-you" className="soft-card rp-sec stock-anchor" aria-labelledby="rp-you-t">
      <div className="rp-head">
        <div className="flex min-w-0 items-start gap-3">
          <span className="rp-n" aria-hidden="true">{n}</span>
          <h3 id="rp-you-t" className="min-w-0 pt-0.5 text-lg font-bold leading-snug text-text-main sm:text-xl">
            <T en="You and this stock" bn="আপনি ও এই শেয়ার" />
          </h3>
        </div>
      </div>
      <p className="mt-3 text-base font-semibold leading-snug text-text-main">
        <T en={freeLine.en} bn={freeLine.bn} />
      </p>
      {sig && (
        <p className="mt-1 text-sm text-text-muted">
          <T en={sig.reason_en} bn={sig.reason_bn} />
        </p>
      )}
      {lines.length > 0 && (
        <Locked>
          <ul className="mt-3 grid gap-2">
            {lines.map((l, i) => (
              <li key={i} className="rp-note mt-0 text-sm leading-snug text-text-main">
                <T en={l.en} bn={l.bn} />
              </li>
            ))}
          </ul>
          {div?.record_date && upcomingCash != null && (
            <p className="mt-2 text-xs text-text-muted">
              <T en="Record date " bn="রেকর্ড ডেট " />
              <DateT iso={div.record_date} />
              {div.buy_by && (
                <>
                  {" · "}
                  <T en="last day to buy " bn="কেনার শেষ দিন " />
                  <DateT iso={div.buy_by} />
                </>
              )}
              {" · "}
              <T en={`${perShare(upcomingCash)} a share`} bn={`শেয়ারপ্রতি ${perShare(upcomingCash)}`} />
            </p>
          )}
        </Locked>
      )}
      {!open && inside.length > 0 && (() => {
        // One numbered row per Premium line: the line's own words, its figure grey.
        const numbered = numberLines("you", inside.map((l, i) => ({ ...l, part: `you${i + 1}` })), false);
        return (
          <LockedPreview
            lines={numbered}
            hasWatch={false}
            bare
            code={code}
            lock="you"
            preview={
              <ul className="rp-rows">
                {numbered.map((l, i) =>
                  // Free sample: the first line in full when there are two or more.
                  i === 0 && lines.length >= 2 ? (
                    <li key={l.n} className="text-sm">
                      <span className="min-w-0 text-text-main">
                        <T en={lines[0].en} bn={lines[0].bn} />
                        <PartTag part={l.at} />
                      </span>
                    </li>
                  ) : (
                    <li key={l.n} className="text-sm">
                      <span className="min-w-0 text-text-muted">
                        <T en={l.en} bn={l.bn} />
                        <PartTag part={l.at} />
                      </span>
                      <Hidden kind="tk" />
                    </li>
                  ),
                )}
              </ul>
            }
          />
        );
      })()}
      <p className="rp-source text-xs text-text-muted">
        <T
          en="From your portfolio and watchlist. Fees are our 0.4% a side estimate; dividend tax 10%."
          bn="আপনার পোর্টফোলিও আর ওয়াচলিস্ট থেকে। ফি প্রতি দিকে 0.4% ধরে হিসাব; ডিভিডেন্ডে কর 10%।"
        />
      </p>
    </section>
  );
}
