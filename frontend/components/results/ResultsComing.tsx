"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { UpcomingResult } from "@/lib/api";
import { T } from "@/components/i18n/T";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import AnswerLock, { Locked } from "@/components/premium/AnswerLock";
import { PersonalMark, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import { dayParts, daysWords } from "@/components/dividend-calendar/dates";
import { usePremium } from "@/lib/premium";

/** Rows shown before "Show all". */
const FIRST = 8;

/**
 * "Coming up" on /results (2026-10-29): every results meeting in the next two
 * weeks, read from DSE's board-meeting notices — one card per date (the
 * dividend calendar's date tile), the reader's own stocks first in each.
 * The date is free. What each report will be measured against — last year's
 * figure, the year so far, and the EPS where our Better / Weaker lines sit —
 * is Premium (`expect_*`, a screen-only `Locked` under each row, named once by
 * an `AnswerLock` line). Must render inside the page's `PersonalCodesProvider`.
 */
export default function ResultsComing({ rows }: { rows: UpcomingResult[] }) {
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  const [all, setAll] = useState(false);
  useEffect(() => setMounted(true), []);

  const mine = useMemo(() => new Set([...portfolio, ...watchlist].map((c) => c.toUpperCase())), [portfolio, watchlist]);
  const myCount = rows.filter((r) => mine.has(r.code)).length;

  // By date, the reader's stocks first inside each date.
  const groups = useMemo(() => {
    const out: { date: string; days: number; items: UpcomingResult[] }[] = [];
    for (const r of rows) {
      const last = out[out.length - 1];
      if (last && last.date === r.date) last.items.push(r);
      else out.push({ date: r.date, days: r.days, items: [r] });
    }
    for (const g of out) g.items.sort((a, b) => Number(mine.has(b.code)) - Number(mine.has(a.code)));
    return out;
  }, [rows, mine]);

  if (!rows.length) return null;

  // The first FIRST rows, whole dates where they fit.
  let left = all ? Infinity : FIRST;
  const visible = groups
    .map((g) => {
      const items = g.items.slice(0, Math.max(0, left));
      left -= items.length;
      return { ...g, items };
    })
    .filter((g) => g.items.length);
  const hidden = rows.length - visible.reduce((n, g) => n + g.items.length, 0);
  const anyExpect = rows.some((r) => r.expect_en.length);

  return (
    <section id="coming" className="rs-coming" aria-labelledby="coming-title">
      <SectionHeader
        id="coming-title"
        title={<T en="Results coming up" bn="যেসব ফল আসছে" />}
        lead={
          <T
            en={`${rows.length} companies have called a board meeting on their results in the next two weeks${mounted && myCount ? `, ${myCount} of them your stocks` : ""}. Results usually come out the same evening.`}
            bn={`আগামী দুই সপ্তাহে ${rows.length}টি কোম্পানি তাদের আর্থিক ফল নিয়ে পর্ষদ সভা ডেকেছে${mounted && myCount ? `, এর ${myCount}টি আপনার শেয়ার` : ""}। ফল সাধারণত সেদিন সন্ধ্যায় আসে।`}
          />
        }
      />

      {anyExpect && !(mounted && isPremium) && (
        <AnswerLock
          job="watch"
          variant="line"
          lock="Results: what to expect"
          what={{ en: "What to expect from each report", bn: "প্রতিটি প্রতিবেদন থেকে কী আশা করা যায়" }}
          lines={[{
            en: "Premium shows what each report will be measured against: last year's figure, the year so far, and the EPS where it turns Better or Weaker.",
            bn: "প্রিমিয়ামে দেখুন প্রতিটি প্রতিবেদন কিসের সঙ্গে মেলানো হবে: গত বছরের হিসাব, এ বছর এ পর্যন্ত, আর কোন ইপিএসে ফল ভালো বা দুর্বল ধরা হবে।",
          }]}
          className="rs-coming-lock"
        >
          {null}
        </AnswerLock>
      )}

      <div className="rs-coming-days">
        {visible.map((g) => {
          const p = dayParts(g.date);
          const when = daysWords(g.days);
          const total = groups.find((x) => x.date === g.date)?.items.length ?? g.items.length;
          return (
            <article key={g.date} className="soft-card dc-day">
              <div className="dc-day-head">
                <DateTile iso={g.date} soon={g.days <= 1} small />
                <div className="dc-day-text">
                  <p className="dc-day-title">
                    {p && <T en={p.weekday.en} bn={p.weekday.bn} />}
                    {when && (
                      <span className="dc-day-when">
                        {" · "}
                        <T en={when.en} bn={when.bn} />
                      </span>
                    )}
                  </p>
                </div>
                {total > 1 && (
                  <span className="dc-day-n">
                    <T en={`${total} companies`} bn={`${total}টি কোম্পানি`} />
                  </span>
                )}
              </div>
              <ul className="rs-list">
                {g.items.map((r) => (
                  <li key={`${r.code}-${r.purpose}`}>
                    <Link href={`/stock/${encodeURIComponent(r.code)}#results`} className="rs-row">
                      <span className="min-w-0">
                        <span className="rs-name">{r.name}</span>
                        <span className="rs-meta">
                          <span className="rs-code">{r.code}</span>
                          <PersonalMark code={r.code} />
                          <span className="rs-sep" aria-hidden="true">·</span>
                          <T en={r.label_en} bn={r.label_bn} />
                        </span>
                        {r.expect_en.length > 0 && (
                          <Locked as="span" className="rs-meaning">
                            <T en={r.expect_en.join(" ")} bn={(r.expect_bn.length ? r.expect_bn : r.expect_en).join(" ")} />
                          </Locked>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>

      {hidden > 0 && (
        <div className="rs-more">
          <Button variant="quiet" onClick={() => setAll(true)}>
            <T en={`Show all ${rows.length}`} bn={`সব ${rows.length}টি দেখুন`} />
          </Button>
        </div>
      )}
    </section>
  );
}
