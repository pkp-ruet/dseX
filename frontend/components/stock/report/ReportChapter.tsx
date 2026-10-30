"use client";

import type { ReactNode } from "react";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import StockChapter from "@/components/stock/StockChapter";
import Signpost from "@/components/report/Signpost";
import { tx } from "@/components/stock/report/fmt";
import type { Bi } from "@/lib/stock-report";

/**
 * One of the report's four chapters (2026-10-30 rebuild): its question (h2)
 * and one lead line, then ONE card (2026-10-30, plan
 * https://claude.ai/artifact/KCBooTX7PK7a4PoKkcmoMP): the chapter's answer
 * (`head`: the grade, the price light), its written read as the card's
 * opening paragraph (Premium, no box), the question rows split by hairlines,
 * and — for a reader without the full report — one gold footer saying what
 * the full report answers here, linking up to the Premium card under the
 * answer (`#ch-premium`).
 */
export default function ReportChapter({
  id,
  title,
  lead,
  head,
  read,
  signpost,
  children,
}: {
  id: string;
  title: ReactNode;
  lead: ReactNode;
  head?: ReactNode;
  /** The chapter's read (Premium). */
  read?: Bi | null;
  /** What the full report answers in this chapter (closed chapters only). */
  signpost?: Bi;
  children: ReactNode;
}) {
  const open = usePremiumOpen();
  const readEl = read ? <p className="rc-read">{tx(read)}</p> : null;

  return (
    <StockChapter id={id} fold={false} title={title} lead={lead}>
      <div className="rp-sheet rc">
        {(head || (open && readEl)) && (
          <div className="rc-top">
            {head}
            {open && readEl}
          </div>
        )}
        {children}
        {!open && readEl && <Locked>{readEl}</Locked>}
        {!open && signpost && <ChapterSignpost id={id} text={signpost} foot />}
      </div>
    </StockChapter>
  );
}

/** A closed chapter's one line: what the full report answers here,
 *  linking up to the Premium card under the answer. */
export function ChapterSignpost({ id, text, foot = false }: { id: string; text: Bi; foot?: boolean }) {
  return <Signpost text={text} href="#ch-premium" area="stock" lock={`report-${id}`} foot={foot} />;
}
