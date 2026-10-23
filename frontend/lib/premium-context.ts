/**
 * "Where did this reader come from?" — the lock card stores what it showed
 * (which lock, the reader's own stakes) right before it sends them to
 * /premium, and /premium reads it back to open on *their* reason instead of a
 * generic pitch. sessionStorage only: it never leaves the browser and never
 * goes in a URL. Stale after 30 minutes.
 */

const KEY = "dsex.premium.ctx";
const MAX_AGE_MS = 30 * 60 * 1000;

export interface PremiumContext {
  /** Page area the lock sat in, e.g. "portfolio", "stock". */
  from: string;
  /** What was behind the lock ("Your portfolio in depth"). */
  label?: string;
  /** The reader's own stakes, already in their language. */
  stakes?: string[];
  at: number;
}

export function savePremiumContext(ctx: Omit<PremiumContext, "at">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...ctx, at: Date.now() }));
  } catch {}
}

export function readPremiumContext(): PremiumContext | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const ctx = JSON.parse(raw) as PremiumContext;
    if (!ctx?.from || Date.now() - (ctx.at || 0) > MAX_AGE_MS) return null;
    return ctx;
  } catch {
    return null;
  }
}

/** The page area for tracking + context, from the path. */
export function areaOf(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "home";
  return seg === "stock" && pathname.includes("/analysis") ? "stock-analysis" : seg;
}
