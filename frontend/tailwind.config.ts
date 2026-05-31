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
        primary: "#2563EB",
        accent: "#0EA5E9",
        positive: "#15803D",
        negative: "#DC2626",
        bg: "#F7F8FA",
        border: "#E3E8EF",
        "text-main": "#0F172A",
        "strong-buy": "#15803D",
        "safe-buy": "#2563EB",
        watch: "#B45309",
        avoid: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
