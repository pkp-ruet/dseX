import type { Config } from "tailwindcss";

/**
 * Every colour utility resolves to a CSS token from `app/globals.css :root`.
 * Tokens with an `--x-rgb` triplet support Tailwind opacity modifiers
 * (`bg-primary/10`, `border-border/60`); the rest are plain `var()` colours.
 * Components use these names — `text-text-muted`, `bg-surface-2`,
 * `border-border` — never `[var(--…)]` arbitrary values and never raw hex
 * (the two OG-image routes are the only exception; Satori has no CSS vars).
 */
const rgb = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // canvas + ink
        bg: rgb("bg"),
        surface: rgb("surface"),
        "surface-2": rgb("surface-2"),
        border: rgb("border"),
        "cell-rule": "var(--cell-rule)",
        "text-main": rgb("text"),
        "text-muted": rgb("text-muted"),
        // roles
        primary: rgb("primary"),
        "primary-ink": "var(--primary-ink)",
        "primary-soft": "var(--primary-soft)",
        navy: rgb("navy"),
        "navy-ink": "var(--navy-ink)",
        "navy-soft": "var(--navy-soft)",
        info: rgb("info"),
        "info-ink": "var(--info-ink)",
        "info-soft": "var(--info-soft)",
        gold: rgb("gold"),
        "gold-ink": "var(--gold-ink)",
        "gold-soft": "var(--gold-soft)",
        "gold-light": "var(--gold-light)",
        warm: rgb("warm"),
        "warm-ink": "var(--warm-ink)",
        "warm-soft": "var(--warm-soft)",
        // market semantics — locked, never decorative
        positive: rgb("positive"),
        negative: rgb("negative"),
        watch: rgb("watch"),
        // fundamental-strength tiers
        "tier-excellent": "var(--tier-excellent)",
        "tier-good": "var(--tier-good)",
        "tier-average": "var(--tier-average)",
        "tier-weak": "var(--tier-weak)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "Inter", "system-ui", "sans-serif"],
      },
      // Type scale mirrors the `--fs-*` tokens. 12px is the floor app-wide —
      // the audience reads on budget Android phones. Nothing smaller than `text-xs`.
      fontSize: {
        "2xs": ["var(--fs-2xs)", { lineHeight: "1.25" }],
        display: ["var(--fs-display)", { lineHeight: "1.05" }],
      },
      // One radius scale: 6 chips, 8 controls-tight, 10 controls, 12 inputs/small
      // cards, 16 cards, 20 hero panels. Mirrors `--radius-sm/--radius/--radius-md/
      // --radius-lg/--radius-xl` in globals.css.
      borderRadius: {
        sm: "6px",
        md: "8px",
        DEFAULT: "10px",
        lg: "12px",
        xl: "16px",
        "2xl": "16px",
        "3xl": "20px",
      },
      // Every shadow utility resolves to one of the two tokens; nothing glows.
      boxShadow: {
        sm: "var(--shadow-soft)",
        DEFAULT: "var(--shadow-soft)",
        md: "var(--shadow-soft)",
        lg: "var(--shadow-lift)",
        xl: "var(--shadow-lift)",
        "2xl": "var(--shadow-lift)",
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
      },
    },
  },
  plugins: [],
};

export default config;
