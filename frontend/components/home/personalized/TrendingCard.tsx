import type { Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import { ACC } from "@/components/home/personalized/accents";
import { IconRocket } from "@/components/home/personalized/DashIcons";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import StockRow, { StockRank } from "@/components/ui/StockRow";

const ROWS = 5;

/** This week's strongest movers with real trading behind them (the top-20
 *  momentum list), five rows: rank, name, one plain line, price + the 7-day
 *  move (the header chip says "7-day", so the change column is that move). */
export default function TrendingCard({
  items,
  held,
  watched,
  lang = "en",
}: {
  items: Top20Item[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const rows = items.slice(0, ROWS);
  if (rows.length === 0) return null;
  return (
    <section className={`soft-card overflow-hidden ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      <DashHeader
        accent={ACC.clay} icon={<IconRocket size={15} />}
        title={t(lang, "trendingTitle")}
        chips={<HeaderChip>{t(lang, "sevenDay")}</HeaderChip>}
        href="/dse-trending-stocks"
        linkLabel={t(lang, "allTrending")}
      />
      <ol className="divide-y divide-cell-rule">
        {rows.map((it, i) => {
          const r7 = it.return_7d_pct;
          const up = (r7 ?? 0) >= 0;
          const weekLine = r7 != null ? t(lang, up ? "upLastWeek" : "downLastWeek", { n: Math.abs(r7).toFixed(1) }) : "";
          const line = bn ? weekLine : it.rationale || weekLine;
          return (
            <StockRow
              key={it.trading_code}
              code={it.trading_code}
              name={it.company_name}
              lang={lang}
              leading={<StockRank n={i + 1} accent={ACC.clay} />}
              mark={<OwnerMark code={it.trading_code} held={held} watched={watched} lang={lang} />}
              sub={line || undefined}
              price={it.ltp}
              change={r7}
            />
          );
        })}
      </ol>
    </section>
  );
}
