"use client";

import Link from "@/components/ui/Link";
import { useEffect, useState } from "react";
import { IconCheck, IconCrown } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { T } from "@/components/i18n/T";

export const SCREENER_ANCHOR = "sc-premium";

const FEATURES = [
  { en: "Filter by our grade of the company, our check of the price and serious warnings",
    bn: "আমাদের গ্রেড, দামের যাচাই আর গুরুতর সতর্কতা দিয়ে ফিল্টার করুন" },
  { en: "See which shares pass those filters, not just how many",
    bn: "ওই ফিল্টারে কোন শেয়ারগুলো মেলে তা দেখুন, শুধু সংখ্যা নয়" },
  { en: "Save up to 5 screens", bn: "সর্বোচ্চ 5টি স্ক্রিন সেভ করুন" },
  { en: "A notification on the day a new share matches a saved screen",
    bn: "সেভ করা স্ক্রিনে নতুন শেয়ার মিললে সেদিনই নোটিফিকেশন" },
];

/**
 * The screener's ONE Premium section (`#sc-premium`). The screener itself is
 * free — every public figure, every row, every order. Premium adds our own
 * view as filters and keeps watching saved screens. Gone for Premium readers.
 */
export default function ScreenerPremium({
  viewCount,
  t,
}: {
  /** How many shares pass the screen's TopStockBD-view filters (null when none is on). */
  viewCount: number | null;
  t: (en: string, bn: string) => string;
}) {
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const stake = viewCount != null && viewCount > 0
    ? { en: `${viewCount} shares pass your screen with our view on it`,
        bn: `আমাদের মতসহ আপনার স্ক্রিনে ${viewCount}টি শেয়ার মিলেছে` }
    : null;
  const cta = state === "guest" ? (
    <T en="Sign up free, then try Premium" bn="ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম নিন" />
  ) : (
    <T en="See Premium plans" bn="প্রিমিয়াম প্ল্যান দেখুন" />
  );

  const onCta = () => {
    trackEvent("premium_lock_tap", { area: "screener", lock: "Screener premium", state });
    savePremiumContext({ from: "screener", label: t("The stock screener", "স্টক স্ক্রিনার"),
                         stakes: stake ? [t(stake.en, stake.bn)] : [] });
  };

  return (
    <section id={SCREENER_ANCHOR} className="soft-card rl-promo scroll-mt-24" aria-labelledby="sc-premium-title">
      <span className="rl-promo-tag">
        <IconCrown size={12} /> Premium
      </span>
      <h2 className="rl-promo-head" id="sc-premium-title">
        <T en="Add our view to your screen, and let us watch it" bn="স্ক্রিনে আমাদের মত যোগ করুন, আর নজর রাখার কাজটা আমাদের দিন" />
      </h2>
      <p className="rl-promo-sub">
        <T
          en="Every filter on public figures, every share and every order on this page is free. Premium adds our own reading of each company as filters, and checks your saved screens after every close."
          bn="এই পেজে সাধারণ তথ্যের সব ফিল্টার, সব শেয়ার আর সব ক্রম ফ্রি। প্রিমিয়ামে প্রতিটি কোম্পানি নিয়ে আমাদের নিজের মূল্যায়ন ফিল্টার হিসেবে যোগ হয়, আর প্রতিদিন বাজার বন্ধের পর আপনার সেভ করা স্ক্রিন যাচাই হয়।"
        />
      </p>
      {stake && (
        <p className="flex items-start gap-2 text-sm font-semibold text-text-main">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <T en={stake.en} bn={stake.bn} />
        </p>
      )}
      <ul className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive" aria-hidden>
              <IconCheck size={16} />
            </span>
            <T en={f.en} bn={f.bn} />
          </li>
        ))}
      </ul>
      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
        {cta}
      </Link>
    </section>
  );
}
