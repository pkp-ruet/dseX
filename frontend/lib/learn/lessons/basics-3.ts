import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip } from "../build";

export const BASICS_3: Lesson = {
  id: "basics-3",
  path: "basics",
  n: 3,
  slug: LESSON_SLUGS["basics-3"],
  title: l("How to read the market each day", "প্রতিদিন বাজার বুঝবেন যেভাবে"),
  seoTitle: l("How to read the DSE market each day: DSEX, breadth and turnover", "প্রতিদিন ডিএসই বাজার বুঝবেন যেভাবে: সূচক, ওঠানামা আর লেনদেন"),
  summary: l(
    "Three numbers tell you how the market did today, and reading them together tells you whether it matters.",
    "তিনটি সংখ্যা বলে দেয় আজ বাজার কেমন গেল, আর তিনটি একসঙ্গে পড়লে বোঝা যায় এর গুরুত্ব কতটা।",
  ),
  minutes: 6,
  checked: "2026-11-25",
  keywords: l(
    "how to read DSE market, DSEX today, market breadth Bangladesh, DSE turnover, share market today",
    "আজকের শেয়ার বাজার, ডিএসইএক্স, বাজারের লেনদেন, কত শেয়ারের দাম বাড়ল, বাজার বোঝার উপায়",
  ),
  outcomes: [
    l("The three numbers that sum up a day", "যে তিনটি সংখ্যায় একটি দিনের সারকথা"),
    l("How to read them together", "তিনটি একসঙ্গে পড়ার উপায়"),
    l("Why the week matters more than the day", "কেন দিনের চেয়ে সপ্তাহ বেশি জরুরি"),
  ],
  sections: [
    {
      heading: l("Three numbers for the day", "দিনের তিনটি সংখ্যা"),
      blocks: [
        {
          kind: "table",
          head: [l("Number", "সংখ্যা"), l("What it tells you", "কী বলে")],
          rows: [
            [l("DSEX", "DSEX"), l("The main index. Up means the market as a whole rose, weighted by company size.", "প্রধান সূচক। বাড়লে বোঝায় পুরো বাজার বেড়েছে, কোম্পানির আকার অনুযায়ী হিসাব করে।")],
            [l("Rose and fell", "কতগুলো বাড়ল-কমল"), l("How many shares went up against how many went down. It shows how wide the move was.", "কতগুলো শেয়ারের দাম বেড়েছে আর কতগুলোর কমেছে। বোঝায় ওঠানামা কতটা ছড়ানো।")],
            [l("Turnover", "লেনদেন"), l("Taka traded in the day. Compare it with a normal day to see how busy the market was.", "দিনে কত টাকার লেনদেন হলো। স্বাভাবিক দিনের সঙ্গে তুলনা করলে বোঝা যায় বাজার কতটা ব্যস্ত ছিল।")],
          ],
        },
        p(
          "More on the three indices in [DSEX, DS30 and DSES](/learn/dse-indices).",
          "তিনটি সূচক নিয়ে বিস্তারিত পড়ুন [DSEX, DS30 আর DSES](/blog/market-indices) লেখায়।",
        ),
      ],
    },
    {
      heading: l("Reading them together", "তিনটি একসঙ্গে পড়া"),
      blocks: [
        list(
          ["**DSEX up, most shares up, turnover high:** a broad, strong day. Many investors were buying.", "**DSEX বাড়ল, বেশিরভাগ শেয়ার বাড়ল, লেনদেন বেশি:** ছড়ানো আর শক্ত একটি দিন। অনেকে কিনছিলেন।"],
          ["**DSEX up, but most shares fell:** a few big companies lifted the index. Most shares had a bad day.", "**DSEX বাড়ল, কিন্তু বেশিরভাগ শেয়ার কমল:** কয়েকটি বড় কোম্পানি সূচক টেনে তুলেছে। বেশিরভাগ শেয়ারের দিন খারাপ গেছে।"],
          ["**A big move on low turnover:** few people traded, so the move tells you less.", "**কম লেনদেনে বড় ওঠানামা:** অল্প মানুষ লেনদেন করেছেন, তাই এই ওঠানামার গুরুত্ব কম।"],
          ["**DSEX down, most shares down, turnover high:** many investors were selling. Worth watching the next few days.", "**DSEX কমল, বেশিরভাগ শেয়ার কমল, লেনদেন বেশি:** অনেকে বিক্রি করছিলেন। পরের কয়েক দিন খেয়াল রাখার মতো।"],
        ),
      ],
    },
    {
      heading: l("The week matters more than the day", "দিনের চেয়ে সপ্তাহ বেশি জরুরি"),
      blocks: [
        p(
          "One day's move is mostly noise. Look at how the market moved over the week, and where the DSEX sits against its high and low of the year.",
          "একদিনের ওঠানামা বেশিরভাগই এলোমেলো। দেখুন সপ্তাহজুড়ে বাজার কোন দিকে গেল, আর এ বছরের সর্বোচ্চ ও সর্বনিম্ন দামের তুলনায় DSEX এখন কোথায়।",
        ),
        tip(
          "Don't buy or sell because of one day. A day tells you the mood; your companies' results tell you their worth.",
          "একদিনের জন্য কেনা বা বেচা নয়। একটি দিন বলে বাজারের মেজাজ; আপনার কোম্পানির ফল বলে তার আসল মূল্য।",
        ),
      ],
    },
    {
      heading: l("Your own shares come first", "আগে নিজের শেয়ার"),
      blocks: [
        p(
          "The market can rise while your shares fall, and the other way round. After the market, check your own shares: their price, and any news or results from the companies.",
          "বাজার বাড়লেও আপনার শেয়ার কমতে পারে, উল্টোটাও হয়। বাজার দেখার পর নিজের শেয়ারগুলো দেখুন: দাম, আর কোম্পানির কোনো খবর বা ফল।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("DSEX, how many shares rose against fell, and turnover sum up the day.", "DSEX, কতগুলো শেয়ার বাড়ল-কমল, আর লেনদেন মিলে দিনের সারকথা।"),
    l("A rising index with most shares falling means a few big companies carried it.", "সূচক বাড়ল কিন্তু বেশিরভাগ শেয়ার কমল মানে কয়েকটি বড় কোম্পানি টেনে তুলেছে।"),
    l("Read the week, not the day, and check your own shares after the market.", "দিন নয়, সপ্তাহ দেখুন, আর বাজারের পর নিজের শেয়ার দেখুন।"),
  ],
  words: [
    { term: l("Index", "সূচক"), meaning: l("One number that follows the prices of many shares together.", "একটি সংখ্যা, যা অনেক শেয়ারের দাম একসঙ্গে অনুসরণ করে।") },
    { term: l("Turnover", "লেনদেন"), meaning: l("The taka value of all shares traded in a day.", "একদিনে কেনাবেচা হওয়া সব শেয়ারের মোট টাকার পরিমাণ।") },
  ],
  tryIt: {
    text: l("See today's DSEX, how many shares rose and fell, and turnover, explained in plain words.", "আজকের DSEX, কতগুলো শেয়ার বাড়ল-কমল আর লেনদেন দেখুন, সহজ ভাষায়।"),
    label: l("Open Market today", "আজকের বাজার খুলুন"),
    href: "/dse-today",
  },
  faqs: [
    {
      q: l("What is a good turnover on the DSE?", "ডিএসইতে কত লেনদেন হলে ভালো?"),
      a: l("There's no fixed number. Compare today with a normal day of the last month: much higher means a busy market, much lower a quiet one.", "নির্দিষ্ট কোনো সংখ্যা নেই। গত এক মাসের স্বাভাবিক দিনের সঙ্গে তুলনা করুন: অনেক বেশি মানে ব্যস্ত বাজার, অনেক কম মানে শান্ত বাজার।"),
    },
    {
      q: l("Why did my share fall when the DSEX rose?", "DSEX বাড়ল, অথচ আমার শেয়ার কেন কমল?"),
      a: l("The index is weighted by size, so a few big companies can lift it while many smaller shares fall.", "সূচক কোম্পানির আকার অনুযায়ী হিসাব হয়, তাই কয়েকটি বড় কোম্পানি সূচক তুলতে পারে, আর অনেক ছোট শেয়ার তখন কমতে পারে।"),
    },
  ],
};
