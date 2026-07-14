/** Client-side BST (UTC+6) market hours helpers — no API calls. */

const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
const TRADING_DAYS = new Set([0, 1, 2, 3, 4]); // Sun=0 … Thu=4 (DSE week, UTC+6)

function nowBST(): Date {
  return new Date(Date.now() + BST_OFFSET_MS);
}

export function isTradingDay(): boolean {
  return TRADING_DAYS.has(nowBST().getUTCDay());
}

export function isMarketOpen(): boolean {
  const bst = nowBST();
  if (!TRADING_DAYS.has(bst.getUTCDay())) return false;
  const h = bst.getUTCHours();
  const m = bst.getUTCMinutes();
  return (h > 10 || (h === 10 && m >= 0)) && (h < 14 || (h === 14 && m <= 30));
}

export function secondsToClose(): number {
  const bst = nowBST();
  const close = new Date(bst);
  close.setUTCHours(14, 30, 0, 0);
  return Math.max(0, Math.floor((close.getTime() - bst.getTime()) / 1000));
}

export function secondsToOpen(): number {
  const now = Date.now();
  const bst = nowBST();
  // Try today first (if before 10:00 BST on a trading day)
  const todayOpen = new Date(bst);
  todayOpen.setUTCHours(10, 0, 0, 0);
  if (TRADING_DAYS.has(bst.getUTCDay()) && bst < todayOpen) {
    return Math.max(0, Math.floor((todayOpen.getTime() - now - BST_OFFSET_MS) / 1000));
  }
  // Advance to next trading day
  for (let i = 1; i <= 7; i++) {
    const next = new Date(bst);
    next.setUTCDate(next.getUTCDate() + i);
    next.setUTCHours(10, 0, 0, 0);
    if (TRADING_DAYS.has(next.getUTCDay())) {
      return Math.max(0, Math.floor((next.getTime() - now - BST_OFFSET_MS) / 1000));
    }
  }
  return 0;
}

export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** True once the BST clock has reached the 10:00 market open (stays true the rest of the day). */
export function isAfterOpen(): boolean {
  return nowBST().getUTCHours() >= 10;
}

/** Current hour (0–23) on the BST wall clock — for time-of-day greetings. */
export function bstHour(): number {
  return nowBST().getUTCHours();
}

export type MarketSession = "open" | "pre" | "closed";

/** Coarse trading-session state for the live/closed status pill. */
export function marketSession(): MarketSession {
  if (isMarketOpen()) return "open";
  if (isTradingDay() && !isAfterOpen()) return "pre"; // trading day, before 10:00
  return "closed";
}

/** Today's date in BST as `YYYY-MM-DD` — matches the `date` strings on scraped market data. */
export function bstDateStr(): string {
  const b = nowBST();
  const y = b.getUTCFullYear();
  const m = String(b.getUTCMonth() + 1).padStart(2, "0");
  const d = String(b.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-06-15" → "Sun, 15 Jun" (timezone-independent — parses the parts directly). */
export function formatBstDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[wd]}, ${d} ${MONTHS[m - 1]}`;
}

/** UTC ISO timestamp → BST wall-clock "2:05 PM". Returns "" on an unparseable input. */
export function formatBstTimeLabel(utcIso: string): string {
  const t = new Date(utcIso).getTime();
  if (Number.isNaN(t)) return "";
  const bst = new Date(t + BST_OFFSET_MS);
  const min = bst.getUTCMinutes();
  const h24 = bst.getUTCHours();
  const ampm = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}
