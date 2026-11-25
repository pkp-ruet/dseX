import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip } from "../build";

export const BASICS_8: Lesson = {
  id: "basics-8",
  path: "basics",
  n: 8,
  slug: LESSON_SLUGS["basics-8"],
  title: l("When to sell a share", "কখন শেয়ার বিক্রি করবেন"),
  summary: l(
    "The good reasons to sell, the common bad ones, what to do with a share in a loss, and a short check before you press Sell.",
    "বিক্রির ভালো কারণ, সাধারণ ভুল কারণ, লোকসানে থাকা শেয়ার নিয়ে কী করবেন, আর বিক্রি চাপার আগে ছোট একটি যাচাই।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "when to sell shares, when to sell stock Bangladesh, sell or hold, stop loss DSE, book profit",
    "কখন শেয়ার বিক্রি করবেন, বিক্রি নাকি ধরে রাখা, লোকসানের শেয়ার, মুনাফা তোলা",
  ),
  outcomes: [
    l("Four good reasons to sell", "বিক্রির চারটি ভালো কারণ"),
    l("The reasons that usually lead to regret", "যে কারণে সাধারণত পরে আফসোস হয়"),
    l("What to ask about a share in a loss", "লোকসানে থাকা শেয়ার নিয়ে কী প্রশ্ন করবেন"),
  ],
  sections: [
    {
      heading: l("Good reasons to sell", "বিক্রির ভালো কারণ"),
      blocks: [
        list(
          ["**The company got worse.** Profit falling for years, a loss, a serious warning from its auditor, or a move to Z category.", "**কোম্পানির অবস্থা খারাপ হয়েছে।** কয়েক বছর ধরে মুনাফা কমছে, লোকসান, নিরীক্ষকের গুরুতর সতর্কতা, বা Z ক্যাটাগরিতে নেমে যাওয়া।"],
          ["**The price ran far ahead of the company.** You pay many more years of profit than it has ever been worth.", "**দাম কোম্পানির চেয়ে অনেক এগিয়ে গেছে।** কখনো যত বছরের মুনাফার দাম ছিল, তার চেয়ে অনেক বেশি দিতে হচ্ছে।"],
          ["**One share has grown too big.** It is over a quarter of your money; selling a part brings it back.", "**একটি শেয়ার খুব বড় হয়ে গেছে।** টাকার এক-চতুর্থাংশের বেশি; কিছু বিক্রি করলে ভারসাম্য ফেরে।"],
          ["**You need the money for something planned.** A house, a wedding, school fees.", "**পরিকল্পিত কোনো কাজে টাকা দরকার।** বাড়ি, বিয়ে, পড়াশোনার খরচ।"],
        ),
      ],
    },
    {
      heading: l("Reasons that usually lead to regret", "যে কারণে সাধারণত আফসোস হয়"),
      blocks: [
        list(
          ["The price fell a little this week.", "এই সপ্তাহে দাম একটু কমেছে।"],
          ["A rumour, or everyone in a group is selling.", "গুজব, বা কোনো গ্রুপে সবাই বিক্রি করছে।"],
          ["Selling a strong company too early just to take a small profit.", "সামান্য মুনাফা তুলতে শক্তিশালী কোম্পানি খুব আগেভাগে বিক্রি করা।"],
        ),
      ],
    },
    {
      heading: l("A share in a loss", "লোকসানে থাকা শেয়ার"),
      blocks: [
        p(
          "What you paid doesn't matter to the share. Ask one question: **would I buy this company today, at today's price?**",
          "আপনি কত দিয়ে কিনেছেন, শেয়ারের কাছে তার কোনো মূল্য নেই। একটি প্রশ্ন করুন: **আজকের দামে কি আমি আজ এই কোম্পানি কিনতাম?**",
        ),
        list(
          ["**Yes,** the company is still strong and only the price fell: holding, or adding a little within your limits, is reasonable.", "**হ্যাঁ,** কোম্পানি এখনো শক্তিশালী, শুধু দাম কমেছে: ধরে রাখা, বা নিজের সীমার মধ্যে একটু যোগ করা যুক্তিসংগত।"],
          ["**No,** the company itself has weakened: waiting to “get back to my price” often means losing more.", "**না,** কোম্পানি নিজেই দুর্বল হয়েছে: “আমার দামে ফিরুক” বলে অপেক্ষা করলে প্রায়ই আরও লোকসান হয়।"],
        ),
      ],
    },
    {
      heading: l("Before you press Sell", "বিক্রি চাপার আগে"),
      blocks: [
        steps(
          ["Check the latest results and news", "সর্বশেষ ফল আর খবর দেখুন", "Did something about the company change, or only the price?", "কোম্পানির কিছু বদলেছে, নাকি শুধু দাম?"],
          ["Check for a dividend coming", "ডিভিডেন্ড আসছে কি না দেখুন", "Selling just before a record date gives up a dividend you were about to get.", "রেকর্ড ডেটের ঠিক আগে বিক্রি করলে পেতে যাওয়া ডিভিডেন্ড ছেড়ে দিতে হয়।"],
          ["Decide all or part", "সব নাকি কিছু, ঠিক করুন", "Selling part is often enough.", "অনেক সময় কিছুটা বিক্রিই যথেষ্ট।"],
          ["Use a limit price", "লিমিট দাম দিন"],
        ),
        tip(
          "Set what we tell you about each share: a fall in its grade or a serious problem reaches you the same day, so you don't have to watch the price.",
          "প্রতিটি শেয়ার নিয়ে আমরা কী জানাব তা ঠিক করে দিন: গ্রেড কমা বা গুরুতর সমস্যা সেদিনই আপনার কাছে পৌঁছাবে, দাম পাহারা দিতে হবে না।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Sell when the company gets worse, the price runs far ahead, a share grows too big, or you need the money.", "বিক্রি করুন যখন কোম্পানি খারাপ হয়, দাম অনেক এগিয়ে যায়, একটি শেয়ার খুব বড় হয়, বা টাকা দরকার।"),
    l("A small fall or a rumour is rarely a good reason.", "সামান্য দাম কমা বা গুজব খুব কমই ভালো কারণ।"),
    l("For a share in a loss, ask whether you would buy it today.", "লোকসানে থাকা শেয়ারের জন্য প্রশ্ন করুন, আজ কি কিনতেন।"),
  ],
  tryIt: {
    text: l("Choose what we tell you about each of your shares: results, a grade change, a serious problem, a big fall.", "আপনার প্রতিটি শেয়ার নিয়ে কী জানাব ঠিক করুন: ফল, গ্রেড বদল, গুরুতর সমস্যা, বড় দরপতন।"),
    label: l("Open My shares", "আমার শেয়ার খুলুন"),
    href: "/my",
  },
  faqs: [
    {
      q: l("Should I sell a share that is in a loss?", "লোকসানে থাকা শেয়ার কি বিক্রি করব?"),
      a: l("Ask whether you would buy it today at today's price. If the company is still strong, holding is reasonable; if it has weakened, waiting for your price often costs more.", "প্রশ্ন করুন, আজকের দামে কি আজ কিনতেন। কোম্পানি শক্তিশালী থাকলে ধরে রাখা যুক্তিসংগত; দুর্বল হলে নিজের দামের অপেক্ষায় প্রায়ই আরও ক্ষতি হয়।"),
    },
    {
      q: l("When should I take profit?", "কখন মুনাফা তুলব?"),
      a: l("When the price runs far above what the company earns, or one share grows past a quarter of your money. Selling a part is often enough.", "যখন দাম কোম্পানির আয়ের তুলনায় অনেক বেড়ে যায়, বা একটি শেয়ার টাকার এক-চতুর্থাংশ পার হয়। অনেক সময় কিছুটা বিক্রিই যথেষ্ট।"),
    },
  ],
};
