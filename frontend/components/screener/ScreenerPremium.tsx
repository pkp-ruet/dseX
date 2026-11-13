"use client";

import { useEffect, useRef } from "react";
import Button from "@/components/ui/Button";
import { IconCrown } from "@/components/ui/icons";
import { T } from "@/components/i18n/T";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LangContext";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

export const SCREENER_ANCHOR = "sc-premium";

/**
 * The screener's ONE Premium card (`#sc-premium`), where the shares would be
 * for a reader without Premium. Kept to the count and one button (2026-11-14,
 * user: "the premium card looks complex here. make it simple, just say this
 * many shares matches and buy premium to get all"). Never a share's name.
 */
export default function ScreenerPremium({
  count,
  goal,
}: {
  /** Shares that match the screen now. */
  count: number;
  /** The list picked, for the analytics label. */
  goal?: string | null;
}) {
  const { user } = useAuth();
  const { state } = usePremium();
  const { bn } = useLang();
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  const offer = user?.offer ?? null;
  const href = offer ? `/premium?plan=offer&src=screener#pay` : user ? `${PREMIUM_PATH}#pay` : PREMIUM_PATH;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "screener", lock: "screener", state, count, goal: goal ?? "", variant: "simple" });
        io.disconnect();
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [state, count, goal]);

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "screener", lock: "screener", state, count, goal: goal ?? "", variant: "simple" });
    savePremiumContext({
      from: "screener",
      label: bn ? "স্টক স্ক্রিনার" : "The stock screener",
      stakes: [bn ? `${count}টি শেয়ার মিলেছে` : `${count} shares match`],
    });
  };

  return (
    <section ref={ref} id={SCREENER_ANCHOR} className="scr-promo scroll-mt-24" aria-labelledby="sc-promo-t">
      <p className="scr-promo-tag">
        <IconCrown size={14} />
        <T en="Premium" bn="প্রিমিয়াম" />
      </p>
      <h2 id="sc-promo-t" className="scr-promo-title nums">
        <T
          en={`${count} ${count === 1 ? "share matches" : "shares match"}`}
          bn={`${count}টি শেয়ার মিলেছে`}
        />
      </h2>
      <p className="scr-promo-line">
        <T
          en={`Get Premium to see ${count === 1 ? "it" : `all ${count}`}.`}
          bn={`${count === 1 ? "এটি" : `সবগুলো`} দেখতে প্রিমিয়াম নিন।`}
        />
      </p>
      <Button href={href} onClick={onTap} size="lg" className="scr-promo-cta">
        {offer ? (
          <T en={`Get your first month for ৳${offer.amount}`} bn={`প্রথম মাস ৳${offer.amount}-এ নিন`} />
        ) : (
          <T en="Get Premium" bn="প্রিমিয়াম নিন" />
        )}
      </Button>
      {!offer && (
        <p className="scr-promo-price">
          <T en={`From ৳${FROM_MONTH} a month`} bn={`মাসে ৳${FROM_MONTH} থেকে`} />
        </p>
      )}
    </section>
  );
}
