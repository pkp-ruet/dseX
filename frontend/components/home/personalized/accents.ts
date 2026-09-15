import type { CSSProperties } from "react";

/**
 * The dashboard's colour rhythm.
 *
 * Twenty identical white cards read as one grey wall, so every card carries an
 * accent: a hairline across its top, a whisper of tint behind its header and a
 * gradient icon tile (all three come from `DashHeader` + `.dash-head` in
 * globals.css). Chapters set the base hue and a few cards vary inside it, the
 * same way the landing page varies accents inside a block.
 *
 * Only the warm/role palette is used for decoration — clay, steel, navy, gold
 * and the amber warn token. `--positive` / `--negative` / the tier colours stay
 * locked to market meaning and appear here ONLY where the card's subject really
 * is that thing (buy signals are green because they are buy signals, not
 * because green looked nice).
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

/** The five chapters, in page order. */
export const CHAPTER_ACC = {
  money: ACC.clay,
  market: ACC.steel,
  ideas: ACC.navy,
  dividends: ACC.gold,
  learn: ACC.clay,
} as const;

/** `style={accVars(ACC.steel)}` — sets the `--acc` custom property. */
export function accVars(accent?: string): CSSProperties | undefined {
  return accent ? ({ "--acc": accent } as CSSProperties) : undefined;
}
