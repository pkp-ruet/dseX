"use client";

import type { ReactNode } from "react";
import type { AdminGroupKey, EngagementSegment } from "@/lib/api";

/** Token palette — Recharts accepts CSS variable strings in fill/stroke. The old
 *  indigo/orange/pink names stay as keys so callers compile; they now resolve to
 *  the info / warm / gold roles. */
export const COLORS = {
  primary: "var(--primary)",
  positive: "var(--positive)",
  negative: "var(--negative)",
  watch: "var(--watch)",
  muted: "var(--text-muted)",
  indigo: "var(--info)",
  orange: "var(--warm)",
  pink: "var(--gold)",
  navy: "var(--navy)",
} as const;

/** One colour per group, the same on every panel: clay = paying, gold = the
 *  old free month / given, steel = free, navy = everyone. */
export const GROUP_COLOR: Record<AdminGroupKey, string> = {
  all: COLORS.navy,
  premium: COLORS.primary,
  paid: COLORS.primary,
  gifted: COLORS.pink,
  free: COLORS.indigo,
};

export const SEGMENT_META: Record<
  EngagementSegment,
  { label: string; color: string; blurb: string }
> = {
  new: { label: "New", color: COLORS.primary, blurb: "Joined in the last 7 days" },
  active: { label: "Active", color: COLORS.positive, blurb: "Seen in the last 7 days" },
  at_risk: { label: "At risk", color: COLORS.watch, blurb: "Quiet for 7–30 days" },
  dormant: { label: "Dormant", color: COLORS.muted, blurb: "Gone 30+ days (or never seen)" },
};

export const SEGMENT_ORDER: EngagementSegment[] = ["new", "active", "at_risk", "dormant"];

export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "var(--shadow-soft)",
} as const;

/* ------------------------------------------------------------------ *
 * Formatting
 * ------------------------------------------------------------------ */

export const n = (v: number | null | undefined) => (v == null ? "–" : Math.round(v).toLocaleString("en-US"));
export const dec = (v: number | null | undefined) =>
  v == null ? "–" : Number.isInteger(v) ? v.toLocaleString("en-US") : v.toFixed(1);
export const pctOf = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** 26 → "26 min", 223 → "3h 43m". */
export function mins(v: number | null | undefined): string {
  if (v == null) return "–";
  const m = Math.round(v);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function dhakaToday(): Date {
  const iso = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
  return new Date(`${iso}T00:00:00`);
}

/** "Today", "Yesterday", "5 days ago" — from a YYYY-MM-DD Dhaka day. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "Never";
  const days = Math.round((dhakaToday().getTime() - new Date(`${iso}T00:00:00`).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

/** "24 Nov" */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "–";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/** A ratio between two groups: "2.3×", or "–" when it can't be worked out. */
export function times(a: number, b: number): string {
  if (!b || !a) return "–";
  const r = a / b;
  return `${r >= 10 ? Math.round(r) : r.toFixed(1)}×`;
}

/* ------------------------------------------------------------------ *
 * Section — a titled block of panels.
 * ------------------------------------------------------------------ */

export function Section({
  title,
  note,
  lead,
  children,
  id,
}: {
  title: string;
  note?: ReactNode;
  lead?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="flex flex-col gap-3 scroll-mt-28">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-text-main">{title}</h2>
        {note && <span className="text-xs text-text-muted">{note}</span>}
      </div>
      {lead && <p className="-mt-1 text-sm text-text-muted">{lead}</p>}
      {children}
    </section>
  );
}
