"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { getBengaliSummaries } from "@/lib/api";
import SignalChip from "@/components/ui/SignalChip";
import ScoreBadge from "@/components/ui/ScoreBadge";
import TierPill from "@/components/ui/TierPill";
import type { TierKey } from "@/lib/constants";
import type {
  AnalysisLang,
  PortfolioAnalysis,
  QualityWord,
} from "@/lib/portfolio-analysis";

/** The portfolio's quality word is the DSEF tier under another name — render it
 *  with the shared TierPill so it matches every other tier in the app. */
const QUALITY_TIER: Record<Exclude<QualityWord, "Unrated">, TierKey> = {
  Strong: "excellent",
  Solid: "good",
  Average: "average",
  Weak: "weak",
};

const STR = {
  en: {
    title: "Your Stocks",
    subtitle: "How each one scores and how it's doing.",
    ofPortfolio: (pct: string) => `${pct}% of portfolio`,
    overall: "Overall",
    fullAnalysis: "Full analysis",
  },
  bn: {
    title: "আপনার শেয়ারগুলো",
    subtitle: "প্রতিটি শেয়ারের স্কোর আর হালচাল।",
    ofPortfolio: (pct: string) => `পোর্টফোলিওর ${pct}%`,
    overall: "সার্বিক",
    fullAnalysis: "পুরো বিশ্লেষণ",
  },
} as const;

interface Props {
  analysis: PortfolioAnalysis;
  lang?: AnalysisLang;
}

export default function HoldingsDetailed({ analysis, lang = "en" }: Props) {
  const sorted = [...analysis.holdings].sort((a, b) => b.weightPct - a.weightPct);
  const t = STR[lang];
  const bnMode = lang === "bn";
  const bnText = bnMode ? "font-bn" : "";

  // Cached Bengali "এক নজরে" one-liners — best-effort, cards render without them.
  const codesKey = useMemo(
    () => analysis.holdings.map((h) => h.code).sort().join(","),
    [analysis.holdings],
  );
  const [summariesBn, setSummariesBn] = useState<Record<string, string>>({});
  useEffect(() => {
    const codes = codesKey ? codesKey.split(",") : [];
    if (codes.length === 0) {
      setSummariesBn({});
      return;
    }
    let cancelled = false;
    getBengaliSummaries(codes).then((map) => {
      if (!cancelled) setSummariesBn(map);
    });
    return () => {
      cancelled = true;
    };
  }, [codesKey]);

  return (
    <section className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-2.5">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/30 text-primary">
          <svg
            className="w-[18px] h-[18px]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={`text-sm sm:text-base uppercase tracking-wider font-bold text-text-main ${bnText}`}
          >
            {t.title}
          </h3>
          <p className={`text-xs sm:text-sm text-text-muted mt-0.5 leading-relaxed ${bnText}`}>
            {t.subtitle}
          </p>
        </div>
      </div>

      {sorted.map((h) => {
        const tier = h.qualityWord === "Unrated" ? null : QUALITY_TIER[h.qualityWord];

        return (
          <Card
            as="article"
            key={h.code}
            padding="none"
            className="rounded-xl overflow-hidden hover:border-primary/40 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-border">
              <div className="min-w-0 flex-1">
                <Link
                  prefetch={false} href={`/stock/${h.code}`}
                  className="font-mono font-black text-lg sm:text-xl text-primary hover:underline tracking-tight"
                >
                  {h.code}
                </Link>
                {h.companyName && (
                  <p className="text-sm sm:text-base text-text-main mt-1 leading-snug truncate font-medium">
                    {h.companyName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <SignalChip
                    signal={h.signal.signal}
                    reason={h.signal.reason}
                    muted={h.signal.muted}
                    size="md"
                    lang={bnMode ? "bn" : "en"}
                  />
                  {tier ? (
                    <TierPill tier={tier} size="md" lang={bnMode ? "bn" : "en"} />
                  ) : (
                    <span
                      className={`inline-flex items-center rounded-full border border-border bg-surface-2 px-2 py-1 text-xs font-semibold text-text-muted ${bnText}`}
                    >
                      {bnMode ? "রেটিং নেই" : "Unrated"}
                    </span>
                  )}
                  {h.sector && (
                    <span className="text-xs sm:text-sm px-2 py-1 bg-border/40 border border-border rounded-full text-text-muted font-medium">
                      {h.sector}
                    </span>
                  )}
                  <span className={`text-xs sm:text-sm text-text-muted font-medium ${bnText}`}>
                    {t.ofPortfolio(h.weightPct.toFixed(0))}
                  </span>
                </div>
              </div>
              {h.score != null && (
                <div className="flex shrink-0 flex-col items-center gap-1">
                  <p className={`text-xs uppercase tracking-wider text-text-muted font-bold ${bnText}`}>
                    {t.overall}
                  </p>
                  <ScoreBadge score={h.score} size="md" />
                </div>
              )}
            </div>

            {/* Finding + link */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className={`text-sm sm:text-base text-text-main font-semibold leading-snug ${bnText}`}>
                  {h.descriptor}
                </p>
                <p className={`text-sm text-text-muted mt-1.5 leading-[1.6] ${bnText}`}>
                  {h.entryLabel}
                </p>
                {summariesBn[h.code] && (
                  <div className="mt-3 pt-3 border-t border-dashed border-border">
                    <p className="text-xs uppercase tracking-wider font-bold text-primary mb-1">
                      এক নজরে
                    </p>
                    <p lang="bn" className="font-bn text-sm text-text-main">
                      {summariesBn[h.code]}
                    </p>
                  </div>
                )}
              </div>
              <Link
                prefetch={false} href={`/stock/${h.code}`}
                className={`inline-flex items-center justify-center gap-1 text-sm font-bold text-primary hover:underline shrink-0 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors self-start ${bnText}`}
              >
                {t.fullAnalysis}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                </svg>
              </Link>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
