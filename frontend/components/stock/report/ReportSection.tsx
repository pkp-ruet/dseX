"use client";

import type { ReactNode } from "react";
import AnswerLock, { Locked } from "@/components/premium/AnswerLock";
import type { Bi } from "@/lib/stock-report";

/** Re-exported: the report's inline locks (rally banner) import it from here. */
export { Locked };

/**
 * A Premium box in the stock report with the report's wording — job
 * "understand", the link to the page's one offer (`#ch-premium`), its lines
 * as the questions it answers. Since the 2026-10-30 rebuild the question rows
 * lock in place and each chapter has one card (`ReportChapter`); this box is
 * left for the written analysis in the data room (`DeepAnalysisReport`).
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
  /** Open for everyone. */
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
      brief
      openClassName="rp-body"
    >
      {children}
    </AnswerLock>
  );
}

/** Re-exported: shared with the portfolio report. */
export { SectionFoot } from "@/components/report/chip";
