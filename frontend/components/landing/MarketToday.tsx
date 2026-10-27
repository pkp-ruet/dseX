import Link from "next/link";
import type { CSSProperties } from "react";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
import MoversCard from "@/components/home/personalized/MoversCard";
import MarketNewsCard from "@/components/home/personalized/MarketNewsCard";
import BanglaSnapshotCard from "@/components/home/personalized/BanglaSnapshotCard";
import TurningPointsCard from "@/components/home/personalized/TurningPointsCard";
import SectorMosaic from "@/components/landing/SectorMosaic";
import type { MarketMoversData, DseTodayNewsItem, MarketStateData } from "@/lib/api";

/** Nobody is signed in here, so no row can be marked as owned. */
const NONE: Set<string> = new Set();

/** Same two-up grid the dashboard uses. `grid-cols-1` is load-bearing on a
 *  phone — without it the implicit `auto` column cannot shrink below a card's
 *  min-content and one wide row widens the whole page. */
const PAIR = "grid grid-cols-1 gap-3 md:grid-cols-2 [&>*:only-child]:md:col-span-2";

/**
 * Opens on `SectorMosaic` (the whole market as one coloured map), then three
 * rows per card — the "See all" link on each carries the rest. The block sits
 * on its own tinted band so the page reads as chapters, not one long list.
 *
 * The market as it stands right now — the same cards the signed-in dashboard
 * shows, rendered from public endpoints so a first-time visitor sees the real
 * thing instead of a description of it.
 *
 * Why the dashboard's own components and not landing-specific ones: what a
 * visitor sees here has to *be* the product, not an artist's impression of it.
 * They are client components, but Next server-renders them, so every row is in
 * the HTML Google receives. `held` / `watched` are empty sets (no account).
 * Every card carries both languages (`<T>`); the navbar switch picks one.
 */
export default function MarketToday({
  movers,
  sectors,
  news,
  summaryBn,
  summaryEn,
  next,
}: {
  movers: MarketMoversData | null;
  sectors: MarketStateData["now"]["sectors"];
  news: DseTodayNewsItem[];
  summaryBn: string | null | undefined;
  summaryEn?: string | null;
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
    <section
      aria-labelledby="market-today-title"
      className="acc-panel px-2.5 py-6 sm:px-6 sm:py-8"
      style={{ "--acc": "var(--info)" } as CSSProperties}
    >
      <SectionHead
        className="px-1.5 sm:px-0"
        eyebrow={<T en="Today's market" bn="আজকের বাজার" />}
        id="market-today-title"
        title={<T en="What rose, what fell, and why." bn="কোনটির দাম বাড়ল, কোনটির কমল, আর কেন।" />}
        sub={
          <T
            en="Today's biggest moves, the sectors leading the week and the day's news, all in one place."
            bn="আজকের বড় ওঠানামা, এ সপ্তাহে এগিয়ে থাকা সেক্টর আর দিনের খবর, সব এক জায়গায়।"
          />
        }
      />

      <div className="mt-6 space-y-3">
        {/* The map first — the one picture that says how the whole market did */}
        {sectors.length > 0 && <SectorMosaic sectors={sectors} />}

        {(hasMovers || news.length > 0) && (
          <div className={PAIR}>
            {hasMovers && <MoversCard movers={movers} held={NONE} watched={NONE} rows={3} />}
            {news.length > 0 && <MarketNewsCard news={news} held={NONE} watched={NONE} rows={3} />}
          </div>
        )}

        {(summaryBn || hasTurning) && (
          <div className={PAIR}>
            {summaryBn && <BanglaSnapshotCard summary={summaryBn} summaryEn={summaryEn} />}
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
        )}
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 px-1.5 sm:px-0">
        <Link
          href="/dse-today"
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          <T en="See every price today →" bn="আজকের সব দাম দেখুন →" />
        </Link>
        <Link
          href="/market-analysis"
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          <T en="Is the market up or down today? →" bn="আজ বাজার বাড়ছে না কমছে? →" />
        </Link>
      </div>
    </section>
  );
}
