import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow from "@/components/ui/StockRow";
import type { LatestResultRow } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { t } from "@/lib/home-copy";
import { RESULT_LEVEL } from "@/lib/results";

/**
 * "New results on your stocks" — quarterly reports on the reader's holdings
 * and watchlist posted in the last three weeks (from the home bundle's
 * `new_results`), each a plain headline that opens the explainer on the
 * stock page. Renders nothing when there is nothing new.
 */
export default function NewResultsCard({
  rows, held, watched, lang,
}: {
  rows: LatestResultRow[];
  held: Set<string>;
  watched: Set<string>;
  lang: "en" | "bn";
}) {
  if (!rows.length) return null;
  const bn = lang === "bn";
  return (
    <section className="soft-card overflow-hidden" lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "newResults")} href="/results" linkLabel={t(lang, "seeAll")} />
      <ul className={`divide-y divide-cell-rule ${bn ? "font-bn" : ""}`}>
        {rows.map((r) => (
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
    </section>
  );
}
