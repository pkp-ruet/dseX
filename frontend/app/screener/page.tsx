import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import ScreenerClient from "@/components/screener/ScreenerClient";
import { getScreener } from "@/lib/api";
import { applyScreen, EMPTY_SPEC, unpackRows } from "@/lib/screener";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "Stock Screener — Ready Lists of DSE Shares";
const DESCRIPTION =
  "Ready lists of Dhaka Stock Exchange (DSE) shares: near the 52-week high or low, lowest P/E, highest dividend, below book value, biggest and most traded companies, and our own picks such as strong and cheap or big and steady. Narrow any list by sector or share price. See how many shares each list has for free; the shares, saved lists and alerts are Premium. Updated after every trading day.";

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
    "DSE 52 week high",
    "DSE 52 week low",
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
            en={`Pick a list, then narrow it by sector or share price if you like. We check all ${data.rows.length} DSE shares after every close.`}
            bn={`একটি তালিকা বাছুন, চাইলে সেক্টর বা শেয়ারের দাম দিয়ে আরও বাছাই করুন। প্রতিদিন বাজার বন্ধের পর আমরা ডিএসইর ${data.rows.length}টি শেয়ারই যাচাই করি।`}
          />
        }
      />
      <ScreenerClient data={data} />
    </>
  );
}
