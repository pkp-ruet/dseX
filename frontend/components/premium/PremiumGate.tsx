"use client";

import { useEffect, useState, type ReactNode } from "react";
import PremiumLockCard from "@/components/premium/PremiumLockCard";
import { usePremium } from "@/lib/premium";

/**
 * THE premium lock. Screen-only by design (user decision, 2026-10): the
 * children always render — so the text stays in the HTML Google reads, marked
 * by the `.premium-locked` selector the paywall JSON-LD points at — and a free
 * reader sees the top of it faded (or blurred) with the lock card below.
 *
 * Server render and first client paint are locked (the server knows no user);
 * premium readers unlock right after mount.
 */
export default function PremiumGate({
  children,
  label,
  preview = "fade",
  peek,
  compact = false,
  stakes,
  className = "",
}: {
  children: ReactNode;
  /** What's behind the lock, shown on the card ("The fair-value estimate"). */
  label?: string;
  /** fade = top of the content readable, then faded · blur = blurred shape only. */
  preview?: "fade" | "blur";
  /** How much stays visible, in px. Defaults: fade 120, blur 160. */
  peek?: number;
  /** One-line lock card. */
  compact?: boolean;
  /** The reader's own stakes, shown on the lock card (see PremiumLockCard). */
  stakes?: string[];
  className?: string;
}) {
  const { isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const locked = !(mounted && isPremium);

  return (
    <div className={`premium-locked ${className}`.trim()} data-locked={locked ? "true" : "false"} data-preview={preview}>
      <div
        className="premium-locked-body"
        aria-hidden={locked ? true : undefined}
        style={locked ? { maxHeight: `${peek ?? (preview === "blur" ? 160 : 120)}px` } : undefined}
        // Keyboard users shouldn't tab into links under the lock.
        {...(locked ? { inert: true } : {})}
      >
        {children}
      </div>
      {locked && <PremiumLockCard label={label} compact={compact} stakes={stakes} />}
    </div>
  );
}
