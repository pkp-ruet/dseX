import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip, warn } from "../build";

export const ADV_11: Lesson = {
  id: "adv-11",
  path: "advanced",
  n: 11,
  slug: LESSON_SLUGS["adv-11"],
  title: l("Tax for share investors: TIN, rebate and dividend tax", "বিনিয়োগকারীর কর: টিআইএন, রিবেট আর ডিভিডেন্ডের কর"),
  seoTitle: l("Tax for share investors in Bangladesh: TIN, investment rebate and dividend tax", "বাংলাদেশে শেয়ার বিনিয়োগকারীর কর: টিআইএন, বিনিয়োগ রিবেট আর ডিভিডেন্ডের কর"),
  summary: l(
    "How tax touches your shares: what is taken from dividends, why a TIN lowers it, how investing can reduce your income tax, and the records to keep.",
    "শেয়ারে কর কীভাবে আসে: ডিভিডেন্ড থেকে কত কাটা হয়, টিআইএন থাকলে কেন কম, বিনিয়োগ কীভাবে আয়কর কমাতে পারে, আর কোন হিসাব রাখবেন।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "tax on dividend Bangladesh, TIN for share investors, investment rebate shares, capital gain tax DSE, income tax return shares",
    "ডিভিডেন্ডের কর, শেয়ার বিনিয়োগে টিআইএন, বিনিয়োগ রিবেট, শেয়ারের মূলধনী মুনাফার কর, আয়কর রিটার্নে শেয়ার",
  ),
  outcomes: [
    l("What tax is taken from your dividends", "ডিভিডেন্ড থেকে কত কর কাটা হয়"),
    l("How investing in shares can lower your income tax", "শেয়ারে বিনিয়োগ কীভাবে আয়কর কমাতে পারে"),
    l("What to keep for your tax return", "আয়কর রিটার্নের জন্য কী রাখবেন"),
  ],
  sections: [
    {
      heading: l("Tax on dividends", "ডিভিডেন্ডের কর"),
      blocks: [
        p(
          "When a company pays a cash dividend, tax is taken out before the money reaches your bank. Under the current rules it is 10% if you have a TIN registered with your BO account, and 15% if you don't. So the yield you see on a share's page is before tax.",
          "কোম্পানি নগদ ডিভিডেন্ড দিলে টাকা আপনার ব্যাংকে পৌঁছানোর আগেই কর কেটে রাখা হয়। বর্তমান নিয়মে বিও অ্যাকাউন্টে টিআইএন যুক্ত থাকলে 10%, না থাকলে 15%। তাই শেয়ারের পেজে যে ইল্ড দেখেন, তা করের আগের হিসাব।",
        ),
        {
          kind: "example",
          title: l("Example: a ৳10,000 dividend", "উদাহরণ: ৳10,000 ডিভিডেন্ড"),
          rows: [
            { label: l("With a TIN (10% taken)", "টিআইএন থাকলে (10% কাটা)"), value: "৳9,000" },
            { label: l("Without a TIN (15% taken)", "টিআইএন না থাকলে (15% কাটা)"), value: "৳8,500" },
          ],
          note: l("Add your TIN to your BO account through your broker; it is a one-time step.", "ব্রোকারের মাধ্যমে বিও অ্যাকাউন্টে টিআইএন যুক্ত করুন; একবারের কাজ।"),
        },
      ],
    },
    {
      heading: l("Profit from selling shares", "শেয়ার বিক্রির মুনাফা"),
      blocks: [
        p(
          "For most individual investors, profit from selling listed shares has not been taxed, or has been tax-free up to a large limit. Very large gains, and sponsors and directors, can face different rules. These rules change in budgets, so check the current year before you file.",
          "বেশিরভাগ ব্যক্তি বিনিয়োগকারীর জন্য তালিকাভুক্ত শেয়ার বিক্রির মুনাফায় কর লাগেনি, বা বড় একটি সীমা পর্যন্ত করমুক্ত ছিল। খুব বড় মুনাফা, আর উদ্যোক্তা-পরিচালকদের জন্য নিয়ম আলাদা হতে পারে। বাজেটে এসব নিয়ম বদলায়, তাই রিটার্ন জমার আগে চলতি বছরের নিয়ম দেখে নিন।",
        ),
      ],
    },
    {
      heading: l("Lowering your income tax by investing", "বিনিয়োগ করে আয়কর কমানো"),
      blocks: [
        p(
          "Money you put into listed shares in the tax year can count as an eligible investment, which lowers the income tax you pay through a rebate. The rate, the limits and what counts are set in each year's budget. Your broker's statement of shares bought in the year is the proof.",
          "করবছরে তালিকাভুক্ত শেয়ারে যে টাকা বিনিয়োগ করেন, তা যোগ্য বিনিয়োগ হিসেবে গণ্য হতে পারে, যা রিবেটের মাধ্যমে আপনার আয়কর কমায়। হার, সীমা আর কী গণ্য হবে, তা প্রতি বছরের বাজেটে ঠিক হয়। বছরে কেনা শেয়ারের ব্রোকারের স্টেটমেন্টই প্রমাণ।",
        ),
        tip(
          "Buying shares near the end of the tax year (June) only for the rebate, without checking the companies, can cost more than the tax it saves.",
          "শুধু রিবেটের জন্য করবছরের শেষে (জুন) কোম্পানি যাচাই না করে শেয়ার কিনলে, যত কর বাঁচে তার চেয়ে বেশি ক্ষতি হতে পারে।",
        ),
      ],
    },
    {
      heading: l("Records to keep", "যে হিসাব রাখবেন"),
      blocks: [
        steps(
          ["Your broker's yearly portfolio statement", "ব্রোকারের বার্ষিক পোর্টফোলিও স্টেটমেন্ট", "Shares held at the end of the year, at cost and value.", "বছর শেষে থাকা শেয়ার, কেনা দাম আর বাজার মূল্যসহ।"],
          ["Dividend certificates or statements", "ডিভিডেন্ডের সনদ বা স্টেটমেন্ট", "They show the tax already taken, which counts against your total tax.", "এতে আগেই কাটা কর দেখানো থাকে, যা আপনার মোট করের হিসাবে বাদ যায়।"],
          ["The list of shares bought during the year", "বছরে কেনা শেয়ারের তালিকা", "For the investment rebate.", "বিনিয়োগ রিবেটের জন্য।"],
          ["Your BO statement from CDBL", "সিডিবিএলের বিও স্টেটমেন্ট"],
        ),
        warn(
          "Show your shares in the statement of assets in your tax return. Rules and rates change with each budget; for anything beyond the basics, ask a tax adviser.",
          "আয়কর রিটার্নের সম্পদ বিবরণীতে শেয়ার দেখান। প্রতি বাজেটে নিয়ম আর হার বদলায়; সাধারণ বিষয়ের বাইরে কিছু হলে কর পরামর্শকের সঙ্গে কথা বলুন।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Tax is taken from cash dividends before you get them: 10% with a TIN, 15% without.", "নগদ ডিভিডেন্ড পাওয়ার আগেই কর কাটা হয়: টিআইএন থাকলে 10%, না থাকলে 15%।"),
    l("Investing in listed shares can lower your income tax through a rebate; the rules are in each budget.", "তালিকাভুক্ত শেয়ারে বিনিয়োগ রিবেটের মাধ্যমে আয়কর কমাতে পারে; নিয়ম প্রতি বাজেটে।"),
    l("Keep your yearly statement, dividend certificates and BO statement.", "বার্ষিক স্টেটমেন্ট, ডিভিডেন্ড সনদ আর বিও স্টেটমেন্ট রাখুন।"),
  ],
  words: [
    { term: l("TIN", "টিআইএন"), meaning: l("Taxpayer identification number, issued by the tax office.", "করদাতা শনাক্তকরণ নম্বর, কর অফিস থেকে দেওয়া হয়।") },
    { term: l("Rebate", "রিবেট"), meaning: l("A reduction in the tax you owe, earned by eligible investments.", "যোগ্য বিনিয়োগের বিনিময়ে দেয় করের যে অংশ কমে।") },
  ],
  tryIt: {
    text: l("Your portfolio keeps a yearly statement of every buy, sale and dividend, ready for your tax return.", "আপনার পোর্টফোলিও প্রতিটি কেনা, বেচা আর ডিভিডেন্ডের বার্ষিক স্টেটমেন্ট রাখে, আয়কর রিটার্নের জন্য তৈরি।"),
    label: l("Open Portfolio", "পোর্টফোলিও খুলুন"),
    href: "/portfolio",
  },
  faqs: [
    {
      q: l("How much tax is taken from dividends in Bangladesh?", "বাংলাদেশে ডিভিডেন্ড থেকে কত কর কাটা হয়?"),
      a: l("Under the current rules, 10% if your TIN is on your BO account and 15% if not. It is taken before the money reaches you.", "বর্তমান নিয়মে বিও অ্যাকাউন্টে টিআইএন থাকলে 10%, না থাকলে 15%। টাকা আপনার কাছে পৌঁছানোর আগেই কাটা হয়।"),
    },
  ],
};
