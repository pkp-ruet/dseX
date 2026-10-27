import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "TopStockBD is not a financial advisor. All DSE stock data and scores are for informational purposes only. Invest at your own risk.",
  alternates: { canonical: "/disclaimer" },
  openGraph: {
    title: "Disclaimer — TopStockBD",
    description:
      "TopStockBD is not a financial advisor. All data is for informational purposes only. Invest at your own risk.",
    url: "/disclaimer",
    type: "website",
  },
};

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": `${BASE_URL}/disclaimer`,
      url: `${BASE_URL}/disclaimer`,
      name: "Disclaimer — TopStockBD",
      description:
        "Financial disclaimer for TopStockBD. Not financial advice. For informational purposes only.",
      isPartOf: { "@id": BASE_URL },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Disclaimer",
          item: `${BASE_URL}/disclaimer`,
        },
      ],
    },
  ],
};

const P = "text-lg leading-[1.78] text-text-muted";
const H2 = "text-xl sm:text-2xl font-bold tracking-tight text-text-main";
const B = "text-text-main";

const RESEARCH_STEPS: { en: string; bn: string }[] = [
  {
    en: "Read the company's annual report and financial statements",
    bn: "কোম্পানির বার্ষিক প্রতিবেদন ও আর্থিক বিবরণী পড়ুন",
  },
  {
    en: "Talk to a qualified, licensed financial advisor",
    bn: "একজন যোগ্য, লাইসেন্সপ্রাপ্ত আর্থিক পরামর্শকের সঙ্গে কথা বলুন",
  },
  {
    en: "Understand how much risk you can take and what you want from investing",
    bn: "আপনি কতটা ঝুঁকি নিতে পারেন আর বিনিয়োগ থেকে কী চান, তা বুঝে নিন",
  },
  {
    en: "Think about how each investment fits your wider portfolio",
    bn: "প্রতিটি বিনিয়োগ আপনার পুরো পোর্টফোলিওর সঙ্গে কীভাবে মেলে, তা ভেবে দেখুন",
  },
];

