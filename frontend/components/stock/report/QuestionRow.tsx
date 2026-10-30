"use client";

import type { ReactNode } from "react";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconChevronDown, IconLock } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { SectionFoot } from "@/components/stock/report/ReportSection";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import { usePremium } from "@/lib/premium";
import type { Bi, Tone } from "@/lib/stock-report";

/**
 * ONE question of the stock report (2026-10-30 rebuild): the question (h3)
 * and its one-word answer, a small picture, the answer in one sentence, what
 * it means and what to watch, then the figures folded under "See the
 * figures". Every row on the page reads the same way.
 *
 * Free / Premium, whole or nothing: a free reader gets the question, the
 * word, the free picture (public figures), the free line and the free facts.
 * The Premium picture, the answer, the explanation and the figures stay in
 * the HTML under `Locked` (hidden). What the full report adds is said once,
 * in the Premium card under the answer, and each closed chapter points back
 * to it in one line (`ReportChapter`). A row of the free chapter (`sample`)
 * is open for everyone.
 *
 * Fundamentals (2026-10-30, plan https://claude.ai/artifact/KCBooTX7PK7a4PoKkcmoMP):
 * a row with `teaser` is closed down to its question — plus its one-word
 * answer for `teaser="word"`, else a lock — and nothing else; everything
 * stays in the HTML under `Locked`. The open sample wears "Free sample".
 *
 * The full report (2026-10-30, plan
 * https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q): an open row shows its
 * explanation in the open — a Premium reader paid for it — and folds only
 * the figures and the source.
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
  freeLine,
  details,
  meaning = [],
  watch = null,
  source,
  action,
  sample = false,
  allFree = false,
  teaser,
}: {
  /** Anchor id (`rp-<key>`). */
  id: string;
  /** Older anchors that should land here (`#results` …). */
  aliases?: string[];
  title: ReactNode;
  word: Bi | null;
  tone: Tone;
  /** The free picture: public figures only. */
  picture?: ReactNode;
  /** Free facts under the answer (dates, red flags named). */
  free?: ReactNode;
  /** A picture built on our figures (Premium). */
  premiumPicture?: ReactNode;
  /** The answer with its number (Premium unless `allFree`). */
  headline: Bi | null;
  /** The free reader's line. */
  freeLine?: Bi | null;
  /** The figures (Premium), folded. */
  details?: ReactNode;
  meaning?: Bi[];
  watch?: Bi | null;
  source?: Bi | null;
  /** A control at the end of the source line (the share button). */
  action?: ReactNode;
  /** A row of the free chapter: open for everyone. */
  sample?: boolean;
  /** Built only from public figures: nothing on this row is Premium. */
  allFree?: boolean;
  /** Closed, show only the question and the answer word ("word") or a lock. */
  teaser?: "word" | "lock";
}) {
  const premiumOpen = usePremiumOpen();
  const { isPremium } = usePremium();
  const open = (allFree && !teaser) || sample || premiumOpen;
  const compact = !open && !!teaser;

  const explain =
    meaning.length > 0 || watch ? (
      <div className="rq-explain">
        {meaning.map((m, i) => (
          <p key={i} className="text-sm leading-relaxed text-text-main sm:text-base">{tx(m)}</p>
        ))}
        {watch && (
          <div className="rp-watch">
            <p className="text-xs font-bold text-text-muted">
              <T en="What to watch" bn="যা খেয়াল রাখবেন" />
            </p>
            <p className="mt-0.5 text-sm leading-snug text-text-main">{tx(watch)}</p>
          </div>
        )}
      </div>
    ) : null;

  // The figures, folded behind a tap bar that says what it holds (2026-10-30,
  // user: "Why we say this" was easy to miss).
  const figures = details ? (
    <details className="rq-why">
      <summary>
        <span className="rq-why-text">
          <b className="rq-why-closed"><T en="See the figures" bn="সংখ্যাগুলো দেখুন" /></b>
          <b className="rq-why-opened"><T en="Hide the figures" bn="সংখ্যাগুলো বন্ধ করুন" /></b>
          <span className="rq-why-hint">
            <T en="The figures behind this answer, and where they come from" bn="এই উত্তরের পেছনের সংখ্যা, আর সেগুলো কোথা থেকে" />
          </span>
        </span>
        <span className="rq-why-icon" aria-hidden="true">
          <IconChevronDown size={18} />
        </span>
      </summary>
      <div className="rq-why-body">
        {details}
        <SectionFoot source={tx(source)} action={action} />
      </div>
    </details>
  ) : source || action ? (
    <SectionFoot source={tx(source)} action={action} />
  ) : null;

  return (
    <section id={id} className="rq stock-anchor" data-compact={compact ? "true" : undefined} aria-labelledby={`${id}-t`}>
      {aliases.map((a) => <span key={a} id={a} className="stock-anchor block" aria-hidden="true" />)}
      <div className="rq-head">
        <h3 id={`${id}-t`}>{title}</h3>
        <span className="rq-chips">
          {sample && !isPremium && teaser && (
            <span className="rq-tag"><T en="Free sample" bn="ফ্রি নমুনা" /></span>
          )}
          {compact && teaser === "lock" ? (
            <span className="rq-lockchip">
              <IconLock size={14} />
              <T en="Premium" bn="প্রিমিয়াম" />
            </span>
          ) : (
            word && <ToneChip word={word} tone={tone} />
          )}
        </span>
      </div>
      {compact && (
        <Locked>
          {word && teaser === "lock" && <ToneChip word={word} tone={tone} />}
          {picture && <div className="rq-pic">{picture}</div>}
          {premiumPicture && <div className="rq-pic">{premiumPicture}</div>}
          {headline && <p className="rq-answer">{tx(headline)}</p>}
          {free && <div className="rq-free">{free}</div>}
          {explain}
          {details}
        </Locked>
      )}

      {!compact && picture && <div className="rq-pic">{picture}</div>}

      {compact ? null : open ? (
        <>
          {premiumPicture && <div className="rq-pic">{premiumPicture}</div>}
          {headline && <p className="rq-answer">{tx(headline)}</p>}
          {free && <div className="rq-free">{free}</div>}
          {explain}
          {figures}
        </>
      ) : (
        <>
          {freeLine && <p className="rq-answer">{tx(freeLine)}</p>}
          {free && <div className="rq-free">{free}</div>}
          {(premiumPicture || headline || explain || details) && (
            <Locked>
              {premiumPicture && <div className="rq-pic">{premiumPicture}</div>}
              {headline && <p className="rq-answer">{tx(headline)}</p>}
              {explain}
              {details}
            </Locked>
          )}
        </>
      )}
    </section>
  );
}
