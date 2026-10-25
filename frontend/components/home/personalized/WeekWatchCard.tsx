"use client";

import Link from "next/link";
import DashHeader, { HeaderChip } from "@/components/home/personalized/DashHeader";
import PremiumGate from "@/components/premium/PremiumGate";
import type { PortfolioWatchEvent, WeekWatch } from "@/lib/api";
import type { Lang } from "@/context/LangContext";

const KIND: Record<PortfolioWatchEvent["kind"], { en: [string, string]; bn: string }> = {
  results: { en: ["quarterly result", "quarterly results"], bn: "ত্রৈমাসিক ফল" },
  grade: { en: ["grade change", "grade changes"], bn: "গ্রেড বদল" },
  record: { en: ["record date", "record dates"], bn: "রেকর্ড ডেট" },
  category: { en: ["category change", "category changes"], bn: "ক্যাটাগরি বদল" },
  drop: { en: ["big one-day fall", "big one-day falls"], bn: "একদিনের বড় পতন" },
  low52: { en: ["fall to a yearly low", "falls to a yearly low"], bn: "বছরের সর্বনিম্ন দাম" },
};

const DOT: Record<PortfolioWatchEvent["level"], string> = {
  good: "bg-positive",
  watch: "bg-watch",
  bad: "bg-negative",
};

// Where one event opens on the stock page (same as the watcher's push).
const ANCHOR: Partial<Record<PortfolioWatchEvent["kind"], string>> = {
  results: "#results",
  grade: "#score-history",
};

/**
 * "This week on your stocks" (2026-10-25): what the daily watcher spotted on
 * the reader's holdings ∪ watchlist in the last 7 days — quarterly results,
 * grade changes, record dates, category changes, big falls, yearly lows.
 *
 * Every reader sees the count and the kinds (that something happened on THEIR
 * stocks is free); the list itself is Premium — a free reader gets it blurred
 * behind one lock with their own stakes. Renders nothing on a quiet week.
 */
export default function WeekWatchCard({
  week,
  premium,
  lang,
}: {
  week: WeekWatch;
  premium: boolean;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  if (!week.total) return null;

  const kindWord = (k: PortfolioWatchEvent["kind"], n: number) =>
    bn ? `${n}টি ${KIND[k].bn}` : `${n} ${KIND[k].en[n === 1 ? 0 : 1]}`;
  const stocks = week.codes.length;
  const lead = L(
    `We spotted ${week.total} ${week.total === 1 ? "thing" : "things"} on ${stocks} of your stocks in the last 7 days.`,
    `গত 7 দিনে আপনার ${stocks}টি শেয়ারে ${week.total}টি জিনিস ধরা পড়েছে।`,
  );

  const list = (
    <ul className="divide-y divide-border">
      {week.items.map((e) => (
        <li key={e.id}>
          <Link
            href={`/stock/${e.code}${ANCHOR[e.kind] ?? ""}`}
            prefetch={false}
            className="flex min-h-12 items-start gap-3 px-4 py-2.5 hover:bg-surface-2 active:bg-surface-2 sm:px-5"
          >
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[e.level]}`} aria-hidden="true" />
            <span className={`min-w-0 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
              <span className="block text-sm font-semibold text-text-main">{bn ? e.title_bn : e.title_en}</span>
              <span className="block text-sm text-text-muted">{bn ? e.body_bn : e.body_en}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="soft-card overflow-hidden">
      <DashHeader
        title={L("This week on your stocks", "এই সপ্তাহে আপনার শেয়ারে")}
        chips={week.bad > 0 ? <HeaderChip tone="accent">{L(`${week.bad} to check`, `${week.bad}টি দেখুন`)}</HeaderChip> : undefined}
        href={premium ? "/portfolio" : undefined}
        linkLabel={premium ? L("Portfolio", "পোর্টফোলিও") : undefined}
      />
      <div className={`px-4 pt-3 sm:px-5 ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        <p className="text-sm text-text-main">{lead}</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {week.kinds.map((k) => (
            <li key={k.kind} className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text-main">
              {kindWord(k.kind, k.count)}
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-2 pb-2">
        {premium ? (
          list
        ) : (
          <div className="px-4 sm:px-5">
            <PremiumGate
              label={L("What happened, stock by stock", "কোন শেয়ারে কী হয়েছে")}
              preview="blur"
              peek={120}
              stakes={[
                L(`${week.total} things on ${stocks} of your stocks this week`, `এই সপ্তাহে আপনার ${stocks}টি শেয়ারে ${week.total}টি জিনিস`),
                ...(week.bad > 0
                  ? [L(`${week.bad} of them may need you to act`, `এর মধ্যে ${week.bad}টিতে আপনার নজর দরকার`)]
                  : []),
                L("Premium also sends them to your phone the same day", "প্রিমিয়ামে একই দিনে ফোনে নোটিফিকেশন যায়"),
              ]}
            >
              {list}
            </PremiumGate>
          </div>
        )}
      </div>
    </div>
  );
}
