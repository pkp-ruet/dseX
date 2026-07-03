import type { Grade, PortfolioAnalysis, RebalancePlan } from "@/lib/portfolio-analysis";
import AllocationChart from "./AllocationChart";
import SectorBreakdownChart from "./SectorBreakdownChart";
import HoldingsDetailed from "./HoldingsDetailed";
import RebalanceHelper from "./RebalanceHelper";

/** Grade accents come from the site tokens — no raw palette colors. */
const GRADE_ACCENT: Record<Grade, string> = {
  A: "var(--positive)",
  B: "var(--positive)",
  C: "var(--watch)",
  D: "color-mix(in srgb, var(--watch) 55%, var(--negative))",
  F: "var(--negative)",
};

interface Props {
  analysis: PortfolioAnalysis;
  /** "What to buy next" ideas — omitted on read-only surfaces (e.g. sample portfolios). */
  rebalance?: RebalancePlan | null;
  showSectorSpread?: boolean;
  showHoldingsList?: boolean;
  showDisclaimer?: boolean;
}

export default function PortfolioAnalysisView({
  analysis,
  rebalance = null,
  showSectorSpread = true,
  showHoldingsList = true,
  showDisclaimer = true,
}: Props) {
  const accent = GRADE_ACCENT[analysis.grade];
  const { spread, quality, entry } = analysis.subScores;

  return (
    <div id="portfolio-analysis" className="flex flex-col gap-5 sm:gap-6 scroll-mt-20">
      {/* Verdict hero */}
      <section
        className="relative overflow-hidden border rounded-2xl p-5 sm:p-7"
        style={{
          background: `
            radial-gradient(120% 130% at 0% 0%, color-mix(in srgb, ${accent} 10%, transparent) 0%, transparent 55%),
            radial-gradient(110% 120% at 100% 100%, color-mix(in srgb, ${accent} 5%, transparent) 0%, transparent 50%),
            var(--surface)`,
          borderColor: `color-mix(in srgb, ${accent} 30%, var(--border))`,
        }}
      >
        <div className="flex flex-col sm:flex-row items-start gap-5 sm:gap-6">
          {/* Grade badge */}
          <div
            className="flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border-2 shrink-0"
            style={{
              color: accent,
              background: `color-mix(in srgb, ${accent} 15%, transparent)`,
              borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`,
              boxShadow: `0 0 30px -8px color-mix(in srgb, ${accent} 55%, transparent)`,
            }}
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
              className="text-[11px] sm:text-xs uppercase tracking-[0.18em] font-bold mb-2"
              style={{ color: accent }}
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

      {/* What to buy next — concrete ideas for the gaps above */}
      {rebalance && <RebalanceHelper plan={rebalance} />}

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
  const accent =
    value >= 7
      ? "var(--positive)"
      : value >= 5
        ? "var(--watch)"
        : value >= 3.5
          ? "color-mix(in srgb, var(--watch) 55%, var(--negative))"
          : "var(--negative)";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-[var(--text)]">
          {label}
        </span>
        <span className="text-base sm:text-lg font-black tabular-nums" style={{ color: accent }}>
          {value.toFixed(1)}
          <span className="text-[10px] sm:text-xs text-[var(--text-muted)] font-semibold ml-0.5">
            /10
          </span>
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-[var(--border)]/50 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: accent }}
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
    accent: string;
    icon: React.ReactNode;
  }
> = {
  good: {
    accent: "var(--positive)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 6L9 17l-5-5" />
      </svg>
    ),
  },
  bad: {
    accent: "var(--negative)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  consider: {
    accent: "var(--watch)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 18h6M10 22h4" />
        <path d="M15.09 14A6.5 6.5 0 1012 2a6.5 6.5 0 00-3.09 12c.34.36.59.78.74 1.24l.04.13c.16.5.6.86 1.12.86h2.38c.52 0 .96-.36 1.12-.86l.04-.13c.15-.46.4-.88.74-1.24z" />
      </svg>
    ),
  },
};

function Section({ title, tone, items, emptyText }: SectionProps) {
  const { accent, icon } = TONE_THEME[tone];
  const chipStyle = {
    color: accent,
    background: `color-mix(in srgb, ${accent} 14%, transparent)`,
    borderColor: `color-mix(in srgb, ${accent} 30%, transparent)`,
  };
  return (
    <div
      className="border rounded-2xl p-4 sm:p-5"
      style={{
        borderColor: `color-mix(in srgb, ${accent} 30%, var(--border))`,
        background: `linear-gradient(135deg, color-mix(in srgb, ${accent} 7%, transparent), transparent 60%), var(--surface)`,
      }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg border"
          style={chipStyle}
        >
          <span className="w-4 h-4 sm:w-[18px] sm:h-[18px]">{icon}</span>
        </span>
        <h3
          className="text-sm sm:text-[15px] uppercase tracking-wider font-bold"
          style={{ color: accent }}
        >
          {title}
        </h3>
        {items.length > 0 && (
          <span
            className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full border"
            style={chipStyle}
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
                className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full"
                style={{
                  background: accent,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${accent} 15%, transparent)`,
                }}
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
