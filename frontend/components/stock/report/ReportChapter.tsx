import type { ReactNode } from "react";
import { T } from "@/components/i18n/T";
import StockChapter from "@/components/stock/StockChapter";
import { tx } from "@/components/stock/report/fmt";
import type { Bi } from "@/lib/stock-report";

/**
 * One of the report's four chapters (2026-10-30 rebuild): its question (h2)
 * and one lead line, then ONE card (2026-10-30, plan
 * https://claude.ai/artifact/KCBooTX7PK7a4PoKkcmoMP): the chapter's answer
 * (`head`: the grade, the price light), its written read under "In short",
 * and the question rows split by hairlines. The whole
 * report is Premium (2026-11-01, `ReportGate`), so nothing in here locks.
 */
export default function ReportChapter({
  id,
  title,
  lead,
  head,
  read,
  children,
}: {
  id: string;
  title: ReactNode;
  lead: ReactNode;
  head?: ReactNode;
  /** The chapter's read. */
  read?: Bi | null;
  children: ReactNode;
}) {
  return (
    <StockChapter id={id} fold={false} title={title} lead={lead}>
      <div className="rp-sheet rc">
        {(head || read) && (
          <div className="rc-top">
            {head}
            {read && (
              <div className="rc-sum">
                <p className="rc-sum-k">
                  <T en="In short" bn="সংক্ষেপে" />
                </p>
                <p className="rc-read">{tx(read)}</p>
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    </StockChapter>
  );
}
