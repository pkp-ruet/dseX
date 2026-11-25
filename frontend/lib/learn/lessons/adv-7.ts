import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip, warn } from "../build";

export const ADV_7: Lesson = {
  id: "adv-7",
  path: "advanced",
  n: 7,
  slug: LESSON_SLUGS["adv-7"],
  title: l("What owners' buying and selling tells you", "উদ্যোক্তাদের কেনাবেচা কী বলে"),
  seoTitle: l("Sponsor and director share trades on the DSE: what they tell you", "ডিএসইতে উদ্যোক্তা-পরিচালকদের শেয়ার কেনাবেচা: কী বলে"),
  summary: l(
    "Sponsors, directors, institutions and foreigners all leave traces you can read. What each kind of move means, and which ones matter.",
    "উদ্যোক্তা, পরিচালক, প্রতিষ্ঠান আর বিদেশি বিনিয়োগকারী সবাই চিহ্ন রেখে যান, যা পড়া যায়। প্রতিটি ধরনের নড়াচড়ার মানে, আর কোনগুলো গুরুত্বপূর্ণ।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "sponsor director share sale DSE, insider buying Bangladesh, shareholding pattern, institutional investors, 30 percent rule",
    "উদ্যোক্তা পরিচালকের শেয়ার বিক্রি, ভেতরের লোকের কেনা, শেয়ারধারণের ধরন, প্রাতিষ্ঠানিক বিনিয়োগকারী, 30 শতাংশের নিয়ম",
  ),
  outcomes: [
    l("Who owns a DSE company, and where to see it", "ডিএসইর কোম্পানির মালিক কারা, আর কোথায় দেখবেন"),
    l("How to read a sponsor's or director's trade", "উদ্যোক্তা বা পরিচালকের লেনদেন কীভাবে পড়বেন"),
    l("When institutions and foreigners moving together matters", "কখন প্রতিষ্ঠান আর বিদেশিদের একসঙ্গে নড়াচড়া গুরুত্বপূর্ণ"),
  ],
  sections: [
    {
      heading: l("Who owns the company", "কোম্পানির মালিক কারা"),
      blocks: [
        p(
          "Every month the DSE shows how a company's shares are split between five groups: sponsors and directors, the government, institutions, foreign investors and the public. The sponsors and directors run the company; how much they hold, and whether they add or sell, tells you what the best-informed people think.",
          "প্রতি মাসে ডিএসই দেখায় একটি কোম্পানির শেয়ার পাঁচটি দলে কীভাবে ভাগ: উদ্যোক্তা-পরিচালক, সরকার, প্রতিষ্ঠান, বিদেশি বিনিয়োগকারী আর সাধারণ মানুষ। উদ্যোক্তা-পরিচালকরা কোম্পানি চালান; তাঁরা কতটা ধরে আছেন, আর কিনছেন না বেচছেন, তা বলে সবচেয়ে বেশি জানা মানুষেরা কী ভাবছেন।",
        ),
        warn(
          "Sponsors and directors together must hold at least 30% under BSEC rules. Below that, less of their own money rides on the company.",
          "বিএসইসির নিয়মে উদ্যোক্তা-পরিচালকদের মিলে অন্তত 30% রাখতে হয়। এর নিচে মানে কোম্পানিতে তাঁদের নিজের টাকা কম খাটছে।",
        ),
      ],
    },
    {
      heading: l("Reading a sponsor's or director's trade", "উদ্যোক্তা বা পরিচালকের লেনদেন পড়া"),
      blocks: [
        p(
          "A sponsor or director must announce a planned buy or sale to the DSE first, and confirm it once done. Both notices are public.",
          "উদ্যোক্তা বা পরিচালককে কেনা বা বেচার আগে ডিএসইতে জানাতে হয়, আর শেষ হলে নিশ্চিত করতে হয়। দুটি নোটিশই প্রকাশ্য।",
        ),
        list(
          ["**Buying with their own money** is a strong sign: people rarely add to a company they doubt.", "**নিজের টাকায় কেনা** জোরালো সংকেত: মানুষ সন্দেহের কোম্পানিতে সাধারণত টাকা বাড়ায় না।"],
          ["**One sale** can have many reasons: a family need, paying tax, another business.", "**একবার বিক্রির** অনেক কারণ থাকতে পারে: পারিবারিক প্রয়োজন, কর, অন্য ব্যবসা।"],
          ["**Several directors selling over months** deserves a closer look.", "**কয়েক মাস ধরে একাধিক পরিচালকের বিক্রি** খুঁটিয়ে দেখার মতো।"],
          ["**Gifts and transfers within a family** are not buying or selling. Leave them out.", "**পরিবারের মধ্যে উপহার বা হস্তান্তর** কেনাবেচা নয়। বাদ দিন।"],
          ["**An announced sale that never happens** sometimes means no buyer at that price.", "**ঘোষণা দিয়েও বিক্রি না হওয়া** কখনো বোঝায় সেই দামে ক্রেতা ছিল না।"],
        ),
      ],
    },
    {
      heading: l("Institutions and foreigners", "প্রতিষ্ঠান আর বিদেশি বিনিয়োগকারী"),
      blocks: [
        p(
          "Institutions (mutual funds, banks, insurers) and foreign investors usually study a company before they buy. Compare their share with three months and a year ago. A move of half a percentage point or more is worth noticing.",
          "প্রতিষ্ঠান (মিউচুয়াল ফান্ড, ব্যাংক, বিমা) আর বিদেশি বিনিয়োগকারীরা সাধারণত কেনার আগে কোম্পানি যাচাই করেন। তিন মাস আর এক বছর আগের সঙ্গে তাঁদের অংশ তুলনা করুন। আধা শতাংশ পয়েন্ট বা তার বেশি নড়াচড়া খেয়াল রাখার মতো।",
        ),
        tip(
          "The strongest sign is when two groups move the same way: sponsors and institutions both adding, or both selling, over three months.",
          "সবচেয়ে জোরালো সংকেত হলো দুটি দল একই দিকে নড়লে: তিন মাসে উদ্যোক্তা আর প্রতিষ্ঠান দুজনেই বাড়াচ্ছেন, বা দুজনেই কমাচ্ছেন।",
        ),
        warn(
          "A sudden jump of 10 points or more in one month is often a reclassification in DSE's data, not real trading. Check before you read anything into it.",
          "এক মাসে হঠাৎ 10 পয়েন্ট বা তার বেশি লাফ প্রায়ই ডিএসইর তথ্যে শ্রেণি বদল, আসল কেনাবেচা নয়। কিছু ধরে নেওয়ার আগে যাচাই করুন।",
        ),
      ],
    },
    {
      heading: l("Putting it to use", "কাজে লাগানো"),
      blocks: [
        list(
          ["Use owners' moves to confirm what the accounts show, not instead of them.", "মালিকদের নড়াচড়া হিসাবের বিকল্প নয়, হিসাব যা দেখায় তা নিশ্চিত করতে কাজে লাগান।"],
          ["Sponsor buying plus improving results is worth a closer look.", "উদ্যোক্তাদের কেনা আর ভালো হতে থাকা ফল একসঙ্গে থাকলে খুঁটিয়ে দেখার মতো।"],
          ["Sponsor selling plus a weak quarter is a reason to be careful.", "উদ্যোক্তাদের বিক্রি আর দুর্বল প্রান্তিক একসঙ্গে থাকলে সতর্ক থাকার কারণ।"],
        ),
      ],
    },
  ],
  keyPoints: [
    l("Sponsors and directors must hold 30% together; below that is a warning.", "উদ্যোক্তা-পরিচালকদের মিলে 30% রাখতে হয়; এর নিচে সতর্কতা।"),
    l("Their buying is a strong sign; steady selling by several directors deserves a look.", "তাঁদের কেনা জোরালো সংকেত; একাধিক পরিচালকের নিয়মিত বিক্রি খুঁটিয়ে দেখার মতো।"),
    l("Two groups moving the same way matters more than one.", "একটির চেয়ে দুটি দল একই দিকে নড়লে বেশি গুরুত্বপূর্ণ।"),
  ],
  words: [
    { term: l("Sponsor", "উদ্যোক্তা"), meaning: l("A founder or founding shareholder of the company.", "কোম্পানির প্রতিষ্ঠাতা বা প্রতিষ্ঠাকালীন শেয়ারহোল্ডার।") },
  ],
  tryIt: {
    text: l("See which companies' owners bought or sold this year, and where groups move together.", "এ বছর কোন কোম্পানির মালিকরা কিনেছেন বা বেচেছেন, আর কোথায় দলগুলো একসঙ্গে নড়ছে, দেখুন।"),
    label: l("Open “Who is buying”", "“কারা কিনছেন” খুলুন"),
    href: "/stock-insights/who-is-buying",
  },
  faqs: [
    {
      q: l("Is it a bad sign when a director sells shares?", "পরিচালক শেয়ার বিক্রি করলে কি খারাপ সংকেত?"),
      a: l("Not always. One sale can have personal reasons. Several directors selling over months, with weak results, is more worrying.", "সবসময় নয়। একবারের বিক্রির ব্যক্তিগত কারণ থাকতে পারে। দুর্বল ফলের সময় কয়েক মাস ধরে একাধিক পরিচালকের বিক্রি বেশি চিন্তার।"),
    },
  ],
};
