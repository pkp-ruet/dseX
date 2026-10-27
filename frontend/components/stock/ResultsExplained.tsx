import Link from "next/link";
import type { ResultsExplained as ResultsData } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";
import { RESULT_LEVEL } from "@/lib/results";
import Card from "@/components/ui/Card";
import PremiumMask from "@/components/premium/PremiumMask";
import { T } from "@/components/i18n/T";

const TONE: Record<ResultsData["lines"][number]["tone"], string> = {
  good: "bg-positive",
  bad: "bg-negative",
  neutral: "bg-border",
};

/**
 * "Latest results, explained" — the newest quarterly report (DSE's Q1/Q2/Q3
 * post) in plain words: profit so far this year, the latest quarter alone,
 * cash from the business, what the price costs on the last 12 months'
 * profit, how our score moved, and one sentence on what it means (backend
 * services/results_explainer.py). Lives in the stock page's full verdict: the
 * headline and the profit line are free, the rest sits behind `PremiumMask`.
 */
export default function ResultsExplained({ results }: { results: ResultsData }) {
  const level = RESULT_LEVEL[results.level];
  const [first, ...rest] = results.lines;

  const line = (l: ResultsData["lines"][number]) => (
    <li key={l.key} className="flex gap-2.5">
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[l.tone]}`} />
      <span className="text-sm leading-relaxed text-text-main">
        <T en={l.en} bn={l.bn} />
      </span>
    </li>
  );

  return (
    <Card padding="lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${level.pill}`}>
          <T en={level.en} bn={level.bn} />
        </span>
        {results.post_date && (
          <span className="text-xs text-text-muted">
            <T
              en={`Published ${formatDate(results.post_date)}`}
              bn={`প্রকাশ: ${bnDate(results.post_date) || formatDate(results.post_date)}`}
            />
          </span>
        )}
      </div>
      <p className="mt-3 text-lg font-bold text-text-main">
        <T en={results.headline_en} bn={results.headline_bn} />
      </p>
      {first && <ul className="mt-3 space-y-2">{line(first)}</ul>}
      {rest.length > 0 && (
        <PremiumMask lines={3} className="mt-3">
          <ul className="space-y-2">{rest.map(line)}</ul>
          <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm font-semibold text-text-main">
            <T en={results.meaning_en} bn={results.meaning_bn} />
          </p>
        </PremiumMask>
      )}
      <p className="mt-3 text-xs text-text-muted">
        <T
          en="Taken from the company's own quarterly report on DSE. Quarterly figures are not audited."
          bn="DSE-তে কোম্পানির নিজের প্রান্তিক প্রতিবেদন থেকে নেওয়া। প্রান্তিকের হিসাব নিরীক্ষিত নয়।"
        />{" "}
        <Link href="/results" className="font-semibold text-primary">
          <T en="See every company's latest results" bn="সব কোম্পানির সর্বশেষ ফল দেখুন" />
        </Link>
      </p>
    </Card>
  );
}
