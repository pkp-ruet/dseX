import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, warn } from "../build";

export const BASICS_10: Lesson = {
  id: "basics-10",
  path: "basics",
  n: 10,
  slug: LESSON_SLUGS["basics-10"],
  title: l("Rumour shares: how to stay safe", "গুজবের শেয়ার: নিরাপদ থাকবেন যেভাবে"),
  seoTitle: l("Rumour shares on the DSE: how to spot them and stay safe", "ডিএসইতে গুজবের শেয়ার: চিনবেন ও নিরাপদ থাকবেন যেভাবে"),
  summary: l(
    "Small companies whose prices jump on tips, not results. What they look like, how they usually end, and a two-minute check for any tip.",
    "ফল নয়, টিপসে দাম লাফানো ছোট কোম্পানি। দেখতে কেমন, সাধারণত কীভাবে শেষ হয়, আর যেকোনো টিপস দুই মিনিটে যাচাইয়ের উপায়।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "rumour shares DSE, share market tips Bangladesh, gambling shares, pump and dump, DSE price query",
    "গুজবের শেয়ার, শেয়ার বাজারের টিপস, জুয়ার শেয়ার, দাম কারসাজি, ডিএসইর কারণ জানতে চাওয়া",
  ),
  outcomes: [
    l("What a rumour share looks like", "গুজবের শেয়ার দেখতে কেমন"),
    l("How these runs usually end", "এমন দাম বাড়া সাধারণত কীভাবে শেষ হয়"),
    l("Four questions to check any tip", "যেকোনো টিপস যাচাইয়ের চারটি প্রশ্ন"),
  ],
  sections: [
    {
      heading: l("What a rumour share looks like", "গুজবের শেয়ার দেখতে কেমন"),
      blocks: [
        list(
          ["A small company, often weak, in a loss, or in Z category.", "ছোট কোম্পানি, প্রায়ই দুর্বল, লোকসানে, বা Z ক্যাটাগরিতে।"],
          ["The price rises 30% to 50% or more in a few weeks.", "কয়েক সপ্তাহে দাম 30% থেকে 50% বা তারও বেশি বেড়ে যায়।"],
          ["No results, dividend or other news from the company explains it.", "কোম্পানির কোনো ফল, ডিভিডেন্ড বা অন্য খবর দিয়ে এর ব্যাখ্যা মেলে না।"],
          ["Trading jumps, and tips spread in social media and paid groups.", "লেনদেন হঠাৎ বেড়ে যায়, আর সামাজিক মাধ্যম ও টাকার গ্রুপে টিপস ছড়ায়।"],
        ),
      ],
    },
    {
      heading: l("How it usually ends", "সাধারণত কীভাবে শেষ হয়"),
      blocks: [
        p(
          "Those who bought early sell to those who bought late, and the price falls back, often below where it started. The last buyers carry the loss.",
          "যাঁরা আগে কিনেছিলেন, তাঁরা পরে কেনা মানুষের কাছে বিক্রি করে দেন, আর দাম আবার নেমে আসে, প্রায়ই শুরুর চেয়েও নিচে। লোকসান বহন করেন শেষে কেনা মানুষেরা।",
        ),
        p(
          "When a price jumps without reason, the DSE often asks the company why. A reply that it has **no undisclosed price-sensitive information** means the company itself knows of nothing behind the rise.",
          "কারণ ছাড়া দাম লাফালে ডিএসই প্রায়ই কোম্পানির কাছে কারণ জানতে চায়। উত্তরে যদি বলা হয় **কোনো অপ্রকাশিত মূল্য-সংবেদনশীল তথ্য নেই**, তার মানে কোম্পানি নিজেই এই দাম বাড়ার পেছনে কিছু জানে না।",
        ),
      ],
    },
    {
      heading: l("Check any tip in two minutes", "দুই মিনিটে যেকোনো টিপস যাচাই"),
      blocks: [
        list(
          ["Is it in category A?", "এটি কি A ক্যাটাগরির?"],
          ["Did it make a profit in its latest results?", "সর্বশেষ ফলে কি মুনাফা করেছে?"],
          ["Did the price jump without any news from the company?", "কোম্পানির কোনো খবর ছাড়াই কি দাম লাফিয়েছে?"],
          ["Who is giving the tip, and what do they gain if you buy?", "টিপসটা কে দিচ্ছে, আর আপনি কিনলে তার কী লাভ?"],
        ),
        p(
          "If the answers are no, no, yes and unclear, it is safer to let this one go.",
          "উত্তর যদি হয় না, না, হ্যাঁ আর অস্পষ্ট, তাহলে এটি ছেড়ে দেওয়াই নিরাপদ।",
        ),
        warn(
          "Paid tip groups make money from your fees and, sometimes, from selling to you. No one can promise a share will double.",
          "টাকার বিনিময়ে টিপস দেওয়া গ্রুপগুলো আয় করে আপনার দেওয়া ফি থেকে, আর কখনো কখনো আপনার কাছে বিক্রি করে। কোনো শেয়ার দ্বিগুণ হবে, এমন প্রতিশ্রুতি কেউ দিতে পারে না।",
        ),
      ],
    },
    {
      heading: l("On TopStockBD", "TopStockBD-তে"),
      blocks: [
        p(
          "A company's page lists the problems we found, including a price that ran up with no company news. Check it before you act on any tip.",
          "কোম্পানির পেজে আমাদের পাওয়া সমস্যাগুলো থাকে, কোম্পানির খবর ছাড়া দাম বেড়ে যাওয়াসহ। যেকোনো টিপসে কিছু করার আগে দেখে নিন।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Rumour shares are usually small, weak companies whose price jumps with no company news.", "গুজবের শেয়ার সাধারণত ছোট, দুর্বল কোম্পানি, যার দাম কোম্পানির খবর ছাড়াই লাফায়।"),
    l("Late buyers usually carry the loss when the price falls back.", "দাম নামলে সাধারণত শেষে কেনা মানুষেরাই লোকসান বহন করেন।"),
    l("Check every tip with four questions before you act.", "যেকোনো টিপস চারটি প্রশ্নে যাচাই করে তবেই কিছু করুন।"),
  ],
  words: [
    { term: l("Price-sensitive information", "মূল্য-সংবেদনশীল তথ্য"), meaning: l("News that can move a share's price, such as results or a dividend, which a company must announce.", "যে খবর শেয়ারের দাম বদলাতে পারে, যেমন ফল বা ডিভিডেন্ড; কোম্পানিকে এটি প্রকাশ করতে হয়।") },
  ],
  tryIt: {
    text: l("Look up the share someone tipped you and see the problems we found.", "যে শেয়ারের টিপস পেয়েছেন, সেটি খুঁজে দেখুন আমরা কী সমস্যা পেয়েছি।"),
    label: l("See all companies", "সব কোম্পানি দেখুন"),
    href: "/dsestockranking",
  },
  faqs: [
    {
      q: l("Are share tips in Facebook groups reliable?", "ফেসবুক গ্রুপের শেয়ার টিপস কি নির্ভরযোগ্য?"),
      a: l("Rarely. Check who gains from the tip and whether the company's own results explain the price. Most tips skip both.", "খুব কমই। দেখুন টিপসে কার লাভ, আর কোম্পানির নিজের ফল দামের ব্যাখ্যা দেয় কি না। বেশিরভাগ টিপস দুটোই এড়িয়ে যায়।"),
    },
    {
      q: l("Why does the DSE ask companies about price jumps?", "দাম লাফালে ডিএসই কেন কোম্পানির কাছে কারণ জানতে চায়?"),
      a: l("To check whether any news is behind the rise. A reply that nothing is undisclosed means the jump has no reason the company knows of.", "দাম বাড়ার পেছনে কোনো খবর আছে কি না জানতে। কিছু অপ্রকাশিত নেই বললে বোঝায়, কোম্পানির জানা কোনো কারণ এর পেছনে নেই।"),
    },
  ],
};
