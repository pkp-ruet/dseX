/**
 * Plain names for market words (2026-10-30, the stock page rebuild). The
 * page leads with the plain name; the market word sits small after it, and a
 * tap on it (`components/stock/visuals/Term.tsx`) says what it means in one
 * line. Investors hear "P/E" and "ইপিএস", so we teach the word instead of
 * hiding it. Every tap fires `term_tap`, which tells us which words still
 * confuse readers.
 */

export type Bi = { en: string; bn: string };

export interface GlossaryEntry {
  /** The market word as investors say it. */
  word: Bi;
  /** The plain name the page uses instead. */
  plain: Bi;
  /** One line on what it means. */
  means: Bi;
}

export const GLOSSARY = {
  pe: {
    word: { en: "P/E", bn: "পিই" },
    plain: { en: "Years of profit you pay for", bn: "কত বছরের মুনাফার দাম" },
    means: {
      en: "How many years of today's profit the share price equals. A P/E of 10 means the price is about 10 years of its profit. Fewer years means a cheaper share.",
      bn: "শেয়ারের দাম কোম্পানির এখনকার মুনাফার কত বছরের সমান। এটি 10 হলে দাম প্রায় 10 বছরের মুনাফার সমান। বছর যত কম, শেয়ারটি তত সস্তা।",
    },
  },
  eps: {
    word: { en: "EPS", bn: "ইপিএস" },
    plain: { en: "Profit a share", bn: "শেয়ারপ্রতি মুনাফা" },
    means: {
      en: "The company's profit divided by the number of its shares: what one share earned.",
      bn: "কোম্পানির মোট মুনাফাকে শেয়ারের সংখ্যা দিয়ে ভাগ করলে এটি পাওয়া যায়। অর্থাৎ প্রতিটি শেয়ারের ভাগে কত মুনাফা এসেছে।",
    },
  },
  yield: {
    word: { en: "Dividend yield", bn: "ডিভিডেন্ড ইল্ড" },
    plain: { en: "Cash a year on ৳100 put in", bn: "৳100 বিনিয়োগে বছরে নগদ" },
    means: {
      en: "The yearly cash dividend as a share of today's price. 5% means about ৳5 a year for every ৳100 you put in, before tax.",
      bn: "বছরে যে নগদ ডিভিডেন্ড পাওয়া যায়, তা আজকের দামের কত শতাংশ। 5% মানে প্রতি ৳100 বিনিয়োগে কর কাটার আগে বছরে প্রায় ৳5 পাবেন।",
    },
  },
  payout: {
    word: { en: "Payout", bn: "পেআউট" },
    plain: { en: "Of ৳100 profit, paid to you", bn: "প্রতি ৳100 মুনাফা থেকে যা আপনাকে দেয়" },
    means: {
      en: "How much of the year's profit went out as cash dividend. The rest stays in the company to grow it.",
      bn: "বছরের মুনাফার কতটা নগদ ডিভিডেন্ড হিসেবে দেওয়া হয়েছে। বাকিটা ব্যবসা বাড়াতে কোম্পানিতেই থাকে।",
    },
  },
  cash_flow: {
    word: { en: "Operating cash flow", bn: "ক্যাশ ফ্লো" },
    plain: { en: "Cash that really came in", bn: "হাতে আসা নগদ টাকা" },
    means: {
      en: "The cash the business actually collected. Profit on paper that never arrives as cash is a warning sign.",
      bn: "ব্যবসা থেকে আসলে যত নগদ টাকা হাতে এসেছে। হিসাবের খাতায় মুনাফা দেখালেও নগদ টাকা না এলে বিষয়টি সতর্ক হওয়ার মতো।",
    },
  },
  margin: {
    word: { en: "Margin", bn: "মার্জিন" },
    plain: { en: "Kept from every ৳100 sold", bn: "প্রতি ৳100 বিক্রিতে যা মুনাফা থাকে" },
    means: {
      en: "Profit as a share of sales: how many taka of profit are left from every ৳100 the company sells.",
      bn: "বিক্রির তুলনায় মুনাফা কতটা। অর্থাৎ কোম্পানি ৳100-এর পণ্য বা সেবা বিক্রি করলে তার মধ্যে কত টাকা মুনাফা থাকে।",
    },
  },
  roe: {
    word: { en: "Return on equity", bn: "আরওই" },
    plain: { en: "Profit on the owners' money", bn: "নিজস্ব মূলধনে মুনাফা" },
    means: {
      en: "The year's profit as a share of the money the owners have in the company. 15% means ৳15 a year for every ৳100 of theirs.",
      bn: "কোম্পানিতে শেয়ারহোল্ডারদের নিজস্ব মূলধনের তুলনায় বছরের মুনাফা কত। 15% মানে তাঁদের প্রতি ৳100-এ বছরে ৳15 মুনাফা।",
    },
  },
  interest_cover: {
    word: { en: "Interest cover", bn: "ইন্টারেস্ট কভার" },
    plain: { en: "Profit pays the interest", bn: "মুনাফা দিয়ে সুদ দেওয়ার সামর্থ্য" },
    means: {
      en: "How many times the profit before interest could pay the year's interest. Under 1.5 times is tight.",
      bn: "সুদ দেওয়ার আগের মুনাফা দিয়ে বছরের সুদ কতবার দেওয়া যায়। এটি 1.5 গুণের কম হলে অবস্থা টানাটানির।",
    },
  },
  sponsors: {
    word: { en: "Sponsors", bn: "উদ্যোক্তা" },
    plain: { en: "Founders and directors", bn: "উদ্যোক্তা-পরিচালক" },
    means: {
      en: "The people and companies who founded and run it. DSE rules ask them to hold at least 30% together.",
      bn: "যেসব ব্যক্তি ও প্রতিষ্ঠান কোম্পানিটি গড়েছেন এবং চালাচ্ছেন। ডিএসইর নিয়ম অনুযায়ী তাঁদের সবার হাতে মিলিয়ে অন্তত 30% শেয়ার থাকতে হয়।",
    },
  },
  rating: {
    word: { en: "Credit rating", bn: "ক্রেডিট রেটিং" },
    plain: { en: "Credit grade", bn: "ঋণমান" },
    means: {
      en: "A rating agency's grade for how safely the company can repay its debts, from AAA (best) to D. AAA to BBB is considered safe.",
      bn: "কোম্পানি কতটা নিরাপদে ঋণ শোধ করতে পারবে, তা নিয়ে রেটিং এজেন্সির দেওয়া গ্রেড। সবচেয়ে ভালো AAA, সবচেয়ে খারাপ D। AAA থেকে BBB পর্যন্ত নিরাপদ ধরা হয়।",
    },
  },
  category: {
    word: { en: "Category", bn: "ক্যাটাগরি" },
    plain: { en: "DSE's group", bn: "ডিএসইর গ্রুপ" },
    means: {
      en: "DSE puts every company in a group. A pays dividends and holds its AGM on time; B pays little; Z missed a dividend or an AGM; N is newly listed.",
      bn: "ডিএসই প্রতিটি কোম্পানিকে একটি ক্যাটাগরিতে রাখে। A ক্যাটাগরির কোম্পানি নিয়মিত ডিভিডেন্ড দেয় আর সময়মতো এজিএম করে। B কম ডিভিডেন্ড দেয়। Z ডিভিডেন্ড দেয়নি বা এজিএম করেনি। N নতুন তালিকাভুক্ত।",
    },
  },
  record_date: {
    word: { en: "Record date", bn: "রেকর্ড ডেট" },
    plain: { en: "The day you must own it", bn: "যেদিন শেয়ার হাতে থাকতে হবে" },
    means: {
      en: "Owners on this date get the dividend. Shares take two working days to settle, so buy at least three trading days before.",
      bn: "এই তারিখে যাঁদের হাতে শেয়ার থাকে, তাঁরাই ডিভিডেন্ড পান। কেনা শেয়ার অ্যাকাউন্টে আসতে দুই কার্যদিবস লাগে, তাই অন্তত তিন লেনদেনের দিন আগে কিনতে হবে।",
    },
  },
} satisfies Record<string, GlossaryEntry>;

export type GlossaryKey = keyof typeof GLOSSARY;
