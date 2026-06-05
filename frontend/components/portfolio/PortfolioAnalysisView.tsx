import type { Grade, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import AllocationChart from "./AllocationChart";
import SectorBreakdownChart from "./SectorBreakdownChart";
import HoldingsDetailed from "./HoldingsDetailed";

const GRADE_THEME: Record<
  Grade,
  {
    badge: string;
    glow: string;
    cardGradient: string;
    accent: string;
  }
> = {
  A: {
    badge: "bg-green-500/20 text-[var(--positive)] border-green-500/50",
    glow: "shadow-[0_0_30px_-8px_rgba(34,197,94,0.6)]",
    cardGradient:
      "bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-green-500/30",
    accent: "text-[var(--positive)]",
  },
  B: {
    badge: "bg-emerald-500/20 text-[var(--positive)] border-emerald-500/50",
    glow: "shadow-[0_0_30px_-8px_rgba(16,185,129,0.55)]",
    cardGradient:
      "bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent border-emerald-500/30",
    accent: "text-[var(--positive)]",
  },
  C: {
    badge: "bg-amber-500/20 text-[var(--watch)] border-amber-500/50",
    glow: "shadow-[0_0_30px_-8px_rgba(245,158,11,0.55)]",
    cardGradient:
      "bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent border-amber-500/30",
    accent: "text-[var(--watch)]",
  },
  D: {
    badge: "bg-orange-500/20 text-[var(--watch)] border-orange-500/50",
    glow: "shadow-[0_0_30px_-8px_rgba(249,115,22,0.55)]",
    cardGradient:
      "bg-gradient-to-br from-orange-500/10 via-red-500/5 to-transparent border-orange-500/30",
    accent: "text-[var(--watch)]",
  },
  F: {
    badge: "bg-red-500/20 text-[var(--negative)] border-red-500/50",
    glow: "shadow-[0_0_30px_-8px_rgba(239,68,68,0.6)]",
    cardGradient:
      "bg-gradient-to-br from-red-500/10 via-rose-500/5 to-transparent border-red-500/30",
    accent: "text-[var(--negative)]",
  },
};

interface Props {
  analysis: PortfolioAnalysis;
  showSectorSpread?: boolean;
  showHoldingsList?: boolean;
  showDisclaimer?: boolean;
}

export default function PortfolioAnalysisView({
  analysis,
  showSectorSpread = true,
  showHoldingsList = true,
  showDisclaimer = true,
}: Props) {
  const theme = GRADE_THEME[analysis.grade];
  const { spread, quality, entry } = analysis.subScores;

  return (
    <div id="portfolio-analysis" className="flex flex-col gap-5 sm:gap-6 scroll-mt-20">
      {/* Verdict hero */}
      <section
        className={`relative overflow-hidden border rounded-2xl p-5 sm:p-7 ${theme.cardGradient}`}
      >
        <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
          {/* Grade badge */}
          <div
            className={`flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 shrink-0 ${theme.badge} ${theme.glow}`}
          >
            <span className="text-5xl sm:text-6xl font-black leading-none">
              {analysis.grade}
            </span>
            <span className="text-[11px] sm:text-xs uppercase tracking-wider mt-1.5 font-bold">
              {analysis.gradeLabel}
            </span>
          </div>

          {/* Headline + explanation */}
          <div className="flex-1 min-w-0 w-full">
            <p
              className={`text-[11px] sm:text-xs uppercase tracking-[0.18em] font-bold mb-2 ${theme.accent}`}
            >
              Portfolio Verdict
            </p>
            <p className="text-base sm:text-lg text-[var(--text)] leading-relaxed font-medium">
              {analysis.headline}
            </p>
            <p className="text-sm sm:text-[15px] text-[var(--ink-2)] leading-relaxed mt-3">
              {analysis.gradeExplanation}
            </p>
          </div>
        </div>

        {/* Sub-score chips */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-5 sm:mt-6 pt-5 border-t border-[var(--border)]/60">
          <SubScore label="Spread" value={spread} hint="How well your money is split" />
          <SubScore label="Quality" value={quality} hint="How strong your companies are" />
          <SubScore label="Entry" value={entry} hint="Whether you bought at fair prices" />
        </div>
      </section>

      {/* How to read the lists */}
      <div className="flex items-start gap-2.5 px-1">
        <svg
          className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 text-[var(--primary)] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        <p className="text-sm text-[var(--ink-2)] leading-relaxed">
          Three quick lists below: what's already working, what needs your attention, and what
          to think about next. Each point explains what it means and what you can do about it.
        </p>
      </div>

      {/* Good / Bad / Consider */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Section
          title="What's Working Well"
          tone="good"
          items={analysis.good}
          emptyText="Positive signals will appear as your portfolio grows."
        />
        <Section
          title="Needs Your Attention"
          tone="bad"
          items={analysis.bad}
          emptyText="No major red flags spotted."
        />
        <Section
          title="Things To Consider"
          tone="consider"
          items={analysis.consider}
          emptyText="Nothing pressing right now."
        />
      </div>

      {/* Allocation per company */}
      {showSectorSpread && <AllocationChart analysis={analysis} />}

      {/* Sector breakdown */}
      {showSectorSpread && <SectorBreakdownChart analysis={analysis} />}

      {/* Holdings */}
      {showHoldingsList && <HoldingsDetailed analysis={analysis} />}

      {showDisclaimer && (
        <p className="text-xs text-[var(--text-muted)] text-center mt-1 leading-relaxed px-2">
          This analysis is for guidance only. Always do your own research before making
          investment decisions.
        </p>
      )}
    </div>
  );
}

function SubScore({ label, value, hint }: { label: string; value: number; hint: string }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  const color =
    value >= 7
      ? "text-[var(--positive)]"
      : value >= 5
        ? "text-[var(--watch)]"
        : value >= 3.5
          ? "text-[var(--watch)]"
          : "text-[var(--negative)]";
  const barColor =
    value >= 7
      ? "bg-green-500"
      : value >= 5
        ? "bg-amber-500"
        : value >= 3.5
          ? "bg-orange-500"
          : "bg-red-500";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-[var(--text)]">
          {label}
        </span>
        <span className={`text-base sm:text-lg font-black tabular-nums ${color}`}>
          {value.toFixed(1)}
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-semibold ml-0.5">
            /10
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--border)]/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
      <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] leading-snug hidden sm:block">
        {hint}
      </span>
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "good" | "bad" | "consider";
  items: string[];
  emptyText: string;
}

