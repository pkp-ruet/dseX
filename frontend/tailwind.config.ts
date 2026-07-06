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
      borderRadius: {
        DEFAULT: "10px",
        lg: "18px",
        xl: "24px",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
      },
    },
  },
  plugins: [],
};

export default config;
