import type { Metadata } from "next";
import Link from "next/link";
import { flattenTiers, getMarketIndex, getScores } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import StocksTable from "@/components/stocks/StocksTable";
import ErrorState from "@/components/ui/ErrorState";
import PageGuide from "@/components/seo/PageGuide";
import PageHeader from "@/components/ui/PageHeader";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

// "Share price" is how Bangladesh searches ("dse share price today", "latest
// share price"), so the title, H1 and description say share, not stock.
const TITLE = "DSE Latest Share Price Today — All Dhaka Stock Exchange Shares";
const DESCRIPTION =
  "Today's share price of every Dhaka Stock Exchange (DSE) listed company in one sortable table: official closing price, day change, EPS, dividend yield, sector and fundamental score. Updated after every trading day.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE share price today", "DSE latest share price", "DSE share price list",
    "Dhaka Stock Exchange share price", "today share price Bangladesh", "BD share price",
    "DSE stocks list", "Dhaka Stock Exchange all stocks", "Bangladesh stock prices",
    "EPS dividend yield DSE", "DSE stock screener", "DSE closing price",
    "আজকের শেয়ারের দাম", "ডিএসই শেয়ার দর",
  ],
  alternates: { canonical: `${BASE_URL}/stocks` },
  openGraph: {
    title: TITLE,
    description: "Every DSE share's official closing price today, with EPS, dividend yield, sector and score. Sort any column.",
    url: `${BASE_URL}/stocks`,
    type: "website",
  },
};

export default async function StocksPage() {
  const [scores, marketIndex] = await Promise.all([
    getScores().catch(() => null),
    getMarketIndex().catch(() => null),
  ]);

  if (!scores) {
    return (
      <ErrorState
        title="Couldn't load the share price list"
        bn="শেয়ারের তালিকা এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
        reload
        links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
      />
    );
  }

  const items = flattenTiers(scores);
  const dateLabel = marketIndex?.date ? formatDate(marketIndex.date) : null;
  const sectorCount = new Set(items.map((i) => i.sector).filter(Boolean)).size;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/stocks`,
        url: `${BASE_URL}/stocks`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
        ...(marketIndex?.date ? { dateModified: marketIndex.date } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Share Prices", item: `${BASE_URL}/stocks` },
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
      <PageHeader
        eyebrow="Dhaka Stock Exchange"
        title="DSE Latest Share Price — All Stocks"
        bn="ঢাকা স্টক এক্সচেঞ্জের সব শেয়ারের আজকের দাম এক টেবিলে — দাম, আয়, ডিভিডেন্ড আর স্কোর।"
        lead={<>{items.length} companies{dateLabel ? ` · official close of ${dateLabel}` : ""} · tap any column header to sort</>}
      />
      <StocksTable items={items} />

      <PageGuide
        title="About this share price list"
        intro={[
          <>
            This table carries the <b>latest share price of every company listed on the Dhaka Stock
            Exchange</b>{sectorCount ? <> across {sectorCount} sectors</> : null}. The price shown is DSE&apos;s
            official closing price for the last trading day{dateLabel ? <> ({dateLabel})</> : null}, the same
            number DSE uses as the next day&apos;s opening reference and for the ±10% circuit limit. It is
            refreshed once the session closes at 2:30 PM Dhaka time, so what you see here is final, not a
            mid-session tick.
          </>,
          <>
            Beside the price sit the figures people usually have to look up one by one: the day&apos;s change,
            earnings per share (EPS) from the latest annual report, the dividend yield at today&apos;s price, the
            DSE sector, and the company&apos;s fundamental score out of 100. Tap any column header to sort, so the
            same table answers &ldquo;which shares fell most today&rdquo;, &ldquo;which pay the highest dividend&rdquo; or
            &ldquo;which bank trades cheapest against its earnings&rdquo;.
          </>,
          <>
            Each company code opens its own page with the price chart, five-pillar health check, dividend
            history and news. For the market as a whole, see{" "}
            <Link href="/dse-today">DSE Today</Link> (index, top gainers and losers) or the{" "}
            <Link href="/market-analysis">market analysis</Link> in plain words.
          </>,
        ]}
        bn="এই দামই ডিএসই-র অফিসিয়াল ক্লোজিং প্রাইস — প্রতিদিন বাজার বন্ধের পর আপডেট হয়।"
        faq={[
          {
            q: "When is the DSE share price on this page updated?",
            a: "Once a day, after the Dhaka Stock Exchange closes at 2:30 PM Bangladesh time. The price shown is the official closing price (CLOSEP), not the last trade, so it matches the next day's opening reference and the circuit-breaker base.",
          },
          {
            q: "Why does the price here differ from my broker app?",
            a: "Broker apps show the last traded price (LTP) during the session. DSE's official close is the weighted average of the final 30 minutes of trading, which is what this page shows. The two differ for roughly one share in seven on a normal day, usually by about 1%.",
          },
          {
            q: "What does the score column mean?",
            a: "It is TopStockBD's fundamental score out of 100, built from five checks on the company's published accounts: earnings quality, financial health, competitive strength, valuation and dividend sustainability. It describes business strength, not whether to buy today.",
          },
          {
            q: "Why are some listed names missing from the list?",
            a: "Mutual funds, bonds, debentures and ETFs are not companies and cannot be scored on earnings, so they are left out. A newly listed company appears once its first annual report is available.",
          },
        ]}
      />
    </>
  );
}
