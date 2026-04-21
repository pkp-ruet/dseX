/** Client-side BST (UTC+6) market hours helpers — no API calls. */

const BST_OFFSET_MS = 6 * 60 * 60 * 1000;
const TRADING_DAYS = new Set([0, 1, 2, 3, 6]); // Sun=0,Mon=1,...,Thu=4,Sat=5 in UTC+6

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
