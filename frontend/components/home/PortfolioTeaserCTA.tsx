"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function PortfolioTeaserCTA() {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return <div className="h-[90px] rounded-[14px] bg-[var(--surface)] animate-pulse mt-8 mb-4" />;
  }

  const headline = isLoggedIn
    ? "Create your portfolio for free"
    : "Sign up and create a portfolio for free";

  const subCopy = isLoggedIn
    ? "Track your DSE holdings, cost basis, and live P&L in one place."
    : "Track your DSE holdings, see live P&L, and get personalised signals.";

  return (
    <section
      className="relative overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--surface)] mt-8 mb-4"
      aria-label="Portfolio feature"
    >
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
      />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
        <div className="flex items-start gap-3">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="shrink-0 mt-0.5 text-[var(--primary)]"
            aria-hidden="true"
          >
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z" />
          </svg>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--primary)] mb-1">
              Portfolio
            </p>
            <p className="text-sm font-semibold text-[var(--ink)] leading-snug">{headline}</p>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{subCopy}</p>
          </div>
        </div>
        <Link
          href="/portfolio"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shrink-0 self-start sm:self-auto"
        >
          Go to Portfolio
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
          </svg>
        </Link>
      </div>
    </section>
  );
}
