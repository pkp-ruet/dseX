"use client";

import type { ScoreItem, SignalsToday } from "@/lib/api";
import StockRow from "@/components/ui/StockRow";
import TierPill from "@/components/ui/TierPill";
import SectionHeader from "@/components/ui/SectionHeader";
import RowLock from "@/components/premium/RowLock";
import LockPanel from "@/components/premium/LockPanel";
import { PersonalMark } from "@/components/market-analysis/PersonalCodes";
import { T } from "@/components/i18n/T";

type Almost = SignalsToday["almost"][number];

const PREVIEW = 2;

/**
 * "Almost on the list" (2026-10-31, Premium · Find): the Good and Excellent
 * companies kept off today's list by one thing, closest to coming in first,
 * each with that thing and — where the price is what keeps it off — the price
 * where it would come in. A waiting list of quality companies.
 *
 * Free readers get the count (the funnel above already names every reason)
 * and two masked rows; the row lock's button goes to the page's one Premium
 * card. A list of other companies, so it is the row lock, not an AnswerLock.
 */
export default function AlmostOnList({
  almost,
  rows,
}: {
  almost: Almost[];
  /** Score rows by code (name, price, change). */
  rows: Record<string, ScoreItem>;
}) {
  if (almost.length === 0) return null;
  const priced = almost.filter((a) => a.under != null).length;
  const byGroup = new Map<string, { n: number; en: string; bn: string }>();
  for (const a of almost) {
    const g = byGroup.get(a.group) ?? { n: 0, en: a.reason.en, bn: a.reason.bn };
    g.n += 1;
    byGroup.set(a.group, g);
  }
  const tiles = [
    ...(priced > 0
      ? [{ value: String(priced), label: { en: "with the price where they come in", bn: "কোন দামে আসবে তা সহ" } }]
      : []),
    ...[...byGroup.values()]
      .sort((a, b) => b.n - a.n)
      .slice(0, priced > 0 ? 2 : 3)
      .map((g) => ({ value: String(g.n), label: { en: g.en, bn: g.bn } })),
  ];

  return (
    <section id="almost" aria-labelledby="almost-h" className="sg-section scroll-mt-24">
      <SectionHeader
        id="almost-h"
        size="lg"
        title={<T en={`Almost on the list · ${almost.length}`} bn={`তালিকায় প্রায় · ${almost.length}`} />}
        lead={
          <T
            en="Good companies kept off today by one thing. The closest to coming in are first."
            bn="ভালো কোম্পানি, আজ একটি কারণে তালিকার বাইরে। যেগুলো আসার সবচেয়ে কাছে, সেগুলো আগে।"
          />
        }
      />
      <div className="soft-card sg-card">
        <RowLock
          preview={
            <ul className="sg-rows">
              {almost.slice(0, PREVIEW).map((a) => (
                <AlmostRow key={a.code} a={a} row={rows[a.code]} masked />
              ))}
            </ul>
          }
          panel={
            <LockPanel
              job="find"
              variant="full"
              inset
              title={{
                en: `See the ${almost.length} good companies almost on the list`,
                bn: `তালিকায় প্রায় ঢুকে যাওয়া ${almost.length}টি ভালো কোম্পানি দেখুন`,
              }}
              sub={{
                en: "Premium names each one, what keeps it off, and for the ones held back by price, the price where it would come in.",
                bn: "প্রিমিয়ামে প্রতিটির নাম, কেন বাদ পড়েছে, আর দামের কারণে যেগুলো বাদ, সেগুলো কোন দামে তালিকায় আসবে।",
              }}
              tiles={tiles}
              codes={almost.map((a) => a.code)}
              count={almost.length}
              lock="Buy signals: almost on the list"
              what={{ en: "Good companies almost on the buy list", bn: "কেনার তালিকায় প্রায় ঢুকে যাওয়া ভালো কোম্পানি" }}
              href="#sg-premium"
            />
          }
        >
          <ul className="sg-rows">
            {almost.map((a) => (
              <AlmostRow key={a.code} a={a} row={rows[a.code]} />
            ))}
          </ul>
        </RowLock>
      </div>
    </section>
  );
}

function AlmostRow({ a, row, masked = false }: { a: Almost; row?: ScoreItem; masked?: boolean }) {
  return (
    <StockRow
      code={a.code}
      name={row?.company_name}
      masked={masked}
      inset="bleed"
      className="sg-row"
      mark={<PersonalMark code={a.code} />}
      tags={<TierPill score={row?.score ?? a.score} />}
      sub={<T en={a.reason.en} bn={a.reason.bn} />}
      subTone="watch"
      // The line is the Premium answer (and its price would name the company).
      detail={a.line && !masked ? <T en={a.line.en} bn={a.line.bn} /> : undefined}
      price={row?.ltp}
      change={row?.change_pct}
    />
  );
}
