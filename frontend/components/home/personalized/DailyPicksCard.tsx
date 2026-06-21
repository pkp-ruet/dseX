"use client";

import { useState } from "react";
import Link from "next/link";
import { type RecommendedStock } from "@/lib/api";
import RecommendCard from "@/components/home/personalized/RecommendCard";
import TuneModal from "@/components/stock-recommendation/TuneModal";
import DailyPickList from "@/components/stock-recommendation/DailyPickList";

const TEASER_COUNT = 3;

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);

export default function DailyPicksCard({
  picks,
  tuned = false,
  sectors,
  onTuned,
}: {
  picks: RecommendedStock[];
  /** True only when the user took the quiz — drives the personalize nudge. */
  tuned?: boolean;
  sectors: string[];
  /** Called after the user finishes tuning so the parent can refetch picks. */
  onTuned: () => void | Promise<void>;
}) {
  const [tuneOpen, setTuneOpen] = useState(false);

  if (!picks || picks.length === 0) return null;

  return (
    <>
      <RecommendCard
        accent="var(--primary)"
        icon={SPARKLE}
        title="Picked for you today"
        headerRight={
          tuned ? (
            <button
              type="button"
              onClick={() => setTuneOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] px-3 py-1.5 text-xs font-semibold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_15%,var(--surface))] active:scale-95"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="4" y1="21" x2="4" y2="14" />
                <line x1="4" y1="10" x2="4" y2="3" />
                <line x1="12" y1="21" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12" y2="3" />
                <line x1="20" y1="21" x2="20" y2="16" />
                <line x1="20" y1="12" x2="20" y2="3" />
                <line x1="1" y1="14" x2="7" y2="14" />
                <line x1="9" y1="8" x2="15" y2="8" />
                <line x1="17" y1="16" x2="23" y2="16" />
              </svg>
              Tune
            </button>
          ) : undefined
        }
      >
        {!tuned && (
          <button
            type="button"
            onClick={() => setTuneOpen(true)}
            className="hover-lift mb-3 flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] p-3.5 text-left"
          >
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white"
              style={{ background: "var(--primary)" }}
              aria-hidden
            >
              {SPARKLE}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[0.86rem] font-bold text-[var(--text)] leading-tight">
                Make these picks yours
              </span>
              <span className="block text-[0.75rem] text-[var(--text-muted)] leading-snug">
                Answer 8 quick questions → get stocks matched to your goals, fresh every day.
              </span>
            </span>
            <span
              className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[0.74rem] font-bold text-white"
              style={{ background: "var(--primary)" }}
            >
              Personalize →
            </span>
          </button>
        )}

        <DailyPickList
          key={picks.map((p) => p.trading_code).join(",")}
          initialPicks={picks}
          feedback={false}
          limit={TEASER_COUNT}
          compact
        />

        <Link
          href="/stock-recommendation"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 text-[0.8rem] font-bold text-[var(--primary)] transition hover:bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))]"
        >
          {picks.length > TEASER_COUNT ? `See all ${picks.length} picks` : "Open full picks"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      </RecommendCard>

      <TuneModal
        open={tuneOpen}
        sectors={sectors}
        onClose={() => setTuneOpen(false)}
        onComplete={onTuned}
      />
    </>
  );
}
