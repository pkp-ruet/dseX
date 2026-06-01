"use client";

import type { EngagementSegment, SignupSource } from "@/lib/api";

/** Token-aligned hex palette (Recharts needs concrete colors for fills). */
export const COLORS = {
  primary: "#2563EB",
  positive: "#15803D",
  negative: "#DC2626",
  watch: "#B45309",
  muted: "#64748B",
  indigo: "#6366F1",
  orange: "#EA580C",
  pink: "#DB2777",
} as const;

export const SEGMENT_META: Record<
  EngagementSegment,
  { label: string; color: string; blurb: string }
> = {
  new: { label: "New", color: COLORS.primary, blurb: "Joined in the last 7 days" },
  active: { label: "Active", color: COLORS.positive, blurb: "Seen in the last 7 days" },
  at_risk: { label: "At Risk", color: COLORS.watch, blurb: "Quiet for 7–30 days" },
  dormant: { label: "Dormant", color: COLORS.muted, blurb: "Gone 30+ days (or never seen)" },
};

export const SEGMENT_ORDER: EngagementSegment[] = ["new", "active", "at_risk", "dormant"];

export const SIGNUP_META: Record<SignupSource, { label: string; color: string }> = {
  google: { label: "Google", color: COLORS.orange },
  password: { label: "Email / Phone", color: COLORS.primary },
};

export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: "8px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
} as const;

/** "01 Jun 14:30" in Dhaka time. */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** "01 Jun 2026" in Dhaka time. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Human "time ago" from an ISO timestamp. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function SegmentPill({ segment }: { segment: EngagementSegment }) {
  const m = SEGMENT_META[segment];
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: m.color, background: `${m.color}1a`, border: `1px solid ${m.color}40` }}
    >
      {m.label}
    </span>
  );
}

export function SourcePill({ source }: { source: SignupSource }) {
  const m = SIGNUP_META[source];
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ color: m.color, background: `${m.color}14` }}
    >
      {m.label}
    </span>
  );
}
