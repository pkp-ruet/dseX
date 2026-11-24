"use client";

import { useMemo } from "react";
import Link from "@/components/ui/Link";
import type { Lang } from "@/context/LangContext";
import type { CorporateActionEvent, HomeFeed, UpcomingResult } from "@/lib/api";
import { kindsPhrase, visibleFeed } from "@/lib/feed";
import { buildDates, daysFrom, whenWord, type Bi } from "@/lib/home-dates";
import FeedRow, { itemRowProps } from "@/components/feed/FeedRow";
import { DateTile } from "@/components/dividend-calendar/DateGroup";
import Skeleton from "@/components/ui/Skeleton";
import { IconChevronRight, IconLock } from "@/components/ui/icons";

/** Rows shown before the link to Updates. */
const ROWS = 3;

/**
 * "New on your shares" (2026-11-25, step 2 of the simplify review: one feed,
 * told once). The newest rows of the Updates feed itself — the same items,
 * the same row (`FeedRow`), the same free / Premium rule (`visibleFeed`) —
 * so the home never says something Updates doesn't. A free reader's hidden
 * watcher rows are one gold line (counted by kind, never which share). Then
 * the next date this week on their shares (results meeting, last day to buy,
 * record date, AGM), and one link to Updates. It replaced the home's own
 * reading of results and DSE notices (2026-11-20) and the story rings.
 * Renders nothing for a reader with no shares and no watchlist.
 */
export default function OnYourShares({
  lang,
  feed,
  loading,
  todayIso,
  resultsSoon,
  ownDividends,
}: {
  lang: Lang;
  feed: HomeFeed | null | undefined;
  loading: boolean;
  todayIso: string;
  resultsSoon: UpcomingResult[];
  ownDividends: CorporateActionEvent[];
}) {
  const bn = lang === "bn";
  const pick = (b: Bi) => (bn ? b.bn : b.en);
  const premium = !!feed?.premium;
  const { shown, hidden } = useMemo(
    () => (feed ? visibleFeed(feed.items, premium) : { shown: [], hidden: [] }),
    [feed, premium],
  );
  const dates = useMemo(() => buildDates(todayIso, resultsSoon, ownDividends), [todayIso, resultsSoon, ownDividends]);
  const rows = shown.slice(0, ROWS);
  const next = dates[0] ?? null;
  const kinds = hidden.length ? kindsPhrase(hidden) : null;
  const unread = feed?.unread ?? 0;

  return (
    <section className={`hm-ours ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined} data-card="on-your-shares">
      <div className="hm-head">
        <h2 className="hm-head-h">{bn ? "আপনার শেয়ারে নতুন" : "New on your shares"}</h2>
      </div>
      <div className="hm-tcard">
        {loading && !feed ? (
          <div className="hm-ours-quiet" aria-busy="true">
            <Skeleton width="70%" height={14} />
            <Skeleton width="45%" height={12} />
          </div>
        ) : rows.length > 0 ? (
          <ul className="nt-list hm-feed">
            {rows.map((i) => (
              <FeedRow key={i.id} href={i.url} {...itemRowProps(i, "day")} />
            ))}
          </ul>
        ) : (
          <p className="hm-ours-quiet">
            {hidden.length
              ? bn
                ? "এ মাসে আপনার শেয়ারে যা চোখে পড়েছে, নিচে গোনা আছে।"
                : "What we noticed on your shares this month is counted below."
              : bn
                ? "সম্প্রতি আপনার শেয়ারে নতুন কিছু নেই। চুপচাপ সময় স্বাভাবিক।"
                : "Nothing new on your shares lately. Quiet weeks are normal."}
          </p>
        )}

        {!premium && kinds && (
          <Link href="/premium?src=home-ours#pay" className="hm-ours-lock" data-card="ours-premium">
            <IconLock size={15} />
            <span>
              {bn
                ? `গত 30 দিনে আপনার শেয়ারে আরও ${hidden.length}টি খবর: ${kinds.bn}। কোন শেয়ারে, প্রিমিয়ামে দেখুন।`
                : `${hidden.length} more on your shares in the last 30 days: ${kinds.en}. See which with Premium.`}
            </span>
          </Link>
        )}

        {next && (
          <Link href="/notifications#coming" className="hm-next" data-card="next-date">
            <DateTile iso={next.iso} small soon={daysFrom(todayIso, next.iso) <= 1} />
            <span className="hm-next-txt">
              <span className="hm-next-k">{bn ? "সামনে" : "Coming up"}</span>
              <span className="hm-next-what">
                <b>{next.code}</b> · {pick(whenWord(todayIso, next.iso))} · {pick(next.what)}
              </span>
              {dates.length > 1 && (
                <span className="hm-next-more">
                  {bn ? `এ সপ্তাহে আরও ${dates.length - 1}টি তারিখ` : `${dates.length - 1} more ${dates.length === 2 ? "date" : "dates"} this week`}
                </span>
              )}
            </span>
            <span className="hm-chev" aria-hidden>
              <IconChevronRight size={16} />
            </span>
          </Link>
        )}

        <Link href="/notifications" className="hm-dmore hm-ours-all">
          {unread > 0
            ? bn
              ? `সব আপডেট · ${unread}টি নতুন`
              : `All updates · ${unread} new`
            : bn
              ? "সব আপডেট"
              : "All updates"}
          <IconChevronRight size={16} />
        </Link>
      </div>
    </section>
  );
}
