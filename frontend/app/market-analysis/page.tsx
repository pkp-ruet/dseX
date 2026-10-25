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
import MarketResearchLists from "@/components/market-analysis/MarketResearchLists";
import MarketDividends from "@/components/market-analysis/MarketDividends";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import ErrorState from "@/components/ui/ErrorState";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
import Bn from "@/components/i18n/Bn";
import HubLinks from "@/components/layout/HubLinks";

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
        // Paywall markup: which companies pass each research list is Premium (PremiumGate).
        ...(data?.research
          ? {
              isAccessibleForFree: false,
              hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
            }
          : {}),
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

      <PageHeader
        eyebrow="Dhaka Stock Exchange"
        title="Market Analysis"
        bn="বাজার এখন উপরে না নিচে, সস্তা না দামি — সহজ ভাষায়।"
        actions={dateLabel ? <span className="ms-page-date">{dateLabel}</span> : undefined}
      />

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
          <YourStocksHere
            lists={{
              rising: codes(chances.rising),
              nearHigh: codes(next?.near_high),
              nearLow: codes(next?.near_low),
              unusual: codes(next?.unusual),
              dividends: (next?.dividends ?? []).map((d) => ({ code: d.trading_code, date: d.date, kind: d.kind })),
            }}
          />
          {data.summary_bn && <BanglaSnapshot text={data.summary_bn} />}

          <section className="mk-section" aria-labelledby="mk-now">
            <SectionHeader
              id="mk-now"
              size="lg"
              title="The market right now"
              bn="কোন ব্যবসা ভালো করছে, কতটি কোম্পানি ভালো অবস্থায়, আর বাজার কীভাবে এখানে এলো।"
            />
            <div className="mk-stack">
              <WhatsHappeningNow
                sectors={data.now?.sectors ?? []}
                quality={data.now?.quality ?? EMPTY_QUALITY}
              />
              <MarketHistory history={data.history ?? EMPTY_HISTORY} />
            </div>
          </section>

          {data.research && data.research.lists.length > 0 && (
            <section className="mk-section" aria-labelledby="mk-invest">
              <SectionHeader
                id="mk-invest"
                size="lg"
                title="Where to invest today"
                bn="ছয়টি ধারণা, প্রতিটি কয়েকটি সহজ যাচাই। আজকের বাজারে যেটি মানায়, সেটি আগে।"
                lead="Six ideas, each a set of plain checks. The one that fits today's market comes first."
                action={{ href: "/stock-insights#research", label: "All lists" }}
              />
              <MarketResearchLists research={data.research} />
            </section>
          )}

          <section className="mk-section" aria-labelledby="mk-next">
            <SectionHeader
              id="mk-next"
              size="lg"
              title="Stocks to watch next"
              bn="কোন শেয়ারে সামনে কিছু হতে পারে।"
              lead="Big moves building up, fast risers, and shares at a one-year edge."
            />
            <WhatCouldHappenNext
              unusual={next?.unusual ?? []}
              rising={chances.rising}
              nearHigh={next?.near_high ?? []}
              nearLow={next?.near_low ?? []}
            />
          </section>

          <section className="mk-section" aria-labelledby="mk-money">
            <SectionHeader
              id="mk-money"
              size="lg"
              title="Money coming"
              bn="সামনে যেসব কোম্পানি লভ্যাংশ দেবে।"
              action={{ href: "/dividend-calendar", label: "Dividend calendar" }}
            />
            <MarketDividends items={next?.dividends ?? []} />
          </section>

          <p className="mk-disclaimer">
            Educational information, not investment advice. Read the full stock page before you decide.
            <Bn as="span" className="block">এগুলো শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।</Bn>
          </p>
        </>
      )}

      <HubLinks group="today" exclude={["/market-analysis"]} />
    </PersonalCodesProvider>
  );
}
