import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, p, steps, tip } from "../build";

export const BASICS_7: Lesson = {
  id: "basics-7",
  path: "basics",
  n: 7,
  slug: LESSON_SLUGS["basics-7"],
  title: l("Buying in parts: how to invest every month", "ভাগে ভাগে কেনা: প্রতি মাসে বিনিয়োগ করবেন যেভাবে"),
  seoTitle: l("Investing every month in shares: buying in parts and compounding", "প্রতি মাসে শেয়ারে বিনিয়োগ: ভাগে কেনা আর চক্রবৃদ্ধি"),
  summary: l(
    "No one knows the best day to buy. Putting in a fixed amount every month takes the guessing out, and reinvested dividends do the rest.",
    "কেনার সেরা দিন কেউ জানে না। প্রতি মাসে নির্দিষ্ট টাকা দিলে অনুমানের দরকার পড়ে না, আর ডিভিডেন্ড আবার বিনিয়োগ করলে বাকিটা নিজে থেকেই হয়।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "invest every month shares Bangladesh, buying in parts, average cost, compounding DSE, monthly investment plan",
    "প্রতি মাসে বিনিয়োগ, ভাগে ভাগে শেয়ার কেনা, গড় দাম, চক্রবৃদ্ধি, মাসিক বিনিয়োগ পরিকল্পনা",
  ),
  outcomes: [
    l("Why buying in parts beats guessing the day", "কেন দিন অনুমানের চেয়ে ভাগে কেনা ভালো"),
    l("How to set up your own monthly plan", "নিজের মাসিক পরিকল্পনা কীভাবে সাজাবেন"),
    l("How dividends put back in make money grow", "ডিভিডেন্ড আবার বিনিয়োগ করলে কীভাবে টাকা বাড়ে"),
  ],
  sections: [
    {
      heading: l("Why not put it all in at once?", "সব টাকা একসঙ্গে কেন নয়?"),
      blocks: [
        p(
          "If you put all your money in on one day and prices fall the next month, it hurts. If you wait for the perfect day, you may never buy. A fixed amount every month avoids both.",
          "সব টাকা একদিনে দিলেন, পরের মাসে দাম পড়ল, তখন খারাপ লাগে। আবার সেরা দিনের অপেক্ষায় থাকলে হয়তো কখনো কেনাই হবে না। প্রতি মাসে নির্দিষ্ট টাকা দিলে দুটোই এড়ানো যায়।",
        ),
        {
          kind: "example",
          title: l("Example: ৳5,000 every month in one share", "উদাহরণ: একটি শেয়ারে প্রতি মাসে ৳5,000"),
          rows: [
            { label: l("Month 1, price ৳50", "মাস 1, দাম ৳50"), value: l("100 shares", "100টি শেয়ার") },
            { label: l("Month 2, price ৳40", "মাস 2, দাম ৳40"), value: l("125 shares", "125টি শেয়ার") },
            { label: l("Month 3, price ৳45", "মাস 3, দাম ৳45"), value: l("111 shares", "111টি শেয়ার") },
            { label: l("Month 4, price ৳55", "মাস 4, দাম ৳55"), value: l("90 shares", "90টি শেয়ার") },
          ],
          total: { label: l("You own, at an average of about ৳46.80", "আপনার হাতে, গড়ে প্রায় ৳46.80 দামে"), value: l("426 shares", "426টি শেয়ার") },
          note: l(
            "The same money buys more shares in cheap months and fewer in dear ones, so your average cost ends up below the average price of ৳47.50.",
            "একই টাকায় কম দামের মাসে বেশি আর বেশি দামের মাসে কম শেয়ার কেনা হয়, তাই আপনার গড় খরচ মাসগুলোর গড় দাম ৳47.50-এর চেয়ে কম হয়।",
          ),
        },
      ],
    },
    {
      heading: l("Set up your monthly plan", "আপনার মাসিক পরিকল্পনা সাজান"),
      blocks: [
        steps(
          ["Pick an amount you can keep up", "এমন টাকা ঠিক করুন যা নিয়মিত দিতে পারবেন", "Even ৳2,000 or ৳3,000 a month adds up over years.", "মাসে ৳2,000-৳3,000-ও বছরের পর বছরে অনেক হয়।"],
          ["Pick a day", "একটি দিন ঠিক করুন", "A few days after your salary, so the money is there.", "বেতন পাওয়ার কয়েক দিন পরে, যাতে টাকা হাতে থাকে।"],
          ["Pick your shares in advance", "শেয়ার আগে থেকেই ঠিক করে রাখুন", "A short list of strong companies you have already checked.", "আগেই যাচাই করা শক্তিশালী কোম্পানির ছোট একটি তালিকা।"],
          ["Buy with a limit order", "লিমিট অর্ডারে কিনুন"],
          ["Keep going in falling months", "দাম পড়ার মাসেও চালিয়ে যান", "That is when the same money buys the most shares.", "তখনই একই টাকায় সবচেয়ে বেশি শেয়ার কেনা যায়।"],
        ),
      ],
    },
    {
      heading: l("Put your dividends back in", "ডিভিডেন্ড আবার বিনিয়োগ করুন"),
      blocks: [
        p(
          "When a dividend arrives, use it to buy more shares instead of spending it. Those new shares pay dividends too. Over years this earning-on-earnings, called **compounding**, does more than any single good buy.",
          "ডিভিডেন্ড এলে খরচ না করে তা দিয়ে আরও শেয়ার কিনুন। নতুন শেয়ারগুলোও ডিভিডেন্ড দেয়। বছরের পর বছর আয়ের ওপর এই আয়, যাকে বলে **চক্রবৃদ্ধি**, যেকোনো একটি ভালো কেনার চেয়ে বেশি কাজ করে।",
        ),
        tip(
          "Pause the plan only if your own life needs the money, never because the market fell.",
          "পরিকল্পনা থামাবেন শুধু নিজের প্রয়োজনে টাকা লাগলে, বাজার পড়েছে বলে কখনো নয়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("A fixed amount every month takes the guessing out of when to buy.", "প্রতি মাসে নির্দিষ্ট টাকা দিলে কখন কিনবেন সেই অনুমান লাগে না।"),
    l("You buy more shares when prices are low, so your average cost stays lower.", "দাম কম থাকলে বেশি শেয়ার কেনা হয়, তাই গড় খরচ কম থাকে।"),
    l("Put dividends back in and keep going in falling months.", "ডিভিডেন্ড আবার বিনিয়োগ করুন, আর দাম পড়ার মাসেও চালিয়ে যান।"),
  ],
  words: [
    { term: l("Average cost", "গড় খরচ"), meaning: l("What you paid for all your shares of a company, divided by how many you own.", "একটি কোম্পানির সব শেয়ারে যত টাকা দিয়েছেন, তাকে শেয়ার সংখ্যা দিয়ে ভাগ।") },
    { term: l("Compounding", "চক্রবৃদ্ধি"), meaning: l("Earning on your earnings, so growth builds on growth.", "আয়ের ওপর আয়, যাতে বৃদ্ধির ওপর বৃদ্ধি জমে।") },
  ],
  faqs: [
    {
      q: l("Is it better to invest a lump sum or every month?", "একবারে নাকি প্রতি মাসে বিনিয়োগ করা ভালো?"),
      a: l("No one can know the best day. Investing every month spreads your buying over many prices and is easier to stick with.", "সেরা দিন কেউ জানে না। প্রতি মাসে বিনিয়োগ করলে কেনা অনেক দামে ছড়িয়ে পড়ে, আর নিয়ম মেনে চলাও সহজ হয়।"),
    },
    {
      q: l("How much should I invest each month?", "প্রতি মাসে কত টাকা বিনিয়োগ করব?"),
      a: l("An amount you can keep up after your living costs and savings for emergencies. Steady small amounts beat large ones you can't continue.", "সংসারের খরচ আর জরুরি সঞ্চয়ের পরে যতটা নিয়মিত দিতে পারবেন। চালিয়ে যেতে না পারা বড় অঙ্কের চেয়ে নিয়মিত ছোট অঙ্ক ভালো।"),
    },
  ],
};
