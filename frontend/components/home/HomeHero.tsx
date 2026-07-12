"use client";

import { useAuth } from "@/context/AuthContext";
import { type ScoreItem } from "@/lib/api";
import SignupCtas from "@/components/home/SignupCtas";
import SearchBar from "@/components/home/SearchBar";
import Button from "@/components/ui/Button";
import HeroGradeReveal, { type HeroStock } from "@/components/home/HeroGradeReveal";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";

export default function HomeHero({
  topItems,
  heroStocks,
}: {
  topItems: ScoreItem[];
  heroStocks: HeroStock[];
}) {
  const { isLoggedIn, user } = useAuth();
  const companies = topItems.map((s) => ({
    trading_code: s.trading_code,
    company_name: s.company_name,
  }));
  const statCount = Math.max(50, Math.floor(topItems.length / 50) * 50);

  return (
    <section className="relative pt-8 sm:pt-14 pb-2">
      {/* Soft ambient glow behind the hero */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-16 -z-10 h-[460px]"
        style={{ background: "var(--ambient)" }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-center">
        {/* Left: pitch + CTA (rendered instantly, no reveal — protects LCP) */}
        <div className="flex flex-col">
          {!isLoggedIn && (
            <span
              className="inline-flex self-start items-center gap-2.5 rounded-full px-4 py-1.5 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] shadow-sm"
              style={{
                background:
                  "linear-gradient(var(--surface), var(--surface)) padding-box, linear-gradient(100deg, var(--primary), var(--positive)) border-box",
                border: "1.5px solid transparent",
              }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--positive)] opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--positive)]" />
              </span>
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--positive))" }}
              >
                Know before you buy
              </span>
            </span>
          )}

          <h1 className="font-display mt-5 font-bold tracking-tight text-[var(--text)] leading-[1.06] text-[clamp(2rem,7vw,3.25rem)]">
            Make smarter{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(100deg, var(--primary), var(--np-cautious))" }}
            >
              DSE decisions.
            </span>
          </h1>

          <p lang="bn" className="font-bn mt-3 text-[1.25rem] sm:text-[1.4rem] font-semibold text-[var(--text)]">
            কোন শেয়ার ভালো, কোনটা নয় — <span className="text-[var(--positive)]">এক নজরে বুঝে নিন।</span>
          </p>

          {isLoggedIn ? (
            <div className="mt-7 flex flex-col gap-3">
              <p className="text-sm text-[var(--text-muted)]">
                Welcome back{user?.display_name ? `, ${user.display_name}` : ""} 👋
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button href="/watchlist" variant="primary">
                  My Watchlist
                </Button>
                <Button href="/portfolio" variant="ghost">
                  My Portfolio
                </Button>
                <Button href="/dsestockranking" variant="ghost">
                  Rankings
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Try-it search — explore instantly, before any signup */}
              <div className="mt-6">
                <p className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--primary-ink)]">
                  See any stock&apos;s score — free
                </p>
                <SearchBar companies={companies} variant="sidebar" />
              </div>

              <div className="mt-5">
                <SignupCtas />
              </div>

              {/* Trust / scale proof */}
              <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.72rem] text-[var(--text-muted)]">
                <span>
                  <span className="font-bold text-[var(--text)]">{statCount}+</span> companies scored
                </span>
                <span className="opacity-50">·</span>
                <span>Updated every trading day</span>
                <span className="opacity-50">·</span>
                <span>100% free</span>
              </div>
            </>
          )}
        </div>

        {/* Right (below on mobile): the live grade-reveal demo */}
        <div className="w-full">
          {heroStocks.length > 0 ? (
            <HeroGradeReveal stocks={heroStocks} />
          ) : (
            <LiveRankingPreview items={topItems} totalCount={topItems.length} />
          )}
        </div>
      </div>
    </section>
  );
}
