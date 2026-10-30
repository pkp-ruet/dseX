"use client";

import { useEffect, useMemo, useState } from "react";
import Chip from "@/components/ui/Chip";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import { PersonalCodesProvider, usePersonalCodesCtx } from "@/components/market-analysis/PersonalCodes";
import type { LatestResultRow, UpcomingResult } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER } from "@/lib/results";
import { usePremium } from "@/lib/premium";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";
import { useUrlParams, useUrlSync } from "@/lib/use-url-state";
import ResultRow from "./ResultRow";
import ResultsComing from "./ResultsComing";

const PAGE = 50;
type Level = LatestResultRow["level"];
type Filter = "all" | "mine" | Level;
const FILTERS: Filter[] = ["all", "mine", ...RESULT_LEVEL_ORDER];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Monday, 27 Oct 2026" — read as a calendar date, so no time zone can shift it. */
function enDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Rows grouped by the day they were posted (rows arrive newest first). */
function byDay(rows: LatestResultRow[]): { day: string; items: LatestResultRow[] }[] {
  const groups: { day: string; items: LatestResultRow[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.day === r.post_date) last.items.push(r);
    else groups.push({ day: r.post_date, items: [r] });
  }
  return groups;
}

/**
 * Every company's latest quarterly report, newest first, grouped by the day
 * it was posted (redesigned clean 2026-10-28, styles `rs-*` in
 * app/styles/results.css). One bar shows how the reports split; the chips
 * filter: All · My stocks (holdings ∪ watchlist) · Better · Mixed · Weaker ·
 * About the same. Each row taps through to the stock page's results card.
 *
 * Free since 2026-10-29 (the Free vs Premium plan — facts are free): every
 * report and the level filters (in the URL, `?level=good|watch|bad|neutral|mine`);
 * the My stocks filter too since 2026-10-31 (the Premium Desk plan). Premium
 * adds what each report means (one sentence under every row, a screen-only
 * `Locked` in `ResultRow`), named by the page's question card (`#rs-premium`).
 */
export default function ResultsFeed({
  coming = [],
  ...props
}: { rows: LatestResultRow[]; counts: Record<Level, number>; coming?: UpcomingResult[] }) {
  return (
    <PersonalCodesProvider>
      {coming.length > 0 && <ResultsComing rows={coming} />}
      {coming.length > 0 && (
        <SectionHeader
          title={<T en="Latest reports" bn="সর্বশেষ প্রতিবেদন" />}
          lead={<T en="What came out, newest first." bn="যা প্রকাশ হয়েছে, নতুনগুলো আগে।" />}
        />
      )}
      <Feed {...props} coming={coming} />
    </PersonalCodesProvider>
  );
}

