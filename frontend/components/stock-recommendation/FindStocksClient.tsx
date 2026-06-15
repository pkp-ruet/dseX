"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getStockRecommendations,
  type RecommendationAnswers,
  type RecommendationResponse,
} from "@/lib/api";
import RecommendationQuiz from "./RecommendationQuiz";
import RecommendedStockCard from "./RecommendedStockCard";
import DailyFeed from "./DailyFeed";
import Button from "@/components/ui/Button";

const RELAX_LABEL: Record<string, string> = {
  budget: "price range",
  dividend: "dividend preference",
  sector: "sector choice",
  risk: "risk comfort",
};

/** Logged-out experience: take the quiz once, see matched picks, prompted to
 *  sign in so the picks become a daily, self-updating feed. */
function GuestQuiz({ sectors }: { sectors: string[] }) {
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(answers: RecommendationAnswers) {
    setLoading(true);
    setError(null);
    try {
      setResult(await getStockRecommendations(answers));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-10 flex flex-col items-center text-center">
        <div className="relative w-20 h-20">
          <span className="absolute inset-0 rounded-full border-4 border-[var(--surface-2)]" />
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl rec-pop">🔍</span>
        </div>
        <p className="mt-5 text-lg font-extrabold text-[var(--text)]">Matching you with stocks…</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Scanning the market against your answers.</p>
      </div>
    );
  }

  if (result) {
    const relax = result.relaxations.filter((r) => RELAX_LABEL[r]);
    return (
      <div className="space-y-4">
        <div className="rec-pop text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.66rem] font-bold uppercase tracking-[0.08em] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            🎯 Matched to your answers
          </span>
          <h2 className="mt-2.5 text-[1.5rem] font-extrabold leading-tight bg-gradient-to-r from-[var(--primary)] to-[var(--positive)] bg-clip-text text-transparent">
            Your stock matches
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Each one comes with a clear reason. Always do your own research before investing.
          </p>
        </div>

        {relax.length > 0 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[0.8rem] text-[var(--text-muted)]">
            We widened your {relax.map((r) => RELAX_LABEL[r]).join(" and ")} to find good matches.
          </div>
        )}

        <div className="space-y-3">
          {result.picks.map((p, i) => (
            <RecommendedStockCard key={p.trading_code} stock={p} rank={i} />
          ))}
        </div>

        <div className="rounded-xl border border-[var(--primary)]/30 bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface))] px-4 py-4 text-center">
          <p className="text-sm font-semibold text-[var(--text)]">
            Sign in to make this a daily habit
          </p>
          <p className="mt-1 text-[0.8rem] text-[var(--text-muted)]">
            Get fresh picks every day, tuned to your taste — plus save and track these stocks.
          </p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <Link
              href="/register"
              className="inline-flex items-center min-h-[42px] px-5 rounded-lg text-sm font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              Create free account
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center min-h-[42px] px-5 rounded-lg text-sm font-semibold text-[var(--primary)] border border-[var(--border)]"
            >
              Sign in
            </Link>
          </div>
        </div>

        <div className="text-center pt-1">
          <Button type="button" variant="ghost" onClick={() => setResult(null)} className="min-h-[44px] px-6">
            Start over
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RecommendationQuiz sectors={sectors} onSubmit={submit} submitting={loading} />
      {error && <p className="text-sm text-[var(--negative)]">{error}</p>}
    </div>
  );
}

export default function FindStocksClient({ sectors }: { sectors: string[] }) {
  const { isLoggedIn, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <span className="w-8 h-8 rounded-full border-[3px] border-[var(--surface-2)] border-t-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return isLoggedIn ? <DailyFeed sectors={sectors} /> : <GuestQuiz sectors={sectors} />;
}
