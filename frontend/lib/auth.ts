export const TOKEN_KEY = "dsex.auth.token";
const USER_KEY = "dsex.auth.user";

/** Fired by `logout()` — on sign-out, and when any call comes back 401.
 *  AuthContext, the watchlist and the alert store listen. */
export const AUTH_LOGOUT_EVENT = "dsex:auth-logout";

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
  // Plan (backend `entitlements.plan_fields`). Optional: a user cached before
  // premium shipped has none of these until the next /me refresh.
  is_premium?: boolean;
  premium_until?: string | null;
  trial_started_at?: string | null;
  premium_source?: "trial" | "admin" | "paid" | null;
  /** The last plan bought (`lib/premium-plans.ts` key). */
  paid_plan?: string | null;
  /** null = unlimited. */
  limits?: { watchlist: number | null; holdings?: number | null; alerts: number | null; ai_daily: number | null; portfolios?: number | null; custom_lists?: number | null };
  /** Three full stock reports a month for a free reader (backend/services/report_keys.py). */
  report_keys?: ReportKeys;
  /** The reader's own ৳99 month (backend `payments.offer_state`), or null
   *  when it isn't theirs (ended, Premium, already used). */
  offer?: OwnOfferState | null;
}

export interface OwnOfferState {
  key: "offer";
  amount: number;
  days: number;
  list_amount: number;
  /** False after "Not interested", and for a few days after "Remind me later". */
  banner: boolean;
}

export interface ReportKeys {
  /** Dhaka month, "2026-10". */
  month: string;
  per_month: number;
  used: number;
  left: number;
  /** Shares open now, each until its 7 days end. */
  open: { code: string; until: string }[];
}

/** True when this reader opened `code` with a report key and its days aren't over. */
export function hasReportKey(keys: ReportKeys | undefined, code: string): boolean {
  const c = code.toUpperCase();
  return !!keys?.open.some((o) => o.code === c && Date.parse(o.until) > Date.now());
}

/** Fired after something outside AuthContext stored a fresh user (e.g. a
 *  Premium payment on /premium). AuthContext listens and re-reads it. */
export const AUTH_USER_UPDATED_EVENT = "dsex:auth-user-updated";

// ---------------------------------------------------------------------------
// Token
// ---------------------------------------------------------------------------

// Storage can throw (blocked site data, a full quota); a throw here ran inside
// AuthProvider's effect and took the whole app down with it.
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {}
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
  try {
    window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {}
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(USER_KEY);
  } catch {}
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
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
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
