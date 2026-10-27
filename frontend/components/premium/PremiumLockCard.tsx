"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";
import { T } from "@/components/i18n/T";
import { IconLock } from "@/components/home/personalized/DashIcons";
import { useLang } from "@/context/LangContext";
import type { Lang } from "@/lib/lang";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { areaOf, savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

/**
 * Lock text: an `{en, bn}` pair (rendered as `<T>`, so the server HTML is
 * right for both languages and nothing flashes) or a plain string a caller
 * already picked for the reader's language.
 */
export type LockText = string | { en: string; bn: string };

/** The English of a lock text — for tracking labels. */
export function lockEn(t: LockText): string {
  return typeof t === "string" ? t : t.en;
}

/** A lock text as one plain string in `lang` — for sessionStorage. */
export function lockString(t: LockText, lang: Lang): string {
  return typeof t === "string" ? t : t[lang];
}

/** A lock text on screen. */
export function LockLine({ text }: { text: LockText }) {
  return typeof text === "string" ? <>{text}</> : <T en={text.en} bn={text.bn} />;
}

/**
 * The one "this is Premium" card. What it asks depends on the reader:
 * guest → sign up free, then Premium · free account → the plans (bKash /
 * Nagad). The button always opens /premium (what's included + the prices).
 * `compact` is the one-line version for small spots
 * ("+3 more good signs").
 *
 * `stakes` are the reader's own numbers ("2 of your stocks have a warning")
 * — shown on the card, and handed to /premium (sessionStorage, see
 * lib/premium-context.ts) in the reader's language at tap time, so that page
 * opens on their reason. Every card fires `premium_lock_view` once when it
 * scrolls into view and `premium_lock_tap` on the button, with the lock's
 * English label and page area.
 */
export default function PremiumLockCard({
  label,
  compact = false,
  stakes,
}: {
  /** What sits behind the lock, e.g. "The fair-value estimate". */
  label?: LockText;
  compact?: boolean;
  /** Up to three short lines about what this reader is missing. */
  stakes?: LockText[];
}) {
  const { lang } = useLang();
  const { state } = usePremium();
  const pathname = usePathname() || "/";
  const area = areaOf(pathname);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(false);
  const lines = (stakes ?? []).filter((s) => (typeof s === "string" ? s : s.en)).slice(0, 3);
  const lockName = label ? lockEn(label) : "premium";

  useEffect(() => {
    const el = ref.current;
    if (!el || state === "premium" || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area, lock: lockName, state, stakes: lines.length });
        io.disconnect();
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, area, lockName]);

  if (state === "premium") return null;

  const title = !label ? (
    <T en="This is part of Premium" bn="এটি প্রিমিয়ামের অংশ" />
  ) : typeof label === "string" ? (
    <T en={`${label} is part of Premium`} bn="এটি প্রিমিয়ামের অংশ" />
  ) : (
    <T en={`${label.en} is part of Premium`} bn={`${label.bn} প্রিমিয়ামের অংশ`} />
  );

  const line =
    state === "guest" ? (
      <T
        en={`Open a free account, then choose Premium from ৳${LOWEST_PRICE}.`}
        bn={`একটি ফ্রি অ্যাকাউন্ট খুলুন, তারপর ৳${LOWEST_PRICE} থেকে প্রিমিয়াম নিন।`}
      />
    ) : (
      <T
        en={`Premium starts at ৳${LOWEST_PRICE}, paid by bKash or Nagad.`}
        bn={`প্রিমিয়াম ৳${LOWEST_PRICE} থেকে, বিকাশ বা নগদে পেমেন্ট।`}
      />
    );

  const onTap = () => {
    trackEvent("premium_lock_tap", { area, lock: lockName, state, stakes: lines.length });
    savePremiumContext({
      from: area,
      label: label ? lockString(label, lang) : undefined,
      stakes: lines.map((s) => lockString(s, lang)),
    });
  };

  // Always the Premium page first — what you get and what it costs.
  const action = (
    <Button href={PREMIUM_PATH} onClick={onTap} size={compact ? "sm" : "md"}>
      <T en="See Premium" bn="প্রিমিয়াম দেখুন" />
    </Button>
  );

  if (compact) {
    return (
      <div ref={ref} className="premium-card premium-card-compact">
        <span className="premium-card-icon" aria-hidden="true"><IconLock size={14} /></span>
        <p className="flex-1 text-sm text-text-main">
          {lines[0] ? (
            <>
              <LockLine text={lines[0]} />
              {" · "}
            </>
          ) : label ? (
            <>
              <LockLine text={label} />
              {" · "}
            </>
          ) : null}
          {line}
        </p>
        {action}
      </div>
    );
  }

  return (
    <div ref={ref} className="premium-card" role="note">
      <span className="premium-card-icon" aria-hidden="true"><IconLock size={18} /></span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-text-main">{title}</p>
        {lines.length > 0 && (
          <ul className="mt-1.5 mb-1 flex flex-col gap-1">
            {lines.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm font-semibold text-text-main">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>
                  <LockLine text={s} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-text-muted">{line}</p>
      </div>
      <div className="premium-card-action">{action}</div>
    </div>
  );
}
