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

export default function StreakBadge() {
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
  // Day 1 with no prior streak = brand-new user; day 1 after a break = returning.
  const firstEver = current === 1 && longest <= 1;
  const dayOneCopy = firstEver ? "Your journey starts today" : "Back on track — day 1 🔄";

  const milestone = streak?.milestone_hit ?? 0;

  const dismiss = () => {
    if (typeof window !== "undefined" && milestone) {
      window.localStorage.setItem(dismissedKey(milestone), "1");
    }
    setShowMilestone(false);
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1 text-sm font-bold text-[var(--text)]"
        title={`Longest streak: ${streak?.longest_streak ?? current} days`}
      >
        <span aria-hidden="true">🔥</span>
        {current === 1 ? dayOneCopy : `${current} days in a row`}
      </span>

      {showMilestone && milestone > 0 && (
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)] bg-[var(--surface-2)] px-3 py-1 text-sm font-semibold text-[var(--primary)]">
          {MILESTONE_COPY[milestone] ?? `${milestone}-day streak!`}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="ml-0.5 text-[var(--primary)]/70 hover:text-[var(--primary)]"
          >
            ✕
          </button>
        </span>
      )}
    </div>
  );
}
