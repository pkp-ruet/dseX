"use client";

import { FREE_LIMITS, PREMIUM_PATH, storedLimit, type LimitKind } from "@/lib/premium";
import { toast } from "@/lib/toast";

const MESSAGES: Record<LimitKind, (n: number) => string> = {
  watchlist: (n) => `A free account can follow ${n} stocks`,
  alerts: (n) => `A free account can keep ${n} price alerts on`,
  ai_daily: (n) => `A free account can ask ${n} questions a day`,
  portfolios: () => "A free account has one portfolio",
};

/**
 * "You've hit the free limit" — one toast whose action opens the Premium page
 * (what's included + the planned price). It never starts the free month itself.
 * Callable from anywhere (StarButton, the alert modal, lib code).
 */
export function showLimitNotice(kind: LimitKind): void {
  const n = storedLimit(kind) ?? FREE_LIMITS[kind];
  toast({
    message: `${MESSAGES[kind](n)}. Premium has no limit.`,
    tone: "neutral",
    duration: 7000,
    action: { label: "See Premium", onClick: () => { window.location.href = PREMIUM_PATH; } },
  });
}
