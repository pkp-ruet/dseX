import type { Metadata } from "next";
import { flattenTiers, getScores } from "@/lib/api";
import StocksTable from "@/components/stocks/StocksTable";
import ErrorState from "@/components/ui/ErrorState";
import Bn from "@/components/i18n/Bn";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "All DSE Stocks — Price, EPS, Dividend Yield & Score",
  description:
    "Browse all Dhaka Stock Exchange (DSE) listed stocks with last price, EPS growth, dividend yield, sector, and fundamental score. Sort and filter by any column.",
  keywords: [
    "DSE stocks list", "Dhaka Stock Exchange all stocks", "Bangladesh stock prices",
    "EPS dividend yield DSE", "DSE stock screener", "Bangladesh equity list",
  ],
  alternates: { canonical: `${BASE_URL}/stocks` },
  openGraph: {
    title: "All DSE Stocks — Price, EPS, Dividend Yield & Score",
    description: "Browse all DSE listed stocks with price, EPS, dividend yield, sector, and fundamental score.",
    url: `${BASE_URL}/stocks`,
    type: "website",
  },
};

export default async function StocksPage() {
  const scores = await getScores().catch(() => null);

  if (!scores) {
    return (
      <ErrorState
        title="Couldn't load the stock list"
        bn="শেয়ারের তালিকা এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
        reload
        links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
      />
    );
  }

  const items = flattenTiers(scores);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/stocks`,
        url: `${BASE_URL}/stocks`,
        name: "All DSE Stocks — Price, EPS, Dividend Yield & Score",
        description:
          "Browse all DSE listed stocks with price, EPS growth, dividend yield, sector, and fundamental score.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "All Stocks", item: `${BASE_URL}/stocks` },
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
      <div className="sl-page-header">
        <h1 className="sl-page-title">All DSE Stocks</h1>
        <p className="sl-page-sub">
          {items.length} companies · Click any column header to sort
        </p>
        <Bn className="page-h1-bn">ঢাকা স্টক এক্সচেঞ্জের সব শেয়ার এক টেবিলে — দাম, আয়, ডিভিডেন্ড আর স্কোর।</Bn>
      </div>
      <StocksTable items={items} />
    </>
  );
}
