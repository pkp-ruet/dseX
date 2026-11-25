import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { flow, l, list, p, steps, tip } from "../build";

export const BASICS_1: Lesson = {
  id: "basics-1",
  path: "basics",
  n: 1,
  slug: LESSON_SLUGS["basics-1"],
  title: l("How the share market works", "শেয়ার বাজার যেভাবে কাজ করে"),
  seoTitle: l("How the Bangladesh share market works", "বাংলাদেশের শেয়ার বাজার যেভাবে কাজ করে"),
  summary: l(
    "What a share is, and who does what: the DSE, BSEC, CDBL and your broker, in one picture.",
    "শেয়ার কী, আর কে কী কাজ করে: ডিএসই, বিএসইসি, সিডিবিএল আর আপনার ব্রোকার, এক নজরে।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "how share market works Bangladesh, what is a share, DSE CSE BSEC CDBL, stock market basics Bangladesh",
    "শেয়ার বাজার কীভাবে কাজ করে, শেয়ার কী, ডিএসই সিএসই বিএসইসি সিডিবিএল, শেয়ার বাজারের প্রাথমিক ধারণা",
  ),
  outcomes: [
    l("What it means to own a share", "একটি শেয়ারের মালিক হওয়া মানে কী"),
    l("The five names you will hear again and again", "যে পাঁচটি নাম বারবার শুনবেন"),
    l("What happens between pressing Buy and owning the share", "কেনার বোতাম চাপা থেকে শেয়ার হাতে আসা পর্যন্ত কী ঘটে"),
  ],
  sections: [
    {
      heading: l("What a share is", "শেয়ার কী"),
      blocks: [
        p(
          "A company's ownership is divided into many small, equal parts. Each part is a **share**. When you buy shares, you own a small piece of that company, with the same rights per share as every other owner.",
          "একটি কোম্পানির মালিকানা অনেকগুলো ছোট, সমান ভাগে ভাগ করা থাকে। প্রতিটি ভাগকে বলে **শেয়ার**। আপনি শেয়ার কিনলে কোম্পানিটির ছোট একটি অংশের মালিক হন, আর প্রতিটি শেয়ারে বাকি সব মালিকের মতোই সমান অধিকার পান।",
        ),
        p("As an owner, you can gain in two ways.", "মালিক হিসেবে আপনি দুইভাবে লাভ পেতে পারেন।"),
        list(
          [
            "**Dividend.** When the company makes a profit, it may share part of it with its owners, as cash or as extra shares.",
            "**ডিভিডেন্ড।** কোম্পানি মুনাফা করলে তার একটি অংশ মালিকদের দিতে পারে, নগদ টাকায় বা বাড়তি শেয়ার হিসেবে।",
          ],
          [
            "**A higher price.** If the company grows, other investors may pay more for its shares than you did.",
            "**দাম বাড়া।** কোম্পানি বড় হলে অন্য বিনিয়োগকারীরা আপনার কেনা দামের চেয়ে বেশি দামে শেয়ারটি কিনতে চাইতে পারেন।",
          ],
        ),
        p(
          "The same is true the other way. If the company does badly, the price can fall below what you paid, and the dividend can shrink or stop.",
          "উল্টোটাও সত্যি। কোম্পানি খারাপ করলে দাম আপনার কেনা দামের নিচে নামতে পারে, আর ডিভিডেন্ড কমতে বা বন্ধও হতে পারে।",
        ),
      ],
    },
    {
      heading: l("Where shares come from", "শেয়ার আসে কোথা থেকে"),
      blocks: [
        p(
          "A company first sells its shares to the public through an **IPO**, its first public offer. The money from the IPO goes to the company. After that, the company is **listed**, and its shares are bought and sold between investors on the stock exchange.",
          "একটি কোম্পানি প্রথমবার সাধারণ মানুষের কাছে শেয়ার বিক্রি করে **আইপিও**-র মাধ্যমে। আইপিওর টাকা যায় কোম্পানির কাছে। এরপর কোম্পানিটি **তালিকাভুক্ত** হয়, আর তার শেয়ার স্টক এক্সচেঞ্জে বিনিয়োগকারীদের মধ্যে কেনাবেচা হয়।",
        ),
        p(
          "So when you buy a share on the market, you buy it from another investor, not from the company. The company gets nothing from that trade. It still matters to you, because the company's profit is what your share earns.",
          "তাই বাজার থেকে শেয়ার কিনলে আপনি সেটি কেনেন আরেকজন বিনিয়োগকারীর কাছ থেকে, কোম্পানির কাছ থেকে নয়। এই কেনাবেচা থেকে কোম্পানি কোনো টাকা পায় না। তবু কোম্পানির মুনাফাই আপনার জন্য জরুরি, কারণ আপনার শেয়ারের আয় আসে সেখান থেকেই।",
        ),
      ],
    },
    {
      heading: l("Who does what", "কে কী কাজ করে"),
      blocks: [
        {
          kind: "table",
          head: [l("Name", "নাম"), l("What it does for you", "আপনার জন্য কী করে")],
          rows: [
            [
              l("DSE", "ডিএসই"),
              l(
                "The Dhaka Stock Exchange, the main market. Buy and sell orders from across the country meet here.",
                "ঢাকা স্টক এক্সচেঞ্জ, দেশের প্রধান শেয়ার বাজার। সারা দেশের কেনা আর বেচার আদেশ এখানে মেলে।",
              ),
            ],
            [
              l("CSE", "সিএসই"),
              l(
                "The Chittagong Stock Exchange, the second market. Most large companies are listed on both.",
                "চট্টগ্রাম স্টক এক্সচেঞ্জ, দ্বিতীয় শেয়ার বাজার। বেশিরভাগ বড় কোম্পানি দুই জায়গাতেই তালিকাভুক্ত।",
              ),
            ],
            [
              l("BSEC", "বিএসইসি"),
              l(
                "The Bangladesh Securities and Exchange Commission. It makes the rules and acts against those who break them.",
                "বাংলাদেশ সিকিউরিটিজ অ্যান্ড এক্সচেঞ্জ কমিশন। বাজারের নিয়ম তৈরি করে, আর যারা নিয়ম ভাঙে তাদের বিরুদ্ধে ব্যবস্থা নেয়।",
              ),
            ],
            [
              l("CDBL", "সিডিবিএল"),
              l(
                "Central Depository Bangladesh Limited. It keeps every share in electronic form. Your shares sit in your BO account here.",
                "সেন্ট্রাল ডিপোজিটরি বাংলাদেশ লিমিটেড। সব শেয়ার ইলেকট্রনিকভাবে এখানে জমা থাকে। আপনার শেয়ার থাকে এখানে আপনার বিও অ্যাকাউন্টে।",
              ),
            ],
            [
              l("Your broker", "আপনার ব্রোকার"),
              l(
                "A company allowed to trade on the exchange. It sends your orders, keeps your money for trading and usually opens your BO account.",
                "এক্সচেঞ্জে লেনদেনের অনুমতি পাওয়া একটি প্রতিষ্ঠান। আপনার আদেশ বাজারে পাঠায়, লেনদেনের টাকা রাখে, আর সাধারণত আপনার বিও অ্যাকাউন্টও খুলে দেয়।",
              ),
            ],
          ],
        },
        tip(
          "You never deal with the DSE or CDBL directly. Everything goes through your broker. That is why choosing a good broker is the first step in [opening your account](/learn/open-bo-account).",
          "ডিএসই বা সিডিবিএলের সঙ্গে আপনাকে সরাসরি কিছু করতে হয় না। সবকিছু হয় ব্রোকারের মাধ্যমে। এজন্যই [অ্যাকাউন্ট খোলার](/blog/open-bo-account) প্রথম ধাপ হলো ভালো ব্রোকার বেছে নেওয়া।",
        ),
      ],
    },
    {
      heading: l("What happens when you buy", "কেনার সময় যা ঘটে"),
      blocks: [
        flow(
          [
            ["You", "আপনি"],
            ["Broker", "ব্রোকার"],
            ["DSE", "ডিএসই"],
            ["CDBL", "সিডিবিএল"],
          ],
          ["Your order goes out to the exchange. Your shares come back to your BO account.", "আপনার আদেশ যায় এক্সচেঞ্জে। শেয়ার ফিরে আসে আপনার বিও অ্যাকাউন্টে।"],
        ),
        steps(
          ["You place an order in your broker's app", "আপনি ব্রোকারের অ্যাপে আদেশ দেন", "For example: buy 100 shares at ৳50 each.", "যেমন: প্রতিটি ৳50 দামে 100টি শেয়ার কিনব।"],
          ["The broker sends it to the DSE", "ব্রোকার আদেশটি ডিএসইতে পাঠায়", "It joins the queue of buy and sell orders for that share.", "শেয়ারটির কেনা-বেচার আদেশের সারিতে এটি যোগ হয়।"],
          ["It is matched with a seller", "একজন বিক্রেতার সঙ্গে মেলে", "When someone is selling at your price, the trade happens.", "আপনার দামে কেউ বিক্রি করতে চাইলে লেনদেন হয়ে যায়।"],
          [
            "Two working days later, the shares are yours",
            "দুই কর্মদিবস পরে শেয়ার আপনার",
            "CDBL moves the shares into your BO account and the seller gets the money. This wait is called T+2.",
            "সিডিবিএল শেয়ারগুলো আপনার বিও অ্যাকাউন্টে পাঠায়, আর বিক্রেতা টাকা পান। এই অপেক্ষাকে বলে T+2।",
          ],
        ),
      ],
    },
    {
      heading: l("When the market is open", "বাজার কখন খোলা থাকে"),
      blocks: [
        p(
          "The DSE trades from Sunday to Thursday, from 10 AM to 2:30 PM. It is closed on Friday, Saturday and public holidays. More than 350 companies are listed, along with mutual funds and bonds.",
          "ডিএসইতে লেনদেন হয় রবিবার থেকে বৃহস্পতিবার, সকাল 10টা থেকে দুপুর 2টা 30 মিনিট পর্যন্ত। শুক্রবার, শনিবার আর সরকারি ছুটির দিনে বাজার বন্ধ। এখানে 350টির বেশি কোম্পানি তালিকাভুক্ত, সঙ্গে আছে মিউচুয়াল ফান্ড আর বন্ড।",
        ),
        p(
          "To see how the whole market moved on a day, people look at the **DSEX**, the main index. Read more in [DSEX, DS30 and DSES](/learn/dse-indices).",
          "একদিনে পুরো বাজার কেমন গেল, তা বোঝার জন্য সবাই দেখেন **DSEX**, প্রধান সূচক। বিস্তারিত পড়ুন [DSEX, DS30 আর DSES](/blog/market-indices) লেখায়।",
        ),
      ],
    },
    {
      heading: l("The part people don't say", "যে কথাটা সবাই বলে না"),
      blocks: [
        p(
          "Shares are not a savings account. There have been years when most prices on the DSE fell by half and stayed low for a long time. People who borrowed, or who needed their money back quickly, lost the most.",
          "শেয়ার ব্যাংকের সঞ্চয় হিসাব নয়। এমন বছরও গেছে যখন ডিএসইর বেশিরভাগ শেয়ারের দাম অর্ধেকে নেমেছে আর অনেকদিন সেখানেই থেকেছে। যাঁরা ধার করে বিনিয়োগ করেছিলেন, বা যাঁদের দ্রুত টাকা ফেরত দরকার ছিল, তাঁরাই সবচেয়ে বেশি ক্ষতিতে পড়েছেন।",
        ),
        p(
          "Over many years, strong companies have grown and paid their owners well. The next post explains the two ways people use the market, trading and investing, and which one gives you time for that.",
          "দীর্ঘ সময় ধরে শক্তিশালী কোম্পানিগুলো বড় হয়েছে আর মালিকদের ভালো আয় দিয়েছে। পরের লেখায় দেখব, মানুষ বাজারকে দুইভাবে ব্যবহার করে, ট্রেডিং আর বিনিয়োগ, আর কোনটি এই অপেক্ষার সময় দেয়।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("A share is a small piece of a company. You gain from dividends and a higher price, and you can lose when it does badly.", "শেয়ার মানে কোম্পানির ছোট একটি অংশ। ডিভিডেন্ড আর দাম বাড়া থেকে লাভ হয়, কোম্পানি খারাপ করলে ক্ষতিও হতে পারে।"),
    l("On the market you buy from other investors. The company's money came from its IPO.", "বাজারে আপনি কেনেন অন্য বিনিয়োগকারীর কাছ থেকে। কোম্পানি টাকা পেয়েছিল আইপিওর সময়।"),
    l("Your broker does everything for you. Your shares are kept at CDBL in your BO account.", "সব কাজ করে আপনার ব্রোকার। আপনার শেয়ার জমা থাকে সিডিবিএলে, আপনার বিও অ্যাকাউন্টে।"),
  ],
  words: [
    { term: l("Listed company", "তালিকাভুক্ত কোম্পানি"), meaning: l("A company whose shares trade on the stock exchange.", "যে কোম্পানির শেয়ার স্টক এক্সচেঞ্জে কেনাবেচা হয়।") },
    { term: l("IPO", "আইপিও"), meaning: l("A company's first sale of shares to the public.", "সাধারণ মানুষের কাছে কোম্পানির প্রথম শেয়ার বিক্রি।") },
    { term: l("BO account", "বিও অ্যাকাউন্ট"), meaning: l("Your account at CDBL that holds your shares.", "সিডিবিএলে আপনার অ্যাকাউন্ট, যেখানে আপনার শেয়ার থাকে।") },
    { term: l("T+2", "T+2"), meaning: l("Shares and money change hands two working days after the trade.", "লেনদেনের দুই কর্মদিবস পরে শেয়ার আর টাকা হাতবদল হয়।") },
  ],
  faqs: [
    {
      q: l("Can I buy shares without a broker?", "ব্রোকার ছাড়া কি শেয়ার কেনা যায়?"),
      a: l("No. Every trade on the DSE goes through a broker that holds a trading licence from the exchange.", "না। ডিএসইর প্রতিটি লেনদেন হয় এমন ব্রোকারের মাধ্যমে, যার এক্সচেঞ্জে লেনদেনের লাইসেন্স আছে।"),
    },
    {
      q: l("Does the company get money when I buy its shares?", "আমি শেয়ার কিনলে কোম্পানি কি টাকা পায়?"),
      a: l("Not when you buy on the market. You pay another investor. The company got its money when it first sold shares in its IPO.", "বাজার থেকে কিনলে পায় না। আপনি টাকা দেন আরেকজন বিনিয়োগকারীকে। কোম্পানি টাকা পেয়েছিল আইপিওতে প্রথম শেয়ার বিক্রির সময়।"),
    },
    {
      q: l("What is the difference between the DSE and the CSE?", "ডিএসই আর সিএসইর মধ্যে পার্থক্য কী?"),
      a: l("Both are stock exchanges. The DSE in Dhaka is much bigger and is where most trading happens. Most large companies are listed on both.", "দুটিই স্টক এক্সচেঞ্জ। ঢাকার ডিএসই অনেক বড়, বেশিরভাগ লেনদেন সেখানেই হয়। বড় কোম্পানিগুলোর বেশিরভাগই দুই জায়গায় তালিকাভুক্ত।"),
    },
  ],
};
