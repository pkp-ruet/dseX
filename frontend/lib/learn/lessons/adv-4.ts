import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip, warn } from "../build";

export const ADV_4: Lesson = {
  id: "adv-4",
  path: "advanced",
  n: 4,
  slug: LESSON_SLUGS["adv-4"],
  title: l("How to work out a fair price yourself", "নিজে ন্যায্য দাম বের করবেন যেভাবে"),
  seoTitle: l("How to work out a share's fair price: four methods and a margin of safety", "শেয়ারের ন্যায্য দাম বের করার চারটি উপায়"),
  summary: l(
    "Four simple ways to estimate what a share is worth, how to combine them into a range, and why you buy below it, not at it.",
    "একটি শেয়ারের মূল্য আন্দাজ করার চারটি সহজ উপায়, কীভাবে মিলিয়ে একটি সীমা বানাবেন, আর কেন সেই সীমার নিচে কিনবেন, ঠিক সেখানে নয়।",
  ),
  minutes: 10,
  checked: "2026-11-25",
  keywords: l(
    "fair value share Bangladesh, how to value a stock, PE valuation, dividend yield valuation, margin of safety",
    "শেয়ারের ন্যায্য দাম, শেয়ারের মূল্য নির্ধারণ, পিই দিয়ে মূল্য, ডিভিডেন্ড দিয়ে মূল্য, নিরাপত্তার ব্যবধান",
  ),
  outcomes: [
    l("Four ways to estimate what a share is worth", "শেয়ারের মূল্য আন্দাজের চারটি উপায়"),
    l("How to turn them into one range", "কীভাবে একটি সীমায় মেলাবেন"),
    l("How much below the range to buy", "সীমার কতটা নিচে কিনবেন"),
  ],
  sections: [
    {
      heading: l("A fair price is a range, not a number", "ন্যায্য দাম একটি সংখ্যা নয়, একটি সীমা"),
      blocks: [
        p(
          "No method gives the true value of a share. Each one is a different way of asking what a careful buyer would pay. When three or four ways point to the same area, you can trust the range more. When they disagree widely, say so to yourself and be more careful.",
          "কোনো পদ্ধতিই শেয়ারের সঠিক মূল্য দেয় না। প্রতিটি আলাদা ভাবে প্রশ্ন করে, একজন সতর্ক ক্রেতা কত দিতেন। তিন-চারটি উপায় একই জায়গা দেখালে সীমাটির ওপর ভরসা বাড়ে। অনেক আলাদা হলে নিজেকে তা মনে করিয়ে দিন, আর বেশি সতর্ক থাকুন।",
        ),
        p(
          "The four ways below use one made-up company: profit per share ৳6, a steady record, cash dividend ৳3.60, and what it owns per share ৳40.",
          "নিচের চারটি উপায়ে একটি বানানো কোম্পানি ধরা হয়েছে: শেয়ারপ্রতি মুনাফা ৳6, স্থির রেকর্ড, নগদ ডিভিডেন্ড ৳3.60, আর শেয়ারপ্রতি সম্পদ ৳40।",
        ),
      ],
    },
    {
      heading: l("Way 1: its own usual price for its profit", "উপায় 1: মুনাফার তুলনায় তার নিজের স্বাভাবিক দাম"),
      blocks: [
        p(
          "Look at the price for its profit (P/E) at the end of each of the last five years and take the middle one. Leave out years when the whole market was unusually high or frozen. Multiply by today's profit per share.",
          "গত পাঁচ বছরের প্রতিটির শেষে মুনাফার তুলনায় দাম (পিই) দেখুন, আর মাঝেরটি নিন। যে বছর পুরো বাজার অস্বাভাবিক বেশি বা স্থবির ছিল, তা বাদ দিন। আজকের শেয়ারপ্রতি মুনাফা দিয়ে গুণ করুন।",
        ),
        {
          kind: "example",
          title: l("Usual P/E 12 × profit ৳6", "স্বাভাবিক পিই 12 × মুনাফা ৳6"),
          rows: [{ label: l("Estimate", "আন্দাজ"), value: "৳72" }],
        },
        warn(
          "If this year's profit jumped far above its usual level, use the middle of the last three years instead. One good year doesn't change what a business is worth.",
          "এ বছরের মুনাফা স্বাভাবিকের চেয়ে অনেক বেশি লাফালে, তার বদলে গত তিন বছরের মাঝেরটি নিন। একটি ভালো বছর ব্যবসার মূল্য বদলে দেয় না।",
        ),
      ],
    },
    {
      heading: l("Way 2: what similar companies cost", "উপায় 2: একই রকম কোম্পানির দাম"),
      blocks: [
        p(
          "Take five or more profitable companies in the same business, of a similar size, that trade every day. Find the middle of their P/Es and multiply by your company's profit. Leave out Z category shares and tiny ones; they distort the middle.",
          "একই ব্যবসার, কাছাকাছি আকারের, প্রতিদিন লেনদেন হয় এমন পাঁচ বা তার বেশি লাভজনক কোম্পানি নিন। তাদের পিইর মাঝেরটি বের করে আপনার কোম্পানির মুনাফা দিয়ে গুণ করুন। Z ক্যাটাগরি আর খুব ছোট কোম্পানি বাদ দিন; এরা মাঝের হিসাব নষ্ট করে।",
        ),
        {
          kind: "example",
          title: l("Similar companies' P/E 11 × profit ৳6", "একই রকম কোম্পানির পিই 11 × মুনাফা ৳6"),
          rows: [{ label: l("Estimate", "আন্দাজ"), value: "৳66" }],
        },
      ],
    },
    {
      heading: l("Way 3: what it owns", "উপায় 3: কোম্পানির সম্পদ"),
      blocks: [
        p(
          "Multiply what the company owns per share (NAV) by its usual price-to-assets ratio (P/B). This matters most for banks and finance companies, whose assets are mostly loans and investments.",
          "শেয়ারপ্রতি সম্পদকে (এনএভি) তার স্বাভাবিক দাম-সম্পদ অনুপাত (পিবি) দিয়ে গুণ করুন। ব্যাংক আর আর্থিক প্রতিষ্ঠানের ক্ষেত্রে এটি সবচেয়ে জরুরি, কারণ তাদের সম্পদের বেশিরভাগই ঋণ আর বিনিয়োগ।",
        ),
        {
          kind: "example",
          title: l("Usual P/B 1.7 × NAV ৳40", "স্বাভাবিক পিবি 1.7 × এনএভি ৳40"),
          rows: [{ label: l("Estimate", "আন্দাজ"), value: "৳68" }],
        },
      ],
    },
    {
      heading: l("Way 4: the dividend", "উপায় 4: ডিভিডেন্ড"),
      blocks: [
        p(
          "Decide the yield you want from a steady payer, then divide the cash dividend by it. Use this only for a company that has paid cash for years and pays out less than it earns.",
          "স্থির ডিভিডেন্ড দেয় এমন কোম্পানি থেকে কত ইল্ড চান ঠিক করুন, তারপর নগদ ডিভিডেন্ডকে তা দিয়ে ভাগ করুন। শুধু এমন কোম্পানির জন্য, যে বছরের পর বছর নগদ দিয়েছে আর আয়ের চেয়ে কম দেয়।",
        ),
        {
          kind: "example",
          title: l("Dividend ৳3.60 ÷ wanted yield 6%", "ডিভিডেন্ড ৳3.60 ÷ কাঙ্ক্ষিত ইল্ড 6%"),
          rows: [{ label: l("Estimate", "আন্দাজ"), value: "৳60" }],
        },
      ],
    },
    {
      heading: l("Put them together, then leave room", "মিলিয়ে নিন, তারপর ব্যবধান রাখুন"),
      blocks: [
        p(
          "The four estimates are ৳72, ৳66, ৳68 and ৳60. They agree well, so the middle, about ৳67, is a reasonable centre, and ৳60 to ৳72 a reasonable range.",
          "চারটি আন্দাজ ৳72, ৳66, ৳68 আর ৳60। এগুলো ভালোভাবে মেলে, তাই মাঝের প্রায় ৳67 একটি যুক্তিসংগত কেন্দ্র, আর ৳60 থেকে ৳72 একটি যুক্তিসংগত সীমা।",
        ),
        list(
          ["**Buy below the centre, not at it.** A gap of 10% to 20% protects you if your estimate was too kind.", "**কেন্দ্রে নয়, তার নিচে কিনুন।** 10% থেকে 20% ব্যবধান রাখলে আন্দাজ বেশি উদার হলেও সুরক্ষা থাকে।"],
          ["**Ask for more room when the ways disagree** or the profit is uneven.", "**উপায়গুলো না মিললে বা মুনাফা অসমান হলে বেশি ব্যবধান চান।**"],
          ["**Compare with a deposit.** At ৳67 the company earns 9% of its price a year; a one-year deposit pays about 10% before tax without risk.", "**আমানতের সঙ্গে তুলনা করুন।** ৳67 দামে কোম্পানি বছরে দামের 9% আয় করে; এক বছরের আমানতে কর বাদ দেওয়ার আগে প্রায় 10%, ঝুঁকি ছাড়া।"],
        ),
        tip(
          "Every company's page on TopStockBD shows our own fair-price range, worked out on these ideas, and how sure we are of it. Use it to check your own sums.",
          "TopStockBD-তে প্রতিটি কোম্পানির পেজে এই ধারণাগুলো দিয়ে বের করা আমাদের ন্যায্য দামের সীমা আর তাতে আমরা কতটা নিশ্চিত, তা থাকে। নিজের হিসাব মিলিয়ে নিতে কাজে লাগান।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Use four ways: its own usual P/E, similar companies, what it owns, and its dividend.", "চারটি উপায় নিন: নিজের স্বাভাবিক পিই, একই রকম কোম্পানি, সম্পদ, আর ডিভিডেন্ড।"),
    l("When they agree, trust the range more; when they don't, ask for more room.", "মিললে সীমায় ভরসা বেশি; না মিললে বেশি ব্যবধান চান।"),
    l("Buy below the centre, never at the top of the range.", "কেন্দ্রের নিচে কিনুন, সীমার ওপরের দিকে কখনো নয়।"),
  ],
  words: [
    { term: l("Margin of safety", "নিরাপত্তার ব্যবধান"), meaning: l("Buying below your estimate of fair value, to allow for mistakes.", "ভুলের জন্য জায়গা রাখতে, ন্যায্য দামের আন্দাজের নিচে কেনা।") },
    { term: l("NAV per share", "শেয়ারপ্রতি এনএভি"), meaning: l("What the company owns less what it owes, per share.", "কোম্পানির সম্পদ থেকে দায় বাদ দিয়ে শেয়ারপ্রতি যা থাকে।") },
  ],
  tryIt: {
    text: l("Open any share's page to see our fair-price range and how sure we are of it.", "যেকোনো শেয়ারের পেজে আমাদের ন্যায্য দামের সীমা আর তাতে আমরা কতটা নিশ্চিত, দেখুন।"),
    label: l("See all companies", "সব কোম্পানি দেখুন"),
    href: "/dsestockranking",
  },
  faqs: [
    {
      q: l("What is the best way to value a share?", "শেয়ারের মূল্য বের করার সবচেয়ে ভালো উপায় কী?"),
      a: l("There isn't one best way. Use several, such as its usual P/E, similar companies, its assets and its dividend, and trust the range more when they agree.", "একটিমাত্র সেরা উপায় নেই। কয়েকটি নিন, যেমন নিজের স্বাভাবিক পিই, একই রকম কোম্পানি, সম্পদ আর ডিভিডেন্ড, আর এগুলো মিললে সীমায় বেশি ভরসা রাখুন।"),
    },
  ],
};
