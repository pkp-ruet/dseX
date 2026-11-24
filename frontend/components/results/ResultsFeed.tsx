"use client";

import { useMemo } from "react";
import ListView from "@/components/lists/ListView";
import { Locked } from "@/components/premium/AnswerLock";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import type { LatestResultRow } from "@/lib/api";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER, epsTk, quarterLabel, resultMove } from "@/lib/results";
import { getTier } from "@/lib/constants";
import { SORT_NAME, SORT_PRICE, type ListChip, type ListRow, type ListSort } from "@/lib/lists";
import { useLang } from "@/context/LangContext";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";

const PAGE = 50;
type Level = LatestResultRow["level"];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Monday, 27 Oct 2026" — read as a calendar date, so no time zone can shift it. */
function enDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${WEEKDAYS[d.getUTCDay()]}, ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

const SORTS: ListSort[] = [
  { id: "date", label: { en: "Newest first", bn: "নতুনগুলো আগে" }, dir: "desc" },
  { id: "move", label: { en: "Profit grew most", bn: "মুনাফা সবচেয়ে বেশি বেড়েছে" }, dir: "desc" },
  SORT_PRICE,
  SORT_NAME,
];

const MOVE_TONE = { positive: "positive", negative: "negative", muted: "" } as const;

/**
 * Every company's latest report, newest first (redesigned clean 2026-10-28,
 * styles `rs-*` in app/styles/results.css). One bar shows how the reports
 * split. Since 2026-11-25 the list opens in THE list view (step 4 of the
 * simplify review; Results moved from Market to Lists): the level chips —
 * Better · Uneven · Weaker · About the same · Your shares (holdings ∪
 * watchlist, only when the reader has some) — then Sector · Share price ·
 * Sort by over the shared rows: company · level and which report · the EPS
 * line · price today · the profit move as the key figure. In its own order
 * (newest first) the rows sit under a heading per posting day.
 *
 * Free since 2026-10-29 (facts are free): every report and every filter
 * (`?level=good|watch|bad|neutral|mine` in the URL, as before). Premium adds
 * what each report means (one sentence under every row, a screen-only
 * `Locked`), named by the page's question card (`#rs-premium`).
 */
export default function ResultsFeed(props: { rows: LatestResultRow[]; counts: Record<Level, number> }) {
  return (
    <PersonalCodesProvider>
      <Feed {...props} />
    </PersonalCodesProvider>
  );
}

