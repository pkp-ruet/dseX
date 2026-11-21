"use client";

/**
 * Premium on the client: who is premium and the free-account limits. There
 * is no free month (removed 2026-10-25) — Premium is bought by bKash / Nagad
 * on /premium. The backend decides (`backend/services/entitlements.py`) and
 * ships the plan on the user from /me; this file only reads it.
 *
 * The stock-page and portfolio locks are screen-only by design (see CLAUDE.md
 * "Premium"): the data ships, `AnswerLock` / `RowLock` hide it.
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type AuthUser, getStoredUser } from "@/lib/auth";
import { freeN } from "@/lib/premium-line";

/** Mirrors backend `FREE_LIMITS`, read from THE Premium line
 *  (`lib/premium-line.ts`) — used only when a cached user predates the plan
 *  fields; the server value always wins once /me has refreshed. Holdings
 *  (shares in one portfolio): no free cap since 2026-11-02, only
 *  `MAX_HOLDINGS` for everyone. Alerts = the line's watch rules. */
export const FREE_LIMITS = {
  watchlist: freeN("watchlist"),
  holdings: null,
  alerts: freeN("watch_rules"),
  ai_daily: freeN("ai"),
  portfolios: freeN("portfolios"),
  custom_lists: freeN("saved_screens"),
  compare: freeN("compare"),
} satisfies Record<string, number | null>;

export type LimitKind = keyof typeof FREE_LIMITS;

/** Shares in one portfolio, for every account (mirrors backend
 *  `HARD_LIMITS["holdings"]`, 2026-11-02). Not a Premium limit. */
export const MAX_HOLDINGS = 100;

export const PREMIUM_PATH = "/premium";

export function userIsPremium(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  if (!user.premium_until) return false;
  // Recomputed here (not just the server flag) so a month that ends
  // mid-session locks again without a reload.
  return new Date(user.premium_until).getTime() > Date.now();
}

/** THE Premium line's "your shares" layer is open: Premium, or the 7-day
 *  taste (recomputed from its end date so it closes without a reload). */
export function userSharesOpen(user: AuthUser | null | undefined): boolean {
  if (userIsPremium(user)) return true;
  const until = user?.taste?.until;
  return !!until && new Date(until).getTime() > Date.now();
}

export function limitFor(user: AuthUser | null | undefined, kind: LimitKind): number | null {
  if (userIsPremium(user)) return null;
  // A null from the server means no cap (the 7-day taste lifts the rule cap).
  const lim = user?.limits;
  return lim && kind in lim ? (lim[kind] ?? null) : FREE_LIMITS[kind];
}

/** Same read for code outside React (lib/watchlist.ts, lib/price-alerts.ts). */
export function storedLimit(kind: LimitKind): number | null {
  return limitFor(getStoredUser(), kind);
}

/** The backend's 403 detail is `"limit_reached:<kind>"` (entitlements.py). */
export function isLimitError(err: unknown, kind?: LimitKind): boolean {
  const e = err as { status?: number; message?: string } | null;
  if (!e || e.status !== 403 || typeof e.message !== "string") return false;
  return kind ? e.message === `limit_reached:${kind}` : e.message.startsWith("limit_reached:");
}

export function daysLeft(user: AuthUser | null | undefined): number {
  if (!user?.premium_until) return 0;
  const ms = new Date(user.premium_until).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}

export type PlanState = "guest" | "free" | "premium";

export function usePremium() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const isPremium = userIsPremium(user);
  const state: PlanState = !isLoggedIn ? "guest" : isPremium ? "premium" : "free";

  const limits = useMemo(
    () => ({
      watchlist: limitFor(user, "watchlist"),
      holdings: limitFor(user, "holdings"),
      alerts: limitFor(user, "alerts"),
      ai_daily: limitFor(user, "ai_daily"),
      portfolios: limitFor(user, "portfolios"),
      compare: limitFor(user, "compare"),
    }),
    [user],
  );

  return {
    isPremium,
    isLoading,
    state,
    premiumUntil: user?.premium_until ?? null,
    /** Premium or the 7-day taste: the "your shares" layer is open. */
    sharesOpen: userSharesOpen(user),
    taste: user?.taste ?? null,
    premiumSource: user?.premium_source ?? null,
    paidPlan: user?.paid_plan ?? null,
    daysLeft: daysLeft(user),
    limits,
  };
}
