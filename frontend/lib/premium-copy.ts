/**
 * Every word on /premium, in English and everyday Bengali. A plain module so
 * the server page can build its FAQ JSON-LD from the same English the body
 * shows. One language per page (2026-10-28): the body renders each pair with
 * `<T>`, so the reader sees only their language. Western digits in Bengali.
 *
 * 2026-11-18 (user: "everything sounds abstract. give a simple list like
 * portfolio analysis, unlimited watchlist, access to stock analysis, dividend
 * calendar, buy list, stock screener, stock compare … a simple easy to
 * understand page"; mockup https://claude.ai/artifact/XoHEdTVdEaEuFCwJYLXD7q
 * v4): ONE list of what Premium gives (`FEATURES`, each with one plain line).
 * Since 2026-11-26 the plans come first, then the list, then three questions
 * (see `HERO`). No refund line on this page (user decision, 2026-11-18). A new
 * Premium feature is a new row in `FEATURES`; keep each line to one sentence.
 * Limits say "as many as you want", never "unlimited" (the hard caps are 200
 * shares followed and 50 alerts).
 */
import { LOWEST_PRICE } from "@/lib/premium-plans";
import { MAX_COMPARE } from "@/lib/compare";

export type Bi = { en: string; bn: string };

const MAX_PORTFOLIOS = 6;

/** 2026-11-26 (user: "bring price table to top. after that a simple premium
 *  feature list"; mockup https://claude.ai/artifact/AWU7kotVBn4cDA65Uao1kg):
 *  the page opens on the two plans and one button, then a plain list of what
 *  Premium opens, then the questions. Paying happens in a sheet
 *  (`PaySheet`). */
export const HERO = {
  eyebrow: { en: "TopStockBD Premium", bn: "TopStockBD প্রিমিয়াম" },
  title: { en: "Choose your Premium plan", bn: "আপনার প্রিমিয়াম প্ল্যান বেছে নিন" },
  lead: {
    en: "Every analysis, your shares watched every day, and every list. Pay by bKash, Nagad or bank.",
    bn: "প্রতিটি বিশ্লেষণ, প্রতিদিন আপনার শেয়ারে নজর, আর সব তালিকা। পেমেন্ট বিকাশ, নগদ বা ব্যাংকে।",
  },
} as const;

/** The ticks under the plan button. */
export const PROMISES: Bi[] = [
  { en: "Never renews by itself", bn: "নিজে থেকে নবায়ন হয় না" },
  { en: "bKash, Nagad or bank", bn: "বিকাশ, নগদ বা ব্যাংক" },
  { en: "Starts the moment you pay", bn: "পেমেন্ট করলেই চালু" },
];

export type FeatureKey =
  | "analysis" | "portfolio" | "dividends" | "buylist" | "screener"
  | "compare" | "alerts" | "news" | "foryou" | "research" | "portfolios";

/** One row of "What you get": the name and one short line. No "Free: …" tag
 *  since 2026-11-26 (the list says what Premium opens, nothing more). */
export interface Feature {
  key: FeatureKey;
  name: Bi;
  line: Bi;
}

