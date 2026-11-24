"use client";

import { apiGetWatchRules, apiSetWatchRules, type WatchRulesState } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import {
  addToWatchlist,
  getCachedWatchlist,
  getCachedWatchlistMeta,
  removeFromWatchlist,
  subscribeWatchlist,
} from "@/lib/watchlist";
import { activeAlertFor, createAlert, deleteAlert } from "@/lib/price-alerts";

/**
 * The reader's watch rules, one read per page (every Watch button shares it),
 * refreshed by a save.
 *
 * Watching a share = being on the watchlist (2026-11-25, one Watch button):
 * the backend drops a share's rules when it leaves the watchlist, and this
 * store mirrors that on the spot, so a star tapped off in a list never leaves
 * a "Watching · 3 rules" button behind.
 */
const EVENT = "dsex:watch-rules";
let state: WatchRulesState | null = null;
let pending: Promise<WatchRulesState | null> | null = null;
let followed: Set<string> | null = null;
let wired = false;

function wireFollows(): void {
  if (wired || typeof window === "undefined") return;
  wired = true;
  followed = new Set(getCachedWatchlist().map((c) => c.toUpperCase()));
  subscribeWatchlist(() => {
    const now = new Set(getCachedWatchlist().map((c) => c.toUpperCase()));
    const gone = followed ? [...followed].filter((c) => !now.has(c)) : [];
    followed = now;
    if (!state || !gone.length) return;
    const keep = state.rules.filter((r) => !gone.includes(r.code));
    if (keep.length === state.rules.length) return;
    setWatchRulesState({ ...state, rules: keep, used: keep.length + state.armed_alerts });
  });
}

export function loadWatchRules(): Promise<WatchRulesState | null> {
  wireFollows();
  if (state) return Promise.resolve(state);
  if (!isLoggedIn()) return Promise.resolve(null);
  if (!pending) {
    pending = apiGetWatchRules()
      .then((s) => {
        state = s;
        return s;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function getWatchRulesState(): WatchRulesState | null {
  return state;
}

export function setWatchRulesState(s: WatchRulesState): void {
  state = s;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function subscribeWatchRules(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

/** How many rules the reader has on one share (0 before the first read). */
export function rulesOn(code: string): number {
  const c = code.toUpperCase();
  return (state?.rules ?? []).filter((r) => r.code === c).length;
}

/**
 * Stop watching a share: off the watchlist (its rules go with it) and its
 * price alert removed. Returns an undo that puts all three back, with the
 * day and price it was first followed at.
 */
export async function stopWatching(code: string): Promise<() => Promise<void>> {
  const c = code.toUpperCase();
  const meta = getCachedWatchlistMeta()[c];
  const rules = (state?.rules ?? []).filter((r) => r.code === c);
  const alert = activeAlertFor(c);
  await removeFromWatchlist(c);
  if (alert) await deleteAlert(alert.id);
  return async () => {
    await addToWatchlist(c, meta ? { [c]: meta } : undefined);
    if (rules.length) {
      try {
        setWatchRulesState(
          await apiSetWatchRules(c, rules.map((r) => (r.value != null ? { kind: r.kind, value: r.value } : { kind: r.kind }))),
        );
      } catch {
        // The share is back; its rules can be set again from the sheet.
      }
    }
    if (alert) await createAlert(c, alert.target_price);
  };
}

/** What to open the sheet with: today's price (for the price alert row) and
 *  rules to tick for the reader (the calendar's "Remind me" ticks last_day). */
export type WatchOpenOpts = { ltp?: number | null; tick?: string[] };

/** Open the Watch sheet for a share from anywhere (a toast, a list, the
 *  calendar): `WatchRulesHost` in the root layout listens. */
const OPEN_EVENT = "dsex:watch-rules-open";

type OpenDetail = { code: string; name: string; opts: WatchOpenOpts };

export function openWatchRules(code: string, name?: string | null, opts: WatchOpenOpts = {}): void {
  if (typeof window === "undefined") return;
  const detail: OpenDetail = { code: code.toUpperCase(), name: name || code.toUpperCase(), opts };
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail }));
}

export function subscribeOpenWatchRules(cb: (code: string, name: string, opts: WatchOpenOpts) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => {
    const d = (e as CustomEvent<OpenDetail>).detail;
    if (d?.code) cb(d.code, d.name, d.opts ?? {});
  };
  window.addEventListener(OPEN_EVENT, h);
  return () => window.removeEventListener(OPEN_EVENT, h);
}
