import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import MoversCard from "@/components/home/personalized/MoversCard";
import SectorsWeekCard from "@/components/home/personalized/SectorsWeekCard";
import MarketNewsCard from "@/components/home/personalized/MarketNewsCard";
import BanglaSnapshotCard from "@/components/home/personalized/BanglaSnapshotCard";
import TurningPointsCard from "@/components/home/personalized/TurningPointsCard";
import type { MarketMoversData, DseTodayNewsItem, MarketStateData } from "@/lib/api";

/** Nobody is signed in here, so no row can be marked as owned. */
const NONE: Set<string> = new Set();

/** Same two-up grid the dashboard uses. `grid-cols-1` is load-bearing on a
 *  phone — without it the implicit `auto` column cannot shrink below a card's
 *  min-content and one wide row widens the whole page. */
const PAIR = "grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start [&>*:only-child]:md:col-span-2";

/**
 * The market as it stands right now — the same cards the signed-in dashboard
 * shows, rendered from public endpoints so a first-time visitor sees the real
 * thing instead of a description of it.
 *
 * Why the dashboard's own components and not landing-specific ones: what a
 * visitor sees here has to *be* the product, not an artist's impression of it.
 * They are client components, but Next server-renders them, so every row is in
 * the HTML Google receives. `held` / `watched` are empty sets (no account), and
 * `lang` stays "en" — this page has no toggle. The Bengali snapshot paragraph
 * is the exception and is meant to be: it is the one place on the landing that
 * shows, rather than claims, that the whole product speaks Bangla.
 */
export default function MarketToday({
  movers,
  sectors,
  news,
  summaryBn,
  next,
}: {
  movers: MarketMoversData | null;
  sectors: MarketStateData["now"]["sectors"];
  news: DseTodayNewsItem[];
  summaryBn: string | null | undefined;
  next: MarketStateData["next"] | null;
}) {
  const hasMovers =
    !!movers &&
    (movers.gainers?.length ?? 0) + (movers.losers?.length ?? 0) + (movers.most_traded?.length ?? 0) > 0;
  const hasTurning =
    (next?.near_high?.length ?? 0) + (next?.near_low?.length ?? 0) + (next?.unusual?.length ?? 0) > 0;

  // Nothing to show → render nothing, so a dead backend shortens the page
  // instead of leaving a headline over a hole.
  if (!hasMovers && sectors.length === 0 && news.length === 0 && !summaryBn && !hasTurning) return null;

  return (
    <section aria-labelledby="market-today-title">
      <SectionHead
        eyebrow="Today's market"
        id="market-today-title"
        title="Who went up, who went down,"
        highlight="and why."
        accent="var(--info)"
        icon={<><path d="M3 17l6-6 4 3 8-8" /><path d="M15 6h6v6" /></>}
        bn="আজ কোন শেয়ারের দাম বাড়ল, কোনটা কমল, কোন খাত এগিয়ে — সব এক জায়গায়।"
      />

      <div className="mt-6 space-y-3">
        {(hasMovers || sectors.length > 0) && (
          <div className={PAIR}>
            {hasMovers && <MoversCard movers={movers} held={NONE} watched={NONE} />}
            {sectors.length > 0 && <SectorsWeekCard sectors={sectors} />}
          </div>
        )}

        {(news.length > 0 || summaryBn) && (
          <div className={PAIR}>
            {news.length > 0 && <MarketNewsCard news={news} held={NONE} watched={NONE} />}
            {summaryBn && <BanglaSnapshotCard summary={summaryBn} />}
          </div>
        )}

        {hasTurning && (
          <TurningPointsCard
            nearHigh={next?.near_high ?? []}
            nearLow={next?.near_low ?? []}
            unusual={next?.unusual ?? []}
            held={NONE}
            watched={NONE}
          />
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/dse-today"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          See every price today &rarr;
        </Link>
        <Link
          href="/market-analysis"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          Is the market up or down today? &rarr;
        </Link>
      </div>
    </section>
  );
}
