import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--primary)",
        "primary-soft": "var(--primary-soft)",
        accent: "var(--accent)",
        warm: "var(--warm)",
        "warm-soft": "var(--warm-soft)",
        positive: "var(--positive)",
        negative: "var(--negative)",
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        border: "var(--border)",
        "text-main": "var(--text)",
        "text-muted": "var(--text-muted)",
        "tier-excellent": "var(--tier-excellent)",
        "tier-good": "var(--tier-good)",
        "tier-average": "var(--tier-average)",
        "tier-weak": "var(--tier-weak)",
        "safe-buy": "var(--safe-buy)",
        watch: "var(--watch)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["var(--fs-2xs)", { lineHeight: "1.2" }],
        display: ["var(--fs-display)", { lineHeight: "1.05" }],
      },
      // One radius scale (2026-09-22): 8 controls-tight, 10 controls, 12 inputs/small cards,
      // 16 cards, 20 hero panels. `2xl` used to be Tailwind's 16px while `lg` was 18 and
      // `xl` 24, so cards on one page came out at three different radii.
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        md: "8px",
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
