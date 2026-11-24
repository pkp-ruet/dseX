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
 * v4): the page is the price, ONE list of what Premium gives (`FEATURES`, each
 * with one plain line and what the free plan gets), the plans and three
 * questions. No refund line on this page (user decision, same day). A new
 * Premium feature is a new row in `FEATURES`; keep each line to one sentence.
 * Limits say "as many as you want", never "unlimited" (the hard caps are 200
 * shares followed and 50 alerts).
 */
import { LOWEST_PRICE, PAID_PLANS } from "@/lib/premium-plans";
import { FREE_COMPARE, MAX_COMPARE } from "@/lib/compare";
import { freeN } from "@/lib/premium-line";

export type Bi = { en: string; bn: string };

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
export const PER_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : LOWEST_PRICE;

// The free plan's numbers, from THE Premium line (lib/premium-line.ts, the
// mirror of the backend's premium_line.py).
const FREE_ANALYSES = freeN("analysis");
const FREE_ALERTS = freeN("watch_rules");
const MAX_PORTFOLIOS = 6;

export const HERO = {
  eyebrow: { en: "TopStockBD Premium", bn: "TopStockBD প্রিমিয়াম" },
  title: { en: "Everything you get with Premium", bn: "প্রিমিয়ামে যা যা পাবেন" },
  lead: {
    en: "Premium opens every part of TopStockBD. Here is the full list.",
    bn: "প্রিমিয়াম TopStockBD-র সবকিছু খুলে দেয়। নিচে পুরো তালিকা।",
  },
  perMonth: { en: "a month on the 1-year plan", bn: "মাসে, 1 বছরের প্ল্যানে" },
  orMonthly: { en: `Or ৳${LOWEST_PRICE} for one month.`, bn: `অথবা এক মাসের জন্য ৳${LOWEST_PRICE}।` },
} as const;

/** THE Premium line, step 7 (2026-11-22): the three promises the Premium page
 *  leads with (`PremiumPromises`, the reader's own figures under each). */
export const THREE_PROMISES: { key: string; title: Bi; line: Bi }[] = [
  {
    key: "shares",
    title: { en: "Never miss what's coming to your shares", bn: "আপনার শেয়ারে যা আসছে, কিছুই মিস করবেন না" },
    line: {
      en: "Every result, warning, dividend and date on your shares, with what it means, sent the same evening. A short brief at 9 AM, and your own watch rules.",
      bn: "আপনার শেয়ারের প্রতিটি আর্থিক ফল, সতর্কতা, ডিভিডেন্ড আর তারিখ, এর মানে সহ, সেদিন সন্ধ্যায়ই। সকাল 9টায় ছোট ব্রিফ, আর আপনার নিজের নজরের নিয়ম।",
    },
  },
  {
    key: "own",
    title: { en: "Know what to do with what you own", bn: "যা কিনেছেন, তা নিয়ে কী করবেন জানুন" },
    line: {
      en: "A check on your whole portfolio: a verdict, a plan, and what to do with each share.",
      bn: "পুরো পোর্টফোলিওর যাচাই: একটি রায়, একটি পরিকল্পনা, আর প্রতিটি শেয়ার নিয়ে কী করবেন।",
    },
  },
  {
    key: "buy",
    title: { en: "Know before you buy", bn: "কেনার আগে জানুন" },
    line: {
      en: "Our analysis of every DSE share, today's Buy List, the screener's lists and our research.",
      bn: "ডিএসইর প্রতিটি শেয়ারের বিশ্লেষণ, আজকের কেনার তালিকা, স্ক্রিনারের তালিকা আর আমাদের গবেষণা।",
    },
  },
];

export const PROMISES: Bi[] = [
  { en: "Never renews by itself", bn: "নিজে থেকে নবায়ন হয় না" },
  { en: "bKash, Nagad or bank", bn: "বিকাশ, নগদ বা ব্যাংক" },
];

export type FeatureKey =
  | "analysis" | "portfolio" | "watchlist" | "dividends" | "buylist" | "screener"
  | "compare" | "alerts" | "news" | "foryou" | "research" | "portfolios";

export interface Feature {
  key: FeatureKey;
  name: Bi;
  line: Bi;
  /** What the free plan gets, said after "Free:". */
  free: Bi;
}

