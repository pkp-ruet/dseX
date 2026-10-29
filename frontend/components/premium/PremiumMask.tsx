"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLockScope } from "@/components/premium/LockScope";
import { T } from "@/components/i18n/T";
import { usePremium } from "@/lib/premium";

/** True once the reader may see Premium content here: a Premium reader, or a
 *  page the lock scope opened for everyone (the free report of the day).
 *  False on the server and the first paint — the server knows no user. */
export function usePremiumOpen(): boolean {
  const { isPremium } = usePremium();
  const scope = useLockScope();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted && (isPremium || !!scope?.unlocked);
}

const WIDTHS = ["92%", "78%", "86%", "64%", "72%"];

/**
 * The stock page's lock (2026-10-27): a free reader sees a few calm
 * placeholder bars — never the real text blurred — and the answer itself is
 * hidden. Still screen-only like `AnswerLock`: the children stay in the HTML
 * under `.premium-locked`, the selector the paywall JSON-LD names.
 */
export default function PremiumMask({
  children,
  lines = 2,
  className = "",
}: {
  children: ReactNode;
  /** How many placeholder bars stand in for the answer. */
  lines?: number;
  className?: string;
}) {
  const open = usePremiumOpen();
  const locked = !open;

  return (
    <div className={`premium-locked ${className}`.trim()} data-locked={locked ? "true" : "false"} data-preview="mask">
      <div
        className="premium-locked-body"
        aria-hidden={locked ? true : undefined}
        {...(locked ? { inert: true } : {})}
      >
        {children}
      </div>
      {locked && (
        <div className="premium-mask">
          <span className="sr-only">
            <T en="In Premium" bn="প্রিমিয়ামে" />
          </span>
          {Array.from({ length: lines }, (_, i) => (
            <span key={i} aria-hidden="true" className="premium-mask-line" style={{ width: WIDTHS[i % WIDTHS.length] }} />
          ))}
        </div>
      )}
    </div>
  );
}
