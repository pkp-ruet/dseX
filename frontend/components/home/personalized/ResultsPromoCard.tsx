import Link from "next/link";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import Button from "@/components/ui/Button";
import ResultRow from "@/components/results/ResultRow";
import type { HomeBundle } from "@/lib/api";
import { t } from "@/lib/home-copy";
import { RESULT_LEVEL, RESULT_LEVEL_ORDER } from "@/lib/results";

type Week = NonNullable<HomeBundle["results_week"]>;

/**
 * The market's quarterly results on the dashboard, for every signed-in
 * reader, in the /results page's look (2026-10-28, `rs-*` in
 * app/styles/results.css): how many companies posted results this week, the
 * week's split as one bar with a key (Better · Mixed · Weaker · About the
 * same), the three newest reports as the page's own `ResultRow`s (company
 * name, level, "EPS ৳2.10 · a year ago ৳1.80", the profit move leading), and a
 * button to `/results`. Free readers also get one line on what Premium adds;
 * Premium readers get no pitch.
 */
export default function ResultsPromoCard({
  week, held, watched, lang, premium = false,
}: {
  week: Week;
  held: Set<string>;
  watched: Set<string>;
  lang: "en" | "bn";
  /** Premium reader: no pitch, and the button opens the whole list. */
  premium?: boolean;
}) {
  if (!week.total) return null;
  const bn = lang === "bn";
  const lead = week.recent
    ? bn
      ? `এই সপ্তাহে ${week.recent}টি কোম্পানি প্রান্তিকের ফল দিয়েছে।`
      : `${week.recent} ${week.recent === 1 ? "company" : "companies"} posted quarterly results this week.`
    : bn
      ? `${week.total}টি কোম্পানির সর্বশেষ প্রান্তিকের ফল, এক জায়গায়। নতুনগুলো নিচে।`
      : `The latest quarterly results of ${week.total} companies, in one place. The newest are below.`;
  const split = RESULT_LEVEL_ORDER.filter((lv) => (week.counts[lv] ?? 0) > 0);

  return (
    <section className="soft-card dash-box overflow-hidden" lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "resultsPromoTitle")} href="/results" linkLabel={t(lang, "seeAll")} />
      <div className={`px-4 pb-4 sm:px-5 ${bn ? "font-bn" : ""}`}>
        <p className="text-sm text-text-main">{lead}</p>
        {week.recent > 0 && split.length > 0 && (
          <>
            <div className="rs-split mt-3" aria-hidden="true">
              {split.map((lv) => (
                <span key={lv} className={`rs-lv--${lv}`} style={{ width: `${(week.counts[lv] / week.recent) * 100}%` }} />
              ))}
            </div>
            <ul className="rs-legend">
              {split.map((lv) => (
                <li key={lv}>
                  <span className={`rs-dot rs-lv--${lv}`} aria-hidden="true" />
                  <b>{week.counts[lv]}</b> {bn ? RESULT_LEVEL[lv].shortBn : RESULT_LEVEL[lv].short}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {week.latest.length > 0 && (
        <>
          <p className={`rs-card-label ${bn ? "font-bn" : ""}`}>{bn ? "সর্বশেষ প্রতিবেদন" : "Newest reports"}</p>
          <ul className={`rs-list ${bn ? "font-bn" : ""}`}>
            {week.latest.map((r) => (
              <li key={r.code}>
                <ResultRow r={r} mark={<OwnerMark code={r.code} held={held} watched={watched} lang={lang} />} />
              </li>
            ))}
          </ul>
        </>
      )}

      <div className={`border-t border-cell-rule p-4 sm:px-5 ${bn ? "font-bn" : ""}`}>
        <Button href="/results" variant="primary" block>
          {premium
            ? bn ? "সব কোম্পানির ফল দেখুন" : "See every company's results"
            : bn ? "সর্বশেষ ফল দেখুন" : "See the latest results"}
        </Button>
        {!premium && (
          <p className="mt-3 text-xs text-text-muted">
            {bn
              ? "প্রিমিয়ামে সব কোম্পানির ফল খোলা, শুধু আপনার শেয়ারের ফল আলাদা করে দেখা যায়, আর আপনার শেয়ারের ফল এলে সেদিনই অ্যালার্ট আসে। "
              : "Premium opens every company's results, shows just your own stocks' results, and alerts you the day your stocks report. "}
            <Link href="/premium" className="font-semibold text-primary">
              {bn ? "প্রিমিয়াম দেখুন" : "See Premium"}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
