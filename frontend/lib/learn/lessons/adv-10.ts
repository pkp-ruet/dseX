import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip } from "../build";

export const ADV_10: Lesson = {
  id: "adv-10",
  path: "advanced",
  n: 10,
  slug: LESSON_SLUGS["adv-10"],
  title: l("How much to put in each share", "প্রতিটি শেয়ারে কত টাকা রাখবেন"),
  seoTitle: l("How much to put in each share: sizing and rebalancing a DSE portfolio", "প্রতিটি শেয়ারে কত টাকা: পোর্টফোলিও সাজানো আর ভারসাম্য রাখা"),
  summary: l(
    "Equal parts is a fine start. Here is how to size each share by how sure you are and how risky it is, and when to rebalance.",
    "সমান ভাগে শুরু করা ঠিক আছে। আপনি কতটা নিশ্চিত আর শেয়ারটি কতটা ঝুঁকির, সেই অনুযায়ী প্রতিটির ভাগ কীভাবে ঠিক করবেন, আর কখন ভারসাম্য ফেরাবেন।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "position sizing, portfolio weight per stock, rebalancing portfolio Bangladesh, cash reserve investing",
    "প্রতিটি শেয়ারে কত টাকা, পোর্টফোলিওর ভাগ, পোর্টফোলিওর ভারসাম্য, নগদ রেখে বিনিয়োগ",
  ),
  outcomes: [
    l("Three sizes for three kinds of share", "তিন ধরনের শেয়ারের জন্য তিন মাপ"),
    l("When and how to rebalance", "কখন আর কীভাবে ভারসাম্য ফেরাবেন"),
    l("Why keeping some cash is part of the plan", "কেন কিছু নগদ রাখা পরিকল্পনার অংশ"),
  ],
  sections: [
    {
      heading: l("Size by how sure you are and how risky it is", "কতটা নিশ্চিত আর কতটা ঝুঁকি, সেই অনুযায়ী ভাগ"),
      blocks: [
        p(
          "Equal parts protect you from your own overconfidence, which is why they are a good start. With experience, you can give more to companies you understand well and that are strong, and less to smaller, riskier ones, while keeping the safety lines from [How many shares should you own?](/learn/how-many-shares-to-own).",
          "সমান ভাগ আপনাকে নিজের অতিরিক্ত আত্মবিশ্বাস থেকে রক্ষা করে, তাই এটি ভালো শুরু। অভিজ্ঞতা হলে যে কোম্পানি ভালোভাবে বোঝেন আর শক্তিশালী, তাতে বেশি দিতে পারেন, আর ছোট, ঝুঁকির কোম্পানিতে কম, তবে [কয়টি শেয়ার রাখা উচিত?](/blog/how-many-shares-to-own) লেখার নিরাপত্তা-সীমা মেনে।",
        ),
      ],
    },
    {
      heading: l("Three sizes", "তিনটি মাপ"),
      blocks: [
        {
          kind: "table",
          head: [l("Kind of share", "শেয়ারের ধরন"), l("Size", "ভাগ"), l("Example", "উদাহরণ")],
          rows: [
            [l("Core: strong all round, big, pays cash every year", "মূল: সব দিকে শক্তিশালী, বড়, প্রতি বছর নগদ দেয়"), l("10% to 20% each", "প্রতিটি 10% থেকে 20%"), l("A large drug maker or phone company", "বড় ওষুধ বা মোবাইল কোম্পানি")],
            [l("Steady: mostly strong, fair price", "স্থির: বেশিরভাগ দিকে শক্তিশালী, ন্যায্য দাম"), l("5% to 10% each", "প্রতিটি 5% থেকে 10%"), l("A mid-sized food or cement company", "মাঝারি খাবার বা সিমেন্ট কোম্পানি")],
            [l("Small bet: smaller, less certain", "ছোট বাজি: ছোট, অনিশ্চিত"), l("Up to 3% each, 10% in all", "প্রতিটি 3% পর্যন্ত, সব মিলে 10%"), l("A company recovering from a bad year", "খারাপ বছর থেকে ফিরছে এমন কোম্পানি")],
          ],
        },
        p(
          "Never more than a quarter in one share, never more than 40% in one business, and banks, finance companies and insurers together under half.",
          "একটি শেয়ারে কখনো এক-চতুর্থাংশের বেশি নয়, একটি ব্যবসায় 40%-এর বেশি নয়, আর ব্যাংক, আর্থিক প্রতিষ্ঠান ও বিমা মিলে অর্ধেকের কম।",
        ),
      ],
    },
    {
      heading: l("Rebalancing", "ভারসাম্য ফেরানো"),
      blocks: [
        p(
          "Prices move, so your sizes drift. Check twice a year, and act only when something has crossed a line, not for small drifts. Each trade costs fees.",
          "দাম ওঠানামা করে, তাই ভাগগুলো সরে যায়। বছরে দুইবার দেখুন, আর শুধু কোনো সীমা পার হলে পদক্ষেপ নিন, ছোটখাটো সরে যাওয়ায় নয়। প্রতিটি লেনদেনে ফি লাগে।",
        ),
        steps(
          ["List each share's part of your money", "প্রতিটি শেয়ারের ভাগ লিখুন"],
          ["Mark anything over its size, or over a quarter", "যা তার মাপের বেশি, বা এক-চতুর্থাংশের বেশি, চিহ্নিত করুন"],
          ["Check why it grew", "কেন বেড়েছে দেখুন", "Price only, or a stronger business? A stronger business can earn a slightly bigger size.", "শুধু দাম, নাকি ব্যবসা আরও শক্তিশালী? শক্তিশালী ব্যবসা একটু বড় ভাগ পেতে পারে।"],
          ["Sell the excess, or stop adding to it", "বাড়তিটা বিক্রি করুন, বা তাতে আর যোগ করবেন না"],
          ["Put new money into what is below its size", "নতুন টাকা যা তার মাপের নিচে, তাতে দিন"],
        ),
        tip(
          "Directing new money to what is underweight often rebalances without selling at all, and without the fees.",
          "নতুন টাকা যা কম ভাগে আছে তাতে দিলে প্রায়ই বিক্রি ছাড়াই, ফি ছাড়াই ভারসাম্য ফেরে।",
        ),
      ],
    },
    {
      heading: l("Keep some cash", "কিছু নগদ রাখুন"),
      blocks: [
        list(
          ["Keep 5% to 10% of your share money as cash at the broker or in the bank.", "শেয়ারের টাকার 5% থেকে 10% ব্রোকারের কাছে বা ব্যাংকে নগদ রাখুন।"],
          ["It lets you buy when a strong company falls to a good price, without selling something else.", "শক্তিশালী কোম্পানির দাম ভালো জায়গায় নামলে অন্য কিছু বিক্রি না করেই কেনা যায়।"],
          ["It is separate from your emergency fund, which stays out of shares entirely.", "এটি জরুরি তহবিল থেকে আলাদা; জরুরি তহবিল শেয়ারের বাইরেই থাকে।"],
        ),
      ],
    },
  ],
  keyPoints: [
    l("Start equal; later give strong, well-understood companies more and small bets less.", "সমান ভাগে শুরু; পরে শক্তিশালী, ভালোভাবে বোঝা কোম্পানিতে বেশি, ছোট বাজিতে কম।"),
    l("Keep the lines: a quarter per share, 40% per business, financials under half.", "সীমা মানুন: শেয়ারপ্রতি এক-চতুর্থাংশ, ব্যবসাপ্রতি 40%, আর্থিক খাত অর্ধেকের নিচে।"),
    l("Rebalance twice a year, mostly by directing new money; keep some cash.", "বছরে দুইবার ভারসাম্য ফেরান, বেশিরভাগ নতুন টাকা দিয়ে; কিছু নগদ রাখুন।"),
  ],
  words: [
    { term: l("Rebalancing", "ভারসাম্য ফেরানো"), meaning: l("Bringing each share back to its planned part of your money.", "প্রতিটি শেয়ারকে পরিকল্পিত ভাগে ফিরিয়ে আনা।") },
  ],
  tryIt: {
    text: l("Our portfolio check shows each share's part of your money and flags anything over the lines.", "আমাদের পোর্টফোলিও যাচাই প্রতিটি শেয়ারের ভাগ দেখায়, আর সীমা পার হলে জানিয়ে দেয়।"),
    label: l("Open Portfolio", "পোর্টফোলিও খুলুন"),
    href: "/portfolio",
  },
  faqs: [
    {
      q: l("What percentage of my portfolio should one stock be?", "একটি শেয়ার পোর্টফোলিওর কত শতাংশ হওয়া উচিত?"),
      a: l("For most investors, no more than a quarter, and usually 5% to 20% depending on how strong and well understood the company is.", "বেশিরভাগ বিনিয়োগকারীর জন্য এক-চতুর্থাংশের বেশি নয়, আর কোম্পানি কতটা শক্তিশালী ও বোঝা, তার ওপর নির্ভর করে সাধারণত 5% থেকে 20%।"),
    },
  ],
};
