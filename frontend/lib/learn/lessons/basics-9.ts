import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, warn } from "../build";

export const BASICS_9: Lesson = {
  id: "basics-9",
  path: "basics",
  n: 9,
  slug: LESSON_SLUGS["basics-9"],
  title: l("What to do when the market falls", "বাজার পড়লে কী করবেন"),
  seoTitle: l("What to do when the share market falls: fear, greed and five steps", "শেয়ার বাজার পড়লে কী করবেন: ভয়, লোভ আর পাঁচটি ধাপ"),
  summary: l(
    "Falls are a normal part of the market. Five calm steps for a bad month, and the habit of fear and greed that costs people most.",
    "দরপতন বাজারের স্বাভাবিক অংশ। খারাপ মাসের জন্য পাঁচটি শান্ত ধাপ, আর ভয় ও লোভের যে অভ্যাস মানুষের সবচেয়ে বেশি ক্ষতি করে।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "share market falling what to do, DSE crash, fear and greed investing, panic selling, bear market Bangladesh",
    "বাজার পড়লে কী করবেন, শেয়ার বাজারে দরপতন, ভয় আর লোভ, আতঙ্কে বিক্রি",
  ),
  outcomes: [
    l("Why falls are normal", "কেন দরপতন স্বাভাবিক"),
    l("Five steps for a bad month", "খারাপ মাসের জন্য পাঁচটি ধাপ"),
    l("How fear and greed cost money", "ভয় আর লোভ কীভাবে টাকা কেড়ে নেয়"),
  ],
  sections: [
    {
      heading: l("Falls are normal", "দরপতন স্বাভাবিক"),
      blocks: [
        p(
          "In most years the market has at least one fall of 10% or more, and some years fall far more. In 2022 and 2023, floor prices meant many shares could not be sold for months. A plan that only works when prices rise is not a plan.",
          "বেশিরভাগ বছরে বাজারে অন্তত একবার 10% বা তার বেশি পতন হয়, কোনো কোনো বছর আরও অনেক বেশি। 2022 আর 2023 সালে ফ্লোর প্রাইসের কারণে অনেক শেয়ার মাসের পর মাস বিক্রিই করা যায়নি। যে পরিকল্পনা শুধু দাম বাড়লে কাজ করে, তা আসলে পরিকল্পনা নয়।",
        ),
      ],
    },
    {
      heading: l("Five steps when the market falls", "বাজার পড়লে পাঁচটি ধাপ"),
      blocks: [
        steps(
          ["Don't act on the first day", "প্রথম দিনেই কিছু করবেন না", "Big falls make big headlines. Give it a few days.", "বড় পতনে বড় শিরোনাম হয়। কয়েক দিন সময় দিন।"],
          ["Check your companies, not the index", "সূচক নয়, নিজের কোম্পানি দেখুন", "Did their results or news change, or only the market mood?", "তাদের ফল বা খবর বদলেছে, নাকি শুধু বাজারের মেজাজ?"],
          ["Keep your monthly buying going", "মাসিক কেনা চালিয়ে যান", "The same money buys more shares when prices are low.", "দাম কম থাকলে একই টাকায় বেশি শেয়ার কেনা যায়।"],
          ["Lean on your emergency fund, not your shares", "শেয়ার নয়, জরুরি তহবিলে ভরসা রাখুন", "That is why you keep months of costs in the bank.", "এজন্যই কয়েক মাসের খরচ ব্যাংকে রাখা হয়।"],
          ["Look again in a month", "এক মাস পরে আবার দেখুন", "Sell only for the reasons in “When to sell a share”.", "বিক্রি করুন শুধু “কখন শেয়ার বিক্রি করবেন” লেখার কারণগুলোর জন্য।"],
        ),
        warn(
          "Never borrow to buy more in a fall. A margin loan can force a sale at the worst time.",
          "পতনের সময় ধার করে বেশি কিনবেন না। মার্জিন ঋণ সবচেয়ে খারাপ সময়ে বিক্রি করতে বাধ্য করতে পারে।",
        ),
      ],
    },
    {
      heading: l("Fear and greed", "ভয় আর লোভ"),
      blocks: [
        p(
          "Most people buy after prices have risen a lot, because everyone is talking about it, and sell after prices have fallen a lot, because they are scared. That is buying high and selling low.",
          "বেশিরভাগ মানুষ কেনেন দাম অনেক বাড়ার পরে, কারণ তখন সবাই এ নিয়ে কথা বলে, আর বিক্রি করেন দাম অনেক পড়ার পরে, কারণ তখন ভয় লাগে। এর মানে বেশি দামে কেনা আর কম দামে বেচা।",
        ),
        list(
          ["**Signs of greed:** prices rising fast, everyone you know buying, tips everywhere. Be more careful then.", "**লোভের লক্ষণ:** দ্রুত দাম বাড়া, পরিচিত সবাই কিনছে, চারদিকে টিপস। তখন আরও সতর্ক থাকুন।"],
          ["**Signs of fear:** headlines about a crash, people swearing off shares. Strong companies can be at their lowest prices then.", "**ভয়ের লক্ষণ:** দরপতনের শিরোনাম, মানুষ বলছে আর শেয়ার নয়। শক্তিশালী কোম্পানির দাম তখন সবচেয়ে কম থাকতে পারে।"],
        ),
      ],
    },
  ],
  keyPoints: [
    l("Falls of 10% or more happen in most years. Plan for them.", "বেশিরভাগ বছরে 10% বা তার বেশি পতন হয়। এর জন্য তৈরি থাকুন।"),
    l("Check your companies, keep buying monthly, and don't borrow.", "নিজের কোম্পানি দেখুন, মাসিক কেনা চালিয়ে যান, ধার করবেন না।"),
    l("Greed buys high and fear sells low. Notice both in yourself.", "লোভ বেশি দামে কেনায়, ভয় কম দামে বেচায়। নিজের মধ্যে দুটোই খেয়াল করুন।"),
  ],
  words: [
    { term: l("Floor price", "ফ্লোর প্রাইস"), meaning: l("A lowest price set by the regulator, below which a share could not trade.", "নিয়ন্ত্রক সংস্থার ঠিক করা সর্বনিম্ন দাম, যার নিচে শেয়ার কেনাবেচা করা যেত না।") },
  ],
  tryIt: {
    text: l("See how the market did today, and whether most shares rose or fell, in plain words.", "আজ বাজার কেমন গেল, আর বেশিরভাগ শেয়ার বাড়ল না কমল, সহজ ভাষায় দেখুন।"),
    label: l("Open Market today", "আজকের বাজার খুলুন"),
    href: "/dse-today",
  },
  faqs: [
    {
      q: l("Should I sell everything when the market crashes?", "বাজারে বড় দরপতন হলে কি সব বিক্রি করে দেব?"),
      a: l("Usually not. Selling in a crash turns a fall on paper into a real loss. Check whether your companies changed; if they didn't, the fall is about mood.", "সাধারণত না। দরপতনের সময় বিক্রি করলে কাগজের লোকসান আসল লোকসানে পরিণত হয়। দেখুন আপনার কোম্পানি বদলেছে কি না; না বদলালে পতনটা মেজাজের।"),
    },
    {
      q: l("Is a falling market a good time to buy?", "বাজার পড়ার সময় কি কেনার ভালো সময়?"),
      a: l("For strong companies you have already checked, buying in parts during a fall is often a calm choice. Buy with spare money, never borrowed money.", "আগেই যাচাই করা শক্তিশালী কোম্পানির ক্ষেত্রে পতনের সময় ভাগে ভাগে কেনা প্রায়ই শান্ত সিদ্ধান্ত। বাড়তি টাকায় কিনুন, ধার করা টাকায় কখনো নয়।"),
    },
  ],
};
