"use client";

import { getStoredUser } from "@/lib/auth";
import { FREE_LIMITS, PREMIUM_PATH, startFreeMonth, storedLimit, type LimitKind } from "@/lib/premium";
import { toast } from "@/lib/toast";

const MESSAGES: Record<LimitKind, (n: number) => string> = {
  watchlist: (n) => `A free account can follow ${n} stocks`,
  alerts: (n) => `A free account can keep ${n} price alerts on`,
  ai_daily: (n) => `A free account can ask ${n} questions a day`,
};

/**
 * "You've hit the free limit" — one toast, with the next step as its action:
 * start the free month if it's still available, else open the Premium page.
 * Callable from anywhere (StarButton, the alert modal, lib code).
 */
export function showLimitNotice(kind: LimitKind): void {
  const n = storedLimit(kind) ?? FREE_LIMITS[kind];
  const user = getStoredUser();
  const canTrial = !!user && user.trial_available !== false;
  toast({
    message: `${MESSAGES[kind](n)}. Premium has no limit.`,
    tone: "neutral",
    duration: 7000,
    action: canTrial
      ? { label: "Try free", onClick: () => void startFreeMonth() }
      : { label: "See Premium", onClick: () => { window.location.href = PREMIUM_PATH; } },
  });
}
