import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip } from "../build";

export const BASICS_2: Lesson = {
  id: "basics-2",
  path: "basics",
  n: 2,
  slug: LESSON_SLUGS["basics-2"],
  title: l("Trading or investing: which is right for you?", "ট্রেডিং নাকি বিনিয়োগ: আপনার জন্য কোনটি?"),
  summary: l(
    "Two ways to use the share market, what each really takes, and why most short-term traders on the DSE lose money.",
    "শেয়ার বাজার ব্যবহারের দুটি পথ, প্রতিটিতে আসলে কী লাগে, আর কেন ডিএসইতে বেশিরভাগ স্বল্পমেয়াদি ট্রেডার লোকসান করেন।",
  ),
  minutes: 7,
  checked: "2026-11-25",
  keywords: l(
    "trading vs investing Bangladesh, long term investing DSE, short term trading loss, compounding share market",
    "ট্রেডিং বনাম বিনিয়োগ, দীর্ঘমেয়াদি বিনিয়োগ, স্বল্পমেয়াদি লেনদেনে লোকসান, চক্রবৃদ্ধি",
  ),
  outcomes: [
    l("What trading and investing each mean", "ট্রেডিং আর বিনিয়োগ আসলে কী"),
    l("Why trading is harder than it looks on the DSE", "ডিএসইতে ট্রেডিং কেন দেখতে যত সহজ তত নয়"),
    l("Which one suits you", "কোনটি আপনার জন্য মানানসই"),
  ],
  sections: [
    {
      heading: l("Two ways to make money from shares", "শেয়ার থেকে আয়ের দুটি পথ"),
      blocks: [
        p(
          "**Trading** means buying and selling within days or weeks to catch price moves. **Investing** means owning good companies for years and earning from their dividends and growth.",
          "**ট্রেডিং** মানে কয়েক দিন বা সপ্তাহের মধ্যে কেনাবেচা করে দামের ওঠানামা থেকে আয় করা। **বিনিয়োগ** মানে বছরের পর বছর ভালো কোম্পানির মালিক থেকে তাদের ডিভিডেন্ড আর বৃদ্ধি থেকে আয় করা।",
        ),
        {
          kind: "table",
          head: [l("", ""), l("Trading", "ট্রেডিং"), l("Investing", "বিনিয়োগ")],
          rows: [
            [l("You watch", "আপনি দেখেন"), l("The price, every day", "দাম, প্রতিদিন"), l("The company, a few times a year", "কোম্পানি, বছরে কয়েকবার")],
            [l("Time it takes", "সময় লাগে"), l("Hours a day in market hours", "বাজার খোলা থাকার সময় দিনে কয়েক ঘণ্টা"), l("An hour or two a month", "মাসে এক-দুই ঘণ্টা")],
            [l("Fees", "ফি"), l("On every trade, many times a year", "প্রতিটি লেনদেনে, বছরে বহুবার"), l("A few times a year", "বছরে কয়েকবার")],
            [l("You earn from", "আয় আসে"), l("Price moves only", "শুধু দামের ওঠানামা থেকে"), l("Dividends and a growing business", "ডিভিডেন্ড আর বড় হতে থাকা ব্যবসা থেকে")],
          ],
        },
      ],
    },
    {
      heading: l("Why trading is hard on the DSE", "ডিএসইতে ট্রেডিং কেন কঠিন"),
      blocks: [
        list(
          ["**Fees on both sides.** About 0.8% for every buy and sell together. Trade often and they add up fast.", "**দুই দিকেই ফি।** প্রতিবার কেনা-বেচা মিলিয়ে প্রায় 0.8%। ঘনঘন লেনদেন করলে দ্রুত জমে যায়।"],
          ["**You wait two days to sell.** Shares reach your account two working days after you buy, so you can't leave quickly.", "**বিক্রির জন্য দুই দিন অপেক্ষা।** কেনার দুই কর্মদিবস পরে শেয়ার আসে, তাই দ্রুত বের হওয়া যায় না।"],
          ["**The daily price limit can trap you.** On a bad day a share can hit its lower limit with no buyers, and you can't sell at all.", "**দিনের দামের সীমা আটকে দিতে পারে।** খারাপ দিনে শেয়ার নিচের সীমায় পৌঁছে গেলে ক্রেতা থাকে না, তখন বিক্রিই করা যায় না।"],
          ["**Others know more.** Big traders and insiders often move first; small traders usually hear last.", "**অন্যরা বেশি জানে।** বড় ট্রেডার আর ভেতরের লোকেরা আগে সরে; ছোট ট্রেডাররা সাধারণত সবার শেষে শোনেন।"],
        ),
        {
          kind: "example",
          title: l("Example: what fees take from a busy trader", "উদাহরণ: ঘনঘন লেনদেনে ফি কত কাটে"),
          rows: [
            { label: l("Money traded each time", "প্রতিবার লেনদেনের টাকা"), value: "৳50,000" },
            { label: l("Fees on one buy and one sell (0.4% each)", "একবার কেনা ও বেচার ফি (প্রতিটিতে 0.4%)"), value: "৳400" },
            { label: l("Twenty round trips in a year", "বছরে বিশবার কেনা-বেচা"), value: "×20" },
          ],
          total: { label: l("Fees in a year", "বছরে মোট ফি"), value: "৳8,000" },
          note: l("That is 16% of the ৳50,000, gone before any profit.", "এটি ৳50,000-এর 16%, মুনাফার আগেই চলে যায়।"),
        },
      ],
    },
    {
      heading: l("What investing looks like", "বিনিয়োগ দেখতে কেমন"),
      blocks: [
        p(
          "You pick strong companies, buy over time, collect the dividends, and check them a few times a year. Your money grows when the business grows, and the dividends you put back in start earning too.",
          "আপনি শক্তিশালী কোম্পানি বেছে নেন, সময় নিয়ে কেনেন, ডিভিডেন্ড নেন, আর বছরে কয়েকবার খোঁজ নেন। ব্যবসা বড় হলে আপনার টাকা বাড়ে, আর ডিভিডেন্ড আবার বিনিয়োগ করলে সেটিও আয় করতে শুরু করে।",
        ),
        {
          kind: "example",
          title: l("Example: ৳1,00,000 growing 10% a year", "উদাহরণ: বছরে 10% হারে বাড়া ৳1,00,000"),
          rows: [
            { label: l("After 5 years", "5 বছর পরে"), value: "৳1,61,051" },
            { label: l("After 10 years", "10 বছর পরে"), value: "৳2,59,374" },
            { label: l("After 20 years", "20 বছর পরে"), value: "৳6,72,750" },
          ],
          note: l(
            "An illustration of how growth builds on growth, not a promise. Real returns go up and down year to year.",
            "বৃদ্ধির ওপর বৃদ্ধি কীভাবে জমে, তার একটি উদাহরণ মাত্র, প্রতিশ্রুতি নয়। আসল আয় বছরভেদে কমবেশি হয়।",
          ),
        },
      ],
    },
    {
      heading: l("Which suits you?", "আপনার জন্য কোনটি?"),
      blocks: [
        p("Ask yourself three questions.", "নিজেকে তিনটি প্রশ্ন করুন।"),
        list(
          ["Can you watch the market from 10 AM to 2:30 PM most days?", "বেশিরভাগ দিন সকাল 10টা থেকে দুপুর 2টা 30 পর্যন্ত বাজার দেখতে পারবেন?"],
          ["Can you take a loss quickly and calmly when a trade goes wrong?", "লেনদেন ভুল হলে দ্রুত আর শান্তভাবে লোকসান মেনে নিতে পারবেন?"],
          ["Do you have a way to judge a price that isn't a tip or a rumour?", "টিপস বা গুজব ছাড়া দাম যাচাইয়ের নিজস্ব কোনো উপায় আছে?"],
        ),
        p(
          "If any answer is no, investing is the better fit. For most people with a job and a family, it is.",
          "কোনো উত্তর না হলে বিনিয়োগই বেশি মানানসই। চাকরি আর পরিবার আছে এমন বেশিরভাগ মানুষের জন্য এটাই ঠিক।",
        ),
        tip(
          "If you want to try trading, keep it to a small part of your money and keep most of it invested.",
          "ট্রেডিং চেষ্টা করতে চাইলে টাকার ছোট একটি অংশ দিয়ে করুন, আর বেশিরভাগ টাকা বিনিয়োগে রাখুন।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Trading earns from price moves; investing earns from dividends and a growing business.", "ট্রেডিংয়ে আয় দামের ওঠানামা থেকে; বিনিয়োগে আয় ডিভিডেন্ড আর বড় হতে থাকা ব্যবসা থেকে।"),
    l("Fees, two-day settlement and the daily price limit make short-term trading hard on the DSE.", "ফি, দুই দিনের নিষ্পত্তি আর দিনের দামের সীমা ডিএসইতে স্বল্পমেয়াদি ট্রেডিংকে কঠিন করে।"),
    l("For most people, investing in strong companies over years is the better fit.", "বেশিরভাগ মানুষের জন্য বছরের পর বছর শক্তিশালী কোম্পানিতে বিনিয়োগই ভালো।"),
  ],
  words: [
    { term: l("Round trip", "রাউন্ড ট্রিপ"), meaning: l("One buy and one sell of the same shares.", "একই শেয়ার একবার কেনা আর একবার বেচা।") },
    { term: l("Compounding", "চক্রবৃদ্ধি"), meaning: l("Earning on your earnings, so growth builds on growth.", "আয়ের ওপর আয়, যাতে বৃদ্ধির ওপর বৃদ্ধি জমে।") },
  ],
  faqs: [
    {
      q: l("Is day trading profitable in Bangladesh?", "বাংলাদেশে দিনের মধ্যে কেনাবেচা কি লাভজনক?"),
      a: l("For most people, no. Fees on both sides, two-day settlement and the daily price limit work against short trades.", "বেশিরভাগ মানুষের জন্য না। দুই দিকের ফি, দুই দিনের নিষ্পত্তি আর দিনের দামের সীমা স্বল্পমেয়াদি লেনদেনের বিপক্ষে কাজ করে।"),
    },
    {
      q: l("How long should I hold a share?", "একটি শেয়ার কত দিন ধরে রাখব?"),
      a: l("As long as the company stays strong and its price isn't far above its worth. For a good company that can mean many years.", "যতদিন কোম্পানি শক্তিশালী থাকে আর দাম তার মূল্যের অনেক ওপরে না যায়। ভালো কোম্পানির ক্ষেত্রে তা অনেক বছরও হতে পারে।"),
    },
  ],
};
