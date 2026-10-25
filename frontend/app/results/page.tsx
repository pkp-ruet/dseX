import type { Metadata } from "next";
import Link from "next/link";
import { getLatestResults } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import ResultsFeed from "@/components/results/ResultsFeed";
import PageGuide from "@/components/seo/PageGuide";
import HubLinks from "@/components/layout/HubLinks";
import { FREE_RESULTS_ROWS } from "@/lib/free-share";

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
        <PageHeader title="Latest quarterly results" bn="সব কোম্পানির সর্বশেষ ত্রৈমাসিক ফল" />
        <ErrorState
          title="Couldn't load the latest results"
          bn="সর্বশেষ ফল এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          links={[{ href: "/dse-today", label: "DSE Today" }]}
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
        eyebrow="Dhaka Stock Exchange"
        title="Latest quarterly results"
        bn="সব কোম্পানির সর্বশেষ ত্রৈমাসিক ফল — গত বছরের একই সময়ের সঙ্গে তুলনা করে।"
        lead={`${rows.length} companies' latest reports, newest first. ${good} earned clearly more than a year earlier, ${bad} clearly less. The newest ${FREE_RESULTS_ROWS} are free; every company's is in Premium.`}
        actions={data.as_of ? <span className="ms-page-date">Latest report {formatDate(data.as_of)}</span> : undefined}
      />

      <ResultsFeed rows={rows} counts={data.counts} />

      <PageGuide
        title="About these results"
        intro={[
          <>
            Every company on the Dhaka Stock Exchange posts its <b>un-audited quarterly results</b> on DSE in one
            fixed form: earnings per share (EPS) for the quarter and for the year so far, each against the same
            months a year earlier. This page reads every company&apos;s latest post and puts it in one line —
            better, weaker or about the same — newest first.
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
        bn="ত্রৈমাসিক ফল নিরীক্ষিত নয় — একটি প্রান্তিক দিয়ে কোম্পানি বিচার করবেন না।"
        faq={[
          {
            q: "When do DSE companies post quarterly results?",
            a: "Usually within one to two months of each quarter's end: Q1 (the first three months), Q2 (the half year) and Q3 (nine months). There is no Q4 post — the fourth quarter is part of the audited yearly accounts.",
          },
          {
            q: "What does EPS mean?",
            a: "Earnings per share: the company's profit divided by its number of shares. EPS of ৳5 means each share earned ৳5 of profit in that period.",
          },
          {
            q: "Are quarterly results audited?",
            a: "No. Q1, Q2 and Q3 figures are un-audited; only the yearly accounts are checked by an auditor.",
          },
        ]}
      />
      <HubLinks group="today" exclude={[PATH]} />
    </>
  );
}
