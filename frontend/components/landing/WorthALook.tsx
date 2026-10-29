import Link from "next/link";
import SectionHead from "@/components/i18n/SectionHead";
import { T } from "@/components/i18n/T";
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
 * `ResearchRail`: each list's free top three (2026-10-29). It
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
        eyebrow={<T en="Find stocks" bn="শেয়ার খুঁজুন" />}
        id="worth-title"
        title={
          <T
            en="Where to start when you have no company in mind."
            bn="কোনো কোম্পানি মাথায় না থাকলে কোথা থেকে শুরু করবেন।"
          />
        }
        sub={
          <T
            en="Not sure which share to look at? Start with today's signals, the ranking and the ready-made lists."
            bn="কোন শেয়ার দেখবেন বুঝতে পারছেন না? আজকের সংকেত, র‍্যাঙ্কিং আর তৈরি করা তালিকা দিয়ে শুরু করুন।"
          />
        }
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
          <T en="See the full ranking →" bn="পুরো র‍্যাঙ্কিং দেখুন →" />
        </Link>
        <Link
          href="/stocks"
          className="text-sm font-bold text-primary-ink underline-offset-4 hover:underline"
        >
          <T en="Browse every company A–Z →" bn="A থেকে Z সব কোম্পানি দেখুন →" />
        </Link>
      </div>
    </section>
  );
}
