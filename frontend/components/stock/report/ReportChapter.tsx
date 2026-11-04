import type { ReactNode } from "react";
import { ToneChip, tx } from "@/components/stock/report/fmt";
import type { Bi, Tone } from "@/lib/stock-report";

/** A chapter's answer in its header: the chip and one plain line. */
export interface ChapterAnswer {
  word: Bi;
  tone: Tone;
  note?: Bi | null;
}

/**
 * One of the report's four chapters (2026-10-30 rebuild), ONE card each.
 * Clean pass 2026-11-04 (user: the Premium report is "full of text and
 * unorganized"): the chapter's question is the card's title, its answer chip
 * and one line sit under it — the grade, the price light, anything wrong,
 * what's next — then the question rows split by hairlines. The lead line and
 * the "In short" read are gone: both repeated what the rows say. The whole
 * report is Premium (2026-11-01, `ReportGate`), so nothing in here locks.
 */
export default function ReportChapter({
  id,
  title,
  answer,
  children,
}: {
  id: string;
  title: ReactNode;
  answer?: ChapterAnswer | null;
  children: ReactNode;
}) {
  return (
    <section id={id} className="stock-anchor rpc" aria-labelledby={`${id}-h`}>
      <div className="rp-sheet rc">
        <header className="rc-head">
          <h2 id={`${id}-h`} className="rc-title">{title}</h2>
          {answer && (
            <div className="rc-answer">
              <ToneChip word={answer.word} tone={answer.tone} size="lg" />
              {answer.note && <span className="rc-sub">{tx(answer.note)}</span>}
            </div>
          )}
        </header>
        {children}
      </div>
    </section>
  );
}
