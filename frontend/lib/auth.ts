const TOKEN_KEY = "dsex.auth.token";
const USER_KEY = "dsex.auth.user";

export interface AuthUser {
  user_id: string;
  email: string | null;
  phone: string | null;
  display_name: string | null;
  watchlist: string[];
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  last_seen_at: string | null;
  total_visits: number;
  is_active: boolean;
  is_admin: boolean;
  current_streak?: number;
  longest_streak?: number;
  // Plan (backend `entitlements.plan_fields`). Optional: a user cached before
  // premium shipped has none of these until the next /me refresh.
  is_premium?: boolean;
  premium_until?: string | null;
  trial_started_at?: string | null;
  premium_source?: "trial" | "admin" | null;
  trial_available?: boolean;
  /** null = unlimited. */
  limits?: { watchlist: number | null; alerts: number | null; ai_daily: number | null };
}

/** Fired after something outside AuthContext stored a fresh user (e.g. the
 *  free month started from a toast). AuthContext listens and re-reads it. */
export const AUTH_USER_UPDATED_EVENT = "dsex:auth-user-updated";

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Cached user
// ---------------------------------------------------------------------------

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
}

// ---------------------------------------------------------------------------
// Combined helpers
// ---------------------------------------------------------------------------

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  clearToken();
  clearStoredUser();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dsex:auth-logout"));
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload.exp) return false;
    return Date.now() / 1000 > payload.exp;
  } catch {
    return true;
  }
}
