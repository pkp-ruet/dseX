import type { Metadata } from "next";
import { getMarketState } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

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
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import SectionHeader from "@/components/ui/SectionHeader";
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
  // No catch: a throw lets ISR keep serving the last good page; a rendered
  // error state was cached as the page until the next purge.
  const data = await getMarketState();
  const dateLabel = data?.date ? <T en={formatDate(data.date)} bn={bnDate(data.date)} /> : null;

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
        // Paywall markup: which companies pass each research list is Premium (RowLock).
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
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="Market analysis" bn="বাজার বিশ্লেষণ" />}
        lead={
          <T
            en="Whether the market is rising or falling, and whether shares are cheap or expensive, in plain words."
            bn="বাজার বাড়ছে না কমছে, আর শেয়ারের দাম কম না বেশি, সহজ ভাষায়।"
          />
        }
        actions={dateLabel ? <span className="ms-page-date">{dateLabel}</span> : undefined}
      />

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
        {data.summary_bn && <BanglaSnapshot text={data.summary_bn} textEn={data.summary_en} />}

        <section className="mk-section" aria-labelledby="mk-now">
          <SectionHeader
            id="mk-now"
            size="lg"
            title={<T en="The market right now" bn="বাজার এখন কেমন" />}
            lead={
              <T
                en="Which sectors are doing well, how many companies are in good shape, and how the market got here."
                bn="কোন সেক্টর ভালো করছে, কতটি কোম্পানি ভালো অবস্থায় আছে, আর বাজার কীভাবে এখানে এসেছে।"
              />
            }
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
              title={<T en="Where to invest today" bn="আজ কোথায় বিনিয়োগ করবেন" />}
              lead={
                <T
                  en="Six ideas, each a set of plain checks. The one that fits today's market comes first."
                  bn="ছয়টি ধারণা, প্রতিটিতে কয়েকটি সহজ যাচাই। আজকের বাজারে যেটি মানায়, সেটি আগে।"
                />
              }
              action={{ href: "/stock-insights#research", label: <T en="All lists" bn="সব তালিকা" /> }}
            />
            <MarketResearchLists research={data.research} />
          </section>
        )}

        <section className="mk-section" aria-labelledby="mk-next">
          <SectionHeader
            id="mk-next"
            size="lg"
            title={<T en="Shares to watch next" bn="সামনে যেসব শেয়ারে নজর রাখবেন" />}
            lead={
              <T
                en="Unusual buying, shares rising fast, and shares near their highest or lowest price of the year."
                bn="অস্বাভাবিক কেনাকাটা, দ্রুত বাড়তে থাকা শেয়ার, আর বছরের সর্বোচ্চ বা সর্বনিম্ন দামের কাছের শেয়ার।"
              />
            }
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
            title={<T en="Dividends coming" bn="সামনের ডিভিডেন্ড" />}
            lead={
              <T
                en="Companies that will pay a dividend soon."
                bn="যেসব কোম্পানি শিগগির ডিভিডেন্ড দেবে।"
              />
            }
            action={{ href: "/dividend-calendar", label: <T en="Dividend calendar" bn="ডিভিডেন্ড ক্যালেন্ডার" /> }}
          />
          <MarketDividends items={next?.dividends ?? []} />
        </section>

        <p className="mk-disclaimer">
          <T
            en="This is educational information, not investment advice. Please read a share's full page before you decide."
            bn="এগুলো শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়। সিদ্ধান্তের আগে শেয়ারের পুরো পেজটি পড়ে নিন।"
          />
        </p>
      </>

      <HubLinks group="today" exclude={["/market-analysis"]} />
    </PersonalCodesProvider>
  );
}
