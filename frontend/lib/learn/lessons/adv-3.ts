import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip, warn } from "../build";

export const ADV_3: Lesson = {
  id: "adv-3",
  path: "advanced",
  n: 3,
  slug: LESSON_SLUGS["adv-3"],
  title: l("Is the profit real? Checking cash against profit", "মুনাফা কি আসল? নগদ টাকার সঙ্গে মিলিয়ে দেখা"),
  summary: l(
    "Profit is an accounting number; cash is what pays dividends and loans. How to check that a company's profit turns into money.",
    "মুনাফা হিসাবের একটি সংখ্যা; ডিভিডেন্ড আর ঋণ শোধ হয় নগদ টাকায়। কোম্পানির মুনাফা টাকায় পরিণত হচ্ছে কি না, কীভাবে যাচাই করবেন।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "quality of earnings, operating cash flow vs profit, cash flow analysis Bangladesh, receivables, other income",
    "মুনাফার মান, পরিচালন নগদ বনাম মুনাফা, নগদ প্রবাহ বিশ্লেষণ, গ্রাহকের কাছে পাওনা, অন্যান্য আয়",
  ),
  outcomes: [
    l("Why profit and cash can drift apart", "মুনাফা আর নগদ কেন আলাদা হতে পারে"),
    l("The one ratio to check: cash per ৳100 of profit", "একটি হিসাব দেখুন: প্রতি ৳100 মুনাফায় কত নগদ"),
    l("Where one-off and outside income hides", "এককালীন আর বাইরের আয় কোথায় লুকিয়ে থাকে"),
  ],
  sections: [
    {
      heading: l("Profit is not cash", "মুনাফা মানেই নগদ নয়"),
      blocks: [
        p(
          "A company books a sale when it delivers the goods, even if the customer pays months later. So profit can rise while the bank account doesn't. Over a year or two that evens out in a healthy company. When it doesn't, something is wrong.",
          "পণ্য দেওয়ার সময়ই কোম্পানি বিক্রি হিসাবে ধরে, গ্রাহক কয়েক মাস পরে টাকা দিলেও। তাই ব্যাংকে টাকা না বাড়লেও মুনাফা বাড়তে পারে। ভালো কোম্পানিতে এক-দুই বছরে তা সমান হয়ে যায়। না হলে কিছু একটা ঠিক নেই।",
        ),
      ],
    },
    {
      heading: l("Cash per ৳100 of profit", "প্রতি ৳100 মুনাফায় কত নগদ"),
      blocks: [
        p(
          "Add up **cash from operating activities** for the last three to five years and divide by profit after tax over the same years. Read it as taka of cash for every ৳100 of profit.",
          "গত তিন থেকে পাঁচ বছরের **পরিচালন কার্যক্রম থেকে নগদ** যোগ করুন, আর একই বছরগুলোর কর-পরবর্তী মুনাফা দিয়ে ভাগ করুন। পড়ুন এভাবে: প্রতি ৳100 মুনাফায় কত টাকা নগদ।",
        ),
        {
          kind: "table",
          head: [l("Cash per ৳100 of profit", "প্রতি ৳100 মুনাফায় নগদ"), l("What it means", "মানে")],
          rows: [
            [l("৳90 or more", "৳90 বা তার বেশি"), l("The profit is backed by cash.", "মুনাফার পেছনে নগদ আছে।")],
            [l("৳50 to ৳90", "৳50 থেকে ৳90"), l("Partly backed. Find out where the rest went.", "আংশিক। বাকিটা কোথায় গেল, খুঁজে দেখুন।")],
            [l("Under ৳50", "৳50-এর কম"), l("Mostly on paper. A warning.", "বেশিরভাগই কাগজে। সতর্ক হোন।")],
            [l("Negative", "ঋণাত্মক"), l("More cash went out than came in while it showed a profit.", "মুনাফা দেখানোর সময়েও যত নগদ এসেছে তার চেয়ে বেশি বেরিয়ে গেছে।")],
          ],
        },
        {
          kind: "example",
          title: l("Example: three years of a made-up company", "উদাহরণ: একটি বানানো কোম্পানির তিন বছর"),
          rows: [
            { label: l("Profit after tax, 3 years", "কর-পরবর্তী মুনাফা, 3 বছর"), value: l("৳300 crore", "৳300 কোটি") },
            { label: l("Cash from operations, 3 years", "পরিচালন নগদ, 3 বছর"), value: l("৳105 crore", "৳105 কোটি") },
          ],
          total: { label: l("Cash per ৳100 of profit", "প্রতি ৳100 মুনাফায় নগদ"), value: "৳35" },
          note: l("Mostly on paper. The next step is to find where the cash went.", "বেশিরভাগই কাগজে। এরপর খুঁজতে হবে নগদ কোথায় গেল।"),
        },
      ],
    },
    {
      heading: l("Where the cash goes", "নগদ কোথায় যায়"),
      blocks: [
        list(
          ["**Customers owe more.** Money owed (receivables) growing much faster than sales.", "**গ্রাহকের কাছে পাওনা বাড়ছে।** বিক্রির চেয়ে পাওনা অনেক দ্রুত বাড়ছে।"],
          ["**Goods pile up.** Stock in the warehouse growing faster than sales.", "**মাল জমছে।** গুদামের মজুত বিক্রির চেয়ে দ্রুত বাড়ছে।"],
          ["**Money to related companies.** Advances or loans to companies of the directors, in the notes.", "**সংশ্লিষ্ট কোম্পানিতে টাকা।** পরিচালকদের কোম্পানিতে অগ্রিম বা ঋণ, নোটে থাকে।"],
          ["**A government customer that pays late.** Common for power companies selling to the state.", "**দেরিতে টাকা দেওয়া সরকারি গ্রাহক।** রাষ্ট্রের কাছে বিদ্যুৎ বিক্রি করা কোম্পানিগুলোর ক্ষেত্রে সাধারণ।"],
        ),
      ],
    },
    {
      heading: l("Profit from outside the business", "ব্যবসার বাইরের মুনাফা"),
      blocks: [
        p(
          "Check how much of the profit comes from the business itself: operating profit, before interest and tax, against the whole profit. If the business makes ৳30 of every ৳100 and the rest is interest on deposits or a land sale, next year's profit is on weaker ground.",
          "মুনাফার কত অংশ মূল ব্যবসা থেকে আসে দেখুন: সুদ আর করের আগের পরিচালন মুনাফাকে মোট মুনাফার সঙ্গে তুলনা করুন। ব্যবসা প্রতি ৳100-এ ৳30 আয় করলে আর বাকিটা আমানতের সুদ বা জমি বিক্রি থেকে এলে, আগামী বছরের মুনাফার ভিত দুর্বল।",
        ),
        warn(
          "A profit jump of 50% or more while sales barely moved is usually a one-off. Don't value the company on it.",
          "বিক্রি প্রায় না বদলালেও মুনাফা 50% বা তার বেশি লাফালে সাধারণত তা এককালীন। এর ভিত্তিতে কোম্পানির দাম ধরবেন না।",
        ),
      ],
    },
    {
      heading: l("Banks and insurers are different", "ব্যাংক আর বিমা আলাদা"),
      blocks: [
        p(
          "A bank's cash flow swings with deposits and loans, so this test doesn't work for banks, finance companies or insurers. For them, check bad loans and provisions instead; see [How to judge a bank share](/learn/judge-a-bank-stock).",
          "ব্যাংকের নগদ প্রবাহ আমানত আর ঋণের সঙ্গে ওঠানামা করে, তাই এই যাচাই ব্যাংক, আর্থিক প্রতিষ্ঠান বা বিমার ক্ষেত্রে কাজ করে না। তাদের জন্য খারাপ ঋণ আর প্রভিশন দেখুন; পড়ুন [ব্যাংকের শেয়ার যাচাই](/blog/judge-a-bank-stock)।",
        ),
        tip(
          "Our report “Is the profit real?” runs this check on every non-financial company and lists the ones whose profit is mostly on paper.",
          "আমাদের “মুনাফা কি আসল?” রিপোর্ট আর্থিক খাত ছাড়া সব কোম্পানিতে এই যাচাই চালায়, আর যাদের মুনাফা বেশিরভাগ কাগজে, তাদের তালিকা দেয়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Over a few years, cash from operations should be close to profit.", "কয়েক বছরে পরিচালন নগদ মুনাফার কাছাকাছি হওয়া উচিত।"),
    l("Under ৳50 of cash per ৳100 of profit is a warning; find where the cash went.", "প্রতি ৳100 মুনাফায় ৳50-এর কম নগদ সতর্কতা; নগদ কোথায় গেল খুঁজুন।"),
    l("Separate the business's own profit from interest, land sales and other one-offs.", "মূল ব্যবসার মুনাফাকে সুদ, জমি বিক্রি আর অন্যান্য এককালীন আয় থেকে আলাদা করুন।"),
  ],
  words: [
    { term: l("Receivables", "পাওনা"), meaning: l("Money customers owe the company for goods already delivered.", "দেওয়া পণ্যের জন্য গ্রাহকের কাছে কোম্পানির পাওনা টাকা।") },
    { term: l("Operating profit", "পরিচালন মুনাফা"), meaning: l("Profit from the business itself, before interest and tax.", "সুদ আর করের আগে, মূল ব্যবসা থেকে মুনাফা।") },
  ],
  tryIt: {
    text: l("See which companies' profit is backed by cash and which is mostly on paper.", "কোন কোম্পানির মুনাফার পেছনে নগদ আছে, আর কোনটির বেশিরভাগ কাগজে, দেখুন।"),
    label: l("Open “Is the profit real?”", "“মুনাফা কি আসল?” খুলুন"),
    href: "/stock-insights/is-the-profit-real",
  },
  faqs: [
    {
      q: l("Why can a company show a profit but have no cash?", "মুনাফা দেখিয়েও কোম্পানির নগদ কেন থাকে না?"),
      a: l("Sales are counted when goods are delivered, not when customers pay. If customers pay late or goods pile up, profit rises while cash doesn't.", "পণ্য দেওয়ার সময় বিক্রি ধরা হয়, গ্রাহক টাকা দেওয়ার সময় নয়। গ্রাহক দেরিতে দিলে বা মাল জমে থাকলে মুনাফা বাড়ে, নগদ বাড়ে না।"),
    },
  ],
};
