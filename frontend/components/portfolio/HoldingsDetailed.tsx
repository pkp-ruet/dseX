"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import { getBengaliSummaries } from "@/lib/api";
import type { HoldingSignal, PortfolioAnalysis, QualityWord } from "@/lib/portfolio-analysis";

const SIGNAL_THEME: Record<HoldingSignal, { chip: string; dot: string; icon: string }> = {
  buy_more: {
    chip: "bg-[color-mix(in_srgb,var(--positive)_15%,transparent)] text-[var(--positive)] border-[color-mix(in_srgb,var(--positive)_30%,transparent)]",
    dot: "bg-[var(--positive)]",
    icon: "▲",
  },
  hold: {
    chip: "bg-[color-mix(in_srgb,var(--watch)_15%,transparent)] text-[var(--watch)] border-[color-mix(in_srgb,var(--watch)_30%,transparent)]",
    dot: "bg-[var(--watch)]",
    icon: "●",
  },
  sell: {
    chip: "bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)] border-[color-mix(in_srgb,var(--negative)_30%,transparent)]",
    dot: "bg-[var(--negative)]",
    icon: "▼",
  },
};

const QUALITY_THEME: Record<
  QualityWord,
  { dot: string; chip: string; label: string }
> = {
  Strong: {
    dot: "bg-[var(--positive)]",
    chip: "bg-[color-mix(in_srgb,var(--positive)_15%,transparent)] text-[var(--positive)] border-[color-mix(in_srgb,var(--positive)_30%,transparent)]",
    label: "Strong company",
  },
  Solid: {
    dot: "bg-[var(--safe-buy)]",
    chip: "bg-[color-mix(in_srgb,var(--safe-buy)_15%,transparent)] text-[var(--safe-buy)] border-[color-mix(in_srgb,var(--safe-buy)_30%,transparent)]",
    label: "Solid company",
  },
  Average: {
    dot: "bg-[var(--watch)]",
    chip: "bg-[color-mix(in_srgb,var(--watch)_15%,transparent)] text-[var(--watch)] border-[color-mix(in_srgb,var(--watch)_30%,transparent)]",
    label: "Average company",
  },
  Weak: {
    dot: "bg-[var(--negative)]",
    chip: "bg-[color-mix(in_srgb,var(--negative)_15%,transparent)] text-[var(--negative)] border-[color-mix(in_srgb,var(--negative)_30%,transparent)]",
    label: "Weak company",
  },
  Unrated: {
    dot: "bg-[var(--text-muted)]",
    chip: "bg-[color-mix(in_srgb,var(--text-muted)_15%,transparent)] text-[var(--text-muted)] border-[color-mix(in_srgb,var(--text-muted)_30%,transparent)]",
    label: "Unrated",
  },
};

interface Props {
  analysis: PortfolioAnalysis;
}

export default function HoldingsDetailed({ analysis }: Props) {
  const sorted = [...analysis.holdings].sort((a, b) => b.weightPct - a.weightPct);

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
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-[var(--primary)]">
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
          <h3 className="text-sm sm:text-[15px] uppercase tracking-wider font-bold text-[var(--text)]">
            Your Stocks
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
            How each one scores and how it&apos;s doing.
          </p>
        </div>
      </div>

      {sorted.map((h) => {
        const qt = QUALITY_THEME[h.qualityWord];
        const st = SIGNAL_THEME[h.signal.signal];

        return (
          <Card
            as="article"
            key={h.code}
            padding="none"
            className="rounded-2xl overflow-hidden hover:border-[var(--primary)]/40 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
              <div className="min-w-0 flex-1">
                <Link
                  prefetch={false} href={`/stock/${h.code}`}
                  className="font-mono font-black text-lg sm:text-xl text-[var(--primary)] hover:underline tracking-tight"
                >
                  {h.code}
                </Link>
                {h.companyName && (
                  <p className="text-sm sm:text-[15px] text-[var(--text)] mt-1 leading-snug truncate font-medium">
                    {h.companyName}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <span
                    title={h.signal.reason}
                    className={`inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold uppercase tracking-wide px-2 py-1 rounded-full border cursor-help ${st.chip}`}
                    style={{ opacity: h.signal.muted ? 0.75 : 1 }}
                  >
                    <span className="text-[9px] leading-none" aria-hidden>
                      {st.icon}
                    </span>
                    {h.signal.label}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-semibold px-2 py-1 rounded-full border ${qt.chip}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${qt.dot}`} aria-hidden />
                    {qt.label}
                  </span>
                  {h.sector && (
                    <span className="text-xs sm:text-[13px] px-2 py-1 bg-[var(--border)]/40 border border-[var(--border)] rounded-full text-[var(--ink-2)] font-medium">
                      {h.sector}
                    </span>
                  )}
                  <span className="text-xs sm:text-[13px] text-[var(--text-muted)] font-medium">
                    {h.weightPct.toFixed(0)}% of portfolio
                  </span>
                </div>
              </div>
              {h.score != null && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                    Overall
                  </p>
                  <p className="text-2xl sm:text-3xl font-black text-[var(--text)] leading-none mt-1 tabular-nums nums">
                    {h.score.toFixed(0)}
                    <span className="text-xs sm:text-sm text-[var(--text-muted)] font-semibold">
                      /100
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Finding + link */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-[15px] text-[var(--text)] font-semibold leading-snug">
                  {h.descriptor}
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-[1.6]">
                  {h.entryLabel}
                </p>
                {summariesBn[h.code] && (
                  <div className="mt-3 pt-3 border-t border-dashed border-[var(--border)]">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-[var(--primary)] mb-1">
                      এক নজরে
                    </p>
                    <p lang="bn" className="font-bn text-sm text-[var(--text)]">
                      {summariesBn[h.code]}
                    </p>
                  </div>
                )}
              </div>
              <Link
                prefetch={false} href={`/stock/${h.code}`}
                className="inline-flex items-center justify-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline shrink-0 px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors self-start"
              >
                Full analysis
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
