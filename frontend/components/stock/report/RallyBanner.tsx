"use client";

import { IconAlert } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { Locked } from "@/components/stock/report/ReportSection";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";
import { tx } from "@/components/stock/report/fmt";
import type { RallyWarning } from "@/lib/stock-report";

/**
 * The rumour-rally warning on the cover (2026-10-28, user decision: the
 * warning is free, the evidence Premium). Shown only when the backend found a
 * sharp run with no news from the company.
 */
export default function RallyBanner({ w }: { w: RallyWarning }) {
  const open = usePremiumOpen();
  return (
    <div className="rp-rally" data-level={w.level} role="note">
      <p className={`flex items-start gap-2 text-sm font-bold leading-snug ${w.level === "red" ? "text-negative" : "text-watch"}`}>
        <span className="mt-0.5 shrink-0"><IconAlert size={16} /></span>
        <span>{tx(w.headline)}</span>
      </p>
      {w.lines.length > 0 && (
        <>
          <Locked>
            <ul className="mt-2 grid gap-1 pl-6 text-sm text-text-main">
              {w.lines.map((l, i) => <li key={i} className="list-disc">{tx(l)}</li>)}
            </ul>
          </Locked>
          {!open && (
            <a href="#ch-premium" className="mt-1 inline-flex min-h-10 items-center pl-6 text-sm font-semibold text-primary-ink hover:underline">
              <T en="The evidence is in Premium" bn="প্রমাণগুলো প্রিমিয়ামে" /> <span aria-hidden="true">&nbsp;→</span>
            </a>
          )}
        </>
      )}
    </div>
  );
}
