"use client";

import Link from "next/link";
import { bstHour } from "@/lib/market-hours";
import type { Lang } from "@/context/LangContext";
import type { BriefSegment } from "@/lib/daily-brief";
import { t } from "@/lib/home-copy";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import StreakBadge from "@/components/home/personalized/StreakBadge";
import LangToggle from "@/components/stock/LangToggle";

const TONE_CLASS: Record<NonNullable<BriefSegment["tone"]>, string> = {
  pos: "text-positive",
  neg: "text-negative",
  accent: "text-primary",
};

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number, lang: Lang): string {
  if (h < 12) return t(lang, "goodMorning");
  if (h < 17) return t(lang, "goodAfternoon");
  return t(lang, "goodEvening");
}

/**
 * The top of the money hero: a quiet eyebrow (date · greeting · name) with the
 * language switch and the live market pill on the right, then the ONE sentence
 * that answers "what should I know today" — the daily brief — as the page's
 * headline. The greeting used to be the headline; a sentence about the
 * reader's own stocks earns that slot better than "Good morning".
 */
export default function HeroGreeting({
  name,
  dateStr,
  isNew = false,
  brief,
  lang,
  onLang,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup — greet as new instead of time-of-day. */
  isNew?: boolean;
  /** The daily brief, as coloured runs. Empty → the greeting is the headline. */
  brief: BriefSegment[];
  lang: Lang;
  onLang: (l: Lang) => void;
}) {
  const bn = lang === "bn";
  const greeting = isNew ? t(lang, "welcome") : greetingForHour(bstHour(), lang);
  const who = name ? (
    <>
      , <span className="normal-case text-primary">{name}</span>
    </>
  ) : null;

  return (
    <div lang={bn ? "bn" : undefined} className={bn ? "font-bn" : undefined}>
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 truncate pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
          {dateStr} · {greeting}
          {who}
        </p>
        <div className="flex shrink-0 items-center gap-1.5">
          <LangToggle value={lang} onChange={onLang} size="sm" />
          <MarketStatusPill compact />
        </div>
      </div>

      {brief.length > 0 ? (
        <h1 className="mt-1.5 text-xl font-bold leading-snug tracking-tight text-text-main sm:text-2xl">
          {brief.map((s, i) =>
            s.href ? (
              <Link
                key={i}
                href={s.href}
                prefetch={false}
                className={`underline decoration-current/30 underline-offset-[3px] hover:decoration-current active:opacity-70 ${
                  s.tone ? TONE_CLASS[s.tone] : ""
                }`}
              >
                {s.text}
              </Link>
            ) : (
              <span key={i} className={s.tone ? TONE_CLASS[s.tone] : undefined}>
                {s.text}
              </span>
            ),
          )}
        </h1>
      ) : (
        <h1 className="mt-1 text-xl font-extrabold leading-tight tracking-tight text-text-main sm:text-2xl">
          {greeting}
          {who}
        </h1>
      )}

      {/* Only the streak, and only when there is one. */}
      <div className="mt-1 flex flex-wrap items-center text-sm text-text-muted empty:hidden">
        <StreakBadge />
      </div>
    </div>
  );
}
