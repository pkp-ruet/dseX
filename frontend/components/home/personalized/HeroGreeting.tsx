"use client";

import { bstHour } from "@/lib/market-hours";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/**
 * The top of the money hero: a quiet eyebrow (date and the live market
 * pill), then the greeting as the page's headline. The story rings sit right
 * under it (2026-10-28); they replaced the "N updates on your stocks" line.
 */
export default function HeroGreeting({
  name,
  dateStr,
  isNew = false,
  lang,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup — greet as new instead of time-of-day. */
  isNew?: boolean;
  lang: Lang;
}) {
  const bn = lang === "bn";
  const greeting = isNew ? t(lang, "welcome") : greetingForHour(bstHour(), lang);
  const who = name ? (
    <>
      , <span className="text-text-main">{name}</span>
    </>
  ) : null;

  return (
    <div lang={bn ? "bn" : undefined} className={bn ? "font-bn" : undefined}>
      {/* One quiet line: the date and the market state. The language switch
          lives in the navbar. */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-text-muted">
          <span className="truncate">{dateStr}</span>
          <span className="h-3 w-px shrink-0 bg-border" aria-hidden />
          <MarketStatusPill compact lang={lang} className="shrink-0" />
        </p>
      </div>

      <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-text-main sm:text-3xl">
        {greeting}
        {who}
      </h1>
    </div>
  );
}
