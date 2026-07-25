"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getStockRecommendations,
  type ScoreItem,
  type RecommendationAnswers,
  type RecommendedStock,
} from "@/lib/api";
import SignupCtas from "@/components/home/SignupCtas";
import SearchBar from "@/components/home/SearchBar";
import Button from "@/components/ui/Button";
import HeroGradeReveal, { type HeroStock } from "@/components/home/HeroGradeReveal";
import HeroMiniQuiz from "@/components/home/HeroMiniQuiz";
import HeroQuizResult, { HeroQuizLoading } from "@/components/home/HeroQuizResult";
import LiveRankingPreview from "@/components/home/LiveRankingPreview";

interface QuizResult {
  picks: RecommendedStock[];
  summary: string[];
  relaxations: string[];
}

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

  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Bumped on every reset so the quiz remounts at question 1 — "Start over"
  // lives in the result panel, which can't reach the quiz's own step state.
  const [quizKey, setQuizKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // On mobile the result panel stacks below the quiz, so bring it into view.
  // Fires twice by design — once for the loader, once when the picks land.
  useEffect(() => {
    if (!busy && !result) return;
    if (window.innerWidth >= 768) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [busy, result]);

  async function runQuiz(answers: RecommendationAnswers, summary: string[]) {
    setBusy(true);
    setError("");
    try {
      const res = await getStockRecommendations(answers);
      setResult({ picks: res.picks, summary, relaxations: res.relaxations });
    } catch {
      setError("Couldn't load your matches. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetQuiz() {
    setResult(null);
    setError("");
    setQuizKey((k) => k + 1);
  }

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
              {/* Primary entry point — three taps, no stock knowledge needed.
                  The search below is the shortcut for people who already know
                  the code they want. */}
              <div className="mt-6">
                <HeroMiniQuiz
                  key={quizKey}
                  onComplete={runQuiz}
                  onRestart={resetQuiz}
                  busy={busy}
                  done={result != null}
                />
              </div>

              {error && (
                <p className="mt-2 text-[0.8rem] font-semibold text-[var(--negative)]">{error}</p>
              )}

              <div className="mt-4">
                <p className="mb-1.5 text-[0.7rem] font-bold text-[var(--text-muted)]">
                  Already know a stock? Look up its score — free
                </p>
                <SearchBar companies={companies} variant="sidebar" />
              </div>

              {/* One signup ask at a time: once matches are on screen, the
                  result panel owns the ask. */}
              {result == null && (
                <div className="mt-5">
                  <SignupCtas />
                </div>
              )}

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

        {/* Right (below on mobile): the live grade-reveal demo — swapped for the
            visitor's own matches once the mini-quiz runs. */}
        <div ref={panelRef} className="w-full scroll-mt-24">
          {busy ? (
            <HeroQuizLoading />
          ) : result ? (
            <HeroQuizResult
              picks={result.picks}
              summary={result.summary}
              relaxations={result.relaxations}
              onRestart={resetQuiz}
            />
          ) : heroStocks.length > 0 ? (
            <HeroGradeReveal stocks={heroStocks} />
          ) : (
            <LiveRankingPreview items={topItems} totalCount={topItems.length} />
          )}
        </div>
      </div>
    </section>
  );
}
