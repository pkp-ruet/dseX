"use client";

import { useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { IconCheck, IconLock } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

const ITEMS: { en: string; bn: string }[] = [
  { en: "What to do with each stock, most urgent first", bn: "প্রতিটি শেয়ারে কী করবেন, জরুরিটা আগে" },
  { en: "Every update the watcher finds on your stocks", bn: "আপনার শেয়ারে যা চোখে পড়ে, তার সবকিছু" },
  { en: "What to buy next to fill the gaps", bn: "ফাঁক ভরতে এরপর কী কিনবেন" },
  { en: "Risk, the price you paid, cash coming and you vs the market", bn: "ঝুঁকি, কেনার দাম, আসছে যে নগদ আর বাজারের তুলনায় আপনি" },
  { en: "The what-if check before you buy or sell", bn: "কেনা-বেচার আগে যদি-এমন-করি যাচাই" },
];

/**
 * The portfolio page's ONE Premium card (`#pf-premium`, 2026-10-26). Every
 * Premium part on the page blurs where it belongs (the page's
 * `PageLockScope`) and links here, so the reader meets one offer built on
 * their own stakes in taka. Renders nothing for Premium readers. The id is
 * also where the watcher's teaser push lands.
 */
export default function PortfolioPremium({ stakes, lang }: { stakes: string[]; lang: AnalysisLang }) {
  const { state, isPremium } = usePremium();
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);
  useEffect(() => setMounted(true), []);
  const show = !(mounted && isPremium);

  useEffect(() => {
    const el = ref.current;
    if (!el || !show || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (seen.current || !entries.some((e) => e.isIntersecting)) return;
        seen.current = true;
        trackEvent("premium_lock_view", { area: "portfolio", lock: "pf-premium", state, stakes: stakes.length });
        io.disconnect();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, state, stakes.length]);

  if (!show) return null;

  const bn = lang === "bn";
  const t = (en: string, b: string) => (bn ? b : en);
  const textCls = bn ? "font-bn" : "";
  const langAttr = bn ? "bn" : undefined;
  const label = t("Your daily portfolio check", "দৈনিক যাচাই");

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-premium", state, stakes: stakes.length });
    savePremiumContext({ from: "portfolio", label, stakes });
  };

  return (
    <section
      ref={ref}
      id="pf-premium"
      aria-labelledby="pf-premium-h"
      className="dash-section soft-card pf-card pf-premium"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
        <IconLock size={16} />
        Premium
      </p>
      <h3 id="pf-premium-h" className={`mt-1 text-xl font-bold leading-tight text-text-main sm:text-2xl ${textCls}`} lang={langAttr}>
        {t("Your portfolio, checked every day", "আপনার পোর্টফোলিওর দৈনিক যাচাই")}
      </h3>
      <p className={`pf-card-note ${textCls}`} lang={langAttr}>
        {t(
          "Every locked part on this page opens, and we watch your stocks after every close.",
          "এই পেজের সব বন্ধ অংশ খুলে যায়, আর প্রতিদিন বাজার বন্ধের পর আমরা আপনার শেয়ার দেখি।",
        )}
      </p>

      {stakes.length > 0 && (
        <ul className={`pf-premium-stakes ${textCls}`} lang={langAttr}>
          {stakes.map((s) => (
            <li key={s}>
              <span className="pf-dot pf-dot--watch mt-2" aria-hidden />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}

      <ul className={`pf-premium-adds ${textCls}`} lang={langAttr}>
        {ITEMS.map((it) => (
          <li key={it.en}>
            <IconCheck size={14} />
            <span>{bn ? it.bn : it.en}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button href={PREMIUM_PATH} onClick={onTap} size="lg">
          {t("See Premium", "প্রিমিয়াম দেখুন")}
        </Button>
        <p className={`text-sm text-text-muted ${textCls}`} lang={langAttr}>
          {t(
            `From ৳${LOWEST_PRICE} a month, paid by bKash or Nagad. It never renews by itself.`,
            `মাসে ৳${LOWEST_PRICE} থেকে, বিকাশ বা নগদে। নিজে থেকে নবায়ন হয় না।`,
          )}
        </p>
      </div>
    </section>
  );
}
