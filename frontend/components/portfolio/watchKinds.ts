import type { PortfolioWatchEvent } from "@/lib/api";

/** The watcher's event kinds as a short tag on a holding card. */
export const KIND_TAG: Record<PortfolioWatchEvent["kind"], { en: string; bn: string }> = {
  record: { en: "Record date", bn: "রেকর্ড ডেট" },
  results: { en: "New results", bn: "নতুন ফল" },
  grade: { en: "Grade changed", bn: "গ্রেড বদলেছে" },
  category: { en: "Category changed", bn: "ক্যাটাগরি বদলেছে" },
  drop: { en: "Big fall", bn: "বড় পতন" },
  low52: { en: "Yearly low", bn: "বছরের সর্বনিম্ন" },
  red_flag: { en: "Red flag", bn: "বড় সতর্কতা" },
  answer: { en: "Answer changed", bn: "উত্তর বদলেছে" },
};

/** An event's level as a `Chip` tone. */
export const LEVEL_TONE: Record<PortfolioWatchEvent["level"], "positive" | "watch" | "negative"> = {
  good: "positive",
  watch: "watch",
  bad: "negative",
};
