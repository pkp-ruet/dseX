"use client";

import { type RecommendedStock } from "@/lib/api";

const SPARKLE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2l1.9 5.6L19.5 9l-5.1 2.7L12 17l-2.4-5.3L4.5 9l5.6-1.4L12 2z" />
    <path d="M19 14l.9 2.6L22.5 18l-2.6 1.1L19 22l-.9-2.9L15.5 18l2.6-1.4L19 14z" opacity="0.6" />
  </svg>
);

/** Slim bridge from the money dashboard to the Intelligence section below —
 *  teases today's top pick + tip count without duplicating the full cards. */
export default function ForYouTeaser({
  picks,
  tipsCount,
  targetId = "intelligence",
}: {
  picks: RecommendedStock[];
  tipsCount: number;
  /** DOM id of the section to scroll to on tap. */
  targetId?: string;
}) {
  if (picks.length === 0 && tipsCount === 0) return null;

  const top = picks[0] ?? null;
  const title = top
    ? `Picked for you: ${top.trading_code}${top.score != null ? ` · score ${Math.round(top.score)}` : ""}`
    : `${tipsCount} fresh tip${tipsCount === 1 ? "" : "s"} for today`;

  const parts: string[] = [];
  if (picks.length > 1) parts.push(`+${picks.length - 1} more pick${picks.length - 1 === 1 ? "" : "s"}`);
  if (top && tipsCount > 0) parts.push(`${tipsCount} fresh tip${tipsCount === 1 ? "" : "s"}`);
  const sub = parts.length > 0 ? `${parts.join(" · ")} below` : top ? "tuned daily to your taste" : "refreshed every morning";

  return (
    <button
      type="button"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      aria-label="Jump to today's picks and tips"
      className="hover-lift flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left"
      style={{
        borderColor: "color-mix(in srgb, var(--primary) 35%, var(--border))",
        background: "color-mix(in srgb, var(--primary) 8%, var(--surface))",
      }}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white" style={{ background: "var(--primary)" }} aria-hidden>
        {SPARKLE}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[0.86rem] font-bold text-[var(--text)] leading-tight">{title}</span>
        <span className="block text-[0.72rem] font-semibold text-[var(--primary)]">{sub}</span>
      </span>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-[var(--primary)]"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
