import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import ResearchRail from "@/components/home/personalized/ResearchRail";
import DiscoverRail from "@/components/home/personalized/DiscoverRail";
import ScreenerCard from "@/components/home/personalized/ScreenerCard";
import type { CSSProperties } from "react";
import type { ScoreItem, Top20Item, DailyTip, ResearchListSummary, ScreenerGoal } from "@/lib/api";

const NONE: Set<string> = new Set();

/**
 * Every way in that does not need an account: today's buy signals, the top of
 * the ranking, what is moving and the daily tips — then the research lists.
 *
 * The swipe rail of buy signals · top ranked · trending · tips (`DiscoverRail`,
 * the same rail the dashboard uses), then the screener's goal card
 * (`ScreenerCard`, the dashboard's — counts + top three, fully open), then
 * `ResearchRail`: on this page always
 * the promotion card (visitors aren't Premium), counts only, no names. It
 * replaced the four "Ready-made lists" lenses (2026-10-24). Popular was dropped here (2026-09-30) —
 * for a first visit it mostly repeated Trending; it stays on the dashboard.
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
  research,
  goals,
}: {
  /** The flattened /api/scores payload — feeds both the buy list and the ranking. */
  stocks: ScoreItem[];
  trending: Top20Item[];
  tips: DailyTip[];
  research: ResearchListSummary[] | null;
  /** The screener's goal starts (null when the endpoint failed — the card drops out). */
  goals: ScreenerGoal[] | null;
}) {
  const buys = stocks.filter((s) => s.signal?.signal === "buy");

  if (stocks.length === 0 && trending.length === 0 && tips.length === 0 && !research) return null;

  return (
    <section
      aria-labelledby="worth-title"
      className="acc-panel px-2.5 py-6 sm:px-6 sm:py-8"
      style={{ "--acc": "var(--warm)" } as CSSProperties}
    >
      <SectionHead
        className="px-1.5 sm:px-0"
        eyebrow="Worth a look"
        id="worth-title"
        title="Where to start when you have"
        highlight="no company in mind."
        accent="var(--warm)"
        icon={<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>}
        bn="কোন শেয়ার কিনবেন বুঝতে পারছেন না? আজকের সিগন্যাল, র‍্যাঙ্কিং আর তৈরি করা তালিকা দেখে শুরু করুন।"
      />

      <div className="mt-6 space-y-6">
        {/* Buy signals / top ranked / trending / tips (four full cards until
            2026-10-24 — same names, half the scroll), then the research
            lists' promotion card. */}
        <DiscoverRail
          buys={buys}
          stocks={stocks}
          trending={trending}
          popular={[]}
          tips={tips}
          held={NONE}
          watched={NONE}
        />
        <ScreenerCard goals={goals} held={NONE} watched={NONE} />
        <ResearchRail lists={research} held={NONE} watched={NONE} />
      </div>

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 px-1.5 sm:px-0">
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
