import { T } from "@/components/i18n/T";
import { sectorBn } from "@/lib/bn";
import type { SectorComparisonRow, SectorSummary } from "@/lib/api";
import SectionHeader from "@/components/ui/SectionHeader";

function fmt(row: SectorComparisonRow, value: number | null) {
  if (value == null) return "—";
  if (row.metric === "median_score") return value.toFixed(1);
  if (row.metric.endsWith("_pct")) return `${value.toFixed(1)}%`;
  return value.toFixed(2);
}

/** The measure names in both languages, by metric key (the backend label is the fallback). */
const METRIC_WORDS: Record<string, { en: string; bn: string }> = {
  median_score: { en: "Score", bn: "স্কোর" },
  median_pe: { en: "P/E", bn: "পিই" },
  median_pb: { en: "P/B", bn: "পিবি" },
  median_yield_pct: { en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
  median_roe_pct: { en: "Return on equity", bn: "মূলধনে মুনাফার হার" },
};

/** Reads "cheaper"/"richer" style verdicts off the gap, honouring direction. */
function verdict(row: SectorComparisonRow) {
  if (row.gap_pct == null) return { en: "—", bn: "—", color: "var(--text-muted)" };
  const rounded = Math.round(row.gap_pct);
  if (rounded === 0) return { en: "Same as market", bn: "বাজারের সমান", color: "var(--text-muted)" };
  const above = rounded > 0;
  const favourable = above === row.higher_is_better;
  const n = `${above ? "+" : ""}${rounded}%`;
  return {
    en: `${n} vs market`,
    bn: `বাজারের চেয়ে ${n}`,
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
      <SectionHeader
        title={
          <T
            en={`${summary.sector} vs the whole market`}
            bn={`${sectorBn(summary.sector)} বনাম পুরো বাজার`}
          />
        }
        className="mt-8"
      />

      <p className="mb-4 text-sm font-semibold text-text-main">
        <T
          en={`The middle value of the ${summary.company_count} companies in this sector, against the middle value of all ${marketCount} scored DSE companies.`}
          bn={`এই সেক্টরের ${summary.company_count}টি কোম্পানির মধ্যম মান, ডিএসইর স্কোর পাওয়া ${marketCount}টি কোম্পানির মধ্যম মানের পাশে।`}
        />
      </p>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="px-2 py-2.5 sm:px-3 text-xs font-semibold text-text-muted">
                <T en="Measure" bn="মাপকাঠি" />
              </th>
              <th className="px-2 py-2.5 sm:px-3 text-right text-xs font-semibold text-text-muted">
                <T en="This sector" bn="এই সেক্টর" />
              </th>
              <th className="px-2 py-2.5 sm:px-3 text-right text-xs font-semibold text-text-muted">
                <T en="Whole market" bn="পুরো বাজার" />
              </th>
              <th className="px-2 py-2.5 sm:px-3 text-right text-xs font-semibold text-text-muted">
                <T en="Difference" bn="পার্থক্য" />
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const v = verdict(r);
              return (
                <tr key={r.metric} className="border-b border-border last:border-0">
                  <td className="px-2 py-2.5 sm:px-3 text-sm font-bold text-text-main">
                    <T en={METRIC_WORDS[r.metric]?.en ?? r.label} bn={METRIC_WORDS[r.metric]?.bn ?? r.label} />
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 text-right text-sm font-extrabold tabular-nums text-text-main">
                    {fmt(r, r.sector)}
                  </td>
                  <td className="px-2 py-2.5 sm:px-3 text-right text-sm font-semibold tabular-nums text-text-muted">
                    {fmt(r, r.market)}
                  </td>
                  <td
                    className="px-2 py-2.5 sm:px-3 text-right text-sm font-extrabold tabular-nums"
                    style={{ color: v.color }}
                  >
                    <T en={v.en} bn={v.bn} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-xs font-semibold text-text-muted">
        <T
          en="Green means the sector looks better than the market on that measure, such as a lower P/E or a higher yield. It says nothing about any single company in the list below."
          bn="সবুজ মানে ওই মাপকাঠিতে সেক্টরটি বাজারের চেয়ে ভালো, যেমন কম পিই বা বেশি ইল্ড। নিচের তালিকার কোনো একটি কোম্পানি সম্পর্কে এটি কিছু বলে না।"
        />
      </p>
    </section>
  );
}
