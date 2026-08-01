"use client";

import { useEffect, useRef, useState } from "react";
import Bn from "@/components/i18n/Bn";
import HeroMiniQuiz from "@/components/home/HeroMiniQuiz";
import HeroQuizResult, { HeroQuizLoading } from "@/components/home/HeroQuizResult";
import {
  getStockRecommendations,
  type RecommendationAnswers,
  type RecommendedStock,
} from "@/lib/api";

/**
 * The three-question picker, moved out of the hero and into block 6 where it
 * belongs. In the hero it asked a visitor to commit before the site had proved
 * anything; here they have already seen the method and today's data, so the ask
 * is reasonable.
 */
export default function FindMyStocks() {
  const [result, setResult] = useState<{
    picks: RecommendedStock[];
    summary: string[];
    relaxations: string[];
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Bumped on reset so the quiz remounts at question 1 — "start over" lives in
  // the result panel, which can't reach the quiz's own step state.
  const [quizKey, setQuizKey] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // On mobile the result stacks below the quiz, so bring it into view.
  useEffect(() => {
    if (!busy && !result) return;
    if (window.innerWidth >= 768) return;
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [busy, result]);

  async function run(answers: RecommendationAnswers, summary: string[]) {
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

  function reset() {
    setResult(null);
    setError("");
    setQuizKey((k) => k + 1);
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
      <div>
        <HeroMiniQuiz
          key={quizKey}
          onComplete={run}
          onRestart={reset}
          busy={busy}
          done={result != null}
        />
        {error && (
          <p className="mt-2 text-[0.8rem] font-semibold text-[var(--negative)]">{error}</p>
        )}
      </div>

      <div ref={panelRef} className="scroll-mt-24">
        {busy ? (
          <HeroQuizLoading />
        ) : result ? (
          <HeroQuizResult
            picks={result.picks}
            summary={result.summary}
            relaxations={result.relaxations}
            onRestart={reset}
          />
        ) : (
          <div className="soft-card flex h-full flex-col justify-center p-5">
            <span className="text-[0.7rem] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              Answer three questions
            </span>
            <p className="mt-3 text-[0.88rem] leading-relaxed text-[var(--text-muted)]">
              How much you want to put in, for how long, and how much risk you can take —
              from those three we show which companies match.
            </p>
            <Bn className="mt-2 text-[0.88rem] leading-relaxed text-[var(--text)]">
              কত টাকা রাখতে চান, কত দিনের জন্য, আর কতটা ঝুঁকি নিতে পারবেন — এই তিনটে জেনে মিলিয়ে
              দেখাব।
            </Bn>
          </div>
        )}
      </div>
    </div>
  );
}
