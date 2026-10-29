"use client";

import { useState } from "react";
import Link from "next/link";
import Chip from "@/components/ui/Chip";
import Stat from "@/components/ui/Stat";
import AnswerLock from "@/components/premium/AnswerLock";
import PfCard from "./PfCard";
import { taka, formatDate } from "@/lib/formatters";
import type { PortfolioSignalEvent, PortfolioWatchEvent } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

type Level = PortfolioWatchEvent["level"];

const KIND: Record<PortfolioWatchEvent["kind"], { en: [string, string]; bn: string }> = {
  record: { en: ["record date", "record dates"], bn: "রেকর্ড ডেট" },
  results: { en: ["new result", "new results"], bn: "নতুন ফল" },
  grade: { en: ["grade change", "grade changes"], bn: "গ্রেড বদল" },
  category: { en: ["category change", "category changes"], bn: "ক্যাটাগরি বদল" },
  drop: { en: ["big fall", "big falls"], bn: "বড় পতন" },
  low52: { en: ["yearly low", "yearly lows"], bn: "বছরের সর্বনিম্ন" },
};

/** The short word a holding card wears for its own update. */
export const KIND_TAG: Record<PortfolioWatchEvent["kind"], { en: string; bn: string }> = {
  record: { en: "Record date", bn: "রেকর্ড ডেট" },
  results: { en: "New results", bn: "নতুন ফল" },
  grade: { en: "Grade changed", bn: "গ্রেড বদলেছে" },
  category: { en: "Category changed", bn: "ক্যাটাগরি বদলেছে" },
  drop: { en: "Big fall", bn: "বড় পতন" },
  low52: { en: "Yearly low", bn: "বছরের সর্বনিম্ন" },
};

export const LEVEL_TONE: Record<Level, "positive" | "watch" | "negative"> = {
  good: "positive",
  watch: "watch",
  bad: "negative",
};
const LEVEL_RANK: Record<Level, number> = { bad: 0, watch: 1, good: 2 };

/** One row in the list — a watcher event or a Buy more / Sell flip. */
interface Item {
  id: string;
  code: string;
  level: Level;
  title: string;
  body: string;
  day: string | null;
}

/** Worst first, then newest. */
function byUrgency(a: Item, b: Item): number {
  return LEVEL_RANK[a.level] - LEVEL_RANK[b.level] || (b.day ?? "").localeCompare(a.day ?? "");
}

const SHOWN = 3;

/**
 * Chapter 2's opener, "What happened on your stocks" (2026-10-26): the
 * Buy more / Sell flips since the last visit and what the watcher spotted
 * in the last 30 days, in ONE list, worst first. It replaced the health
 * strip's since-visit line and the separate watcher card.
 *
 * Free readers see the flips and the week's free event; the rest of the
 * watcher's list sits blurred in place under it and links to the page's
 * one Premium card (the page's `PageLockScope`). The counts per kind stay
 * open — the reader sees that something happened on their stocks.
 *
 * Look: a `PfCard`; the count and the since-last-visit move as two numbers,
 * neutral kind chips with a meaning dot, then hairline rows with a dot each.
 */
