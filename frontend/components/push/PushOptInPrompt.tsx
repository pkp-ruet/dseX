"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeWatchlist, getCachedWatchlist } from "@/lib/watchlist";
import {
  isPushSupported,
  isStandalone,
  isIOS,
  getPermission,
  subscribeToPush,
} from "@/lib/push";

const ASKED_KEY = "dsex.push.asked";

/**
 * Soft web-push opt-in. Never calls Notification.requestPermission() on load — a
 * denial is permanent. Instead it appears once, tied to the value moment of the
 * user having a watchlist ("we'll watch this for you"), and only the explicit
 * "Turn on alerts" tap triggers the real OS dialog.
 *
 * iOS Safari can't subscribe unless the site is installed to the home screen, so
 * iOS-not-installed users get an "Add to Home Screen" hint instead of a dead-end
 * button. Mounted globally in app/layout.tsx.
 */
export default function PushOptInPrompt() {
  const { isLoggedIn } = useAuth();
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"prompt" | "ios">("prompt");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") return;
    if (localStorage.getItem(ASKED_KEY)) return;

    const canPrompt = isPushSupported() && getPermission() === "default";
    const iosInstallHint = isIOS() && !isStandalone();
    if (!canPrompt && !iosInstallHint) return;

    let done = false;
    const maybeShow = () => {
      if (done) return;
      // The value moment: they now have at least one stock to follow.
      if (getCachedWatchlist().length > 0) {
        done = true;
        setMode(iosInstallHint ? "ios" : "prompt");
        setShow(true);
      }
    };
    // Small delay so we don't pop during the initial hydration burst.
    const t = setTimeout(maybeShow, 1500);
    const unsub = subscribeWatchlist(maybeShow);
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [isLoggedIn]);

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(ASKED_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function enable() {
    setBusy(true);
    await subscribeToPush();
    setBusy(false);
    dismiss();
  }

  if (!show) return null;

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
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            {mode === "ios" ? (
              <>
                <p className="text-sm font-bold text-[var(--text)]">
                  Get a daily heads-up on your stocks
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                  To turn on alerts on iPhone, tap{" "}
                  <span className="font-semibold">Share</span> then{" "}
                  <span className="font-semibold">Add to Home Screen</span>, and open
                  TopStockBD from there.
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)] font-bn" lang="bn">
                  আইফোনে: Share → Add to Home Screen চাপুন, তারপর সেখান থেকে অ্যাপটি খুলুন।
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
                  Want a heads-up when your stocks move?
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)]">
                  One short update a day — your watchlist movers, dividends and alerts.
                  No spam.
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--text-muted)] font-bn" lang="bn">
                  দিনে একটি ছোট আপডেট — বিরক্ত করব না।
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
                    onClick={enable}
                    disabled={busy}
                    className="rounded-lg px-3.5 py-2 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: "var(--primary)" }}
                  >
                    {busy ? "Turning on…" : "Turn on alerts"}
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
