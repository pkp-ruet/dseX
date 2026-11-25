import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip, warn } from "../build";

export const BASICS_4: Lesson = {
  id: "basics-4",
  path: "basics",
  n: 4,
  slug: LESSON_SLUGS["basics-4"],
  title: l("How to tell a good company in 10 minutes", "10 মিনিটে ভালো কোম্পানি চিনবেন যেভাবে"),
  seoTitle: l("How to tell a good company on the DSE: four questions", "ভালো কোম্পানি চেনার উপায়: চারটি প্রশ্ন"),
  summary: l(
    "Four questions about profit, loans, the business and dividends, plus the warnings to check, before you buy any share.",
    "যেকোনো শেয়ার কেনার আগে মুনাফা, ঋণ, ব্যবসা আর ডিভিডেন্ড নিয়ে চারটি প্রশ্ন, সঙ্গে কোন সতর্কতাগুলো দেখবেন।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "how to choose good stock Bangladesh, fundamental analysis DSE, EPS meaning, good company DSE, stock checklist",
    "ভালো শেয়ার চেনার উপায়, ভালো কোম্পানি, ইপিএস মানে, শেয়ার কেনার আগে যা দেখবেন, মৌলিক বিশ্লেষণ",
  ),
  outcomes: [
    l("The four questions to ask about any company", "যেকোনো কোম্পানি নিয়ে চারটি প্রশ্ন"),
    l("The warnings that rule a share out", "যে সতর্কতাগুলো দেখলে শেয়ার বাদ দেবেন"),
    l("How to find the answers on TopStockBD in minutes", "TopStockBD-তে কয়েক মিনিটে উত্তর পাওয়ার উপায়"),
  ],
  sections: [
    {
      heading: l("Question 1: Does it make a profit, year after year?", "প্রশ্ন 1: বছরের পর বছর কি মুনাফা করে?"),
      blocks: [
        p(
          "Look at the **profit per share** (EPS) for the last five years. A good company makes a profit most years, and the profit grows or holds steady. A loss in the latest year is a reason to wait.",
          "গত পাঁচ বছরের **শেয়ারপ্রতি মুনাফা** (ইপিএস) দেখুন। ভালো কোম্পানি বেশিরভাগ বছর মুনাফা করে, আর মুনাফা বাড়ে বা স্থির থাকে। সর্বশেষ বছরে লোকসান হলে অপেক্ষা করাই ভালো।",
        ),
      ],
    },
    {
      heading: l("Question 2: Can it handle its loans?", "প্রশ্ন 2: ঋণ কি সামলাতে পারে?"),
      blocks: [
        p(
          "Compare the company's loans with the money it has kept from past years' profit. Loans smaller than that are comfortable. Loans bigger than the whole company's market value are a serious warning.",
          "কোম্পানির ঋণকে আগের বছরগুলোর মুনাফা থেকে জমানো টাকার সঙ্গে তুলনা করুন। ঋণ তার চেয়ে কম হলে স্বস্তির। ঋণ পুরো কোম্পানির বাজার মূল্যের চেয়েও বেশি হলে তা গুরুতর সতর্কতা।",
        ),
        tip(
          "Banks and finance companies are different: borrowing is their business. For them, check how much of their own money stands behind their lending.",
          "ব্যাংক আর আর্থিক প্রতিষ্ঠান আলাদা: ঋণ নেওয়াই তাদের ব্যবসা। তাদের ক্ষেত্রে দেখুন, তাদের দেওয়া ঋণের পেছনে নিজস্ব টাকা কতটা আছে।",
        ),
      ],
    },
    {
      heading: l("Question 3: Is the business strong?", "প্রশ্ন 3: ব্যবসা কি শক্তিশালী?"),
      blocks: [
        list(
          ["Is it one of the bigger companies in its business?", "নিজের ব্যবসায় এটি কি বড় কোম্পানিগুলোর একটি?"],
          ["Do its sales grow steadily, without wild swings?", "বিক্রি কি ধীরে ধীরে বাড়ে, বড় ওঠানামা ছাড়া?"],
          ["Does it keep a healthy share of each sale as profit?", "প্রতিটি বিক্রি থেকে কি ভালো অংশ মুনাফা হিসেবে থাকে?"],
        ),
      ],
    },
    {
      heading: l("Question 4: Does it share its profit?", "প্রশ্ন 4: মুনাফার ভাগ কি দেয়?"),
      blocks: [
        p(
          "A company that pays a **cash dividend** every year, and doesn't pay out more than it earns, is usually well run. Bonus shares alone, year after year, add shares but no cash.",
          "যে কোম্পানি প্রতি বছর **নগদ ডিভিডেন্ড** দেয়, আর আয়ের চেয়ে বেশি দেয় না, সাধারণত সেটি ভালোভাবে চলে। বছরের পর বছর শুধু বোনাস শেয়ার দিলে শেয়ার বাড়ে, কিন্তু নগদ টাকা আসে না।",
        ),
      ],
    },
    {
      heading: l("Then check for warnings", "তারপর সতর্কতা দেখুন"),
      blocks: [
        warn(
          "Leave a share for later if any of these is true: it is in Z category, its auditor did not fully approve its accounts, its accounts are two or more years old, or its price jumped with no company news.",
          "এর কোনোটি সত্য হলে শেয়ারটি আপাতত বাদ দিন: Z ক্যাটাগরিতে আছে, নিরীক্ষক হিসাব পুরোপুরি অনুমোদন করেননি, হিসাব দুই বছর বা তার বেশি পুরোনো, বা কোম্পানির খবর ছাড়াই দাম লাফিয়ে বেড়েছে।",
        ),
        {
          kind: "table",
          head: [l("", ""), l("Company A", "কোম্পানি A"), l("Company B", "কোম্পানি B")],
          rows: [
            [l("Profit, 5 years", "মুনাফা, 5 বছর"), l("Every year, growing", "প্রতি বছর, বাড়ছে"), l("Loss in 2 of 5 years", "5 বছরের 2 বছরে লোকসান")],
            [l("Loans", "ঋণ"), l("Small", "অল্প"), l("More than its market value", "বাজার মূল্যের চেয়ে বেশি")],
            [l("Cash dividend", "নগদ ডিভিডেন্ড"), l("5 of 5 years", "5 বছরে 5 বার"), l("None for 3 years", "3 বছর ধরে নেই")],
            [l("Category", "ক্যাটাগরি"), l("A", "A"), l("Z", "Z")],
          ],
        },
        p(
          "Made-up examples. Company A passes all four questions; Company B fails most of them, however cheap its price looks.",
          "বানানো উদাহরণ। কোম্পানি A চারটি প্রশ্নেই উতরে যায়; কোম্পানি B বেশিরভাগে আটকায়, দাম যত কমই দেখাক।",
        ),
      ],
    },
    {
      heading: l("Doing it in 10 minutes on TopStockBD", "TopStockBD-তে 10 মিনিটে"),
      blocks: [
        steps(
          ["Open All companies", "সব কোম্পানি খুলুন", "Every DSE company, strongest first.", "ডিএসইর সব কোম্পানি, সবচেয়ে শক্তিশালী আগে।"],
          ["Open a company's page", "একটি কোম্পানির পেজ খুলুন", "The top shows our view of the company, its dividend, today's price and any problems we found.", "শুরুতে থাকে কোম্পানি নিয়ে আমাদের মত, ডিভিডেন্ড, আজকের দাম আর আমরা কোনো সমস্যা পেয়েছি কি না।"],
          ["Read “Why we say this”", "“কেন আমরা এটা বলছি” পড়ুন", "Six short cards: profit, finances, business, dividend, price and safety.", "ছয়টি ছোট কার্ড: মুনাফা, আর্থিক অবস্থা, ব্যবসা, ডিভিডেন্ড, দাম আর নিরাপত্তা।"],
          ["Check the numbers yourself", "সংখ্যাগুলো নিজে মিলিয়ে নিন", "“The numbers” at the bottom has every year's profit, dividends and loans.", "নিচে “সংখ্যাগুলো” অংশে প্রতি বছরের মুনাফা, ডিভিডেন্ড আর ঋণ আছে।"],
        ),
      ],
    },
  ],
  keyPoints: [
    l("Ask four questions: steady profit, loans it can carry, a strong business, a cash dividend.", "চারটি প্রশ্ন করুন: স্থির মুনাফা, সামলানো যায় এমন ঋণ, শক্তিশালী ব্যবসা, নগদ ডিভিডেন্ড।"),
    l("Leave out Z category, auditor warnings, old accounts and jumps with no news.", "Z ক্যাটাগরি, নিরীক্ষকের সতর্কতা, পুরোনো হিসাব আর খবরহীন লাফ বাদ দিন।"),
    l("A good company is the first question. Whether its price is right is the next post.", "ভালো কোম্পানি প্রথম প্রশ্ন। দাম ঠিক আছে কি না, তা পরের লেখায়।"),
  ],
  words: [
    { term: l("EPS (profit per share)", "ইপিএস (শেয়ারপ্রতি মুনাফা)"), meaning: l("The year's profit divided by the number of shares.", "বছরের মুনাফাকে মোট শেয়ার সংখ্যা দিয়ে ভাগ করলে যা হয়।") },
    { term: l("Cash dividend", "নগদ ডিভিডেন্ড"), meaning: l("Profit the company pays its owners in cash.", "কোম্পানি মালিকদের নগদে যে মুনাফা দেয়।") },
  ],
  tryIt: {
    text: l("See every DSE company ranked by our checks.", "আমাদের যাচাই অনুযায়ী সাজানো ডিএসইর সব কোম্পানি দেখুন।"),
    label: l("Open All companies", "সব কোম্পানি খুলুন"),
    href: "/dsestockranking",
  },
  faqs: [
    {
      q: l("What is EPS in the share market?", "শেয়ার বাজারে ইপিএস কী?"),
      a: l("Earnings per share: the company's yearly profit divided by its number of shares. It shows how much profit each share earned.", "শেয়ারপ্রতি আয়: কোম্পানির বার্ষিক মুনাফাকে শেয়ার সংখ্যা দিয়ে ভাগ করলে যা হয়। প্রতিটি শেয়ার কত মুনাফা করল, তা বোঝায়।"),
    },
    {
      q: l("Is a low share price a sign of a bad company?", "শেয়ারের দাম কম মানে কি কোম্পানি খারাপ?"),
      a: l("No. Price alone says nothing. A ৳20 share can be expensive and a ৳500 share cheap; it depends on what the company earns.", "না। শুধু দাম কিছুই বলে না। ৳20-এর শেয়ারও দামি হতে পারে, ৳500-এর শেয়ারও সস্তা; নির্ভর করে কোম্পানি কত আয় করে তার ওপর।"),
    },
  ],
};
