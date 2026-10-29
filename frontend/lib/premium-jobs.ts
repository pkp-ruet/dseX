/**
 * What Premium is, said the same way everywhere (2026-10-29, the Free vs
 * Premium plan — https://claude.ai/artifact/EBvHXBmDvaZNFdbczRLRyg).
 *
 * The rule: facts are free, our judgement is Premium. Premium is sold as three
 * jobs, and every lock names the one it belongs to:
 *  - understand: the reasoning on any share (the report's answers, fair value,
 *    what a result or dividend means);
 *  - find: whole lists of shares worth a look (signals, Picked for you,
 *    research lists, the screener on your own terms);
 *  - watch: your shares checked every day (the watcher, portfolio analysis,
 *    what to buy next, more alerts and portfolios).
 *
 * A plain module (no "use client") so server components can read it.
 */

export type Bi = { en: string; bn: string };
export type Job = "understand" | "find" | "watch";

/** The one sentence: on every lock's page, the footer and /premium. */
export const PREMIUM_RULE: Bi = {
  en: "Facts are free. Our judgement is Premium.",
  bn: "সব তথ্য ফ্রি। আমাদের মতামত ও বিশ্লেষণ প্রিমিয়ামে।",
};

export const JOBS: Record<Job, { name: Bi; line: Bi }> = {
  understand: {
    name: { en: "Understand", bn: "বুঝুন" },
    line: { en: "Why we say it, on any share", bn: "যেকোনো শেয়ারে আমরা কেন এমন বলছি" },
  },
  find: {
    name: { en: "Find", bn: "খুঁজুন" },
    line: { en: "Whole lists of shares worth a look", bn: "দেখার মতো শেয়ারের পুরো তালিকা" },
  },
  watch: {
    name: { en: "Watch", bn: "নজর রাখুন" },
    line: { en: "Your shares checked every day", bn: "আপনার শেয়ার প্রতিদিন যাচাই" },
  },
};

export const JOB_ORDER: Job[] = ["understand", "find", "watch"];
