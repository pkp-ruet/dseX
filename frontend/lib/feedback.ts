/**
 * One-time feedback popup dismissal, tracked per user in localStorage.
 *
 * Keyed by user_id so the prompt is shown at most once per signed-in user on
 * this device. (Per-device — a brand-new device would show it once more. Fine
 * for v1; can be upgraded to a server-side flag later.)
 */
const KEY = "dsex.feedback.dismissed";

function readMap(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/** True when the popup should NOT be shown again to this user. */
export function isFeedbackDismissed(userId?: string | null): boolean {
  if (typeof window === "undefined" || !userId) return true;
  return readMap()[userId] === true;
}

/** Mark the popup permanently dismissed for this user (on close OR submit). */
export function dismissFeedback(userId?: string | null): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const map = readMap();
    map[userId] = true;
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore quota / disabled storage
  }
}
