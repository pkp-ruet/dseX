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
