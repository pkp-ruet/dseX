import type { Metadata } from "next";
import { getMarketState, type MarketStateData } from "@/lib/api";
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
import WatchOut from "@/components/market-analysis/WatchOut";
import PageQuestions, { type PageQuestion } from "@/components/premium/PageQuestions";
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
        // The reasons on "Things to watch out for" are Premium (screen-only,
        // 2026-10-31); the page's one question card (#ma-premium) names them.
        isAccessibleForFree: false,
        hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
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

        {data.watch_out && (
          <section className="mk-section" aria-labelledby="mk-watch">
            <SectionHeader
              id="mk-watch"
              size="lg"
              title={<T en="Things to watch out for" bn="যেসব বিষয়ে সাবধান থাকবেন" />}
              lead={
                <T
                  en="Shares rising fast with no news from the company, and companies close to category Z."
                  bn="কোম্পানির কোনো খবর ছাড়াই দ্রুত বাড়তে থাকা শেয়ার, আর Z ক্যাটাগরির কাছাকাছি কোম্পানি।"
                />
              }
            />
            <WatchOut data={data.watch_out} />
          </section>
        )}

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

        <PageQuestions
          id="ma-premium"
          area="market-analysis"
          className="mk-section"
          title={{ en: "The whole market is free. Here is what it leaves open.", bn: "পুরো বাজারের তথ্য ফ্রি। তবু কিছু প্রশ্ন থেকে যায়।" }}
          lead={{
            en: "Premium answers these in place on this page: every company on the lists, and the reason behind every warning.",
            bn: "প্রিমিয়ামে এর উত্তর এই পেজেই: তালিকার সব কোম্পানি, আর প্রতিটি সতর্কতার কারণ।",
          }}
          rows={marketQuestions(data)}
          label={{ en: "The market, explained", bn: "বাজারের ব্যাখ্যা" }}
        />

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

/** The page's question card rows, from today's real counts. */
function marketQuestions(data: MarketStateData): PageQuestion[] {
  const rows: PageQuestion[] = [];
  const caution = data.watch_out?.caution ?? [];
  const zRisk = data.watch_out?.z_risk ?? [];
  if (caution.length > 0) {
    rows.push({
      key: "caution",
      fact: { en: `${caution.length} running with no news`, bn: `${caution.length}টি খবর ছাড়াই বাড়ছে` },
      tone: "fair",
      ask: { en: "Why is each one a worry?", bn: "প্রতিটি কেন চিন্তার?" },
      hint: { en: "What DSE asked, how we grade the company, and how few shares are with the public.", bn: "ডিএসই কী জানতে চেয়েছে, কোম্পানির গ্রেড, আর সাধারণ বিনিয়োগকারীদের হাতে কত কম শেয়ার।" },
    });
  }
  if (zRisk.length > 0) {
    rows.push({
      key: "zrisk",
      fact: { en: `${zRisk.length} close to Z`, bn: `${zRisk.length}টি Z-এর কাছাকাছি` },
      tone: "bad",
      ask: { en: "What puts each one at risk?", bn: "প্রতিটির ঝুঁকি কোথায়?" },
      hint: { en: "The late year, the closed factory or the losses, and what a move to Z means for a holder.", bn: "দেরি হওয়া বছর, বন্ধ কারখানা বা লোকসান, আর Z-এ গেলে শেয়ারহোল্ডারের কী হয়।" },
    });
  }
  const lists = data.research?.lists ?? [];
  const more = lists.reduce((n, l) => n + Math.max(0, l.passed - 3), 0);
  if (more > 0) {
    rows.push({
      key: "lists",
      fact: { en: `${more} more on the six lists`, bn: `ছয় তালিকায় আরও ${more}টি` },
      tone: "good",
      ask: { en: "Which companies are they, and what could go wrong with each?", bn: "কোন কোম্পানি, আর প্রতিটির কী ঝুঁকি?" },
      hint: { en: "Every company past the free top three, with its main risk.", bn: "ফ্রি শীর্ষ তিনটির পরের সব কোম্পানি, প্রধান ঝুঁকিসহ।" },
    });
  }
  return rows;
}
