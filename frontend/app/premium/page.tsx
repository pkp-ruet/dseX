import type { Metadata } from "next";
import PremiumBody from "@/components/premium/PremiumBody";
import { FAQS } from "@/lib/premium-copy";
import { LOWEST_PRICE } from "@/lib/premium-plans";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Premium — The Full Analysis on Every DSE Stock",
  description: `TopStockBD Premium: the reasons behind every DSE stock score, a daily watcher and action list for your portfolio, six research lists in full, the full dividend calendar, and no limits on watchlist, price alerts or TopStock AI. From ৳${LOWEST_PRICE}, paid by bKash, Nagad or bank transfer. No auto-renewal, 7-day refund.`,
  keywords: [
    "TopStockBD Premium",
    "DSE stock analysis",
    "Bangladesh stock market analysis",
    "DSE portfolio analysis",
    "DSE price alert",
    "শেয়ার বাজার বিশ্লেষণ",
  ],
  alternates: { canonical: "/premium" },
  openGraph: {
    title: "TopStockBD Premium — see the reasons behind every number",
    description: `The full analysis behind every DSE stock and your portfolio. From ৳${LOWEST_PRICE} by bKash, Nagad or bank transfer.`,
    url: `${BASE_URL}/premium`,
    type: "website",
  },
};

export default function PremiumPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/premium`,
        url: `${BASE_URL}/premium`,
        name: "TopStockBD Premium",
        description: metadata.description,
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Premium", item: `${BASE_URL}/premium` },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q.en,
          acceptedAnswer: { "@type": "Answer", text: f.a.en },
        })),
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PremiumBody />
    </>
  );
}
