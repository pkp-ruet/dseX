"use client";

import { useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { DateT, tx } from "@/components/stock/report/fmt";
import { usePremium } from "@/lib/premium";
import type { StockReport } from "@/lib/stock-report";

/**
 * The full report's one mark (2026-10-30, the full report plan; a heading
 * since 2026-11-04): above the first chapter for a reader who sees every part — "Your full report on
 * SQURPHARMA · updated 27 Oct 2026, after the FY2026 results · 14 questions
 * answered". The sections themselves carry no Premium labels (rule of
 * 2026-10-29). Nothing for a free reader: the answer card says what the free
 * report is.
 */
export default function FullReportBand({ code, report, questions }: { code: string; report: StockReport; questions: number }) {
  const open = usePremiumOpen();
  const { isPremium } = usePremium();
  const scope = useLockScope();
  if (!open) return null;
  const title = isPremium ? (
    <T en={`Your full report on ${code}`} bn={`${code} নিয়ে আপনার পূর্ণ রিপোর্ট`} />
  ) : scope?.reason === "key" ? (
    <T en={`Your free full report on ${code}`} bn={`${code} নিয়ে আপনার ফ্রি পূর্ণ রিপোর্ট`} />
  ) : (
    <T en={`Today's free full report: ${code}`} bn={`আজকের ফ্রি পূর্ণ রিপোর্ট: ${code}`} />
  );
  const badge = isPremium ? (
    <T en="Premium" bn="প্রিমিয়াম" />
  ) : scope?.reason === "key" ? (
    <T en="Your free report" bn="আপনার ফ্রি রিপোর্ট" />
  ) : (
    <T en="Free today" bn="আজ ফ্রি" />
  );
  const u = report.updated;
  // A heading, not a gold box (2026-11-04, the clean pass): badge, title, one line.
  return (
    <header className="rpb">
      <span className="rpb-badge">
        <IconCrown size={14} />
        {badge}
      </span>
      <h2 className="rpb-title">{title}</h2>
      <p className="rpb-sub">
        {u && (
          <>
            <T en="Updated " bn="হালনাগাদ " />
            <DateT iso={u.date} />
            {", "}
            {tx(u.reason)}
            {" · "}
          </>
        )}
        <T en={`${questions} questions answered`} bn={`${questions}টি প্রশ্নের উত্তর`} />
      </p>
    </header>
  );
}
