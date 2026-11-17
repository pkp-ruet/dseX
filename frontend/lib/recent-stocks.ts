/**
 * The shares a reader opened last, on this device (2026-11-17, the home's
 * "Continue where you left off" strip). Written by the stock page
 * (`StockVisitTracker`), read by the home page. Per device and per browser on
 * purpose: it is a convenience, like bKash's recent contacts, not a record.
 */

const KEY = "dsex.recentStocks";
/** Kept on the device; the home shows the first five. */
const KEEP = 10;
export const RECENT_EVENT = "dsex:recent-stocks";

export function readRecentStocks(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((c): c is string => typeof c === "string" && c.length > 0) : [];
  } catch {
    return [];
  }
}

/** Put `code` first (once), keep the newest `KEEP`. */
export function rememberStock(code: string): void {
  const c = code.trim().toUpperCase();
  if (!c) return;
  try {
    const next = [c, ...readRecentStocks().filter((x) => x !== c)].slice(0, KEEP);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENT_EVENT));
  } catch {}
}
