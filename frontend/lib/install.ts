"use client";

/**
 * PWA install helpers — capture Chrome's `beforeinstallprompt` so we can show our
 * own "Install app" button instead of relying on the browser's native banner.
 *
 * Only Chromium browsers (Android Chrome, desktop Chrome/Edge, Samsung Internet)
 * fire `beforeinstallprompt`. iOS Safari and Firefox never do — those users must
 * install manually (Share → Add to Home Screen), so callers fall back to the
 * `ios` flag + an instructions hint.
 *
 * The event can fire before any React component mounts, so we capture it at
 * module load (guarded for SSR) and re-broadcast via a custom event the hook
 * subscribes to.
 */
import { useCallback, useEffect, useState } from "react";
import { isIOS, isStandalone } from "@/lib/push";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const CHANGE_EVENT = "dsex:installable-change";
const SHOW_EVENT = "dsex:show-install";

let deferred: BeforeInstallPromptEvent | null = null;

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    // Stop Chrome's own mini-infobar; we surface our button instead.
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    window.dispatchEvent(new Event(CHANGE_EVENT));
  });
}

/** Force the floating install banner to appear (e.g. from the navbar button). */
export function showInstallBanner() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SHOW_EVENT));
}

export const INSTALL_SHOW_EVENT = SHOW_EVENT;

export function useInstallPrompt() {
  // Start `false` on both server and client so the first paint matches; real
  // values are filled in the effect to avoid hydration mismatches.
  const [state, setState] = useState({ canInstall: false, installed: false, ios: false });

  useEffect(() => {
    const sync = () =>
      setState({
        canInstall: deferred !== null,
        installed: isStandalone(),
        ios: isIOS(),
      });
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  /**
   * Trigger the native install dialog. Must be called from a user gesture.
   * Returns the outcome, or "unavailable" when no prompt was captured (iOS,
   * Firefox, or already installed).
   */
  const promptInstall = useCallback(async (): Promise<
    "accepted" | "dismissed" | "unavailable"
  > => {
    if (!deferred) return "unavailable";
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    // The event is single-use — Chrome won't let us reuse it.
    deferred = null;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return outcome;
  }, []);

  return { ...state, promptInstall };
}
