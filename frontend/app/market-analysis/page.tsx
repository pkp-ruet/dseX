import type { Metadata } from "next";
import Link from "next/link";
import { getMarketState } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

import BigPicture from "@/components/market-analysis/BigPicture";
import WhatsHappeningNow from "@/components/market-analysis/WhatsHappeningNow";
import CheaperThanBefore from "@/components/market-analysis/CheaperThanBefore";
import WhatCouldHappenNext from "@/components/market-analysis/WhatCouldHappenNext";
import WhereToLook from "@/components/market-analysis/WhereToLook";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const metadata: Metadata = {
  title: "DSE Market Analysis — Up or Down, Cheap or Expensive?",
  description:
    "A simple, plain-English look at the Dhaka Stock Exchange right now: is the market up or down, are shares cheap or expensive, which businesses are doing well, and where to look for good shares today.",
  keywords: [
    "DSE market today",
    "Dhaka Stock Exchange",
    "Bangladesh share market",
    "is the market up or down",
    "cheap shares Bangladesh",
    "best shares to buy DSE",
    "DSE dividend dates",
    "stock market in simple words",
  ],
  alternates: { canonical: "/market-analysis" },
  openGraph: {
    title: "DSE Market Analysis — Up or Down, Cheap or Expensive?",
    description:
      "The whole Dhaka Stock Exchange in plain words: today's mood, cheap or expensive shares, which businesses are doing well, and where to look for good shares.",
    url: "/market-analysis",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Market Analysis — Up or Down, Cheap or Expensive?",
    description:
      "The whole Dhaka Stock Exchange in plain words: today's mood, cheap or expensive shares, and where to look for good shares.",
  },
};

function SectionHead({ n, title, sub }: { n: number; title: string; sub: string }) {
  return (
    <div className="ms-section-head">
      <span className="ms-section-num" aria-hidden="true">{n}</span>
      <div>
        <h2 className="ms-section-title">{title}</h2>
        <p className="ms-section-sub">{sub}</p>
      </div>
    </div>
  );
}

const EMPTY_QUALITY = { total: 0, strong: 0, good: 0, soso: 0, risky: 0, median_score: null };
const EMPTY_CHANCES = { best: "", on_sale: [], income: [], rising: [], fallen: [] };

export default async function MarketAnalysisPage() {
  const data = await getMarketState().catch(() => null);
  const dateLabel = data?.date ? formatDate(data.date) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/market-analysis`,
        url: `${BASE_URL}/market-analysis`,
        name: "DSE Market Analysis — Up or Down, Cheap or Expensive?",
        description:
          "A simple, plain-English look at the Dhaka Stock Exchange right now: market mood, cheap or expensive shares, which businesses are doing well, and where to look for good shares.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Market Analysis", item: `${BASE_URL}/market-analysis` },
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

      <header className="ms-pagehead">
        <h1 className="ms-page-h1">
          <span className="ms-page-kicker">Dhaka Stock Exchange</span>
          <span className="ms-page-h1-main">Market Analysis</span>
        </h1>
        {dateLabel && <span className="ms-page-date">{dateLabel}</span>}
      </header>

      {!data ? (
        <div className="ms-card">
          <p className="ms-empty">
            We couldn&apos;t load the market right now. Please refresh in a moment, or{" "}
            <Link href="/dse-today" style={{ textDecoration: "underline" }}>
              see today&apos;s market
            </Link>
            .
          </p>
        </div>
      ) : (
        <>
          {data.mood && <BigPicture mood={data.mood} />}

          <SectionHead
            n={1}
            title="The Market Right Now"
            sub="Up or down, cheap or expensive — at a glance."
          />
          <WhatsHappeningNow
            questions={data.now?.questions ?? []}
            sectors={data.now?.sectors ?? []}
            quality={data.now?.quality ?? EMPTY_QUALITY}
          />
          <div style={{ marginTop: 16 }}>
            <CheaperThanBefore
              points={data.trend?.points ?? []}
              hasHistory={data.trend?.has_history ?? false}
            />
          </div>

          <SectionHead
            n={2}
            title="Where to Invest Today"
            sub="Four simple places to start looking for good shares."
          />
          <WhereToLook chances={data.chances ?? EMPTY_CHANCES} />

          <SectionHead
            n={3}
            title="Stocks to Watch Next"
            sub="Big moves building up, and cash payouts on the way."
          />
          <WhatCouldHappenNext
            unusual={data.next?.unusual ?? []}
            nearHigh={data.next?.near_high ?? []}
            nearLow={data.next?.near_low ?? []}
            dividends={data.next?.dividends ?? []}
          />
        </>
      )}
    </>
  );
}
