import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip, warn } from "../build";

export const ADV_8: Lesson = {
  id: "adv-8",
  path: "advanced",
  n: 8,
  slug: LESSON_SLUGS["adv-8"],
  title: l("How to judge a bank share", "ব্যাংকের শেয়ার যাচাই করবেন যেভাবে"),
  seoTitle: l("How to judge a bank share in Bangladesh: bad loans, capital and price", "বাংলাদেশে ব্যাংকের শেয়ার যাচাই: খারাপ ঋণ, মূলধন আর দাম"),
  summary: l(
    "Banks don't work like other companies, so the usual checks mislead. The five numbers that matter for a bank, and how to price one.",
    "ব্যাংক অন্য কোম্পানির মতো চলে না, তাই সাধারণ যাচাই ভুল পথে নেয়। ব্যাংকের জন্য যে পাঁচটি সংখ্যা জরুরি, আর কীভাবে এর দাম যাচাই করবেন।",
  ),
  minutes: 9,
  checked: "2026-11-25",
  keywords: l(
    "how to analyse bank stock Bangladesh, non performing loan, capital adequacy ratio, bank PB ratio, DSE bank shares",
    "ব্যাংকের শেয়ার যাচাই, খেলাপি ঋণ, মূলধন পর্যাপ্ততা, ব্যাংকের পিবি, ডিএসইর ব্যাংক শেয়ার",
  ),
  outcomes: [
    l("Why a bank's loans are its raw material, not a risk on their own", "কেন ব্যাংকের ঋণ তার কাঁচামাল, নিজে থেকে ঝুঁকি নয়"),
    l("The five numbers to check", "যে পাঁচটি সংখ্যা দেখবেন"),
    l("How to judge a bank's price", "ব্যাংকের দাম কীভাবে যাচাই করবেন"),
  ],
  sections: [
    {
      heading: l("Why banks are different", "ব্যাংক কেন আলাদা"),
      blocks: [
        p(
          "A bank takes deposits and lends them out. Borrowing is its business, so the loans-to-savings check you use for a cement maker says nothing here. What matters is whether the bank's loans are being repaid, and how much of its own money stands behind them.",
          "ব্যাংক আমানত নেয় আর তা ঋণ দেয়। ধার নেওয়াই তার ব্যবসা, তাই সিমেন্ট কোম্পানির জন্য যে ঋণ-সঞ্চয় যাচাই করেন, তা এখানে কিছু বলে না। আসল কথা হলো ব্যাংকের দেওয়া ঋণ ফেরত আসছে কি না, আর তার পেছনে নিজস্ব টাকা কতটা আছে।",
        ),
        list(
          ["Bad loans", "খারাপ ঋণ"],
          ["Provisions set aside for them", "এর জন্য আলাদা করে রাখা প্রভিশন"],
          ["Capital", "মূলধন"],
          ["What it earns on its assets", "সম্পদের ওপর আয়"],
          ["Price against what it owns", "সম্পদের তুলনায় দাম"],
        ),
      ],
    },
    {
      heading: l("1. Bad loans", "1. খারাপ ঋণ"),
      blocks: [
        p(
          "Look for **non-performing loans** (also called classified or defaulted loans) as a share of all loans, in the annual report's notes. Lower is better, and the trend matters more than one year.",
          "বার্ষিক প্রতিবেদনের নোটে **খেলাপি ঋণ** (শ্রেণিকৃত ঋণও বলে) মোট ঋণের কত শতাংশ, দেখুন। যত কম তত ভালো, আর একটি বছরের চেয়ে ধারাটা বেশি জরুরি।",
        ),
        warn(
          "From 2025 the rules for counting a loan as bad became stricter, and many banks' bad loans rose sharply. Compare a bank with its peers in the same year, not with its own figures from before.",
          "2025 থেকে কোন ঋণকে খেলাপি ধরা হবে তার নিয়ম কঠোর হয়েছে, আর অনেক ব্যাংকের খেলাপি ঋণ হঠাৎ অনেক বেড়েছে। ব্যাংককে আগের নিজের হিসাবের সঙ্গে নয়, একই বছরের অন্য ব্যাংকের সঙ্গে তুলনা করুন।",
        ),
      ],
    },
    {
      heading: l("2. Provisions", "2. প্রভিশন"),
      blocks: [
        p(
          "A bank must set money aside for loans that may not come back. If its provisions fall short of what is required, it often has central bank permission to make up the gap over time, which the notes will mention. A large shortfall means future profit will be used to fill the hole.",
          "যে ঋণ ফেরত না আসার আশঙ্কা, তার জন্য ব্যাংককে টাকা আলাদা রাখতে হয়। প্রয়োজনের চেয়ে কম রাখলে প্রায়ই কেন্দ্রীয় ব্যাংকের অনুমতি নিয়ে ধাপে ধাপে ঘাটতি পূরণ করে, নোটে তা উল্লেখ থাকে। বড় ঘাটতি মানে ভবিষ্যতের মুনাফা দিয়ে সেই গর্ত ভরাট করতে হবে।",
        ),
      ],
    },
    {
      heading: l("3. Capital", "3. মূলধন"),
      blocks: [
        p(
          "Capital is the bank's own money, the cushion that absorbs losses before depositors are hurt. The annual report shows the **capital adequacy ratio**. Under current rules the minimum, including a buffer, is 12.5%. A bank near or below it may not be allowed to pay a cash dividend.",
          "মূলধন হলো ব্যাংকের নিজের টাকা, যা আমানতকারীর ক্ষতির আগে লোকসান সামলায়। বার্ষিক প্রতিবেদনে **মূলধন পর্যাপ্ততার অনুপাত** থাকে। বর্তমান নিয়মে বাফারসহ ন্যূনতম 12.5%। এর কাছাকাছি বা নিচে থাকা ব্যাংক হয়তো নগদ ডিভিডেন্ড দিতে পারবে না।",
        ),
      ],
    },
    {
      heading: l("4. What it earns", "4. কত আয় করে"),
      blocks: [
        list(
          ["**Operating profit for every ৳100 of assets**, before provisions and tax. Around ৳2 is middling for a DSE bank.", "**প্রতি ৳100 সম্পদে পরিচালন মুনাফা**, প্রভিশন আর করের আগে। ডিএসইর ব্যাংকের জন্য প্রায় ৳2 মাঝারি।"],
          ["**Return on its own money (ROE):** profit after tax against equity. A bank earning under a deposit rate on its own money is not creating much.", "**নিজস্ব মূলধনের ওপর আয়:** কর-পরবর্তী মুনাফা ÷ মূলধন। নিজের টাকায় আমানতের সুদের চেয়ে কম আয় করলে ব্যাংকটি তেমন কিছু তৈরি করছে না।"],
          ["**Where income comes from:** many banks earn a growing share from government bills and bonds, not loans. That is steadier, but watch it if interest rates fall.", "**আয় কোথা থেকে:** অনেক ব্যাংক ঋণ নয়, সরকারি বিল আর বন্ড থেকে ক্রমশ বেশি আয় করছে। এটি স্থির, তবে সুদের হার কমলে খেয়াল রাখুন।"],
        ),
      ],
    },
    {
      heading: l("5. The price", "5. দাম"),
      blocks: [
        p(
          "Banks are usually priced against what they own per share (**P/B**). A bank with low bad loans, strong capital and a good return on its own money deserves a higher P/B than one with problems. A P/B well below 1 is common for banks with heavy bad loans; it is cheap for a reason.",
          "ব্যাংকের দাম সাধারণত শেয়ারপ্রতি সম্পদের তুলনায় (**পিবি**) দেখা হয়। কম খেলাপি ঋণ, শক্ত মূলধন আর নিজস্ব টাকায় ভালো আয়ের ব্যাংক সমস্যায় থাকা ব্যাংকের চেয়ে বেশি পিবি পাওয়ার যোগ্য। খেলাপি ঋণ বেশি এমন ব্যাংকের পিবি 1-এর অনেক নিচে থাকা সাধারণ; সস্তা হওয়ার কারণ আছে।",
        ),
        tip(
          "Our grade judges banks on their capital cushion and earnings on assets, not on loans against savings, so a bank's group on TopStockBD is comparable with other banks.",
          "আমাদের গ্রেড ব্যাংককে ঋণ-সঞ্চয় দিয়ে নয়, মূলধনের কুশন আর সম্পদে আয় দিয়ে যাচাই করে, তাই TopStockBD-তে ব্যাংকের দল অন্য ব্যাংকের সঙ্গে তুলনীয়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("For a bank, check bad loans, provisions and capital, not loans against savings.", "ব্যাংকের জন্য ঋণ-সঞ্চয় নয়, খারাপ ঋণ, প্রভিশন আর মূলধন দেখুন।"),
    l("Compare bad loans with other banks in the same year; the rules changed in 2025.", "খেলাপি ঋণ একই বছরের অন্য ব্যাংকের সঙ্গে তুলনা করুন; 2025-এ নিয়ম বদলেছে।"),
    l("Price banks against what they own per share, and expect a low P/B where problems are.", "ব্যাংকের দাম শেয়ারপ্রতি সম্পদের তুলনায় দেখুন; সমস্যা থাকলে পিবি কম থাকাই স্বাভাবিক।"),
  ],
  words: [
    { term: l("Non-performing loan", "খেলাপি ঋণ"), meaning: l("A loan whose payments are overdue past the limit set by the central bank.", "কেন্দ্রীয় ব্যাংকের বেঁধে দেওয়া সময়ের পরেও যে ঋণের কিস্তি বাকি।") },
    { term: l("Capital adequacy ratio", "মূলধন পর্যাপ্ততার অনুপাত"), meaning: l("The bank's own capital against its loans and other risky assets.", "ঋণ আর অন্যান্য ঝুঁকিপূর্ণ সম্পদের তুলনায় ব্যাংকের নিজস্ব মূলধন।") },
  ],
  tryIt: {
    text: l("Compare banks side by side on profit, loans, dividend and price.", "মুনাফা, ঋণ, ডিভিডেন্ড আর দামে ব্যাংকগুলো পাশাপাশি তুলনা করুন।"),
    label: l("Open Compare", "তুলনা খুলুন"),
    href: "/compare-stocks",
  },
  faqs: [
    {
      q: l("Which numbers matter most for a bank share?", "ব্যাংকের শেয়ারে কোন সংখ্যা সবচেয়ে জরুরি?"),
      a: l("Bad loans as a share of all loans, provisions against them, the capital adequacy ratio, return on its own money, and price against book value.", "মোট ঋণে খেলাপি ঋণের অংশ, এর বিপরীতে প্রভিশন, মূলধন পর্যাপ্ততার অনুপাত, নিজস্ব মূলধনে আয়, আর খাতার মূল্যের তুলনায় দাম।"),
    },
  ],
};
