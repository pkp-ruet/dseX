import Link from "next/link";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow from "@/components/ui/StockRow";
import Button from "@/components/ui/Button";
import type { HomeBundle } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import { RESULT_LEVEL } from "@/lib/results";

type Week = NonNullable<HomeBundle["results_week"]>;

/**
 * The market's quarterly results on the dashboard, for every signed-in
 * reader: how many companies posted results this week and how they read, the
 * three newest reports, and a button to `/results`. Free readers also get one
 * line on what Premium adds (every company's results, what each report means,
 * an alert on results day); Premium readers get no pitch.
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
  const { good = 0, bad = 0 } = week.counts;
  const lead = week.recent
    ? bn
      ? `এই সপ্তাহে ${week.recent}টি কোম্পানি ত্রৈমাসিক ফল দিয়েছে — ${good}টির লাভ বেড়েছে, ${bad}টির কমেছে।`
      : `${week.recent} ${week.recent === 1 ? "company" : "companies"} posted quarterly results this week — ${good} earned more than a year ago, ${bad} less.`
    : bn
      ? `${week.total}টি কোম্পানির সর্বশেষ ত্রৈমাসিক ফল, এক জায়গায়।`
      : `The latest quarterly results of ${week.total} companies, in one place.`;

  return (
    <section className="soft-card dash-box overflow-hidden" lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "resultsPromoTitle")} href="/results" linkLabel={t(lang, "seeAll")} />
      <p className={`px-4 pb-2 text-sm text-text-main sm:px-5 ${bn ? "font-bn" : ""}`}>{lead}</p>
      <ul className={`divide-y divide-cell-rule ${bn ? "font-bn" : ""}`}>
        {week.latest.map((r) => (
          <StockRow
            key={r.code}
            as="li"
            inset="card"
            code={r.code}
            name={r.name}
            href={`/stock/${encodeURIComponent(r.code)}#results`}
            mark={<OwnerMark code={r.code} held={held} watched={watched} lang={lang} />}
            sub={bn ? r.headline_bn : r.headline_en}
            subTone={RESULT_LEVEL[r.level].tone}
            subClamp
            detail={bn ? `প্রকাশ ${formatDate(r.post_date)}` : `Posted ${formatDate(r.post_date)}`}
            price={r.price}
            change={r.change_pct}
            lang={lang}
          />
        ))}
      </ul>
      <div className={`border-t border-border p-4 sm:px-5 ${bn ? "font-bn" : ""}`}>
        <Button href="/results" variant="primary" block>
          {premium
            ? bn ? "সব কোম্পানির ফল দেখুন" : "See every company's results"
            : bn ? "সর্বশেষ ফল দেখুন" : "See the latest results"}
        </Button>
        {!premium && (
          <p className="mt-3 text-xs text-text-muted">
            {bn
              ? "প্রিমিয়ামে সব কোম্পানির ফল এক তালিকায়, প্রতিটি ফলের মানে — আর আপনার শেয়ারের ফল এলেই সেদিনই অ্যালার্ট। "
              : "Premium opens every company's results, says what each report means, and alerts you the day results come out for your stocks. "}
            <Link href="/premium" className="font-semibold text-primary">
              {bn ? "প্রিমিয়াম দেখুন" : "See Premium"}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