const TONE_THEME: Record<
  SectionProps["tone"],
  {
    wrap: string;
    title: string;
    bullet: string;
    bulletBg: string;
    badge: string;
    icon: React.ReactNode;
  }
> = {
  good: {
    wrap: "border-green-500/30 bg-gradient-to-br from-green-500/[0.07] to-transparent",
    title: "text-[var(--positive)]",
    bullet: "text-[var(--positive)]",
    bulletBg: "bg-green-500/15",
    badge: "bg-green-500/15 text-[var(--positive)] border-green-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  bad: {
    wrap: "border-red-500/30 bg-gradient-to-br from-red-500/[0.07] to-transparent",
    title: "text-[var(--negative)]",
    bullet: "text-[var(--negative)]",
    bulletBg: "bg-red-500/15",
    badge: "bg-red-500/15 text-[var(--negative)] border-red-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  consider: {
    wrap: "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.07] to-transparent",
    title: "text-[var(--watch)]",
    bullet: "text-[var(--watch)]",
    bulletBg: "bg-amber-500/15",
    badge: "bg-amber-500/15 text-[var(--watch)] border-amber-500/30",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18h6M10 22h4" />
        <path d="M15.09 14A6.5 6.5 0 1012 2a6.5 6.5 0 00-3.09 12c.34.36.59.78.74 1.24l.04.13c.16.5.6.86 1.12.86h2.38c.52 0 .96-.36 1.12-.86l.04-.13c.15-.46.4-.88.74-1.24z" />
      </svg>
    ),
  },
};

function Section({ title, tone, items, emptyText }: SectionProps) {
  const c = TONE_THEME[tone];
  return (
    <div className={`border rounded-2xl p-4 sm:p-5 ${c.wrap}`}>
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={`flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border ${c.badge}`}
        >
          <span className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${c.title}`}>{c.icon}</span>
        </span>
        <h3
          className={`text-sm sm:text-[15px] uppercase tracking-wider font-bold ${c.title}`}
        >
          {title}
        </h3>
        {items.length > 0 && (
          <span
            className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full border ${c.badge}`}
          >
            {items.length}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] italic leading-relaxed">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 leading-relaxed">
              <span
                className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${c.bulletBg}`}
                style={{ boxShadow: `0 0 0 3px ${tone === "good" ? "rgba(34,197,94,0.15)" : tone === "bad" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)"}` }}
                aria-hidden
              />
              <span className="text-sm sm:text-[15px] text-[var(--text)] leading-[1.65]">
                {item}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
