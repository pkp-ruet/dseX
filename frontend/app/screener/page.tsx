import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { getScreener } from "@/lib/api";
import { applyScreen, EMPTY_SPEC, unpackRows } from "@/lib/screener";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "Stock Screener — Filter Every DSE Share";
const DESCRIPTION =
  "Find Dhaka Stock Exchange (DSE) shares from ready lists or your own filters: our grade and price check, dividend safety, P/E, dividend yield, record dates, profit growth, market cap, sector and category. See how many shares match for free; the shares, saved screens and alerts are Premium. Updated after every trading day.";

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
    "DSE dividend record date",
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
        // The shares that match are Premium: in the HTML, hidden for other readers.
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
        eyebrow={<T en="Stock screener · Premium" bn="স্টক স্ক্রিনার · প্রিমিয়াম" />}
        title={<T en="Find the shares that fit what you want" bn="আপনার চাওয়ার সাথে মেলে এমন শেয়ার খুঁজুন" />}
        lead={
          <T
            en={`Pick what you are looking for, or make your own screen. Anyone can see how many of the ${data.rows.length} DSE shares fit; which ones they are is Premium.`}
            bn={`কী খুঁজছেন বাছুন, বা নিজের স্ক্রিন বানান। ডিএসইর ${data.rows.length}টি শেয়ারের কতগুলো মেলে তা সবাই দেখতে পারেন; কোনগুলো, তা প্রিমিয়ামে।`}
          />
        }
      />
      <ScreenerClient data={data} />
    </>
  );
}
