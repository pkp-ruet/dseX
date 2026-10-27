"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconCheck, IconLock } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";

export const SCREENER_ANCHOR = "sc-premium";

const FEATURES = [
  { en: "Every stock that passes your screen, with its figure on each check",
    bn: "আপনার স্ক্রিন পেরোনো প্রতিটি শেয়ার, প্রতিটি শর্তে তার সংখ্যাসহ" },
  { en: "Your own answers to the six questions, and one or several sectors",
    bn: "ছয়টি প্রশ্নে নিজের উত্তর, আর এক বা একাধিক খাত" },
  { en: "The stocks that almost passed, and the one check each misses",
    bn: "প্রায় পাস করা শেয়ার, আর প্রতিটি কোন একটি শর্তে বাদ পড়েছে" },
  { en: "Change the exact rules behind each answer, and add extra checks: a Buy today, a better quarter, owners buying",
    bn: "প্রতিটি উত্তরের নিয়ম বদলান, আরও শর্ত যোগ করুন: আজ 'কিনুন', ভালো প্রান্তিক, উদ্যোক্তারা কিনছেন" },
  { en: "Save up to 5 screens", bn: "সর্বোচ্চ 5টি স্ক্রিন সেভ" },
  { en: "A push the day a new stock passes", bn: "নতুন শেয়ার পাস করলে সেদিনই নোটিফিকেশন" },
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

  const stakes = [
    passed != null && passed > 0
      ? t(`${passed} companies pass your screen today`, `আজ ${passed}টি কোম্পানি আপনার স্ক্রিন পেরিয়েছে`)
      : null,
    hidden > 0 ? t(`${hidden} of them are hidden`, `এর মধ্যে ${hidden}টি লুকানো`) : null,
    yours > 0
      ? t(`${yours} ${yours === 1 ? "is a stock" : "are stocks"} you follow`, `${yours}টি আপনার অনুসরণ করা শেয়ার`)
      : null,
  ].filter((s): s is string => !!s);
  const cta = state === "guest"
    ? t("Sign up free, then try Premium", "ফ্রি সাইন আপ করে প্রিমিয়াম নিন")
    : t("See Premium plans", "প্রিমিয়াম প্ল্যান দেখুন");

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
        {t("See every stock your screen finds", "আপনার স্ক্রিনের প্রতিটি শেয়ার দেখুন")}
      </h2>
      <p className="rl-promo-sub">
        {t("The quick picks, every count and the first few stocks are free. Premium lets you set your own answers and sectors, shows the whole list and keeps watching it for you.",
           "দ্রুত বাছাই, সব সংখ্যা আর প্রথম কয়েকটি শেয়ার ফ্রি। প্রিমিয়ামে নিজের উত্তর আর খাত, পুরো তালিকা, আর আপনার হয়ে নজর রাখা।")}
      </p>

      {stakes.length > 0 && (
        <ul className="mt-1 flex flex-col gap-1">
          {stakes.map((s) => (
            <li key={s} className="flex items-start gap-2 text-sm font-semibold text-text-main">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span>{s}</span>
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
            <span>{t(f.en, f.bn)}</span>
          </li>
        ))}
      </ul>

      <Link href={PREMIUM_PATH} prefetch={false} className="btn-primary rl-promo-cta" onClick={onCta}>
        {cta}
      </Link>
    </section>
  );
}
