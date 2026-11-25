import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { flow, l, list, p, steps, tip, warn } from "../build";

export const START_1: Lesson = {
  id: "start-1",
  path: "start",
  n: 1,
  slug: LESSON_SLUGS["start-1"],
  title: l("How to open a BO account", "বিও অ্যাকাউন্ট খুলবেন যেভাবে"),
  seoTitle: l("How to open a BO account in Bangladesh, step by step", "বিও অ্যাকাউন্ট খোলার নিয়ম, ধাপে ধাপে"),
  summary: l(
    "Choose a broker, keep your papers ready, and open the account that holds your shares. Usually done in a few working days.",
    "ব্রোকার বেছে নিন, কাগজপত্র তৈরি রাখুন, আর খুলে ফেলুন সেই অ্যাকাউন্ট যেখানে আপনার শেয়ার থাকবে। সাধারণত কয়েক কর্মদিবসেই হয়ে যায়।",
  ),
  minutes: 7,
  checked: "2026-11-25",
  keywords: l(
    "how to open BO account Bangladesh, BO account documents, BO account fee, choose broker Bangladesh, online BO account",
    "বিও অ্যাকাউন্ট খোলার নিয়ম, বিও অ্যাকাউন্টের কাগজপত্র, বিও অ্যাকাউন্টের ফি, ব্রোকার বাছাই, অনলাইনে বিও অ্যাকাউন্ট",
  ),
  outcomes: [
    l("How to choose a broker", "কীভাবে ব্রোকার বাছবেন"),
    l("Which papers to keep ready", "কোন কাগজপত্র তৈরি রাখবেন"),
    l("The five steps to your BO account", "বিও অ্যাকাউন্টের পাঁচটি ধাপ"),
  ],
  sections: [
    {
      heading: l("Before you begin", "শুরু করার আগে"),
      blocks: [
        p(
          "A **BO account** holds your shares, the way a bank account holds money. Your shares are kept at CDBL, the national share registry, in your name. A **broker** opens the account for you and places your buy and sell orders.",
          "**বিও অ্যাকাউন্টে** আপনার শেয়ার থাকে, ঠিক যেমন ব্যাংক অ্যাকাউন্টে টাকা থাকে। শেয়ারগুলো আপনার নামে জমা থাকে সিডিবিএলে, দেশের শেয়ার জমা রাখার প্রতিষ্ঠানে। অ্যাকাউন্টটি খুলে দেয় একটি **ব্রোকার হাউস**, আর সে-ই আপনার কেনা-বেচার আদেশ বাজারে পাঠায়।",
        ),
        flow(
          [
            ["You", "আপনি"],
            ["Broker", "ব্রোকার"],
            ["DSE", "ডিএসই"],
            ["Your BO account at CDBL", "সিডিবিএলে আপনার বিও অ্যাকাউন্ট"],
          ],
        ),
        warn(
          "Use only money you won't need for at least three years, and never borrowed money. Brokers offer **margin loans** to buy more than you have; if prices fall, they can sell your shares at a loss. The safer choice is not to take one.",
          "এমন টাকা দিয়ে শুরু করুন, যা অন্তত তিন বছর লাগবে না, আর কখনো ধার করা টাকা নয়। ব্রোকাররা নিজের টাকার চেয়ে বেশি কেনার জন্য **মার্জিন ঋণ** দেয়; দাম পড়লে তারা লোকসানে আপনার শেয়ার বিক্রি করে দিতে পারে। এই ঋণ না নেওয়াই নিরাপদ।",
        ),
      ],
    },
    {
      heading: l("Step 1: Choose a broker", "ধাপ 1: ব্রোকার বেছে নিন"),
      blocks: [
        p(
          "More than 300 brokers can trade on the DSE. The DSE website lists every one with its registration number. Compare a few on these points.",
          "ডিএসইতে 300টির বেশি ব্রোকার লেনদেন করতে পারে। ডিএসইর ওয়েবসাইটে নিবন্ধন নম্বরসহ সবার তালিকা আছে। কয়েকটিকে এই বিষয়গুলোতে তুলনা করুন।",
        ),
        {
          kind: "table",
          head: [l("Check", "কী দেখবেন"), l("What to ask", "কী জিজ্ঞেস করবেন")],
          rows: [
            [l("Fee", "ফি"), l("The fee on each trade with every charge included. Usually 0.3% to 0.5%, on buying and on selling.", "সব খরচ মিলিয়ে প্রতি লেনদেনের ফি। সাধারণত 0.3% থেকে 0.5%, কেনায় আর বেচায়।")],
            [l("App", "অ্যাপ"), l("Easy on your phone, and it shows your shares and money clearly.", "ফোনে ব্যবহার সহজ, আর শেয়ার ও টাকা পরিষ্কার দেখায়।")],
            [l("Paying out", "টাকা ফেরত"), l("How many days until your money reaches your bank.", "কত দিনে টাকা আপনার ব্যাংকে পৌঁছায়।")],
            [l("Help", "সাহায্য"), l("An office near you, or a phone line and email that answer.", "কাছে অফিস, বা এমন ফোন আর ইমেইল যেখানে উত্তর মেলে।")],
            [l("History", "পুরোনো রেকর্ড"), l("Years in business, and whether BSEC has acted against it.", "কত বছরের ব্যবসা, আর বিএসইসি কখনো ব্যবস্থা নিয়েছে কি না।")],
          ],
        },
        tip(
          "A careful broker matters more than the cheapest one. The broker holds your money for trading.",
          "সবচেয়ে কম খরচের চেয়ে সতর্ক ব্রোকার বেশি জরুরি। লেনদেনের টাকা ব্রোকারের কাছেই থাকে।",
        ),
      ],
    },
    {
      heading: l("Step 2: Keep your papers ready", "ধাপ 2: কাগজপত্র তৈরি রাখুন"),
      blocks: [
        list(
          ["Your national ID card, both sides.", "আপনার জাতীয় পরিচয়পত্র, দুই পাশ।"],
          ["A recent photo of you.", "আপনার সাম্প্রতিক ছবি।"],
          ["A bank account in your own name: bank, branch, account number and routing number. Some brokers ask for a cheque leaf.", "নিজের নামে একটি ব্যাংক অ্যাকাউন্ট: ব্যাংক, শাখা, অ্যাকাউন্ট নম্বর আর রাউটিং নম্বর। কিছু ব্রোকার চেকের পাতা চায়।"],
          ["Your nominee's name, national ID card and photo.", "নমিনির নাম, জাতীয় পরিচয়পত্র আর ছবি।"],
          ["Your own mobile number and email.", "নিজের মোবাইল নম্বর আর ইমেইল।"],
        ),
        p(
          "You don't need a TIN to open the account. It helps later, because less tax is taken from your dividends when you have one.",
          "অ্যাকাউন্ট খুলতে টিআইএন লাগে না। পরে কাজে লাগে, কারণ টিআইএন থাকলে ডিভিডেন্ড থেকে কম কর কাটা হয়।",
        ),
      ],
    },
    {
      heading: l("Step 3: Fill in the form", "ধাপ 3: ফরম পূরণ করুন"),
      blocks: [
        steps(
          ["Open the broker's app or visit its office", "ব্রোকারের অ্যাপ খুলুন বা অফিসে যান", "Many brokers let you apply in the app with your national ID card and a photo of your face.", "অনেক ব্রোকারের অ্যাপে জাতীয় পরিচয়পত্র আর নিজের মুখের ছবি দিয়েই আবেদন করা যায়।"],
          ["Choose a single account", "একক অ্যাকাউন্ট বেছে নিন", "In your name alone. A joint account is for two people.", "শুধু আপনার নামে। যৌথ অ্যাকাউন্ট দুজনের জন্য।"],
          ["Add your bank account and nominee", "ব্যাংক অ্যাকাউন্ট আর নমিনি যোগ করুন", "You can name one or two nominees and split the share between them.", "এক বা দুজন নমিনির নাম দিতে পারেন, আর কে কত অংশ পাবেন তা ভাগ করে দিতে পারেন।"],
          ["Sign every page yourself", "প্রতিটি পাতায় নিজে সই করুন", "Keep a copy of everything you submit.", "যা জমা দেন, সবকিছুর একটি কপি রাখুন।"],
        ),
        warn(
          "Never sign a blank form, and never give a broker a signed blank cheque.",
          "কখনো ফাঁকা ফরমে সই করবেন না, আর ব্রোকারকে সই করা ফাঁকা চেক দেবেন না।",
        ),
      ],
    },
    {
      heading: l("Step 4: Pay the fees", "ধাপ 4: ফি দিন"),
      blocks: [
        p(
          "There is a one-time opening fee, and a yearly fee your broker collects for CDBL every year, usually around June. Both are a few hundred taka. Ask your broker for today's amounts.",
          "একবার খোলার ফি দিতে হয়, আর প্রতি বছর একটি বার্ষিক ফি, যা ব্রোকার সিডিবিএলের হয়ে সাধারণত জুন মাসের দিকে নেয়। দুটিই কয়েকশো টাকা। বর্তমান পরিমাণ ব্রোকারের কাছে জেনে নিন।",
        ),
      ],
    },
    {
      heading: l("Step 5: Get your BO ID and check it", "ধাপ 5: বিও আইডি পেয়ে মিলিয়ে নিন"),
      blocks: [
        p(
          "Within a few working days you get a 16-digit **BO ID** and a login for the broker's app. Before you put money in, check three things on your account details.",
          "কয়েক কর্মদিবসের মধ্যে আপনি 16 সংখ্যার একটি **বিও আইডি** আর ব্রোকারের অ্যাপের লগইন পাবেন। টাকা জমা দেওয়ার আগে অ্যাকাউন্টের তথ্যে তিনটি জিনিস মিলিয়ে নিন।",
        ),
        list(
          ["Your name and national ID number are exactly right.", "আপনার নাম আর জাতীয় পরিচয়পত্রের নম্বর হুবহু ঠিক আছে।"],
          ["The bank account is your own. Dividends and sale money go only there.", "ব্যাংক অ্যাকাউন্টটি আপনার নিজের। ডিভিডেন্ড আর বিক্রির টাকা শুধু সেখানেই যায়।"],
          ["The mobile number is yours. CDBL texts it every time shares go in or out.", "মোবাইল নম্বরটি আপনার। শেয়ার ঢুকলে বা বের হলে সিডিবিএল প্রতিবার সেখানে এসএমএস পাঠায়।"],
        ),
        p(
          "Done. Next: [add money and buy your first share](/learn/buy-sell-shares).",
          "হয়ে গেল। এবার: [টাকা জমা দিয়ে প্রথম শেয়ার কিনুন](/blog/buy-sell-shares)।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Pick a careful broker. Compare the full fee, the app and how fast they pay you.", "সতর্ক ব্রোকার বেছে নিন। পুরো ফি, অ্যাপ আর কত দ্রুত টাকা দেয়, তুলনা করুন।"),
    l("Keep ready: national ID, photo, your own bank account, your nominee's details, your own phone number.", "তৈরি রাখুন: জাতীয় পরিচয়পত্র, ছবি, নিজের ব্যাংক অ্যাকাউন্ট, নমিনির তথ্য, নিজের মোবাইল নম্বর।"),
    l("Sign everything yourself, and check your details once the BO ID arrives.", "সবকিছুতে নিজে সই করুন, আর বিও আইডি পেলে তথ্যগুলো মিলিয়ে নিন।"),
  ],
  words: [
    { term: l("BO account", "বিও অ্যাকাউন্ট"), meaning: l("Your account at CDBL that holds your shares.", "সিডিবিএলে আপনার অ্যাকাউন্ট, যেখানে শেয়ার থাকে।") },
    { term: l("Nominee", "নমিনি"), meaning: l("The person who receives your shares if you die.", "আপনার মৃত্যুর পর যিনি শেয়ার পাবেন।") },
    { term: l("Margin loan", "মার্জিন ঋণ"), meaning: l("Money a broker lends you to buy shares. If prices fall, it can sell your shares.", "শেয়ার কিনতে ব্রোকারের দেওয়া ঋণ। দাম পড়লে ব্রোকার শেয়ার বিক্রি করে দিতে পারে।") },
  ],
  faqs: [
    {
      q: l("How long does it take to open a BO account?", "বিও অ্যাকাউন্ট খুলতে কত দিন লাগে?"),
      a: l("Usually a few working days after you submit the form and papers.", "ফরম আর কাগজপত্র জমার পর সাধারণত কয়েক কর্মদিবস।"),
    },
    {
      q: l("Do I need a TIN to open a BO account?", "বিও অ্যাকাউন্ট খুলতে কি টিআইএন লাগে?"),
      a: l("No. It helps later, because less tax is taken from your dividends when you have one.", "না। পরে কাজে লাগে, কারণ টিআইএন থাকলে ডিভিডেন্ড থেকে কম কর কাটা হয়।"),
    },
    {
      q: l("How much money do I need to start?", "শুরু করতে কত টাকা লাগে?"),
      a: l("There is no minimum. Many people start with ৳10,000 to ৳20,000 and add a little every month.", "কোনো ন্যূনতম পরিমাণ নেই। অনেকে ৳10,000 থেকে ৳20,000 দিয়ে শুরু করে প্রতি মাসে কিছু করে যোগ করেন।"),
    },
  ],
};
