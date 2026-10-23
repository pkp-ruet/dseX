import type { CSSProperties } from "react";

/**
 * Leftover of the 2026-09 "colour rhythm" (a hue per card and per chapter).
 * Since the 2026-10 redesign nothing paints `--acc` on a card or a chapter —
 * colour is kept for meaning (up/down, Buy/Sell, grades). `ACC` values still
 * tint a few rank chips and row tiles; don't use them to tell cards apart.
 */
export const ACC = {
  clay: "var(--primary)",
  steel: "var(--info)",
  navy: "var(--navy-soft)",
  gold: "var(--warm)",
  amber: "var(--watch)",
  green: "var(--positive)",
} as const;

export type AccentName = keyof typeof ACC;

/** `style={accVars(ACC.steel)}` — sets the `--acc` custom property. */
export function accVars(accent?: string): CSSProperties | undefined {
  return accent ? ({ "--acc": accent } as CSSProperties) : undefined;
}
