"use client";

import { useSyncExternalStore } from "react";

/**
 * `useMediaQuery("(min-width: 1024px)")` → true while the query matches.
 * Server render and hydration read `false`; components that only mount after
 * hydration (the signed-in dashboard) get the real value on their first render,
 * so the layout doesn't jump.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => (typeof window !== "undefined" && !!window.matchMedia ? window.matchMedia(query).matches : false),
    () => false,
  );
}
