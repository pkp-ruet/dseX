"use client";

import { useEffect, useState } from "react";
import {
  getStockRecommendations,
  apiGetLastRecommendation,
  apiDeleteLastRecommendation,
  type RecommendationAnswers,
  type RecommendationResponse,
} from "@/lib/api";
import { isLoggedIn } from "@/lib/auth";
import RecommendedStockCard from "./RecommendedStockCard";

type Answers = Partial<RecommendationAnswers> & { sectors: string[] };

interface Option {
  value: string;
  label: string;
  desc?: string;
}

interface SingleStep {
  key: "timeline" | "strategy" | "dividend" | "valuation" | "budget";
  kind: "single";
  title: string;
  subtitle: string;
  options: Option[];
}

interface SectorStep {
  key: "sectors";
  kind: "sectors";
  title: string;
  subtitle: string;
}

type Step = SingleStep | SectorStep;

const STEPS: Step[] = [
  {
    key: "timeline",
    kind: "single",
    title: "How long do you plan to hold?",
    subtitle: "This helps us balance stability against quick moves.",
    options: [
      { value: "long", label: "A year or more", desc: "Long-term investing" },
      { value: "short", label: "Weeks to a few months", desc: "Short-term trading" },
    ],
  },
  {
    key: "strategy",
    kind: "single",
    title: "What matters more to you?",
    subtitle: "Pick the approach that feels right.",
    options: [
      { value: "fundamental_strong", label: "Strong, stable companies", desc: "Good business, healthy finances" },
      { value: "market_trending", label: "Stocks moving right now", desc: "Recent price momentum" },
    ],
  },
  {
    key: "sectors",
    kind: "sectors",
    title: "Any sectors you prefer?",
    subtitle: "Choose as many as you like, or skip for no preference.",
  },
  {
    key: "dividend",
    kind: "single",
    title: "Do you want regular dividend income?",
    subtitle: "Some companies pay cash to shareholders every year.",
    options: [
      { value: "income_focused", label: "Yes, steady dividends matter", desc: "Prefer reliable payers" },
      { value: "doesnt_matter", label: "Not important to me", desc: "Focus on overall returns" },
    ],
  },
  {
    key: "valuation",
    kind: "single",
    title: "What's your style?",
    subtitle: "How you like to pick stocks.",
    options: [
      { value: "value", label: "Cheap, good-value stocks", desc: "Priced below their worth" },
      { value: "growth", label: "Fast-growing companies", desc: "Rising profits" },
      { value: "any", label: "No preference", desc: "Show me the best overall" },
    ],
  },
  {
    key: "budget",
    kind: "single",
    title: "Price range per share?",
    subtitle: "Pick what fits your budget.",
    options: [
      { value: "under_50", label: "Under ৳50", desc: "Lower-priced shares" },
      { value: "50_to_200", label: "৳50 – ৳200", desc: "Mid-priced shares" },
      { value: "any", label: "Any price", desc: "No limit" },
    ],
  },
];

const RELAX_LABEL: Record<string, string> = {
  budget: "price range",
  dividend: "dividend preference",
  sector: "sector choice",
};

