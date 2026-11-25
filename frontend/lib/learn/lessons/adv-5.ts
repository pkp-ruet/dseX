import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip, warn } from "../build";

export const ADV_5: Lesson = {
  id: "adv-5",
  path: "advanced",
  n: 5,
  slug: LESSON_SLUGS["adv-5"],
  title: l("Will the dividend continue?", "ডিভিডেন্ড কি চলতে থাকবে?"),
  seoTitle: l("Will the dividend continue? How to check a DSE company's dividend safety", "ডিভিডেন্ড কি চলতে থাকবে? ডিভিডেন্ড কতটা নিরাপদ, যাচাইয়ের উপায়"),
  summary: l(
    "A high yield is only worth it if the cash keeps coming. Five checks that tell a safe dividend from one at risk, and when bonus shares are a warning.",
    "উঁচু ইল্ড তখনই কাজের, যখন নগদ নিয়মিত আসে। নিরাপদ ডিভিডেন্ড আর ঝুঁকির ডিভিডেন্ড আলাদা করার পাঁচটি যাচাই, আর কখন বোনাস শেয়ার সতর্কতা।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "dividend safety, payout ratio Bangladesh, dividend cut, bonus share instead of cash, high dividend stocks DSE",
    "ডিভিডেন্ড নিরাপদ কি না, পে-আউট অনুপাত, ডিভিডেন্ড কমানো, নগদের বদলে বোনাস শেয়ার, বেশি ডিভিডেন্ডের শেয়ার",
  ),
  outcomes: [
    l("Five checks for a dividend you can count on", "নির্ভর করার মতো ডিভিডেন্ডের পাঁচটি যাচাই"),
    l("Why a very high yield can be a warning", "কেন খুব বেশি ইল্ড সতর্কতা হতে পারে"),
    l("When bonus shares replace cash", "কখন নগদের বদলে বোনাস শেয়ার আসে"),
  ],
  sections: [
    {
      heading: l("A high yield can be a warning", "বেশি ইল্ড সতর্কতাও হতে পারে"),
      blocks: [
        p(
          "Yield is last year's cash dividend divided by today's price. When the price has fallen because the business is in trouble, the yield looks high just before the dividend is cut. So the question is not how high the yield is, but whether next year's cash will come.",
          "ইল্ড মানে গত বছরের নগদ ডিভিডেন্ডকে আজকের দাম দিয়ে ভাগ। ব্যবসা সমস্যায় পড়ায় দাম পড়ে গেলে, ডিভিডেন্ড কমার ঠিক আগে ইল্ড বেশি দেখায়। তাই প্রশ্ন ইল্ড কত বেশি তা নয়, আগামী বছর নগদ আসবে কি না।",
        ),
      ],
    },
    {
      heading: l("Five checks", "পাঁচটি যাচাই"),
      blocks: [
        {
          kind: "table",
          head: [l("Check", "যাচাই"), l("Comfortable", "স্বস্তির"), l("Worth a look", "দেখার মতো")],
          rows: [
            [l("Share of profit paid out", "মুনাফার কত অংশ দেয়"), l("Under 75%", "75%-এর কম"), l("Over 100%: paying more than it earns", "100%-এর বেশি: আয়ের চেয়ে বেশি দিচ্ছে")],
            [l("Cash from the business", "ব্যবসা থেকে নগদ"), l("Covers the dividend", "ডিভিডেন্ডের টাকা মেটায়"), l("Below the dividend, or negative", "ডিভিডেন্ডের চেয়ে কম, বা ঋণাত্মক")],
            [l("Profit trend", "মুনাফার ধারা"), l("Steady or rising", "স্থির বা বাড়ছে"), l("Down 25% or more this year", "এ বছর 25% বা তার বেশি কমেছে")],
            [l("Record", "রেকর্ড"), l("Cash every year for 5 years", "5 বছর ধরে প্রতি বছর নগদ"), l("Cash in 3 or fewer of 5 years", "5 বছরে 3 বা তার কম বার নগদ")],
            [l("Loans", "ঋণ"), l("Small against its own money", "নিজস্ব মূলধনের তুলনায় কম"), l("Growing fast, or near its market value", "দ্রুত বাড়ছে, বা বাজার মূল্যের কাছাকাছি")],
          ],
        },
        {
          kind: "example",
          title: l("Example: a made-up company", "উদাহরণ: একটি বানানো কোম্পানি"),
          rows: [
            { label: l("Profit per share", "শেয়ারপ্রতি মুনাফা"), value: "৳5.00" },
            { label: l("Cash dividend per share", "শেয়ারপ্রতি নগদ ডিভিডেন্ড"), value: "৳3.00" },
            { label: l("Cash from the business per share", "শেয়ারপ্রতি ব্যবসার নগদ"), value: "৳6.20" },
          ],
          total: { label: l("Paid out of profit", "মুনাফা থেকে দেওয়া"), value: "60%" },
          note: l("Under three-quarters of profit, and fully covered by cash: a dividend that looks steady.", "মুনাফার তিন-চতুর্থাংশের কম, আর পুরোটা নগদে মেটে: স্থির দেখায় এমন ডিভিডেন্ড।"),
        },
      ],
    },
    {
      heading: l("Bonus shares instead of cash", "নগদের বদলে বোনাস শেয়ার"),
      blocks: [
        p(
          "A bonus share gives you more shares, not more money. The company is worth the same, split into more pieces, so the price adjusts down after the record date. A company that pays bonus year after year while cash shrinks is keeping its cash, often because it needs it.",
          "বোনাস শেয়ার আপনাকে বেশি শেয়ার দেয়, বেশি টাকা নয়। কোম্পানির মূল্য একই থাকে, শুধু বেশি ভাগে ভাগ হয়, তাই রেকর্ড ডেটের পর দাম সেই অনুযায়ী কমে। বছরের পর বছর বোনাস দিয়ে নগদ কমালে কোম্পানি নগদ রেখে দিচ্ছে, প্রায়ই কারণ তার টাকা দরকার।",
        ),
        warn(
          "Cash per share falling for three years, with bonus shares in between, is a sign to check the company's cash and loans closely.",
          "তিন বছর ধরে শেয়ারপ্রতি নগদ কমছে, মাঝে বোনাস শেয়ার, তাহলে কোম্পানির নগদ আর ঋণ খুঁটিয়ে দেখুন।",
        ),
      ],
    },
    {
      heading: l("Lenders and power companies", "ব্যাংক আর বিদ্যুৎ কোম্পানি"),
      blocks: [
        list(
          ["**Banks:** the central bank can limit dividends for banks short of capital or with high bad loans. Check capital and bad loans, not just profit.", "**ব্যাংক:** মূলধন কম বা খারাপ ঋণ বেশি থাকলে কেন্দ্রীয় ব্যাংক ডিভিডেন্ড সীমিত করতে পারে। শুধু মুনাফা নয়, মূলধন আর খারাপ ঋণ দেখুন।"],
          ["**Power plants:** dividends depend on the government paying its bills on time, and on how many years are left on the plant's contract.", "**বিদ্যুৎকেন্দ্র:** ডিভিডেন্ড নির্ভর করে সরকার সময়মতো বিল দিচ্ছে কি না, আর কেন্দ্রের চুক্তির কত বছর বাকি তার ওপর।"],
        ),
        tip(
          "Our report “Reliable dividends” runs these checks on every company that pays cash and marks each dividend Looks steady, Worth a check or At risk.",
          "আমাদের “নির্ভরযোগ্য ডিভিডেন্ড” রিপোর্ট নগদ দেওয়া প্রতিটি কোম্পানিতে এই যাচাই চালায়, আর প্রতিটি ডিভিডেন্ডকে স্থির, দেখার মতো বা ঝুঁকিতে চিহ্নিত করে।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("A high yield after a falling price can come just before a cut.", "দাম পড়ার পর বেশি ইল্ড অনেক সময় ডিভিডেন্ড কমার ঠিক আগে আসে।"),
    l("Check payout under 75%, cash covering it, steady profit, a 5-year record and modest loans.", "দেখুন: 75%-এর কম দেয়, নগদে মেটে, স্থির মুনাফা, 5 বছরের রেকর্ড, পরিমিত ঋণ।"),
    l("Bonus shares are not cash; years of bonus with falling cash are a warning.", "বোনাস শেয়ার নগদ নয়; নগদ কমিয়ে বছরের পর বছর বোনাস সতর্কতা।"),
  ],
  words: [
    { term: l("Payout", "পে-আউট"), meaning: l("The share of profit paid out as cash dividend.", "মুনাফার যে অংশ নগদ ডিভিডেন্ড হিসেবে দেওয়া হয়।") },
    { term: l("Bonus share", "বোনাস শেয়ার"), meaning: l("Extra shares given instead of cash. You own the same part of the company.", "নগদের বদলে দেওয়া বাড়তি শেয়ার। কোম্পানিতে আপনার অংশ একই থাকে।") },
  ],
  tryIt: {
    text: l("See which DSE dividends look steady and which are at risk.", "ডিএসইর কোন ডিভিডেন্ড স্থির আর কোনটি ঝুঁকিতে, দেখুন।"),
    label: l("Open “Reliable dividends”", "“নির্ভরযোগ্য ডিভিডেন্ড” খুলুন"),
    href: "/stock-insights/dividends-you-can-count-on",
  },
  faqs: [
    {
      q: l("Is a high dividend yield always good?", "বেশি ডিভিডেন্ড ইল্ড কি সবসময় ভালো?"),
      a: l("No. A yield can look high because the price fell on bad news. Check that the company earns more than it pays and that cash covers the dividend.", "না। খারাপ খবরে দাম পড়ায় ইল্ড বেশি দেখাতে পারে। দেখুন কোম্পানি যা দেয় তার চেয়ে বেশি আয় করে কি না, আর নগদে ডিভিডেন্ড মেটে কি না।"),
    },
  ],
};
