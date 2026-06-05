import type { Metadata } from "next";
import Link from "next/link";
import { getInsightScores } from "@/lib/api";
import RecommendationQuiz from "@/components/stock-recommendation/RecommendationQuiz";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Stock Recommendation — Find DSE Stocks That Fit You | TopStockBD",
  description:
    "Answer a few quick questions and get 3 Dhaka Stock Exchange (DSE) stocks matched to your goals — holding time, dividends, value or growth, sector and budget.",
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
      "Answer a few quick questions and get 3 Dhaka Stock Exchange stocks matched to your goals.",
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
          "Answer a few quick questions and get 3 Dhaka Stock Exchange stocks matched to your goals.",
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
      <main className="max-w-xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
            Find stocks that fit you
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">
            Answer 6 quick questions and we&apos;ll suggest 3 Dhaka Stock Exchange stocks that match
            your goals — with a plain-language reason for each.
          </p>
        </header>

        <section className="soft-card p-5 sm:p-6">
          <RecommendationQuiz sectors={sectors} />
        </section>

        <p className="text-center text-[0.72rem] text-[var(--text-muted)] leading-relaxed">
          These are suggestions based on data, not financial advice. Always do your own research.{" "}
          <Link href="/dsestockranking" className="text-[var(--primary)] hover:underline">
            See the full rankings
          </Link>
          .
        </p>
      </main>
    </>
  );
}