export default function RecommendationQuiz({ sectors }: { sectors: string[] }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ sectors: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [fromSaved, setFromSaved] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // On mount, surface the user's previously generated picks (if any) instead of
  // forcing a fresh quiz. Logged-out users go straight to the quiz.
  useEffect(() => {
    let alive = true;
    if (!isLoggedIn()) {
      setInitializing(false);
      return;
    }
    apiGetLastRecommendation()
      .then((r) => {
        if (!alive) return;
        const rec = r.recommendation;
        if (rec && rec.picks?.length) {
          setResult({
            generated_at: rec.generated_at,
            answers_echo: (rec.answers ?? {}) as unknown as Record<string, unknown>,
            relaxations: rec.relaxations ?? [],
            saved: true,
            picks: rec.picks,
          });
          setFromSaved(true);
        }
      })
      .catch(() => {})
      .finally(() => alive && setInitializing(false));
    return () => {
      alive = false;
    };
  }, []);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const total = STEPS.length;

  const answered =
    current.kind === "sectors" ? true : Boolean(answers[current.key]);

  function pickSingle(key: SingleStep["key"], value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function toggleSector(s: string) {
    setAnswers((a) => {
      const has = a.sectors.includes(s);
      return { ...a, sectors: has ? a.sectors.filter((x) => x !== s) : [...a.sectors, s] };
    });
  }

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await getStockRecommendations(answers as RecommendationAnswers);
      setResult(res);
    } catch (e) {
      setError(
        e instanceof Error && e.message !== "AUTH_EXPIRED"
          ? "Something went wrong. Please try again."
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function restart() {
    // Start over wipes the saved picks from memory entirely.
    if (isLoggedIn()) apiDeleteLastRecommendation().catch(() => {});
    setResult(null);
    setFromSaved(false);
    setAnswers({ sectors: [] });
    setStep(0);
    setError(null);
  }

  // ---- Initial load (checking for saved picks) ----
  if (initializing) {
    return (
      <div className="py-10 flex justify-center">
        <span className="w-8 h-8 rounded-full border-[3px] border-[var(--surface-2)] border-t-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // ---- Analyzing view (while the request is in flight) ----
  if (loading && !result) {
    return (
      <div className="py-10 flex flex-col items-center text-center">
        <div className="relative w-20 h-20">
          <span className="absolute inset-0 rounded-full border-4 border-[var(--surface-2)]" />
          <span className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin" />
          <span className="absolute inset-0 flex items-center justify-center text-2xl rec-pop">🔍</span>
        </div>
        <p className="mt-5 text-lg font-extrabold text-[var(--text)]">Matching you with stocks…</p>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Scanning the market against your answers.
        </p>
        <div className="mt-4 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-[var(--primary)] animate-bounce"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    );
  }

  // ---- Results view ----
  if (result) {
    const relax = result.relaxations.filter((r) => RELAX_LABEL[r]);
    return (
      <div className="space-y-4">
        <div className="rec-pop text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[0.66rem] font-bold uppercase tracking-[0.08em] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]">
            {fromSaved ? "⭐ Your saved picks" : "🎯 Matched to your answers"}
          </span>
          <h2 className="mt-2.5 text-[1.5rem] font-extrabold leading-tight bg-gradient-to-r from-[var(--primary)] to-[var(--positive)] bg-clip-text text-transparent">
            {result.picks.length === 3
              ? "Your stock matches"
              : `We found ${result.picks.length} match${result.picks.length === 1 ? "" : "es"} for you`}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {fromSaved
              ? "From your last answers — start over any time to get fresh picks."
              : "Each one comes with a clear reason. Always do your own research before investing."}
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

        {result.saved && !fromSaved && (
          <p className="text-center text-[0.72rem] text-[var(--text-muted)]">
            ✓ Saved to your profile — find it on your home dashboard.
          </p>
        )}
        {!isLoggedIn() && (
          <p className="text-center text-[0.72rem] text-[var(--text-muted)]">
            Sign in to save your results and track these stocks.
          </p>
        )}

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={restart}
            className="min-h-[44px] px-6 rounded-xl border border-[var(--border)] font-semibold text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition"
          >
            {fromSaved ? "Start over →" : "Start over"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Quiz view ----
  return (
    <div className="space-y-5">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between text-[0.7rem] font-semibold text-[var(--text-muted)] mb-1.5">
          <span>
            Question {step + 1} of {total}
          </span>
          <span>{Math.round(((step + 1) / total) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div>
        <h2 className="text-lg font-extrabold text-[var(--text)] leading-snug">{current.title}</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{current.subtitle}</p>
      </div>

      {/* Options */}
      {current.kind === "single" ? (
        <div className="space-y-2.5">
          {current.options.map((opt) => {
            const selected = answers[current.key] === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pickSingle(current.key, opt.value)}
                className="group w-full text-left rounded-xl border px-4 py-3.5 min-h-[56px] flex items-center gap-3 transition hover:border-[var(--primary)] active:scale-[0.99]"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border)",
                  background: selected
                    ? "color-mix(in srgb, var(--primary) 8%, var(--surface))"
                    : "var(--surface)",
                  boxShadow: selected ? "0 2px 12px color-mix(in srgb, var(--primary) 18%, transparent)" : "none",
                }}
              >
                <span className="min-w-0 flex-1">
                  <span
                    className="block font-semibold text-[0.92rem]"
                    style={{ color: selected ? "var(--primary)" : "var(--text)" }}
                  >
                    {opt.label}
                  </span>
                  {opt.desc && (
                    <span className="block mt-0.5 text-[0.76rem] text-[var(--text-muted)]">{opt.desc}</span>
                  )}
                </span>
                <span
                  className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-full border-2 transition"
                  style={{
                    borderColor: selected ? "var(--primary)" : "var(--border)",
                    background: selected ? "var(--primary)" : "transparent",
                    color: "#fff",
                  }}
                >
                  {selected && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="rec-pop">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sectors.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No sectors available — you can skip this.</p>
          )}
          {sectors.map((s) => {
            const selected = answers.sectors.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSector(s)}
                className="rounded-full border px-3.5 py-2 text-[0.8rem] font-medium transition"
                style={{
                  borderColor: selected ? "var(--primary)" : "var(--border)",
                  background: selected
                    ? "color-mix(in srgb, var(--primary) 12%, var(--surface))"
                    : "var(--surface)",
                  color: selected ? "var(--primary)" : "var(--text)",
                }}
              >
                {s}
              </button>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-[var(--negative)]">{error}</p>}

      {/* Nav */}
      <div className="flex items-center gap-3 pt-1">
        {step > 0 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={loading}
            className="min-h-[48px] px-5 rounded-xl border border-[var(--border)] font-semibold text-sm text-[var(--text)] hover:bg-[var(--surface-2)] transition disabled:opacity-50"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={() => (isLast ? submit() : setStep((s) => s + 1))}
          disabled={!answered || loading}
          className="flex-1 min-h-[48px] px-5 rounded-xl font-semibold text-sm text-white bg-[var(--primary)] hover:brightness-110 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Finding stocks…" : isLast ? "Get my 3 stocks" : "Next"}
        </button>
      </div>
    </div>
  );
}
