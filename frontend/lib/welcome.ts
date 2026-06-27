import type { AuthUser } from "@/lib/auth";

const FLAG_KEY = "dsex.justSignedUp";

/**
 * Mark that the user just created an account, so the next dashboard render
 * greets them as new ("Welcome to TopStockBD") instead of "Welcome back".
 * One-shot: consumed (and cleared) on first read. sessionStorage survives the
 * client-side redirect to "/" but not a new tab/session.
 */
export function markJustSignedUp(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(FLAG_KEY, "1");
  } catch {
    /* sessionStorage unavailable (private mode / quota) — degrade silently */
  }
}

/** Read and clear the just-signed-up flag. Returns true only once per signup. */
export function consumeJustSignedUp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.sessionStorage.getItem(FLAG_KEY);
    if (v) window.sessionStorage.removeItem(FLAG_KEY);
    return !!v;
  } catch {
    return false;
  }
}

/**
 * Heuristic for the Google sign-in path, which can be either a brand-new signup
 * or an existing user logging in. A new account has no prior login
 * (`last_login_at` null) or its first login coincides with account creation.
 * Returning users have a `last_login_at` well after `created_at`.
 */
export function looksNewlyCreated(user: AuthUser): boolean {
  if (!user.last_login_at) return true;
  const created = Date.parse(user.created_at);
  const lastLogin = Date.parse(user.last_login_at);
  if (Number.isNaN(created) || Number.isNaN(lastLogin)) return false;
  return Math.abs(lastLogin - created) < 5000; // within 5s → same session as signup
}
