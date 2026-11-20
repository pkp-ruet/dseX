import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import PlaceDoors, { type DoorFigure } from "@/components/places/PlaceDoors";
import PlaceSearch from "@/components/places/PlaceSearch";
import Link from "@/components/ui/Link";
import { T } from "@/components/i18n/T";
import { IconChat } from "@/components/ui/icons";
import { flattenTiers, getBuyList, getScores } from "@/lib/api";
import { REPORTS } from "@/lib/research-reports";
import { placeByKey } from "@/lib/places";

/**
 * Find (2026-11-20, the app map): the place page the bottom bar's Find tab
 * opens. Search first, then the five pages, ordered from "tell me" (the Buy
 * List) to "let me look myself" (Research), each with today's number, then
 * TopStock AI. Figures are secondary: a slow backend only drops a number.
 */
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "Find DSE Shares: Buy List, Ranking, Screener and Research";
const DESCRIPTION =
  "Ways to find shares on the Dhaka Stock Exchange: the few we would buy today, every company ranked by strength, a screener for what you want, side-by-side comparison and research on the whole market.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "best DSE shares",
    "DSE stock screener",
    "DSE company ranking",
    "which share to buy in Bangladesh",
    "compare DSE stocks",
    "DSE research",
  ],
  alternates: { canonical: `${BASE_URL}/find` },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: `${BASE_URL}/find`, type: "website" },
};

const jsonLd = [
  { "@context": "https://schema.org", "@type": "WebPage", name: TITLE, description: DESCRIPTION, url: `${BASE_URL}/find` },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Find", item: `${BASE_URL}/find` },
    ],
  },
];

export default async function FindPlacePage() {
  const [buyList, scores] = await Promise.all([
    getBuyList().catch(() => null),
    getScores().catch(() => null),
  ]);
  const place = placeByKey("find");
  const graded = scores ? flattenTiers(scores).filter((r) => r.score != null).length : 0;

  const figures: Record<string, DoorFigure | null> = {
    buylist: buyList ? { value: buyList.count, unit: { en: "shares today", bn: "আজকের শেয়ার" } } : null,
    companies: graded ? { value: graded, unit: { en: "ranked", bn: "র‍্যাঙ্ক করা" } } : null,
    screener: { value: 6, unit: { en: "ready lists", bn: "তৈরি তালিকা" } },
    research: { value: REPORTS.length, unit: { en: "reports", bn: "রিপোর্ট" } },
  };

  return (
    <div className="page-narrow pl-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        title={<T en={place.name.en} bn={place.name.bn} />}
        lead={
          <T
            en="Start with the shares we would buy, or look for yourself."
            bn="আমরা যা কিনতাম সেখান থেকে শুরু করুন, অথবা নিজেই খুঁজে দেখুন।"
          />
        }
      />
      <PlaceSearch />
      <PlaceDoors place={place} figures={figures} />
      <p className="pl-note">
        <IconChat size={16} />
        <T en="Have a question in your own words?" bn="নিজের ভাষায় প্রশ্ন আছে?" />
        <Link href="/assistant" className="text-primary font-semibold">
          <T en="Ask TopStock AI" bn="TopStock AI-কে জিজ্ঞেস করুন" />
        </Link>
      </p>
    </div>
  );
}
