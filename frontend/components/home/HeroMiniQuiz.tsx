"use client";

import { useState } from "react";
import { m } from "motion/react";
import { type RecommendationAnswers } from "@/lib/api";

/**
 * Three-tap version of the full quiz at /stock-recommendation, sized for the
 * hero. It exists because the hero's other entry point — the search box — asks
 * the visitor to already know a trading code, which most first-timers don't.
 *
 * Every tap patches a neutral baseline and the last tap submits, so the whole
 * thing is three taps with no Next button. The dials each answer does NOT speak
 * to stay neutral, and no two steps write the same dial — so a later tap can
 * never silently undo an earlier one.
 */

/** Neutral baseline — every dial /api/recommendations expects.
 *  Mirrors DEFAULTS in components/stock-recommendation/RecommendationQuiz.tsx. */
const NEUTRAL: RecommendationAnswers = {
  timeline: "long",
  strategy: "fundamental_strong",
  risk: "balanced",
  size: "any",
  sectors: [],
  dividend: "doesnt_matter",
  valuation: "any",
  budget: "any",
};

interface Option {
  /** Short label reused as the summary chip once the quiz is done. */
  label: string;
  bn: string;
  glyph: string;
  patch: Partial<RecommendationAnswers>;
}

interface Step {
  key: string;
  title: string;
  bn: string;
  options: Option[];
}

const STEPS: Step[] = [
  {
    key: "goal",
    title: "What do you want from your money?",
    bn: "টাকা দিয়ে আপনি কী চান?",
    options: [
      {
        label: "Steady cash",
        bn: "নিয়মিত নগদ আয়",
        glyph: "💵",
        patch: { dividend: "income_focused", valuation: "value" },
      },
      {
        label: "Grow my money",
        bn: "টাকা বাড়াতে চাই",
        glyph: "📈",
        patch: { valuation: "growth" },
      },
      {
        label: "Play it safe",
        bn: "ঝুঁকি কম রাখতে চাই",
        glyph: "🛡️",
        patch: { risk: "steady", size: "large" },
      },
    ],
  },
  {
    key: "timeline",
    title: "How long will you hold?",
    bn: "কতদিন ধরে রাখবেন?",
    options: [
      {
        label: "Under a year",
        bn: "এক বছরের কম",
        glyph: "⚡",
        patch: { timeline: "short", strategy: "market_trending" },
      },
      {
        label: "A year or more",
        bn: "এক বছর বা বেশি",
        glyph: "🌱",
        patch: { timeline: "long", strategy: "fundamental_strong" },
      },
    ],
  },
  {
    key: "budget",
    title: "What can you spend per share?",
    bn: "প্রতি শেয়ারে কত খরচ করতে পারবেন?",
    options: [
      { label: "Under ৳50", bn: "৳50 এর কম", glyph: "🪙", patch: { budget: "under_50" } },
      { label: "৳50 – ৳200", bn: "৳50 থেকে ৳200", glyph: "💳", patch: { budget: "50_to_200" } },
      { label: "Any price", bn: "যেকোনো দাম", glyph: "✨", patch: { budget: "any" } },
    ],
  },
];

interface Props {
  /** Fired on the final tap with the merged answers + the chosen labels. */
  onComplete: (answers: RecommendationAnswers, summary: string[]) => void;
  /** Parent is fetching — freeze the taps. */
  busy?: boolean;
  /** Parent has a result on screen — collapse to the compact answer row. */
  done?: boolean;
  /** Fired when the user chooses to redo the quiz. */
  onRestart?: () => void;
}

export default function HeroMiniQuiz({ onComplete, busy = false, done = false, onRestart }: Props) {
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Option[]>([]);

  const total = STEPS.length;
  const current = STEPS[step];

  function choose(opt: Option) {
    if (busy) return;
    // Slice first so re-answering an earlier step drops the stale later picks.
    const next = [...picked.slice(0, step), opt];
    setPicked(next);

    if (step < total - 1) {
      setStep(step + 1);
      return;
    }
    const answers = next.reduce<RecommendationAnswers>(
      (acc, o) => ({ ...acc, ...o.patch }),
      { ...NEUTRAL },
    );
    onComplete(answers, next.map((o) => o.label));
  }

  function restart() {
    setStep(0);
    setPicked([]);
    onRestart?.();
  }

  // Results are on screen — shrink to a one-line record of what they answered.
  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded border border-border bg-surface-2 px-3 py-2.5">
        <span className="text-xs font-extrabold uppercase tracking-[0.12em] text-text-muted">
          You said
        </span>
        {picked.map((o) => (
          <span
            key={o.label}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2.5 py-0.5 text-xs font-bold text-text-main"
          >
            <span aria-hidden>{o.glyph}</span>
            {o.label}
          </span>
        ))}
        <button
          type="button"
          onClick={restart}
          className="ml-auto text-xs font-bold text-primary-ink hover:underline underline-offset-2"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-extrabold uppercase tracking-[0.13em] text-primary-ink">
          Find your stocks — 3 taps
        </span>
        <span className="shrink-0 text-xs font-extrabold tabular-nums text-text-muted">
          {step + 1} / {total}
        </span>
      </div>

      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <m.div
          className="h-full rounded-full bg-primary"
          initial={false}
          animate={{ width: `${((step + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 260, damping: 30 }}
        />
      </div>

      <m.div
        key={current.key}
        initial={{ opacity: 0, x: 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Deliberately not an <h2> — the marketing page's heading outline
            belongs to its real sections, not to a rotating quiz prompt. */}
        <p
          id="hero-quiz-question"
          className="mt-3.5 text-base font-extrabold leading-snug text-text-main"
        >
          {current.title}
        </p>
        <p lang="bn" className="font-bn mt-0.5 text-sm leading-snug text-text-muted">
          {current.bn}
        </p>

        <div role="group" aria-labelledby="hero-quiz-question" className="mt-3 flex flex-col gap-2">
          {current.options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => choose(opt)}
              disabled={busy}
              className="group flex min-h-[54px] w-full items-center gap-3 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left transition hover:border-primary hover:bg-[color-mix(in_srgb,var(--primary)_6%,var(--surface))] active:scale-[0.99] disabled:opacity-60"
            >
              <span aria-hidden className="shrink-0 text-lg leading-none">
                {opt.glyph}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold leading-tight text-text-main">
                  {opt.label}
                </span>
                <span
                  lang="bn"
                  className="font-bn mt-0.5 block text-xs leading-tight text-text-muted"
                >
                  {opt.bn}
                </span>
              </span>
              <span
                aria-hidden
                className="shrink-0 text-border transition group-hover:translate-x-0.5 group-hover:text-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </span>
            </button>
          ))}
        </div>
      </m.div>

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep((s) => s - 1)}
          disabled={busy}
          className="mt-3 text-xs font-semibold text-text-muted hover:text-text-main disabled:opacity-60"
        >
          ← Back
        </button>
      )}
    </div>
  );
}
