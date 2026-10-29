"use client";

import type { ReactNode } from "react";
import { usePremiumOpen } from "@/components/premium/usePremiumOpen";

/**
 * THE lock for a list of other companies (2026-10-28, first on the dividend
 * calendar, then rankings, signals, results, the screener, the research
 * lists and "Picked for you" — the blur + "This is part of Premium" didn't
 * say what Premium shows).
 *
 * A free reader sees `preview` — the next locked rows with every figure but
 * the company hidden (each page's own row in a `masked` mode, using
 * `MaskedName`) — and `panel` (`LockPanel`): what's behind it in words and
 * counts, one button. The real rows are `children`: always in the HTML under
 * `.premium-locked` (screen-only, the selector the paywall JSON-LD names),
 * hidden while locked, shown in place for a Premium reader — the preview and
 * the panel go.
 *
 * Not for the reader's own stocks (portfolio, watchlist: hiding the name says
 * nothing there) or prose: those use `AnswerLock`. Server render and first paint are locked.
 */
export default function RowLock({
  preview,
  panel,
  className = "",
  children,
}: {
  preview?: ReactNode;
  panel: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const locked = !usePremiumOpen();
  return (
    <div className={`lk-lock ${className}`.trim()}>
      <div className="premium-locked" data-locked={locked ? "true" : "false"} data-preview="mask">
        <div className="premium-locked-body" aria-hidden={locked ? true : undefined} {...(locked ? { inert: true } : {})}>
          {children}
        </div>
      </div>
      {locked && preview}
      {locked && panel}
    </div>
  );
}
