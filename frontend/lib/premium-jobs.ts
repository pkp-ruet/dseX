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

/**
 * What each job does, in easy words, for a reader who has never paid for
 * anything like it (the closed `AnswerLock` card): one or two sentences and
 * three short things you get. Facts only — no advice, no performance claims.
 */
export const JOB_EXPLAIN: Record<Job, { what: Bi; gets: Bi[] }> = {
  understand: {
    what: {
      en: "We read the company's results, notices and price history for you, and explain in plain words what they mean: is the price fair, is the dividend safe, and what to keep an eye on.",
      bn: "আমরা কোম্পানির আর্থিক ফল, নোটিশ আর দামের ইতিহাস আপনার হয়ে পড়ি, তারপর সহজ ভাষায় বুঝিয়ে বলি এর মানে কী: দাম ঠিক আছে কি না, ডিভিডেন্ড নিরাপদ কি না, আর কোন দিকে খেয়াল রাখবেন।",
    },
    gets: [
      { en: "Answers in plain words", bn: "সহজ ভাষায় উত্তর" },
      { en: "Updated every trading day", bn: "প্রতি লেনদেনের দিনে নতুন করে" },
      { en: "On every DSE share", bn: "ডিএসইর সব শেয়ারে" },
    ],
  },
  find: {
    what: {
      en: "We check every company on the DSE each day and show you the full list of shares that pass, with the reason each one is there.",
      bn: "আমরা প্রতিদিন ডিএসইর সব কোম্পানি যাচাই করি, আর যেগুলো পাস করে তার পুরো তালিকা দেখাই, প্রতিটি কেন তালিকায় আছে তা সহ।",
    },
    gets: [
      { en: "The full list, not just 3", bn: "শুধু 3টি নয়, পুরো তালিকা" },
      { en: "Why each share is there", bn: "প্রতিটি শেয়ার কেন আছে" },
      { en: "Checked every trading day", bn: "প্রতি লেনদেনের দিনে যাচাই" },
    ],
  },
  watch: {
    what: {
      en: "We look after your shares every trading day: we tell you when something changes, grade your portfolio, and show what needs your attention, so you don't have to search for it yourself.",
      bn: "আমরা প্রতি লেনদেনের দিনে আপনার শেয়ারের খেয়াল রাখি: কিছু বদলালে জানাই, পোর্টফোলিওর গ্রেড দিই, আর কোথায় নজর দেওয়া দরকার তা দেখাই, যাতে আপনাকে নিজে খুঁজতে না হয়।",
    },
    gets: [
      { en: "Checked after every trading day", bn: "প্রতি লেনদেনের পরে যাচাই" },
      { en: "A notification when it matters", bn: "দরকারি খবরে নোটিফিকেশন" },
      { en: "What needs your attention", bn: "কোথায় নজর দেবেন" },
    ],
  },
};

export const JOB_ORDER: Job[] = ["understand", "find", "watch"];
