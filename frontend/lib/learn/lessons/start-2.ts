import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { flow, l, list, p, steps, tip, warn } from "../build";

export const START_2: Lesson = {
  id: "start-2",
  path: "start",
  n: 2,
  slug: LESSON_SLUGS["start-2"],
  title: l("How to add money and buy your first share", "টাকা জমা দিয়ে প্রথম শেয়ার কিনবেন যেভাবে"),
  seoTitle: l("How to buy shares on the DSE, step by step", "শেয়ার কেনার নিয়ম, ধাপে ধাপে"),
  summary: l(
    "Send money to your broker safely, place your first buy order, and know what you pay and when the shares are yours.",
    "নিরাপদে ব্রোকারের কাছে টাকা পাঠান, প্রথম কেনার অর্ডার দিন, আর জেনে নিন মোট কত লাগে ও কবে শেয়ার আপনার হয়।",
  ),
  minutes: 7,
  checked: "2026-11-25",
  keywords: l(
    "how to buy shares Bangladesh, deposit money broker, DSE buy order, limit order, brokerage fee, T+2",
    "শেয়ার কেনার নিয়ম, ব্রোকারের কাছে টাকা জমা, শেয়ার কেনার অর্ডার, লিমিট অর্ডার, ব্রোকারের ফি, T+2",
  ),
  outcomes: [
    l("How to send money to your broker safely", "নিরাপদে ব্রোকারের কাছে টাকা পাঠানো"),
    l("How to place a buy order", "কেনার অর্ডার দেওয়া"),
    l("What you pay, and when the shares arrive", "মোট খরচ, আর শেয়ার কবে আসে"),
  ],
  sections: [
    {
      heading: l("Step 1: Send money to your broker", "ধাপ 1: ব্রোকারের কাছে টাকা পাঠান"),
      blocks: [
        flow(
          [
            ["Your bank", "আপনার ব্যাংক"],
            ["Broker's account", "ব্রোকারের অ্যাকাউন্ট"],
            ["Balance in the app", "অ্যাপে ব্যালান্স"],
          ],
        ),
        steps(
          ["Get the broker's bank details from its app", "ব্রোকারের অ্যাপ থেকে ব্যাংকের তথ্য নিন", "The account name should be the broker company's name.", "অ্যাকাউন্টের নাম হবে ব্রোকার প্রতিষ্ঠানের নাম।"],
          ["Send the money", "টাকা পাঠান", "By bank transfer, cheque, or a payment way shown inside the app.", "ব্যাংক ট্রান্সফার, চেক, বা অ্যাপে দেখানো কোনো পেমেন্টের উপায়ে।"],
          ["Check your balance", "ব্যালান্স দেখুন", "It usually shows the same day or the next working day.", "সাধারণত একই দিনে বা পরের কর্মদিবসে দেখায়।"],
        ),
        warn(
          "Never hand cash to a staff member or send money to anyone's personal account or mobile wallet. Pay only into the broker company's own account, and keep the receipt.",
          "কোনো কর্মীর হাতে নগদ টাকা দেবেন না, কারও ব্যক্তিগত অ্যাকাউন্ট বা মোবাইল ওয়ালেটে টাকা পাঠাবেন না। শুধু ব্রোকার প্রতিষ্ঠানের নিজের অ্যাকাউন্টে দিন, আর রসিদ রাখুন।",
        ),
      ],
    },
    {
      heading: l("Step 2: Pick your first share", "ধাপ 2: প্রথম শেয়ার বেছে নিন"),
      blocks: [
        p(
          "Start small, with a strong company you understand. Each company has a short **trading code** on the exchange, such as GP for Grameenphone. Look it up on its TopStockBD page before you buy.",
          "ছোট করে শুরু করুন, এমন একটি শক্তিশালী কোম্পানি দিয়ে যার ব্যবসা আপনি বোঝেন। এক্সচেঞ্জে প্রতিটি কোম্পানির একটি ছোট **ট্রেডিং কোড** থাকে, যেমন গ্রামীণফোনের GP। কেনার আগে TopStockBD-তে তার পেজটি দেখে নিন।",
        ),
        list(
          ["Prefer category A: it holds its annual meeting on time and pays a dividend.", "A ক্যাটাগরি বেছে নিন: সময়মতো বার্ষিক সভা করে আর ডিভিডেন্ড দেয়।"],
          ["Leave out Z category shares and shares that jumped on a tip.", "Z ক্যাটাগরি আর টিপস শুনে লাফিয়ে ওঠা শেয়ার বাদ দিন।"],
          ["Read [how to tell a good company in 10 minutes](/learn/fundamental-analysis).", "পড়ুন [10 মিনিটে ভালো কোম্পানি চেনার উপায়](/blog/good-stock-key-numbers)।"],
        ),
      ],
    },
    {
      heading: l("Step 3: Place the order", "ধাপ 3: অর্ডার দিন"),
      blocks: [
        steps(
          ["Open the app and search the trading code", "অ্যাপ খুলে ট্রেডিং কোড দিয়ে খুঁজুন"],
          ["Tap Buy", "কিনুন (Buy) চাপুন"],
          ["Enter how many shares", "কয়টি শেয়ার কিনবেন লিখুন"],
          ["Enter your price, as a limit order", "দাম লিখুন, লিমিট অর্ডার হিসেবে", "The highest price you will pay for each share. It buys at that price or lower.", "প্রতিটি শেয়ারের জন্য সর্বোচ্চ যে দাম দেবেন। সেই দামে বা তার কমে কেনে।"],
          ["Check the total and confirm with your PIN", "মোট টাকা দেখে পিন দিয়ে নিশ্চিত করুন"],
          ["Watch the order", "অর্ডারটি দেখুন", "It waits until a seller matches your price. You can cancel it while it waits.", "কোনো বিক্রেতা আপনার দামে মেলা পর্যন্ত অপেক্ষা করে। অপেক্ষার সময় বাতিল করা যায়।"],
        ),
        tip(
          "Use a limit order, not a market order. A market order buys at whatever price is there, which can be far above what you saw in a share that trades little.",
          "মার্কেট অর্ডার নয়, লিমিট অর্ডার দিন। মার্কেট অর্ডার তখন যে দাম পায় সেই দামেই কেনে, যা কম লেনদেনের শেয়ারে আপনার দেখা দামের অনেক ওপরে হতে পারে।",
        ),
        p(
          "The DSE trades Sunday to Thursday, 10 AM to 2:30 PM. A share's price can move only about 10% from yesterday's close in one day (less for high-priced shares), so an order outside that range is rejected.",
          "ডিএসইতে লেনদেন হয় রবিবার থেকে বৃহস্পতিবার, সকাল 10টা থেকে দুপুর 2টা 30 মিনিট। একদিনে একটি শেয়ারের দাম আগের দিনের শেষ দাম থেকে প্রায় 10% পর্যন্ত ওঠানামা করতে পারে (বেশি দামের শেয়ারে আরও কম), তাই এর বাইরের দামে দেওয়া অর্ডার বাতিল হয়ে যায়।",
        ),
      ],
    },
    {
      heading: l("What you pay", "মোট কত লাগে"),
      blocks: [
        {
          kind: "example",
          title: l("Example: your first buy", "উদাহরণ: আপনার প্রথম কেনা"),
          rows: [
            { label: l("200 shares at ৳45.20", "প্রতিটি ৳45.20 দামে 200টি শেয়ার"), value: "৳9,040" },
            { label: l("Broker fee (0.4%)", "ব্রোকারের ফি (0.4%)"), value: "৳36" },
          ],
          total: { label: l("Taken from your balance", "ব্যালান্স থেকে কাটা হয়"), value: "৳9,076" },
          note: l("Your broker's rate may be a little higher or lower.", "আপনার ব্রোকারের হার একটু বেশি বা কম হতে পারে।"),
        },
      ],
    },
    {
      heading: l("When the shares are yours", "শেয়ার কবে আপনার হয়"),
      blocks: [
        p(
          "The shares reach your BO account two working days after the trade (this is called **T+2**), and CDBL sends you a text. You can sell them only after that. Z category shares take longer.",
          "লেনদেনের দুই কর্মদিবস পরে শেয়ার আপনার বিও অ্যাকাউন্টে আসে (একে বলে **T+2**), আর সিডিবিএল এসএমএস পাঠায়। এর পরেই বিক্রি করা যায়। Z ক্যাটাগরির শেয়ারে আরও বেশি সময় লাগে।",
        ),
        p(
          "Done. Last step: [how to sell and get your money](/learn/sell-shares-get-your-money).",
          "হয়ে গেল। শেষ ধাপ: [বিক্রি করে টাকা তুলবেন যেভাবে](/blog/sell-shares-get-your-money)।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Pay only into the broker company's own account, and keep the receipt.", "শুধু ব্রোকার প্রতিষ্ঠানের নিজের অ্যাকাউন্টে টাকা দিন, আর রসিদ রাখুন।"),
    l("Search the code, enter shares and a limit price, check the total, confirm.", "কোড খুঁজুন, শেয়ার সংখ্যা আর লিমিট দাম লিখুন, মোট দেখুন, নিশ্চিত করুন।"),
    l("The fee is added on top. The shares are yours two working days later.", "ফি দামের সঙ্গে যোগ হয়। শেয়ার আপনার হয় দুই কর্মদিবস পরে।"),
  ],
  words: [
    { term: l("Trading code", "ট্রেডিং কোড"), meaning: l("A company's short name on the exchange, such as GP.", "এক্সচেঞ্জে কোম্পানির ছোট নাম, যেমন GP।") },
    { term: l("Limit order", "লিমিট অর্ডার"), meaning: l("An order that buys only at your price or lower.", "এমন অর্ডার, যা শুধু আপনার দামে বা তার কমে কেনে।") },
    { term: l("T+2", "T+2"), meaning: l("Shares and money change hands two working days after the trade.", "লেনদেনের দুই কর্মদিবস পরে শেয়ার আর টাকা হাতবদল হয়।") },
  ],
  tryIt: {
    text: l("Look up a company and read its page before your first buy.", "প্রথম কেনার আগে একটি কোম্পানি খুঁজে তার পেজ পড়ুন।"),
    label: l("See all companies", "সব কোম্পানি দেখুন"),
    href: "/dsestockranking",
  },
  faqs: [
    {
      q: l("Can I cancel a buy order?", "কেনার অর্ডার কি বাতিল করা যায়?"),
      a: l("Yes, while it is still waiting. Once a seller matches it, the trade is done.", "হ্যাঁ, অপেক্ষমাণ থাকা পর্যন্ত। বিক্রেতার সঙ্গে মিলে গেলে লেনদেন সম্পন্ন হয়ে যায়।"),
    },
    {
      q: l("Why did only part of my order go through?", "অর্ডারের শুধু একটা অংশ কেন পূরণ হলো?"),
      a: l("There were not enough shares for sale at your price. The rest waits until more sellers come, or until the day ends.", "আপনার দামে যথেষ্ট শেয়ার বিক্রির জন্য ছিল না। বাকিটা অপেক্ষা করে, যতক্ষণ না আরও বিক্রেতা আসে বা দিন শেষ হয়।"),
    },
    {
      q: l("When can I sell shares I bought today?", "আজ কেনা শেয়ার কবে বিক্রি করতে পারব?"),
      a: l("After they reach your BO account, two working days after the trade.", "শেয়ার বিও অ্যাকাউন্টে আসার পর, লেনদেনের দুই কর্মদিবস পরে।"),
    },
  ],
};
