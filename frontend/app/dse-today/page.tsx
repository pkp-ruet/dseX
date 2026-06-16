import type { Metadata } from "next";
import { getDseToday } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import DseTodayHeader from "@/components/dse-today/DseTodayHeader";
import DseTodayPromo from "@/components/dse-today/DseTodayPromo";
import DseTodayTable from "@/components/dse-today/DseTodayTable";
import DseTodayNews from "@/components/dse-today/DseTodayNews";
import MarketMovers from "@/components/home/MarketMovers";
import SectorHeatmap from "@/components/market/SectorHeatmap";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "DSE Today — Dhaka Stock Exchange Last Trading Day",
  description:
    "Snapshot of the Dhaka Stock Exchange's last trading day: DSEX, DSES and DS30 indices, market breadth, top gainers and losers, sector heatmap, full sortable list, and the day's news.",
  keywords: [
    "DSE today", "Dhaka Stock Exchange", "DSEX index", "DS30", "DSES",
    "DSE market movers", "DSE sector heatmap", "DSE news",
    "Bangladesh stock market", "Dhaka stock prices", "Bangladesh share market",
  ],
  alternates: { canonical: "/dse-today" },
  openGraph: {
    title: "DSE Today — Dhaka Stock Exchange Last Trading Day",
    description: "Snapshot of DSE's last trading day: indices, breadth, movers, sectors, news.",
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
  const data = await getDseToday().catch(() => null);

  if (!data) {
    return (
      <>
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">Dhaka Stock Exchange</span>
            <span className="ms-page-h1-main">DSE Today</span>
          </h1>
        </header>
        <div className="ms-card">
          <p className="ms-empty">
            We couldn&apos;t reach the market data right now. Please refresh in a moment.
          </p>
        </div>
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
        name: "DSE Today — Dhaka Stock Exchange Last Trading Day",
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
      </header>

      <DseTodayHeader header={data.header} condition={data.intelligence.market_condition} />

      <MarketMovers data={data.movers} />

      <DseTodayPromo />

      {data.intelligence.sector_strength.length > 0 && (
        <SectorHeatmap sectors={data.intelligence.sector_strength} />
      )}

      <DseTodayTable rows={data.table} />

      <DseTodayNews items={data.news} />
    </>
  );
}
