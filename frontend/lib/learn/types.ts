/**
 * The lesson content model (2026-11-25, the Learn rebuild — plan:
 * https://claude.ai/artifact/Q7TxTX1WzkbxGvgcocYEig).
 *
 * Every lesson is written in both languages, block by block, so the English
 * page (`/learn/<en slug>`) and the Bengali page (`/blog/<bn slug>`) always say
 * the same thing in the same order. A block's text may use two marks:
 * `**bold**` and `[link text](/path)` (see `components/learn/Rich.tsx`).
 */

export type Lang = "en" | "bn";

/** One piece of text in both languages. */
export type L = { en: string; bn: string };

export type Block =
  | { kind: "p"; text: L }
  | { kind: "list"; items: L[] }
  /** Numbered steps: only where the order is real. */
  | { kind: "steps"; items: { title: L; text?: L }[] }
  | { kind: "tip"; title?: L; text: L }
  | { kind: "warn"; title?: L; text: L }
  /** A worked example in taka. Values are written as they print (৳5,020). */
  | { kind: "example"; title: L; rows: { label: L; value: string | L }[]; total?: { label: L; value: string | L }; note?: L }
  /** A short chain drawn as boxes and arrows: You → Broker → DSE → CDBL. */
  | { kind: "flow"; items: L[]; caption?: L }
  | { kind: "table"; head: L[]; rows: L[][] };

export type LessonSection = { heading: L; blocks: Block[] };

export type Lesson = {
  /** Stable id for progress ticks, never shown. */
  id: string;
  path: PathKey;
  /** 1-based place in its path. */
  n: number;
  /** English slug (/learn/...) and Bengali slug (/blog/...). Kept from an old
   *  post when the lesson replaced one, so its address keeps its search history. */
  slug: { en: string; bn: string };
  title: L;
  /** The page <title> when it should differ from the heading (search words). */
  seoTitle?: L;
  /** One sentence under the title; also the meta description. */
  summary: L;
  minutes: number;
  /** When the facts were last checked, ISO date. */
  checked: string;
  /** "In this lesson": three things the reader will know. */
  outcomes: L[];
  sections: LessonSection[];
  keyPoints: L[];
  /** Words used in the lesson, explained once. */
  words?: { term: L; meaning: L }[];
  /** One link to a TopStockBD page, only where it really helps. */
  tryIt?: { text: L; label: L; href: string };
  /** 2–4 short questions people search for (FAQPage JSON-LD too). */
  faqs?: { q: L; a: L }[];
  keywords: L;
};

export type PathKey = "start" | "basics" | "advanced";
