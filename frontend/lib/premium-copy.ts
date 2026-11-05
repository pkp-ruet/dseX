/**
 * Every word on /premium, in English and everyday Bengali. A plain module so
 * the server page can build its FAQ JSON-LD from the same English the body
 * shows. One language per page (2026-10-28): the body renders each pair with
 * `<T>`, so the reader sees only their language. Western digits in Bengali.
 *
 * 2026-11-04 (user: "make the premium page more organized, explain clearly
 * what user gets"): the page says what you get as FIVE groups (`GROUPS`), each
 * built the same way — the question it answers, what you get, a made-up
 * example of what you see, and what stays free there — then one short
 * side-by-side table (`TABLE`, every cell a few words). Only live features.
 */
import { LOWEST_PRICE, PAID_PLANS } from "@/lib/premium-plans";
import type { Job } from "@/lib/premium-jobs";

export type Bi = { en: string; bn: string };

const YEARLY = PAID_PLANS.find((p) => p.key === "yearly");
export const PER_MONTH = YEARLY ? Math.round(YEARLY.amount / 12) : LOWEST_PRICE;

export const HERO = {
  eyebrow: { en: "Premium", bn: "প্রিমিয়াম" },
  title: {
    en: "Our answers on every share, and on your portfolio",
    bn: "প্রতিটি শেয়ার আর আপনার পোর্টফোলিও নিয়ে আমাদের উত্তর",
  },
  lead: {
    en: "Prices and figures are free for everyone. Premium reads them for you: how strong a company really is and why, whether your portfolio is in good shape, and what changed on your shares today. Always with the reason, in plain words.",
    bn: "দাম আর সব হিসাব সবার জন্য ফ্রি। প্রিমিয়াম সেগুলো আপনার হয়ে পড়ে দেয়: কোম্পানিটি আসলে কতটা শক্তিশালী আর কেন, আপনার পোর্টফোলিও ঠিক আছে কি না, আর আজ আপনার শেয়ারে কী বদলাল। সব সময় কারণসহ, সহজ ভাষায়।",
  },
  from: { en: "From", bn: "মাত্র" },
  perMonth: { en: "a month on the yearly plan", bn: "মাসে, বছরের প্ল্যানে" },
  orMonthly: { en: `or ৳${LOWEST_PRICE} for a single month`, bn: `অথবা এক মাসের জন্য ৳${LOWEST_PRICE}` },
} as const;

export const PROMISES: Bi[] = [
  { en: "Pay by bKash, Nagad or bank", bn: "বিকাশ, নগদ বা ব্যাংকে পেমেন্ট" },
  { en: "It never renews by itself", bn: "নিজে থেকে নবায়ন হয় না" },
  { en: "Full refund within 7 days", bn: "7 দিনের মধ্যে পুরো টাকা ফেরত" },
];

export type GroupKey = "share" | "portfolio" | "daily" | "find" | "limits";
export type Tone = "good" | "watch" | "bad";

export interface Group {
  key: GroupKey;
  /** The Premium job it belongs to (lib/premium-jobs.ts); none for the limits. */
  job?: Job;
  /** What you get, as a name. */
  name: Bi;
  /** The question it answers for you. */
  question: Bi;
  lead: Bi;
  items: { name: Bi; line: Bi }[];
  /** A made-up example of what a Premium reader sees — never a real share. */
  example?: { label: Bi; title: Bi; word?: Bi; tone?: Tone; line: Bi };
  /** What a free reader has in the same place. */
  free: Bi;
  /** "free-report" = today's free full report, worked out in the browser. */
  link?: { href: string; label: Bi };
}

