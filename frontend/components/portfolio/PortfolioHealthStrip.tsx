"use client";

import { taka, formatDate } from "@/lib/formatters";
import { SIGNAL_LABELS, SIGNAL_LABELS_BN } from "@/lib/constants";
import type {
  AnalysisLang,
  Grade,
  GradeLabel,
  PortfolioAnalysis,
} from "@/lib/portfolio-analysis";
import type { PortfolioSignalEvent } from "@/lib/api";

// Grade accents come from the site tokens — mirrors PortfolioAnalysisView.
const GRADE_ACCENT: Record<Grade, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "color-mix(in srgb, var(--watch) 55%, var(--negative))",
  F: "var(--negative)",
};

const GRADE_LABEL_BN: Record<GradeLabel, string> = {
  Excellent: "চমৎকার",
  Good: "ভালো",
  Okay: "মোটামুটি",
  Risky: "ঝুঁকিপূর্ণ",
  "Very Risky": "খুব ঝুঁকিপূর্ণ",
};

const STR = {
  en: {
    health: "Portfolio health",
    see: "Full analysis",
    spread: "Spread",
    quality: "Quality",
    entry: "Entry",
    since: (d: string) => `Since ${d}`,
    sinceVisit: "Since your last visit",
    quiet: "No signal changes since your last visit.",
  },
  bn: {
    health: "পোর্টফোলিওর অবস্থা",
    see: "পুরো বিশ্লেষণ",
    spread: "বণ্টন",
    quality: "মান",
    entry: "কেনার দাম",
    since: (d: string) => `${d} থেকে`,
    sinceVisit: "আপনার শেষ দেখার পর",
    quiet: "শেষ দেখার পর সংকেতে কোনো বদল হয়নি।",
  },
} as const;

function scoreAccent(v: number): string {
  return v >= 7
    ? "var(--positive)"
    : v >= 5
      ? "var(--watch)"
      : v >= 3.5
        ? "color-mix(in srgb, var(--watch) 55%, var(--negative))"
        : "var(--negative)";
}

interface Props {
  analysis: PortfolioAnalysis;
  lang?: AnalysisLang;
  /** Recent Buy More / Sell flips on held stocks (from GET /portfolio/signal-events). */
  events: PortfolioSignalEvent[];
  /** Portfolio value change since the previous visit, or null (first visit / too recent). */
  valueDelta: { delta: number; since: string } | null;
  /** Scroll to the full analysis section. */
  onSeeDetails: () => void;
}

/**
 * Compact "how am I doing" verdict, surfaced directly under the value hero:
 * the A–F grade, the three sub-scores, and a "what changed since your last
 * visit" line (signal flips + value move). The full prose analysis lives lower;
 * "Full analysis" scrolls to it.
 */
export default function PortfolioHealthStrip({
  analysis,
  lang = "en",
  events,
  valueDelta,
  onSeeDetails,
}: Props) {
  const t = STR[lang];
  const bnText = lang === "bn" ? "font-bn" : "";
  const accent = GRADE_ACCENT[analysis.grade];
  const { spread, quality, entry } = analysis.subScores;
  const gradeLabel = lang === "bn" ? GRADE_LABEL_BN[analysis.gradeLabel] : analysis.gradeLabel;
  const sigLabels = lang === "bn" ? SIGNAL_LABELS_BN : SIGNAL_LABELS;

  const flips = events
    .filter((e) => e.signal === "sell" || e.signal === "buy_more")
    .slice(0, 2);
  const hasDelta = valueDelta != null && Math.abs(valueDelta.delta) >= 1;
  const showActivity = flips.length > 0 || valueDelta != null;

  const subs = [
    { label: t.spread, value: spread },
    { label: t.quality, value: quality },
    { label: t.entry, value: entry },
  ];

  const sinceLabel =
    valueDelta != null
      ? t.since(formatDate(valueDelta.since))
      : flips[0]?.changed_at
        ? t.since(formatDate(flips[0].changed_at))
        : t.sinceVisit;

  return (
    <section
      className="relative overflow-hidden rounded-2xl border p-4 sm:p-5"
      style={{
        background: "var(--surface)",
        borderColor: `color-mix(in srgb, ${accent} 22%, var(--border))`,
      }}
    >
      <div className="flex items-start gap-3.5">
        {/* Grade badge */}
        <div
          className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0"
          style={{
            color: accent,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            border: `1px solid color-mix(in srgb, ${accent} 35%, transparent)`,
          }}
        >
          <span className="text-2xl sm:text-3xl font-black leading-none">{analysis.grade}</span>
          <span className={`text-[10px] sm:text-[11px] font-bold mt-0.5 ${bnText}`}>{gradeLabel}</span>
        </div>

        {/* Verdict */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-[11px] uppercase tracking-wider font-bold text-[var(--text-muted)] ${bnText}`}>
              {t.health}
            </p>
            <button
              type="button"
              onClick={onSeeDetails}
              className={`ml-auto inline-flex items-center gap-0.5 text-xs font-bold text-[var(--primary)] hover:underline shrink-0 ${bnText}`}
            >
              {t.see}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </button>
          </div>
          <p
            className={`text-sm sm:text-[15px] text-[var(--text)] font-medium leading-snug mt-1 ${bnText}`}
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {analysis.headline}
          </p>
        </div>
      </div>

      {/* Sub-scores */}
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-4">
        {subs.map((s) => {
          const a = scoreAccent(s.value);
          return (
            <div key={s.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-1">
                <span className={`text-[11px] uppercase tracking-wider font-bold text-[var(--text)] ${bnText}`}>
                  {s.label}
                </span>
                <span className="text-sm font-black tabular-nums nums" style={{ color: a }}>
                  {s.value.toFixed(1)}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-[var(--border)]/50 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(0, Math.min(100, (s.value / 10) * 100))}%`, background: a }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* What changed since last visit */}
      {showActivity && (
        <div className="flex items-center gap-2 flex-wrap mt-4 pt-3 border-t border-[var(--border)]">
          <svg className="w-4 h-4 text-[var(--primary)] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5S10.5 3.17 10.5 4v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
          <span className={`text-xs sm:text-[13px] text-[var(--text-muted)] font-medium ${bnText}`}>
            {sinceLabel}:
          </span>
          {flips.map((e) => {
            const c = e.signal === "sell" ? "var(--negative)" : "var(--positive)";
            return (
              <span
                key={e.trading_code}
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: c, background: `color-mix(in srgb, ${c} 13%, transparent)` }}
              >
                <span className="font-mono">{e.trading_code}</span>
                <span aria-hidden>→</span>
                <span className={bnText}>{sigLabels[e.signal as "sell" | "buy_more"]}</span>
              </span>
            );
          })}
          {flips.length === 0 && !hasDelta && (
            <span className={`text-xs text-[var(--text-muted)] ${bnText}`}>{t.quiet}</span>
          )}
          {hasDelta && (
            <span
              className="ml-auto text-xs sm:text-sm font-bold tabular-nums nums"
              style={{
                color:
                  valueDelta!.delta > 0
                    ? "var(--positive)"
                    : valueDelta!.delta < 0
                      ? "var(--negative)"
                      : "var(--text-muted)",
              }}
            >
              {valueDelta!.delta > 0 ? "+" : ""}
              {taka(valueDelta!.delta, 0)}
            </span>
          )}
        </div>
      )}
    </section>
  );
}
