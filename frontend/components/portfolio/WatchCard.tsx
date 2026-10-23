"use client";

import Link from "next/link";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import Bn from "@/components/i18n/Bn";
import PremiumGate from "@/components/premium/PremiumGate";
import { formatDate } from "@/lib/formatters";
import { usePremium } from "@/lib/premium";
import type { PortfolioWatchEvent } from "@/lib/api";
import type { AnalysisLang } from "@/lib/portfolio-analysis";

const KIND: Record<PortfolioWatchEvent["kind"], { en: [string, string]; bn: string }> = {
  record: { en: ["record date", "record dates"], bn: "রেকর্ড ডেট" },
  results: { en: ["new result", "new results"], bn: "নতুন ফল" },
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
 * Premium: the full list here plus a phone alert the same day. Free: the
 * count and kinds stay open — the reader sees that something happened on
 * *their* stocks — and the details sit behind the lock (screen-only).
 */
export default function WatchCard({ events, lang }: { events: PortfolioWatchEvent[]; lang: AnalysisLang }) {
  const { isPremium } = usePremium();
  const bn = lang === "bn";
  const L = (en: string, b: string) => (bn ? b : en);
  if (!events.length) {
    if (!isPremium) return null;
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
  const bad = events.filter((e) => e.level === "bad").length;
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

  return (
    <Card padding="none" className="p-5 sm:p-6" data-card="watch">
      <h2 className={`text-lg font-bold text-text-main ${bn ? "font-bn" : ""}`} lang={bn ? "bn" : undefined}>
        {L("What we spotted on your stocks", "আপনার শেয়ারে যা চোখে পড়েছে")}
      </h2>
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
        {isPremium ? (
          <>
            {list}
            <p className={`mt-1 text-xs text-text-muted ${bn ? "font-bn" : ""}`}>
              {L(
                "You get a phone alert the same day when notifications are on.",
                "নোটিফিকেশন চালু থাকলে একই দিনে ফোনে জানানো হয়।",
              )}
            </p>
          </>
        ) : (
          <PremiumGate
            preview="blur"
            peek={140}
            label={L("What we spotted", "যা চোখে পড়েছে")}
            stakes={[
              headline,
              ...(bad > 0 ? [L(`${bad} of them need a look`, `এর ${bad}টি একবার দেখা দরকার`)] : []),
              L("Premium sends each one to your phone the same day", "প্রিমিয়ামে প্রতিটি একই দিনে ফোনে আসে"),
            ]}
          >
            {list}
          </PremiumGate>
        )}
      </div>
    </Card>
  );
}
