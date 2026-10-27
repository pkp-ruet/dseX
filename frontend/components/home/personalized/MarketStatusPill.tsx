"use client";

import { useEffect, useState } from "react";
import {
  marketSession,
  secondsToClose,
  secondsToOpen,
  formatCountdown,
} from "@/lib/market-hours";
import type { Lang } from "@/context/LangContext";
import { t } from "@/lib/home-copy";

/**
 * Live trading-session indicator for the dashboard eyebrow — the single biggest
 * "this is live" trust cue. Reads the BST clock only (no API):
 *   • open  → green pulsing dot, "Live", countdown to the 2:30 PM close
 *   • pre   → amber dot, "Pre-market", countdown to the 10:00 AM open
 *   • closed→ grey dot, "Closed"
 * Plain text (dot + word), no pill box, so it sits in the date line. Ticks
 * every second in its own subtree, so the rest of the header never re-renders
 * on the clock.
 */
export default function MarketStatusPill({
  compact = false,
  lang = "en",
  className = "",
}: {
  /** Drop the countdown tail — just the dot + state word (tight spaces). */
  compact?: boolean;
  lang?: Lang;
  className?: string;
}) {
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reserve space before mount so the line doesn't shift when the word appears
  // (also avoids a time-dependent hydration mismatch).
  if (!mounted) {
    return <span className={`inline-block h-4 w-14 align-middle ${className}`} aria-hidden />;
  }

  const session = marketSession();
  const cfg =
    session === "open"
      ? {
          text: "text-positive",
          dot: "bg-positive",
          label: t(lang, "marketLive"),
          tail: t(lang, "marketClosesIn", { t: formatCountdown(secondsToClose()) }),
          pulse: true,
        }
      : session === "pre"
        ? {
            text: "text-watch",
            dot: "bg-watch",
            label: t(lang, "marketPre"),
            tail: t(lang, "marketOpensIn", { t: formatCountdown(secondsToOpen()) }),
            pulse: false,
          }
        : {
            text: "text-text-muted",
            dot: "bg-text-muted",
            label: t(lang, "marketClosed"),
            tail: "",
            pulse: false,
          };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold ${cfg.text} ${className}`}
      title={
        session === "open"
          ? "Market is open — prices update through the day"
          : session === "pre"
            ? "Market opens at 10:00 AM"
            : "Market is closed — showing the latest available prices"
      }
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        {cfg.pulse && <span className={`absolute inset-0 animate-ping rounded-full opacity-60 ${cfg.dot}`} />}
        <span className={`relative h-2 w-2 rounded-full ${cfg.dot}`} />
      </span>
      {cfg.label}
      {!compact && cfg.tail && <span className="font-normal text-text-muted">· {cfg.tail}</span>}
    </span>
  );
}
