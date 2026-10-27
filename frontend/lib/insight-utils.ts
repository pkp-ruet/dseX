/*
 * The one pillar colour scale. The prose helpers for the free stock lists
 * moved into `lib/stock-lists.ts` (`classicLede` / `classicLine`, both
 * languages) on 2026-10-28.
 */

// ── Pillar colour ─────────────────────────────────────────────────────────────

/**
 * Colour for a 0–10 pillar / sub-metric bar. Three bands, expressed with the
 * tier tokens so a bar means the same thing as a tier pill beside it:
 * ≥7 excellent · ≥4 average · below weak. Null (never scraped) is muted.
 * THE pillar colour scale — every pillar bar in the app reads it.
 */
export function pillarColor(val: number | null | undefined): string {
  if (val == null) return "var(--text-muted)";
  if (val >= 7) return "var(--tier-excellent)";
  if (val >= 4) return "var(--tier-average)";
  return "var(--tier-weak)";
}
