import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip } from "../build";

export const START_3: Lesson = {
  id: "start-3",
  path: "start",
  n: 3,
  slug: LESSON_SLUGS["start-3"],
  title: l("How to sell shares and get your money", "শেয়ার বিক্রি করে টাকা তুলবেন যেভাবে"),
  seoTitle: l("How to sell shares on the DSE and get your money", "শেয়ার বিক্রির নিয়ম আর টাকা তোলার নিয়ম"),
  summary: l(
    "Place a sell order, know the day your money is ready, send it to your bank, and check that your account is in order.",
    "বিক্রির অর্ডার দিন, জেনে নিন কোন দিন টাকা তৈরি থাকে, টাকা ব্যাংকে পাঠান, আর অ্যাকাউন্ট ঠিক আছে কি না মিলিয়ে নিন।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "how to sell shares Bangladesh, T+2 settlement DSE, withdraw money from broker, CDBL SMS, profit after fees",
    "শেয়ার বিক্রির নিয়ম, T+2, ব্রোকার থেকে টাকা তোলা, সিডিবিএল এসএমএস, ফি বাদে মুনাফা",
  ),
  outcomes: [
    l("How to place a sell order", "বিক্রির অর্ডার দেওয়া"),
    l("When your money is ready, and how to take it out", "টাকা কবে তৈরি, আর কীভাবে তুলবেন"),
    l("Three checks that keep your account safe", "অ্যাকাউন্ট নিরাপদ রাখার তিনটি যাচাই"),
  ],
  sections: [
    {
      heading: l("Step 1: Place the sell order", "ধাপ 1: বিক্রির অর্ডার দিন"),
      blocks: [
        steps(
          ["Open your holdings and pick the share", "নিজের শেয়ারের তালিকা খুলে শেয়ারটি বেছে নিন"],
          ["Tap Sell", "বিক্রি (Sell) চাপুন"],
          ["Enter how many shares", "কয়টি শেয়ার বিক্রি করবেন লিখুন", "All of them, or only some.", "সবগুলো, বা কয়েকটি।"],
          ["Enter your price", "দাম লিখুন", "The lowest price you will accept for each share.", "প্রতিটি শেয়ারের জন্য সর্বনিম্ন যে দাম নেবেন।"],
          ["Confirm with your PIN", "পিন দিয়ে নিশ্চিত করুন"],
        ),
        p(
          "You can sell only shares already in your BO account. Shares bought in the last two working days are still on their way.",
          "শুধু বিও অ্যাকাউন্টে চলে আসা শেয়ারই বিক্রি করা যায়। গত দুই কর্মদিবসে কেনা শেয়ার তখনও পথে থাকে।",
        ),
      ],
    },
    {
      heading: l("Step 2: Wait two working days", "ধাপ 2: দুই কর্মদিবস অপেক্ষা করুন"),
      blocks: [
        p(
          "The money from a sale is ready two working days later. Friday, Saturday and public holidays don't count.",
          "বিক্রির টাকা তৈরি হয় দুই কর্মদিবস পরে। শুক্রবার, শনিবার আর সরকারি ছুটি গোনা হয় না।",
        ),
        {
          kind: "table",
          head: [l("You sell on", "বিক্রি করলেন"), l("Money is ready on", "টাকা তৈরি")],
          rows: [
            [l("Sunday", "রবিবার"), l("Tuesday", "মঙ্গলবার")],
            [l("Tuesday", "মঙ্গলবার"), l("Thursday", "বৃহস্পতিবার")],
            [l("Wednesday", "বুধবার"), l("The next Sunday", "পরের রবিবার")],
            [l("Thursday", "বৃহস্পতিবার"), l("The next Monday", "পরের সোমবার")],
          ],
        },
        tip(
          "Need money for a date? Sell at least three working days before it, to leave time for the bank transfer too.",
          "কোনো নির্দিষ্ট দিনে টাকা দরকার? অন্তত তিন কর্মদিবস আগে বিক্রি করুন, যাতে ব্যাংকে যাওয়ার সময়ও থাকে।",
        ),
      ],
    },
    {
      heading: l("Step 3: Take the money out", "ধাপ 3: টাকা তুলুন"),
      blocks: [
        steps(
          ["Ask for a withdrawal in the app", "অ্যাপে টাকা তোলার আবেদন করুন"],
          ["The broker sends it to your linked bank account", "ব্রোকার আপনার যুক্ত ব্যাংক অ্যাকাউন্টে পাঠায়", "Only to that account, so no one else can collect your money.", "শুধু সেই অ্যাকাউন্টে, তাই আর কেউ আপনার টাকা তুলতে পারে না।"],
          ["It arrives in a working day or two", "এক-দুই কর্মদিবসে পৌঁছায়", "If it is late, ask by email and keep the reply.", "দেরি হলে ইমেইলে জানতে চান, আর উত্তরটি রেখে দিন।"],
        ),
        {
          kind: "example",
          title: l("Example: what you keep after fees", "উদাহরণ: ফি বাদে হাতে কত থাকে"),
          rows: [
            { label: l("You paid for 200 shares, fee included", "ফিসহ 200টি শেয়ারের খরচ"), value: "৳9,076" },
            { label: l("You sell them at ৳50.00", "প্রতিটি ৳50.00 দামে বিক্রি"), value: "৳10,000" },
            { label: l("Broker fee on the sale (0.4%)", "বিক্রিতে ব্রোকারের ফি (0.4%)"), value: "−৳40" },
            { label: l("You receive", "হাতে পান"), value: "৳9,960" },
          ],
          total: { label: l("Your profit", "আপনার মুনাফা"), value: "৳884" },
          note: l(
            "You pay the fee on both sides, so a price has to rise a little before you make a single taka.",
            "ফি দুই দিকেই দিতে হয়, তাই এক টাকা মুনাফার আগেই দাম একটু বাড়তে হয়।",
          ),
        },
      ],
    },
    {
      heading: l("Step 4: Check your account once a month", "ধাপ 4: মাসে একবার অ্যাকাউন্ট মিলিয়ে নিন"),
      blocks: [
        p(
          "Every time shares go in or out of your BO account, **CDBL sends a text** to your phone. In past years some broker houses used customers' money and shares without permission; people who checked found out first.",
          "বিও অ্যাকাউন্টে শেয়ার ঢুকলে বা বের হলে প্রতিবার **সিডিবিএল আপনার ফোনে এসএমএস পাঠায়**। আগের কয়েক বছরে কিছু ব্রোকার হাউস অনুমতি ছাড়া গ্রাহকের টাকা আর শেয়ার ব্যবহার করেছে; যাঁরা মিলিয়ে দেখতেন, তাঁরাই আগে টের পেয়েছেন।",
        ),
        list(
          ["Every CDBL text matches a trade you made.", "সিডিবিএলের প্রতিটি এসএমএস আপনার নিজের করা লেনদেনের সঙ্গে মেলে।"],
          ["The shares in your app match the BO statement your broker gives you from CDBL.", "অ্যাপের শেয়ার ব্রোকারের দেওয়া সিডিবিএলের বিও স্টেটমেন্টের সঙ্গে মেলে।"],
          ["Your deposits, withdrawals and balance add up.", "জমা, উত্তোলন আর ব্যালান্সের হিসাব মেলে।"],
        ),
        p(
          "If something is wrong, write to your broker by email the same day and keep copies. If it isn't fixed, the DSE and BSEC both take complaints from investors.",
          "কিছু ভুল থাকলে সেদিনই ব্রোকারকে ইমেইলে জানান, আর কপি রাখুন। সমাধান না হলে ডিএসই আর বিএসইসি দুই জায়গাতেই বিনিয়োগকারীর অভিযোগ নেওয়া হয়।",
        ),
        p(
          "That's the whole cycle. Next, learn to invest with a plan in [Investing basics](/learn#investing-basics).",
          "পুরো চক্রটা এটুকুই। এবার পরিকল্পনা করে বিনিয়োগ শিখুন [বিনিয়োগের মূল কথা](/blog#investing-basics) অংশে।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Sell from your holdings with a limit price, all or part of your shares.", "নিজের শেয়ার থেকে লিমিট দামে বিক্রি করুন, সবগুলো বা কয়েকটি।"),
    l("The money is ready two working days later, and goes only to your own bank account.", "টাকা তৈরি হয় দুই কর্মদিবস পরে, আর যায় শুধু আপনার নিজের ব্যাংক অ্যাকাউন্টে।"),
    l("Keep every CDBL text and check your account once a month.", "সিডিবিএলের প্রতিটি এসএমএস রাখুন, আর মাসে একবার অ্যাকাউন্ট মিলিয়ে নিন।"),
  ],
  words: [
    { term: l("BO statement", "বিও স্টেটমেন্ট"), meaning: l("CDBL's record of the shares in your BO account. Ask your broker for it.", "আপনার বিও অ্যাকাউন্টের শেয়ারের সিডিবিএলের হিসাব। ব্রোকারের কাছে চাইলে দেয়।") },
  ],
  faqs: [
    {
      q: l("When do I get my money after selling shares?", "শেয়ার বিক্রির পর টাকা কবে পাব?"),
      a: l("It is ready two working days after the sale. Sent to your bank, it usually arrives a day or two after you ask.", "বিক্রির দুই কর্মদিবস পরে টাকা তৈরি হয়। ব্যাংকে পাঠাতে বললে সাধারণত আরও এক-দুই দিনে পৌঁছায়।"),
    },
    {
      q: l("What happens to my shares if my broker closes?", "ব্রোকার বন্ধ হলে আমার শেয়ারের কী হবে?"),
      a: l("Your shares stay in your BO account at CDBL, in your name, and can be moved to another broker. Cash held by the broker is the part at risk, so don't keep more there than you need.", "শেয়ার সিডিবিএলে আপনার নামেই বিও অ্যাকাউন্টে থাকে, আর অন্য ব্রোকারের কাছে সরানো যায়। ঝুঁকি থাকে ব্রোকারের কাছে রাখা নগদ টাকায়, তাই প্রয়োজনের বেশি টাকা সেখানে রাখবেন না।"),
    },
  ],
};
