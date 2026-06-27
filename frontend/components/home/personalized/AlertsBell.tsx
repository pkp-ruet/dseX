"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HomeAlert } from "@/lib/home-alerts";

const SEEN_KEY = "dsex.alerts.seen";

/**
 * Notification bell beside the greeting — the in-app twin of the push digest.
 * Badge counts alerts not yet seen (persisted in localStorage); tapping opens a
 * bottom sheet listing today's personal alerts and clears the badge.
 */
export default function AlertsBell({ alerts }: { alerts: HomeAlert[] }) {
  // Lazy-init from storage so the badge doesn't flash the full count on mount.
  const [seen, setSeen] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const [mounted, setMounted] = useState(false); // sheet in the DOM
  const [open, setOpen] = useState(false); // transition target

  const newCount = useMemo(
    () => alerts.filter((a) => !seen.includes(a.id)).length,
    [alerts, seen],
  );

  // Lock scroll + wire Escape while the sheet is open.
  useEffect(() => {
    if (!mounted) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  function openSheet() {
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
    // Everything currently shown counts as seen → clears the badge.
    const ids = alerts.map((a) => a.id);
    setSeen(ids);
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify(ids));
    } catch {
      /* ignore */
    }
  }
  function closeSheet() {
    setOpen(false);
    setTimeout(() => setMounted(false), 220);
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        aria-label={newCount > 0 ? `Alerts, ${newCount} new` : "Alerts"}
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition active:scale-95"
        style={{
          color: "var(--warm)",
          background: "color-mix(in srgb, var(--warm) 15%, transparent)",
          border: "1px solid color-mix(in srgb, var(--warm) 32%, var(--border))",
        }}
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {newCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[var(--negative)] px-1 text-[0.62rem] font-extrabold leading-none text-white ring-2 ring-[var(--surface)]">
            {newCount > 9 ? "9+" : newCount}
          </span>
        )}
      </button>

      {mounted && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Your alerts">
          <div
            onClick={closeSheet}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0"}`}
            aria-hidden
          />
          <div
            className={`absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] shadow-2xl transition-transform duration-200 ${open ? "translate-y-0" : "translate-y-full"}`}
          >
            {/* Grab handle */}
            <div className="flex justify-center pt-2.5" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-[var(--border)]" />
            </div>

            <div className="flex items-center justify-between px-4 pb-2 pt-2">
              <h2 className="text-base font-extrabold text-[var(--text)]">What&apos;s new</h2>
              <button
                type="button"
                onClick={closeSheet}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-center">
                  <span className="text-3xl" aria-hidden>✓</span>
                  <p className="text-sm font-semibold text-[var(--text)]">You&apos;re all caught up</p>
                  <p className="text-xs text-[var(--text-muted)]">No new alerts on your stocks today.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-1.5 py-1">
                  {alerts.map((a) => {
                    const toneColor =
                      a.tone === "positive"
                        ? "var(--positive)"
                        : a.tone === "negative"
                          ? "var(--negative)"
                          : "var(--text-muted)";
                    const row = (
                      <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 transition hover:bg-[var(--surface-2)]">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-base" aria-hidden>
                          {a.emoji}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[var(--text)]">{a.title}</span>
                          {a.detail && (
                            <span className="block truncate text-xs font-medium" style={{ color: toneColor }}>
                              {a.detail}
                            </span>
                          )}
                        </span>
                        {a.href && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[var(--text-muted)]" aria-hidden>
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        )}
                      </div>
                    );
                    return (
                      <li key={a.id}>
                        {a.href ? (
                          <Link href={a.href} onClick={closeSheet} className="block">
                            {row}
                          </Link>
                        ) : (
                          row
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
