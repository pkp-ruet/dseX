import Bn from "@/components/i18n/Bn";
import type { SectorComparisonRow, SectorSummary } from "@/lib/api";

function fmt(row: SectorComparisonRow, value: number | null) {
  if (value == null) return "—";
  if (row.metric === "median_score") return value.toFixed(1);
  if (row.metric.endsWith("_pct")) return `${value.toFixed(1)}%`;
  return value.toFixed(2);
}

/** Reads "cheaper"/"richer" style verdicts off the gap, honouring direction. */
function verdict(row: SectorComparisonRow) {
  if (row.gap_pct == null) return { text: "—", color: "var(--text-muted)" };
  const rounded = Math.round(row.gap_pct);
  if (rounded === 0) return { text: "in line", color: "var(--text-muted)" };
  const above = rounded > 0;
  const favourable = above === row.higher_is_better;
  return {
    text: `${above ? "+" : ""}${rounded}% vs market`,
    color: favourable ? "var(--positive)" : "var(--negative)",
  };
}

/**
 * Sector medians against the whole-market medians.
 *
 * Direction matters: a lower P/E is favourable, a higher yield is favourable, so
 * `higher_is_better` decides the colour rather than the sign alone. These are
 * medians of the companies we score — a description of the group, not a call on it.
 */
export default function SectorVsMarket({
  rows,
  summary,
  marketCount,
}: {
  rows: SectorComparisonRow[];
  summary: SectorSummary;
  marketCount: number;
}) {
  return (
    <section className="mb-8" id="vs-market">
      <div className="section-rule-modern">
        <span className="section-rule-text">{summary.sector} vs the Whole Market</span>
      </div>

      <p className="mb-1 text-[0.88rem] font-semibold text-[var(--text)]">
        Median of the {summary.company_count} companies in this sector, against the median of
        all {marketCount} scored DSE companies.
      </p>
      <Bn className="mb-4 text-[0.9rem] font-medium leading-[1.85] text-[var(--text-muted)]">
        এই সেক্টরের মধ্যম মান বাজারের মধ্যম মানের সাথে তুলনা — সস্তা না দামি, তা এক নজরে।
      </Bn>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full min-w-[440px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <th className="px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Measure
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                This sector
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Whole market
              </th>
              <th className="px-3 py-2.5 text-right text-[10px] font-extrabold uppercase tracking-[0.13em] text-[var(--text-muted)]">
                Difference
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = verdict(r);
              return (
                <tr key={r.metric} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-3 py-2.5 text-[0.84rem] font-bold text-[var(--text)]">{r.label}</td>
                  <td className="px-3 py-2.5 text-right text-[0.84rem] font-extrabold tabular-nums text-[var(--text)]">
                    {fmt(r, r.sector)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-[0.84rem] font-semibold tabular-nums text-[var(--text-muted)]">
                    {fmt(r, r.market)}
                  </td>
                  <td
                    className="px-3 py-2.5 text-right text-[0.8rem] font-extrabold tabular-nums"
                    style={{ color: v.color }}
                  >
                    {v.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-[0.72rem] font-semibold text-[var(--text-muted)]">
        Green means the sector reads better than the market on that measure — a lower P/E, a
        higher yield. It says nothing about any single company in the list below.
      </p>
    </section>
  );
}
