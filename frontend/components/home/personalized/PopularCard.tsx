import type { PopularStockItem } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconHeart } from "@/components/home/personalized/DashIcons";
import DashHeader from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow, { StockRank } from "@/components/ui/StockRow";

const ROWS = 5;

/** The most-viewed stocks on TopStockBD — what other readers are checking. */
export default function PopularCard({
  items,
  held,
  watched,
  lang = "en",
}: {
  items: PopularStockItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const rows = items.slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader title={t(lang, "popularTitle")} href="/dse-popular-stocks" linkLabel={t(lang, "seeAll")} accent={ACC.steel} icon={<IconHeart size={15} />} />
      <ol className="divide-y divide-cell-rule">
        {rows.map((it, i) => (
          <StockRow
            key={it.trading_code}
            code={it.trading_code}
            name={it.company_name}
            lang={lang}
            leading={<StockRank n={i + 1} accent={ACC.steel} />}
            mark={<OwnerMark code={it.trading_code} held={held} watched={watched} lang={lang} />}
            sub={<span className="tabular-nums nums">{t(lang, "views", { n: it.visits_total.toLocaleString("en-US") })}</span>}
            price={it.ltp}
            change={it.change_pct}
          />
        ))}
      </ol>
    </section>
  );
}