export default function DisclaimerPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <div className="page-narrow space-y-10">
        <PageHeader
          eyebrow={<T en="Disclaimer" bn="দায়মুক্তি" />}
          title={<T en="Disclaimer" bn="দায়মুক্তি" />}
          lead={<T en="Last updated: May 2025" bn="সর্বশেষ হালনাগাদ: মে 2025" />}
        />

        {/* Primary disclaimer — most prominent */}
        <section className="soft-card p-6 space-y-3.5 border-l-4 border-l-negative">
          <h2 className="text-lg font-bold text-text-main">
            <T en="Not financial advice" bn="এটি আর্থিক পরামর্শ নয়" />
          </h2>
          <p className={P}>
            <T
              en={
                <>
                  TopStockBD is <strong className={B}>not a financial advisor</strong>, investment advisor,
                  broker or dealer. Nothing on this website, including stock scores, rankings, signals or any
                  other content, is financial, investment or trading advice, or advice of any other kind.
                </>
              }
              bn={
                <>
                  TopStockBD কোনো <strong className={B}>আর্থিক পরামর্শদাতা নয়</strong>, বিনিয়োগ পরামর্শদাতা,
                  ব্রোকার বা ডিলারও নয়। এই ওয়েবসাইটের কোনো কিছুই, শেয়ারের স্কোর, র‍্যাঙ্কিং, সংকেত বা অন্য
                  যেকোনো বিষয়বস্তুসহ, আর্থিক, বিনিয়োগ বা ট্রেডিং পরামর্শ নয়, অন্য কোনো ধরনের পরামর্শও নয়।
                </>
              }
            />
          </p>
          <p className={P}>
            <T
              en={
                <>
                  All data, scores and analysis published on TopStockBD are{" "}
                  <strong className={B}>for informational purposes only</strong>. Please do not make any
                  investment decision based only on what you read here.
                </>
              }
              bn={
                <>
                  TopStockBD-তে প্রকাশিত সব তথ্য, স্কোর ও বিশ্লেষণ <strong className={B}>শুধু তথ্য জানানোর জন্য</strong>।
                  শুধু এখানে যা পড়লেন তার ভিত্তিতে বিনিয়োগের কোনো সিদ্ধান্ত নেবেন না।
                </>
              }
            />
          </p>
          <p className="text-lg font-bold text-text-main">
            <T en="You invest at your own risk." bn="বিনিয়োগের ঝুঁকি আপনার নিজের।" />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="No price predictions" bn="দামের কোনো পূর্বাভাস নয়" />
          </h2>
          <p className={P}>
            <T
              en="The stock score and every other figure on TopStockBD are based on past financial data. They show how a company has performed in the past, not how its share price will move in the future. A high score does not mean a share will go up, and a low score does not mean it will go down."
              bn="TopStockBD-এর শেয়ার স্কোর আর অন্য সব সংখ্যা অতীতের আর্থিক তথ্যের ওপর ভিত্তি করে তৈরি। এগুলো দেখায় কোম্পানি অতীতে কেমন করেছে, ভবিষ্যতে শেয়ারের দাম কোন দিকে যাবে তা নয়। বেশি স্কোর মানে দাম বাড়বে, এমন নয়; কম স্কোর মানে দাম কমবে, এমনও নয়।"
            />
          </p>
          <p className={P}>
            <T
              en="Past financial performance is not a reliable guide to future price performance."
              bn="অতীতের আর্থিক ফলাফল ভবিষ্যতের দামের নির্ভরযোগ্য ইঙ্গিত নয়।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Data accuracy" bn="তথ্যের নির্ভুলতা" />
          </h2>
          <p className={P}>
            <T
              en="We take our data from publicly available information, including the Dhaka Stock Exchange (DSE) and company disclosures. We make reasonable efforts to keep it accurate, but we cannot guarantee that all data on this site is complete, current or free of errors."
              bn="আমরা ঢাকা স্টক এক্সচেঞ্জ (ডিএসই) ও কোম্পানির প্রকাশিত তথ্যসহ সবার জন্য উন্মুক্ত উৎস থেকে তথ্য নিই। তথ্য নির্ভুল রাখতে আমরা যুক্তিসংগত চেষ্টা করি, তবে এই সাইটের সব তথ্য সম্পূর্ণ, হালনাগাদ বা ভুলমুক্ত, এমন নিশ্চয়তা দিতে পারি না।"
            />
          </p>
          <p className={P}>
            <T
              en="Before you make any decision, always check important figures in official sources, such as DSE company filings, BSEC disclosures or the company's own annual report."
              bn="যেকোনো সিদ্ধান্তের আগে গুরুত্বপূর্ণ সংখ্যাগুলো সব সময় অফিসিয়াল উৎস থেকে মিলিয়ে নিন, যেমন ডিএসইতে কোম্পানির জমা দেওয়া তথ্য, বিএসইসির প্রকাশিত তথ্য বা কোম্পানির নিজের বার্ষিক প্রতিবেদন।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="No broker relationship" bn="কোনো ব্রোকারের সঙ্গে সম্পর্ক নেই" />
          </h2>
          <p className={P}>
            <T
              en="TopStockBD is not connected to any brokerage, financial institution or regulated body. We do not carry out trades, manage portfolios or earn any commission from investing. We have no financial relationship with any company listed on this site."
              bn="TopStockBD কোনো ব্রোকারেজ হাউস, আর্থিক প্রতিষ্ঠান বা নিয়ন্ত্রিত সংস্থার সঙ্গে যুক্ত নয়। আমরা শেয়ার কেনাবেচা করি না, কারও পোর্টফোলিও পরিচালনা করি না, আর বিনিয়োগ থেকে কোনো কমিশন পাই না। এই সাইটে তালিকাভুক্ত কোনো কোম্পানির সঙ্গে আমাদের কোনো আর্থিক সম্পর্ক নেই।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Limitation of liability" bn="দায়ের সীমা" />
          </h2>
          <p className={P}>
            <T
              en="To the fullest extent the law allows, TopStockBD and its operators are not liable for any loss, damage or financial harm that results from your use of, or reliance on, the information on this site. You use this website entirely at your own risk."
              bn="আইন যতটা অনুমতি দেয় ততটা পর্যন্ত, এই সাইটের তথ্য ব্যবহার বা তার ওপর নির্ভর করার ফলে হওয়া কোনো লোকসান, ক্ষতি বা আর্থিক ক্ষতির জন্য TopStockBD ও এর পরিচালনাকারীরা দায়ী নয়। এই ওয়েবসাইট ব্যবহারের পুরো ঝুঁকি আপনার নিজের।"
            />
          </p>
        </section>

        <section className="space-y-3.5">
          <h2 className={H2}>
            <T en="Do your own research" bn="নিজে যাচাই করুন" />
          </h2>
          <p className={P}>
            <T
              en="Before you invest in any share, we strongly encourage you to:"
              bn="যেকোনো শেয়ারে বিনিয়োগের আগে আমরা জোর দিয়ে বলি:"
            />
          </p>
          <ul className="space-y-3">
            {RESEARCH_STEPS.map((item) => (
              <li key={item.en} className="flex gap-3 text-lg leading-[1.7] text-text-muted">
                <span aria-hidden="true" className="mt-[0.62em] h-[7px] w-[7px] shrink-0 rounded-full bg-primary" />
                <span>
                  <T en={item.en} bn={item.bn} />
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="pt-2 flex gap-4 flex-wrap items-center">
          <Link
            href="/about"
            className="text-base font-semibold text-primary hover:underline"
          >
            <T en="About TopStockBD →" bn="TopStockBD সম্পর্কে →" />
          </Link>
          <Link
            href="/privacy-policy"
            className="text-base font-medium text-text-muted hover:text-text-main transition-colors"
          >
            <T en="Privacy policy" bn="গোপনীয়তা নীতি" />
          </Link>
        </div>

      </div>
    </>
  );
}
