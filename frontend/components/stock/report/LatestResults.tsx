import { T } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import type { ResultsExplained } from "@/lib/api";

const TONE: Record<ResultsExplained["level"], string> = {
  good: "text-positive",
  bad: "text-negative",
  watch: "text-watch",
  neutral: "text-text-main",
};

/**
 * The latest results as plain facts — free, in the data room's Profit tab
 * (2026-11-04, audit SP1). /results, the watchlist and the dashboard link to a
 * stock's results; with the report behind Premium those links landed on a page
 * that said nothing about them. The headline and the profit line are what
 * /results shows every reader; what the report means stays in the full report.
 */
export default function LatestResults({ r }: { r: ResultsExplained }) {
  const profit = r.lines.find((l) => l.key === "profit");
  return (
    <div id="latest-results" className="stock-anchor soft-card mb-4 p-4">
      <p className="text-xs font-semibold text-text-muted">
        <T en={`Latest results · ${r.period_en}`} bn={`সর্বশেষ ফল · ${r.period_bn}`} />
        {r.post_date ? (
          <>
            {" · "}
            <T en={`posted ${formatDate(r.post_date)}`} bn={`প্রকাশ ${formatDate(r.post_date)}`} />
          </>
        ) : null}
      </p>
      <p className={`mt-1 text-base font-semibold ${TONE[r.level] ?? "text-text-main"}`}>
        <T en={r.headline_en} bn={r.headline_bn} />
      </p>
      {profit && (
        <p className="mt-1 text-sm text-text-main">
          <T en={profit.en} bn={profit.bn} />
        </p>
      )}
    </div>
  );
}
