import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, p, tip } from "../build";

export const ADV_9: Lesson = {
  id: "adv-9",
  path: "advanced",
  n: 9,
  slug: LESSON_SLUGS["adv-9"],
  title: l("How to judge each kind of business", "প্রতিটি ধরনের ব্যবসা যাচাই করবেন যেভাবে"),
  seoTitle: l("How to judge DSE sectors: pharma, textile, cement, power, insurance and more", "ডিএসইর সেক্টর যাচাই: ওষুধ, টেক্সটাইল, সিমেন্ট, বিদ্যুৎ, বিমা আর অন্যান্য"),
  summary: l(
    "A drug maker, a garment exporter and a power plant earn money in different ways. What to look at first in each of the DSE's main businesses.",
    "ওষুধ কোম্পানি, পোশাক রপ্তানিকারক আর বিদ্যুৎকেন্দ্র আলাদা ভাবে আয় করে। ডিএসইর প্রধান ব্যবসাগুলোর প্রতিটিতে আগে কী দেখবেন।",
  ),
  minutes: 10,
  checked: "2026-11-25",
  keywords: l(
    "DSE sectors explained, pharma stocks Bangladesh, textile stocks DSE, cement sector, power sector stocks, insurance stocks",
    "ডিএসইর সেক্টর, ওষুধ কোম্পানির শেয়ার, টেক্সটাইল শেয়ার, সিমেন্ট সেক্টর, বিদ্যুৎ সেক্টর, বিমা শেয়ার",
  ),
  outcomes: [
    l("Why one checklist doesn't fit every business", "কেন একটি তালিকা সব ব্যবসায় খাটে না"),
    l("What to check first in seven main businesses", "সাতটি প্রধান ব্যবসায় আগে কী দেখবেন"),
    l("The risk that matters most in each", "প্রতিটিতে সবচেয়ে বড় ঝুঁকি কোনটি"),
  ],
  sections: [
    {
      heading: l("One checklist doesn't fit all", "একটি তালিকা সবার জন্য নয়"),
      blocks: [
        p(
          "Profit, loans, cash and dividends matter everywhere. But a drug maker lives on its brands and margins, a garment exporter on thin margins and the dollar, a power plant on one customer's contract. Knowing the business tells you which number to look at first. Banks have their own post: [How to judge a bank share](/learn/judge-a-bank-stock).",
          "মুনাফা, ঋণ, নগদ আর ডিভিডেন্ড সব জায়গায় জরুরি। কিন্তু ওষুধ কোম্পানি চলে ব্র্যান্ড আর মার্জিনে, পোশাক রপ্তানিকারক পাতলা মার্জিন আর ডলারে, বিদ্যুৎকেন্দ্র একজন গ্রাহকের চুক্তিতে। ব্যবসাটা জানলে বোঝা যায় আগে কোন সংখ্যা দেখবেন। ব্যাংকের জন্য আলাদা লেখা আছে: [ব্যাংকের শেয়ার যাচাই](/blog/judge-a-bank-stock)।",
        ),
      ],
    },
    {
      heading: l("Pharmaceuticals", "ওষুধ"),
      blocks: [
        p(
          "Look for a high, steady share of each sale kept as profit, a wide range of products, and growing exports. New plants show ambition but add loans; check they start earning. The risk: costlier imported raw materials when the taka weakens.",
          "দেখুন প্রতিটি বিক্রি থেকে বেশি আর স্থির অংশ মুনাফা থাকে কি না, পণ্যের পরিসর বড় কি না, আর রপ্তানি বাড়ছে কি না। নতুন কারখানা উচ্চাশা দেখায় কিন্তু ঋণ বাড়ায়; আয় শুরু করছে কি না দেখুন। ঝুঁকি: টাকার দাম কমলে আমদানি করা কাঁচামালের খরচ বাড়ে।",
        ),
      ],
    },
    {
      heading: l("Textiles and garments", "টেক্সটাইল ও পোশাক"),
      blocks: [
        p(
          "Margins are thin, so small cost changes swing profit. Check loans and interest closely, export orders, and gas and power supply. The risk: a few bad years can leave heavy debt, and many small textile companies on the DSE are in Z category.",
          "মার্জিন পাতলা, তাই খরচ সামান্য বদলালেই মুনাফা ওঠানামা করে। ঋণ আর সুদ, রপ্তানির অর্ডার, আর গ্যাস-বিদ্যুতের সরবরাহ খুঁটিয়ে দেখুন। ঝুঁকি: কয়েকটি খারাপ বছর ভারী ঋণ রেখে যেতে পারে, আর ডিএসইর অনেক ছোট টেক্সটাইল কোম্পানি Z ক্যাটাগরিতে।",
        ),
      ],
    },
    {
      heading: l("Cement and steel", "সিমেন্ট ও ইস্পাত"),
      blocks: [
        p(
          "They depend on building activity and on imported raw materials priced in dollars. Check how full the plants run and how margins held when the taka fell. The risk: profit swings with the building cycle and the exchange rate.",
          "এগুলো নির্ভর করে নির্মাণ কাজ আর ডলারে কেনা আমদানি কাঁচামালের ওপর। কারখানা কতটা পূর্ণ চলে, আর টাকার দাম কমার সময় মার্জিন কেমন ছিল, দেখুন। ঝুঁকি: নির্মাণের চক্র আর বিনিময় হারের সঙ্গে মুনাফা ওঠানামা করে।",
        ),
      ],
    },
    {
      heading: l("Power and fuel", "বিদ্যুৎ ও জ্বালানি"),
      blocks: [
        p(
          "A power plant sells to the government under a contract. Check how many years are left on it, and how much the government owes (receivables). The risk: late payment hurts cash, and when a contract ends without renewal, so does the income.",
          "বিদ্যুৎকেন্দ্র চুক্তির অধীনে সরকারের কাছে বিদ্যুৎ বিক্রি করে। চুক্তির কত বছর বাকি, আর সরকারের কাছে কত পাওনা, দেখুন। ঝুঁকি: দেরিতে টাকা পেলে নগদে চাপ পড়ে, আর চুক্তি নবায়ন ছাড়া শেষ হলে আয়ও শেষ।",
        ),
      ],
    },
    {
      heading: l("Telecom and food", "টেলিকম ও খাবার"),
      blocks: [
        p(
          "Telecom and branded food companies often earn steady cash and pay high dividends. Check the share of profit paid out and any large tax or regulatory dispute in the notes. The risk: a change in tax or rules can cut profit quickly.",
          "টেলিকম আর ব্র্যান্ডের খাবারের কোম্পানি প্রায়ই নিয়মিত নগদ আয় করে আর বেশি ডিভিডেন্ড দেয়। মুনাফার কত অংশ দেয়, আর নোটে বড় কোনো কর বা নিয়ন্ত্রক বিরোধ আছে কি না, দেখুন। ঝুঁকি: কর বা নিয়ম বদলালে মুনাফা দ্রুত কমতে পারে।",
        ),
      ],
    },
    {
      heading: l("Insurance and finance companies", "বিমা ও আর্থিক প্রতিষ্ঠান"),
      blocks: [
        p(
          "General insurers earn from premiums less claims, plus income on their investments; check the claims they pay against premiums. Life insurers are judged on the growth of their fund. Finance companies (non-bank lenders) are judged like banks, and several on the DSE carry very high bad loans; check them before anything else.",
          "সাধারণ বিমা কোম্পানি আয় করে প্রিমিয়াম থেকে দাবি বাদ দিয়ে, আর বিনিয়োগের আয় থেকে; প্রিমিয়ামের তুলনায় কত দাবি দেয়, দেখুন। জীবন বিমা যাচাই হয় তহবিলের বৃদ্ধি দিয়ে। আর্থিক প্রতিষ্ঠান (ব্যাংক নয় এমন ঋণদাতা) ব্যাংকের মতো যাচাই হয়, আর ডিএসইর কয়েকটির খেলাপি ঋণ অনেক বেশি; সবার আগে তা দেখুন।",
        ),
        tip(
          "Each sector's page on TopStockBD shows its companies side by side, with the sector's middle price for profit, so you can see who is cheap or dear within its own business.",
          "TopStockBD-তে প্রতিটি সেক্টরের পেজে তার কোম্পানিগুলো পাশাপাশি থাকে, সেক্টরের মাঝের পিইসহ, তাই নিজের ব্যবসার মধ্যে কে সস্তা বা দামি, দেখা যায়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Know the business first: it tells you which number matters most.", "আগে ব্যবসাটা জানুন: কোন সংখ্যা সবচেয়ে জরুরি, তা এটাই বলে।"),
    l("Pharma: margins and exports. Textiles: loans and thin margins. Cement: building and the dollar.", "ওষুধ: মার্জিন আর রপ্তানি। টেক্সটাইল: ঋণ আর পাতলা মার্জিন। সিমেন্ট: নির্মাণ আর ডলার।"),
    l("Power: contract years and government payments. Finance companies: bad loans first.", "বিদ্যুৎ: চুক্তির বছর আর সরকারের পাওনা। আর্থিক প্রতিষ্ঠান: আগে খেলাপি ঋণ।"),
  ],
  words: [
    { term: l("Margin", "মার্জিন"), meaning: l("The share of each sale a company keeps as profit.", "প্রতিটি বিক্রি থেকে কোম্পানির কাছে মুনাফা হিসেবে যে অংশ থাকে।") },
  ],
  tryIt: {
    text: l("Open any sector to compare its companies on profit, price and dividend.", "যেকোনো সেক্টর খুলে তার কোম্পানিগুলো মুনাফা, দাম আর ডিভিডেন্ডে তুলনা করুন।"),
    label: l("Open Sectors", "সেক্টর খুলুন"),
    href: "/sectors",
  },
  faqs: [
    {
      q: l("Which sector is best for long-term investing on the DSE?", "ডিএসইতে দীর্ঘমেয়াদি বিনিয়োগের জন্য কোন সেক্টর ভালো?"),
      a: l("No sector is best for everyone. Strong companies exist in many sectors; spreading across a few, and judging each by its own business, is safer than picking one sector.", "সবার জন্য সেরা কোনো সেক্টর নেই। অনেক সেক্টরেই শক্তিশালী কোম্পানি আছে; একটি সেক্টর বেছে নেওয়ার চেয়ে কয়েকটিতে ভাগ করা, আর প্রতিটিকে নিজের ব্যবসা দিয়ে যাচাই করা নিরাপদ।"),
    },
  ],
};
