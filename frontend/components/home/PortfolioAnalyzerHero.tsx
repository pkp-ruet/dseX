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
  subScores: { spread: 9.2, quality: 8.5, entry: 8.0 },
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
        if (!cancelled) setPortfolioStatus("empty");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isLoggedIn]);

  if (authLoading) return null;
  if (isLoggedIn && portfolioStatus === "loading") return null;
  if (isLoggedIn && portfolioStatus === "has-holdings") return null;

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
      className="relative overflow-hidden mt-8 mb-4 rounded-2xl border border-[var(--primary)]/30 bg-gradient-to-br from-[var(--primary)]/10 via-[var(--accent)]/5 to-transparent"
    >
      {/* Decorative glow blobs */}
      <div
        className="pointer-events-none absolute -top-32 -right-24 w-80 h-80 rounded-full opacity-30 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 w-72 h-72 rounded-full opacity-20 blur-3xl"
        style={{
          background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 p-5 sm:p-7 lg:p-8">
        {/* Left: pitch + CTAs */}
        <div className="flex flex-col justify-center">
          {/* Eyebrow with icon badge */}
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-[var(--primary)]/40 bg-[var(--primary)]/15 text-[var(--primary)] shadow-[0_0_20px_-6px_rgba(14,165,233,0.6)]">
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M3 3v18h18" />
                <path d="M7 14l4-4 4 4 5-6" />
              </svg>
            </span>
            <p className="text-[11px] sm:text-xs uppercase tracking-[0.18em] font-bold text-[var(--primary)]">
              Portfolio Analyzer
            </p>
          </div>

          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text)] leading-tight mb-3">
            {headline}
          </h2>
          <p className="text-sm sm:text-[15px] text-[var(--ink-2)] leading-relaxed mb-5">
            {subCopy}
          </p>

          <ul className="flex flex-col gap-2.5 mb-6">
            <FeatureRow>See if too much of your money is in one stock or sector</FeatureRow>
            <FeatureRow>Know if you paid a fair price for every holding</FeatureRow>
            <FeatureRow>Get a clear grade and easy-language action steps</FeatureRow>
          </ul>

          <div className="flex flex-wrap gap-2.5">
            <Link
              href={primaryCta.href}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm sm:text-[15px] font-bold bg-[var(--primary)] text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_24px_-6px_rgba(14,165,233,0.6)]"
            >
              {primaryCta.label}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
              </svg>
            </Link>
            <Link
              href="/sample-portfolio/diversified"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm sm:text-[15px] font-bold border border-[var(--primary)]/30 bg-[var(--primary)]/5 text-[var(--text)] hover:bg-[var(--primary)]/10 transition-colors"
            >
              See sample analysis
            </Link>
          </div>
        </div>

        {/* Right: mini sample report */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent p-4 sm:p-5 shadow-2xl">
            {/* Verdict header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-xl border-2 bg-green-500/20 text-green-400 border-green-500/50 shrink-0 shadow-[0_0_24px_-8px_rgba(34,197,94,0.6)]">
                <span className="text-3xl font-black leading-none">{MOCKUP.grade}</span>
                <span className="text-[9px] uppercase tracking-wider mt-1 font-bold">
                  {MOCKUP.gradeLabel}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.16em] text-green-400 mb-1 font-bold">
                  Sample · Verdict
                </p>
                <p className="text-xs sm:text-[13px] text-[var(--text)] leading-relaxed font-medium">
                  {MOCKUP.headline}
                </p>
              </div>
            </div>

            {/* Mini sub-scores */}
            <div className="grid grid-cols-3 gap-2 mb-4 pt-3 border-t border-green-500/20">
              <MiniScore label="Spread" value={MOCKUP.subScores.spread} />
              <MiniScore label="Quality" value={MOCKUP.subScores.quality} />
              <MiniScore label="Entry" value={MOCKUP.subScores.entry} />
            </div>

            {/* Working well */}
            <div className="rounded-xl border border-green-500/30 bg-green-500/[0.07] p-3 mb-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-green-500/15 border border-green-500/30 text-green-400">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </span>
                <p className="text-[10px] uppercase tracking-wider font-bold text-green-400">
                  Working Well
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs sm:text-[13px] text-[var(--text)]">
                {MOCKUP.good.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-green-400 shrink-0 mt-0.5" aria-hidden>
                      •
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Consider */}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-400">
                  <svg
                    className="w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M9 18h6M10 22h4" />
                    <path d="M15.09 14A6.5 6.5 0 1012 2a6.5 6.5 0 00-3.09 12c.34.36.59.78.74 1.24l.04.13c.16.5.6.86 1.12.86h2.38c.52 0 .96-.36 1.12-.86l.04-.13c.15-.46.4-.88.74-1.24z" />
                  </svg>
                </span>
                <p className="text-[10px] uppercase tracking-wider font-bold text-amber-400">
                  To Consider
                </p>
              </div>
              <ul className="flex flex-col gap-1.5 text-xs sm:text-[13px] text-[var(--text)]">
                {MOCKUP.consider.map((b, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-amber-400 shrink-0 mt-0.5" aria-hidden>
                      •
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-[10px] sm:text-[11px] text-[var(--text-muted)] text-center mt-3 leading-relaxed">
              Sample preview · the full report covers sectors, holdings, and entry prices.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm sm:text-[15px] text-[var(--text)] leading-relaxed">
      <span
        className="flex items-center justify-center w-5 h-5 rounded-md bg-green-500/15 border border-green-500/30 text-green-400 shrink-0 mt-0.5"
        aria-hidden
      >
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}

function MiniScore({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-bold text-[var(--text)]">
          {label}
        </span>
        <span className="text-xs sm:text-sm font-black text-green-400 tabular-nums">
          {value.toFixed(1)}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-[var(--border)]/50 overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
