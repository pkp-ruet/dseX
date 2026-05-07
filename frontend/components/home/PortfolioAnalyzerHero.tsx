"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { apiGetPortfolio } from "@/lib/api";

// Static mockup content for the visual sample card. Intentionally hardcoded — this is
// a marketing element that should always read the same. The live, computed version
// lives at /sample-portfolio/diversified.
const MOCKUP = {
  grade: "A",
  gradeLabel: "Excellent",
  headline: "Your portfolio is well-built — good spread, strong companies, fair entry prices.",
  good: [
    "You own 7 stocks across 6 sectors — a healthy spread.",
    "Most companies you own are strong picks.",
  ],
  consider: ["Keep an eye on quarterly results for each stock you hold."],
};

type PortfolioStatus = "loading" | "empty" | "has-holdings";

export default function PortfolioAnalyzerHero() {
  const { isLoading: authLoading, isLoggedIn } = useAuth();
  const [portfolioStatus, setPortfolioStatus] = useState<PortfolioStatus>("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      setPortfolioStatus("empty");
      return;
    }
    let cancelled = false;
    apiGetPortfolio()
      .then((p) => {
        if (cancelled) return;
        setPortfolioStatus(p.holdings.length > 0 ? "has-holdings" : "empty");
      })
      .catch(() => {
        // On error, default to showing the hero rather than hiding it
        if (!cancelled) setPortfolioStatus("empty");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn]);

  // Don't render anything until we know what to show — avoids flashing the wrong CTAs.
  if (authLoading) return null;
  if (isLoggedIn && portfolioStatus === "loading") return null;

  // Logged-in user with existing holdings already knows the feature exists.
  if (isLoggedIn && portfolioStatus === "has-holdings") return null;

  // Choose copy + CTA based on auth state
  const isEmptyLoggedIn = isLoggedIn && portfolioStatus === "empty";

  const headline = isEmptyLoggedIn
    ? "Build your portfolio and see your grade in 60 seconds."
    : "Is your DSE portfolio well-built — or risky?";

  const subCopy = isEmptyLoggedIn
    ? "Add your stocks and get a free, easy-to-read report — how spread out they are, how strong the companies are, and whether you paid fair prices."
    : "A free, easy-to-read report on your stocks — how spread out they are, how strong the companies are, and whether you paid fair prices. Done in 60 seconds.";

  const primaryCta = isEmptyLoggedIn
    ? { href: "/portfolio", label: "Create your first portfolio" }
    : { href: "/register", label: "Sign up free" };

  return (
    <section
      aria-label="Portfolio analyzer feature"
      className="mt-8 mb-4 rounded-[14px] border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
    >
      <div
        className="h-1 w-full"
        style={{ background: "linear-gradient(90deg, var(--primary), var(--accent))" }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 sm:p-6">
        {/* Left: pitch + CTAs */}
        <div className="flex flex-col justify-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-[var(--primary)] mb-2">
            // PORTFOLIO ANALYZER
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-[var(--text)] leading-snug mb-2">
            {headline}
          </h2>
          <p className="text-sm text-[var(--text-muted)] leading-relaxed mb-4">{subCopy}</p>

          <ul className="flex flex-col gap-1.5 mb-5 text-sm text-[var(--text)]">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 shrink-0" aria-hidden>
                ✓
              </span>
              <span>See if too much of your money is in one stock or sector</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5 shrink-0" aria-hidden>
                ✓
              </span>
              <span>Know if you paid a fair price for every holding</span>
            </li>
          </ul>

          <div className="flex flex-wrap gap-2">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold bg-[var(--primary)] text-white hover:opacity-90 transition-opacity"
            >
              {primaryCta.label}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </Link>
            <Link
              href="/sample-portfolio/diversified"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[var(--border)] text-[var(--text)] hover:bg-[var(--border)]/30 transition-colors"
            >
              See sample analysis
            </Link>
          </div>
        </div>

        {/* Right: visual mockup of the report */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--bg,#0c1117)] p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center justify-center min-w-[56px] h-[56px] rounded-xl border-2 bg-green-500/15 text-green-500 border-green-500/40 shrink-0">
                <span className="text-2xl font-bold leading-none">{MOCKUP.grade}</span>
                <span className="text-[9px] uppercase tracking-wider mt-0.5 font-semibold">
                  {MOCKUP.gradeLabel}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] mb-1 font-semibold">
                  Sample · Portfolio Verdict
                </p>
                <p className="text-xs text-[var(--text)] leading-relaxed italic">
                  &ldquo;{MOCKUP.headline}&rdquo;
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 mb-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-green-500 mb-1.5">
                What&apos;s Working Well
              </p>
              <ul className="flex flex-col gap-1 text-xs text-[var(--text)]">
                {MOCKUP.good.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-green-500 shrink-0" aria-hidden>
                      •
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-500 mb-1.5">
                What To Consider
              </p>
              <ul className="flex flex-col gap-1 text-xs text-[var(--text)]">
                {MOCKUP.consider.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 shrink-0" aria-hidden>
                      •
                    </span>
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] text-[var(--text-muted)] text-center mt-3">
              Sample preview · the full report covers your sectors, holdings, and entry prices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
