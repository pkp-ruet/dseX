"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { subscribeStreak, getStreak } from "@/lib/streak";
import type { StreakInfo } from "@/lib/api";

const MILESTONE_COPY: Record<number, string> = {
  7: "One week strong! 🎉",
  30: "30 days in a row — you're a regular! 🏅",
  100: "100-day streak. Legendary. 🏆",
};

function dismissedKey(milestone: number) {
  return `dsex.streak.milestone.${milestone}`;
}

/** Inline streak indicator for the header subline — quiet text, not a pill. */
export default function StreakBadge({ leadingDot = false }: { leadingDot?: boolean }) {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakInfo | null>(() => getStreak());
  const [showMilestone, setShowMilestone] = useState(false);

  useEffect(() => {
    setStreak(getStreak());
    return subscribeStreak(setStreak);
  }, []);

  // Show the milestone congrats once per milestone (dismiss persisted).
  useEffect(() => {
    const m = streak?.milestone_hit;
    if (!m) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(dismissedKey(m))) return;
    setShowMilestone(true);
  }, [streak?.milestone_hit]);

  const current = streak?.current_streak ?? user?.current_streak ?? 0;
  if (current < 1) return null;

  const longest = streak?.longest_streak ?? current;
  // Day 1 with no prior streak = brand-new; day 1 after a break = returning.
  const firstEver = current === 1 && longest <= 1;
  const label =
    current === 1 ? (firstEver ? "Day 1" : "Back — day 1") : `${current}-day streak`;

  const milestone = streak?.milestone_hit ?? 0;

  const dismiss = () => {
    if (typeof window !== "undefined" && milestone) {
      window.localStorage.setItem(dismissedKey(milestone), "1");
    }
    setShowMilestone(false);
  };

  return (
    <span
      className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)]"
      title={`Longest streak: ${streak?.longest_streak ?? current} days`}
    >
      {leadingDot && <span aria-hidden>·</span>}
      <span aria-hidden>🔥</span>
      <span className="font-medium text-[var(--text)]">{label}</span>
      {showMilestone && milestone > 0 && (
        <span className="ml-1 inline-flex items-center gap-1 font-semibold text-[var(--primary)]">
          <span aria-hidden>·</span>
          {MILESTONE_COPY[milestone] ?? `${milestone}-day streak!`}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-[var(--primary)]/70 hover:text-[var(--primary)]"
          >
            ✕
          </button>
        </span>
      )}
    </span>
  );
}
