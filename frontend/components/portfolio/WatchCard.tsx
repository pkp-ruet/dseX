"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Bn from "@/components/i18n/Bn";
import { formatDate } from "@/lib/formatters";
import type { PortfolioWatchEvent } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

const KIND: Record<PortfolioWatchEvent["kind"], { en: [string, string]; bn: string }> = {
  record: { en: ["record date", "record dates"], bn: "রেকর্ড ডেট" },
  results: { en: ["new result", "new results"], bn: "নতুন ফল" },
  grade: { en: ["grade change", "grade changes"], bn: "গ্রেড বদল" },
  category: { en: ["category change", "category changes"], bn: "ক্যাটাগরি বদল" },
  drop: { en: ["big fall", "big falls"], bn: "বড় পতন" },
  low52: { en: ["yearly low", "yearly lows"], bn: "বছরের সর্বনিম্ন" },
};

const DOT: Record<PortfolioWatchEvent["level"], string> = {
  good: "bg-positive",
  watch: "bg-watch",
  bad: "bg-negative",
};

const TONE: Record<PortfolioWatchEvent["level"], "positive" | "watch" | "negative"> = {
  good: "positive",
  watch: "watch",
  bad: "negative",
};

/**
 * "What we spotted on your stocks" — the watcher's last 30 days (record dates
 * coming, new quarterly results, category changes, big one-day falls, yearly
 * lows), built every trading day by the backend job.
 *
 * Premium (`mode="full"`): the count, the kinds and the full list, plus a
 * phone alert the same day. Free (`mode="summary"`): the count and kinds stay
 * open — the reader sees that something happened on *their* stocks — with a
 * link down to `detailsHref`, the page's one Premium lock, which renders the
 * list as `mode="details"` (screen-only).
 */
export default function WatchCard({
  events,
  lang,
  mode,
  detailsHref,
}: {
  events: PortfolioWatchEvent[];
  lang: AnalysisLang;
  mode: "full" | "summary" | "details";
  detailsHref?: string;
}) {
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  if (!events.length) {
    if (mode !== "full") return null;
    return (
      <Card padding="none" className="p-5 sm:p-6" data-card="watch">
        <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
          {L("What we spotted on your stocks", "আপনার শেয়ারে যা চোখে পড়েছে")}
        </h2>
        <p className={`mt-2 text-sm text-text-muted ${bn ? "font-bn" : ""}`}>
          {L(
            "Nothing unusual in the last 30 days. We check every trading day after the close and send you an alert when something comes up.",
            "গত 30 দিনে অস্বাভাবিক কিছু নেই। প্রতিদিন বাজার বন্ধের পর আমরা দেখি, কিছু হলে আপনাকে জানাব।",
          )}
        </p>
      </Card>
    );
  }

  const counts = new Map<PortfolioWatchEvent["kind"], number>();
  for (const e of events) counts.set(e.kind, (counts.get(e.kind) ?? 0) + 1);
  const headline = L(
    `${events.length} thing${events.length === 1 ? "" : "s"} on your stocks in the last 30 days`,
    `গত 30 দিনে আপনার শেয়ারে ${events.length}টি খবর`,
  );

  const list = (
    <ul className="flex flex-col divide-y divide-border">
      {events.map((e) => (
        <li key={e.id} className="flex items-start gap-3 py-3">
          <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${DOT[e.level]}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold text-text-main ${bn ? "font-bn" : ""}`}>
              <Link prefetch={false} href={`/stock/${e.code}`} className="hover:underline">
                {bn ? e.title_bn : e.title_en}
              </Link>
            </p>
            <p className={`text-sm text-text-muted ${bn ? "font-bn" : ""}`}>{bn ? e.body_bn : e.body_en}</p>
            <p className="text-xs text-text-muted">{formatDate(e.day)}</p>
          </div>
        </li>
      ))}
    </ul>
  );

  const title = (
    <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
      {L("What we spotted on your stocks", "আপনার শেয়ারে যা চোখে পড়েছে")}
    </h2>
  );

  if (mode === "details") {
    return (
      <Card padding="none" className="p-5 sm:p-6" data-card="watch-details">
        {title}
        <div className="mt-2">{list}</div>
      </Card>
    );
  }

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="watch">
      {title}
      {!bn && <Bn className="text-sm text-text-muted">প্রতিদিন বাজার বন্ধের পর আপনার শেয়ারগুলো আমরা দেখি।</Bn>}
      <p className={`mt-3 text-base font-semibold text-text-main ${bn ? "font-bn" : ""}`}>{headline}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[...counts.entries()].map(([k, n]) => {
          const level = events.find((e) => e.kind === k)?.level ?? "watch";
          return (
            <Chip key={k} tone={TONE[level]}>
              {bn ? `${n}টি ${KIND[k].bn}` : `${n} ${KIND[k].en[n === 1 ? 0 : 1]}`}
            </Chip>
          );
        })}
      </div>

      <div className="mt-3">
        {mode === "full" ? (
          <>
            {list}
            <p className={`mt-1 text-xs text-text-muted ${bn ? "font-bn" : ""}`}>
              {L(
                "You get a phone alert the same day when notifications are on.",
                "নোটিফিকেশন চালু থাকলে একই দিনে ফোনে জানানো হয়।",
              )}
            </p>
          </>
        ) : detailsHref ? (
          <Link
            prefetch={false}
            href={detailsHref}
            className={`inline-flex min-h-10 items-center text-sm font-semibold text-primary hover:underline ${bn ? "font-bn" : ""}`}
          >
            {L("What each one is, in your daily check below", "প্রতিটি কী, নিচের দৈনিক যাচাইয়ে")}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
