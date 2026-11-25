import type { Lesson } from "../types";
import { LESSON_SLUGS } from "../slugs";
import { l, list, p, steps, tip, warn } from "../build";

export const ADV_2: Lesson = {
  id: "adv-2",
  path: "advanced",
  n: 2,
  slug: LESSON_SLUGS["adv-2"],
  title: l("How to read quarterly results in 5 minutes", "5 মিনিটে প্রান্তিকের ফল পড়বেন যেভাবে"),
  seoTitle: l("How to read DSE quarterly results (Q1, Q2, Q3) in 5 minutes", "ডিএসইর প্রান্তিকের ফল (Q1, Q2, Q3) পড়বেন যেভাবে"),
  summary: l(
    "Every company posts its quarterly results to the DSE in the same short format. Here is what each line means and how to tell a good report from a worrying one.",
    "প্রতিটি কোম্পানি একই ছোট ছকে ডিএসইতে প্রান্তিকের ফল পোস্ট করে। প্রতিটি লাইনের মানে কী, আর ভালো ফল আর চিন্তার ফল কীভাবে আলাদা করবেন, তা এখানে।",
  ),
  minutes: 8,
  checked: "2026-11-25",
  keywords: l(
    "DSE quarterly results, Q1 Q2 Q3 EPS, NOCFPS meaning, half yearly results Bangladesh, EPS last 12 months",
    "প্রান্তিকের ফল, Q1 Q2 Q3 ইপিএস, এনওসিএফপিএস মানে, অর্ধবার্ষিক ফল, গত 12 মাসের ইপিএস",
  ),
  outcomes: [
    l("What each line of the DSE results post means", "ডিএসইর ফলের পোস্টের প্রতিটি লাইনের মানে"),
    l("Why you compare with the same quarter last year", "কেন গত বছরের একই প্রান্তিকের সঙ্গে তুলনা করবেন"),
    l("How to work out profit for the last 12 months", "গত 12 মাসের মুনাফা কীভাবে বের করবেন"),
  ],
  sections: [
    {
      heading: l("The post, line by line", "পোস্টটি, লাইন ধরে ধরে"),
      blocks: [
        p(
          "A few weeks after each quarter, the company posts a short notice on the DSE with its unaudited figures. It always carries the same lines.",
          "প্রতিটি প্রান্তিক শেষ হওয়ার কয়েক সপ্তাহ পরে কোম্পানি ডিএসইতে অনিরীক্ষিত হিসাবসহ একটি ছোট নোটিশ দেয়। এতে সবসময় একই লাইনগুলো থাকে।",
        ),
        {
          kind: "table",
          head: [l("Line", "লাইন"), l("What it means", "মানে")],
          rows: [
            [l("EPS for the quarter", "প্রান্তিকের ইপিএস"), l("Profit per share in these three months, against the same three months last year.", "এই তিন মাসে শেয়ারপ্রতি মুনাফা, গত বছরের একই তিন মাসের সঙ্গে।")],
            [l("EPS for the period (year so far)", "সময়কালের ইপিএস (বছরের এ পর্যন্ত)"), l("Profit per share from the start of the year to now, against last year's same months.", "বছরের শুরু থেকে এখন পর্যন্ত শেয়ারপ্রতি মুনাফা, গত বছরের একই মাসগুলোর সঙ্গে।")],
            [l("NOCFPS", "এনওসিএফপিএস"), l("Cash from the business per share, year so far. Negative means more cash went out than came in.", "বছরের এ পর্যন্ত ব্যবসা থেকে শেয়ারপ্রতি নগদ। ঋণাত্মক মানে যত এসেছে তার চেয়ে বেশি বেরিয়ে গেছে।")],
            [l("NAV per share", "শেয়ারপ্রতি এনএভি"), l("What the company owns less what it owes, per share, at the quarter's end.", "প্রান্তিক শেষে কোম্পানির সম্পদ থেকে দায় বাদ দিয়ে শেয়ারপ্রতি যা থাকে।")],
          ],
        },
        p(
          "Figures in brackets, such as (1.20), are negative.",
          "বন্ধনীর মধ্যে লেখা সংখ্যা, যেমন (1.20), ঋণাত্মক।",
        ),
      ],
    },
    {
      heading: l("Always compare with the same quarter last year", "সবসময় গত বছরের একই প্রান্তিকের সঙ্গে তুলনা"),
      blocks: [
        p(
          "Many businesses have seasons: a cement company sells more in the dry months, a garment maker ships more before Western holidays. So compare January to March with January to March last year, not with the quarter before.",
          "অনেক ব্যবসার মৌসুম আছে: শুকনো মাসে সিমেন্ট বেশি বিক্রি হয়, পশ্চিমা ছুটির আগে পোশাক কারখানা বেশি রপ্তানি করে। তাই জানুয়ারি-মার্চকে আগের প্রান্তিকের সঙ্গে নয়, গত বছরের জানুয়ারি-মার্চের সঙ্গে তুলনা করুন।",
        ),
        list(
          ["**Year so far up 10% or more:** a better report.", "**বছরের এ পর্যন্ত 10% বা তার বেশি বেড়েছে:** ভালো ফল।"],
          ["**Within 10% either way:** about the same.", "**10%-এর মধ্যে কমবেশি:** প্রায় একই রকম।"],
          ["**Down 10% to 25%:** worth a closer look.", "**10% থেকে 25% কমেছে:** খুঁটিয়ে দেখার মতো।"],
          ["**Down more than 25%, or a loss:** a weaker report. A cheap-looking price may be cheap for a reason.", "**25%-এর বেশি কমেছে, বা লোকসান:** দুর্বল ফল। কম দাম দেখালেও তার কারণ থাকতে পারে।"],
        ),
      ],
    },
    {
      heading: l("Profit for the last 12 months", "গত 12 মাসের মুনাফা"),
      blocks: [
        p(
          "The P/E you see is usually based on the last full year. After a quarter, you can bring it up to date.",
          "যে পিই দেখেন, তা সাধারণত গত পুরো বছরের ভিত্তিতে। একটি প্রান্তিকের ফল এলে তা হালনাগাদ করতে পারেন।",
        ),
        {
          kind: "example",
          title: l("Example: profit per share for the last 12 months", "উদাহরণ: গত 12 মাসের শেয়ারপ্রতি মুনাফা"),
          rows: [
            { label: l("Last full year's EPS", "গত পুরো বছরের ইপিএস"), value: "৳8.00" },
            { label: l("Less last year's first 6 months", "বাদ: গত বছরের প্রথম 6 মাস"), value: "−৳3.50" },
            { label: l("Plus this year's first 6 months", "যোগ: এ বছরের প্রথম 6 মাস"), value: "+৳4.20" },
          ],
          total: { label: l("EPS for the last 12 months", "গত 12 মাসের ইপিএস"), value: "৳8.70" },
          note: l("At a price of ৳87, that is 10 years of profit, not the 10.9 the full-year figure suggests.", "৳87 দামে এটি 10 বছরের মুনাফা, পুরো বছরের হিসাবে যা 10.9 দেখায় তা নয়।"),
        },
      ],
    },
    {
      heading: l("Four things that should make you look again", "যে চারটি জিনিস দেখলে আবার দেখবেন"),
      blocks: [
        list(
          ["Profit up, but NOCFPS negative and getting worse.", "মুনাফা বেড়েছে, কিন্তু এনওসিএফপিএস ঋণাত্মক আর আরও খারাপ হচ্ছে।"],
          ["A big jump in profit with no change in sales mentioned, often from a one-off gain.", "বিক্রির কোনো বদল ছাড়াই মুনাফায় বড় লাফ, প্রায়ই এককালীন লাভ থেকে।"],
          ["The latest quarter alone much weaker than the earlier ones, even if the year so far looks fine.", "বছরের এ পর্যন্ত ভালো দেখালেও শুধু সর্বশেষ প্রান্তিক আগেরগুলোর চেয়ে অনেক দুর্বল।"],
          ["Results posted late, or a board meeting postponed more than once.", "ফল দেরিতে পোস্ট হওয়া, বা বোর্ড সভা একাধিকবার পিছিয়ে যাওয়া।"],
        ),
        warn(
          "Quarterly figures are not audited. A year-end that differs a lot from the three quarters before it deserves a question.",
          "প্রান্তিকের হিসাব নিরীক্ষিত নয়। আগের তিন প্রান্তিক থেকে বছর শেষের হিসাব অনেক আলাদা হলে প্রশ্ন তোলার মতো।",
        ),
      ],
    },
    {
      heading: l("A five-minute routine", "পাঁচ মিনিটের অভ্যাস"),
      blocks: [
        steps(
          ["Year so far against last year", "বছরের এ পর্যন্ত বনাম গত বছর"],
          ["The latest quarter alone", "শুধু সর্বশেষ প্রান্তিক"],
          ["NOCFPS: positive, and moving with profit?", "এনওসিএফপিএস: ধনাত্মক, আর মুনাফার সঙ্গে চলছে কি না"],
          ["Update the P/E with the last 12 months", "গত 12 মাস দিয়ে পিই হালনাগাদ করুন"],
          ["Note one line for next quarter", "পরের প্রান্তিকের জন্য এক লাইন নোট রাখুন"],
        ),
        tip(
          "Our Results page reads every report as it is posted and says whether it is better, about the same or weaker.",
          "আমাদের ফলাফল পেজ প্রতিটি রিপোর্ট পোস্ট হওয়ার সঙ্গে সঙ্গে পড়ে, আর বলে দেয় ভালো, প্রায় একই না দুর্বল।",
        ),
      ],
    },
  ],
  keyPoints: [
    l("Compare with the same quarter last year, and look at the year so far and the latest quarter alone.", "গত বছরের একই প্রান্তিকের সঙ্গে তুলনা করুন, আর দেখুন বছরের এ পর্যন্ত আর শুধু সর্বশেষ প্রান্তিক।"),
    l("Profit should come with cash: watch NOCFPS.", "মুনাফার সঙ্গে নগদ আসা উচিত: এনওসিএফপিএস দেখুন।"),
    l("Update the price-for-profit with the last 12 months after each quarter.", "প্রতিটি প্রান্তিকের পর গত 12 মাস দিয়ে দামের হিসাব হালনাগাদ করুন।"),
  ],
  words: [
    { term: l("NOCFPS", "এনওসিএফপিএস"), meaning: l("Net operating cash flow per share: cash from the business, per share.", "শেয়ারপ্রতি নিট পরিচালন নগদ প্রবাহ: ব্যবসা থেকে আসা শেয়ারপ্রতি নগদ।") },
    { term: l("Last 12 months (TTM)", "গত 12 মাস"), meaning: l("Profit over the latest four quarters, the most recent full-year view.", "সর্বশেষ চার প্রান্তিকের মুনাফা, সবচেয়ে হালনাগাদ বার্ষিক চিত্র।") },
  ],
  tryIt: {
    text: l("See every company's latest results, newest first, and whether each was better or weaker.", "প্রতিটি কোম্পানির সর্বশেষ ফল দেখুন, নতুনটা আগে, আর প্রতিটি ভালো না দুর্বল।"),
    label: l("Open Results", "ফলাফল খুলুন"),
    href: "/results",
  },
  faqs: [
    {
      q: l("What is NOCFPS in DSE results?", "ডিএসইর ফলে এনওসিএফপিএস কী?"),
      a: l("Net operating cash flow per share: how much cash the business brought in per share in the period. Negative means more cash went out than came in.", "শেয়ারপ্রতি নিট পরিচালন নগদ প্রবাহ: সময়কালে ব্যবসা শেয়ারপ্রতি কত নগদ এনেছে। ঋণাত্মক মানে যত এসেছে তার চেয়ে বেশি বেরিয়ে গেছে।"),
    },
    {
      q: l("Are quarterly results audited?", "প্রান্তিকের ফল কি নিরীক্ষিত?"),
      a: l("No. Only the yearly accounts are audited. Quarterly figures are the company's own.", "না। শুধু বার্ষিক হিসাব নিরীক্ষিত হয়। প্রান্তিকের হিসাব কোম্পানির নিজের।"),
    },
  ],
};
