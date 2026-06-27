"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getCachedWatchlist } from "@/lib/watchlist";
import { isPushOptInPending } from "@/lib/push";
import { useInstallPrompt, INSTALL_SHOW_EVENT } from "@/lib/install";

const DISMISS_KEY = "dsex.install.dismissed";

/**
 * Floating "Install now" banner. Auto-appears once for installable visitors who
 * haven't dismissed it (any user — install is not login-gated). After dismissal
 * it stays hidden, but the navbar Install button can re-summon it via the
 * `dsex:show-install` event.
 *
 * Chromium → "Install now" fires the native dialog. iOS (not yet installed) →
 * Share → Add to Home Screen instructions, since iOS has no install API.
 * Mirrors the look of components/push/PushOptInPrompt.tsx. Mounted globally in
 * app/layout.tsx.
 */
export default function InstallPrompt() {
  const { isLoggedIn } = useAuth();
  const pathname = usePathname();
  const { canInstall, installed, ios, promptInstall } = useInstallPrompt();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  const eligible = !installed && (canInstall || ios);

  // Auto-show once (unless previously dismissed).
  useEffect(() => {
    if (!eligible) {
      setShow(false);
      return;
    }
    let dismissed = false;
    try {
      dismissed = !!localStorage.getItem(DISMISS_KEY);
    } catch {
      /* ignore */
    }
    if (dismissed) return;
    // The logged-in home has its own inline install banner (InstallHomeBanner) —
    // don't auto-show the floating one there too. Manual showInstallBanner() (e.g.
    // iOS taps from that banner) still works via the listener below.
    if (isLoggedIn && pathname === "/") return;
    // Push opt-in wins for logged-in watchlist users — don't stack two bottom
    // cards. The navbar Install button (showInstallBanner) still force-shows it,
    // and the banner auto-shows on a later visit once push has been handled.
    if (isPushOptInPending({ isLoggedIn, watchlistCount: getCachedWatchlist().length }))
      return;
    const t = setTimeout(() => setShow(true), 2500);
    return () => clearTimeout(t);
  }, [eligible, isLoggedIn, pathname]);

  // Manual re-summon from the navbar button (ignores the dismissed flag).
  useEffect(() => {
    const onShow = () => {
      if (!installed) setShow(true);
    };
    window.addEventListener(INSTALL_SHOW_EVENT, onShow);
    return () => window.removeEventListener(INSTALL_SHOW_EVENT, onShow);
  }, [installed]);

  if (!show || !eligible) return null;

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function install() {
    setBusy(true);
    await promptInstall();
    setBusy(false);
    dismiss();
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:bottom-4 sm:left-auto sm:right-4 sm:px-0">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[var(--primary)]"
            style={{
              background: "color-mix(in srgb, var(--primary) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--primary) 24%, var(--border))",
            }}
            aria-hidden
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v12" />
              <path d="m7 10 5 5 5-5" />
              <path d="M5 21h14" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            {ios && !canInstall ? (
              <>
                <p className="text-sm font-bold text-[var(--text)]">
                  Add TopStockBD to your home screen
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                  Tap <span className="font-semibold">Share</span> then{" "}
                  <span className="font-semibold">Add to Home Screen</span> to open
                  it like an app — full screen, one tap away.
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)] font-bn" lang="bn">
                  Share → Add to Home Screen চাপুন — অ্যাপের মতো খুলবে।
                </p>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                  >
                    Got it
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-bold text-[var(--text)]">
                  Install TopStockBD as an app
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                  Add it to your home screen — opens full screen, loads faster, one
                  tap to your stocks.
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)] font-bn" lang="bn">
                  হোম স্ক্রিনে যোগ করুন — অ্যাপের মতো দ্রুত খুলবে।
                </p>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={dismiss}
                    disabled={busy}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-50"
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={install}
                    disabled={busy}
                    className="rounded-lg px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: "var(--primary)" }}
                  >
                    {busy ? "Installing…" : "Install now"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
