"use client";

import { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";

const SETUP_SKIP_KEY = "dsex.setup.skip"; // sessionStorage — hide for this session only
const SETUP_HIDE_KEY = "dsex.setup.hidden"; // localStorage — hide permanently

const ICON_SETUP = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M9 11l3 3L22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const ICON_WATCHLIST = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const ICON_CHECK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

interface Props {
  hasWatchlist: boolean;
}

/**
 * Setup checklist shown under the dashboard hero while onboarding is
 * incomplete. Covers the step the money hero doesn't already drive — build a
 * watchlist (adding a portfolio is sold by the MoneyHeroGhost hero itself, so
 * it's intentionally not repeated here). The "personalize your picks" step
 * went with the dashboard's picks card (2026-10-26). Once done (or the card is
 * dismissed), this renders nothing.
 */
export default function DailyBriefing({ hasWatchlist }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return (
        localStorage.getItem(SETUP_HIDE_KEY) === "1" ||
        sessionStorage.getItem(SETUP_SKIP_KEY) === "1"
      );
    } catch {
      return false;
    }
  });

  function skipForNow() {
    try {
      sessionStorage.setItem(SETUP_SKIP_KEY, "1");
    } catch {}
    setMenuOpen(false);
    setDismissed(true);
  }
  function dontShowAgain() {
    try {
      localStorage.setItem(SETUP_HIDE_KEY, "1");
    } catch {}
    setMenuOpen(false);
    setDismissed(true);
  }

  // ── Setup incomplete → polished onboarding card (persists until done) ──────
  // Shows from first sign-in (empty watchlist), then renders nothing once a
  // stock is followed or it's dismissed. (Adding a portfolio is
  // handled by the MoneyHeroGhost hero, so it isn't a step here.)
  if (!hasWatchlist && !dismissed) {
    const steps = [
      {
        key: "watchlist",
        done: hasWatchlist,
        icon: ICON_WATCHLIST,
        title: "Build your watchlist",
        desc: "Follow any stock's price, score & news — every day.",
        descBn: "পছন্দের শেয়ার যোগ করুন — দাম, স্কোর ও খবর প্রতিদিন এক জায়গায়।",
        href: "/watchlist" as string | undefined,
        onClick: undefined as (() => void) | undefined,
        cta: "Add stocks",
      },
    ].sort((a, b) => Number(a.done) - Number(b.done)); // incomplete steps first
    const doneCount = steps.filter((s) => s.done).length;
    const remaining = steps.length - doneCount;
    const pct = (doneCount / steps.length) * 100;

    return (
      <Card padding="md" className="mt-4">
        {/* Header: gradient icon · copy · progress count */}
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 66%, var(--text)))",
              boxShadow: "0 8px 18px -8px color-mix(in srgb, var(--primary) 70%, transparent)",
            }}
            aria-hidden
          >
            {ICON_SETUP}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary">
              Finish setting up
            </p>
            <p className="text-sm font-bold leading-tight text-text-main">
              {doneCount === 0
                ? "One quick step to your daily check-in"
                : remaining === 1
                  ? "Almost there — one step to go"
                  : `${remaining} steps left to set up`}
            </p>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs font-bold tabular-nums text-text-muted">
              {doneCount}/{steps.length}
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Dismiss setup"
              aria-expanded={menuOpen}
              className="grid h-7 w-7 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-main"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-surface py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={skipForNow}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-text-main transition-colors hover:bg-surface-2"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={dontShowAgain}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-text-muted transition-colors hover:bg-surface-2"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--positive)))",
            }}
          />
        </div>

        {/* Bengali guidance for a newly joined user — same steps, everyday Bangla. */}
        <p
          lang="bn"
          className="font-bn mt-3 text-xs font-semibold leading-relaxed text-text-muted"
        >
          নতুন এসেছেন? নিচের ধাপটি শেষ করুন — তাহলে প্রতিদিন আপনার জন্য সাজানো শেয়ারের তথ্য, খবর ও পরামর্শ এক জায়গায় পাবেন।
        </p>

        {/* Steps */}
        <ul className="mt-4 flex flex-col gap-2.5">
          {steps.map((s) => {
            if (s.done) {
              return (
                <li
                  key={s.key}
                  className="flex items-center gap-3 rounded-xl border px-3 py-3"
                  style={{
                    borderColor: "color-mix(in srgb, var(--positive) 28%, var(--border))",
                    background: "color-mix(in srgb, var(--positive) 7%, var(--surface))",
                  }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
                    style={{ background: "var(--positive)" }}
                    aria-hidden
                  >
                    {ICON_CHECK}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-text-muted line-through">
                      {s.title}
                    </span>
                    <span className="block text-xs font-bold text-positive">Done ✓</span>
                  </span>
                </li>
              );
            }

            const rowClass =
              "group flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left transition-all hover:border-primary hover:shadow-md";
            const body = (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-primary"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 22%, var(--border))",
                  }}
                  aria-hidden
                >
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-text-main">{s.title}</span>
                  <span className="block text-xs leading-snug text-text-muted">{s.desc}</span>
                  <span
                    lang="bn"
                    className="font-bn mt-0.5 block text-xs font-semibold leading-snug text-text-muted"
                  >
                    {s.descBn}
                  </span>
                </span>
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-transform group-hover:translate-x-0.5"
                  style={{ background: "var(--primary)" }}
                >
                  {s.cta}
                </span>
              </>
            );

            return (
              <li key={s.key}>
                {s.href ? (
                  <Link href={s.href} className={rowClass}>
                    {body}
                  </Link>
                ) : (
                  <button type="button" onClick={s.onClick} className={rowClass}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    );
  }

  // Setup complete (or dismissed) → nothing here; keeps the header clean.
  return null;
}
