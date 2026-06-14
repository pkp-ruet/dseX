"use client";

import { useState } from "react";
import { type RecommendationAnswers } from "@/lib/api";
import Button from "@/components/ui/Button";

type Answers = Partial<RecommendationAnswers> & { sectors: string[] };

interface Option {
  value: string;
  label: string;
  desc?: string;
}

interface SingleStep {
  key: "timeline" | "strategy" | "risk" | "size" | "dividend" | "valuation" | "budget";
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
    subtitle: "Your time horizon — it shapes how much we weigh durability vs quick moves.",
    options: [
      { value: "long", label: "A year or more", desc: "Long-term investing" },
      { value: "short", label: "Weeks to a few months", desc: "Short-term trading" },
    ],
  },
  {
    key: "strategy",
    kind: "single",
    title: "How do you like to pick winners?",
    subtitle: "Your overall approach to choosing stocks.",
    options: [
      { value: "fundamental_strong", label: "Strong businesses", desc: "Quality companies, healthy finances" },
      { value: "market_trending", label: "What's moving now", desc: "Follow recent price momentum" },
    ],
  },
  {
    key: "risk",
    kind: "single",
    title: "How do you feel about price swings?",
    subtitle: "How much ups and downs you're comfortable with.",
    options: [
      { value: "steady", label: "Keep it steady", desc: "Prefer stable, financially solid names" },
      { value: "balanced", label: "A balanced mix", desc: "Some swings are fine" },
      { value: "aggressive", label: "Go for bigger gains", desc: "Okay with more risk for upside" },
    ],
  },
  {
    key: "size",
    kind: "single",
    title: "Big names or smaller companies?",
    subtitle: "Larger companies tend to be steadier; smaller ones can grow faster.",
    options: [
      { value: "large", label: "Big, established names", desc: "Blue-chip companies" },
      { value: "any", label: "No preference", desc: "Show me a mix" },
      { value: "small", label: "Smaller, growing companies", desc: "More room to grow" },
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

// Neutral defaults so single-choice steps start pre-selected (the user can still
// change them); sectors stay empty (truly optional).
const DEFAULTS: Answers = {
  timeline: "long",
  strategy: "fundamental_strong",
  risk: "balanced",
  size: "any",
  sectors: [],
  dividend: "doesnt_matter",
  valuation: "any",
  budget: "any",
};

export default function RecommendationQuiz({
  sectors,
  initialAnswers,
  onSubmit,
  onCancel,
  submitting = false,
}: {
  sectors: string[];
  initialAnswers?: Partial<RecommendationAnswers>;
  onSubmit: (answers: RecommendationAnswers) => void;
  onCancel?: () => void;
  submitting?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>(() => ({
    ...DEFAULTS,
    ...initialAnswers,
    sectors: initialAnswers?.sectors ?? [],
  }));

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const total = STEPS.length;

  const answered = current.kind === "sectors" ? true : Boolean(answers[current.key]);

  function pickSingle(key: SingleStep["key"], value: string) {
    setAnswers((a) => ({ ...a, [key]: value }));
  }

  function toggleSector(s: string) {
    setAnswers((a) => {
      const has = a.sectors.includes(s);
      return { ...a, sectors: has ? a.sectors.filter((x) => x !== s) : [...a.sectors, s] };
    });
  }

  const allSectorsSelected = sectors.length > 0 && answers.sectors.length === sectors.length;

  function toggleAllSectors() {
    setAnswers((a) => ({ ...a, sectors: allSectorsSelected ? [] : [...sectors] }));
  }

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
        <div>
          {sectors.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No sectors available — you can skip this.</p>
          )}
          {sectors.length > 0 && (
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-[0.72rem] font-semibold text-[var(--text-muted)]">
                {answers.sectors.length} selected
              </span>
              <button
                type="button"
                onClick={toggleAllSectors}
                className="text-[0.78rem] font-bold text-[var(--primary)] hover:underline"
              >
                {allSectorsSelected ? "Clear all" : "Select all"}
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
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
        </div>
      )}

      {/* Nav */}
      <div className="flex items-center gap-3 pt-1">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={submitting}
            className="min-h-[48px] px-5"
          >
            Back
          </Button>
        ) : onCancel ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={submitting}
            className="min-h-[48px] px-5"
          >
            Cancel
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          onClick={() => (isLast ? onSubmit({ ...DEFAULTS, ...answers } as RecommendationAnswers) : setStep((s) => s + 1))}
          disabled={!answered || submitting}
          className="flex-1 min-h-[48px] px-5"
        >
          {submitting ? "Finding stocks…" : isLast ? "Get my picks" : "Next"}
        </Button>
      </div>
    </div>
  );
}
