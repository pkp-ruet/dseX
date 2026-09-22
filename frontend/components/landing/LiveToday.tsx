import type { CSSProperties } from "react";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import SectionHead from "@/components/i18n/SectionHead";
import StandoutCard from "@/components/home/StandoutCard";
import type { StoryStock } from "@/lib/home-stories";
import type { MarketMood } from "@/lib/api";

// Panel accent per mood tone. Market semantics stay locked: green only for
// "going up"; down/weak take the warm amber the market-analysis hero uses.
const MOOD_ACC: Record<MarketMood["tone"], string> = {
  up: "var(--positive)",
  down: "var(--warm)",
  weak: "var(--warm)",
  steady: "var(--info)",
};

// Same Bengali line per tone as the market-analysis hero, so the two agree.
const MOOD_BN: Record<MarketMood["tone"], string> = {
  up: "বাজার আজ চাঙা — বেশিরভাগ শেয়ারের দাম বাড়ছে।",
  down: "বাজার আজ পড়তির দিকে — তাড়াহুড়ো করবেন না।",
  weak: "বাজার কিছুটা দুর্বল — ভালো কোম্পানি বেছে নেওয়ার সময়।",
  steady: "বাজার আজ শান্ত — ধীরে-সুস্থে দেখে নিন।",
};

/**
 * One tappable line: the market's mood in plain words, straight from the
 * `/market-analysis` bundle, phrased as the question that page answers.
 *
 * This is a sentence, not an index level — which is exactly why it is allowed
 * here when the DSEX band was cut (2026-08-30): "5,515" means nothing to a
 * first-time visitor, "more shares fell than rose today" does.
 */
function MarketMoodLine({ mood }: { mood: MarketMood }) {
  const acc = MOOD_ACC[mood.tone] ?? "var(--info)";
  return (
    <Link
      href="/market-analysis"
      className="acc-card group mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5 sm:p-5"
      style={{ "--acc": acc } as CSSProperties}
    >
      <div className="min-w-0 flex-1">
        <span
          className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.14em]"
          style={{ color: acc }}
        >
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: acc }} aria-hidden />
          Right now: {mood.label.toLowerCase()}
        </span>
        <p className="mt-1.5 text-base font-bold leading-snug text-text-main sm:text-lg">
          {mood.sentence}
        </p>
        <Bn className="mt-1 text-sm leading-relaxed text-text-muted">{MOOD_BN[mood.tone]}</Bn>
      </div>
      <span
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-3.5 py-2 text-sm font-extrabold text-white transition-all group-hover:gap-2.5 sm:self-center"
        style={{ background: "var(--primary)" }}
      >
        Is the market up or down?
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}

/**
 * Block 4 — proof that the thing is running right now.
 *
 * Two things, in order: the market's mood in one plain sentence (the door to
 * `/market-analysis`, added 2026-09-12), then the three companies today's
 * numbers single out (`pickStoryStocks` — strongest / biggest dividend /
 * fastest growing), a new three every trading day.
 *
 * The `MarketTodayCard` index band that used to lead this block was cut
 * 2026-08-30 — index levels and breadth bars mean little to a first-time
 * visitor, and today's market lives on /dse-today, linked below. The mood line
 * is not that band coming back: it carries no number at all.
 */
export default function LiveToday({
  standouts,
  totalCount,
  mood,
}: {
  standouts: StoryStock[];
  totalCount: number;
  /** The market-analysis verdict; null hides the mood line and keeps a plain link instead. */
  mood?: MarketMood | null;
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

      {mood && <MarketMoodLine mood={mood} />}

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.08em] text-text-muted">
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
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          See every price today →
        </Link>
        {/* Fallback door when the mood line couldn't render — phrased as the
            question, never as the category label. */}
        {!mood && (
          <Link
            href="/market-analysis"
            className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
          >
            Is the market up or down today? →
          </Link>
        )}
      </div>
    </section>
  );
}
