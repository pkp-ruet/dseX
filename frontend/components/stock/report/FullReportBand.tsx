"use client";

import { useLockScope } from "@/components/premium/LockScope";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { DateT, tx } from "@/components/stock/report/fmt";
import { usePremium } from "@/lib/premium";
import type { StockReport } from "@/lib/stock-report";

/**
 * The full report's one mark (2026-10-30, the full report plan): a band above
 * the first chapter for a reader who sees every part — "Your full report on
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
    <T en={`Your full report on ${code}`} bn={`${code}-এর আপনার পূর্ণ রিপোর্ট`} />
  ) : scope?.reason === "key" ? (
    <T en={`Your free full report on ${code}`} bn={`${code}-এর আপনার ফ্রি পূর্ণ রিপোর্ট`} />
  ) : (
    <T en={`Today's free full report: ${code}`} bn={`আজকের ফ্রি পূর্ণ রিপোর্ট: ${code}`} />
  );
  const u = report.updated;
  return (
    <div className="rp-band" role="note">
      <span className="rp-band-icon" aria-hidden="true">
        <IconCrown size={20} />
      </span>
      <div className="min-w-0">
        <b>{title}</b>
        <span>
          {u && (
            <>
              <T en="Updated " bn="হালনাগাদ " />
              <DateT iso={u.date} />
              {", "}
              {tx(u.reason)}
              {" · "}
            </>
          )}
          <T en={`${questions} questions answered, each chapter read for you`} bn={`${questions}টি প্রশ্নের উত্তর, প্রতিটি অধ্যায় আপনার জন্য লেখা`} />
        </span>
      </div>
    </div>
  );
}
