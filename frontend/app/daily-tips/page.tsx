import type { Metadata } from "next";
import Link from "next/link";
import { getDailyTips } from "@/lib/api";
import DailyTipItem from "@/components/daily-tips/DailyTipItem";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "Daily Stock Tips — Fresh DSE Signals Every Day | TopStockBD",
  description:
    "A fresh set of Dhaka Stock Exchange (DSE) stock tips every day — companies that are growing, paying good dividends, or trading cheap versus peers. Each tip explains, in plain words, why the stock stands out.",
  keywords: [
    "daily stock tips Bangladesh",
    "DSE stock tips today",
    "best DSE stocks today",
    "Dhaka Stock Exchange tips",
    "stock signals Bangladesh",
    "dividend stock tips DSE",
    "which DSE stock to buy today",
  ],
  alternates: { canonical: "/daily-tips" },
  openGraph: {
    title: "Daily Stock Tips — Fresh DSE Signals Every Day",
    description:
      "A fresh set of Dhaka Stock Exchange stock tips every day, each with a plain-language reason for why it stands out.",
    url: "/daily-tips",
    type: "website",
  },
};

export const revalidate = 86400;

export default async function DailyTipsPage() {
  const data = await getDailyTips().catch(() => null);
  const tips = data?.tips ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/daily-tips`,
        url: `${BASE_URL}/daily-tips`,
        name: "Daily Stock Tips — Fresh DSE Signals Every Day",
        description:
          "A fresh set of Dhaka Stock Exchange stock tips every day, each with a plain-language reason for why it stands out.",
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
            name: "Daily Tips",
            item: `${BASE_URL}/daily-tips`,
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
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">
            Daily stock tips
          </h1>
          <p className="text-[var(--text-muted)] text-sm sm:text-base leading-relaxed">
            A fresh handful of stocks worth a look, picked from the market every day. Each one comes
            with a simple reason for why it stands out — growing profits, steady dividends, or a low
            price versus its peers.
          </p>
        </header>

        {tips.length === 0 ? (
          <p className="text-center text-sm text-[var(--text-muted)] py-12">
            No tips to show right now — please check back soon.
          </p>
        ) : (
          <div className="flex flex-col gap-3.5">
            {tips.map((tip) => (
              <DailyTipItem key={`${tip.category}-${tip.trading_code}`} tip={tip} />
            ))}
          </div>
        )}

        <p className="text-center text-[0.72rem] text-[var(--text-muted)] leading-relaxed">
          These are data-driven ideas, not financial advice. Always do your own research.{" "}
          <Link href="/dsestockranking" className="text-[var(--primary)] hover:underline">
            See the full rankings
          </Link>
          .
        </p>
      </main>
    </>
  );
}
