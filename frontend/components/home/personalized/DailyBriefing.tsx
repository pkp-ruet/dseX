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
const ICON_PORTFOLIO = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);
const ICON_CHECK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);
const ICON_TUNE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  </svg>
);

interface Props {
  todayMove: { delta: number; pct: number } | null;
  alertCount: number;
  newsCount: number;
  hasPortfolio: boolean;
  hasWatchlist: boolean;
  /** True once the user has taken the personalize-picks quiz. */
  hasTuned?: boolean;
  /** Opens the "personalize your picks" quiz (onboarding step 3). */
  onPersonalize?: () => void;
  /** Biggest watchlist mover today — rendered as a deep-linked chip (mirrors the push digest). */
  topMover?: { code: string; changePct: number } | null;
}

function fmtTk(n: number): string {
  return `৳${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

/**
 * One-glance daily hook under the greeting. When the user has data we show a
 * "Daily Check-In" pill row (streak · portfolio today · alerts · new news).
 * A brand-new account (no portfolio AND no watchlist) instead sees a "Get
 * started" checklist so the habit loop is reinforced from day one.
 */
export default function DailyBriefing({
  todayMove,
  alertCount,
  newsCount,
  hasPortfolio,
  hasWatchlist,
  hasTuned = false,
  onPersonalize,
  topMover,
}: Props) {
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

  // ── Setup incomplete → polished 3-step onboarding card (persists until done) ─
  // While the watchlist is still empty, <FirstRunSetup/> owns the on-ramp (it has
  // the inline search-to-add), so we hold this checklist back to avoid showing two
  // "set up your watchlist" cards at once. Once the first stock is added it takes
  // over to nudge the remaining steps (portfolio + personalize).
  if (hasWatchlist && (!hasPortfolio || !hasTuned) && !dismissed) {
    const steps = [
      {
        key: "watchlist",
        done: hasWatchlist,
        icon: ICON_WATCHLIST,
        title: "Build your watchlist",
        desc: "Follow any stock's price, score & news — every day.",
        href: "/watchlist" as string | undefined,
        onClick: undefined as (() => void) | undefined,
        cta: "Add stocks",
      },
      {
        key: "portfolio",
        done: hasPortfolio,
        icon: ICON_PORTFOLIO,
        title: "Track your portfolio",
        desc: "Add what you own → see live profit/loss and a quick health check.",
        href: "/portfolio" as string | undefined,
        onClick: undefined as (() => void) | undefined,
        cta: "Add holdings",
      },
      {
        key: "personalize",
        done: hasTuned,
        icon: ICON_TUNE,
        title: "Personalize your picks",
        desc: "Answer a few quick questions → daily picks matched to you.",
        href: onPersonalize ? undefined : "/stock-recommendation",
        onClick: onPersonalize,
        cta: "Personalize",
      },
    ].sort((a, b) => Number(a.done) - Number(b.done)); // incomplete steps first
    const doneCount = steps.filter((s) => s.done).length;
    const remaining = steps.length - doneCount;
    const pct = (doneCount / steps.length) * 100;

    return (
      <Card padding="none" className="mt-3 p-4 sm:p-5">
        {/* Header: gradient icon · copy · progress count */}
        <div className="flex items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 66%, #000))",
              boxShadow: "0 8px 18px -8px color-mix(in srgb, var(--primary) 70%, transparent)",
            }}
            aria-hidden
          >
            {ICON_SETUP}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">
              Finish setting up
            </p>
            <p className="text-sm font-bold leading-tight text-[var(--text)]">
              {doneCount === 0
                ? "Three quick steps to your daily check-in"
                : remaining === 1
                  ? "Almost there — one step to go"
                  : `${remaining} steps left to set up`}
            </p>
          </div>
          <div className="relative flex shrink-0 items-center gap-1">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-[0.7rem] font-bold tabular-nums text-[var(--text-muted)]">
              {doneCount}/{steps.length}
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Dismiss setup"
              aria-expanded={menuOpen}
              className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text)]"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={skipForNow}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={dontShowAgain}
                    className="block w-full px-3 py-2 text-left text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-2)]"
                  >
                    Don&apos;t show again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              background:
                "linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 55%, var(--positive)))",
            }}
          />
        </div>

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
                    <span className="block text-sm font-semibold text-[var(--text-muted)] line-through">
                      {s.title}
                    </span>
                    <span className="block text-xs font-bold text-[var(--positive)]">Done ✓</span>
                  </span>
                </li>
              );
            }

            const rowClass =
              "group flex w-full items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md";
            const body = (
              <>
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[var(--primary)]"
                  style={{
                    background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--primary) 22%, var(--border))",
                  }}
                  aria-hidden
                >
                  {s.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-[var(--text)]">{s.title}</span>
                  <span className="block text-xs leading-snug text-[var(--text-muted)]">{s.desc}</span>
                </span>
                <span
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[0.72rem] font-bold text-white transition-transform group-hover:translate-x-0.5"
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

  // ── Has data → glanceable check-in chips ──────────────────────────────────
  const up = (todayMove?.delta ?? 0) >= 0;

  const chips: React.ReactNode[] = [];

  if (topMover && topMover.changePct != null) {
    const moverUp = topMover.changePct >= 0;
    chips.push(
      <Link
        key="mover"
        href={`/stock/${topMover.code}`}
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-bold tabular-nums transition hover:brightness-95"
        style={{
          color: moverUp ? "var(--positive)" : "var(--negative)",
          borderColor: `color-mix(in srgb, ${moverUp ? "var(--positive)" : "var(--negative)"} 30%, var(--border))`,
          background: `color-mix(in srgb, ${moverUp ? "var(--positive)" : "var(--negative)"} 8%, var(--surface))`,
        }}
      >
        <span className="text-[var(--text)]">{topMover.code}</span>
        {moverUp ? "+" : ""}
        {topMover.changePct.toFixed(1)}%
      </Link>,
    );
  }

  if (todayMove) {
    chips.push(
      <span
        key="pf"
        className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[0.8rem] font-bold tabular-nums nums"
        style={{
          color: up ? "var(--positive)" : "var(--negative)",
          borderColor: `color-mix(in srgb, ${up ? "var(--positive)" : "var(--negative)"} 30%, var(--border))`,
          background: `color-mix(in srgb, ${up ? "var(--positive)" : "var(--negative)"} 8%, var(--surface))`,
        }}
      >
        Portfolio {up ? "+" : "−"}
        {fmtTk(todayMove.delta)} today
      </span>,
    );
  }

  if (alertCount > 0) {
    chips.push(
      <span
        key="alerts"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.8rem] font-bold text-[var(--text)]"
      >
        <span aria-hidden>⚡</span>
        {alertCount} {alertCount === 1 ? "alert" : "alerts"}
      </span>,
    );
  }

  if (newsCount > 0) {
    chips.push(
      <span
        key="news"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-[0.8rem] font-bold text-[var(--text)]"
      >
        <span aria-hidden>📰</span>
        {newsCount} news
      </span>,
    );
  }

  if (chips.length === 0) return null;

  return <div className="mt-3 flex flex-wrap items-center gap-2">{chips}</div>;
}
