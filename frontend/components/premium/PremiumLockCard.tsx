"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import Bn from "@/components/i18n/Bn";
import { IconLock } from "@/components/home/personalized/DashIcons";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

/**
 * The one "this is Premium" card. What it asks depends on the reader:
 * guest → sign up free · free account → try it free for a month · month used →
 * the plans (bKash / Nagad). The button always opens /premium (what's included +
 * the prices, `#pay` once the month is used); nothing starts from a lock.
 * `compact` is the one-line version for small spots
 * ("+3 more good signs").
 *
 * `stakes` are the reader's own numbers ("2 of your stocks have a warning")
 * — shown on the card, and handed to /premium (sessionStorage, see
 * lib/premium-context.ts) so that page opens on their reason. Every card
 * fires `premium_lock_view` once when it scrolls into view and
 * `premium_lock_tap` on the button, with the lock's label and page area.
 */
export default function PremiumLockCard({
  label,
  compact = false,
  stakes,
}: {
  /** What sits behind the lock, e.g. "The fair-value estimate". */
  label?: string;
  compact?: boolean;
  /** Up to three short lines about what this reader is missing, in their language. */
  stakes?: string[];
}) {
  const { bn } = useLang();
  const { state } = usePremium();
  const pathname = usePathname() || "/";
  const area = areaOf(pathname);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const lines = (stakes ?? []).filter(Boolean).slice(0, 3);

  useEffect(() => {
    const el = ref.current;
    if (!el || state === "premium" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock: label ?? "premium", state, stakes: lines.length });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, area, label]);

  if (state === "premium") return null;

  const title = bn
    ? "এটি প্রিমিয়ামের অংশ"
    : label
      ? `${label} is part of Premium`
      : "This is part of Premium";

  const line =
    state === "ended"
      ? { en: `Plans from ৳${LOWEST_PRICE}, paid by bKash or Nagad.`, bn: `৳${LOWEST_PRICE} থেকে প্ল্যান — bKash বা Nagad দিয়ে পেমেন্ট।` }
      : state === "guest"
        ? { en: "Open a free account, then try Premium free for 1 month.", bn: "বিনামূল্যে অ্যাকাউন্ট খুলুন, তারপর 1 মাস প্রিমিয়াম ফ্রি ব্যবহার করুন।" }
        : { en: "Try it free for 1 month. No payment needed.", bn: "1 মাস বিনামূল্যে ব্যবহার করুন। কোনো পেমেন্ট লাগবে না।" };

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock: label ?? "premium", state, stakes: lines.length });
    savePremiumContext({ from: area, label, stakes: lines });
  };

  // Always the Premium page first — what you get and what it will cost — never
  // a button that switches the month on from here.
  const action = (
    <Button
      href={state === "ended" ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH}
      onClick={onTap}
      size={compact ? "sm" : "md"}
    >
      {state === "ended" ? (bn ? "প্ল্যান দেখুন" : "See plans") : bn ? "প্রিমিয়ামে কী আছে" : "See Premium"}
    </Button>
  );

  if (compact) {
    return (
      <div ref={ref} className="premium-card premium-card-compact">
        <span className="premium-card-icon" aria-hidden="true"><IconLock size={14} /></span>
        <p className={`flex-1 text-sm text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
          {lines[0] ? `${lines[0]} · ` : label && !bn ? `${label} · ` : ""}{bn ? line.bn : line.en}
        </p>
        {action}
      </div>
    );
  }

  return (
    <div ref={ref} className="premium-card" role="note">
      <span className="premium-card-icon" aria-hidden="true"><IconLock size={18} /></span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
          {title}
        </p>
        {lines.length > 0 && (
          <ul className={`mt-1.5 mb-1 flex flex-col gap-1 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
            {lines.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-semibold text-text-main">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        )}
        {bn ? (
          <Bn className="text-sm text-text-muted">{line.bn}</Bn>
        ) : (
          <>
            <p className="text-sm text-text-muted">{line.en}</p>
            <Bn className="text-sm text-text-muted">{line.bn}</Bn>
          </>
        )}
      </div>
      <div className="premium-card-action">{action}</div>
    </div>
  );
}