export const GROUPS: Group[] = [
  {
    key: "share",
    job: "understand",
    name: { en: "Our analysis of any share", bn: "যেকোনো শেয়ারের পূর্ণ বিশ্লেষণ" },
    question: { en: "How strong is the company, and why?", bn: "কোম্পানিটি কতটা শক্তিশালী, আর কেন?" },
    lead: {
      en: "On every DSE share, we read five years of its accounts, this year's results, its notices and its price, and explain them in plain words.",
      bn: "ডিএসইর প্রতিটি শেয়ারে কোম্পানির পাঁচ বছরের হিসাব, এ বছরের ফল, নোটিশ আর দাম আমরা আপনার হয়ে পড়ি, তারপর সহজ ভাষায় বুঝিয়ে বলি।",
    },
    items: [
      {
        name: { en: "Our grade, explained", bn: "আমাদের গ্রেড, ব্যাখ্যাসহ" },
        line: {
          en: "From strong all round to mostly weak, and the four things it rests on: profit, finances, business and dividend.",
          bn: "সব দিকে শক্তিশালী থেকে বেশিরভাগ দিকে দুর্বল, আর যে চারটি জিনিস দেখে এই গ্রেড: মুনাফা, আর্থিক অবস্থা, ব্যবসা আর ডিভিডেন্ড।",
        },
      },
      {
        name: { en: "Six parts, every figure shown", bn: "ছয়টি অংশ, সব সংখ্যা চোখের সামনে" },
        line: {
          en: "Profit, finances, business, dividend, price and safety: each with its numbers, a picture and what they mean.",
          bn: "মুনাফা, আর্থিক অবস্থা, ব্যবসা, ডিভিডেন্ড, দাম আর নিরাপত্তা: প্রতিটির সংখ্যা, ছবি আর তার মানে।",
        },
      },
      {
        name: { en: "A fair price and our buy price", bn: "ন্যায্য দাম আর আমাদের কেনার দাম" },
        line: {
          en: "What the share should be worth, the price we would buy under, and an alert when it gets there.",
          bn: "শেয়ারটির দাম কত হওয়া উচিত, কোন দামের নিচে আমরা কিনতাম, আর দাম সেখানে এলে অ্যালার্ট।",
        },
      },
      {
        name: { en: "Every warning, by name", bn: "প্রতিটি সতর্কতা, নাম ধরে" },
        line: {
          en: "Up to 16 safety checks, from the auditor's opinion to loans, owners selling and old accounts.",
          bn: "16টি পর্যন্ত নিরাপত্তা যাচাই: নিরীক্ষকের মত থেকে ঋণ, উদ্যোক্তাদের শেয়ার বিক্রি আর পুরনো হিসাব পর্যন্ত।",
        },
      },
      {
        name: { en: "Our conclusion", bn: "আমাদের সিদ্ধান্ত" },
        line: {
          en: "Whether to buy it today, the case for and against, and what would change our answer.",
          bn: "আজ কেনা যায় কি না, পক্ষে আর বিপক্ষের যুক্তি, আর কী হলে আমাদের উত্তর বদলাবে।",
        },
      },
      {
        name: { en: "What it would do to your portfolio", bn: "কিনলে আপনার পোর্টফোলিওর কী হবে" },
        line: {
          en: "Before you buy, see how one buy changes your grade, your spread and your dividends.",
          bn: "কেনার আগেই দেখুন, একবার কিনলে আপনার গ্রেড, টাকার বণ্টন আর ডিভিডেন্ড কেমন বদলায়।",
        },
      },
    ],
    example: {
      label: { en: "On a share page", bn: "শেয়ারের পেজে" },
      title: { en: "Profit · Is it making more money?", bn: "মুনাফা · মুনাফা কি বাড়ছে?" },
      word: { en: "Weak", bn: "দুর্বল" },
      tone: "bad",
      line: {
        en: "Profit has fallen since 2022. This year so far it is up 28%, so it may be recovering.",
        bn: "2022 সালের পর থেকে মুনাফা কমেছে। এ বছর এখন পর্যন্ত তা 28% বেড়েছে, তাই হয়তো ঘুরে দাঁড়াচ্ছে।",
      },
    },
    free: {
      en: "The price, the chart and every figure on every share, and 3 full reports a month on shares you choose.",
      bn: "প্রতিটি শেয়ারের দাম, চার্ট আর সব হিসাব, আর আপনার বাছাই করা শেয়ারে মাসে 3টি পূর্ণ রিপোর্ট।",
    },
    link: { href: "free-report", label: { en: "See today's free full report", bn: "আজকের ফ্রি পূর্ণ রিপোর্ট দেখুন" } },
  },
  {
    key: "portfolio",
    job: "watch",
    name: { en: "A full check of your portfolio", bn: "আপনার পোর্টফোলিওর পূর্ণ যাচাই" },
    question: { en: "Is your portfolio in good shape, and what should you do?", bn: "আপনার পোর্টফোলিও কি ঠিক আছে, আর কী করবেন?" },
    lead: {
      en: "We check the shares you own after every close and show you what needs your attention first.",
      bn: "প্রতিদিন বাজার বন্ধের পর আপনার শেয়ারগুলো আমরা যাচাই করি, আর দেখাই কোনটিতে আগে নজর দেওয়া দরকার।",
    },
    items: [
      {
        name: { en: "Our answer, with the reasons", bn: "কারণসহ আমাদের উত্তর" },
        line: {
          en: "In good shape, Mostly fine, Needs work or At risk, from your companies, your spread, the prices you paid and what to watch.",
          bn: "ভালো অবস্থায়, মোটামুটি ঠিক আছে, কাজ দরকার, নাকি ঝুঁকিতে। দেখি আপনার কোম্পানি, টাকার বণ্টন, কেনার দাম আর যা নজরে রাখতে হবে।",
        },
      },
      {
        name: { en: "Which shares to decide on", bn: "কোন শেয়ার নিয়ে সিদ্ধান্ত নেবেন" },
        line: {
          en: "The shares marked Buy more or Sell, and the warnings on each of your shares.",
          bn: "কোন শেয়ারে আরও কেনার বা বিক্রির সংকেত, আর আপনার প্রতিটি শেয়ারের সতর্কতা।",
        },
      },
      {
        name: { en: "Your shares in a loss", bn: "লোকসানে থাকা শেয়ার" },
        line: {
          en: "Is it the company or only the price, what price gets your money back, and what buying more would do.",
          bn: "সমস্যা কোম্পানিতে নাকি শুধু দামে, কোন দামে আপনার টাকা ফেরত আসবে, আর আরও কিনলে কী হবে।",
        },
      },
      {
        name: { en: "Your plan", bn: "আপনার পরিকল্পনা" },
        line: {
          en: "What to do first, what would lift your grade, what to buy next and what to do with each share.",
          bn: "প্রথমে কী করবেন, কীসে গ্রেড বাড়বে, এরপর কী কিনবেন, আর প্রতিটি শেয়ার নিয়ে কী করবেন।",
        },
      },
      {
        name: { en: "Try it before you act", bn: "করার আগে দেখে নিন" },
        line: {
          en: "Test a buy or a sale and see your new grade first.",
          bn: "কেনা বা বেচা আগে পরীক্ষা করুন, নতুন গ্রেড কী হবে দেখে নিন।",
        },
      },
      {
        name: { en: "Up to 6 portfolios and a yearly statement", bn: "6টি পর্যন্ত পোর্টফোলিও আর বার্ষিক হিসাব" },
        line: {
          en: "Keep a parent's or spouse's BO account apart, and get the year's buys, sales and dividends ready to print.",
          bn: "মা-বাবা বা স্বামী/স্ত্রীর বিও অ্যাকাউন্ট আলাদা রাখুন, আর বছরের সব কেনা, বেচা ও ডিভিডেন্ড প্রিন্টের জন্য তৈরি পান।",
        },
      },
    ],
    example: {
      label: { en: "On your portfolio", bn: "আপনার পোর্টফোলিওতে" },
      title: { en: "Is your portfolio in good shape?", bn: "আপনার পোর্টফোলিও কি ঠিক আছে?" },
      word: { en: "Mostly fine · Grade B", bn: "মোটামুটি ঠিক আছে · গ্রেড B" },
      tone: "watch",
      line: {
        en: "Do this first: one share holds 38% of your money. Bringing it down to a quarter would lift your grade to A.",
        bn: "প্রথমে এটি করুন: আপনার টাকার 38% একটি শেয়ারে। এটি এক-চতুর্থাংশে নামালে গ্রেড হবে A।",
      },
    },
    free: {
      en: "Your money, your shares, your grade, the money you made and your dividends, and how many things our check found.",
      bn: "আপনার টাকা, শেয়ার, গ্রেড, আয় আর ডিভিডেন্ড, আর আমাদের যাচাইয়ে কতগুলো বিষয় পাওয়া গেল।",
    },
    link: { href: "/sample-portfolio/diversified", label: { en: "See the full check on a sample portfolio", bn: "একটি নমুনা পোর্টফোলিওতে পূর্ণ যাচাই দেখুন" } },
  },
  {
    key: "daily",
    job: "watch",
    name: { en: "News on your shares, the same day", bn: "আপনার শেয়ারের খবর, সেদিনই" },
    question: { en: "What changed on your shares today?", bn: "আজ আপনার শেয়ারে কী বদলাল?" },
    lead: {
      en: "You don't have to look. When something happens on a share you own or follow, we tell you that day, and what it means for you.",
      bn: "আপনাকে খুঁজতে হবে না। আপনার কেনা বা অনুসরণ করা শেয়ারে কিছু ঘটলে সেদিনই জানাই, আর আপনার জন্য এর মানে কী।",
    },
    items: [
      {
        name: { en: "A phone notification the same day", bn: "সেদিনই ফোনে নোটিফিকেশন" },
        line: {
          en: "New results, a grade change, a new warning, our answer changing, a record date coming, a big fall, or a share back to the price you paid.",
          bn: "নতুন আর্থিক ফল, গ্রেড বদল, নতুন সতর্কতা, আমাদের উত্তর বদল, রেকর্ড ডেট আসছে, বড় দরপতন, বা শেয়ারের দাম আপনার কেনা দামে ফিরে এলে।",
        },
      },
      {
        name: { en: "A 9 AM brief before the market opens", bn: "বাজার খোলার আগে সকাল 9টার খবর" },
        line: {
          en: "Results posted overnight, results meetings today, and the last day to buy before a dividend.",
          bn: "রাতে প্রকাশিত ফল, আজকের ফল-সভা, আর ডিভিডেন্ডের আগে কেনার শেষ দিন।",
        },
      },
      {
        name: { en: "The whole Friday letter", bn: "পুরো শুক্রবারের চিঠি" },
        line: {
          en: "Your shares this week, the market in five lines, new names on our lists and next week's dates.",
          bn: "এ সপ্তাহে আপনার শেয়ার, পাঁচ লাইনে বাজার, আমাদের তালিকায় নতুন নাম, আর আগামী সপ্তাহের তারিখ।",
        },
      },
      {
        name: { en: "What each result means", bn: "প্রতিটি আর্থিক ফলের মানে" },
        line: {
          en: "On results day, one plain sentence on what it means. Before it, what the report must show.",
          bn: "ফল প্রকাশের দিন এক লাইনে এর মানে। তার আগে, প্রতিবেদনে কী দেখাতে হবে।",
        },
      },
      {
        name: { en: "Reminders you choose", bn: "আপনার বাছাই করা রিমাইন্ডার" },
        line: {
          en: "The last day to buy before a dividend, on any share you pick.",
          bn: "আপনার বেছে নেওয়া যেকোনো শেয়ারে ডিভিডেন্ডের আগে কেনার শেষ দিন।",
        },
      },
    ],
    example: {
      label: { en: "On your phone, after the close", bn: "বাজার বন্ধের পর, আপনার ফোনে" },
      title: { en: "2 things on your shares today", bn: "আজ আপনার শেয়ারে 2টি খবর" },
      line: {
        en: "One posted its results: profit up 17% this year. Another has a record date in 2 days, worth ৳1,250 on your shares.",
        bn: "একটির আর্থিক ফল এসেছে: এ বছর মুনাফা 17% বেশি। আরেকটির রেকর্ড ডেট 2 দিন পর, আপনার শেয়ারে ৳1,250।",
      },
    },
    free: {
      en: "Every update on your dashboard, watchlist and Desk, and up to 3 phone notifications a week.",
      bn: "ড্যাশবোর্ড, ওয়াচলিস্ট আর ডেস্কে প্রতিটি খবর, আর সপ্তাহে সর্বোচ্চ 3টি ফোন নোটিফিকেশন।",
    },
  },
  {
    key: "find",
    job: "find",
    name: { en: "Shares worth a look", bn: "দেখার মতো শেয়ার" },
    question: { en: "Which shares should you look at?", bn: "কোন শেয়ারগুলো দেখবেন?" },
    lead: {
      en: "We check every company on the DSE each day and give you the full lists, with the reason each share is there.",
      bn: "প্রতিদিন ডিএসইর সব কোম্পানি আমরা যাচাই করি, আর পুরো তালিকা দিই, প্রতিটি শেয়ার কেন আছে তা সহ।",
    },
    items: [
      {
        name: { en: "Picked for you", bn: "আপনার জন্য বাছাই" },
        line: {
          en: "10 to 15 shares a day that passed every safety check, matched to the shares you own and follow, each with one honest risk.",
          bn: "দিনে 10 থেকে 15টি শেয়ার, যেগুলো সব নিরাপত্তা যাচাই পার হয়েছে, আপনার কেনা ও অনুসরণ করা শেয়ারের সঙ্গে মিলিয়ে, প্রতিটির একটি খোলামেলা ঝুঁকিসহ।",
        },
      },
      {
        name: { en: "Six research reports", bn: "ছয়টি গবেষণা প্রতিবেদন" },
        line: {
          en: "Companies with serious problems, what the auditors found, the results season, who is buying and selling, whether the profit is real, and dividends you can count on.",
          bn: "গুরুতর সমস্যার কোম্পানি, নিরীক্ষকেরা কী পেয়েছেন, ফলের মৌসুম, কে কিনছে আর কে বেচছে, মুনাফা আসল কি না, আর ভরসার ডিভিডেন্ড।",
        },
      },
      {
        name: { en: "The screener, with our view", bn: "আমাদের মতসহ স্ক্রিনার" },
        line: {
          en: "Filter by our grade, our price check and serious warnings. Save up to 5 screens and hear when a new share matches.",
          bn: "আমাদের গ্রেড, দামের যাচাই আর গুরুতর সতর্কতা দিয়ে ফিল্টার করুন। 5টি পর্যন্ত স্ক্রিন সেভ করুন, নতুন শেয়ার মিললে জানবেন।",
        },
      },
      {
        name: { en: "The dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
        line: {
          en: "Every DSE dividend coming up: the cash a share and the last day to buy, who we expect to declare next, a reminder before the last day, and your dividend income by month.",
          bn: "ডিএসইর সামনের সব ডিভিডেন্ড: শেয়ারপ্রতি নগদ আর কেনার শেষ দিন, এরপর কে ঘোষণা দিতে পারে, শেষ দিনের আগে রিমাইন্ডার, আর মাস অনুযায়ী আপনার ডিভিডেন্ড আয়।",
        },
      },
      {
        name: { en: "Market and sector reads", bn: "বাজার আর সেক্টরের মূল্যায়ন" },
        line: {
          en: "Why a share rising with no news is a worry, what puts a company close to Z, and the best value in each sector.",
          bn: "খবর ছাড়া বাড়তে থাকা শেয়ার কেন চিন্তার, কোন কোম্পানি কেন Z-এর কাছাকাছি, আর প্রতিটি সেক্টরে সবচেয়ে ভালো দামে কোনটি।",
        },
      },
    ],
    example: {
      label: { en: "Picked for you", bn: "আপনার জন্য বাছাই" },
      title: { en: "Stronger than a share you own", bn: "আপনার একটি শেয়ারের চেয়ে শক্তিশালী" },
      line: {
        en: "The same business as one of your shares, a stronger company at a lower price, and it pays about 5% a year in cash. Watch out: its profit grew slowly this year.",
        bn: "আপনার একটি শেয়ারের মতোই ব্যবসা, তবে কোম্পানিটি বেশি শক্তিশালী, দামও কম, আর বছরে নগদে প্রায় 5% দেয়। খেয়াল রাখুন: এ বছর মুনাফা ধীরে বেড়েছে।",
      },
    },
    free: {
      en: "The key numbers of each research report, every screener filter on public figures, and each share's own dividends on its page.",
      bn: "প্রতিটি গবেষণা প্রতিবেদনের মূল সংখ্যা, সাধারণ তথ্যের সব স্ক্রিনার ফিল্টার, আর প্রতিটি শেয়ারের নিজের ডিভিডেন্ড তার পেজে।",
    },
    link: { href: "/stock-insights", label: { en: "See Premium research", bn: "প্রিমিয়াম গবেষণা দেখুন" } },
  },
  {
    key: "limits",
    name: { en: "No limits", bn: "কোনো সীমা নেই" },
    question: { en: "Follow everything you care about", bn: "যা দরকার, সব অনুসরণ করুন" },
    lead: {
      en: "A free account has a few caps. Premium lifts them.",
      bn: "ফ্রি অ্যাকাউন্টে কিছু সীমা আছে। প্রিমিয়ামে সেগুলো থাকে না।",
    },
    items: [],
    free: {
      en: "Every share you own fits in a free portfolio. There is no cap on that.",
      bn: "আপনার সব শেয়ার ফ্রি পোর্টফোলিওতেই রাখা যায়। তাতে কোনো সীমা নেই।",
    },
  },
];

/** The "No limits" group as tiles: what you have free, what Premium gives. */
export const LIMITS: { what: Bi; free: Bi; premium: Bi }[] = [
  { what: { en: "Shares on your watchlist", bn: "ওয়াচলিস্টে শেয়ার" }, free: { en: "5", bn: "5টি" }, premium: { en: "No limit", bn: "সীমা নেই" } },
  { what: { en: "Price alerts", bn: "প্রাইস অ্যালার্ট" }, free: { en: "3 at a time", bn: "একসঙ্গে 3টি" }, premium: { en: "No limit", bn: "সীমা নেই" } },
  { what: { en: "TopStock AI questions", bn: "TopStock AI-তে প্রশ্ন" }, free: { en: "10 a day", bn: "দিনে 10টি" }, premium: { en: "No limit", bn: "সীমা নেই" } },
  { what: { en: "Portfolios", bn: "পোর্টফোলিও" }, free: { en: "1", bn: "1টি" }, premium: { en: "Up to 6", bn: "6টি পর্যন্ত" } },
];

/** A table cell: words, or `true` = included, `false` = not included. */
export type Cell = Bi | boolean;

/**
 * Free and Premium, side by side — one short line per thing, grouped like
 * `GROUPS` (always open, user decision 2026-10-27). Keep every cell to a few
 * words; the groups above carry the detail.
 */
export const TABLE: { group: GroupKey; rows: { what: Bi; free: Cell; premium: Cell }[] }[] = [
  {
    group: "share",
    rows: [
      { what: { en: "Price, chart and every figure", bn: "দাম, চার্ট আর সব হিসাব" }, free: true, premium: true },
      {
        what: { en: "Full report with our answer", bn: "আমাদের উত্তরসহ পূর্ণ রিপোর্ট" },
        free: { en: "3 a month", bn: "মাসে 3টি" },
        premium: { en: "Every share", bn: "প্রতিটি শেয়ারে" },
      },
      { what: { en: "Fair price and our buy price", bn: "ন্যায্য দাম আর কেনার দাম" }, free: false, premium: true },
      { what: { en: "Written analysis", bn: "লেখা বিশ্লেষণ" }, free: false, premium: true },
    ],
  },
  {
    group: "portfolio",
    rows: [
      { what: { en: "Your money, shares and grade", bn: "আপনার টাকা, শেয়ার আর গ্রেড" }, free: true, premium: true },
      {
        what: { en: "The full check and your plan", bn: "পূর্ণ যাচাই আর পরিকল্পনা" },
        free: { en: "How many things we found", bn: "কতগুলো বিষয় পাওয়া গেল" },
        premium: { en: "Every answer and the plan", bn: "প্রতিটি উত্তর আর পরিকল্পনা" },
      },
      { what: { en: "Test a buy or a sale", bn: "কেনা-বেচা আগে পরীক্ষা" }, free: false, premium: true },
      { what: { en: "Yearly statement", bn: "বার্ষিক হিসাব" }, free: false, premium: true },
    ],
  },
  {
    group: "daily",
    rows: [
      { what: { en: "Updates on your dashboard and Desk", bn: "ড্যাশবোর্ড আর ডেস্কে খবর" }, free: true, premium: true },
      {
        what: { en: "Phone notifications", bn: "ফোনে নোটিফিকেশন" },
        free: { en: "Up to 3 a week", bn: "সপ্তাহে সর্বোচ্চ 3টি" },
        premium: { en: "Every one, the same day", bn: "প্রতিটি, সেদিনই" },
      },
      { what: { en: "9 AM brief", bn: "সকাল 9টার খবর" }, free: false, premium: true },
      {
        what: { en: "Friday letter", bn: "শুক্রবারের চিঠি" },
        free: { en: "Your shares only", bn: "শুধু আপনার শেয়ার" },
        premium: { en: "The whole letter", bn: "পুরো চিঠি" },
      },
      {
        what: { en: "Quarterly results", bn: "প্রান্তিকের ফল" },
        free: { en: "Every result and date", bn: "সব ফল আর তারিখ" },
        premium: { en: "What each one means", bn: "প্রতিটির মানে" },
      },
    ],
  },
  {
    group: "find",
    rows: [
      {
        what: { en: "Picked for you", bn: "আপনার জন্য বাছাই" },
        free: { en: "How many we chose", bn: "কতগুলো বাছাই হলো" },
        premium: { en: "All 10 to 15, with reasons", bn: "10 থেকে 15টিই, কারণসহ" },
      },
      {
        what: { en: "Research reports", bn: "গবেষণা প্রতিবেদন" },
        free: { en: "The key numbers", bn: "মূল সংখ্যাগুলো" },
        premium: { en: "Every company, and why", bn: "প্রতিটি কোম্পানি, আর কেন" },
      },
      {
        what: { en: "Stock screener", bn: "স্টক স্ক্রিনার" },
        free: { en: "Every public figure", bn: "সাধারণ সব তথ্য" },
        premium: { en: "Plus our view, 5 saved screens", bn: "সঙ্গে আমাদের মত, 5টি সেভ করা স্ক্রিন" },
      },
      {
        what: { en: "Dividend calendar", bn: "ডিভিডেন্ড ক্যালেন্ডার" },
        free: { en: "Each share's own, on its page", bn: "প্রতিটি শেয়ারেরটা, তার পেজে" },
        premium: { en: "Every dividend coming up, who pays next", bn: "সামনের সব ডিভিডেন্ড, এরপর কে দেবে" },
      },
    ],
  },
  {
    group: "limits",
    rows: [
      {
        what: { en: "Watchlist", bn: "ওয়াচলিস্ট" },
        free: { en: "5 shares", bn: "5টি শেয়ার" },
        premium: { en: "No limit", bn: "সীমা নেই" },
      },
      {
        what: { en: "Price alerts", bn: "প্রাইস অ্যালার্ট" },
        free: { en: "3 at a time", bn: "একসঙ্গে 3টি" },
        premium: { en: "No limit", bn: "সীমা নেই" },
      },
      {
        what: { en: "TopStock AI", bn: "TopStock AI" },
        free: { en: "10 a day", bn: "দিনে 10টি" },
        premium: { en: "No limit", bn: "সীমা নেই" },
      },
      {
        what: { en: "Portfolios", bn: "পোর্টফোলিও" },
        free: { en: "1", bn: "1টি" },
        premium: { en: "Up to 6", bn: "6টি পর্যন্ত" },
      },
    ],
  },
];

export const STEPS: { title: Bi; sub: Bi }[] = [
  { title: { en: "Choose a plan", bn: "প্ল্যান বেছে নিন" }, sub: { en: "1 month, 6 months or 1 year", bn: "1 মাস, 6 মাস বা 1 বছর" } },
  { title: { en: "Send the money", bn: "টাকা পাঠান" }, sub: { en: "By bKash, Nagad or bank transfer", bn: "বিকাশ, নগদ বা ব্যাংক ট্রান্সফারে" } },
  { title: { en: "Tell us how you paid", bn: "কীভাবে পাঠিয়েছেন জানান" }, sub: { en: "Premium starts at once", bn: "প্রিমিয়াম সঙ্গে সঙ্গে চালু হয়" } },
];

export const SECTIONS = {
  what: { en: "What you get with Premium", bn: "প্রিমিয়ামে যা পাবেন" },
  whatLead: {
    en: "Five things. Prices, charts and every figure stay free for everyone.",
    bn: "পাঁচটি জিনিস। দাম, চার্ট আর সব হিসাব সবার জন্য ফ্রি থাকে।",
  },
  examples: {
    en: "The examples below are made up to show what you see. They are not real shares.",
    bn: "নিচের উদাহরণগুলো বোঝানোর জন্য বানানো, কোনো আসল শেয়ার নয়।",
  },
  youGet: { en: "What you get", bn: "যা পাবেন" },
  example: { en: "Example", bn: "উদাহরণ" },
  freePlan: { en: "Free plan", bn: "ফ্রি প্ল্যান" },
  how: { en: "Start in three steps", bn: "তিন ধাপে শুরু করুন" },
  plan: { en: "Choose your plan", bn: "আপনার প্ল্যান বেছে নিন" },
  planLead: { en: "The longer the plan, the less you pay each month.", bn: "প্ল্যান যত লম্বা, প্রতি মাসের খরচ তত কম।" },
  refund: { en: "Refund policy", bn: "রিফান্ড নীতি" },
  help: { en: "A problem with a payment?", bn: "পেমেন্টে কোনো সমস্যা?" },
  helpLead: {
    en: "Sent money but Premium did not start, or sent the wrong amount? Tell us here, or email us.",
    bn: "টাকা পাঠিয়েছেন কিন্তু প্রিমিয়াম চালু হয়নি, বা ভুল পরিমাণ পাঠিয়েছেন? এখানে জানান, বা ইমেইল করুন।",
  },
  compare: { en: "Free and Premium, side by side", bn: "ফ্রি আর প্রিমিয়াম, পাশাপাশি" },
  compareLead: { en: "Everything above, in one table.", bn: "ওপরের সবকিছু, এক টেবিলে।" },
  free: { en: "Free", bn: "ফ্রি" },
  premium: { en: "Premium", bn: "প্রিমিয়াম" },
  included: { en: "Included", bn: "আছে" },
  notIncluded: { en: "Not included", bn: "নেই" },
  faq: { en: "Common questions", bn: "সাধারণ প্রশ্ন" },
  closing: { en: "Get our answers on every share", bn: "প্রতিটি শেয়ারে আমাদের উত্তর পান" },
  closingLead: {
    en: "Choose a plan and pay by bKash, Nagad or bank transfer. Premium starts straight away.",
    bn: "প্ল্যান বেছে নিন আর বিকাশ, নগদ বা ব্যাংক ট্রান্সফারে পেমেন্ট করুন। প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
  },
  feature: { en: "What you get", bn: "যা পাবেন" },
  promises: { en: "Our promises", bn: "আমাদের প্রতিশ্রুতি" },
  keys: {
    en: "Not sure yet? A free account opens 3 full reports a month, on any shares you choose.",
    bn: "এখনো ঠিক করেননি? ফ্রি অ্যাকাউন্টে মাসে 3টি পূর্ণ রিপোর্ট খোলা যায়, আপনার পছন্দের যেকোনো শেয়ারে।",
  },
  howWeScore: {
    en: ["Would you like to see how the score works first? Read ", "how we score", "."],
    bn: ["আগে দেখতে চান স্কোর কীভাবে হয়? পড়ুন ", "আমরা কীভাবে স্কোর করি", "।"],
  },
} as const;

export const FAQS: { q: Bi; a: Bi }[] = [
  {
    q: { en: "What do I get with Premium?", bn: "প্রিমিয়ামে কী পাব?" },
    a: {
      en: "Five things. Our full analysis of every DSE share: how strong the company is, why, and whether to buy it today. A full check of your portfolio with a plan. News on your shares sent to your phone the same day, a 9 AM brief and the whole Friday letter. Full lists of shares worth a look, picked for you. And no limits on your watchlist, price alerts, TopStock AI or portfolios.",
      bn: "পাঁচটি জিনিস। ডিএসইর প্রতিটি শেয়ারের পূর্ণ বিশ্লেষণ: কোম্পানিটি কতটা শক্তিশালী, কেন, আর আজ কেনা যায় কি না। পরিকল্পনাসহ আপনার পোর্টফোলিওর পূর্ণ যাচাই। আপনার শেয়ারের খবর সেদিনই ফোনে, সকাল 9টার খবর আর পুরো শুক্রবারের চিঠি। আপনার জন্য বাছাই করা, দেখার মতো শেয়ারের পুরো তালিকা। আর ওয়াচলিস্ট, প্রাইস অ্যালার্ট, TopStock AI ও পোর্টফোলিওতে কোনো সীমা নেই।",
    },
  },
  {
    q: { en: "How much does Premium cost?", bn: "প্রিমিয়ামের দাম কত?" },
    a: {
      en: "৳199 for 1 month. For a limited time, 6 months cost ৳999 instead of ৳1,149, and a year costs ৳1,899 instead of ৳2,199, which is about ৳158 a month.",
      bn: "1 মাস ৳199। সীমিত সময়ের অফারে 6 মাস ৳1,149-এর বদলে ৳999, আর 1 বছর ৳2,199-এর বদলে ৳1,899, অর্থাৎ মাসে প্রায় ৳158।",
    },
  },
  {
    q: { en: "How do I pay?", bn: "কীভাবে পেমেন্ট করব?" },
    a: {
      en: "By bKash or Nagad Send Money, or by bank transfer (NPSB or BEFTN). Choose a plan and send the amount to the number or bank account shown on this page. Then tell us how you paid. For bKash or Nagad, that is the number you sent it from. For a bank transfer, it is NPSB or BEFTN, the last 4 digits of your account, and the reference if you wrote one. Tap the button and Premium starts straight away.",
      bn: "বিকাশ বা নগদে Send Money করে, অথবা ব্যাংক ট্রান্সফারে (NPSB বা BEFTN)। একটি প্ল্যান বেছে নিন, আর এই পেজে দেখানো নম্বরে বা ব্যাংক অ্যাকাউন্টে টাকা পাঠান। তারপর জানান কীভাবে পাঠিয়েছেন। বিকাশ বা নগদে হলে যে নম্বর থেকে পাঠিয়েছেন সেটি লিখুন। ব্যাংক ট্রান্সফারে হলে NPSB না BEFTN, আপনার অ্যাকাউন্টের শেষ 4টি সংখ্যা, আর রেফারেন্স লিখে থাকলে সেটি দিন। বোতাম চাপলেই প্রিমিয়াম সঙ্গে সঙ্গে চালু হবে।",
    },
  },
  {
    q: { en: "What if you cannot find my payment?", bn: "আমার পেমেন্ট খুঁজে না পেলে কী হবে?" },
    a: {
      en: "We check every payment against our bKash, Nagad and bank statements. If no matching money came in, Premium is switched off and the days are taken back. A BEFTN transfer can take until the next working day, so we wait for it before we decide. If you typed something wrong by mistake, please contact us and we will sort it out.",
      bn: "প্রতিটি পেমেন্ট আমরা বিকাশ, নগদ ও ব্যাংকের হিসাবের সঙ্গে মিলিয়ে দেখি। মিলে যায় এমন টাকা না এলে প্রিমিয়াম বন্ধ হয় আর দিনগুলো ফিরিয়ে নেওয়া হয়। BEFTN-এ টাকা পৌঁছাতে পরের কার্যদিবস পর্যন্ত লাগতে পারে, তাই সিদ্ধান্ত নেওয়ার আগে আমরা অপেক্ষা করি। ভুল করে অন্য কিছু লিখে থাকলে আমাদের জানান, আমরা ঠিক করে দেব।",
    },
  },
  {
    q: { en: "Does it renew by itself?", bn: "নিজে থেকে কি নবায়ন হয়?" },
    a: {
      en: "No. Nothing is ever taken from your account automatically. A few days before your plan ends, we remind you and tell you what Premium found on your shares that month. You pay again only if you want to continue.",
      bn: "না। আপনার অ্যাকাউন্ট থেকে নিজে থেকে কখনো টাকা কাটা হয় না। প্ল্যান শেষ হওয়ার কয়েক দিন আগে আমরা মনে করিয়ে দিই, আর জানাই সেই মাসে প্রিমিয়াম আপনার শেয়ারে কী কী পেয়েছে। চালিয়ে যেতে চাইলে তবেই আবার পেমেন্ট করবেন।",
    },
  },
  {
    q: { en: "Can I see it before I pay?", bn: "পেমেন্টের আগে কি দেখে নিতে পারি?" },
    a: {
      en: "Yes, in three ways. Every day one well-known company's full report is open for everyone: look for \"Today's free full report\" on the homepage. A free account opens 3 full reports a month on shares you choose. And our two sample portfolios show the whole portfolio check, free.",
      bn: "হ্যাঁ, তিনভাবে। প্রতিদিন একটি পরিচিত কোম্পানির পূর্ণ রিপোর্ট সবার জন্য খোলা থাকে: হোমপেজে \"আজকের ফ্রি পূর্ণ রিপোর্ট\" দেখুন। ফ্রি অ্যাকাউন্টে আপনার বাছাই করা শেয়ারে মাসে 3টি পূর্ণ রিপোর্ট খোলা যায়। আর আমাদের দুটি নমুনা পোর্টফোলিওতে পুরো পোর্টফোলিও যাচাই ফ্রিতে দেখা যায়।",
    },
  },
  {
    q: { en: "Can I get my money back?", bn: "টাকা কি ফেরত পাব?" },
    a: {
      en: "Yes. Ask within 7 days of paying, and we send the full amount back to the number you paid from. The refund policy has the details.",
      bn: "হ্যাঁ। পেমেন্টের 7 দিনের মধ্যে জানালে যে নম্বর থেকে পেমেন্ট করেছেন, সেখানে পুরো টাকা ফেরত পাঠাই। বিস্তারিত রিফান্ড নীতিতে আছে।",
    },
  },
  {
    q: { en: "What happens when my plan ends?", bn: "মেয়াদ শেষ হলে কী হবে?" },
    a: {
      en: "Your account goes back to the free plan by itself. The shares you follow and the alerts you set stay. You just cannot add more than the free limits.",
      bn: "অ্যাকাউন্ট নিজে থেকেই ফ্রি প্ল্যানে ফিরে যায়। আপনার অনুসরণ করা শেয়ার আর দেওয়া অ্যালার্ট থেকে যায়, শুধু ফ্রি সীমার বেশি যোগ করা যাবে না।",
    },
  },
  {
    q: { en: "What stays free?", bn: "কী কী ফ্রি থাকবে?" },
    a: {
      en: "The price, chart, figures, dividends and news of every share, the company ranking, results, the market pages, your portfolio's money and grade, and every update on your own shares. Premium adds our answers and the reasons, the full lists, and brings the news on your shares to you the same day.",
      bn: "প্রতিটি শেয়ারের দাম, চার্ট, হিসাব, ডিভিডেন্ড আর খবর, কোম্পানির র‍্যাঙ্কিং, আর্থিক ফল, বাজারের পেজগুলো, আপনার পোর্টফোলিওর টাকা আর গ্রেড, আর আপনার শেয়ারের প্রতিটি খবর। প্রিমিয়াম এর ওপর আমাদের উত্তর আর কারণ, পুরো তালিকা যোগ করে, আর আপনার শেয়ারের খবর সেদিনই আপনার কাছে পৌঁছে দেয়।",
    },
  },
  {
    q: { en: "Is this investment advice?", bn: "এটি কি বিনিয়োগ পরামর্শ?" },
    a: {
      en: "No. Everything on TopStockBD is educational information built from company figures. Please check a share yourself before you buy or sell.",
      bn: "না। TopStockBD-র সবকিছু কোম্পানির হিসাব থেকে তৈরি শিক্ষামূলক তথ্য। কেনা বা বেচার আগে নিজে যাচাই করে নিন।",
    },
  },
];
