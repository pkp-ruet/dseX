"use client";

import type { ReactNode } from "react";
import { Locked } from "@/components/premium/AnswerLock";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import StockChapter from "@/components/stock/StockChapter";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { tx } from "@/components/stock/report/fmt";
import { usePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/track";
import type { Bi } from "@/lib/stock-report";

/**
 * One of the report's four chapters (2026-10-30 rebuild): its question (h2)
 * and one lead line, the chapter's written read (its answers put together,
 * the full report plan https://claude.ai/artifact/1TuJ9dvifeXTLzs5wVwk2Q),
 * an optional head (the grade on "Is it a good company?"), then the question
 * rows on one sheet.
 *
 * `free`: the chapter a free reader gets whole on every share
 * (`FREE_CHAPTER`), its read included. A closed chapter carries one gold
 * signpost under its title (`ChapterSignpost`) pointing back up to the page's
 * one Premium card (`#ch-premium`, under the answer) — no lock card of its
 * own (2026-10-30, plan https://claude.ai/artifact/UHZTK5nvUVrtzzmq6c2oSX).
 */
export default function ReportChapter({
  id,
  title,
  lead,
  head,
  read,
  free = false,
  signpost,
  children,
}: {
  id: string;
  title: ReactNode;
  lead: ReactNode;
  head?: ReactNode;
  /** The chapter's read (Premium unless `free`). */
  read?: Bi | null;
  free?: boolean;
  /** What the full report answers in this chapter (closed chapters only). */
  signpost?: Bi;
  children: ReactNode;
}) {
  const premiumOpen = usePremiumOpen();
  const { isPremium } = usePremium();
  const open = free || premiumOpen;
  const freeTag = free && !isPremium && (
    <span className="rq-tag">
      <IconCrown size={12} />
      <T en="Free on every share" bn="প্রতিটি শেয়ারে ফ্রি" />
    </span>
  );
  const readBox = read ? (
    <div className="rq-read">
      <div className="rq-read-head">
        <b><T en="Our read" bn="আমাদের মত" /></b>
        {freeTag}
      </div>
      <p>{tx(read)}</p>
    </div>
  ) : null;

  return (
    <StockChapter id={id} fold={false} title={title} lead={lead}>
      {!open && signpost && <ChapterSignpost id={id} text={signpost} />}
      {readBox && (open ? readBox : <Locked>{readBox}</Locked>)}
      {!readBox && freeTag && <p className="rq-freechap">{freeTag}</p>}
      {head}
      <div className="rp-sheet">{children}</div>
    </StockChapter>
  );
}

/** A closed chapter's one line: what the full report answers here, linking
 *  up to the Premium card under the answer. */
export function ChapterSignpost({ id, text }: { id: string; text: Bi }) {
  const { state } = usePremium();
  return (
    <a
      href="#ch-premium"
      className="rq-sign"
      onClick={() => trackEvent("premium_lock_tap", { area: "stock", lock: `report-${id}`, state, stakes: 0 })}
    >
      <span className="rq-sign-icon" aria-hidden="true"><IconCrown size={14} /></span>
      <span>{tx(text)}</span>
    </a>
  );
}
