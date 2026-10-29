"use client";
import type { DeepAnalysisReport as Report, DeepAnalysisSection, FairValue } from "@/lib/api";
import Markdown from "@/lib/markdown";
import ValueTodayBox from "@/components/stock/ValueTodayBox";
import AnswerLock from "@/components/premium/AnswerLock";
import { PremiumPanel } from "@/components/stock/report/ReportSection";
import type { Bi } from "@/lib/stock-report";
import { T, TBlock } from "@/components/i18n/T";
import { useLang } from "@/context/LangContext";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

interface Props {
  report: Report;
  fairValue: FairValue | null;
  /** Set inside the stock report: the locked parts use its Premium panel. */
  code?: string;
}

/** The locked parts, named for the closed Premium panel (three lines at most). */
function restLines(rest: DeepAnalysisSection[]): Bi[] {
  const titles = rest.map((s) => {
    const en = s.title_en ?? s.title_bn ?? "";
    return { en, bn: s.title_bn ?? en };
  }).filter((t) => t.en);
  if (titles.length <= 3) return titles;
  const more = titles.length - 2;
  return [...titles.slice(0, 2), { en: `And ${more} more parts`, bn: `আরও ${more}টি অংশ` }];
}

// Bull case reads positive, bear case negative; everything else uses the brand accent.
function accentFor(key: string): string {
  if (key === "bull_case") return "border-positive";
  if (key === "bear_case") return "border-negative";
  return "border-primary";
}

/** Both halves of a report field; the Bengali falls back to the English. */
const pair = (en: string | null | undefined, bn: string | null | undefined) => {
  const e = en ?? bn ?? "";
  return <T en={e} bn={bn ?? e} />;
};

export default function DeepAnalysisReport({ report, fairValue, code }: Props) {
  // The page language comes from the navbar switch; every text below carries
  // both languages (`<T>`), so only labels in attributes read `bn` here.
  const { bn } = useLang();
  // Inside the stock report the note is one chapter of the page (its h2 is
  // the chapter title): no label, no second h1, no contents list.
  const embedded = !!code;
  const H = embedded ? "h3" : "h2";

  const sectionBody = (s: DeepAnalysisSection) => (
    <TBlock
      en={<Markdown text={s.body_en ?? s.body_bn ?? ""} className="text-base" />}
      bn={<Markdown text={s.body_bn ?? s.body_en ?? ""} className="text-base" />}
    />
  );

  const renderSection = (s: (typeof report.sections)[number], i: number) => {
    const accent = accentFor(s.key);
    const isValuation = s.key === "valuation";
    return (
      <section key={s.key} className="stock-anchor" id={`sec-${s.key}`}>
        <div className="flex items-baseline gap-2.5 mb-2">
          <span className="text-xs font-bold tabular-nums shrink-0 text-text-muted">
            {String(i + 1).padStart(2, "0")}
          </span>
          <H className="text-lg sm:text-xl font-bold leading-snug text-text-main">{pair(s.title_en, s.title_bn)}</H>
        </div>

        {/* Takeaway — the one line a skimmer should remember */}
        <p className={`text-base font-semibold leading-snug mb-3 pl-3 border-l-[3px] text-text-main ${accent}`}>
          {pair(s.takeaway_en, s.takeaway_bn)}
        </p>

        {isValuation ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
            <div>{sectionBody(s)}</div>
            {fairValue && (
              <div className="hidden lg:block lg:sticky lg:top-28">
                <ValueTodayBox fairValue={fairValue} />
              </div>
            )}
          </div>
        ) : (
          sectionBody(s)
        )}
      </section>
    );
  };

  return (
    <article>
      {!embedded && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-xs font-semibold text-primary-ink">
            <T en="In-depth analysis" bn="বিস্তারিত বিশ্লেষণ" />
          </span>
        </div>
      )}

      {/* Thesis in ~20 seconds: headline + bottom line */}
      {embedded ? (
        <p className="text-xl sm:text-2xl font-bold leading-snug mb-3 text-text-main">
          {pair(report.headline_en, report.headline_bn)}
        </p>
      ) : (
        <h1 className="text-2xl sm:text-3xl font-bold leading-snug mb-4 text-text-main">
          {pair(report.headline_en, report.headline_bn)}
        </h1>
      )}
      <p className="text-base sm:text-lg leading-relaxed mb-6 text-text-muted">
        {pair(report.bottom_line_en, report.bottom_line_bn)}
      </p>

      {/* Live value box up top on mobile so the price read is never buried;
          it also appears beside the valuation section on wider screens. */}
      {fairValue && (
        <div className="lg:hidden mb-6">
          <ValueTodayBox fairValue={fairValue} />
        </div>
      )}

      {report.as_of_date && (
        <p className="text-xs mb-6 text-text-muted">
          <T
            en={`Figures as of ${formatDate(report.as_of_date)}`}
            bn={`তথ্য ${bnDate(report.as_of_date) || report.as_of_date} পর্যন্ত`}
          />
        </p>
      )}

      {(report.data_note_en || report.data_note_bn) && (
        <div className="rounded-xl p-4 mb-6 text-sm leading-snug bg-surface-2 border border-border text-text-muted">
          {pair(report.data_note_en, report.data_note_bn)}
        </div>
      )}

      {/* Contents — the sections are a real sequence, so they're numbered */}
      {!embedded && report.sections.length > 2 && (
        <nav aria-label={bn ? "সূচিপত্র" : "Contents"} className="mb-8 border-y border-border py-4">
          <p className="mb-1 text-xs font-semibold text-text-muted">
            <T en="In this report" bn="এই রিপোর্টে" />
          </p>
          <ol className="grid grid-cols-1 list-decimal gap-x-6 pl-5 text-sm sm:grid-cols-2">
            {report.sections.map((s) => (
              <li key={s.key} className="marker:text-text-muted">
                <a href={`#sec-${s.key}`} className="inline-flex min-h-10 items-center text-text-main hover:text-primary-ink">
                  {pair(s.title_en, s.title_bn)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* The 10 durable sections, all expanded, takeaway as the lead line.
          The first is free; the rest are Premium (screen-only AnswerLock). */}
      <div className="space-y-8">
        {report.sections.slice(0, 1).map((s, i) => renderSection(s, i))}
      </div>
      {report.sections.length > 1 && (code ? (
        // Inside the stock report: the rest sits in the report's one Premium
        // panel, named by its part titles.
        <div className="mt-8">
          <PremiumPanel lines={restLines(report.sections.slice(1))} code={code} lock="note">
            <div className="space-y-8">
              {report.sections.slice(1).map((s, i) => renderSection(s, i + 1))}
            </div>
          </PremiumPanel>
        </div>
      ) : (
        <AnswerLock
          job="understand"
          lock="Analyst note"
          what={{ en: "The rest of this report", bn: "বাকি বিশ্লেষণ" }}
          lines={restLines(report.sections.slice(1))}
          className="mt-8"
        >
          <div className="space-y-8">
            {report.sections.slice(1).map((s, i) => renderSection(s, i + 1))}
          </div>
        </AnswerLock>
      ))}

      {/* Fine print */}
      {(report.disclaimer_en || report.disclaimer_bn) && (
        <p className="text-xs leading-snug mt-10 pt-6 text-text-muted border-t border-border">
          {pair(report.disclaimer_en, report.disclaimer_bn)}
        </p>
      )}
    </article>
  );
}
