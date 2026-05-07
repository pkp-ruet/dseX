import type { PortfolioAnalysis } from "@/lib/portfolio-analysis";

interface Props {
  analysis: PortfolioAnalysis;
}

const BAR_COLORS = [
  "bg-[var(--primary)]",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
];

export default function SampleSectorChart({ analysis }: Props) {
  if (analysis.sectorSpread.length === 0) return null;

  const max = Math.max(...analysis.sectorSpread.map((s) => s.weightPct));

  return (
    <section className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1 font-semibold">
        Sector Breakdown
      </p>
      <p className="text-xs text-[var(--text-muted)] mb-4">
        How the portfolio is split across sectors. A balanced spread reduces single-sector
        risk.
      </p>
      <ul className="flex flex-col gap-3">
        {analysis.sectorSpread.map((s, i) => (
          <li key={s.name} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-[var(--text)]">{s.name}</span>
              <span className="text-[var(--text-muted)]">
                {s.weightPct.toFixed(0)}% · {s.count} stock{s.count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-[var(--border)]/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                style={{ width: `${(s.weightPct / max) * 100}%` }}
                aria-hidden
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