export default function StockUpdates({
  flips,
  watchEvents,
  valueDelta,
  isPremium,
  lang,
}: {
  /** Buy more / Sell flips on the stocks in this portfolio. */
  flips: PortfolioSignalEvent[];
  /** The watcher's events on the stocks in this portfolio. */
  watchEvents: PortfolioWatchEvent[];
  /** Portfolio value change since the previous visit, or null. */
  valueDelta: { delta: number; since: string } | null;
  isPremium: boolean;
  lang: AnalysisLang;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  const [all, setAll] = useState(false);

  const flipItems: Item[] = flips
    .filter((e) => e.signal === "sell" || e.signal === "buy_more")
    .map((e) => {
      const sell = e.signal === "sell";
      return {
        id: `flip-${e.trading_code}-${e.changed_at ?? ""}`,
        code: e.trading_code,
        level: sell ? "bad" : "good",
        title: sell
          ? L(`${e.trading_code} changed to Sell`, `${e.trading_code} এখন বিক্রির সংকেতে`)
          : L(`${e.trading_code} changed to Buy more`, `${e.trading_code} এখন আরও কেনার সংকেতে`),
        body: sell
          ? L("Its numbers or its price no longer support holding it. Open the stock to see why.",
              "এর হিসাব বা দাম আর ধরে রাখার পক্ষে নেই। কেন, তা শেয়ারের পেজে দেখুন।")
          : L("The company is strong and the price looks good to add more.",
              "কোম্পানিটি শক্তিশালী, আর দাম আরও কেনার মতো।"),
        day: e.changed_at,
      };
    });
  const toItem = (e: PortfolioWatchEvent): Item => ({
    id: e.id,
    code: e.code,
    level: e.level,
    title: bn ? e.title_bn : e.title_en,
    body: bn ? e.body_bn : e.body_en,
    day: e.day,
  });
  const openWatch = isPremium ? watchEvents : watchEvents.filter((e) => e.free);
  const lockedWatch = isPremium ? [] : watchEvents.filter((e) => !e.free);
  const open = [...flipItems, ...openWatch.map(toItem)].sort(byUrgency);
  const locked = lockedWatch.map(toItem).sort(byUrgency);
  const shown = all ? open : open.slice(0, SHOWN);

  const counts = new Map<PortfolioWatchEvent["kind"], number>();
  for (const e of watchEvents) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const total = flipItems.length + watchEvents.length;
  // What the locked updates are, by kind (the kind counts are free above).
  const lockedCounts = new Map<PortfolioWatchEvent["kind"], number>();
  for (const e of lockedWatch) lockedCounts.set(e.kind, (lockedCounts.get(e.kind) ?? 0) + 1);
  const lockedKinds = [...lockedCounts.entries()];
  const lockedLine = {
    en: `${locked.length} more update${locked.length === 1 ? "" : "s"} on your shares: ${lockedKinds
      .map(([k, n]) => `${n} ${KIND[k].en[n === 1 ? 0 : 1]}`)
      .join(", ")}. What happened, and what each one means`,
    bn: `আপনার শেয়ারে আরও ${locked.length}টি খবর: ${lockedKinds
      .map(([k, n]) => `${n}টি ${KIND[k].bn}`)
      .join(", ")}। কী ঘটেছে, আর প্রতিটির মানে কী`,
  };
  const hasDelta = valueDelta != null && Math.abs(valueDelta.delta) >= 1;

  const list = (items: Item[]) => (
    <ul className="pf-rows">
      {items.map((it) => (
        <li key={it.id} className="flex items-start gap-3 py-3">
          <span className={`pf-dot pf-dot--${it.level} mt-2`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <Link
                prefetch={false}
                href={`/stock/${it.code}`}
                className="min-w-0 text-sm font-semibold text-text-main hover:text-primary-ink hover:underline active:opacity-70 sm:text-base"
              >
                {it.title}
              </Link>
              {it.day && <span className="nums shrink-0 text-xs text-text-muted">{formatDate(it.day)}</span>}
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-text-muted">{it.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <PfCard
      title={L("What happened on your stocks", "আপনার শেয়ারে যা ঘটেছে")}

      note={L(
        "The last 30 days, most urgent first. We check every trading day after the close.",
        "গত 30 দিন, সবচেয়ে জরুরিটা আগে। প্রতিদিন বাজার বন্ধের পর আমরা দেখি।",
      )}
      lang={lang}
      dataCard="stock-updates"
    >
      <div className={bn ? "font-bn" : ""} lang={bn ? "bn" : undefined}>
        {(total > 0 || hasDelta) && (
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            {total > 0 && (
              <Stat
                size="lg"
                value={total}
                label={L(`thing${total === 1 ? "" : "s"} in the last 30 days`, "খবর, গত 30 দিনে")}
              />
            )}
            {hasDelta && (
              <Stat
                size="lg"
                tone={valueDelta!.delta > 0 ? "positive" : "negative"}
                value={
                  <span className="pv">
                    {valueDelta!.delta > 0 ? "+" : ""}
                    {taka(valueDelta!.delta, 0)}
                  </span>
                }
                label={L(
                  `since your last visit, ${formatDate(valueDelta!.since)}`,
                  `শেষ দেখার পর থেকে, ${formatDate(valueDelta!.since)}`,
                )}
              />
            )}
          </div>
        )}

        {counts.size > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {[...counts.entries()].map(([k, n]) => {
              const level = watchEvents.find((e) => e.kind === k)?.level ?? "watch";
              return (
                <Chip key={k} icon={<span className={`pf-dot pf-dot--${level}`} />}>
                  <span className="nums">{bn ? `${n}টি ${KIND[k].bn}` : `${n} ${KIND[k].en[n === 1 ? 0 : 1]}`}</span>
                </Chip>
              );
            })}
          </div>
        )}

        {total === 0 ? (
          <p className={`text-sm leading-relaxed text-text-muted ${hasDelta ? "mt-4" : ""}`}>
            {L("Nothing new on your stocks in the last 30 days.", "গত 30 দিনে আপনার শেয়ারে নতুন কিছু নেই।")}
          </p>
        ) : (
          <div className="mt-3 border-t border-border">
            {shown.length > 0 && list(shown)}
            {open.length > SHOWN && (
              <button type="button" onClick={() => setAll((v) => !v)} className="pf-link">
                {all ? L("Show fewer", "কম দেখুন") : L(`See all ${open.length}`, `সব ${open.length}টি দেখুন`)}
              </button>
            )}
            {locked.length > 0 && (
              <AnswerLock
                variant="line"
                job="watch"
                lock="Portfolio: stock updates"
                className={shown.length ? "mt-1" : ""}
                lines={[lockedLine]}
              >
                {list(locked)}
              </AnswerLock>
            )}
            {isPremium && (
              <p className="pf-fine">
                {L(
                  "You get a phone alert the same day when notifications are on.",
                  "নোটিফিকেশন চালু থাকলে একই দিনে ফোনে জানানো হয়।",
                )}
              </p>
            )}
          </div>
        )}
      </div>
    </PfCard>
  );
}
