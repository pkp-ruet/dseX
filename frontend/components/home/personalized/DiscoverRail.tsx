import type { DailyTip, PopularStockItem, ScoreItem, Top20Item } from "@/lib/api";
import type { Lang } from "@/context/LangContext";
import { changePct, changeTone, companyShort } from "@/lib/formatters";
import { getTier, type TierKey } from "@/lib/constants";
import { KIND_TONE, TIP_KIND } from "@/lib/home-ideas";
import { t } from "@/lib/home-copy";
import OwnerMark from "@/components/home/personalized/OwnerMark";
import RailCard, { Rail, RailHeader } from "@/components/home/personalized/RailCard";
import SignalChip from "@/components/ui/SignalChip";
import StockRow, { TONE_TEXT } from "@/components/ui/StockRow";
import { tt } from "@/components/home/tt";
import { T } from "@/components/i18n/T";

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
 * "More ways to find stocks" — lists that used to be full cards (buy signals,
 * top ranked, trending, popular, tips: ~40 rows down the page) as ONE swipe
 * rail of same-shape cards, three names each with the one number that put
 * them there, and a "See all" into each full page. Used by the dashboard's
 * "Find stocks" chapter (buys · ranked · trending — tips and popular dropped
 * 2026-10-27) and the landing page's "Find stocks" block (WorthALook, + tips).
 */
export default function DiscoverRail({
  buys,
  stocks,
  trending,
  popular = [],
  tips = [],
  held,
  watched,
  lang = "en",
}: {
  /** Today's whole-market Buy signals. */
  buys: ScoreItem[];
  /** Every scored company (for the top of the ranking). */
  stocks: ScoreItem[];
  trending: Top20Item[];
  /** Omitted on the dashboard since 2026-10-27 (user decision); no card when empty. */
  popular?: PopularStockItem[];
  /** Landing only — the dashboard dropped "Today's tips" 2026-10-27 (user decision). */
  tips?: DailyTip[];
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
    <div>
      <RailHeader title={tt("discoverTitle")} sub={tt("discoverSub")} />
      <Rail>
        {buyRows.length > 0 && (
          <RailCard
            title={tt("buysTitle")}
            sub={buys.length === 1 ? tt("buysOne") : tt("buysCount", { n: buys.length })}
            href="/buy-sell-signals"
            linkLabel={tt("allBuys")}
          >
            {buyRows.map((s) => (
              <StockRow
                key={s.trading_code}
                size="sm"
                stack
                code={s.trading_code}
                name={companyShort(s.company_name) || s.company_name}
                lang={lang}
                mark={mark(s.trading_code)}
                right={<SignalChip signal="buy" strength={s.signal?.strength === "strong" ? "strong" : "normal"} lang={lang} />}
              />
            ))}
          </RailCard>
        )}

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

        {tipRows.length > 0 && (
          <RailCard title={tt("tipsTitle")} sub={tt("tipsSub")} href="/buy-sell-signals#tips" linkLabel={tt("allTips")}>
            {tipRows.map((tip) => {
              const kind = TIP_KIND[tip.category] ?? "kindTip";
              const tone = KIND_TONE[kind] ?? "primary";
              const metric = tip.facts?.[0]?.value;
              return (
                <StockRow
                  key={`${tip.category}-${tip.trading_code}`}
                  size="sm"
                  stack
                  code={tip.trading_code}
                  name={companyShort(tip.company_name) || tip.company_name}
                  lang={lang}
                  mark={mark(tip.trading_code)}
                  sub={tt(kind)}
                  subTone={tone}
                  right={metric ? <span className={`block text-sm font-bold tabular-nums nums ${TONE_TEXT[tone]}`}>{metric}</span> : undefined}
                />
              );
            })}
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
