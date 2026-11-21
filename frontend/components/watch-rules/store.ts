"use client";

import { apiGetWatchRules, type WatchRulesState } from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";

/** One read of the reader's watch rules per page (every "Watch" button on a
 *  watchlist or portfolio shares it), refreshed by a save. */
const EVENT = "dsex:watch-rules";
let state: WatchRulesState | null = null;
let pending: Promise<WatchRulesState | null> | null = null;

export function loadWatchRules(): Promise<WatchRulesState | null> {
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

/** Open the rules sheet for a share from anywhere (a toast, the rules page):
 *  `WatchRulesHost` in the root layout listens. */
const OPEN_EVENT = "dsex:watch-rules-open";

export function openWatchRules(code: string, name?: string | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { code: code.toUpperCase(), name: name || code.toUpperCase() } }));
}

export function subscribeOpenWatchRules(cb: (code: string, name: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = (e: Event) => {
    const d = (e as CustomEvent<{ code: string; name: string }>).detail;
    if (d?.code) cb(d.code, d.name);
  };
  window.addEventListener(OPEN_EVENT, h);
  return () => window.removeEventListener(OPEN_EVENT, h);
}
