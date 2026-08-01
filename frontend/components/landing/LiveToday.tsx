import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import StandoutCard from "@/components/home/StandoutCard";
import MarketTodayCard from "@/components/home/personalized/MarketTodayCard";
import type { StoryStock } from "@/lib/home-stories";
import type { MarketIndexData, DividendsUpcoming, MarketStateData } from "@/lib/api";

/**
 * Block 4 — proof that the thing is running right now.
 *
 * The method block is a static claim; this one is today's data. It pairs the live
 * index band with the three companies today's numbers single out, so a visitor
 * can see the machine working rather than take our word for it.
 *
 * The standouts are `components/home/StandoutCard` — the same small report card
 * the logged-in dashboard shows, so the three daily picks look identical either
 * side of a login.
 */
export default function LiveToday({
  index,
  dividends,
  state,
  standouts,
  totalCount,
}: {
  index: MarketIndexData | null;
  dividends: DividendsUpcoming | null;
  state: MarketStateData | null;
  standouts: StoryStock[];
  totalCount: number;
}) {
  const cheap =
    state?.now?.questions?.find((q) => q.q.toLowerCase().startsWith("are shares cheap")) ?? null;

  return (
    <section aria-labelledby="today-title">
      <SectionHead
        eyebrow="Latest from the market"
        id="today-title"
        title="How the market is"
        highlight="doing today."
        accent="var(--info)"
        icon={<><path d="M3 17l6-6 4 3 8-8" /><path d="M15 6h6v6" /></>}
        bn="বাজার এখন কেমন চলছে আর আজ কোন তিনটে কোম্পানি আলাদা করে চোখে পড়ছে।"
      />

      {index && (
        <div className="mt-6">
          <MarketTodayCard
            index={index}
            dividends={dividends}
            quality={state?.now?.quality ?? null}
            cheap={cheap}
          />
        </div>
      )}

      {standouts.length > 0 && (
        <div className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[0.88rem] font-semibold text-[var(--text)]">
              Out of {totalCount} companies, today&apos;s numbers single out three —
            </p>
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              New three every day
            </span>
          </div>
          {/* Dense cards, so they hold one column until the row is wide enough
              for the four-number strip not to truncate. */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {standouts.map((c) => (
              <StandoutCard key={c.item.trading_code} card={c} />
            ))}
          </div>
        </div>
      )}

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
