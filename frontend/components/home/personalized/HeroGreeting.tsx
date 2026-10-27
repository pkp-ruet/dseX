"use client";

import { bstHour } from "@/lib/market-hours";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import { IconChevron } from "@/components/home/personalized/DashIcons";

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/**
 * The top of the money hero: a quiet eyebrow (date and the live market
 * pill), the greeting as the page's headline,
 * then one quiet line — how many key points "Your stocks today" lists on the
 * reader's stocks (a jump to that card), or "All quiet".
 */
export default function HeroGreeting({
  name,
  dateStr,
  isNew = false,
  updates = null,
  lang,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup — greet as new instead of time-of-day. */
  isNew?: boolean;
  /** Key points in "Your stocks today". null → no line (still loading, or no stocks yet). */
  updates?: number | null;
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

      {updates != null &&
        (updates > 0 ? (
          <a
            href="#your-stocks"
            className="mt-1 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-text-main hover:text-primary active:opacity-70"
          >
            <span className="h-2 w-2 rounded-full bg-watch" aria-hidden />
            {updates === 1 ? t(lang, "updatesOne") : t(lang, "updatesMany", { n: updates })}
            <span className="text-text-muted" aria-hidden>
              <IconChevron size={16} />
            </span>
          </a>
        ) : (
          <p className="mt-1 flex min-h-10 items-center gap-2 text-sm text-text-muted">
            <span className="h-2 w-2 rounded-full bg-positive" aria-hidden />
            {t(lang, "allQuiet")}
          </p>
        ))}
    </div>
  );
}
