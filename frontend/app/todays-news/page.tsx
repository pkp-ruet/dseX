import type { Metadata } from "next";
import { getTodaysNews } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import PersonalNewsFeed from "@/components/news/PersonalNewsFeed";
import PageHeader from "@/components/ui/PageHeader";
import { T } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";

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
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const news = await getTodaysNews();

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

  const items = news;
  const dateLabel = items[0]?.post_date ? formatDate(items[0].post_date) : null;
  const dateLabelBn = items[0]?.post_date ? bnDate(items[0].post_date) : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHeader
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="Today's news" bn="আজকের খবর" />}
        lead={
          <T
            en="Every company announcement from the last news day, on one page. Company news is shown as DSE published it, in English."
            bn="শেষ খবরের দিনে সব কোম্পানির ঘোষণা, এক পেজে। কোম্পানির খবর ডিএসই যেভাবে প্রকাশ করেছে, সেভাবেই ইংরেজিতে দেখানো হয়।"
          />
        }
        actions={
          dateLabel ? (
            <span className="ms-page-date">
              <T
                en={`${items.length} ${items.length === 1 ? "story" : "stories"} · ${dateLabel}`}
                bn={`${items.length}টি খবর · ${dateLabelBn}`}
              />
            </span>
          ) : undefined
        }
      />

      {items.length === 0 && (
        <div className="ms-card">
          <p className="ms-empty">
            <T en="No news was published on the last trading day." bn="শেষ লেনদেনের দিনে কোনো খবর প্রকাশিত হয়নি।" />
          </p>
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
