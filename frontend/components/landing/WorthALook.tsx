import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import BuysTodayCard from "@/components/home/personalized/BuysTodayCard";
import TopRankedCard from "@/components/home/personalized/TopRankedCard";
import TrendingCard from "@/components/home/personalized/TrendingCard";
import TipsCard from "@/components/home/personalized/TipsCard";
import ListsRail from "@/components/home/personalized/ListsRail";
import PopularCard from "@/components/home/personalized/PopularCard";
import type { ScoreItem, Top20Item, DailyTip, PopularStockItem, MarketStateData } from "@/lib/api";

const NONE: Set<string> = new Set();

const PAIR = "grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start [&>*:only-child]:md:col-span-2";

/**
 * Every way in that does not need an account: today's buy signals, the top of
 * the ranking, what is moving, the ready-made lists, the daily tips, and what
 * other readers are reading.
 *
 * This block replaced two written ones — `ReportAnatomy` (a list of the eight
 * sections on a stock page) and `WaysToFind` (a picker plus a row of links).
 * Both described what the site can do; these cards do it. Do not put a prose
 * version of either back on this page.
 */
export default function WorthALook({
  stocks,
  trending,
  tips,
  popular,
  chances,
}: {
  /** The flattened /api/scores payload — feeds both the buy list and the ranking. */
  stocks: ScoreItem[];
  trending: Top20Item[];
  tips: DailyTip[];
  popular: PopularStockItem[];
  chances: MarketStateData["chances"] | null;
}) {
  const buys = stocks.filter((s) => s.signal?.signal === "buy");

  if (stocks.length === 0 && trending.length === 0 && tips.length === 0 && !chances) return null;

  return (
    <section aria-labelledby="worth-title">
      <SectionHead
        eyebrow="Worth a look"
        id="worth-title"
        title="Where to start when you have"
        highlight="no company in mind."
        accent="var(--warm)"
        icon={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>}
        bn="কোন শেয়ার কিনবেন বুঝতে পারছেন না? আজকের সিগন্যাল, র‍্যাঙ্কিং আর তৈরি করা তালিকা দেখে শুরু করুন।"
      />

      <div className="mt-6 space-y-3">
        {stocks.length > 0 && (
          <div className={PAIR}>
            <BuysTodayCard buys={buys} held={NONE} watched={NONE} />
            <TopRankedCard stocks={stocks} held={NONE} watched={NONE} />
          </div>
        )}

        {(trending.length > 0 || tips.length > 0) && (
          <div className={PAIR}>
            {trending.length > 0 && <TrendingCard items={trending} held={NONE} watched={NONE} />}
            {tips.length > 0 && <TipsCard tips={tips} held={NONE} watched={NONE} />}
          </div>
        )}

        {chances && <ListsRail chances={chances} held={NONE} watched={NONE} />}

        {popular.length > 0 && <PopularCard items={popular} held={NONE} watched={NONE} />}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/dsestockranking"
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          See the full ranking &rarr;
        </Link>
        <Link
          href="/stocks"
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          Browse every company A&ndash;Z &rarr;
        </Link>
      </div>
    </section>
  );
}
