import Link from "next/link";
import type { PortfolioAnalysis, QualityWord } from "@/lib/portfolio-analysis";
import { PILLAR_META, pillarColor } from "@/lib/insight-utils";
import { taka } from "@/lib/formatters";

const QUALITY_THEME: Record<
  QualityWord,
  { dot: string; chip: string; label: string }
> = {
  Strong: {
    dot: "bg-green-400",
    chip: "bg-green-500/15 text-green-400 border-green-500/30",
    label: "Strong company",
  },
  Solid: {
    dot: "bg-blue-400",
    chip: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    label: "Solid company",
  },
  Average: {
    dot: "bg-amber-400",
    chip: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "Average company",
  },
  Weak: {
    dot: "bg-red-400",
    chip: "bg-red-500/15 text-red-400 border-red-500/30",
    label: "Weak company",
  },
  Unrated: {
    dot: "bg-gray-400",
    chip: "bg-gray-500/15 text-gray-400 border-gray-500/30",
    label: "Unrated",
  },
};

interface Props {
  analysis: PortfolioAnalysis;
}

export default function HoldingsDetailed({ analysis }: Props) {
  const sorted = [...analysis.holdings].sort((a, b) => b.weightPct - a.weightPct);

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
            Holdings Breakdown
          </h3>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-0.5 leading-relaxed">
            Each stock scored on five fundamentals: business quality, financial health,
            competitive moat, valuation, and dividend.
          </p>
        </div>
      </div>

      {sorted.map((h) => {
        const pnlAmount = h.pnlPct != null && h.ltp != null ? (h.ltp - h.buyPrice) * h.qty : null;
        const currentValue = h.ltp != null ? h.ltp * h.qty : null;
        const pnlIsUp = pnlAmount != null && pnlAmount > 0;
        const pnlIsDown = pnlAmount != null && pnlAmount < 0;
        const pnlColor =
          pnlIsUp ? "text-green-400" : pnlIsDown ? "text-red-400" : "text-[var(--text)]";
        const qt = QUALITY_THEME[h.qualityWord];

        return (
          <article
            key={h.code}
            className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--primary)]/40 transition-colors"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-[var(--border)]">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/stock/${h.code}`}
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
                  <p className="text-2xl sm:text-3xl font-black text-[var(--text)] leading-none mt-1 tabular-nums">
                    {h.score.toFixed(0)}
                    <span className="text-xs sm:text-sm text-[var(--text-muted)] font-semibold">
                      /100
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Numbers row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4 p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--bg)]/30">
              <Cell label="Buy Price" value={taka(h.buyPrice, 2)} />
              <Cell label="Qty" value={h.qty.toLocaleString()} />
              <Cell label="LTP" value={h.ltp != null ? taka(h.ltp, 2) : "—"} />
              <Cell
                label="Current Value"
                value={currentValue != null ? taka(currentValue, 0) : "—"}
              />
              <Cell
                label="P&L"
                value={
                  pnlAmount == null
                    ? "—"
                    : `${pnlAmount > 0 ? "+" : ""}${taka(pnlAmount, 0)}${
                        h.pnlPct != null
                          ? ` (${h.pnlPct > 0 ? "+" : ""}${h.pnlPct.toFixed(1)}%)`
                          : ""
                      }`
                }
                valueClass={pnlColor}
              />
            </div>

            {/* Pillar bars */}
            {h.score != null && (
              <div className="p-4 sm:p-5 border-b border-[var(--border)]">
                <p className="text-[11px] sm:text-xs uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3.5">
                  Strength Across Five Pillars
                </p>
                <div className="flex flex-col gap-2.5">
                  {PILLAR_META.map((p) => {
                    const v = h.pillars[p.key];
                    return (
                      <div key={p.key} className="flex items-center gap-3 text-sm">
                        <span className="text-xs sm:text-[13px] text-[var(--text)] w-32 sm:w-40 shrink-0 font-medium">
                          {p.label}
                        </span>
                        <div className="h-2.5 flex-1 rounded-full bg-[var(--border)]/40 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${v != null ? (v / 10) * 100 : 0}%`,
                              backgroundColor: pillarColor(v),
                            }}
                            aria-hidden
                          />
                        </div>
                        <span
                          className="text-sm font-black tabular-nums w-10 text-right shrink-0"
                          style={{ color: pillarColor(v) }}
                        >
                          {v != null ? `${v.toFixed(1)}` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entry label + link */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5 mt-0.5 shrink-0 text-[var(--primary)]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
                </svg>
                <p className="text-sm sm:text-[15px] text-[var(--text)] leading-[1.65] flex-1 italic">
                  {h.entryLabel}
                </p>
              </div>
              <Link
                href={`/stock/${h.code}`}
                className="inline-flex items-center justify-center gap-1 text-sm font-bold text-[var(--primary)] hover:underline shrink-0 px-3 py-1.5 rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-colors"
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
          </article>
        );
      })}
    </section>
  );
}

function Cell({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-1">
        {label}
      </p>
      <p className={`text-sm sm:text-base font-bold tabular-nums ${valueClass ?? "text-[var(--text)]"}`}>
        {value}
      </p>
    </div>
  );
}
