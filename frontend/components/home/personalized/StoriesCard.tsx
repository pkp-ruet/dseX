"use client";

import Link from "next/link";
import StandoutCard from "@/components/home/StandoutCard";
import type { StoryStock } from "@/lib/home-stories";

/**
 * "Three worth knowing today" for the logged-in dashboard — the same three
 * stories as the marketing homepage (strongest / biggest dividend / fastest
 * growing) rendered with the same `StandoutCard`, so a signed-in reader sees
 * exactly what a visitor sees, stacked for the narrow Explore column.
 *
 * The picks rotate every trading day (`pickStoryStocks`), which is what makes
 * this worth a daily look.
 *
 * No outer card frame: three bordered report cards inside a fourth border read
 * as clutter, so this is a heading, the cards, and one link out.
 */
export default function StoriesCard({
  cards,
  totalCount,
}: {
  cards: StoryStock[];
  totalCount: number;
}) {
  if (cards.length === 0) return null;

  return (
    <section aria-labelledby="stories-card-title">
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--tier-excellent) 18%, transparent), color-mix(in srgb, var(--warm) 22%, transparent))",
          }}
          aria-hidden
        >
          🔎
        </span>
        <div className="min-w-0">
          <h2
            id="stories-card-title"
            className="text-[1.05rem] font-extrabold leading-tight tracking-tight text-[var(--text)]"
          >
            Three worth knowing today
          </h2>
          <p className="text-[0.68rem] font-semibold text-[var(--text-muted)]">
            From all {totalCount} companies · changes every day
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {cards.map((card) => (
          <StandoutCard key={card.item.trading_code} card={card} />
        ))}
      </div>

      <Link
        href="/dsestockranking"
        prefetch={false}
        className="mt-3 inline-block text-[0.72rem] font-bold text-[var(--primary-ink)] transition hover:underline"
      >
        See the full ranking →
      </Link>
    </section>
  );
}
