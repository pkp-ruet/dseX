import type { DailyTip, PopularStockItem, ScoreItem, Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone } from "@/lib/formatters";
import { getTier, type TierKey } from "@/lib/constants";
import { KIND_TONE, TIP_KIND } from "@/lib/home-ideas";
import { t } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import SignalChip from "@/components/ui/SignalChip";
import StockRow, { TONE_TEXT } from "@/components/ui/StockRow";

const ROWS = 3;

const TIER_TEXT: Record<TierKey, string> = {
  excellent: "text-tier-excellent",
  good: "text-tier-good",
  average: "text-tier-average",
  weak: "text-tier-weak",
};

/** Followed first, then Strong, then by fundamental score. */
function orderBuys(list: ScoreItem[], followed: Set<string>): ScoreItem[] {
  return [...list].sort(
    (a, b) =>
      Number(followed.has(b.trading_code.toUpperCase())) - Number(followed.has(a.trading_code.toUpperCase())) ||
      Number(b.signal?.strength === "strong") - Number(a.signal?.strength === "strong") ||
      (b.score ?? -1) - (a.score ?? -1),
  );
}

/**
 * "More ways to find stocks" — five lists that used to be five full cards
 * (buy signals, top ranked, trending, popular, tips: ~40 rows down the page)
 * as ONE swipe rail of same-shape cards, three names each with the one number
 * that put them there, and a "See all" into each full page. Same data, half
 * the scroll. Used by the dashboard's "Worth a look" chapter and the landing
 * page's "Worth a look" block.
 */
export default function DiscoverRail({
  buys,
  stocks,
  trending,
  popular,
  tips,
  held,
  watched,
  lang = "en",
}: {
  /** Today's whole-market Buy signals. */
  buys: ScoreItem[];
  /** Every scored company (for the top of the ranking). */
  stocks: ScoreItem[];
  trending: Top20Item[];
  popular: PopularStockItem[];
  tips: DailyTip[];
  held: Set<string>;
  watched: Set<string>;
  lang?: Lang;
}) {
  const bn = lang === "bn";
  const followed = new Set([...held, ...watched]);
  const mark = (code: string) => <OwnerMark code={code} held={held} watched={watched} lang={lang} />;

  const buyRows = orderBuys(buys, followed).slice(0, ROWS);
  const scored = stocks.filter((s) => s.score != null);
  const ranked = [...scored].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, ROWS);
  const trendRows = trending.slice(0, ROWS);
  const popularRows = popular.slice(0, ROWS);
  const tipRows = tips.slice(0, ROWS);

  if (!buyRows.length && !ranked.length && !trendRows.length && !popularRows.length && !tipRows.length) return null;

  return (
    <div className={bn ? "font-bn" : undefined} lang={bn ? "bn" : undefined}>
      <RailHeader title={t(lang, "discoverTitle")} />
      <Rail>
        {buyRows.length > 0 && (
          <RailCard
            title={t(lang, "buysTitle")}
            sub={buys.length === 1 ? t(lang, "buysOne") : t(lang, "buysCount", { n: buys.length })}
            href="/buy-sell-signals"
            linkLabel={t(lang, "allBuys")}
          >
            {buyRows.map((s) => (
              <StockRow
                key={s.trading_code}
                size="sm"
                code={s.trading_code}
                name={s.company_name}
                lang={lang}
                mark={mark(s.trading_code)}
                right={<SignalChip signal="buy" strength={s.signal?.strength === "strong" ? "strong" : "normal"} lang={lang} />}
              />
            ))}
          </RailCard>
        )}

        {ranked.length > 0 && (
          <RailCard
            title={t(lang, "rankedTitle")}
            sub={t(lang, "ofN", { n: scored.length })}
            href="/dsestockranking"
            linkLabel={t(lang, "fullRanking")}
          >
            {ranked.map((s) => (
              <StockRow
                key={s.trading_code}
                size="sm"
                code={s.trading_code}
                name={s.company_name}
                lang={lang}
                mark={mark(s.trading_code)}
                right={
                  <span className={`block text-sm font-bold tabular-nums nums ${TIER_TEXT[getTier(s.score)]}`}>
                    {Math.round(s.score ?? 0)}
                    <span className="text-xs font-semibold text-text-muted">{t(lang, "outOf100")}</span>
                  </span>
                }
              />
            ))}
          </RailCard>
        )}

        {trendRows.length > 0 && (
          <RailCard
            title={t(lang, "trendingTitle")}
            sub={t(lang, "trendingSub")}
            href="/dse-trending-stocks"
            linkLabel={t(lang, "allTrending")}
          >
            {trendRows.map((it) => (
              <StockRow
                key={it.trading_code}
                size="sm"
                code={it.trading_code}
                name={it.company_name}
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

        {tipRows.length > 0 && (
          <RailCard title={t(lang, "tipsTitle")} sub={t(lang, "tipsSub")} href="/daily-tips" linkLabel={t(lang, "allTips")}>
            {tipRows.map((tip) => {
              const kind = TIP_KIND[tip.category] ?? "kindTip";
              const tone = KIND_TONE[kind] ?? "primary";
              const metric = tip.facts?.[0]?.value;
              return (
                <StockRow
                  key={`${tip.category}-${tip.trading_code}`}
                  size="sm"
                  code={tip.trading_code}
                  name={tip.company_name}
                  lang={lang}
                  mark={mark(tip.trading_code)}
                  sub={t(lang, kind)}
                  subTone={tone}
                  right={metric ? <span className={`block text-sm font-bold tabular-nums nums ${TONE_TEXT[tone]}`}>{metric}</span> : undefined}
                />
              );
            })}
          </RailCard>
        )}

        {popularRows.length > 0 && (
          <RailCard
            title={t(lang, "popularTitle")}
            sub={t(lang, "popularSub")}
            href="/dse-popular-stocks"
            linkLabel={t(lang, "seeAll")}
          >
            {popularRows.map((it) => (
              <StockRow
                key={it.trading_code}
                size="sm"
                code={it.trading_code}
                name={it.company_name}
                lang={lang}
                mark={mark(it.trading_code)}
                right={
                  <span className="block text-xs font-semibold tabular-nums nums text-text-muted">
                    {t(lang, "views", { n: it.visits_total.toLocaleString("en-US") })}
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
