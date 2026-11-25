import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip, warn } from "../build";

export const ADV_1: Lesson = {
  id: "adv-1",
  path: "advanced",
  n: 1,
  slug: LESSON_SLUGS["adv-1"],
  title: l("How to read an annual report", "বার্ষিক প্রতিবেদন পড়বেন যেভাবে"),
  seoTitle: l("How to read a company's annual report: the pages that matter", "কোম্পানির বার্ষিক প্রতিবেদন পড়বেন যেভাবে: যে পাতাগুলো জরুরি"),
  summary: l(
    "An annual report can run past 200 pages. Eight of them tell you most of what matters. Here is where to look, and in what order.",
    "একটি বার্ষিক প্রতিবেদন 200 পাতাও ছাড়িয়ে যায়। এর মধ্যে আটটি পাতাই বেশিরভাগ জরুরি কথা বলে দেয়। কোথায় আর কোন ক্রমে দেখবেন, তা এখানে।",
  ),
  minutes: 10,
  checked: "2026-11-25",
  keywords: l(
    "how to read annual report Bangladesh, annual report DSE company, auditor opinion, notes to accounts, directors report",
    "বার্ষিক প্রতিবেদন পড়ার নিয়ম, নিরীক্ষকের মতামত, হিসাবের নোট, পরিচালকদের প্রতিবেদন",
  ),
  outcomes: [
    l("Where to find the report and which pages to open first", "প্রতিবেদন কোথায় পাবেন, আর আগে কোন পাতা খুলবেন"),
    l("How to read the auditor's opinion and the notes", "নিরীক্ষকের মতামত আর নোট কীভাবে পড়বেন"),
    l("The questions to answer before you close it", "বন্ধ করার আগে যে প্রশ্নগুলোর উত্তর খুঁজবেন"),
  ],
  sections: [
    {
      heading: l("Where to find it, and what you are looking for", "কোথায় পাবেন, আর কী খুঁজছেন"),
      blocks: [
        p(
          "Every listed company publishes its annual report on its own website, and the DSE posts the audited results. You are not reading it cover to cover. You are answering four questions: is the profit real, is the company safe, is anything hidden, and do the people running it deserve trust.",
          "প্রতিটি তালিকাভুক্ত কোম্পানি নিজের ওয়েবসাইটে বার্ষিক প্রতিবেদন প্রকাশ করে, আর ডিএসই নিরীক্ষিত ফল পোস্ট করে। আপনি পুরোটা পড়তে বসছেন না। আপনি চারটি প্রশ্নের উত্তর খুঁজছেন: মুনাফা কি আসল, কোম্পানি কি নিরাপদ, কিছু কি লুকানো আছে, আর যাঁরা চালান তাঁদের কি বিশ্বাস করা যায়।",
        ),
        steps(
          ["The auditor's report", "নিরীক্ষকের প্রতিবেদন"],
          ["The five-year summary", "পাঁচ বছরের সারসংক্ষেপ"],
          ["The cash flow statement", "নগদ প্রবাহের বিবরণী"],
          ["The balance sheet", "স্থিতিপত্র (ব্যালান্স শিট)"],
          ["The notes: related parties, loans, contingent liabilities", "নোট: সংশ্লিষ্ট পক্ষ, ঋণ, সম্ভাব্য দায়"],
          ["The directors' report", "পরিচালকদের প্রতিবেদন"],
        ),
        p(
          "Read in this order. The first page you open is not the chairman's letter, it is the auditor's.",
          "এই ক্রমে পড়ুন। প্রথমে চেয়ারম্যানের চিঠি নয়, নিরীক্ষকের প্রতিবেদন খুলুন।",
        ),
      ],
    },
    {
      heading: l("1. The auditor's report: read this first", "1. নিরীক্ষকের প্রতিবেদন: সবার আগে"),
      blocks: [
        p(
          "The auditor is an outside firm that checks the accounts. Their report says one of these things, and the difference matters a lot.",
          "নিরীক্ষক বাইরের একটি প্রতিষ্ঠান, যারা হিসাব যাচাই করে। তাদের প্রতিবেদনে এর কোনো একটি থাকে, আর পার্থক্যটা খুব গুরুত্বপূর্ণ।",
        ),
        {
          kind: "table",
          head: [l("What it says", "কী বলে"), l("What it means for you", "আপনার জন্য মানে")],
          rows: [
            [l("Unmodified (clean) opinion", "পরিষ্কার মতামত"), l("The auditor found the accounts fair. The normal case.", "নিরীক্ষক হিসাব ঠিক পেয়েছেন। স্বাভাবিক অবস্থা।")],
            [l("Emphasis of matter", "বিশেষ বিষয়ে দৃষ্টি আকর্ষণ"), l("The accounts are fair, but read the point the auditor raises. It is often a lawsuit, a tax dispute or an unpaid amount.", "হিসাব ঠিক, তবে নিরীক্ষক যে বিষয়টি তুলেছেন তা পড়ুন। প্রায়ই মামলা, কর নিয়ে বিরোধ বা আদায় না হওয়া টাকা।")],
            [l("Qualified opinion", "শর্তসাপেক্ষ মতামত"), l("The auditor could not accept part of the accounts. Read the “basis for qualified opinion” paragraph carefully.", "নিরীক্ষক হিসাবের কিছু অংশ মেনে নিতে পারেননি। “শর্তসাপেক্ষ মতামতের ভিত্তি” অনুচ্ছেদটি মন দিয়ে পড়ুন।")],
            [l("Going concern doubt", "চালু থাকা নিয়ে সংশয়"), l("The auditor doubts the company can keep running. A serious warning.", "কোম্পানি চালু থাকতে পারবে কি না, নিরীক্ষকের সংশয় আছে। গুরুতর সতর্কতা।")],
          ],
        },
        warn(
          "A qualified opinion that repeats year after year, on the same matter, means the problem is not being fixed.",
          "একই বিষয়ে বছরের পর বছর শর্তসাপেক্ষ মতামত মানে সমস্যাটির সমাধান হচ্ছে না।",
        ),
      ],
    },
    {
      heading: l("2. The five-year summary and the cash flow", "2. পাঁচ বছরের সারসংক্ষেপ আর নগদ প্রবাহ"),
      blocks: [
        p(
          "Most reports have a five-year table near the front. Look at sales, profit and profit per share side by side. Steady growth in all three is what you hope for; profit growing much faster than sales for years is worth a question.",
          "বেশিরভাগ প্রতিবেদনের শুরুর দিকে পাঁচ বছরের একটি টেবিল থাকে। বিক্রি, মুনাফা আর শেয়ারপ্রতি মুনাফা পাশাপাশি দেখুন। তিনটিই ধীরে ধীরে বাড়লে ভালো; বছরের পর বছর বিক্রির চেয়ে অনেক দ্রুত মুনাফা বাড়লে প্রশ্ন তোলার মতো।",
        ),
        p(
          "Then open the cash flow statement and find **cash from operating activities**. Over a few years it should be close to the profit. If profit rises every year while operating cash stays low or negative, the profit may not be turning into money. The post [Is the profit real?](/learn/is-the-profit-real) goes deeper.",
          "এরপর নগদ প্রবাহের বিবরণী খুলে **পরিচালন কার্যক্রম থেকে নগদ** খুঁজুন। কয়েক বছরে এটি মুনাফার কাছাকাছি হওয়ার কথা। মুনাফা প্রতি বছর বাড়ছে অথচ পরিচালন নগদ কম বা ঋণাত্মক থাকছে, তাহলে মুনাফা হয়তো টাকায় পরিণত হচ্ছে না। আরও বিস্তারিত আছে [মুনাফা কি আসল?](/blog/is-the-profit-real) লেখায়।",
        ),
      ],
    },
    {
      heading: l("3. The balance sheet", "3. স্থিতিপত্র"),
      blocks: [
        list(
          ["**Loans:** short-term and long-term borrowings together, against the company's own money (equity). Growing much faster than sales is a warning.", "**ঋণ:** স্বল্প আর দীর্ঘমেয়াদি ঋণ মিলিয়ে, কোম্পানির নিজস্ব মূলধনের সঙ্গে তুলনা করুন। বিক্রির চেয়ে অনেক দ্রুত বাড়লে সতর্ক হোন।"],
          ["**Money owed by customers (receivables):** if it grows faster than sales, the company may be selling on credit it can't collect.", "**গ্রাহকের কাছে পাওনা:** বিক্রির চেয়ে দ্রুত বাড়লে হয়তো কোম্পানি এমন বাকিতে বিক্রি করছে যা আদায় হচ্ছে না।"],
          ["**Stock in the warehouse (inventory):** a big rise with flat sales means goods are not selling.", "**মজুত মাল:** বিক্রি স্থির থাকা অবস্থায় মজুত অনেক বাড়লে বোঝায় মাল বিক্রি হচ্ছে না।"],
          ["**Cash:** enough to cover the next year's loan payments is a comfort.", "**নগদ:** আগামী বছরের ঋণের কিস্তি মেটানোর মতো থাকলে স্বস্তি।"],
        ),
      ],
    },
    {
      heading: l("4. The notes: where problems hide", "4. নোট: যেখানে সমস্যা লুকিয়ে থাকে"),
      blocks: [
        list(
          ["**Related party transactions:** sales to, purchases from or loans to companies owned by the directors. Large amounts deserve a close look.", "**সংশ্লিষ্ট পক্ষের লেনদেন:** পরিচালকদের মালিকানার কোম্পানির কাছে বিক্রি, তাদের কাছ থেকে কেনা বা তাদের ঋণ দেওয়া। বড় অঙ্ক হলে খুঁটিয়ে দেখুন।"],
          ["**Contingent liabilities:** lawsuits, guarantees and tax claims that could become real costs.", "**সম্ভাব্য দায়:** মামলা, জামানত আর কর দাবি, যা বাস্তব খরচে পরিণত হতে পারে।"],
          ["**Other income:** interest on deposits, gains on selling land or shares. Helpful, but not the business.", "**অন্যান্য আয়:** আমানতের সুদ, জমি বা শেয়ার বিক্রির লাভ। কাজে লাগে, কিন্তু মূল ব্যবসা নয়।"],
          ["**Loan details:** interest rates, who lent, and when they must be paid back.", "**ঋণের বিস্তারিত:** সুদের হার, কে ঋণ দিয়েছে, আর কবে শোধ করতে হবে।"],
        ),
      ],
    },
    {
      heading: l("5. The directors' report, read last", "5. পরিচালকদের প্রতিবেদন, সবার শেষে"),
      blocks: [
        p(
          "Now read what management says about the year: new plants, new products, problems. Compare it with what the numbers showed. A good report explains the bad parts too; one that only talks about successes while profit fell is a signal in itself.",
          "এবার পড়ুন ব্যবস্থাপনা বছরটি নিয়ে কী বলছে: নতুন কারখানা, নতুন পণ্য, সমস্যা। সংখ্যা যা দেখিয়েছে তার সঙ্গে মিলিয়ে নিন। ভালো প্রতিবেদন খারাপ দিকগুলোরও ব্যাখ্যা দেয়; মুনাফা কমা সত্ত্বেও শুধু সাফল্যের কথা বললে, সেটাই একটা সংকেত।",
        ),
        tip(
          "Keep a one-page note for each company you own: auditor's opinion, five-year profit, operating cash, loans, anything odd in the notes. Next year, compare.",
          "নিজের প্রতিটি কোম্পানির জন্য এক পাতার নোট রাখুন: নিরীক্ষকের মতামত, পাঁচ বছরের মুনাফা, পরিচালন নগদ, ঋণ, নোটে অস্বাভাবিক কিছু। পরের বছর মিলিয়ে দেখুন।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Open the auditor's report first. A qualified opinion or going-concern doubt changes everything.", "সবার আগে নিরীক্ষকের প্রতিবেদন খুলুন। শর্তসাপেক্ষ মতামত বা চালু থাকা নিয়ে সংশয় সব বদলে দেয়।"),
    l("Compare five years of profit with cash from operations, and loans with the company's own money.", "পাঁচ বছরের মুনাফাকে পরিচালন নগদের সঙ্গে, আর ঋণকে নিজস্ব মূলধনের সঙ্গে তুলনা করুন।"),
    l("The notes hold related-party deals, lawsuits and one-off income. Read the directors' report last.", "নোটে থাকে সংশ্লিষ্ট পক্ষের লেনদেন, মামলা আর এককালীন আয়। পরিচালকদের প্রতিবেদন সবার শেষে পড়ুন।"),
  ],
  words: [
    { term: l("Qualified opinion", "শর্তসাপেক্ষ মতামত"), meaning: l("The auditor accepts the accounts except for a part they could not confirm.", "নিরীক্ষক হিসাব মেনেছেন, শুধু যে অংশ নিশ্চিত করতে পারেননি তা ছাড়া।") },
    { term: l("Related party", "সংশ্লিষ্ট পক্ষ"), meaning: l("A person or company linked to the directors or owners.", "পরিচালক বা মালিকদের সঙ্গে যুক্ত কোনো ব্যক্তি বা কোম্পানি।") },
    { term: l("Contingent liability", "সম্ভাব্য দায়"), meaning: l("A cost that may arise, such as a lawsuit the company could lose.", "যে খরচ হতে পারে, যেমন এমন মামলা যাতে কোম্পানি হারতে পারে।") },
  ],
  tryIt: {
    text: l("Every company's page lists what its auditor said, with a link to the report.", "প্রতিটি কোম্পানির পেজে নিরীক্ষক কী বলেছেন তা থাকে, প্রতিবেদনের লিংকসহ।"),
    label: l("See auditor warnings", "নিরীক্ষকের সতর্কতা দেখুন"),
    href: "/stock-insights/auditor-warnings",
  },
  faqs: [
    {
      q: l("Where can I find a DSE company's annual report?", "ডিএসইর কোম্পানির বার্ষিক প্রতিবেদন কোথায় পাব?"),
      a: l("On the company's own website, usually under “investor relations”. The DSE also posts the audited results and the auditor's notes.", "কোম্পানির নিজের ওয়েবসাইটে, সাধারণত “ইনভেস্টর রিলেশনস” অংশে। ডিএসইও নিরীক্ষিত ফল আর নিরীক্ষকের নোট পোস্ট করে।"),
    },
    {
      q: l("What is the most important page in an annual report?", "বার্ষিক প্রতিবেদনের সবচেয়ে জরুরি পাতা কোনটি?"),
      a: l("The auditor's report. It tells you whether the rest of the numbers can be trusted.", "নিরীক্ষকের প্রতিবেদন। বাকি সংখ্যাগুলো বিশ্বাস করা যায় কি না, তা এটাই বলে দেয়।"),
    },
  ],
};
