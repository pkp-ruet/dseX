/**
 * All of TopStock AI's words live here — one place to keep the voice consistent:
 * simple, everyday English, warm and encouraging, zero finance jargon, with a
 * few light Bengali touches. No promises, always "for learning".
 */
import { PERSONA } from "./persona";

export const COPY = {
  greeting: {
    text: `Hi! I'm ${PERSONA.name} 👋 — your stock helper. Tap a button below or just type what you're looking for.`,
    bn: "শুরু করতে নিচের যেকোনো একটা বেছে নিন।",
  },

  help: {
    text: "I can help you three ways — find stocks that fit you, tell you how the market is doing today, and answer quick questions about any single stock. Try one of these:",
  },

  fallback: {
    text: "Sorry, I didn't quite catch that. I'm best at these — pick one and we'll go from there:",
  },

  thinking: "TopStock AI is typing…",

  disclaimer:
    "These are ideas to learn from — not financial advice. Always do your own research.",

  // --- Suggest-stocks slot flow ---
  suggest: {
    intro: "Let's find stocks that fit you. A couple of quick taps 👇",
    done: "Darun! Here are a few that fit what you told me:",
    none: "I couldn't find a clean match. Here's the closest I've got:",
    relaxedPrefix: "To find enough options, I widened a few of your choices:",
  },

  // --- Market ---
  marketClosed: (countdown: string) =>
    `The market is closed right now — it opens in ${countdown}. Here's the last trading day:`,

  // --- Single stock ---
  stock: {
    notFound: (q: string) =>
      `I couldn't find a stock called "${q}". Try its trading code (like GP or BEXIMCO), or pick one:`,
    askWhich: "Which stock? Type its name or trading code (like GP, SQURPHARMA).",
    didYouMean: "Did you mean one of these?",
    fullAnalysis: "Full analysis →",
  },

  // --- Screen result framing (short lead-ins) ---
  screenLead: {
    screen_dividend: "Stocks that pay the best dividends right now:",
    screen_cheap: "Stocks that look good value at today's price:",
    screen_safe: "Steadier, higher-quality names to start with:",
    screen_growth: "Companies growing their profit the fastest:",
    screen_momentum: "Stocks moving the most lately:",
    screen_near_low:
      "Stocks trading near their 1-year low — possible bargains, but check why:",
  } as Record<string, string>,
  sectorLead: (sector: string) => `Top ${sector} stocks by overall quality:`,
  priceCapLead: (cap: number) => `Decent stocks priced under ৳${cap}:`,

  empty: {
    text: "Nothing matches that right now. Want to try something else?",
  },

  error: {
    text: "I'm having trouble reaching the data right now. Mind trying again?",
  },

  // --- Slot questions (labels mirror the recommendation quiz wording) ---
  slots: {
    strategy: {
      q: "How do you like to pick stocks?",
      chips: [
        { label: "Strong businesses", value: "fundamental_strong" },
        { label: "What's moving now", value: "market_trending" },
      ],
    },
    dividend: {
      q: "Do you want steady dividend income?",
      chips: [
        { label: "Yes, dividends matter", value: "income_focused" },
        { label: "Not important", value: "doesnt_matter" },
      ],
    },
    risk: {
      q: "Okay with price ups and downs?",
      chips: [
        { label: "Keep it steady", value: "steady" },
        { label: "A balanced mix", value: "balanced" },
        { label: "Go for bigger gains", value: "aggressive" },
      ],
    },
    sectors: {
      q: "Any industry you prefer? (or skip)",
      anyLabel: "Any industry",
    },
  },

  composerPlaceholder: "Ask about a stock, or what to buy…",
  seeAll: {
    market: "See full market",
    rankings: "See all rankings",
    insights: "See more",
  },
} as const;

/** Sentinel value for the "Any industry" sector chip. */
export const ANY_SECTOR = "__any__";
