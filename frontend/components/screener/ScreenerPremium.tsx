"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck, IconLock } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import { T } from "@/components/i18n/T";

export const SCREENER_ANCHOR = "sc-premium";

const FEATURES = [
  { en: "Every share that passes your screen, with its figure on each check",
    bn: "আপনার স্ক্রিনে পাস করা প্রতিটি শেয়ার, প্রতিটি যাচাইয়ে তার সংখ্যাসহ" },
  { en: "Your own answers to the six questions, and one or several sectors",
    bn: "ছয়টি প্রশ্নে নিজের উত্তর, আর এক বা একাধিক সেক্টর" },
  { en: "The shares that almost passed, and the one check each misses",
    bn: "প্রায় পাস করা শেয়ার, আর প্রতিটি কোন যাচাইয়ে বাদ পড়েছে" },
  { en: "Change the exact rules behind each answer, and add extra checks such as a Buy signal today, a better quarter or owners buying",
    bn: "প্রতিটি উত্তরের নিয়ম বদলান, আর আরও যাচাই যোগ করুন, যেমন আজ কেনার সংকেত, ভালো প্রান্তিক বা উদ্যোক্তা-পরিচালকদের কেনা" },
  { en: "Save up to 5 screens", bn: "সর্বোচ্চ 5টি স্ক্রিন সেভ করুন" },
  { en: "A notification on the day a new share passes", bn: "নতুন শেয়ার পাস করলে সেদিনই নোটিফিকেশন" },
];

/**
 * The screener's ONE Premium section (`#sc-premium`): every locked row on the
 * page points here. Gone for Premium readers once the plan is known.
 */
export default function ScreenerPremium({
  passed,
  hidden,
  yours,
  t,
}: {
  /** Companies passing the current screen. */
  passed: number | null;
  /** How many of them a free reader can't see. */
  hidden: number;
  /** How many of the passers the reader follows. */
  yours: number;
  t: (en: string, bn: string) => string;
}) {
  const { isPremium, state } = usePremium();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (mounted && isPremium) return null;

  const stakePairs = [
    passed != null && passed > 0
      ? { en: `${passed} companies pass your screen today`, bn: `আজ ${passed}টি কোম্পানি আপনার স্ক্রিনে পাস করেছে` }
      : null,
    hidden > 0 ? { en: `${hidden} of them are hidden`, bn: `এর মধ্যে ${hidden}টি লুকানো` } : null,
    yours > 0
      ? { en: `${yours} ${yours === 1 ? "is a share" : "are shares"} you follow`, bn: `${yours}টি আপনার অনুসরণ করা শেয়ার` }
      : null,
  ].filter((s): s is { en: string; bn: string } => !!s);
  // The stakes travel to /premium as plain lines in the reader's language.
  const stakes = stakePairs.map((s) => t(s.en, s.bn));
  const cta = state === "guest" ? (
    <T en="Sign up free, then try Premium" bn="ফ্রি অ্যাকাউন্ট খুলে প্রিমিয়াম নিন" />
  ) : (
    <T en="See Premium plans" bn="প্রিমিয়াম প্ল্যান দেখুন" />
  );

  const onCta = () => {
    trackEvent("premium_lock_tap", { area: "screener", lock: "Screener results", state, stakes: stakes.length });
    savePremiumContext({ from: "screener", label: t("The stock screener", "স্টক স্ক্রিনার"), stakes });
  };

  return (
    <section id={SCREENER_ANCHOR} className="soft-card rl-promo mt-8 scroll-mt-24" aria-labelledby="sc-premium-title">
      <span className="rl-promo-tag">
        <IconLock size={12} /> Premium
      </span>
      <h2 className="rl-promo-head" id="sc-premium-title">
        <T en="See every share your screen finds" bn="আপনার স্ক্রিনের প্রতিটি শেয়ার দেখুন" />
      </h2>
      <p className="rl-promo-sub">
        <T
          en="The quick picks, every count and the first few shares are free. With Premium you set your own answers and sectors, see the whole list, and we keep checking it for you."
          bn="দ্রুত বাছাই, সব সংখ্যা আর প্রথম কয়েকটি শেয়ার ফ্রি। প্রিমিয়ামে আপনি নিজের উত্তর আর সেক্টর ঠিক করেন, পুরো তালিকা দেখেন, আর আমরা আপনার হয়ে তালিকাটি যাচাই করতে থাকি।"
        />
      </p>

      {stakePairs.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {stakePairs.map((s) => (
            <li key={s.en} className="flex items-start gap-2 text-sm font-semibold text-text-main">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>
                <T en={s.en} bn={s.bn} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <ul className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <li key={f.en} className="flex items-start gap-2 text-sm text-text-main">
            <span className="mt-0.5 shrink-0 text-positive" aria-hidden>
              <IconCheck size={16} />
            </span>
            <span>
              <T en={f.en} bn={f.bn} />
            </span>
          </li>
        ))}
      </ul>

      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
        {cta}
      </Link>
    </section>
  );
}
