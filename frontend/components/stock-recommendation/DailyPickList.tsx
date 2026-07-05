"use client";

import { useState } from "react";
import { apiPickFeedback, type RecommendedStock } from "@/lib/api";
import RecommendedStockCard from "./RecommendedStockCard";

/**
 * The rich daily-pick cards + like/skip feedback, shared by the homepage card
 * and the full /stock-recommendation feed. Holds its own working copy of the
 * picks so skips can drop a card and backfill the server's replacement. Remount
 * (via a `key` on the codes) to reseed after a refetch.
 */
export default function DailyPickList({
  initialPicks,
  feedback = true,
  limit,
  compact = false,
  newCodes,
}: {
  initialPicks: RecommendedStock[];
  /** Show like/skip controls + backfill. Off for the homepage teaser. */
  feedback?: boolean;
  /** Render at most this many cards (teaser mode). */
  limit?: number;
  /** Tight, space-saving card layout for the homepage teaser. */
  compact?: boolean;
  /** Codes new since the user's previous feed — marks those cards "New". */
  newCodes?: string[];
}) {
  const [picks, setPicks] = useState<RecommendedStock[]>(initialPicks);
  const [liked, setLiked] = useState<Set<string>>(new Set());

  function handleLike(code: string) {
    const isLiked = liked.has(code);
    setLiked((prev) => {
      const next = new Set(prev);
      if (isLiked) next.delete(code);
      else next.add(code);
      return next;
    });
    apiPickFeedback(code, isLiked ? "clear" : "up").catch(() => {});
  }

  function handleSkip(code: string) {
    // Optimistically drop the card; backfill from the server's replacement.
    setPicks((prev) => prev.filter((p) => p.trading_code !== code));
    apiPickFeedback(code, "down")
      .then((res) => {
        if (res.replacement) {
          setPicks((prev) =>
            prev.some((p) => p.trading_code === res.replacement!.trading_code)
              ? prev
              : [...prev, res.replacement!],
          );
        }
      })
      .catch(() => {});
  }

  if (picks.length === 0) {
    return (
      <p className="text-center text-sm text-[var(--text-muted)] py-8">
        No picks right now — try tuning your preferences.
      </p>
    );
  }

  const shown = limit ? picks.slice(0, limit) : picks;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {shown.map((p, i) => (
        <RecommendedStockCard
          key={p.trading_code}
          stock={p}
          rank={i}
          compact={compact}
          isNew={newCodes?.includes(p.trading_code.toUpperCase()) ?? false}
          liked={liked.has(p.trading_code)}
          onLike={feedback ? () => handleLike(p.trading_code) : undefined}
          onSkip={feedback ? () => handleSkip(p.trading_code) : undefined}
        />
      ))}
    </div>
  );
}
