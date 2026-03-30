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
        primary: "#1A6B5A",
        accent: "#E07A5F",
        positive: "#4CAF7D",
        negative: "#D45B5B",
        bg: "#FEFDF7",
        border: "#D8CEB4",
        "text-main": "#0D0A04",
        "strong-buy": "#2D6A3F",
        "safe-buy": "#1A4D6B",
        watch: "#7A5C00",
        avoid: "#8B2020",
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
