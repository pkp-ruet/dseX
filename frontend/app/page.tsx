import type { Metadata } from "next";
import {
  flattenTiers,
  getScores,
  getTrust,
  getMarketState,
  getMarketIndex,
  getHomeToday,
  type TrustStats,
} from "@/lib/api";
import { buildLandingPortfolios, type SampleView } from "@/lib/landing-portfolio";
import { guestWhen, sampleMoney, sampleShares } from "@/lib/guest-home";
import { bstDateStr } from "@/lib/market-hours";
import HomePersonalizationGate from "@/components/home/HomePersonalizationGate";
import GuestHome, { type GuestHomeData } from "@/components/home/guest/GuestHome";
import NewHere from "@/components/home/guest/NewHere";
import SignUpBand from "@/components/home/guest/SignUpBand";
import StartFromZero from "@/components/home/guest/StartFromZero";
import FeedbackSection from "@/components/feedback/FeedbackSection";

// Hourly, not daily: the page renders today's market, so day-old HTML would
// show yesterday's. Every fetch below asks for 3600s or longer so the page's
// ISR cadence doesn't tighten to 15 minutes.
export const revalidate = 3600;

export const metadata: Metadata = {
  // Root segment: the layout's "%s | TopStockBD" template only applies to child
  // segments, so this page has to carry the brand itself.
  title: "DSE Stock Analysis, Rankings & Share Price | TopStockBD",
  description:
    "Every Dhaka Stock Exchange (DSE) company checked after every trading day, in Bengali and English: grades, results, dividend dates and today's market. Add your shares and we tell you when something happens to them. No tips, no rumours.",
  keywords: [
    "DSE stock analysis", "DSE share price", "Dhaka Stock Exchange rankings",
    "Bangladesh stock market analysis", "DSE fundamental analysis",
    "শেয়ার বাজার", "শেয়ার বাজার বিশ্লেষণ", "কোন শেয়ার কিনব",
    "ভালো শেয়ার চেনার উপায়", "ডিএসই শেয়ার দাম", "বাংলাদেশ শেয়ার বাজার",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Every DSE company checked after every trading day, in Bengali and English: grades, results, dividend dates, today's market, and news on your own shares.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Stock Analysis, Rankings & Share Price — TopStockBD",
    description:
      "Every DSE company checked after every trading day, in Bengali and English. Your shares watched. No tips, no rumours.",
  },
};

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "TopStockBD",
  url: BASE_URL,
  inLanguage: ["bn", "en"],
  description:
    "Free fundamental analysis, scores, rankings, watchlists and portfolio tracking for every Dhaka Stock Exchange (DSE) company, in Bengali and English.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${BASE_URL}/stock/{search_term}`,
    },
    "query-input": "required name=search_term",
  },
};

/** Everything the guest home needs, from the requests the page fires at the
 *  top. Each one degrades to null on its own: a dead endpoint thins a block,
 *  never the page. */
async function guestData(p: {
  scores: ReturnType<typeof getScores>;
  market: ReturnType<typeof getMarketState>;
  index: ReturnType<typeof getMarketIndex>;
  today: ReturnType<typeof getHomeToday>;
}): Promise<GuestHomeData> {
  const none = () => null;
  const [scores, market, index, today] = await Promise.all([
    p.scores.catch(none),
    p.market.catch(none),
    p.index.catch(none),
    p.today.catch(none),
  ]);
  const items = scores ? flattenTiers(scores) : [];
  const byCode = new Map(items.map((s) => [s.trading_code.toUpperCase(), s]));

  // The real portfolio check's grade on the well-spread sample; any failure
  // just leaves the band's money without it.
  let sample: SampleView | null = null;
  try {
    sample = scores ? buildLandingPortfolios(scores).find((x) => x.slug === "diversified") ?? null : null;
  } catch {
    sample = null;
  }

  const todayIso = bstDateStr();
  return {
    when: guestWhen(market, todayIso),
    money: sampleMoney(byCode, sample?.grade ?? null),
    marketIndex: index,
    market,
    shares: sampleShares(byCode),
    today,
    todayIso,
  };
}

async function GuestBlock({ promise }: { promise: Promise<GuestHomeData> }) {
  return <GuestHome d={await promise} />;
}

async function SignUpSection({ promise }: { promise: Promise<TrustStats | null> }) {
  const trust = await promise;
  return <SignUpBand trust={trust} />;
}

/**
 * The homepage for a visitor who isn't signed in (2026-11-23, user: the old
 * landing "doesn't tell much about what user will get after sign in … mostly
 * a promotional page", then the blended form, mockup v2
 * https://claude.ai/artifact/2rXAyT319sXtJXWBjE6rMG). The guest lands on the
 * signed-in home's own six blocks (`GuestHome`): the public ones show today's
 * data, the personal ones a labelled example built from today's market. Then,
 * for a first-time visitor and for search, `NewHere` (the four tabs with every
 * page and what is free, Free and Premium), the sign-up band with the form on
 * the page, and three beginner guides.
 *
 * No pricing, no offer and no performance claim on this page. One language per
 * page, chosen by the navbar switch: every line carries both through `<T>`.
 *
 * `HomePersonalizationGate` swaps the whole thing for the reader's own home
 * once they are signed in; crawlers and first paint always get this markup.
 */
export default function HomePage() {
  // Every request is fired here and awaited inside the block that needs it.
  // No Suspense and no loading.tsx: this route has to return finished HTML
  // with a real status code (see the SEO rules).
  const guest = guestData({
    scores: getScores(),
    market: getMarketState(3600),
    index: getMarketIndex(),
    today: getHomeToday(3600),
  });
  const trust = getTrust().catch(() => null);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <HomePersonalizationGate>
        <GuestBlock promise={guest} />

        <div className="mt-16 sm:mt-20">
          <NewHere />
        </div>

        <div className="mt-16 sm:mt-20">
          <SignUpSection promise={trust} />
        </div>

        <div className="mt-16 sm:mt-20">
          <StartFromZero />
        </div>
      </HomePersonalizationGate>

      {/* Signed-in readers only (the component renders nothing for guests) */}
      <FeedbackSection />
    </>
  );
}
