import type { Grade, PortfolioAnalysis } from "@/lib/portfolio-analysis";
import SectorBreakdownChart from "./SectorBreakdownChart";
import HoldingsDetailed from "./HoldingsDetailed";

const GRADE_BADGE: Record<Grade, string> = {
  A: "bg-green-500/15 text-green-500 border-green-500/40",
  B: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  C: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  D: "bg-orange-500/15 text-orange-500 border-orange-500/40",
  F: "bg-red-500/15 text-red-500 border-red-500/40",
};

interface Props {
  analysis: PortfolioAnalysis;
  /** When false, skip the sector-breakdown chart. */
  showSectorSpread?: boolean;
  /** When false, skip the per-holding detailed cards. */
  showHoldingsList?: boolean;
  /** When false, skip the trailing guidance disclaimer (caller renders it later). */
  showDisclaimer?: boolean;
}

export default function PortfolioAnalysisView({
  analysis,
  showSectorSpread = true,
  showHoldingsList = true,
  showDisclaimer = true,
}: Props) {
  return (
    <div id="portfolio-analysis" className="flex flex-col gap-4 scroll-mt-20">
      {/* Verdict header */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex flex-col items-center justify-center min-w-[78px] h-[78px] rounded-xl border-2 ${GRADE_BADGE[analysis.grade]}`}
          >
            <span className="text-3xl font-bold leading-none">{analysis.grade}</span>
            <span className="text-[10px] uppercase tracking-wider mt-1 font-semibold">
              {analysis.gradeLabel}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
              Portfolio Verdict
            </p>
            <p className="text-sm sm:text-base text-[var(--text)] leading-relaxed">
              {analysis.headline}
            </p>
          </div>
        </div>
      </div>

      {/* Good / Bad / Consider */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Section
          title="What's Working Well"
          tone="good"
          items={analysis.good}
          emptyText="Positive signals will appear as your portfolio grows."
        />
        <Section
          title="What Needs Your Attention"
          tone="bad"
          items={analysis.bad}
          emptyText="No major red flags spotted."
        />
        <Section
          title="What To Consider"
          tone="consider"
          items={analysis.consider}
          emptyText="Nothing pressing right now."
        />
      </div>

      {/* Sector breakdown chart */}
      {showSectorSpread && <SectorBreakdownChart analysis={analysis} />}

      {/* Detailed per-holding cards */}
      {showHoldingsList && <HoldingsDetailed analysis={analysis} />}

      {showDisclaimer && (
        <p className="text-[10px] text-[var(--text-muted)] text-center mt-1">
          This analysis is for guidance only. Always do your own research before making investment
          decisions.
        </p>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  tone: "good" | "bad" | "consider";
  items: string[];
  emptyText: string;
}

const TONE_CLASSES: Record<
  SectionProps["tone"],
  { wrap: string; bullet: string; title: string }
> = {
  good: {
    wrap: "border-green-500/30 bg-green-500/5",
    bullet: "text-green-500",
    title: "text-green-500",
  },
  bad: {
    wrap: "border-red-500/30 bg-red-500/5",
    bullet: "text-red-500",
    title: "text-red-500",
  },
  consider: {
    wrap: "border-amber-500/30 bg-amber-500/5",
    bullet: "text-amber-500",
    title: "text-amber-500",
  },
};

function Section({ title, tone, items, emptyText }: SectionProps) {
  const c = TONE_CLASSES[tone];
  return (
    <div className={`border ${c.wrap} rounded-xl p-4`}>
      <p className={`text-xs uppercase tracking-wider font-semibold mb-3 ${c.title}`}>{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 leading-relaxed">
              <span className={`shrink-0 mt-0.5 ${c.bullet}`} aria-hidden>
                •
              </span>
              <span className="text-[var(--text)]">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
