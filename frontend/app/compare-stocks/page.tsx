import type { Metadata } from "next";
import Link from "@/components/ui/Link";
import PageHeader from "@/components/ui/PageHeader";
import PageGuide from "@/components/seo/PageGuide";
import CompareClient from "@/components/compare/CompareClient";
import { T } from "@/components/i18n/T";
import { getInsightScores } from "@/lib/api";
import { COMPARE_PATH, FREE_COMPARE, MAX_COMPARE, shortName, type PickOption } from "@/lib/compare";

// The page itself is the same for everyone; the comparison is fetched in the
// browser for the codes in the URL (?s=GP,ROBI). The company list the picker
// searches is rebuilt hourly; the scores fetch throws on an outage so ISR keeps
// the last good page (SEO rule 4).
export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const URL = `${BASE_URL}${COMPARE_PATH}`;
const TITLE = "Compare DSE stocks side by side";
const DESCRIPTION =
  "Put Dhaka Stock Exchange shares side by side: our grade, company size, profit growth, cash dividend, price for its profit, loans and the price this year, with the leader on each in plain words.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "compare DSE stocks",
    "DSE share comparison",
    "compare shares Bangladesh",
    "stock comparison Dhaka Stock Exchange",
    "GP vs Robi share",
    "which share is better DSE",
    "শেয়ার তুলনা",
  ],
  alternates: { canonical: URL },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: URL, type: "website" },
};

const FAQ = [
  {
    q: "How does the comparison work?",
    a: "Pick two or more shares. We answer the same seven questions for each: how strong the company is, how big it is, whose profit grew more, which pays more cash, which costs less for its profit, which has fewer loans and how the price moved this year. Each answer sorts the shares on one figure and names the one that leads.",
    qBn: "তুলনাটি কীভাবে কাজ করে?",
    aBn: "দুই বা তার বেশি শেয়ার বেছে নিন। প্রতিটির জন্য আমরা একই সাতটি প্রশ্নের উত্তর দিই: কোম্পানি কতটা শক্তিশালী, কত বড়, কার মুনাফা বেশি বেড়েছে, কোনটি বেশি নগদ ডিভিডেন্ড দেয়, মুনাফার তুলনায় কোনটির দাম কম, কোনটির ঋণ কম, আর এ বছর দাম কেমন বদলেছে। প্রতিটি উত্তরে একটি হিসাব দিয়ে শেয়ারগুলো সাজানো হয়, আর যে এগিয়ে তার নাম বলা হয়।",
  },
  {
    q: "Does the share that leads the most questions make the better buy?",
    a: "No. Each answer is about one figure only. A share can lead on dividends and still carry heavy loans, or cost little because its profit is falling. Read the answers together, then open each company's page for the full picture.",
    qBn: "যে শেয়ার বেশি প্রশ্নে এগিয়ে, সেটিই কি কেনার জন্য ভালো?",
    aBn: "না। প্রতিটি উত্তর শুধু একটি হিসাব নিয়ে। একটি শেয়ার ডিভিডেন্ডে এগিয়ে থেকেও ঋণে ভারী হতে পারে, অথবা মুনাফা কমছে বলে দাম কম হতে পারে। উত্তরগুলো একসাথে পড়ুন, তারপর পুরো ছবির জন্য প্রতিটি কোম্পানির পেজ খুলুন।",
  },
  {
    q: "How many shares can I compare?",
    a: `${FREE_COMPARE} at a time on a free account, and up to ${MAX_COMPARE} with Premium. Premium also puts our analysis of each company side by side.`,
    qBn: "কতগুলো শেয়ার তুলনা করা যায়?",
    aBn: `ফ্রি অ্যাকাউন্টে একসাথে ${FREE_COMPARE}টি, প্রিমিয়ামে ${MAX_COMPARE}টি পর্যন্ত। প্রিমিয়ামে প্রতিটি কোম্পানির ওপর আমাদের বিশ্লেষণও পাশাপাশি দেখা যায়।`,
  },
  {
    q: "Where do the numbers come from?",
    a: "Prices are DSE's official close. Profit, dividends and loans come from each company's audited accounts and its notices to DSE. The grade is the same one shown on every stock page.",
    qBn: "সংখ্যাগুলো কোথা থেকে আসে?",
    aBn: "দাম ডিএসইর অফিশিয়াল সমাপনী দাম। মুনাফা, ডিভিডেন্ড আর ঋণ আসে প্রতিটি কোম্পানির নিরীক্ষিত হিসাব আর ডিএসইকে দেওয়া নোটিশ থেকে। গ্রেডটি প্রতিটি শেয়ারের পেজে দেখানো গ্রেডই।",
  },
];

