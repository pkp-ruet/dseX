"use client";

/**
 * Premium v1 on the client: who is premium, the free-account limits, and the
 * one free month. The backend decides (`backend/services/entitlements.py`) and
 * ships the plan on the user from /me; this file only reads it.
 *
 * The stock-page and portfolio locks are screen-only by design (see CLAUDE.md
 * "Premium"): the data ships, `PremiumGate` hides it.
 */

import { useCallback, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  type AuthUser,
  AUTH_USER_UPDATED_EVENT,
  getStoredUser,
  setStoredUser,
} from "@/lib/auth";
import { apiStartTrial } from "@/lib/api";
import { toast } from "@/lib/toast";

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

/**
 * Start the free month from anywhere (a hook, a toast action). Stores the
 * fresh user and tells AuthContext, so every lock on the page opens at once.
 */
export async function startFreeMonth(): Promise<boolean> {
  try {
    const { user } = await apiStartTrial();
    setStoredUser(user);
    window.dispatchEvent(new CustomEvent(AUTH_USER_UPDATED_EVENT));
    toast({ message: "Your free month of Premium has started", tone: "success" });
    return true;
  } catch (err) {
    const e = err as { status?: number };
    toast({
      message: e?.status === 409 ? "You've already used your free month" : "Couldn't start it — try again",
      tone: "error",
    });
    return false;
  }
}

export type PlanState = "guest" | "trial_available" | "premium" | "ended";

export function usePremium() {
  const { user, isLoggedIn, isLoading } = useAuth();
  const [starting, setStarting] = useState(false);

  const isPremium = userIsPremium(user);
  const state: PlanState = !isLoggedIn
    ? "guest"
    : isPremium
      ? "premium"
      : user?.trial_available === false
        ? "ended"
        : "trial_available";

  const startTrial = useCallback(async () => {
    setStarting(true);
    try {
      return await startFreeMonth();
    } finally {
      setStarting(false);
    }
  }, []);

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
    trialAvailable: state === "trial_available",
    premiumUntil: user?.premium_until ?? null,
    premiumSource: user?.premium_source ?? null,
    daysLeft: daysLeft(user),
    limits,
    startTrial,
    starting,
  };
}
