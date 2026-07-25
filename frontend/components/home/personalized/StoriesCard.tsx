"use client";

import Link from "next/link";
import { getTier, TIER_VAR } from "@/lib/constants";
import { STORY_META, type StoryStock } from "@/lib/home-stories";
import SignalChip from "@/components/ui/SignalChip";
import TierPill from "@/components/ui/TierPill";

/**
 * The one number this story is about, and its unit. Each story shows a
 * different figure, which is what keeps the three rows from reading as clones.
 */
function storyFigure(card: StoryStock): { value: string; unit: string } {
  const { item, highlight } = card;
  if (highlight === "yield") {
    const y = item.div_yield_pct;
    return { value: y == null ? "--" : `${Number.isInteger(y) ? y : y.toFixed(1)}%`, unit: "a year" };
  }
  if (highlight === "growth") {
    const g = item.eps_yoy_pct;
    return { value: g == null ? "--" : `${g > 0 ? "+" : ""}${Math.round(g)}%`, unit: "earnings" };
  }
  return { value: item.score == null ? "--" : String(Math.round(item.score)), unit: "/ 100" };
}

/**
 * One story = one self-contained mini card. Three lines, no more: what the
 * story is + its number, who the company is + its grade, and the claim in a
 * single sentence.
 */
function StoryRow({ card }: { card: StoryStock }) {
  const { item, shortLine } = card;
  const story = STORY_META[card.key];
  const tier = getTier(item.score);
  const tierColor = TIER_VAR[tier];
  const isBuy = item.signal?.signal === "buy";
  const figure = storyFigure(card);

  return (
    <Link
      href={`/stock/${item.trading_code}`}
      prefetch={false}
      className="group block rounded-xl border border-[color-mix(in_srgb,var(--story)_24%,var(--border))] bg-[color-mix(in_srgb,var(--story)_4%,var(--surface))] p-3 no-underline transition-colors"
      // Exposed as a variable so the hover states below can tint themselves
      // without a second inline style per element.
      style={{ "--story": story.color, "--story-ink": story.ink } as React.CSSProperties}
    >
      {/* Line 1 — why this row exists, and the number that earned it the slot */}
      <span className="flex items-baseline gap-1.5">
        <span aria-hidden className="text-[0.7rem] leading-none" style={{ color: story.ink }}>
          {story.glyph}
        </span>
        <span
          className="text-[0.6rem] font-extrabold uppercase tracking-[0.12em]"
          style={{ color: story.ink }}
        >
          {story.label}
        </span>
        <span className="ml-auto flex items-baseline gap-1">
          <span
            className="font-display text-[1.15rem] font-extrabold leading-none tabular-nums nums"
            style={{ color: story.ink }}
          >
            {figure.value}
          </span>
          <span className="text-[0.55rem] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {figure.unit}
          </span>
        </span>
      </span>

      {/* Line 2 — the company, and what we grade it */}
      <span className="mt-2 flex items-center gap-2">
        <span
          className="inline-flex shrink-0 items-center rounded-md border px-1.5 py-0.5 font-mono text-[0.74rem] font-extrabold tracking-[0.03em]"
          style={{
            color: tierColor,
            background: `color-mix(in srgb, ${tierColor} 11%, transparent)`,
            borderColor: `color-mix(in srgb, ${tierColor} 30%, transparent)`,
          }}
        >
          {item.trading_code}
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.72rem] font-semibold text-[var(--text-muted)] decoration-dotted underline-offset-2 group-hover:underline">
          {item.company_name ?? ""}
        </span>
        <span className="shrink-0">
          {isBuy ? (
            <SignalChip signal="buy" strength={item.signal?.strength ?? "normal"} />
          ) : (
            <TierPill tier={tier} />
          )}
        </span>
      </span>

      {/* Line 3 — the claim, in one sentence */}
      <span className="mt-1.5 block text-[0.73rem] font-semibold leading-snug text-[var(--text)]">
        {shortLine}
      </span>

      {/* The card is one big link, so this is a styled affordance rather than a
          nested control — hidden from screen readers to avoid a double read. */}
      <span
        aria-hidden
        className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-[color-mix(in_srgb,var(--story)_11%,transparent)] py-1.5 text-[0.7rem] font-extrabold text-[var(--story-ink)] transition-colors group-hover:bg-[color-mix(in_srgb,var(--story)_20%,transparent)]"
      >
        See full breakdown <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

/**
 * "Three worth knowing today" for the logged-in dashboard — the same three
 * stories as the marketing homepage (strongest / biggest dividend / fastest
 * growing), rebuilt as three separated mini cards so it reads at a glance in
 * the narrow sidebar column instead of as one block of text.
 *
 * The picks rotate every trading day (`pickStoryStocks`), which is what makes
 * this worth a daily look.
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
    <section className="soft-card overflow-hidden" aria-labelledby="stories-card-title">
      <div className="flex items-center gap-2.5 px-3 pt-4 sm:px-4">
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

      <div className="space-y-2.5 px-3 pb-3 pt-3 sm:px-4">
        {cards.map((card) => (
          <StoryRow key={card.item.trading_code} card={card} />
        ))}
      </div>

      <div className="border-t border-[var(--border)] px-3 py-2.5 sm:px-4">
        <Link
          href="/dsestockranking"
          prefetch={false}
          className="text-[0.72rem] font-bold text-[var(--primary)] transition hover:underline"
        >
          See the full ranking →
        </Link>
      </div>
    </section>
  );
}