export default async function CompareStocksPage() {
  const scores = await getInsightScores();
  const options: PickOption[] = scores
    .filter((s) => s.score != null)
    .map((s) => ({ code: s.trading_code, name: shortName(s.company_name, s.trading_code), sector: s.sector }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: "Compare stocks",
        headline: TITLE,
        description: DESCRIPTION,
        url: URL,
        inLanguage: ["en", "bn"],
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Compare stocks", item: URL },
        ],
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={<T en="Find stocks" bn="শেয়ার খুঁজুন" />}
        title={<T en="Compare stocks" bn="শেয়ার তুলনা" />}
        lead={
          <T
            en="Put DSE shares side by side. We answer the same seven questions for each, so you can see which one is ahead on what."
            bn="ডিএসইর শেয়ার পাশাপাশি রেখে দেখুন। প্রতিটির জন্য আমরা একই সাতটি প্রশ্নের উত্তর দিই, যাতে বুঝতে পারেন কোনটি কোন দিকে এগিয়ে।"
          />
        }
      />

      <CompareClient options={options} />

      <PageGuide
        title="About comparing shares"
        titleBn="শেয়ার তুলনা সম্পর্কে"
        intro={[
          <>
            Comparing two shares usually means opening two pages and holding the numbers in your head. Here the
            numbers sit next to each other. Each card asks <b>one plain question</b>, sorts the shares on one
            figure and names the share that leads, so five shares are five bars, never five columns.
          </>,
          <>
            The leader on a card leads on that figure only. It is not a tip. A cheap share can be cheap because its
            profit is falling, and a big dividend can come from a company with heavy loans. When one share interests
            you, open its page for our full analysis, or see how it ranks among every company on the{" "}
            <Link href="/dsestockranking">company ranking</Link>.
          </>,
        ]}
        introBn={[
          <>
            দুটি শেয়ার তুলনা করতে সাধারণত দুটি পেজ খুলে সংখ্যাগুলো মনে রাখতে হয়। এখানে সংখ্যাগুলো পাশাপাশি থাকে।
            প্রতিটি কার্ডে <b>একটি সহজ প্রশ্ন</b>, একটি হিসাব দিয়ে শেয়ারগুলো সাজানো, আর যে এগিয়ে তার নাম। তাই
            পাঁচটি শেয়ার মানে পাঁচটি বার, পাঁচটি কলাম নয়।
          </>,
          <>
            কার্ডে যে এগিয়ে, সে শুধু ওই হিসাবেই এগিয়ে। এটি কোনো টিপস নয়। মুনাফা কমছে বলে কোনো শেয়ারের দাম কম হতে
            পারে, আবার ঋণে ভারী কোম্পানিও বড় ডিভিডেন্ড দিতে পারে। কোনো শেয়ার পছন্দ হলে আমাদের পূর্ণ বিশ্লেষণের জন্য
            তার পেজ খুলুন, অথবা <Link href="/dsestockranking">কোম্পানির র‍্যাঙ্কিংয়ে</Link> সব কোম্পানির মধ্যে তার
            অবস্থান দেখুন।
          </>,
        ]}
        faq={FAQ}
      />
    </>
  );
}
