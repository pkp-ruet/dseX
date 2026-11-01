import type { PopularStockItem, RankingsToday, ScoreItem, Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, companyShort } from "@/lib/formatters";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import StockRow from "@/components/ui/StockRow";
import { tt } from "@/components/home/tt";
import { Move } from "@/components/ranking/RankList";

const ROWS = 3;

/**
 * "More ways to find stocks" — lists that used to be full cards (top ranked,
 * trending, popular: ~40 rows down the page) as ONE swipe rail of same-shape
 * cards, three names each with the one number that put them there, and a
 * "See all" into each full page. Used by the dashboard's "Find stocks"
 * chapter (ranked · trending — popular dropped 2026-10-27; the Buy signals
 * and tips cards left 2026-11-01 with the Buy signals page). The ranked card
 * wears the ranking page's look since 2026-11-01: rank chip, company, this
 * week's change pill — no score.
 */
export default function DiscoverRail({
  stocks,
  trending,
  popular = [],
  moves = null,
  held,
  watched,
  lang = "en",
}: {
  /** Every scored company (for the top of the ranking). */
  stocks: ScoreItem[];
  trending: Top20Item[];
  /** Omitted on the dashboard since 2026-10-27 (user decision); no card when empty. */
  popular?: PopularStockItem[];
  /** This week's rank change (`/api/user/home` `rank_moves`); no pills without it. */
  moves?: RankingsToday["moves"];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const mark = (code: string) => <OwnerMark code={code} held={held} watched={watched} lang={lang} />;

  const scored = stocks.filter((s) => s.score != null);
  // The ranking page's order: highest score first, ties by code.
  const ranked = [...scored]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.trading_code.localeCompare(b.trading_code))
    .slice(0, ROWS);
  const newCodes = new Set(moves?.new ?? []);
  const moveOf = (code: string) =>
    !moves ? null : newCodes.has(code) ? ("new" as const) : moves.places[code] ?? 0;
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
            sub={tt("rankedSub")}
            href="/dsestockranking"
            linkLabel={tt("fullRanking")}
          >
            {ranked.map((s, i) => (
              <StockRow
                key={s.trading_code}
                size="sm"
                stack
                code={s.trading_code}
                name={companyShort(s.company_name) || s.company_name}
                lang={lang}
                mark={mark(s.trading_code)}
                leading={
                  <span className={`rk-pos rk-pos--sm rk-pos--${i + 1}`} aria-hidden="true">
                    {i + 1}
                  </span>
                }
                right={<Move move={moveOf(s.trading_code)} />}
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
