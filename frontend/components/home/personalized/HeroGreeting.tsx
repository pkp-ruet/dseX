"use client";

import { bstHour } from "@/lib/market-hours";
import MarketStatusPill from "@/components/home/personalized/MarketStatusPill";
import StreakBadge from "@/components/home/personalized/StreakBadge";

/** Time-of-day greeting on the BST wall clock (client-rendered subtree). */
function greetingForHour(h: number): string {
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Slim greeting line folded into the top of the money hero (replaces the old
 * standalone WelcomeHeader card): date + greeting + live market status, with a
 * quiet follow-count / streak meta line. Kept intentionally short so the
 * portfolio value stays the visual headline of the card.
 */
export default function HeroGreeting({
  name,
  dateStr,
  isNew = false,
}: {
  name?: string | null;
  dateStr: string;
  /** First render right after signup — greet as new instead of time-of-day. */
  isNew?: boolean;
}) {
  const greeting = isNew ? "Welcome to TopStockBD" : greetingForHour(bstHour());

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
            {dateStr}
          </p>
          <h1 className="mt-0.5 text-[clamp(1.15rem,4.6vw,1.5rem)] font-extrabold tracking-tight leading-tight text-[var(--text)]">
            {greeting}
            {name ? <>, <span className="text-[var(--primary)]">{name}</span></> : ""}
            {isNew ? " 👋" : ""}
          </h1>
        </div>
        <MarketStatusPill compact className="mt-0.5 shrink-0" />
      </div>

      {/* Follow-count was dropped — "Your stocks today" already shows it as
          "View all N". Only the streak stays, and only when there is one. */}
      <div className="mt-1 flex flex-wrap items-center text-[0.8rem] text-[var(--text-muted)] empty:hidden">
        <StreakBadge />
      </div>
    </div>
  );
}
