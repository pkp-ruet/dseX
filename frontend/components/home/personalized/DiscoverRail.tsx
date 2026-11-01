import type { PopularStockItem, ScoreItem, Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, companyShort } from "@/lib/formatters";
import { getTier, type TierKey } from "@/lib/constants";
import { t } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import StockRow from "@/components/ui/StockRow";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

const ROWS = 3;

const TIER_TEXT: Record<TierKey, string> = {
  excellent: "text-tier-excellent",
  good: "text-tier-good",
  average: "text-tier-average",
  weak: "text-tier-weak",
};

/**
 * "More ways to find stocks" — lists that used to be full cards (top ranked,
 * trending, popular: ~40 rows down the page) as ONE swipe rail of same-shape
 * cards, three names each with the one number that put them there, and a
 * "See all" into each full page. Used by the dashboard's "Find stocks"
 * chapter (ranked · trending — popular dropped 2026-10-27; the Buy signals
 * and tips cards left 2026-11-01 with the Buy signals page).
 */
export default function DiscoverRail({
  stocks,
  trending,
  popular = [],
  held,
  watched,
  lang = "en",
}: {
  /** Every scored company (for the top of the ranking). */
  stocks: ScoreItem[];
  trending: Top20Item[];
  /** Omitted on the dashboard since 2026-10-27 (user decision); no card when empty. */
  popular?: PopularStockItem[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const mark = (code: string) => <OwnerMark code={code} held={held} watched={watched} lang={lang} />;

  const scored = stocks.filter((s) => s.score != null);
  const ranked = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, ROWS);
  const trendRows = trending.slice(0, ROWS);
  const popularRows = popular.slice(0, ROWS);

  if (!ranked.length && !trendRows.length && !popularRows.length) return null;

  return (
    <div>
      <RailHeader title={tt("discoverTitle")} sub={tt("discoverSub")} />
      <Rail>
        {ranked.length > 0 && (
          <RailCard
            title={tt("rankedTitle")}
            sub={tt("ofN", { n: scored.length })}
            href="/dsestockranking"
            linkLabel={tt("fullRanking")}
          >
            {ranked.map((s) => (
              <StockRow
                key={s.trading_code}
                size="sm"
                stack
                code={s.trading_code}
                name={companyShort(s.company_name) || s.company_name}
                lang={lang}
                mark={mark(s.trading_code)}
                right={
                  <span className={`block text-sm font-bold tabular-nums nums ${TIER_TEXT[getTier(s.score)]}`}>
                    {Math.round(s.score ?? 0)}
                    <span className="text-xs font-semibold text-text-muted">{tt("outOf100")}</span>
                  </span>
                }
              />
            ))}
          </RailCard>
        )}

        {trendRows.length > 0 && (
          <RailCard
            title={tt("trendingTitle")}
            sub={tt("trendingSub")}
            href="/dse-trending-stocks"
            linkLabel={tt("allTrending")}
          >
            {trendRows.map((it) => (
              <StockRow
                key={it.trading_code}
                size="sm"
                stack
                code={it.trading_code}
                name={companyShort(it.company_name) || it.company_name}
                lang={lang}
                mark={mark(it.trading_code)}
                right={
                  <span className={`block text-sm font-bold tabular-nums nums ${changeTone(it.return_7d_pct)}`}>
                    {changePct(it.return_7d_pct, 1)}
                  </span>
                }
              />
            ))}
          </RailCard>
        )}

        {popularRows.length > 0 && (
          <RailCard
            title={tt("popularTitle")}
            sub={tt("popularSub")}
            href="/dse-popular-stocks"
            linkLabel={tt("seeAll")}
          >
            {popularRows.map((it) => (
              <StockRow
                key={it.trading_code}
                size="sm"
                stack
                code={it.trading_code}
                name={companyShort(it.company_name) || it.company_name}
                lang={lang}
                mark={mark(it.trading_code)}
                right={
                  <span className="block text-xs font-semibold tabular-nums nums text-text-muted">
                    {tt("views", { n: it.visits_total.toLocaleString("en-US") })}
                  </span>
                }
              />
            ))}
          </RailCard>
        )}
      </Rail>
    </div>
  );
}
