import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import StandoutCard from "@/components/home/StandoutCard";
import type { StoryStock } from "@/lib/home-stories";

/**
 * Block 4 — proof that the thing is running right now.
 *
 * One job: the three companies today's numbers single out (`pickStoryStocks` —
 * strongest / biggest dividend / fastest growing), a new three every trading
 * day. The `MarketTodayCard` index band that used to lead this block was cut
 * 2026-08-30 — index levels and breadth bars mean little to a first-time
 * visitor, and today's market lives on /dse-today, linked below. Cutting it
 * also dropped the landing page's market-index / dividends / market-state
 * fetches.
 */
export default function LiveToday({
  standouts,
  totalCount,
}: {
  standouts: StoryStock[];
  totalCount: number;
}) {
  if (standouts.length === 0) return null;

  return (
    <section aria-labelledby="today-title">
      <SectionHead
        eyebrow="Latest from the market"
        id="today-title"
        title="Three companies stand out"
        highlight="today."
        accent="var(--info)"
        icon={<><path d="M3 17l6-6 4 3 8-8" /><path d="M15 6h6v6" /></>}
        bn={`${totalCount}টি কোম্পানির আজকের দাম দেখে এই তিনটা আলাদা করে চোখে পড়ছে — প্রতিদিন নতুন তিনটা।`}
      />

      <p className="mt-6 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
        Picked from all {totalCount} companies · new three every day
      </p>
      {/* Dense cards, so they hold one column until the row is wide enough
          for the four-number strip not to truncate. */}
      <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {standouts.map((c) => (
          <StandoutCard key={c.item.trading_code} card={c} />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
        <Link
          href="/dse-today"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          See every price today →
        </Link>
        <Link
          href="/market-analysis"
          className="text-[0.85rem] font-bold text-[var(--primary-ink)] underline-offset-4 hover:underline"
        >
          Market analysis →
        </Link>
      </div>
    </section>
  );
}
