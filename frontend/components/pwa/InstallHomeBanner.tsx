"use client";

import { useEffect, useState } from "react";
import { useInstallPrompt, showInstallBanner } from "@/lib/install";

const DISMISS_KEY = "dsex.install.home.dismissed";

/**
 * Catchy, mobile-only install CTA for the top of the personalized home. Desktop
 * already has the navbar Install button, so this is hidden on `sm:` and up.
 * Renders nothing once installed, when the browser can't install, and after the
 * user dismisses it (persisted). On Chromium it fires the native dialog; on iOS
 * it pops the floating banner's Add-to-Home-Screen instructions.
 */
export default function InstallHomeBanner() {
  const { canInstall, installed, ios, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setDismissed(!!localStorage.getItem(DISMISS_KEY));
    } catch {
      /* ignore */
    }
  }, []);

  const eligible = !installed && (canInstall || ios);
  if (!eligible || dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function handle() {
    if (canInstall) {
      setBusy(true);
      const outcome = await promptInstall();
      setBusy(false);
      if (outcome === "accepted") dismiss();
    } else {
      // iOS — no install API; surface the Add-to-Home-Screen instructions.
      showInstallBanner();
    }
  }

  const ctaLabel = canInstall && busy ? "…" : "Install";

  return (
    <div className="sm:hidden mt-3">
      <div
        className="flex items-center gap-2.5 rounded-xl px-3 py-2"
        style={{
          background: "color-mix(in srgb, var(--warm) 8%, var(--surface))",
          border: "1px solid color-mix(in srgb, var(--warm) 28%, var(--border))",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={28} height={28} className="h-7 w-7 shrink-0 rounded-lg" />
        <p className="min-w-0 flex-1 truncate text-[0.8rem] font-semibold text-[var(--text)]">
          Install the app
        </p>
        <button
          type="button"
          onClick={handle}
          disabled={busy}
          className="shrink-0 rounded-lg bg-[var(--warm)] px-3 py-1.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-70"
        >
          {ctaLabel}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
