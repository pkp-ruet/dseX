import type { Metadata } from "next";
import { getPopularStocks } from "@/lib/api";
import PopularStocksDeck from "@/components/popular/PopularStocksDeck";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Popular Stocks — Most Viewed This Week",
  description:
    "Top 20 most-viewed Dhaka Stock Exchange (DSE) stocks on TopStockBD over the last 7 days, with FIFA-style rank changes vs the previous week. See which Bangladesh tickers traders are watching right now.",
  keywords: [
    "DSE popular stocks",
    "popular DSE stocks",
    "most viewed DSE stocks",
    "trending stocks Bangladesh",
    "Dhaka Stock Exchange popular",
    "DSE trending tickers",
    "TopStockBD popular",
    "weekly stock interest DSE",
    "most searched DSE stocks",
  ],
  alternates: { canonical: "/dse-popular-stocks" },
  openGraph: {
    title: "DSE Popular Stocks — Most Viewed This Week",
    description:
      "Top 20 most-viewed Dhaka Stock Exchange stocks on TopStockBD with weekly rank changes.",
    url: `${BASE_URL}/dse-popular-stocks`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Popular Stocks — Most Viewed This Week",
    description:
      "Top 20 most-viewed Dhaka Stock Exchange stocks on TopStockBD with weekly rank changes.",
  },
};

export default async function PopularStocksPage() {
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const data = await getPopularStocks();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dse-popular-stocks`,
        url: `${BASE_URL}/dse-popular-stocks`,
        name: "DSE Popular Stocks — Most Viewed This Week",
        description:
          "Top 20 most-viewed DSE stocks on TopStockBD over the last 7 days with FIFA-style rank changes.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "DSE Popular Stocks", item: `${BASE_URL}/dse-popular-stocks` },
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

      <PageHeader
        eyebrow={<T en="What readers are looking at" bn="পাঠকেরা যা দেখছেন" />}
        title={<T en="DSE popular stocks" bn="ডিএসইর জনপ্রিয় শেয়ার" />}
        lead={
          <T
            en="The 20 DSE shares viewed most on TopStockBD over the last 7 days."
            bn="গত 7 দিনে TopStockBD-তে সবচেয়ে বেশি দেখা ডিএসইর 20টি শেয়ার।"
          />
        }
      />

      <PopularStocksDeck items={data.items} />
    </>
  );
}
