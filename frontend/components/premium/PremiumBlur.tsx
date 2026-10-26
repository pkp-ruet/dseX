"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLockScope } from "@/components/premium/LockScope";
import { IconLock } from "@/components/ui/icons";
import { usePremium, PREMIUM_PATH } from "@/lib/premium";
import { trackEvent } from "@/lib/track";

/**
 * Blur ONLY the data, in place (2026-10-26, user decision: "they must see all
 * parts, just the main data blurred"). Unlike `PremiumGate` it never clips
 * the content or hides the card around it: the card's title, note and
 * headings stay readable, the whole region keeps its real height, and one
 * "Unlock with Premium" button sits on top of the blur. The button opens the
 * page's one Premium section (`PageLockScope` anchor) or `/premium`.
 *
 * Screen-only like every lock (the text stays in the HTML). Premium readers,
 * and everyone on a scope marked `unlocked`, see it plain. `cta={false}` for
 * a second blurred region in the same card, so a card shows one button.
 */
export default function PremiumBlur({
  children,
  lang = "en",
  cta = true,
  area = "portfolio",
  className = "",
}: {
  children: ReactNode;
  lang?: "en" | "bn";
  cta?: boolean;
  /** For the tap event. */
  area?: string;
  className?: string;
}) {
  const { isPremium, state } = usePremium();
  const scope = useLockScope();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const locked = !(mounted && (isPremium || scope?.unlocked));
  const bn = lang === "bn";

  return (
    <div className={`premium-locked pf-blur ${className}`.trim()} data-locked={locked ? "true" : "false"}>
      <div
        className="pf-blur-body"
        aria-hidden={locked ? true : undefined}
        // Keyboard users shouldn't tab into controls under the blur.
        {...(locked ? { inert: true } : {})}
      >
        {children}
      </div>
      {locked && cta && (
        <div className="pf-blur-cta">
          <a
            href={scope?.anchor ? `#${scope.anchor}` : PREMIUM_PATH}
            className={`pf-blur-btn ${bn ? "font-bn" : ""}`}
            lang={bn ? "bn" : undefined}
            onClick={() => trackEvent("premium_lock_tap", { area, lock: "blur", state })}
          >
            <IconLock size={14} />
            {bn ? "প্রিমিয়ামে খুলুন" : "Unlock with Premium"}
          </a>
        </div>
      )}
    </div>
  );
}
