import type { ReactNode } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";

const BAG_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M20 7h-4V5l-2-2h-4L8 5v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zm-8-2h4v2h-4V5z" />
  </svg>
);

/**
 * First-run preview of the money dashboard for users who haven't added holdings
 * yet: a blurred, non-interactive mock of MoneyHero (so they *see* the payoff)
 * with a glass "Add your holdings" call-to-action floated on top. Replaces the
 * plain SetupCard so the empty state sells the feature instead of describing it.
 */
export default function MoneyHeroGhost({ greeting }: { greeting?: ReactNode }) {
  return (
    <Card as="section" padding="none" className="overflow-hidden">
      {greeting && (
        <div className="border-b border-[var(--border)] px-4 pb-3 pt-4 sm:px-5">{greeting}</div>
      )}
      <div className="relative">
      {/* Ghost content — sample numbers, blurred + inert */}
      <div className="pointer-events-none select-none blur-[3px] opacity-45" aria-hidden>
        <div className="px-4 sm:px-5 pt-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
                Your money today
              </p>
              <div className="mt-1 text-[clamp(1.6rem,7vw,2rem)] font-extrabold tabular-nums nums text-[var(--text)] leading-tight">
                ৳2,45,000
              </div>
              <div className="mt-0.5 text-[0.85rem] sm:text-sm font-bold tabular-nums nums" style={{ color: "var(--positive)" }}>
                ▲ +৳3,200 (+1.32%) today
              </div>
              <p className="mt-1 text-[0.68rem] font-medium text-[var(--text-muted)]">Updating live through the day</p>
            </div>
            <div
              className="flex h-16 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-2"
              style={{ color: "var(--positive)", borderColor: "var(--positive)", background: "var(--surface-2)" }}
            >
              <span className="text-[1.65rem] font-black leading-none">A</span>
              <span className="text-[0.68rem] font-bold uppercase tracking-wide leading-none">Excellent</span>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold" style={{ color: "var(--positive)", background: "color-mix(in srgb, var(--positive) 12%, transparent)" }}>
              ▲ Beating DSEX by +0.74%
            </span>
            <span className="rounded-full px-2.5 py-1 text-[0.68rem] font-bold" style={{ color: "var(--positive)", background: "var(--surface-2)" }}>
              Total +৳18,400 (+8.1%)
            </span>
          </div>
          <p className="mt-3 text-[0.8rem] leading-relaxed text-[var(--text-muted)]">
            Your portfolio is well-built — money spread across strong companies bought at fair prices.
          </p>
        </div>
        <div className="h-11 border-t border-[var(--border)]" />
      </div>

      {/* Glass CTA overlay */}
      <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--surface)_58%,transparent)] px-5 text-center">
        <div className="max-w-xs">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-2)] text-[var(--primary)]">
            {BAG_ICON}
          </div>
          <h3 className="mt-3 text-lg font-extrabold leading-tight text-[var(--text)]">See your money here</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">
            Add the stocks you own to track live profit &amp; loss and get your portfolio graded A–F.
          </p>
          <Link
            href="/portfolio"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"
            style={{ background: "var(--primary)" }}
          >
            Add your holdings
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
      </div>
    </Card>
  );
}
