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
        primary: "#4F6BD8",
        accent: "#4F6BD8",
        positive: "#15803D",
        negative: "#DC2626",
        bg: "#F5F7FB",
        border: "#E2E8F0",
        "text-main": "#1E293B",
        "strong-buy": "#15803D",
        "safe-buy": "#4F6BD8",
        watch: "#B45309",
        avoid: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["var(--font-grotesk)", "Inter", "system-ui", "sans-serif"],
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