export const FEATURES: Feature[] = [
  {
    key: "analysis",
    name: { en: "Stock analysis", bn: "শেয়ারের বিশ্লেষণ" },
    line: {
      en: "Our full analysis of every DSE share: how strong the company is, the right price, and what could go wrong.",
      bn: "ডিএসইর প্রতিটি শেয়ারের পূর্ণ বিশ্লেষণ: কোম্পানি কতটা শক্তিশালী, ঠিক দাম কত, আর কী ঝুঁকি আছে।",
    },
    free: { en: `${FREE_ANALYSES} shares a month`, bn: `মাসে ${FREE_ANALYSES}টি শেয়ার` },
  },
  {
    key: "portfolio",
    name: { en: "Portfolio analysis", bn: "পোর্টফোলিও বিশ্লেষণ" },
    line: {
      en: "A full check of your shares every day, with a plan for what to do.",
      bn: "প্রতিদিন আপনার শেয়ারের পূর্ণ যাচাই, সঙ্গে কী করবেন তার পরিকল্পনা।",
    },
    free: { en: "your money, shares and grade", bn: "টাকার হিসাব, শেয়ার আর গ্রেড" },
  },
  {
    key: "dividends",
    name: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
    line: {
      en: "Every dividend coming up, the ones coming to your own shares in taka, and a reminder on the last day to buy.",
      bn: "আসন্ন সব ডিভিডেন্ড, আপনার নিজের শেয়ারে কত টাকা আসছে, আর কেনার শেষ দিনে মনে করিয়ে দেওয়া।",
    },
    free: { en: "this week's record dates", bn: "এই সপ্তাহের রেকর্ড ডেট" },
  },
  {
    key: "buylist",
    name: { en: "Buy List", bn: "কেনার তালিকা" },
    line: { en: "Today's shares worth buying, with the reason for each.", bn: "আজ কেনার মতো শেয়ার, প্রতিটির কারণসহ।" },
    free: { en: "1 share a day", bn: "দিনে 1টি শেয়ার" },
  },
  {
    key: "screener",
    name: { en: "Ready lists", bn: "তৈরি তালিকা" },
    line: {
      en: "16 ready lists, from 52-week high to our own picks, and lists saved with a daily alert.",
      bn: "16টি তৈরি তালিকা, 52 সপ্তাহের সর্বোচ্চ থেকে আমাদের নিজের বাছাই পর্যন্ত, আর প্রতিদিনের অ্যালার্টসহ সেভ করা তালিকা।",
    },
    free: { en: "how many shares each list has", bn: "প্রতিটি তালিকায় কতটি শেয়ার" },
  },
  {
    key: "compare",
    name: { en: "Stock compare", bn: "শেয়ার তুলনা" },
    line: {
      en: `Put up to ${MAX_COMPARE} shares side by side, with our analysis of each.`,
      bn: `${MAX_COMPARE}টি পর্যন্ত শেয়ার পাশাপাশি, প্রতিটির বিশ্লেষণসহ।`,
    },
    free: { en: "every figure, no analysis", bn: "সব সংখ্যা, বিশ্লেষণ ছাড়া" },
  },
  {
    key: "alerts",
    name: { en: "Watch rules and price alerts", bn: "নজরের নিয়ম আর দামের অ্যালার্ট" },
    line: {
      en: "Tell us what matters on each share: a grade drop, a 5% fall, a dividend cut, the last day to buy. We tell you the same evening.",
      bn: "প্রতিটি শেয়ারে কী জানতে চান বলুন: গ্রেড নামা, 5% দরপতন, ডিভিডেন্ড কমা, কেনার শেষ দিন। আমরা সেদিন সন্ধ্যায়ই জানাই।",
    },
    free: { en: `${FREE_ALERTS} in all, seen in Updates`, bn: `সব মিলিয়ে ${FREE_ALERTS}টি, আপডেটে দেখা যায়` },
  },
  {
    key: "news",
    name: { en: "Updates on your shares", bn: "আপনার শেয়ারের খবর" },
    line: {
      en: "Which of your shares had results, a warning or a record date, what it means, and a push the same evening. A short brief at 9 AM.",
      bn: "আপনার কোন শেয়ারে আর্থিক ফল, সতর্কতা বা রেকর্ড ডেট এল, এর মানে কী, আর সেদিন সন্ধ্যায় ফোনে খবর। সকাল 9টায় ছোট একটি ব্রিফ।",
    },
    free: { en: "how many, one a week, a Friday push", bn: "কয়টি, সপ্তাহে একটি, শুক্রবারে একটি খবর" },
  },
  {
    key: "foryou",
    name: { en: "Based on your shares", bn: "আপনার শেয়ার দেখে বাছাই" },
    line: {
      en: "Companies picked to match the shares you own and follow.",
      bn: "আপনার কেনা আর অনুসরণ করা শেয়ারের সঙ্গে মিলিয়ে বাছাই করা কোম্পানি।",
    },
    free: { en: "only how many", bn: "শুধু কয়টি" },
  },
  {
    key: "research",
    name: { en: "Research reports", bn: "গবেষণা রিপোর্ট" },
    line: {
      en: "Six reports on the whole market: companies in trouble, auditor warnings, who is buying, and more.",
      bn: "পুরো বাজার নিয়ে 6টি রিপোর্ট: সমস্যায় থাকা কোম্পানি, নিরীক্ষকের সতর্কতা, কারা কিনছে, আরও।",
    },
    free: { en: "key numbers only", bn: "শুধু মূল সংখ্যা" },
  },
  {
    key: "portfolios",
    name: { en: "More portfolios", bn: "আরও পোর্টফোলিও" },
    line: {
      en: `Up to ${MAX_PORTFOLIOS} portfolios, and a yearly statement of your trades and dividends.`,
      bn: `${MAX_PORTFOLIOS}টি পর্যন্ত পোর্টফোলিও, আর লেনদেন ও ডিভিডেন্ডের বার্ষিক হিসাব।`,
    },
    free: { en: "1 portfolio", bn: "1টি পোর্টফোলিও" },
  },
];

export const SECTIONS = {
  list: { en: "What's in Premium", bn: "প্রিমিয়ামে কী আছে" },
  free: { en: "Free", bn: "ফ্রি" },
  plan: { en: "Choose a plan", bn: "একটি প্ল্যান বেছে নিন" },
  faq: { en: "Questions", bn: "প্রশ্ন" },
  help: { en: "A problem with a payment?", bn: "পেমেন্টে কোনো সমস্যা?" },
  helpLead: {
    en: "Sent money but Premium did not start, or sent the wrong amount? Tell us here, or email us.",
    bn: "টাকা পাঠিয়েছেন কিন্তু প্রিমিয়াম চালু হয়নি, বা ভুল পরিমাণ পাঠিয়েছেন? এখানে জানান, বা ইমেইল করুন।",
  },
  promises: { en: "How you pay", bn: "কীভাবে পেমেন্ট" },
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
