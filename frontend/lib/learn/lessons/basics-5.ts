import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, tip } from "../build";

export const BASICS_5: Lesson = {
  id: "basics-5",
  path: "basics",
  n: 5,
  slug: LESSON_SLUGS["basics-5"],
  title: l("Cheap or expensive? How to judge a share's price", "সস্তা নাকি দামি? শেয়ারের দাম যাচাই করবেন যেভাবে"),
  seoTitle: l("Cheap or expensive? How to judge a share's price (P/E made simple)", "সস্তা নাকি দামি? শেয়ারের দাম যাচাই, সহজ ভাষায় পিই"),
  summary: l(
    "A share's price means nothing alone. Here is how to compare it with what the company earns, its own past and similar companies.",
    "শেয়ারের দাম একা কিছুই বোঝায় না। কোম্পানির আয়, তার নিজের অতীত আর একই রকম কোম্পানির সঙ্গে দাম কীভাবে তুলনা করবেন, তা এখানে।",
  ),
  minutes: 7,
  checked: "2026-11-25",
  keywords: l(
    "PE ratio meaning, is a share cheap, how to value a stock Bangladesh, PB ratio, undervalued stock DSE",
    "পিই রেশিও মানে, শেয়ার সস্তা কি না, শেয়ারের ন্যায্য দাম, পিবি, কম দামের শেয়ার",
  ),
  outcomes: [
    l("Why the price on its own tells you nothing", "শুধু দাম কেন কিছু বলে না"),
    l("How to read “years of profit you pay for”", "“কত বছরের মুনাফার দাম দিচ্ছেন” কীভাবে পড়বেন"),
    l("When a cheap share is cheap for a reason", "কখন সস্তা শেয়ার সস্তা হওয়ার কারণ থাকে"),
  ],
  sections: [
    {
      heading: l("The price alone says nothing", "শুধু দাম কিছুই বলে না"),
      blocks: [
        p(
          "A ৳20 share is not cheaper than a ৳500 share. What matters is how much profit you get for the price you pay.",
          "৳20-এর শেয়ার ৳500-এর শেয়ারের চেয়ে সস্তা নয়। আসল কথা হলো, যে দাম দিচ্ছেন তার বদলে কত মুনাফা পাচ্ছেন।",
        ),
      ],
    },
    {
      heading: l("Years of profit you pay for", "কত বছরের মুনাফার দাম দিচ্ছেন"),
      blocks: [
        p(
          "Divide the share price by the profit per share for a year. The answer is how many years of today's profit you pay for. Investors call it the **P/E**.",
          "শেয়ারের দামকে এক বছরের শেয়ারপ্রতি মুনাফা দিয়ে ভাগ করুন। উত্তর বলে, আজকের মুনাফার কত বছরের সমান দাম দিচ্ছেন। বিনিয়োগকারীরা একে বলেন **পিই**।",
        ),
        {
          kind: "example",
          title: l("Example: two shares", "উদাহরণ: দুটি শেয়ার"),
          rows: [
            { label: l("Share X: price ৳60, profit a share ৳5", "শেয়ার X: দাম ৳60, শেয়ারপ্রতি মুনাফা ৳5"), value: l("12 years", "12 বছর") },
            { label: l("Share Y: price ৳30, profit a share ৳1", "শেয়ার Y: দাম ৳30, শেয়ারপ্রতি মুনাফা ৳1"), value: l("30 years", "30 বছর") },
          ],
          note: l(
            "Share Y costs half as much per share, yet you pay far more for each taka of its profit.",
            "শেয়ার Y-এর দাম অর্ধেক, তবু এর প্রতি টাকা মুনাফার জন্য আপনি অনেক বেশি দিচ্ছেন।",
          ),
        },
      ],
    },
    {
      heading: l("Compare with three things", "তিনটি জিনিসের সঙ্গে তুলনা করুন"),
      blocks: [
        list(
          ["**Its own past.** Is it paying more or fewer years of profit than it usually does?", "**তার নিজের অতীত।** সাধারণত যত বছরের মুনাফার দাম থাকে, এখন তার চেয়ে বেশি না কম?"],
          ["**Similar companies.** A bank against other banks, a drug maker against other drug makers.", "**একই রকম কোম্পানি।** ব্যাংককে অন্য ব্যাংকের সঙ্গে, ওষুধ কোম্পানিকে অন্য ওষুধ কোম্পানির সঙ্গে।"],
          ["**A bank deposit.** 12 years of profit means the company earns about 8% of the price a year. A one-year deposit pays about 10% now, without risk to your money.", "**ব্যাংক আমানত।** 12 বছরের মুনাফা মানে কোম্পানি বছরে দামের প্রায় 8% আয় করে। এখন এক বছরের আমানতে প্রায় 10% পাওয়া যায়, টাকা হারানোর ঝুঁকি ছাড়া।"],
        ),
        p(
          "For banks, investors also compare the price with what the company owns per share (**P/B**). Below 1 means you pay less than its book value.",
          "ব্যাংকের ক্ষেত্রে বিনিয়োগকারীরা দামকে শেয়ারপ্রতি সম্পদের সঙ্গেও তুলনা করেন (**পিবি**)। 1-এর নিচে মানে খাতার মূল্যের চেয়ে কম দাম দিচ্ছেন।",
        ),
      ],
    },
    {
      heading: l("Cheap for a reason", "সস্তা হওয়ার কারণ থাকে"),
      blocks: [
        p(
          "A share that looks cheap is often cheap because something is wrong. Before you call it a bargain, check:",
          "যে শেয়ার সস্তা দেখায়, প্রায়ই কিছু একটা ঠিক নেই বলেই সস্তা। কম দাম বলার আগে দেখুন:",
        ),
        list(
          ["Is profit falling, or did the latest results show a loss?", "মুনাফা কি কমছে, বা সর্বশেষ ফলে লোকসান দেখা গেছে?"],
          ["Is last year's profit a one-off, such as selling land?", "গত বছরের মুনাফা কি এককালীন, যেমন জমি বিক্রি?"],
          ["Are its loans heavy, or is it in Z category?", "ঋণ কি বেশি, বা Z ক্যাটাগরিতে আছে?"],
        ),
        tip(
          "A strong company at a fair price is usually a better buy than a weak company at a very low price.",
          "খুব কম দামে দুর্বল কোম্পানির চেয়ে ন্যায্য দামে শক্তিশালী কোম্পানি সাধারণত ভালো কেনা।",
        ),
      ],
    },
    {
      heading: l("On TopStockBD", "TopStockBD-তে"),
      blocks: [
        p(
          "Every company's page says whether today's price is low, fair or high for what it earns, and shows the price range we think it is worth.",
          "প্রতিটি কোম্পানির পেজে বলা থাকে, আয়ের তুলনায় আজকের দাম কম, ন্যায্য না বেশি, আর আমাদের মতে এর মূল্য কোন দামের মধ্যে।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Judge a price by the profit you get for it, not by the number itself.", "দাম যাচাই করুন তার বদলে পাওয়া মুনাফা দিয়ে, শুধু সংখ্যা দেখে নয়।"),
    l("Compare years of profit with its own past, similar companies and a bank deposit.", "কত বছরের মুনাফার দাম, তা তুলনা করুন তার অতীত, একই রকম কোম্পানি আর ব্যাংক আমানতের সঙ্গে।"),
    l("Check why a cheap share is cheap before you buy it.", "কেনার আগে দেখুন সস্তা শেয়ার কেন সস্তা।"),
  ],
  words: [
    { term: l("P/E", "পিই"), meaning: l("Price divided by profit per share: years of today's profit you pay for.", "দামকে শেয়ারপ্রতি মুনাফা দিয়ে ভাগ: আজকের মুনাফার কত বছরের সমান দাম।") },
    { term: l("P/B", "পিবি"), meaning: l("Price divided by what the company owns per share.", "দামকে শেয়ারপ্রতি সম্পদ দিয়ে ভাগ।") },
  ],
  faqs: [
    {
      q: l("What is a good P/E for a DSE share?", "ডিএসইতে কত পিই হলে ভালো?"),
      a: l("There's no single number. Compare it with the company's own usual P/E and with similar companies; a lower one than both is worth a closer look.", "একটি নির্দিষ্ট সংখ্যা নেই। কোম্পানির নিজের সাধারণ পিই আর একই রকম কোম্পানির সঙ্গে তুলনা করুন; দুটোর চেয়ে কম হলে খুঁটিয়ে দেখার মতো।"),
    },
    {
      q: l("Is a share with a very low P/E always cheap?", "খুব কম পিই মানেই কি শেয়ার সস্তা?"),
      a: l("No. A one-off profit or falling earnings can make the P/E look low. Check that the profit is real and steady.", "না। এককালীন মুনাফা বা কমতে থাকা আয়ের কারণে পিই কম দেখাতে পারে। মুনাফা আসল আর স্থির কি না দেখুন।"),
    },
  ],
};
