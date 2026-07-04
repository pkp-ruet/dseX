"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiAuthPing } from "@/lib/api";
import { isStandalone, isIOS } from "@/lib/push";
import { publishStreak } from "@/lib/streak";

/** Coarse install platform, reported only when running as an installed PWA. */
function detectPlatform(): string {
  if (isIOS()) return "ios";
  if (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent)) return "android";
  return "desktop";
}

export default function PingTracker() {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const lastPinged = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn) {
      lastPinged.current = null;
      return;
    }
    // Dedupe redundant re-renders + React StrictMode double-invoke so each
    // distinct route fires exactly one ping.
    if (lastPinged.current === pathname) return;
    lastPinged.current = pathname;
    // Keep only the attribution params (src/v, set by push deep links) so
    // user_events path cardinality stays bounded.
    let pingPath = pathname;
    try {
      const sp = new URLSearchParams(window.location.search);
      const src = sp.get("src");
      if (src) {
        const v = sp.get("v");
        pingPath = `${pathname}?src=${src}${v ? `&v=${v}` : ""}`;
      }
    } catch {
      /* ignore — attribution is best-effort */
    }
    // When the app is running installed (standalone), tell the backend so it can
    // record the install — the only signal that also catches iOS installs.
    const standalone = isStandalone();
    apiAuthPing(
      pingPath,
      standalone ? { standalone: true, platform: detectPlatform() } : undefined,
    ).then((r) => {
      if (r?.streak) publishStreak(r.streak);
    });
  }, [isLoggedIn, pathname]);

  return null;
}
