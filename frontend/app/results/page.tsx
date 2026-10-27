import type { Metadata } from "next";
import Link from "next/link";
import { getLatestResults } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import ResultsFeed from "@/components/results/ResultsFeed";
import PageGuide from "@/components/seo/PageGuide";
import HubLinks from "@/components/layout/HubLinks";
import { FREE_RESULTS_ROWS } from "@/lib/free-share";
import { bnDate } from "@/lib/bn";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const PATH = "/results";
const YEAR = new Date().getFullYear();
const TITLE = "DSE Quarterly Results — Latest EPS of Every Company";
const DESCRIPTION =
  "Every Dhaka Stock Exchange company's latest quarterly results (Q1, Q2, Q3), newest first: earnings per share against the same months last year, in plain words.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE quarterly results",
    `DSE Q3 results ${YEAR}`,
    `DSE Q1 results ${YEAR}`,
    "DSE EPS",
    "DSE company EPS",
    "quarterly EPS Bangladesh",
    "Dhaka Stock Exchange results",
    "DSE financial results",
    "un-audited financial statements DSE",
    "ত্রৈমাসিক আর্থিক প্রতিবেদন",
    "ইপিএস",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}${PATH}`,
    type: "website",
  },
};

/**
 * Every company's latest quarterly report (DSE's Q1/Q2/Q3 posts), newest
 * first — the free part of the results explainer: a plain headline and the
 * profit figure against a year earlier. The full read (cash, price, score,
 * what it means) is on each stock page, behind its Premium lock.
 * Free readers see the counts and the newest FREE_RESULTS_ROWS reports; the
 * rest of the list is Premium (screen-only lock, paywall JSON-LD below).
 * Fetched and awaited in the page: no streaming on an indexable route.
 */
export default async function ResultsPage() {
  const data = await getLatestResults().catch(() => null);

  if (!data) {
    return (
      <>
        <PageHeader title={<T en="Latest quarterly results" bn="সর্বশেষ প্রান্তিকের ফল" />} />
        <ErrorState
          title={<T en="We couldn't load the latest results" bn="সর্বশেষ ফল এখন লোড করা যাচ্ছে না" />}
          links={[{ href: "/dse-today", label: <T en="DSE today" bn="আজকের ডিএসই" /> }]}
        />
      </>
    );
  }

  const rows = data.results;
  const { good = 0, bad = 0 } = data.counts;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        name: TITLE,
        description: DESCRIPTION,
        url: `${BASE_URL}${PATH}`,
        ...(data.as_of ? { dateModified: data.as_of } : {}),
        // Most of the list is shown in full only to Premium readers.
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Quarterly results", item: `${BASE_URL}${PATH}` },
        ],
      },
      {
        "@type": "ItemList",
        name: "Latest DSE quarterly results",
        itemListElement: rows.slice(0, FREE_RESULTS_ROWS).map((r, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${r.name} (${r.code}): ${r.headline_en}`,
          url: `${BASE_URL}/stock/${encodeURIComponent(r.code)}`,
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="Latest quarterly results" bn="সর্বশেষ প্রান্তিকের ফল" />}
        lead={
          <T
            en={`The latest reports of ${rows.length} companies, newest first. ${good} earned clearly more than a year earlier, and ${bad} clearly less. The newest ${FREE_RESULTS_ROWS} are free; every company's report is in Premium.`}
            bn={`${rows.length}টি কোম্পানির সর্বশেষ প্রতিবেদন, নতুনগুলো আগে। ${good}টি গত বছরের একই সময়ের চেয়ে স্পষ্টভাবে বেশি মুনাফা করেছে, আর ${bad}টি স্পষ্টভাবে কম। নতুন ${FREE_RESULTS_ROWS}টি ফ্রি; সব কোম্পানির প্রতিবেদন প্রিমিয়ামে।`}
          />
        }
        actions={
          data.as_of ? (
            <span className="ms-page-date">
              <T en={`Latest report ${formatDate(data.as_of)}`} bn={`সর্বশেষ প্রতিবেদন ${bnDate(data.as_of)}`} />
            </span>
          ) : undefined
        }
      />

      <ResultsFeed rows={rows} counts={data.counts} />

      <PageGuide
        title="About these results"
        titleBn="এই ফলগুলো সম্পর্কে"
        intro={[
          <>
            Every company on the Dhaka Stock Exchange posts its <b>un-audited quarterly results</b> on DSE in one
            fixed form: earnings per share (EPS) for the quarter and for the year so far, each against the same
            months a year earlier. This page reads every company&apos;s latest post and sums it up in one line:
            better, weaker or about the same, newest first.
          </>,
          <>
            &ldquo;Better&rdquo; means profit per share is up 10% or more on the same months last year (or the company is
            back to a profit); &ldquo;weaker&rdquo; means down 10% or more, or a loss; &ldquo;mixed&rdquo; means profit is
            up but the cash didn&apos;t come in, or the latest quarter slowed down. A report stays here until the
            company&apos;s audited yearly accounts for that year come out. Tap a company for the full read: the latest
            quarter on its own, cash from the business, what the price costs on the last 12 months&apos; profit, and
            how our score moved.
          </>,
          <>
            One quarter is not a verdict. Quarterly figures are not audited, and a one-off gain or loss can swing
            them. Look at the company&apos;s yearly trend and its{" "}
            <Link href="/dsestockranking">fundamental score</Link> before you decide.
          </>,
        ]}
        introBn={[
          <>
            ঢাকা স্টক এক্সচেঞ্জের প্রতিটি কোম্পানি একটি নির্দিষ্ট ছকে ডিএসইতে তাদের <b>অনিরীক্ষিত প্রান্তিক
            ফল</b> প্রকাশ করে: প্রান্তিকের এবং বছরের শুরু থেকে এখন পর্যন্ত শেয়ারপ্রতি আয় (ইপিএস), প্রতিটি গত বছরের
            একই সময়ের পাশে রেখে। এই পেজ প্রতিটি কোম্পানির সর্বশেষ প্রতিবেদন পড়ে এক লাইনে জানায়: ভালো, দুর্বল,
            নাকি প্রায় আগের মতো। নতুনগুলো আগে থাকে।
          </>,
          <>
            &ldquo;ভালো&rdquo; মানে গত বছরের একই সময়ের চেয়ে শেয়ারপ্রতি মুনাফা 10% বা তার বেশি বেড়েছে, অথবা কোম্পানি
            আবার মুনাফায় ফিরেছে। &ldquo;দুর্বল&rdquo; মানে 10% বা তার বেশি কমেছে, অথবা লোকসান হয়েছে। &ldquo;মিশ্র&rdquo; মানে
            মুনাফা বেড়েছে কিন্তু নগদ টাকা আসেনি, অথবা সর্বশেষ প্রান্তিকে গতি কমেছে। কোম্পানির সেই বছরের নিরীক্ষিত
            বার্ষিক হিসাব প্রকাশ না হওয়া পর্যন্ত প্রতিবেদনটি এখানে থাকে। পুরো ব্যাখ্যা দেখতে কোম্পানিতে চাপ দিন:
            শুধু সর্বশেষ প্রান্তিক, ব্যবসা থেকে আসা নগদ টাকা, গত 12 মাসের মুনাফায় দাম কত, আর আমাদের স্কোর কীভাবে
            বদলেছে।
          </>,
          <>
            একটি প্রান্তিক দিয়ে কোম্পানি বিচার করা যায় না। প্রান্তিকের হিসাব নিরীক্ষিত নয়, আর একবারের কোনো লাভ বা
            ক্ষতি এগুলোকে অনেকটা বদলে দিতে পারে। সিদ্ধান্তের আগে কোম্পানির বছরে বছরে গতি আর তার{" "}
            <Link href="/dsestockranking">স্কোর</Link> দেখে নিন।
          </>,
        ]}
        faq={[
          {
            q: "When do DSE companies post quarterly results?",
            a: "Usually within one to two months of each quarter's end: Q1 (the first three months), Q2 (the half year) and Q3 (nine months). There is no Q4 post, because the fourth quarter is part of the audited yearly accounts.",
            qBn: "ডিএসইর কোম্পানিগুলো কখন প্রান্তিকের ফল প্রকাশ করে?",
            aBn: "সাধারণত প্রতিটি প্রান্তিক শেষ হওয়ার এক থেকে দুই মাসের মধ্যে: প্রথম প্রান্তিক (প্রথম তিন মাস), দ্বিতীয় প্রান্তিক (অর্ধবছর) আর তৃতীয় প্রান্তিক (নয় মাস)। চতুর্থ প্রান্তিকের আলাদা প্রতিবেদন নেই, কারণ সেটি নিরীক্ষিত বার্ষিক হিসাবের অংশ।",
          },
          {
            q: "What does EPS mean?",
            a: "Earnings per share: the company's profit divided by its number of shares. EPS of ৳5 means each share earned ৳5 of profit in that period.",
            qBn: "ইপিএস মানে কী?",
            aBn: "শেয়ারপ্রতি আয়: কোম্পানির মুনাফাকে মোট শেয়ারের সংখ্যা দিয়ে ভাগ করলে যা হয়। ইপিএস ৳5 মানে ওই সময়ে প্রতিটি শেয়ার ৳5 মুনাফা করেছে।",
          },
          {
            q: "Are quarterly results audited?",
            a: "No. Q1, Q2 and Q3 figures are un-audited; only the yearly accounts are checked by an auditor.",
            qBn: "প্রান্তিকের ফল কি নিরীক্ষিত?",
            aBn: "না। প্রথম, দ্বিতীয় ও তৃতীয় প্রান্তিকের হিসাব অনিরীক্ষিত; শুধু বার্ষিক হিসাব নিরীক্ষক যাচাই করেন।",
          },
        ]}
      />
      <HubLinks group="today" exclude={[PATH]} />
    </>
  );
}
