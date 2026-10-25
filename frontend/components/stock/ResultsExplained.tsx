"use client";

import Link from "next/link";
import type { ResultsExplained as ResultsData } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { RESULT_LEVEL } from "@/lib/results";
import Card from "@/components/ui/Card";
import SectionTitle from "@/components/stock/SectionTitle";
import PremiumGate from "@/components/premium/PremiumGate";
import { useStockLang } from "@/context/StockLangContext";

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
 * services/results_explainer.py). The headline and the profit line are free;
 * the rest is Premium (screen-only lock).
 */
export default function ResultsExplained({ results, code }: { results: ResultsData; code: string }) {
  const { lang } = useStockLang();
  const isBn = lang === "bn";
  const level = RESULT_LEVEL[results.level];
  const [first, ...rest] = results.lines;
  const t = (en: string, bn: string) => (isBn ? bn : en);

  const line = (l: ResultsData["lines"][number]) => (
    <li key={l.key} className="flex gap-2.5">
      <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE[l.tone]}`} />
      <span className="text-sm leading-relaxed text-text-main">{t(l.en, l.bn)}</span>
    </li>
  );

  return (
    <section id="results" className="mb-8 stock-anchor">
      <SectionTitle
        title="Latest results, explained"
        sub="The newest quarterly report in plain words."
        bn="সর্বশেষ ত্রৈমাসিক ফল, সহজ ভাষায়।"
      />
      <Card padding="lg" className={isBn ? "font-bn" : ""}>
        <div lang={isBn ? "bn" : undefined}>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${level.pill}`}>
              {t(level.en, level.bn)}
            </span>
            {results.post_date && (
              <span className="text-xs text-text-muted">
                {t(`Posted ${formatDate(results.post_date)}`, `প্রকাশ ${formatDate(results.post_date)}`)}
              </span>
            )}
          </div>
          <p className="mt-3 text-lg font-bold text-text-main">{t(results.headline_en, results.headline_bn)}</p>
          {first && <ul className="mt-3 space-y-2">{line(first)}</ul>}
          {rest.length > 0 && (
            <PremiumGate
              label={t("What this report means", "এই ফলের মানে কী")}
              peek={56}
              stakes={[t(`${rest.length} more points on ${code}'s report, and what it means`,
                         `${code}-এর ফল নিয়ে আরও ${rest.length}টি কথা, আর এর মানে কী`)]}
              className="mt-2"
            >
              <ul className="space-y-2">{rest.map(line)}</ul>
              <p className="mt-4 rounded-lg bg-surface-2 p-3 text-sm font-semibold text-text-main">
                {t(results.meaning_en, results.meaning_bn)}
              </p>
            </PremiumGate>
          )}
          <p className="mt-3 text-xs text-text-muted">
            {t("From the company's own quarterly post on DSE. Quarterly figures are not audited.",
               "DSE-তে কোম্পানির নিজের ত্রৈমাসিক প্রকাশ থেকে। ত্রৈমাসিক হিসাব নিরীক্ষিত নয়।")}{" "}
            <Link href="/results" className="font-semibold text-primary">
              {t("Every company's latest results", "সব কোম্পানির সর্বশেষ ফল")}
            </Link>
          </p>
        </div>
      </Card>
    </section>
  );
}
