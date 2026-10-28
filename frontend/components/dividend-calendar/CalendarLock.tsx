"use client";

import type { ReactNode } from "react";
import { usePremiumOpen } from "@/components/premium/PremiumMask";

/**
 * The dividend calendar's lock (2026-10-28 — replaced the blurred rows and the
 * one grey "In Premium" line, which didn't say what Premium shows).
 *
 * A free reader sees `preview` — the next locked rows with every figure but
 * the company hidden (`DividendRow masked`) — and `panel` (`LockPanel`):
 * what's behind it in words and counts, one button. The real rows are
 * `children`: always in the HTML under `.premium-locked` (screen-only, the
 * selector the page's paywall JSON-LD names), hidden while locked, shown in
 * place for a Premium reader — the preview and the panel go.
 *
 * Server render and first paint are locked (the server knows no user).
 */
export default function CalendarLock({
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
    <div className={`dc-lock ${className}`.trim()}>
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
