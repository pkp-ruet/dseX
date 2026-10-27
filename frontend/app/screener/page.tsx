import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import ErrorState from "@/components/ui/ErrorState";
import { T } from "@/components/i18n/T";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { getScreenerCatalog, getScreenerStart } from "@/lib/api";
import { FREE_SCREENER_ROWS } from "@/lib/free-share";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const START = "good_cheap";
const TITLE = "Stock Screener — Find DSE Stocks Your Way";
const DESCRIPTION =
  "Screen every Dhaka Stock Exchange (DSE) company by answering six plain questions — how strong, how cheap, dividends, profit growth, safety, trading — and see which stocks match, refreshed every trading day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE stock screener",
    "stock screener Bangladesh",
    "Dhaka Stock Exchange screener",
    "find DSE stocks",
    "best DSE stocks to buy",
    "dividend stocks DSE",
    "low PE stocks Bangladesh",
    "শেয়ার স্ক্রিনার",
  ],
  alternates: { canonical: "/screener" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/screener", type: "website" },
};

export const revalidate = 900;

export default async function ScreenerPage() {
  const [catalog, start] = await Promise.all([
    getScreenerCatalog().catch(() => null),
    getScreenerStart(START).catch(() => null),
  ]);
  const free = (start?.stocks ?? []).slice(0, FREE_SCREENER_ROWS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/screener`,
        url: `${BASE_URL}/screener`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
        // Past the first few stocks a screen is Premium (screen-only lock).
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Stock Screener", item: `${BASE_URL}/screener` },
        ],
      },
      ...(free.length
        ? [{
            "@type": "ItemList",
            name: "Good and cheap DSE stocks today",
            numberOfItems: free.length,
            itemListElement: free.map((s, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: s.name ?? s.code,
              url: `${BASE_URL}/stock/${encodeURIComponent(s.code)}`,
            })),
          }]
        : []),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="page-narrow">
        <PageHeader
          eyebrow={<T en="Stock screener" bn="শেয়ার স্ক্রিনার" />}
          title={<T en="Find DSE shares your way" bn="নিজের মতো করে ডিএসইর শেয়ার খুঁজুন" />}
          lead={
            <T
              en="Answer six plain questions. The number under each answer shows how many shares you would get."
              bn="ছয়টি সহজ প্রশ্নের উত্তর দিন। প্রতিটি উত্তরের নিচের সংখ্যা দেখায়, কতগুলো শেয়ার পাবেন।"
            />
          }
        />
        {catalog ? (
          <ScreenerClient catalog={catalog} initial={start} initialTemplate={START} />
        ) : (
          <ErrorState
            title={<T en="We couldn't load the screener" bn="স্ক্রিনার এখন লোড করা যাচ্ছে না" />}
            reload
            links={[{ href: "/dsestockranking", label: <T en="Stock rankings" bn="শেয়ার র‍্যাঙ্কিং" /> }]}
          />
        )}
      </div>
    </>
  );
}
