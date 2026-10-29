"use client";

import type { ReactNode } from "react";
import AnswerLock, { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/PremiumMask";
import { T } from "@/components/i18n/T";
import type { Bi, SectionBase } from "@/lib/stock-report";
import { ToneChip, tx } from "@/components/stock/report/fmt";

/** Re-exported: the report's inline locks (scorecard, rally banner) import it from here. */
export { Locked };

/**
 * THE Premium part of a report section (2026-10-29, "whole or nothing"): the
 * shared `AnswerLock` with the report's wording — job "understand", the link
 * to the page's one offer (`#ch-premium`), the backend's `inside` lines as
 * its questions. A section's Premium answer always sits here, never mixed
 * into its free facts.
 */
export function PremiumPanel({
  lines,
  code,
  lock,
  sample = false,
  children,
}: {
  /** What the panel holds, said without the answer (closed state). */
  lines: Bi[];
  code: string;
  /** Analytics label: `report-<lock>`. */
  lock: string;
  /** Open for everyone: one of the report's free sample sections. */
  sample?: boolean;
  children: ReactNode;
}) {
  return (
    <AnswerLock
      lines={lines}
      job="understand"
      lock={`report-${lock}`}
      area="stock"
      what={{ en: `The full report on ${code}`, bn: `${code}-এর পূর্ণ রিপোর্ট` }}
      href="#ch-premium"
      sample={sample}
      openClassName="rp-body"
    >
      {children}
    </AnswerLock>
  );
}

/**
 * The head every report section shares: the question (h3) and its verdict
 * chip. Sections sit on their part's sheet, split by hairlines, so the head
 * carries no number, icon or box.
 */
export function SectionHead({ id, title, chip }: { id: string; title: ReactNode; chip?: ReactNode }) {
  return (
    <div className="rp-head">
      <h3 id={id} className="min-w-0 text-lg font-bold leading-snug text-text-main sm:text-xl">{title}</h3>
      {chip}
    </div>
  );
}

/** The quiet last line of a section: where the figures come from, and an
 *  optional control (the share button) at its end. */
export function SectionFoot({ source, action }: { source?: ReactNode; action?: ReactNode }) {
  if (!source && !action) return null;
  return (
    <div className="rp-foot">
      <p className="min-w-0 text-xs leading-snug text-text-muted">{source}</p>
      {action}
    </div>
  );
}

/**
 * THE section anatomy of the stock report (2026-10-29 calm pass): the
 * question and its verdict chip, the answer in one sentence right under it
 * (a free reader gets the free line instead), the free facts, then the rest
 * of the answer — the figures, what it means, what to watch — in the one
 * Premium panel, and the source line. Every section reads the same way:
 * question, answer, evidence.
 */
export default function ReportSection({
  s,
  code,
  free,
  children,
  action,
  aliases = [],
  sample = false,
}: {
  s: SectionBase;
  code: string;
  /** Free facts under the answer (public numbers, dates, red flags). */
  free?: ReactNode;
  /** The Premium body (charts, lists). */
  children?: ReactNode;
  /** A control for the foot line (the share button). */
  action?: ReactNode;
  /** Older anchors that should land on this section (`#results` …). */
  aliases?: string[];
  /** Open in full for everyone (`freeReportSections`). */
  sample?: boolean;
}) {
  const premiumOpen = usePremiumOpen();
  const open = sample || premiumOpen;
  const answer = <p className="rp-answer">{tx(s.headline)}</p>;
  return (
    <section id={`rp-${s.key}`} className="rp-sec stock-anchor" aria-labelledby={`rp-${s.key}-t`}>
      {aliases.map((id) => <span key={id} id={id} className="stock-anchor block" aria-hidden="true" />)}
      <SectionHead id={`rp-${s.key}-t`} title={tx(s.title)} chip={<ToneChip word={s.word} tone={s.tone} />} />

      {open ? answer : s.free_line && <p className="rp-answer">{tx(s.free_line)}</p>}

      {free && <div className="rp-free">{free}</div>}

      <PremiumPanel lines={s.inside} code={code} lock={s.key} sample={sample}>
        {!open && answer}
        {children}
        {s.meaning.length > 0 && (
          <div className="rp-meaning">
            {s.meaning.map((m, i) => (
              <p key={i} className="text-sm leading-relaxed text-text-main sm:text-base">{tx(m)}</p>
            ))}
          </div>
        )}
        {s.watch && (
          <div className="rp-watch">
            <p className="text-xs font-bold text-text-muted">
              <T en="What to watch" bn="যা খেয়াল রাখবেন" />
            </p>
            <p className="mt-0.5 text-sm leading-snug text-text-main">{tx(s.watch)}</p>
          </div>
        )}
      </PremiumPanel>

      <SectionFoot source={tx(s.source)} action={action} />
    </section>
  );
}
