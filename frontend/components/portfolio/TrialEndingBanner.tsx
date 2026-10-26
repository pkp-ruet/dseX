"use client";

import Button from "@/components/ui/Button";
import { usePremium, PREMIUM_PATH } from "@/lib/premium";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * In the last week of a free month: what Premium did for *this* reader, so
 * the end of the month is a choice, not a surprise. Mirrors the day-25 push
 * (`portfolio_daily._send_trial_recaps`).
 */
export default function TrialEndingBanner({
  caught,
  extraPortfolios,
  lang,
}: {
  /** Watcher events since the month started. */
  caught: number;
  extraPortfolios: number;
  lang: AnalysisLang;
}) {
  const { premiumSource, daysLeft, isPremium } = usePremium();
  if (!isPremium || premiumSource !== "trial" || daysLeft <= 0 || daysLeft > 7) return null;
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);

  const lines = [
    caught > 0
      ? L(`Caught ${caught} thing${caught === 1 ? "" : "s"} on your stocks and sent them to you`, `আপনার শেয়ারে ${caught}টি জিনিস ধরে আপনাকে জানিয়েছে`)
      : L("Watched your stocks every trading day", "প্রতিদিন আপনার শেয়ার পাহারা দিয়েছে"),
    L("Kept your full history next to DSEX", "DSEX-এর পাশে আপনার পুরো ইতিহাস রেখেছে"),
    ...(extraPortfolios > 0
      ? [L(`Kept ${extraPortfolios} extra portfolio${extraPortfolios === 1 ? "" : "s"} for you`, `আপনার জন্য আরও ${extraPortfolios}টি পোর্টফোলিও রেখেছে`)]
      : []),
  ];

  return (
    <section className="soft-card pf-card pf-premium mb-4" data-card="trial-ending">
      <p className={`pf-card-title ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L(
          `Your free month ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
          `আপনার ফ্রি মাস শেষ হতে আর ${daysLeft} দিন`,
        )}
      </p>
      <p className={`mt-1 text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
        {L("This month, Premium:", "এই মাসে প্রিমিয়াম:")}
      </p>
      <ul className={`mt-2 flex flex-col gap-1.5 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {lines.map((l, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text-main">
            <span className="pf-dot pf-dot--good mt-1.5" aria-hidden />
            <span>{l}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <Button
          href={PREMIUM_PATH}
          variant="quiet"
          size="sm"
          onClick={() => {
            trackEvent("premium_trial_ending_tap", { days_left: daysLeft, caught });
            savePremiumContext({ from: "portfolio", label: L("Keep Premium", "প্রিমিয়াম রাখুন"), stakes: lines });
          }}
        >
          {L("See plans and prices", "প্ল্যান ও দাম দেখুন")}
        </Button>
      </div>
    </section>
  );
}
