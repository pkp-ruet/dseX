"use client";

import type { EngagementSegment } from "@/lib/api";

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

export const TOOLTIP_STYLE = {
  fontSize: 12,
  borderRadius: "12px",
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text)",
  boxShadow: "var(--shadow-soft)",
} as const;
