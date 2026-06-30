"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isPushSupported, getPermission, subscribeToPush } from "@/lib/push";

/**
 * Full-width "Turn on alerts" strip that sits just below the navbar (next to
 * MarketDataBanner). Fully independent of PushOptInPrompt — its own dismissal
 * keys, its own gate, no shared snooze history.
 *
 * Shows to any logged-in user whose push permission is still "default" (so
 * users who already enabled alerts — permission "granted" — never see it, and
 * "denied"/unsupported browsers get no dead-end button). The "Turn on" CTA is
 * the only thing that triggers the OS permission dialog.
 *
 * The close (✕) button opens two choices:
 *  - "Close for now"   → sessionStorage; comes back next visit.
 *  - "Don't show again" → localStorage; gone for good.
 *
 * Mounted globally in app/layout.tsx.
 */
const DISMISS_KEY = "dsex.pushalert.dismissed"; // permanent — "Don't show again"
const CLOSED_KEY = "dsex.pushalert.closed"; // this session — "Close for now"

export default function PushAlertBanner() {
  const { isLoggedIn } = useAuth();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Decide visibility on the client (auth + permission are client-only, so we
  // start hidden to keep SSR and first paint matched, then the effect decides).
  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") {
      setShow(false);
      return;
    }
    // Already enabled (granted), blocked (denied), or unsupported → never show.
    if (!isPushSupported() || getPermission() !== "default") return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return; // "Don't show again"
      if (sessionStorage.getItem(CLOSED_KEY)) return; // "Close for now" this session
    } catch {
      /* unreadable storage → fall through and show */
    }
    // Small delay so we don't flash during the initial hydration burst.
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [isLoggedIn]);

  // Close the two-option menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!show) return null;

  function closeForNow() {
    setMenuOpen(false);
    setShow(false);
    try {
      sessionStorage.setItem(CLOSED_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function dontShowAgain() {
    setMenuOpen(false);
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }

  async function enable() {
    setBusy(true);
    await subscribeToPush(); // fires the OS dialog; permission leaves "default" after
    setBusy(false);
    setShow(false); // granted → gate keeps it hidden; denied → same
  }

  return (
    <div
      role="region"
      aria-label="Turn on alerts"
      className="shrink-0 w-full"
      style={{
        background: "color-mix(in srgb, var(--warm) 10%, var(--surface))",
        borderBottom: "1px solid color-mix(in srgb, var(--warm) 28%, transparent)",
      }}
    >
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-2 flex items-center gap-2.5">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
          style={{
            color: "var(--warm)",
            background: "color-mix(in srgb, var(--warm) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--warm) 30%, var(--border))",
          }}
          aria-hidden
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold leading-snug text-[var(--text)]">
            Turn on alerts
          </p>
          <p className="text-[11px] sm:text-xs leading-snug text-[var(--text-muted)]">
            Price moves, dividends &amp; your price targets — straight to your phone.
          </p>
          <p className="text-[11px] sm:text-xs leading-snug text-[var(--text-muted)] font-bn" lang="bn">
            আপনার শেয়ারের আপডেট পান — এক ট্যাপে।
          </p>
        </div>

        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
          style={{ background: "var(--warm)" }}
        >
          {busy ? "Turning on…" : "Turn on"}
        </button>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Close options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-black/5 hover:text-[var(--text)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-[60] mt-1 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={closeForNow}
                className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)]"
              >
                Close for now
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={dontShowAgain}
                className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                Don&apos;t show again
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
