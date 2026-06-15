"use client";

import { useEffect, useState } from "react";
import { getDailyPicks, type RecommendedStock } from "@/lib/api";
import { getStoredUser } from "@/lib/auth";
import { cacheKeys, readCache, writeCache } from "@/lib/swr-cache";
import DailyPickList from "./DailyPickList";
import TuneModal from "./TuneModal";
import Button from "@/components/ui/Button";

const SPARKLE = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
  </svg>
);

export default function DailyFeed({ sectors }: { sectors: string[] }) {
  const userId = getStoredUser()?.user_id ?? null;

  const [picks, setPicks] = useState<RecommendedStock[] | null>(() =>
    userId ? readCache<{ picks: RecommendedStock[] }>(cacheKeys.dailyPicks(userId))?.picks ?? null : null,
  );
  const [tuned, setTuned] = useState(false);
  const [loading, setLoading] = useState(picks === null);

  const [retuneOpen, setRetuneOpen] = useState(false);

  function loadPicks() {
    setLoading(true);
    return getDailyPicks()
      .then((d) => {
        setPicks(d.picks);
        setTuned(d.tuned ?? false);
        if (userId) writeCache(cacheKeys.dailyPicks(userId), d);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPicks().catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="inline-flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 text-white"
            style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #000))" }}
            aria-hidden
          >
            {SPARKLE}
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-extrabold text-[var(--text)] leading-tight">Picked for you today</h2>
            <p className="text-[0.76rem] text-[var(--text-muted)]">
              {tuned ? "Tuned to your taste · refreshes daily" : "Top stocks today · refreshes daily"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setRetuneOpen(true)}
          className="shrink-0 min-h-[40px] px-4 text-sm"
        >
          ⚙ Tune
        </Button>
      </div>

      {!tuned && !loading && (
        <button
          type="button"
          onClick={() => setRetuneOpen(true)}
          className="hover-lift flex w-full items-center gap-3 rounded-xl border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface))] p-4 text-left"
        >
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
            style={{ background: "var(--primary)" }}
            aria-hidden
          >
            {SPARKLE}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.9rem] font-bold text-[var(--text)] leading-tight">
              These are today&apos;s top stocks — make them yours
            </span>
            <span className="block text-[0.78rem] text-[var(--text-muted)] leading-snug">
              Answer 8 quick questions and every day&apos;s picks will match your goals.
            </span>
          </span>
          <span
            className="shrink-0 inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-[0.78rem] font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            Start →
          </span>
        </button>
      )}

      {/* Picks */}
      {loading ? (
        <div className="py-10 flex justify-center">
          <span className="w-8 h-8 rounded-full border-[3px] border-[var(--surface-2)] border-t-[var(--primary)] animate-spin" />
        </div>
      ) : picks && picks.length > 0 ? (
        <DailyPickList key={picks.map((p) => p.trading_code).join(",")} initialPicks={picks} />
      ) : (
        <p className="text-center text-sm text-[var(--text-muted)] py-8">
          No picks right now — try tuning your preferences.
        </p>
      )}

      <p className="text-center text-[0.72rem] text-[var(--text-muted)] leading-relaxed">
        Suggestions based on data, not financial advice. Always do your own research.
      </p>

      <TuneModal
        open={retuneOpen}
        sectors={sectors}
        onClose={() => setRetuneOpen(false)}
        onComplete={loadPicks}
      />
    </div>
  );
}
