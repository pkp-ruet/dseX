"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconCrown } from "@/components/ui/icons";
import { PREMIUM_PATH, usePremium } from "@/lib/premium";
import { FROM_MONTH } from "@/lib/premium-plans";
import { JOB_EXPLAIN, JOBS } from "@/lib/premium-jobs";
import { savePremiumContext } from "@/lib/premium-context";
import { trackEvent } from "@/lib/track";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

/**
 * The portfolio page's ONE card on what Premium is (`#pf-premium`, moved to
 * the top of the Analysis chapter 2026-10-29, user: the generic Premium lines
 * repeated on every locked card). It sits under the free grade, so a free
 * reader knows the deal before the first lock: the "Watch" job and what it
 * does, Free vs Premium on this page, the reader's own stakes in taka, the
 * price. Every lock on the page is a short card naming only what it holds and
 * links here (the page's `PageLockScope`). The id is also where the
 * watcher's teaser push lands. Nothing for Premium readers.
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
        trackEvent("premium_lock_view", { area: "portfolio", lock: "pf-premium", state, stakes: stakes.length, job: "watch" });
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
  const job = JOBS.watch;
  const info = JOB_EXPLAIN.watch;
  const label = t("Your daily portfolio check", "দৈনিক যাচাই");

  const onTap = () => {
    trackEvent("premium_lock_tap", { area: "portfolio", lock: "pf-premium", state, stakes: stakes.length, job: "watch" });
    savePremiumContext({ from: "portfolio", label, stakes });
  };

  return (
    <section
      ref={ref}
      id="pf-premium"
      aria-labelledby="pf-premium-h"
      className={`dash-section ans pf-premium ${bn ? "font-bn" : ""}`}
      lang={bn ? "bn" : undefined}
      data-open="false"
    >
      <div className="ans-top">
        <span className="ans-medal" aria-hidden="true">
          <IconCrown size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ans-eyebrow">Premium · {bn ? job.name.bn : job.name.en}</p>
          <h3 id="pf-premium-h" className="ans-title">
            {bn ? job.line.bn : job.line.en}
          </h3>
        </div>
      </div>

      <div className="ans-body">
        <p className="ans-what">{bn ? info.what.bn : info.what.en}</p>

        <div>
          <div className="ans-row">
            <span className="ans-pill">{t("Free", "ফ্রি")}</span>
            <p className="text-sm leading-snug text-text-main">
              {t(
                "Your money, your grade and its three scores, your next move, and the first point in each list.",
                "আপনার টাকার হিসাব, গ্রেড আর তার তিনটি স্কোর, আপনার পরের পদক্ষেপ, আর প্রতিটি তালিকার প্রথম কথা।",
              )}
            </p>
          </div>
          <div className="ans-row">
            <span className="ans-pill" data-premium="true">
              <IconCrown size={12} /> {t("Premium", "প্রিমিয়াম")}
            </span>
            <p className="text-sm leading-snug text-text-main">
              {t(
                "Every point, what would raise your grade, what to buy next, five deeper checks, the what-if result, and a notification when something changes on your shares.",
                "সব কথা, কীসে আপনার গ্রেড বাড়বে, এরপর কী কিনবেন, আরও পাঁচটি গভীর যাচাই, যদি-এমন-করি যাচাইয়ের ফল, আর আপনার শেয়ারে কিছু বদলালে নোটিফিকেশন।",
              )}
            </p>
          </div>
        </div>

        {stakes.length > 0 && (
          <div>
            <p className="ans-k">{t("On your portfolio right now", "এই মুহূর্তে আপনার পোর্টফোলিওতে")}</p>
            <ul className="ans-stakes mt-2">
              {stakes.map((s) => (
                <li key={s}>
                  <span className="pf-dot pf-dot--watch mt-2" aria-hidden />
                  <span className="min-w-0">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ul className="ans-gets">
          {info.gets.map((g) => (
            <li key={g.en}>
              <IconCheck size={12} />
              {bn ? g.bn : g.en}
            </li>
          ))}
        </ul>
      </div>

      <div className="ans-foot">
        <Link href={PREMIUM_PATH} prefetch={false} onClick={onTap} className="btn-primary btn-lg ans-cta">
          {t("Unlock with Premium", "প্রিমিয়ামে খুলুন")}
          <IconArrowRight size={18} />
        </Link>
        <span className="ans-price">
          <b>{t(`From ৳${FROM_MONTH} a month`, `মাসে ৳${FROM_MONTH} থেকে`)}</b>
          <span>{t("bKash, Nagad or bank · No auto-renewal", "বিকাশ, নগদ বা ব্যাংক · নিজে থেকে নবায়ন হয় না")}</span>
        </span>
      </div>
    </section>
  );
}
