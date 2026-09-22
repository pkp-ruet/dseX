import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { getInsightScores } from "@/lib/api";
import FindStocksClient from "@/components/stock-recommendation/FindStocksClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Stock Recommendation — Find DSE Stocks That Fit You",
  description:
    "Answer a few quick questions and get Dhaka Stock Exchange (DSE) stocks matched to your goals — holding time, risk, company size, dividends, value or growth, sector and budget. Refreshed daily.",
  keywords: [
    "best DSE stock for me",
    "stock recommendation Bangladesh",
    "which DSE stock to buy",
    "Dhaka Stock Exchange stock picker",
    "best stocks to buy in Bangladesh",
    "dividend stocks DSE",
    "stock suggestion Bangladesh",
  ],
  alternates: { canonical: "/stock-recommendation" },
  openGraph: {
    title: "Stock Recommendation — Find DSE Stocks That Fit You",
    description:
      "Answer a few quick questions and get Dhaka Stock Exchange stocks matched to your goals, refreshed daily.",
    url: "/stock-recommendation",
    type: "website",
  },
};

export const revalidate = 86400;

export default async function StockRecommendationPage() {
  const items = await getInsightScores().catch(() => []);
  const sectors = Array.from(
    new Set(items.map((i) => i.sector).filter((s): s is string => Boolean(s))),
  ).sort();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/stock-recommendation`,
        url: `${BASE_URL}/stock-recommendation`,
        name: "Stock Recommendation — Find DSE Stocks That Fit You",
        description:
          "Answer a few quick questions and get Dhaka Stock Exchange stocks matched to your goals, refreshed daily.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          {
            "@type": "ListItem",
            position: 2,
            name: "Stock Recommendation",
            item: `${BASE_URL}/stock-recommendation`,
          },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="page-narrow space-y-8">
        <PageHeader
          eyebrow="Three questions"
          title="Find stocks that fit you"
          bn="তিনটি প্রশ্নের উত্তর দিন — আপনার জন্য মানানসই শেয়ার বেছে দেব।"
          lead="Tell us your goals once and get Dhaka Stock Exchange stock picks matched to you — fresh every day, with a plain-language reason for each."
        />

        <section className="soft-card p-5 sm:p-6">
          <FindStocksClient sectors={sectors} />
        </section>

        <p className="text-center text-xs text-text-muted leading-relaxed">
          These are suggestions based on data, not financial advice. Always do your own research.{" "}
          <Link href="/dsestockranking" className="text-primary hover:underline">
            See the full rankings
          </Link>
          .
        </p>
      </div>
    </>
  );
}
