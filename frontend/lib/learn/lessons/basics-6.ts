import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip } from "../build";

export const BASICS_6: Lesson = {
  id: "basics-6",
  path: "basics",
  n: 6,
  slug: LESSON_SLUGS["basics-6"],
  title: l("How many shares should you own?", "কয়টি শেয়ার রাখা উচিত?"),
  seoTitle: l("How many shares should you own? Building a balanced portfolio", "কয়টি শেয়ার রাখবেন? ভারসাম্যপূর্ণ পোর্টফোলিও গড়ার উপায়"),
  summary: l(
    "Too few shares and one bad result hurts a lot; too many and you can't follow them. How to spread your money sensibly.",
    "শেয়ার খুব কম হলে একটি খারাপ ফলেই অনেক ক্ষতি; খুব বেশি হলে খোঁজ রাখা যায় না। কীভাবে বুঝেশুনে টাকা ভাগ করবেন।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "how many stocks to own, diversification Bangladesh, portfolio DSE, spread money shares, sector concentration",
    "কয়টি শেয়ার রাখা উচিত, টাকা ভাগ করে রাখা, পোর্টফোলিও গড়া, এক সেক্টরে বেশি টাকা",
  ),
  outcomes: [
    l("A sensible number of shares to own", "কয়টি শেয়ার রাখা যুক্তিসংগত"),
    l("How to spread money across businesses", "কীভাবে আলাদা ব্যবসায় টাকা ভাগ করবেন"),
    l("Three lines to keep your portfolio safe", "পোর্টফোলিও নিরাপদ রাখার তিনটি সীমা"),
  ],
  sections: [
    {
      heading: l("Too few or too many", "খুব কম বা খুব বেশি"),
      blocks: [
        list(
          ["**One or two shares:** a single weak result or a bad year for that company can take a big part of your money.", "**এক-দুটি শেয়ার:** একটি খারাপ ফল বা সেই কোম্পানির একটি খারাপ বছর আপনার টাকার বড় অংশ নিয়ে যেতে পারে।"],
          ["**Thirty shares:** you can't follow their results and news, and most of them add little.", "**ত্রিশটি শেয়ার:** সবগুলোর ফল আর খবর রাখা যায় না, আর বেশিরভাগই বাড়তি কিছু দেয় না।"],
        ),
        p(
          "For most people, **5 to 10 companies** is enough. With small money, start with 2 or 3 and add new ones as your money grows.",
          "বেশিরভাগ মানুষের জন্য **5 থেকে 10টি কোম্পানি** যথেষ্ট। টাকা কম হলে 2-3টি দিয়ে শুরু করুন, টাকা বাড়লে নতুন যোগ করুন।",
        ),
      ],
    },
    {
      heading: l("Spread across businesses, not just names", "শুধু নাম নয়, ব্যবসা ভাগ করুন"),
      blocks: [
        p(
          "Five banks are not five different risks. When banks have a bad year, all five fall together. Own companies in different businesses: medicine, phone service, food, cement, power, banks.",
          "পাঁচটি ব্যাংক মানে পাঁচটি আলাদা ঝুঁকি নয়। ব্যাংকের খারাপ বছরে পাঁচটিই একসঙ্গে পড়ে। আলাদা আলাদা ব্যবসার কোম্পানি রাখুন: ওষুধ, মোবাইল সেবা, খাবার, সিমেন্ট, বিদ্যুৎ, ব্যাংক।",
        ),
      ],
    },
    {
      heading: l("Three lines to keep", "তিনটি সীমা মেনে চলুন"),
      blocks: [
        list(
          ["No single share over **a quarter** of your money.", "একটি শেয়ারে টাকার **এক-চতুর্থাংশের** বেশি নয়।"],
          ["No single business over **40%** of your money.", "একটি ব্যবসায় টাকার **40%-এর** বেশি নয়।"],
          ["Banks, finance companies and insurers together under **half** of your money.", "ব্যাংক, আর্থিক প্রতিষ্ঠান আর বিমা মিলে টাকার **অর্ধেকের** কম।"],
        ),
        {
          kind: "example",
          title: l("Example: ৳1,00,000 in six companies", "উদাহরণ: ছয়টি কোম্পানিতে ৳1,00,000"),
          rows: [
            { label: l("A medicine company", "একটি ওষুধ কোম্পানি"), value: "৳20,000" },
            { label: l("A phone company", "একটি মোবাইল কোম্পানি"), value: "৳20,000" },
            { label: l("A bank", "একটি ব্যাংক"), value: "৳15,000" },
            { label: l("A food company", "একটি খাবারের কোম্পানি"), value: "৳15,000" },
            { label: l("A cement company", "একটি সিমেন্ট কোম্পানি"), value: "৳15,000" },
            { label: l("A power company", "একটি বিদ্যুৎ কোম্পানি"), value: "৳15,000" },
          ],
          total: { label: l("Total", "মোট"), value: "৳1,00,000" },
          note: l("No share over a quarter, no business over 40%. Made-up figures to show the shape.", "কোনো শেয়ার এক-চতুর্থাংশের বেশি নয়, কোনো ব্যবসা 40%-এর বেশি নয়। আকারটা বোঝাতে বানানো হিসাব।"),
        },
      ],
    },
    {
      heading: l("Equal parts, then let it grow", "সমান ভাগে শুরু, তারপর বাড়তে দিন"),
      blocks: [
        p(
          "Start with roughly equal amounts. Over time your strongest companies may grow bigger in your portfolio, which is fine, until one passes a quarter of your money. Then it is worth selling a little to bring it back.",
          "মোটামুটি সমান টাকা দিয়ে শুরু করুন। সময়ের সঙ্গে শক্তিশালী কোম্পানিগুলো পোর্টফোলিওতে বড় হতে পারে, সেটা ঠিক আছে, যতক্ষণ না কোনোটি টাকার এক-চতুর্থাংশ পার হয়। তখন কিছুটা বিক্রি করে ফিরিয়ে আনা ভালো।",
        ),
        tip(
          "Check your spread once a month, not every day. Our portfolio check flags a share or business that has grown too big.",
          "মাসে একবার ভাগ মিলিয়ে দেখুন, প্রতিদিন নয়। কোনো শেয়ার বা ব্যবসা খুব বড় হয়ে গেলে আমাদের পোর্টফোলিও যাচাই তা দেখিয়ে দেয়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Own 5 to 10 companies; start with 2 or 3 if your money is small.", "5 থেকে 10টি কোম্পানি রাখুন; টাকা কম হলে 2-3টি দিয়ে শুরু।"),
    l("Spread across different businesses, not five of the same kind.", "এক ধরনের পাঁচটি নয়, আলাদা ব্যবসায় ভাগ করুন।"),
    l("Keep any share under a quarter, any business under 40%, financials under half.", "কোনো শেয়ার এক-চতুর্থাংশের নিচে, কোনো ব্যবসা 40%-এর নিচে, আর্থিক খাত অর্ধেকের নিচে রাখুন।"),
  ],
  words: [
    { term: l("Portfolio", "পোর্টফোলিও"), meaning: l("All the shares you own, taken together.", "আপনার সব শেয়ার একসঙ্গে।") },
  ],
  tryIt: {
    text: l("Tell us how much you want to invest and what you want from it, and we'll suggest a spread across strong companies.", "কত টাকা বিনিয়োগ করবেন আর কী চান বলুন, আমরা শক্তিশালী কোম্পানিতে একটি ভাগ সাজিয়ে দেব।"),
    label: l("Open the Portfolio builder", "পোর্টফোলিও বানান খুলুন"),
    href: "/portfolio-builder",
  },
  faqs: [
    {
      q: l("How many shares should a beginner buy?", "নতুন বিনিয়োগকারী কয়টি শেয়ার কিনবেন?"),
      a: l("Start with 2 or 3 strong companies in different businesses, and build towards 5 to 10 as your money grows.", "আলাদা ব্যবসার 2-3টি শক্তিশালী কোম্পানি দিয়ে শুরু করুন, টাকা বাড়লে 5 থেকে 10টির দিকে এগোন।"),
    },
    {
      q: l("Is it safe to put all my money in banks?", "সব টাকা ব্যাংকের শেয়ারে রাখা কি নিরাপদ?"),
      a: l("It is riskier than it looks: when banks have a bad year, they tend to fall together. Keep financials under half of your money.", "দেখতে যত মনে হয় তার চেয়ে ঝুঁকি বেশি: ব্যাংকের খারাপ বছরে সেগুলো একসঙ্গে পড়ে। আর্থিক খাত টাকার অর্ধেকের নিচে রাখুন।"),
    },
  ],
};
