import type { Metadata } from "next";
import PageHeader from "@/components/ui/PageHeader";
import PlaceDoors, { type DoorFigure } from "@/components/places/PlaceDoors";
import { T } from "@/components/i18n/T";
import {
  getDividendCalendar,
  getLatestResults,
  getMarketIndex,
  getMarketState,
  getUpcomingResults,
} from "@/lib/api";
import { recountCalendar } from "@/lib/dividend-dates";
import { changePct } from "@/lib/formatters";
import { placeByKey } from "@/lib/places";

/**
 * Market (2026-11-20, the app map): the place page the bottom bar's Market
 * tab opens. One screen: today's mood in one line, then the four pages of
 * the place, each with today's number. Every figure is secondary
 * (`.catch(() => null)`): the doors are the page, so a slow backend only
 * drops a number.
 */
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "DSE Market: Today, Results, Dividend Dates and Sectors";
const DESCRIPTION =
  "Everything about the Dhaka Stock Exchange market in one place: how the market did today, every company's latest results, dividend and results dates coming up, and how each sector is doing.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE market today",
    "Dhaka Stock Exchange today",
    "DSEX index",
    "DSE results",
    "DSE dividend calendar",
    "DSE sectors",
    "Bangladesh share market",
  ],
  alternates: { canonical: `${BASE_URL}/market` },
  openGraph: { title: `${TITLE} | TopStockBD`, description: DESCRIPTION, url: `${BASE_URL}/market`, type: "website" },
};

const jsonLd = [
  { "@context": "https://schema.org", "@type": "WebPage", name: TITLE, description: DESCRIPTION, url: `${BASE_URL}/market` },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Market", item: `${BASE_URL}/market` },
    ],
  },
];

export default async function MarketPlacePage() {
  const [state, index, results, calendar, meetings] = await Promise.all([
    getMarketState().catch(() => null),
    getMarketIndex().catch(() => null),
    getLatestResults().catch(() => null),
    getDividendCalendar().catch(() => null),
    getUpcomingResults().catch(() => null),
  ]);
  const place = placeByKey("market");

  const figures: Record<string, DoorFigure | null> = {};
  if (index?.dsex_change_pct != null) {
    figures.today = {
      value: changePct(index.dsex_change_pct, 1),
      unit: { en: "DSEX", bn: "ডিএসইএক্স" },
      tone: index.dsex_change_pct > 0 ? "up" : index.dsex_change_pct < 0 ? "down" : undefined,
    };
  }
  if (results?.results.length) {
    const newest = results.results.reduce((m, r) => (r.post_date > m ? r.post_date : m), "");
    const n = results.results.filter((r) => r.post_date === newest).length;
    figures.results = { value: n, unit: { en: "on the latest day", bn: "সর্বশেষ দিনে" } };
  }
  const week =
    (calendar ? recountCalendar(calendar).stats.record_dates_this_week : 0) +
    (meetings?.meetings.filter((m) => m.days <= 7).length ?? 0);
  if (calendar || meetings) {
    figures.calendar = { value: week, unit: { en: "dates this week", bn: "এ সপ্তাহের তারিখ" } };
  }
  const sectors = (state?.now.sectors ?? []).filter((s) => s.ret_1d != null);
  if (sectors.length) {
    const best = sectors.reduce((a, b) => ((b.ret_1d ?? -99) > (a.ret_1d ?? -99) ? b : a));
    figures.sectors = {
      value: changePct(best.ret_1d, 1),
      unit: { en: `${best.name} led`, bn: `${best.name} এগিয়ে` },
      tone: (best.ret_1d ?? 0) > 0 ? "up" : (best.ret_1d ?? 0) < 0 ? "down" : undefined,
    };
  }

  const mood = state?.mood;

  return (
    <div className="page-narrow pl-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        title={<T en={place.name.en} bn={place.name.bn} />}
        lead={<T en="What happened on the DSE, in four pages." bn="ডিএসইতে কী হলো, চারটি পেজে।" />}
      />
      {mood && (
        <p className="pl-line">
          <T
            en={<><strong>Market mood: {mood.label.toLowerCase()}.</strong> {mood.sentence}</>}
            bn={<><strong>বাজারের মেজাজ: {mood.label_bn ?? mood.label}।</strong> {mood.sentence_bn ?? mood.sentence}</>}
          />
        </p>
      )}
      <PlaceDoors place={place} figures={figures} />
    </div>
  );
}
