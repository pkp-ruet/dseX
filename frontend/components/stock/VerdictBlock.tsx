"use client";
import { getTier } from "@/lib/constants";
import { HEALTH_PILLAR_ORDER } from "@/lib/plain-language";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import SignalChip from "@/components/ui/SignalChip";
import { PillarBars } from "@/components/stock/HealthCheck";
import { useStockLang } from "@/context/StockLangContext";
import type { CompanyDetail } from "@/lib/api";

interface Props {
  detail: CompanyDetail;
}

const T = {
  brand: { en: "At a glance", bn: "এক নজরে" },
  score: { en: "Fundamental Score", bn: "মৌলিক স্কোর" },
  take: { en: "Our take", bn: "আমাদের মত" },
  checks: { en: "Five checks, out of 10", bn: "পাঁচটি পরীক্ষা, 10-এর মধ্যে" },
  whyBuy: { en: "Why a Buy? Read the full verdict", bn: "কেন কেনার সংকেত? পুরো বিশ্লেষণ পড়ুন" },
  whySell: { en: "Why a Sell? Read the full verdict", bn: "কেন বিক্রির সংকেত? পুরো বিশ্লেষণ পড়ুন" },
  why: { en: "Read the full verdict", bn: "পুরো বিশ্লেষণ পড়ুন" },
  generic: {
    en: "Our take on this stock — combining its financial health with how the market is treating it right now.",
    bn: "এই শেয়ার নিয়ে আমাদের মত — এর আর্থিক অবস্থা আর বাজারের বর্তমান আচরণ মিলিয়ে।",
  },
} as const;

/**
 * "At a glance" (2026-10-27) — everything free about our view of a stock in
 * one card: score ring, grade, the Buy / Sell chip, the one-line take and the
 * five checks as bars, then one link down to the full verdict chapter, where
 * the reasons live (FullVerdict). No locks in this card.
 *
 * The company name, code, sector and price are NOT repeated here — the hero
 * directly above already carries them. Score, tier and signal are the shared
 * primitives (`ScoreBadge` lg / `TierPill` md / `SignalChip` md). Both
 * language blocks of the take are rendered into the server HTML and toggled
 * by visibility, so crawlers still see the Bengali.
 */
export default function VerdictBlock({ detail }: Props) {
  const { score_row, profile, verdict, signal, bengali_summary } = detail;
  const { lang } = useStockLang();
  const isBn = lang === "bn";

  const score = (score_row?.score as number | null) ?? null;
  const tier = getTier(score);
  const code = profile.trading_code;

  const tagline = verdict?.tagline ?? null;
  const sentences = (verdict?.sentences ?? []).filter(Boolean);

  // Bengali "এক নজরে" prose — the first paragraph is the free lead.
  const bnSummary = bengali_summary?.trim() || "";
  const bnParas = bnSummary ? bnSummary.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean) : [];

  const isSell = signal?.signal === "sell";
  const isBuy = signal?.signal === "buy";
  const freeEn = tagline ?? sentences[0] ?? null;
  const hasBars = HEALTH_PILLAR_ORDER.some((k) => score_row?.[k] != null);

  // Small sentence-case labels (2026-10 redesign: no uppercase tracked eyebrows).
  const eyebrowCls = (bn: boolean) => `text-xs font-semibold ${bn ? "font-bn" : ""}`;

  return (
    <section className="soft-card relative mb-8 overflow-hidden">
      <div className="relative p-5 sm:p-7">
        <p className={`mb-4 text-sm font-semibold text-text-muted ${isBn ? "font-bn" : ""}`} lang={isBn ? "bn" : undefined}>
          {T.brand[lang]}
        </p>

        {/* Score ring + verdict word + signal */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-7">
          <div className="flex flex-col items-center shrink-0">
            <span className={`${eyebrowCls(isBn)} mb-2 text-text-muted`}>
              {T.score[lang]}
            </span>
            <ScoreBadge score={score} tier={tier} size="lg" />
          </div>

          <div className="text-left flex-1 w-full">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <TierPill tier={tier} size="md" lang={lang} />
              {(isBuy || isSell) && signal && (
                <SignalChip signal={signal.signal} strength={signal.strength} size="md" lang={lang} />
              )}
            </div>

            {/* The take — language-aware. Both blocks live in the DOM (SEO); one is hidden. */}
            <div className="mt-4">
              <p className={`${eyebrowCls(isBn)} mb-2 text-text-muted`}>
                {T.take[lang]}
              </p>

              {/* English lead: the tagline (or the first sentence) */}
              <div className={isBn ? "hidden" : "block"}>
                {freeEn ? (
                  <p className="text-sm sm:text-base font-semibold leading-snug text-text-main">
                    {freeEn}
                  </p>
                ) : (
                  <p className="text-base sm:text-base leading-relaxed text-text-muted">
                    {T.generic.en}
                  </p>
                )}
              </div>

              {/* Bengali lead: the first এক নজরে paragraph */}
              <div className={`font-bn ${isBn ? "block" : "hidden"}`} lang="bn">
                <p className="leading-relaxed" style={{ color: bnParas[0] ? "var(--text)" : "var(--text-muted)" }}>
                  {bnParas[0] ?? T.generic.bn}
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* The five checks as bars — the shape of the company, free. */}
        {score_row && hasBars && (
          <div className="mt-6 border-t border-border pt-5">
            <p className={`${eyebrowCls(isBn)} mb-3 text-text-muted`}>{T.checks[lang]}</p>
            <PillarBars scoreRow={score_row} />
          </div>
        )}

        {/* Why — the one way into the full verdict chapter below. */}
        <a
          href="#ch-verdict"
          className={`mt-5 flex min-h-10 items-center gap-1 text-sm font-semibold text-primary-ink hover:underline active:opacity-70 ${isBn ? "font-bn" : ""}`}
          lang={isBn ? "bn" : undefined}
        >
          {isBuy ? T.whyBuy[lang] : isSell ? T.whySell[lang] : T.why[lang]} <span aria-hidden="true">↓</span>
        </a>

        {/* Footer watermark — for shared screenshots */}
        <div
          className="mt-5 pt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-semibold border-t border-border"
        >
          <span className="text-text-muted">topstockbd.com</span>
          <span className="text-text-muted">{code} · DSE Stock Analysis</span>
        </div>
      </div>
    </section>
  );
}
