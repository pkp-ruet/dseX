"use client";

/**
 * Premium on the client: who is premium and the free-account limits. There
 * is no free month (removed 2026-10-25) — Premium is bought by bKash / Nagad
 * on /premium. The backend decides (`backend/services/entitlements.py`) and
 * ships the plan on the user from /me; this file only reads it.
 *
 * The stock-page and portfolio locks are screen-only by design (see CLAUDE.md
 * "Premium"): the data ships, `PremiumGate` hides it.
 */

import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { type AuthUser, getStoredUser } from "@/lib/auth";

/** Mirrors backend `FREE_LIMITS` — used only when a cached user predates the
 *  plan fields; the server value always wins once /me has refreshed. */
export const FREE_LIMITS = { watchlist: 10, alerts: 3, ai_daily: 10, portfolios: 1 } as const;

export type LimitKind = keyof typeof FREE_LIMITS;

export const PREMIUM_PATH = "/premium";

export function userIsPremium(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  if (user.is_admin) return true;
  if (!user.premium_until) return false;
  // Recomputed here (not just the server flag) so a month that ends
  // mid-session locks again without a reload.
  return new Date(user.premium_until).getTime() > Date.now();
}

export function limitFor(user: AuthUser | null | undefined, kind: LimitKind): number | null {
  if (userIsPremium(user)) return null;
  return user?.limits?.[kind] ?? FREE_LIMITS[kind];
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
      alerts: limitFor(user, "alerts"),
      ai_daily: limitFor(user, "ai_daily"),
      portfolios: limitFor(user, "portfolios"),
    }),
    [user],
  );

  return {
    isPremium,
    isLoading,
    state,
    premiumUntil: user?.premium_until ?? null,
    premiumSource: user?.premium_source ?? null,
    paidPlan: user?.paid_plan ?? null,
    daysLeft: daysLeft(user),
    limits,
  };
}
