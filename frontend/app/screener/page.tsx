import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { getScreener } from "@/lib/api";
import { applyScreen, EMPTY_SPEC, unpackRows } from "@/lib/screener";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "Stock Screener — Filter Every DSE Share";
const DESCRIPTION =
  "Filter every Dhaka Stock Exchange (DSE) share by price, P/E, P/B, dividend yield, EPS, profit growth, market cap, daily trading, sector and category. Free, updated after every trading day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE stock screener",
    "stock screener Bangladesh",
    "Dhaka Stock Exchange screener",
    "low PE stocks DSE",
    "high dividend yield stocks Bangladesh",
    "DSE stocks below book value",
    "DSE market cap list",
    "শেয়ার স্ক্রিনার",
  ],
  alternates: { canonical: "/screener" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/screener", type: "website" },
};

export const revalidate = 900;

export default async function ScreenerPage() {
  // No catch: a throw lets ISR keep serving the last good page; a rendered
  // error state was cached as the page until the next purge.
  const data = await getScreener();
  const biggest = applyScreen(unpackRows(data), EMPTY_SPEC).slice(0, 20);

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
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Stock Screener", item: `${BASE_URL}/screener` },
        ],
      },
      ...(biggest.length
        ? [{
            "@type": "ItemList",
            name: "Largest DSE companies by market cap",
            numberOfItems: biggest.length,
            itemListElement: biggest.map((r, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: r.name,
              url: `${BASE_URL}/stock/${encodeURIComponent(r.code)}`,
            })),
          }]
        : []),
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        eyebrow={<T en="Stock screener" bn="শেয়ার স্ক্রিনার" />}
        title={<T en="Filter every DSE share" bn="ডিএসইর সব শেয়ার ফিল্টার করুন" />}
        lead={
          <T
            en="Use the numbers every DSE site shows: price, P/E, dividend, profit, size, sector. Pick a ready-made screen or add your own filters. Free, every row."
            bn="সব ডিএসই সাইটে যে সংখ্যা থাকে, সেগুলো দিয়েই খুঁজুন: দাম, পিই, ডিভিডেন্ড, মুনাফা, আকার, সেক্টর। একটি তৈরি স্ক্রিন বাছুন বা নিজের ফিল্টার দিন। সব সারি ফ্রি।"
          />
        }
      />
      <ScreenerClient data={data} />
    </>
  );
}