export const FEATURES: Feature[] = [
  {
    key: "analysis",
    name: { en: "Stock analysis", bn: "শেয়ারের বিশ্লেষণ" },
    line: {
      en: "Our full analysis of every DSE share: how strong the company is, the right price, and what could go wrong.",
      bn: "ডিএসইর প্রতিটি শেয়ারের পূর্ণ বিশ্লেষণ: কোম্পানি কতটা শক্তিশালী, ঠিক দাম কত, আর কী ঝুঁকি আছে।",
    },
  },
  {
    key: "portfolio",
    name: { en: "Portfolio analysis", bn: "পোর্টফোলিও বিশ্লেষণ" },
    line: {
      en: "A full check of your shares every day, with a plan for what to do.",
      bn: "প্রতিদিন আপনার শেয়ারের পূর্ণ যাচাই, সঙ্গে কী করবেন তার পরিকল্পনা।",
    },
  },
  {
    key: "dividends",
    name: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    line: {
      en: "Every dividend coming up, what your own shares will get, and a reminder on the last day to buy.",
      bn: "আসন্ন সব ডিভিডেন্ড, আপনার শেয়ারে কত টাকা আসছে, আর কেনার শেষ দিনে মনে করিয়ে দেওয়া।",
    },
  },
  {
    key: "buylist",
    name: { en: "Buy List", bn: "কেনার তালিকা" },
    line: { en: "Today's shares worth buying, with the reason for each.", bn: "আজ কেনার মতো শেয়ার, প্রতিটির কারণসহ।" },
  },
  {
    key: "screener",
    name: { en: "Lists by what you want", bn: "আপনি যা চান, সেই তালিকা" },
    line: {
      en: "16 ready lists, from good cash dividends to the 52-week low, with a daily alert on the ones you watch.",
      bn: "16টি তৈরি তালিকা, ভালো নগদ ডিভিডেন্ড থেকে 52 সপ্তাহের সর্বনিম্ন দাম পর্যন্ত, আর যেগুলোতে নজর রাখেন সেগুলোর প্রতিদিনের অ্যালার্ট।",
    },
  },
  {
    key: "compare",
    name: { en: "Stock compare", bn: "শেয়ার তুলনা" },
    line: {
      en: `Up to ${MAX_COMPARE} shares side by side, with our analysis of each.`,
      bn: `${MAX_COMPARE}টি পর্যন্ত শেয়ার পাশাপাশি, প্রতিটির বিশ্লেষণসহ।`,
    },
  },
  {
    key: "alerts",
    name: { en: "Watch rules and price alerts", bn: "নজরের নিয়ম আর দামের অ্যালার্ট" },
    line: {
      en: "As many as you want: a grade drop, a 5% fall, a dividend cut, the last day to buy. We tell you the same evening.",
      bn: "যত খুশি: গ্রেড নামা, 5% দরপতন, ডিভিডেন্ড কমা, কেনার শেষ দিন। আমরা সেদিন সন্ধ্যায়ই জানাই।",
    },
  },
  {
    key: "news",
    name: { en: "Updates on your shares", bn: "আপনার শেয়ারের খবর" },
    line: {
      en: "Results, warnings and dates on your shares, what they mean, a push the same evening and a short brief at 9 AM.",
      bn: "আপনার শেয়ারের আর্থিক ফল, সতর্কতা আর তারিখ, এর মানে, সেদিন সন্ধ্যায় ফোনে খবর আর সকাল 9টায় ছোট ব্রিফ।",
    },
  },
  {
    key: "foryou",
    name: { en: "Based on your shares", bn: "আপনার শেয়ার দেখে বাছাই" },
    line: {
      en: "Companies picked to match the shares you own and follow.",
      bn: "আপনার কেনা আর অনুসরণ করা শেয়ারের সঙ্গে মিলিয়ে বাছাই করা কোম্পানি।",
    },
  },
  {
    key: "research",
    name: { en: "Research reports", bn: "গবেষণা রিপোর্ট" },
    line: {
      en: "Six reports on the whole market: companies in trouble, auditor warnings, who is buying, and more.",
      bn: "পুরো বাজার নিয়ে 6টি রিপোর্ট: সমস্যায় থাকা কোম্পানি, নিরীক্ষকের সতর্কতা, কারা কিনছে, আরও।",
    },
  },
  {
    key: "portfolios",
    name: { en: "More portfolios", bn: "আরও পোর্টফোলিও" },
    line: {
      en: `Up to ${MAX_PORTFOLIOS} portfolios, and a yearly statement of your trades and dividends.`,
      bn: `${MAX_PORTFOLIOS}টি পর্যন্ত পোর্টফোলিও, আর লেনদেন ও ডিভিডেন্ডের বার্ষিক হিসাব।`,
    },
  },
];

export const SECTIONS = {
  list: { en: "What you get", bn: "যা যা পাবেন" },
  listNote: { en: "Both plans open everything below.", bn: "দুটি প্ল্যানেই নিচের সবকিছু খোলা।" },
  orQuarter: { en: `Or ৳${LOWEST_PRICE} for 3 months.`, bn: `অথবা 3 মাসের জন্য ৳${LOWEST_PRICE}।` },
  faq: { en: "Questions", bn: "প্রশ্ন" },
  help: { en: "A problem with a payment?", bn: "পেমেন্টে কোনো সমস্যা?" },
  helpLead: {
    en: "Sent money but Premium did not start, or sent the wrong amount? Tell us here, or email us.",
    bn: "টাকা পাঠিয়েছেন কিন্তু প্রিমিয়াম চালু হয়নি, বা ভুল পরিমাণ পাঠিয়েছেন? এখানে জানান, বা ইমেইল করুন।",
  },
  promises: { en: "How you pay", bn: "কীভাবে পেমেন্ট" },
  payments: { en: "Your payments", bn: "আপনার পেমেন্ট" },
} as const;

export const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: { en: "Does it renew by itself?", bn: "নিজে থেকে কি নবায়ন হয়?" },
    a: {
      en: "No. Nothing is ever taken from your account. A few days before your plan ends we remind you, and you pay again only if you want to.",
      bn: "না। আপনার অ্যাকাউন্ট থেকে কখনো নিজে থেকে টাকা কাটা হয় না। মেয়াদ শেষের কয়েক দিন আগে মনে করিয়ে দিই। চাইলে তবেই আবার পেমেন্ট করবেন।",
    },
  },
  {
    q: { en: "What happens when my plan ends?", bn: "মেয়াদ শেষ হলে কী হবে?" },
    a: {
      en: "Your account goes back to the free plan. The shares you follow and your alerts stay. You just can't add more than the free limits.",
      bn: "অ্যাকাউন্ট ফ্রি প্ল্যানে ফিরে যায়। অনুসরণ করা শেয়ার আর অ্যালার্ট থেকে যায়। শুধু ফ্রি সীমার বেশি যোগ করতে পারবেন না।",
    },
  },
  {
    q: { en: "Is this investment advice?", bn: "এটি কি বিনিয়োগ পরামর্শ?" },
    a: {
      en: "No. Everything on TopStockBD is information built from what companies publish. Please check a share yourself before you buy or sell.",
      bn: "না। TopStockBD-র সবকিছু কোম্পানির প্রকাশিত হিসাব থেকে তৈরি তথ্য। কেনা-বেচার আগে নিজে একবার যাচাই করে নিন।",
    },
  },
];
