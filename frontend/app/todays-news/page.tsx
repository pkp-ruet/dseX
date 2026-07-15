import type { Metadata } from "next";
import { getTodaysNews } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import PersonalNewsFeed from "@/components/news/PersonalNewsFeed";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Today's News — All DSE Company News From the Last Day",
  description:
    "Every company announcement and news story from the Dhaka Stock Exchange's latest news day, in one place. Tap any story to read the full text.",
  keywords: [
    "DSE news today", "Dhaka Stock Exchange news", "DSE company announcements",
    "Bangladesh stock market news", "DSE latest news", "share market news Bangladesh",
    "DSE disclosures", "Bangladesh share news",
  ],
  alternates: { canonical: "/todays-news" },
  openGraph: {
    title: "Today's News — All DSE Company News From the Last Day",
    description:
      "Every company announcement and news story from DSE's latest news day, in one place.",
    url: `${BASE_URL}/todays-news`,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Today's DSE News",
    description: "Every company announcement from DSE's latest news day, in one place.",
  },
};

export default async function TodaysNewsPage() {
  const news = await getTodaysNews().catch(() => null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/todays-news`,
        url: `${BASE_URL}/todays-news`,
        name: "Today's News — All DSE Company News From the Last Day",
        description:
          "Every company announcement and news story from the Dhaka Stock Exchange's latest news day, in one place.",
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Today's News", item: `${BASE_URL}/todays-news` },
        ],
      },
    ],
  };

  const items = news ?? [];
  const dateLabel = items[0]?.post_date ? formatDate(items[0].post_date) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="ms-pagehead">
        <h1 className="ms-page-h1">
          <span className="ms-page-kicker">Dhaka Stock Exchange</span>
          <span className="ms-page-h1-main">Today&apos;s News</span>
        </h1>
        {dateLabel && (
          <span className="ms-page-date">
            {items.length} {items.length === 1 ? "story" : "stories"} · {dateLabel}
          </span>
        )}
      </header>

      {news === null && (
        <div className="ms-card">
          <p className="ms-empty">
            We couldn&apos;t load the news right now. Please refresh in a moment.
          </p>
        </div>
      )}

      {news !== null && items.length === 0 && (
        <div className="ms-card">
          <p className="ms-empty">No news was published on the latest trading day.</p>
        </div>
      )}

      {items.length > 0 && (
        <section className="mb-6">
          <PersonalNewsFeed items={items} />
        </section>
      )}
    </>
  );
}
