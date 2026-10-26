"use client";

import { bstHour } from "@/lib/market-hours";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import LangToggle from "@/components/stock/LangToggle";
import { IconChevron } from "@/components/home/personalized/DashIcons";

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/**
 * The top of the money hero: a quiet eyebrow (date) with the language switch
 * and the live market pill on the right, the greeting as the page's headline,
 * then one quiet line — how many things need attention on the reader's
 * stocks (a jump to the "Needs your attention" card), or "All quiet".
 */
export default function HeroGreeting({
  name,
  dateStr,
  isNew = false,
  updates = null,
  lang,
  onLang,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup — greet as new instead of time-of-day. */
  isNew?: boolean;
  /** Rows in "Needs your attention". null → no line (still loading, or no stocks yet). */
  updates?: number | null;
  lang: Lang;
  onLang: (l: Lang) => void;
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
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate pt-1 text-xs font-semibold text-text-muted">
          {dateStr}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <LangToggle value={lang} onChange={onLang} size="sm" />
          <MarketStatusPill compact />
        </div>
      </div>

      <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight text-text-main sm:text-3xl">
        {greeting}
        {who}
      </h1>

      {updates != null &&
        (updates > 0 ? (
          <a
            href="#attention"
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
