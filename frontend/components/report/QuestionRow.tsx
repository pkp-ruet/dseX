"use client";

import type { ReactNode } from "react";
import { IconAlert, IconChevronDown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { SectionFoot, ToneChip, tx } from "@/components/report/chip";
import type { Bi, Tone } from "@/lib/stock-report";

/**
 * ONE question of a report (2026-10-30 rebuild; the stock report's — the
 * portfolio report used it too until its own leaner row, `PfQuestion` in
 * `components/portfolio/report/PfReportChapter.tsx`, 2026-11-04).
 *
 * The whole report is Premium (2026-11-01) and the page renders it inside
 * `ReportGate`, open, so a row has one layout (clean pass 2026-11-04): the
 * question (h3) and its one-word answer, the answer in one sentence, the
 * picture(s), the facts, ONE amber line on what to watch, then ONE clay tap
 * bar — "Why it matters, and the figures" — that folds what it means (the
 * general paragraphs) with the figures and their source. A row with no
 * figures keeps its source line outside. The locked and teaser layouts of
 * 2026-10-30 were deleted with the audit's dead-code pass (SP14, 2026-11-05).
 */
export default function QuestionRow({
  id,
  aliases = [],
  title,
  word,
  tone,
  picture,
  free,
  premiumPicture,
  headline,
  details,
  meaning = [],
  watch = null,
  source,
  action,
  anchorClass = "stock-anchor",
}: {
  /** Anchor id (`rp-<key>`). */
  id: string;
  /** Older anchors that should land here (`#results` …). */
  aliases?: string[];
  title: ReactNode;
  word: Bi | null;
  tone: Tone;
  /** The picture built on public figures. */
  picture?: ReactNode;
  /** Facts under the answer (dates, red flags named). */
  free?: ReactNode;
  /** A second picture, built on our figures. */
  premiumPicture?: ReactNode;
  /** The answer with its number. */
  headline: Bi | null;
  /** The figures, folded. */
  details?: ReactNode;
  meaning?: Bi[];
  watch?: Bi | null;
  source?: Bi | null;
  /** A control at the end of the source line (the share button). */
  action?: ReactNode;
  /** The scroll-margin class for this page's sticky stack. */
  anchorClass?: string;
}) {
  // ONE fold for why it matters and the figures, behind a tap bar that says
  // what it holds (2026-10-30, user: "Why we say this" was easy to miss;
  // 2026-11-04: the meaning moved in here too, so the open row stays short).
  const hasMeaning = meaning.length > 0;
  const hasFold = hasMeaning || !!details;
  const fold = hasFold ? (
    <details className="rq-why">
      <summary>
        <span className="rq-why-text">
          <b className="rq-why-closed">
            {hasMeaning && details ? (
              <T en="Why it matters, and the figures" bn="কেন জরুরি, আর সংখ্যাগুলো" />
            ) : hasMeaning ? (
              <T en="Why it matters" bn="কেন জরুরি" />
            ) : (
              <T en="See the figures" bn="সংখ্যাগুলো দেখুন" />
            )}
          </b>
          <b className="rq-why-opened"><T en="Hide the details" bn="বিস্তারিত লুকান" /></b>
          <span className="rq-why-hint">
            {hasMeaning && details ? (
              <T en="What it means for you, and the figures behind it" bn="আপনার জন্য এর মানে, আর এর পেছনের হিসাব" />
            ) : hasMeaning ? (
              <T en="What it means for you" bn="আপনার জন্য এর মানে" />
            ) : (
              <T en="The figures behind this answer, and where they come from" bn="যে হিসাব থেকে এই উত্তর, আর তথ্য কোথা থেকে নেওয়া" />
            )}
          </span>
        </span>
        <span className="rq-why-icon" aria-hidden="true">
          <IconChevronDown size={18} />
        </span>
      </summary>
      <div className="rq-why-body">
        {hasMeaning && (
          <div className="rq-why-meaning">
            {meaning.map((m, i) => (
              <p key={i} className="rq-explain-p">{tx(m)}</p>
            ))}
          </div>
        )}
        {details}
        {details && <SectionFoot source={tx(source)} action={action} />}
      </div>
    </details>
  ) : null;
  // The source sits under the fold's figures; with no figures it stays outside.
  const foot = !details && (source || action) ? <SectionFoot source={tx(source)} action={action} /> : null;

  // What to watch: one amber line, open (2026-11-04).
  const watchLine = watch ? (
    <p className="rq-watch">
      <span className="rq-watch-icon" aria-hidden="true">
        <IconAlert size={16} />
      </span>
      <span>{tx(watch)}</span>
    </p>
  ) : null;

  return (
    <section id={id} className={`rq ${anchorClass}`} aria-labelledby={`${id}-t`}>
      {aliases.map((a) => <span key={a} id={a} className={`${anchorClass} block`} aria-hidden="true" />)}
      <div className="rq-head">
        <h3 id={`${id}-t`}>{title}</h3>
        <span className="rq-chips">{word && <ToneChip word={word} tone={tone} />}</span>
      </div>
      {/* The answer leads; the pictures, the facts and one watch line follow,
          then the fold (why it matters + the figures). */}
      {headline && <p className="rq-answer">{tx(headline)}</p>}
      {picture && <div className="rq-pic">{picture}</div>}
      {premiumPicture && <div className="rq-pic">{premiumPicture}</div>}
      {free && <div className="rq-free">{free}</div>}
      {watchLine}
      {fold}
      {foot}
    </section>
  );
}