function Feed({ rows, counts }: { rows: LatestResultRow[]; counts: Record<Level, number> }) {
  const { bn } = useLang();
  const t = (en: string, b: string) => (bn ? b : en);
  const list = useMemo<ListRow<LatestResultRow>[]>(
    () =>
      rows.map((r) => {
        const move = resultMove(r);
        return {
          code: r.code,
          name: r.name,
          sector: r.sector,
          tier: r.score != null ? getTier(r.score) : null,
          price: r.price,
          change: r.change_pct,
          fig: { en: move.en, bn: move.bn, tone: MOVE_TONE[move.tone], words: move.words },
          sort: { date: r.post_date, move: r.eps_yoy_pct },
          tags: [r.level],
          hash: "#results",
          data: r,
        };
      }),
    [rows],
  );
  const chips: ListChip[] = RESULT_LEVEL_ORDER.map((lv) => ({
    id: lv,
    label: { en: RESULT_LEVEL[lv].short, bn: RESULT_LEVEL[lv].shortBn },
  }));

  const questions = resultQuestions(rows, counts);

  return (
    <div>
      <div className="rs-split" role="img" aria-label={t(
        `${counts.good ?? 0} better, ${counts.watch ?? 0} uneven, ${counts.bad ?? 0} weaker, ${counts.neutral ?? 0} about the same`,
        `${counts.good ?? 0}টি ভালো, ${counts.watch ?? 0}টি ভালো-মন্দ মেশানো, ${counts.bad ?? 0}টি দুর্বল, ${counts.neutral ?? 0}টি প্রায় আগের মতো`,
      )}>
        {RESULT_LEVEL_ORDER.map((lv) =>
          (counts[lv] ?? 0) > 0 ? (
            <span key={lv} className={`rs-lv--${lv}`} style={{ width: `${((counts[lv] ?? 0) / Math.max(1, rows.length)) * 100}%` }} />
          ) : null,
        )}
      </div>

      <p className="rs-key">
        <T
          en="EPS is profit per share for the months the report covers (3, 6 or 9, or the full year), next to the same months a year ago. The big figure is how much it changed. Tap a company for the full read."
          bn="ইপিএস মানে প্রতিবেদনের সময়ের (3, 6 বা 9 মাস, অথবা পুরো বছর) শেয়ারপ্রতি মুনাফা, পাশে এক বছর আগের একই সময়ের হিসাব। বড় সংখ্যাটি দেখায় কতটা বদলেছে। পুরো ব্যাখ্যা দেখতে কোম্পানিতে চাপ দিন।"
        />
      </p>

      <ListView
        id="results"
        track="results"
        rows={list}
        figHead={{ en: "Profit change", bn: "মুনাফার বদল" }}
        sorts={SORTS}
        defaultSort="date"
        chips={chips}
        chipParam="level"
        mineChip
        sync
        pageSize={PAGE}
        groupOf={(r) => ({ id: r.data!.post_date, title: { en: enDay(r.data!.post_date), bn: bnDate(r.data!.post_date, true) } })}
        renderLines={(r) => <ResultLines r={r.data!} />}
        empty={{
          title: { en: "No reports here", bn: "এখানে কোনো প্রতিবেদন নেই" },
          message: { en: "No company's latest report fits these choices right now.", bn: "এই বাছাইয়ে এখন কোনো কোম্পানির সর্বশেষ প্রতিবেদন নেই।" },
        }}
      />

      <PageQuestions
        id="rs-premium"
        area="results"
        className="mt-8"
        title={{ en: "Every report is free. Here is what it leaves open.", bn: "প্রতিটি প্রতিবেদন ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
        lead={{
          en: "Premium answers these in place: one plain sentence under every company on what its report means.",
          bn: "প্রিমিয়ামে এর উত্তর জায়গাতেই: প্রতিটি কোম্পানির নিচে এক লাইনে তার প্রতিবেদনের মানে।",
        }}
        rows={questions}
        label={{ en: "What each report means", bn: "প্রতিটি প্রতিবেদনের মানে" }}
      />
    </div>
  );
}

/** A report's own lines under the company: the level and which report, the
 *  EPS against a year ago, and (Premium, `Locked`) what it means. */
function ResultLines({ r }: { r: LatestResultRow }) {
  const lv = RESULT_LEVEL[r.level];
  const q = quarterLabel(r);
  const hasEps = r.eps_cum != null && r.eps_cum_prev != null;
  return (
    <span className="lv-lines">
      <span className="rs-meta">
        <span className={`rs-level rs-lv--${r.level}`}>
          <span className="rs-dot" aria-hidden="true" />
          <T en={lv.short} bn={lv.shortBn} />
        </span>
        <span className="rs-sep" aria-hidden="true">·</span>
        <T en={q.en} bn={q.bn} />
      </span>
      {hasEps ? (
        <span className="rs-eps">
          <span>
            <T en="EPS" bn="ইপিএস" /> <b>{epsTk(r.eps_cum!)}</b>
          </span>
          <span className="rs-sep" aria-hidden="true">·</span>
          <span>
            <T en="a year ago" bn="এক বছর আগে" /> <b>{epsTk(r.eps_cum_prev!)}</b>
          </span>
        </span>
      ) : r.profit_en || r.profit_bn ? (
        <span className="rs-fallback block">
          <T en={r.profit_en ?? ""} bn={r.profit_bn ?? ""} />
        </span>
      ) : null}
      {(r.meaning_en || r.pace) && (
        <Locked as="span" className="rs-meaning">
          {r.meaning_en && <T en={r.meaning_en} bn={r.meaning_bn || r.meaning_en} />}
          {r.pace && (
            <span className={`rs-pace rs-pace--${r.pace.word}`}>
              <T en={r.pace.headline_en} bn={r.pace.headline_bn} />{" "}
              <T en={r.pace.en} bn={r.pace.bn || r.pace.en} />
            </span>
          )}
        </Locked>
      )}
    </span>
  );
}

/** The page's question card rows, from today's counts. */
function resultQuestions(rows: LatestResultRow[], counts: Record<Level, number>): PageQuestion[] {
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
  return out;
}
