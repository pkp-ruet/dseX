"use client";

import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

export default function PortfolioTeaserCTA() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-[160px] rounded-2xl bg-[var(--surface)] animate-pulse mt-8 mb-4" />
    );
  }

  const headline = isLoggedIn
    ? "Create your portfolio for free"
    : "Sign up and create a portfolio for free";

  const subCopy = isLoggedIn
    ? "Track your DSE holdings, cost basis, and live P&L in one place."
    : "Track your DSE holdings, see live P&L, and get personalised signals.";

  const ctaLabel = isLoggedIn ? "Go to Portfolio" : "Get Started";
  const ctaHref = isLoggedIn ? "/portfolio" : "/register";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--accent)]/5 to-transparent mt-8 mb-4"
      aria-label="Portfolio feature"
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 w-56 h-56 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-5 sm:p-7">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          {/* Icon badge */}
          <span
            className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)] shrink-0 shadow-[0_0_30px_-8px_rgba(14,165,233,0.6)]"
            aria-hidden
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 4 4 5-6" />
              <circle cx="7" cy="14" r="1.2" fill="currentColor" />
              <circle cx="11" cy="10" r="1.2" fill="currentColor" />
              <circle cx="15" cy="14" r="1.2" fill="currentColor" />
              <circle cx="20" cy="8" r="1.2" fill="currentColor" />
            </svg>
          </span>

          <div className="min-w-0">
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] font-bold text-[var(--primary)] mb-1.5">
              Portfolio Tracker
            </p>
            <p className="text-base sm:text-lg font-bold text-[var(--text)] leading-snug">
              {headline}
            </p>
            <p className="text-sm sm:text-[15px] text-[var(--ink-2)] mt-1.5 leading-relaxed">
              {subCopy}
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <FeaturePill>Live P&L</FeaturePill>
              <FeaturePill>Sector Spread</FeaturePill>
              <FeaturePill>Quality Grade</FeaturePill>
            </div>
          </div>
        </div>

        <Button
          href={ctaHref}
          variant="primary"
          className="shrink-0 self-start sm:self-auto"
        >
          {ctaLabel}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden
          >
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Button>
      </div>
    </section>
  );
}

function FeaturePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/25">
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
      {children}
    </span>
  );
}
