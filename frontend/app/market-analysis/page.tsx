import type { Metadata } from "next";
import { getMarketState } from "@/lib/api";
import { formatDate } from "@/lib/formatters";

import BigPicture from "@/components/market-analysis/BigPicture";
import SinceYesterday from "@/components/market-analysis/SinceYesterday";
import BanglaSnapshot from "@/components/market-analysis/BanglaSnapshot";
import YourStocksHere from "@/components/market-analysis/YourStocksHere";
import WhatsHappeningNow from "@/components/market-analysis/WhatsHappeningNow";
import MarketHistory from "@/components/market-analysis/MarketHistory";
import WhatCouldHappenNext from "@/components/market-analysis/WhatCouldHappenNext";
import WhereToLook from "@/components/market-analysis/WhereToLook";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import ErrorState from "@/components/ui/ErrorState";
import Bn from "@/components/i18n/Bn";

export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "DSE Market Analysis — Up or Down, Cheap or Expensive?";
const OG_IMAGE = `${BASE_URL}/api/og/promo/mood`;

export const metadata: Metadata = {
  title: TITLE,
  description:
    "A simple, plain-English look at the Dhaka Stock Exchange right now: is the market up or down, are shares cheap or expensive, what changed since yesterday, which businesses are doing well, and where to look for good shares today.",
  keywords: [
    "DSE market today",
    "Dhaka Stock Exchange",
    "Bangladesh share market",
    "is the market up or down",
    "cheap shares Bangladesh",
    "best shares to buy DSE",
    "DSE dividend dates",
    "DSEX index today",
    "stock market in simple words",
    "আজকের শেয়ার বাজার",
    "ডিএসই বাজার বিশ্লেষণ",
    "শেয়ার বাজার আজ কেমন",
    "ঢাকা স্টক এক্সচেঞ্জ আজ",
  ],
  alternates: {
    canonical: "/market-analysis",
    // Reciprocal hreflang with the Bengali daily page (/share-bazar).
    languages: { en: "/market-analysis", bn: "/share-bazar", "x-default": "/market-analysis" },
  },
  openGraph: {
    title: TITLE,
    description:
      "The whole Dhaka Stock Exchange in plain words: today's mood, cheap or expensive shares, which businesses are doing well, and where to look for good shares.",
    url: "/market-analysis",
    type: "website",
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Today's DSE market mood in plain words" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description:
      "The whole Dhaka Stock Exchange in plain words: today's mood, cheap or expensive shares, and where to look for good shares.",
    images: [OG_IMAGE],
  },
};

function SectionHead({ n, title, sub, subBn }: { n: number; title: string; sub: string; subBn?: string }) {
  return (
    <div className="ms-section-head">
      <span className="ms-section-num" aria-hidden="true">{n}</span>
      <div>
        <h2 className="ms-section-title">{title}</h2>
        <p className="ms-section-sub">{sub}</p>
        {subBn && (
          <p lang="bn" className="font-bn ms-section-sub-bn">
            {subBn}
          </p>
        )}
      </div>
    </div>
  );
}

const EMPTY_QUALITY = { total: 0, strong: 0, good: 0, soso: 0, risky: 0, median_score: null };
const EMPTY_CHANCES = { best: "", on_sale: [], income: [], rising: [], fallen: [] };
const EMPTY_HISTORY = { index: [], daily: [] };

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
        name: TITLE,
        description:
          "A simple, plain-English look at the Dhaka Stock Exchange right now: market mood, what changed since yesterday, cheap or expensive shares, which businesses are doing well, and where to look for good shares.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
        primaryImageOfPage: OG_IMAGE,
        ...(data?.date ? { dateModified: data.date } : {}),
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

  const chances = data?.chances ?? EMPTY_CHANCES;
  const next = data?.next;
  const codes = (rows: { trading_code: string }[] | undefined) => (rows ?? []).map((r) => r.trading_code);

  return (
    <PersonalCodesProvider>
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
        <Bn className="page-h1-bn">বাজার এখন উপরে না নিচে, সস্তা না দামি — সহজ ভাষায়।</Bn>
      </header>

      {!data ? (
        <ErrorState
          size="inline"
          title="Couldn't load the market right now"
          bn="বাজারের তথ্য এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          reload
          links={[{ href: "/dse-today", label: "See today's market" }]}
        />
      ) : (
        <>
          {data.mood && (
            <BigPicture mood={data.mood} questions={data.now?.questions ?? []} stats={data.stats} />
          )}
          {data.since_yesterday && <SinceYesterday since={data.since_yesterday} stats={data.stats} />}
          {data.summary_bn && <BanglaSnapshot text={data.summary_bn} />}
          <YourStocksHere
            lists={{
              onSale: codes(chances.on_sale),
              income: codes(chances.income),
              rising: codes(chances.rising),
              fallen: codes(chances.fallen),
              nearHigh: codes(next?.near_high),
              nearLow: codes(next?.near_low),
              unusual: codes(next?.unusual),
              dividends: (next?.dividends ?? []).map((d) => ({ code: d.trading_code, date: d.date, kind: d.kind })),
            }}
          />

          <SectionHead
            n={1}
            title="The Market Right Now"
            sub="Which businesses are doing well, how many companies are healthy, and how we got here."
            subBn="কোন ব্যবসা ভালো করছে, কতটি কোম্পানি সুস্থ, আর বাজার কীভাবে এখানে এলো।"
          />
          <WhatsHappeningNow
            sectors={data.now?.sectors ?? []}
            quality={data.now?.quality ?? EMPTY_QUALITY}
          />
          <div style={{ marginTop: 16 }}>
            <MarketHistory history={data.history ?? EMPTY_HISTORY} />
          </div>

          <SectionHead
            n={2}
            title="Where to Invest Today"
            sub="Four simple places to start looking for good shares."
            subBn="আজ কোথায় ভালো শেয়ার খুঁজবেন।"
          />
          <WhereToLook chances={chances} />

          <SectionHead
            n={3}
            title="Stocks to Watch Next"
            sub="Big moves building up, and cash payouts on the way."
            subBn="কোন শেয়ারে সামনে কিছু হতে পারে।"
          />
          <WhatCouldHappenNext
            unusual={next?.unusual ?? []}
            nearHigh={next?.near_high ?? []}
            nearLow={next?.near_low ?? []}
            dividends={next?.dividends ?? []}
          />
        </>
      )}
    </PersonalCodesProvider>
  );
}
