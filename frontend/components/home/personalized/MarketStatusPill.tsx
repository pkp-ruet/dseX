"use client";

import { useEffect, useState } from "react";
import {
  marketSession,
  secondsToClose,
  secondsToOpen,
  formatCountdown,
} from "@/lib/market-hours";

/**
 * Live trading-session indicator for the dashboard header — the single biggest
 * "this is live" trust cue. Reads the BST clock only (no API):
 *   • open  → green pulsing dot, "Live", countdown to the 2:30 PM close
 *   • pre   → amber dot, "Pre-market", countdown to the 10:00 AM open
 *   • closed→ grey dot, "Closed"
 * Ticks every second in its own subtree, so the rest of the header never
 * re-renders on the clock.
 */
export default function MarketStatusPill({
  compact = false,
  className = "",
}: {
  /** Drop the countdown tail — just the dot + state word (tight spaces). */
  compact?: boolean;
  className?: string;
}) {
  const [, setTick] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Reserve space before mount so the header doesn't shift when the pill appears
  // (also avoids a time-dependent hydration mismatch).
  if (!mounted) {
    return <span className={`inline-block h-[24px] w-[92px] align-middle ${className}`} aria-hidden />;
  }

  const session = marketSession();
  const cfg =
    session === "open"
      ? {
          color: "var(--positive)",
          label: "Live",
          tail: `closes in ${formatCountdown(secondsToClose())}`,
          pulse: true,
        }
      : session === "pre"
        ? {
            color: "var(--watch)",
            label: "Pre-market",
            tail: `opens in ${formatCountdown(secondsToOpen())}`,
            pulse: false,
          }
        : {
            color: "var(--text-muted)",
            label: "Closed",
            tail: "",
            pulse: false,
          };

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.68rem] font-bold ${className}`}
      style={{
        color: cfg.color,
        background: `color-mix(in srgb, ${cfg.color} 10%, var(--surface))`,
        borderColor: `color-mix(in srgb, ${cfg.color} 30%, var(--border))`,
      }}
      title={
        session === "open"
          ? "Market is open — prices update through the day"
          : session === "pre"
            ? "Market opens at 10:00 AM"
            : "Market is closed — showing the latest available prices"
      }
    >
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.pulse ? "animate-pulse" : ""}`}
        style={{ background: cfg.color }}
        aria-hidden
      />
      {cfg.label}
      {!compact && cfg.tail && (
        <span className="font-semibold text-[var(--text-muted)]">· {cfg.tail}</span>
      )}
    </span>
  );
}