function Feed({ rows, counts, coming }: { rows: LatestResultRow[]; counts: Record<Level, number>; coming: UpcomingResult[] }) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const { isLoading, state } = usePremium();
  const { portfolio, watchlist } = usePersonalCodesCtx();
  const urlParams = useUrlParams();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setMounted(true), []);

  // A shared `?level=` opens that filter.
  useEffect(() => {
    if (!urlParams || isLoading) return;
    const lv = urlParams.get("level");
    if (lv && (FILTERS as string[]).includes(lv)) setFilter(lv as Filter);
  }, [urlParams, isLoading]);
  useUrlSync({ level: filter === "all" ? null : filter }, urlParams !== null && !isLoading);

  const mine = useMemo(() => {
    const codes = new Set([...portfolio, ...watchlist]);
    return rows.filter((r) => codes.has(r.code.toUpperCase()));
  }, [rows, portfolio, watchlist]);
  const signedIn = state !== "guest";

  const rowsFor = (f: Filter) => (f === "all" ? rows : f === "mine" ? mine : rows.filter((r) => r.level === f));
  const countFor = (f: Filter) => (f === "all" ? rows.length : f === "mine" ? mine.length : counts[f] ?? 0);
  const filtered = rowsFor(filter);
  const dayCount: Record<string, number> = {};
  for (const r of filtered) dayCount[r.post_date] = (dayCount[r.post_date] ?? 0) + 1;

  const label = (f: Filter) =>
    f === "all" ? { en: "All", bn: "সব" }
      : f === "mine" ? { en: "My stocks", bn: "আমার শেয়ার" }
        : { en: RESULT_LEVEL[f].short, bn: RESULT_LEVEL[f].shortBn };

  const choose = (f: Filter) => {
    if (f === filter) return;
    setFilter(f);
    setShown(PAGE);
  };

  // ---- the list ----
  const list = (items: LatestResultRow[]) => (
    <div>
      {byDay(items).map((g) => (
        <section key={g.day} className="rs-day" aria-label={enDay(g.day)}>
          <h2 className="rs-day-head">
              <T en={enDay(g.day)} bn={bnDate(g.day, true)} />
              <span className="rs-day-n">
                <T
                  en={`${dayCount[g.day]} ${dayCount[g.day] === 1 ? "report" : "reports"}`}
                  bn={`${dayCount[g.day]}টি প্রতিবেদন`}
                />
              </span>
            </h2>
          <ul className="soft-card rs-list">
            {g.items.map((r) => (
              <li key={r.code}>
                <ResultRow r={r} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );

  let body;
  if (filtered.length === 0) {
    body =
      filter === "mine" && !signedIn ? (
        <EmptyState
          className="mt-6"
          title={<T en="Sign in to see your stocks here" bn="আপনার শেয়ার এখানে দেখতে সাইন ইন করুন" />}
          message={
            <T
              en="A free account keeps your watchlist and portfolio, and this filter shows only their results."
              bn="ফ্রি অ্যাকাউন্টে আপনার ওয়াচলিস্ট আর পোর্টফোলিও থাকে, আর এই ফিল্টারে শুধু সেগুলোর ফল দেখায়।"
            />
          }
          actions={[
            { href: "/register", label: <T en="Create a free account" bn="ফ্রি অ্যাকাউন্ট খুলুন" /> },
            { href: "/login", label: <T en="Sign in" bn="সাইন ইন" /> },
          ]}
        />
      ) : filter === "mine" ? (
        <EmptyState
          className="mt-6"
          title={<T en="None of your stocks has a report here" bn="আপনার কোনো শেয়ারের প্রতিবেদন এখানে নেই" />}
          message={
            <T
              en="When a company you own or follow posts its results, it shows here."
              bn="আপনার কেনা বা অনুসরণ করা কোনো কোম্পানি আর্থিক ফল প্রকাশ করলে তা এখানে দেখাবে।"
            />
          }
          actions={[
            { href: "/watchlist", label: <T en="Build your watchlist" bn="ওয়াচলিস্ট বানান" /> },
            { href: "/portfolio", label: <T en="Add your portfolio" bn="পোর্টফোলিও যোগ করুন" /> },
          ]}
        />
      ) : (
        <EmptyState
          className="mt-6"
          title={<T en="No reports here" bn="এখানে কোনো প্রতিবেদন নেই" />}
          message={
            <T
              en="No company's latest report falls in this group right now."
              bn="এই ভাগে এখন কোনো কোম্পানির সর্বশেষ প্রতিবেদন নেই।"
            />
          }
        />
      );
  } else {
    // Every report, for every reader (2026-10-29: facts are free), 50 at a time.
    body = (
      <>
        {list(filtered.slice(0, shown))}
        {filtered.length > shown && (
          <div className="rs-more">
            <Button variant="quiet" onClick={() => setShown((n) => n + PAGE)}>
              <T
                en={`Show more (${filtered.length - shown} left)`}
                bn={`আরও দেখুন (${filtered.length - shown}টি বাকি)`}
              />
            </Button>
          </div>
        )}
      </>
    );
  }

  const questions = resultQuestions(rows, counts, coming);

  return (
    <div>
      <div className="rs-split" role="img" aria-label={t(
        `${counts.good ?? 0} better, ${counts.watch ?? 0} mixed, ${counts.bad ?? 0} weaker, ${counts.neutral ?? 0} about the same`,
        `${counts.good ?? 0}টি ভালো, ${counts.watch ?? 0}টি মিশ্র, ${counts.bad ?? 0}টি দুর্বল, ${counts.neutral ?? 0}টি প্রায় আগের মতো`,
      )}>
        {RESULT_LEVEL_ORDER.map((lv) =>
          (counts[lv] ?? 0) > 0 ? (
            <span key={lv} className={`rs-lv--${lv}`} style={{ width: `${((counts[lv] ?? 0) / Math.max(1, rows.length)) * 100}%` }} />
          ) : null,
        )}
      </div>

      <div className="rs-filters" role="group" aria-label={t("Filter results", "ফল বাছাই")}>
        {FILTERS.map((f) => {
          const l = label(f);
          const isLevel = f !== "all" && f !== "mine";
          const showCount = f !== "mine" || (mounted && signedIn);
          return (
            <Chip
              key={f}
              active={filter === f}
              onClick={() => choose(f)}
              icon={isLevel ? <span className={`rs-dot rs-lv--${f}`} /> : undefined}
            >
              <T en={l.en} bn={l.bn} />
              {showCount && <span className="rs-chip-n">{countFor(f)}</span>}
            </Chip>
          );
        })}
      </div>

      <p className="rs-key">
        <T
          en="EPS is profit per share for the months the report covers (3, 6 or 9, or the full year), next to the same months a year ago. The big figure is how much it changed. Tap a company for the full read."
          bn="ইপিএস মানে প্রতিবেদনের সময়ের (3, 6 বা 9 মাস, অথবা পুরো বছর) শেয়ারপ্রতি মুনাফা, পাশে এক বছর আগের একই সময়ের হিসাব। বড় সংখ্যাটি দেখায় কতটা বদলেছে। পুরো ব্যাখ্যা দেখতে কোম্পানিতে চাপ দিন।"
        />
      </p>

      {body}

      <PageQuestions
        id="rs-premium"
        area="results"
        className="mt-8"
        title={{ en: "Every report is free. Here is what it leaves open.", bn: "প্রতিটি প্রতিবেদন ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
        lead={{
          en: "Premium answers these in place: one plain sentence under every company, and what to expect before each meeting.",
          bn: "প্রিমিয়ামে এর উত্তর জায়গাতেই: প্রতিটি কোম্পানির নিচে এক লাইনে মানে, আর প্রতিটি সভার আগে কী আশা করা যায়।",
        }}
        rows={questions}
        label={{ en: "What each report means", bn: "প্রতিটি প্রতিবেদনের মানে" }}
      />
    </div>
  );
}

/** The page's question card rows, from today's counts. */
function resultQuestions(rows: LatestResultRow[], counts: Record<Level, number>, coming: UpcomingResult[]): PageQuestion[] {
  const out: PageQuestion[] = [];
  if (rows.length > 0) {
    out.push({
      key: "means",
      fact: { en: `${rows.length} reports`, bn: `${rows.length}টি প্রতিবেদন` },
      ask: { en: "What does each one mean for the share?", bn: "প্রতিটির মানে শেয়ারটির জন্য কী?" },
      hint: { en: "One plain sentence under every company.", bn: "প্রতিটি কোম্পানির নিচে এক লাইনে।" },
    });
  }
  const paced = rows.filter((r) => r.pace).length;
  if (paced > 0) {
    out.push({
      key: "pace",
      fact: { en: `${paced} with a latest quarter to judge`, bn: `${paced}টির সর্বশেষ প্রান্তিক বিচার করা যায়` },
      ask: { en: "Did the latest 3 months beat the year's own pace?", bn: "সর্বশেষ 3 মাস কি বছরের নিজের গতিকে ছাড়িয়েছে?" },
      hint: { en: "Above, below or in line with how the year had been going.", bn: "বছর যেভাবে চলছিল, তার চেয়ে ভালো, খারাপ নাকি একই রকম।" },
    });
  }
  const weak = counts.bad ?? 0;
  if (weak > 0) {
    out.push({
      key: "weak",
      fact: { en: `${weak} weaker than a year ago`, bn: `${weak}টি গত বছরের চেয়ে দুর্বল` },
      tone: "bad",
      ask: { en: "A bad quarter, or the start of a slide?", bn: "একটি খারাপ প্রান্তিক, নাকি পতনের শুরু?" },
      hint: { en: "What the profit, the cash and the latest quarter say together.", bn: "মুনাফা, নগদ আর সর্বশেষ প্রান্তিক মিলিয়ে কী বলে।" },
    });
  }
  const withExpect = coming.filter((c) => c.better_above != null || c.weaker_below != null).length;
  if (coming.length > 0) {
    out.push({
      key: "coming",
      fact: { en: `${coming.length} meetings in 2 weeks`, bn: `2 সপ্তাহে ${coming.length}টি সভা` },
      ask: { en: "What must each company show?", bn: "প্রতিটি কোম্পানিকে কী দেখাতে হবে?" },
      hint: withExpect
        ? { en: `The profit line for Better or Weaker, on ${withExpect} of them.`, bn: `${withExpect}টির ভালো বা দুর্বল হওয়ার মুনাফার সীমা।` }
        : undefined,
    });
  }
  return out;
}
