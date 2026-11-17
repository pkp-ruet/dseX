"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Whether the signed-in home shows the reader's money (2026-11-17, the
 * bKash-style "see balance"): hidden on a new device, then this device
 * remembers. The portfolio button in the band sets it; since round 3
 * (2026-11-18) "Dividends coming to you" in Today for you reads it too, so
 * both show taka or neither does.
 */
const KEY = "dsex.home.showMoney";
const EVENT = "dsex:home-money";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** [shown, set]. Every caller on the page follows a change made by any of them. */
export function useMoneyShown(): [boolean, (next: boolean) => void] {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    setShown(read());
    // The event carries the value, so it still works where storage is blocked.
    const on = (e: Event) => setShown(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  const set = useCallback((next: boolean) => {
    setShown(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new CustomEvent<boolean>(EVENT, { detail: next }));
  }, []);

  return [shown, set];
}
