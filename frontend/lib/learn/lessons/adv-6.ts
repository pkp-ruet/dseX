import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip } from "../build";

export const ADV_6: Lesson = {
  id: "adv-6",
  path: "advanced",
  n: 6,
  slug: LESSON_SLUGS["adv-6"],
  title: l("Warning signs before a company goes bad", "কোম্পানি খারাপ হওয়ার আগের সংকেত"),
  seoTitle: l("Warning signs before a DSE company goes bad: 10 to watch", "ডিএসইর কোম্পানি খারাপ হওয়ার আগের 10টি সংকেত"),
  summary: l(
    "Companies rarely fail overnight. These are the signs that usually come first, from the auditor, the DSE and the accounts, and what to do when you see one.",
    "কোম্পানি সাধারণত হঠাৎ খারাপ হয় না। নিরীক্ষক, ডিএসই আর হিসাব থেকে যে সংকেতগুলো সাধারণত আগে আসে, আর একটি দেখলে কী করবেন।",
  ),
  minutes: 9,
  checked: "2026-11-25",
  keywords: l(
    "red flags stocks Bangladesh, going concern, qualified audit opinion, Z category, DSE price query, sponsor 30 percent",
    "শেয়ারের বিপদ সংকেত, চালু থাকা নিয়ে সংশয়, শর্তসাপেক্ষ নিরীক্ষা মতামত, Z ক্যাটাগরি, ডিএসইর কারণ জানতে চাওয়া, উদ্যোক্তাদের 30 শতাংশ",
  ),
  outcomes: [
    l("The signs that come from the auditor and the DSE", "নিরীক্ষক আর ডিএসই থেকে আসা সংকেত"),
    l("The signs hidden in the accounts", "হিসাবে লুকানো সংকেত"),
    l("What to do when you see one", "একটি দেখলে কী করবেন"),
  ],
  sections: [
    {
      heading: l("The loudest signs", "সবচেয়ে স্পষ্ট সংকেত"),
      blocks: [
        list(
          ["**Going concern doubt.** The auditor doubts the company can keep running.", "**চালু থাকা নিয়ে সংশয়।** কোম্পানি চালু থাকতে পারবে কি না, নিরীক্ষকের সংশয়।"],
          ["**A serious qualified opinion.** The auditor could not accept a large part of the accounts.", "**গুরুতর শর্তসাপেক্ষ মতামত।** নিরীক্ষক হিসাবের বড় একটি অংশ মেনে নিতে পারেননি।"],
          ["**The factory found closed.** The DSE sometimes visits companies and reports what it finds.", "**কারখানা বন্ধ পাওয়া।** ডিএসই মাঝে মাঝে কোম্পানি পরিদর্শন করে আর যা পায় তা জানায়।"],
        ),
        p(
          "Any one of these is reason enough to stop and read before you buy more. The rest of this post covers the quieter signs that usually come months earlier.",
          "এর যেকোনো একটিই আরও কেনার আগে থেমে পড়ে নেওয়ার জন্য যথেষ্ট। এই লেখার বাকিটায় আছে চুপচাপ সংকেতগুলো, যা সাধারণত কয়েক মাস আগে আসে।",
        ),
      ],
    },
    {
      heading: l("Signs from the DSE and BSEC", "ডিএসই আর বিএসইসি থেকে সংকেত"),
      blocks: [
        list(
          ["**Late results or a missed annual meeting.** Often the first step towards Z category.", "**দেরিতে ফল বা বার্ষিক সভা না হওয়া।** প্রায়ই Z ক্যাটাগরির দিকে প্রথম ধাপ।"],
          ["**A move to a lower category.** From A to B, or into Z.", "**নিচের ক্যাটাগরিতে নামা।** A থেকে B, বা Z-এ।"],
          ["**DSE price queries.** The DSE asks why the price jumped, and the company says it knows of no reason.", "**ডিএসইর কারণ জানতে চাওয়া।** দাম কেন লাফাল জানতে চায় ডিএসই, আর কোম্পানি বলে কোনো কারণ জানা নেই।"],
          ["**BSEC action.** Fines, orders or rejected plans against the company or its directors.", "**বিএসইসির ব্যবস্থা।** কোম্পানি বা পরিচালকদের বিরুদ্ধে জরিমানা, আদেশ বা প্রস্তাব বাতিল।"],
        ),
      ],
    },
    {
      heading: l("Signs from the owners", "মালিকদের দিক থেকে সংকেত"),
      blocks: [
        list(
          ["**Sponsors and directors under 30% together.** BSEC requires them to hold at least 30%; falling below means less of their own money at stake.", "**উদ্যোক্তা-পরিচালকদের হাতে মিলে 30%-এর কম।** বিএসইসির নিয়মে অন্তত 30% রাখতে হয়; এর নিচে নামা মানে তাঁদের নিজের টাকা কম খাটছে।"],
          ["**Directors selling, again and again.** One sale can have many reasons; steady selling has fewer.", "**পরিচালকরা বারবার বিক্রি করছেন।** একবার বিক্রির অনেক কারণ থাকতে পারে; নিয়মিত বিক্রির কারণ কম।"],
          ["**Board meetings postponed** more than once.", "**বোর্ড সভা** একাধিকবার পিছিয়ে যাওয়া।"],
        ),
      ],
    },
    {
      heading: l("Signs in the accounts", "হিসাবে সংকেত"),
      blocks: [
        list(
          ["Profit rising while cash from the business stays low or negative.", "মুনাফা বাড়ছে, অথচ ব্যবসার নগদ কম বা ঋণাত্মক।"],
          ["Money owed by customers growing much faster than sales.", "গ্রাহকের কাছে পাওনা বিক্রির চেয়ে অনেক দ্রুত বাড়ছে।"],
          ["Loans growing much faster than sales, or above the company's market value.", "ঋণ বিক্রির চেয়ে অনেক দ্রুত বাড়ছে, বা বাজার মূল্যের চেয়েও বেশি।"],
          ["Large deals with companies owned by the directors.", "পরিচালকদের মালিকানার কোম্পানির সঙ্গে বড় লেনদেন।"],
          ["Losses larger than the company's paid-up capital.", "কোম্পানির পরিশোধিত মূলধনের চেয়েও বড় লোকসান।"],
        ),
      ],
    },
    {
      heading: l("What to do when you see one", "একটি দেখলে কী করবেন"),
      blocks: [
        list(
          ["**Don't buy more** until you understand it.", "**বুঝে না নেওয়া পর্যন্ত আর কিনবেন না।**"],
          ["**Read the source:** the auditor's paragraph, the DSE notice, the shareholding report.", "**মূল উৎস পড়ুন:** নিরীক্ষকের অনুচ্ছেদ, ডিএসইর নোটিশ, শেয়ারধারণের প্রতিবেদন।"],
          ["**Count the signs.** One minor sign is common; two or more serious ones together are a reason to think about leaving.", "**সংকেত গুনুন।** একটি ছোট সংকেত সাধারণ ব্যাপার; দুই বা তার বেশি গুরুতর সংকেত একসঙ্গে থাকলে বের হওয়ার কথা ভাবার কারণ।"],
          ["**Don't wait for “my price”** if the company itself has changed.", "**কোম্পানি নিজেই বদলে গেলে “আমার দামের” অপেক্ষা করবেন না।**"],
        ),
        tip(
          "Our “Companies in trouble” report lists every company with a serious problem today, and what changed this week.",
          "আমাদের “সমস্যায় থাকা কোম্পানি” রিপোর্টে আজ গুরুতর সমস্যায় থাকা প্রতিটি কোম্পানি, আর এ সপ্তাহে কী বদলেছে, তা থাকে।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Going concern doubts, serious audit opinions and closed factories are the loudest signs.", "চালু থাকা নিয়ে সংশয়, গুরুতর নিরীক্ষা মতামত আর বন্ধ কারখানা সবচেয়ে স্পষ্ট সংকেত।"),
    l("Late results, category moves, DSE queries and owners under 30% usually come first.", "দেরিতে ফল, ক্যাটাগরি বদল, ডিএসইর প্রশ্ন আর উদ্যোক্তাদের 30%-এর কম অংশ সাধারণত আগে আসে।"),
    l("Two or more serious signs together are a reason to think about leaving.", "দুই বা তার বেশি গুরুতর সংকেত একসঙ্গে থাকলে বের হওয়ার কথা ভাবার কারণ।"),
  ],
  words: [
    { term: l("Going concern", "চালু থাকা"), meaning: l("The assumption that a company will keep running for at least the next year.", "এই ধারণা যে কোম্পানি অন্তত আগামী এক বছর চালু থাকবে।") },
    { term: l("Paid-up capital", "পরিশোধিত মূলধন"), meaning: l("The money shareholders put into the company for its shares.", "শেয়ারের বদলে শেয়ারহোল্ডাররা কোম্পানিতে যে টাকা দিয়েছেন।") },
  ],
  tryIt: {
    text: l("See every DSE company with a serious problem today.", "আজ গুরুতর সমস্যায় থাকা ডিএসইর প্রতিটি কোম্পানি দেখুন।"),
    label: l("Open “Companies in trouble”", "“সমস্যায় থাকা কোম্পানি” খুলুন"),
    href: "/stock-insights/risk-register",
  },
  faqs: [
    {
      q: l("What does going concern mean in an audit report?", "নিরীক্ষা প্রতিবেদনে চালু থাকা নিয়ে সংশয় মানে কী?"),
      a: l("The auditor has doubts that the company can keep running for the next year, often because of losses, debts or a stopped factory. It is one of the most serious warnings.", "নিরীক্ষকের সংশয় আছে কোম্পানি আগামী বছর চালু থাকতে পারবে কি না, প্রায়ই লোকসান, ঋণ বা বন্ধ কারখানার কারণে। এটি সবচেয়ে গুরুতর সতর্কতাগুলোর একটি।"),
    },
  ],
};
