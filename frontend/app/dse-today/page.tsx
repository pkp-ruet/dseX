import type { Metadata } from "next";
import { getDseToday, getSectorSlugs } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import DseTodayHeader from "@/components/dse-today/DseTodayHeader";
import DseTodayPromo from "@/components/dse-today/DseTodayPromo";
import DseTodayTable from "@/components/dse-today/DseTodayTable";
import DseTodayNews from "@/components/dse-today/DseTodayNews";
import MarketMovers from "@/components/home/MarketMovers";
import SectorHeatmap from "@/components/market/SectorHeatmap";
import ErrorState from "@/components/ui/ErrorState";
import Bn from "@/components/i18n/Bn";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DSE Today — Share Prices, Top Gainers & Losers, Market Summary",
  description:
    "Dhaka Stock Exchange today: DSEX, DSES and DS30 index, today's top gainers and top losers, most traded shares, market breadth, sector heatmap, every share's closing price and the day's company news.",
  keywords: [
    "DSE today", "DSE top gainers today", "DSE top losers today", "DSE market summary",
    "DSEX today", "DSE share price today", "Dhaka Stock Exchange today",
    "DSEX index", "DS30", "DSES", "আজকের ডিএসই",
    "DSE market movers", "DSE sector heatmap", "DSE news",
    "Bangladesh stock market", "Dhaka stock prices", "Bangladesh share market",
  ],
  alternates: { canonical: "/dse-today" },
  openGraph: {
    title: "DSE Today — Share Prices, Top Gainers & Losers, Market Summary",
    description: "DSEX today, top gainers and losers, most traded shares, sector heatmap and news from the Dhaka Stock Exchange.",
    url: `${BASE_URL}/dse-today`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Today",
    description: "Snapshot of DSE's last trading day: indices, breadth, movers, sectors, news.",
  },
};

export default async function DseTodayPage() {
  const [data, sectorSlugs] = await Promise.all([
    getDseToday().catch(() => null),
    getSectorSlugs().catch(() => [] as string[]),
  ]);

  if (!data) {
    return (
      <>
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">Dhaka Stock Exchange</span>
            <span className="ms-page-h1-main">DSE Today</span>
          </h1>
        </header>
        <ErrorState
          size="inline"
          title="Couldn't load today's market"
          bn="আজকের বাজারের তথ্য এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          reload
          links={[{ href: "/market-analysis", label: "Market analysis" }]}
        />
      </>
    );
  }

  const dateLabel = data.header.date ? formatDate(data.header.date) : null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dse-today`,
        url: `${BASE_URL}/dse-today`,
        name: "DSE Today — Share Prices, Top Gainers & Losers, Market Summary",
        ...(data.header.date ? { dateModified: data.header.date } : {}),
        description:
          "Snapshot of the Dhaka Stock Exchange's last trading day: DSEX, DSES and DS30 indices, market breadth, top movers, sector heatmap, full sortable list, and the day's news.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home",      item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "DSE Today", item: `${BASE_URL}/dse-today` },
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
          <span className="ms-page-h1-main">DSE Today</span>
        </h1>
        {dateLabel && <span className="ms-page-date">Last trading day · {dateLabel}</span>}
              <Bn className="page-h1-bn">আজ বাজার কেমন গেল — সূচক, দাম বাড়া-কমা আর খবর এক পাতায়।</Bn>
</header>

      <DseTodayHeader header={data.header} condition={data.intelligence.market_condition} />

      <MarketMovers data={data.movers} />

      <DseTodayPromo />

      {data.intelligence.sector_strength.length > 0 && (
        <SectorHeatmap
          sectors={data.intelligence.sector_strength}
          pageSlugs={sectorSlugs}
        />
      )}

      <DseTodayTable rows={data.table} />

      <DseTodayNews items={data.news} />

      <PageGuide
        title="About DSE Today"
        intro={[
          <>
            This page is the <b>Dhaka Stock Exchange&apos;s last trading day on one screen</b>: where the DSEX,
            DSES and DS30 indices closed and by how much, how many shares rose against how many fell, the
            day&apos;s <b>top gainers, top losers and most traded shares</b>, which sectors led and lagged, the
            official closing price of every listed share, and the company announcements DSE published that
            day{dateLabel ? <> (last session: {dateLabel})</> : null}.
          </>,
          <>
            DSE trades Sunday to Thursday from 10:00 AM to 2:30 PM. Prices here are the exchange&apos;s official
            closing prices, captured after the session ends, so the page describes a finished day rather than a
            moving one. Gainers and losers are ranked by percentage change on that close; &ldquo;most traded&rdquo;
            is ranked by the taka value of shares that changed hands, which shows where the real money went
            rather than where the most pieces moved.
          </>,
          <>
            A one-day list is a starting point, not a verdict: a share that tops the gainers today can still be a
            weak business. Open any code for its fundamental score and health check, or read the{" "}
            <Link href="/market-analysis">market analysis</Link> for what the day means in plain words. Bengali
            readers can follow the same day at <Link href="/share-bazar">আজকের শেয়ার বাজার</Link>.
          </>,
        ]}
        bn="আজ কোন শেয়ারের দাম সবচেয়ে বেড়েছে বা কমেছে, সূচক কোথায় থামল — সব এক পাতায়।"
        faq={[
          {
            q: "What are DSE's trading hours?",
            a: "The Dhaka Stock Exchange trades Sunday to Thursday, 10:00 AM to 2:30 PM Bangladesh time, with a short pre-open and post-close session around it. It is closed on Friday, Saturday and government holidays.",
          },
          {
            q: "What is the DSEX index?",
            a: "DSEX is DSE's broad index, covering almost every listed company weighted by free-float market value. DS30 tracks the 30 largest, most liquid blue chips, and DSES tracks Shariah-compliant companies. A 1% move in DSEX means the average listed share, weighted by size, moved about 1%.",
          },
          {
            q: "How are today's top gainers and losers chosen?",
            a: "By percentage change between yesterday's closing price and today's official close. DSE caps a single day's move at ±10% for most shares, so a top gainer is often sitting on its upper circuit limit.",
          },
          {
            q: "Why is the price shown different from the live price in my app?",
            a: "During the session apps show the last traded price. This page shows DSE's official closing price, the weighted average of the final 30 minutes. That is the number DSE carries forward as the next day's reference price.",
          },
        ]}
      />
    </>
  );
}
