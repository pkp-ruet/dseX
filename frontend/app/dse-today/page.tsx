import type { Metadata } from "next";
import { getDseToday, getMarketState, getTodaysNews } from "@/lib/api";
import { buildNotices } from "@/lib/market-notices";
import { dayShort } from "@/components/dividend-calendar/dates";
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import PageGuide from "@/components/seo/PageGuide";
import { PersonalCodesProvider } from "@/components/market-analysis/PersonalCodes";
import DayHeadline, { dsexHeadline } from "@/components/market-today/DayHeadline";
import IndexCard from "@/components/market-today/IndexCard";
import FourAnswers from "@/components/market-today/FourAnswers";
import SectorsCard from "@/components/market-today/SectorsCard";
import TopMovers from "@/components/market-today/TopMovers";
import CompanyNotices from "@/components/market-today/CompanyNotices";
import LookForShares from "@/components/market-today/LookForShares";

/**
 * Market today — THE market page (2026-11-05). It merged DSE today,
 * /market-analysis and /share-bazar (both 301 here) into one free page that
 * says how the market did and what the mood is, in both languages:
 *   1 the day in one look · 2 the index · 3 today in four answers ·
 *   4 sectors · 5 the shares that moved most · 6 what companies told DSE ·
 *   7 looking for shares? (the only links to finding shares) · 8 about.
 * It names no shares beyond the movers and the notices, and has no Premium.
 */
export const revalidate = 900;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const TITLE = "DSE Today: Share Market Today, DSEX, Top Gainers and Losers";
const OG_IMAGE = `${BASE_URL}/api/og/promo/mood`;
const DESCRIPTION =
  "How the Dhaka Stock Exchange did today, in plain words: the market mood, DSEX, DSES and DS30, which sectors moved, today's top gainers and losers, and what companies told DSE. In English and বাংলা.";

const KEYWORDS = [
  "DSE today", "share market today", "DSEX today", "Dhaka Stock Exchange today",
  "DSE top gainers today", "DSE top losers today", "DSE market summary", "DSE market analysis",
  "Bangladesh share market today", "DSE news today", "DSES", "DS30",
  "আজকের শেয়ার বাজার", "শেয়ার বাজার", "শেয়ার বাজার আজ কেমন", "আজকের ডিএসই", "ঢাকা স্টক এক্সচেঞ্জ আজ",
];

export async function generateMetadata(): Promise<Metadata> {
  // The description leads with the day's move ("DSEX rose 71 points to 5,413.").
  let lead = "";
  try {
    const d = await getDseToday();
    const h = dsexHeadline(d.header.dsex, d.header.dsex_change);
    if (h) lead = `${h.en}. `;
  } catch {
    lead = "";
  }
  const description = `${lead}${DESCRIPTION}`;
  return {
    title: TITLE,
    description,
    keywords: KEYWORDS,
    alternates: { canonical: "/dse-today" },
    openGraph: {
      title: TITLE,
      description,
      url: `${BASE_URL}/dse-today`,
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Today's DSE market mood in plain words" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Market today on the DSE",
      description,
      images: [OG_IMAGE],
    },
  };
}

export default async function MarketTodayPage() {
  // No catch on the two main fetches: a throw lets ISR keep serving the last
  // good page; a rendered error state was cached as the page until the next purge.
  const [today, state, news] = await Promise.all([
    getDseToday(),
    getMarketState(),
    getTodaysNews(900).catch(() => null),
  ]);

  const h = today.header;
  const day = h.date ?? state.date ?? null;
  const dayWords = day ? dayShort(day) : null;
  const notices = buildNotices(news?.length ? news : today.news);
  const head = dsexHeadline(h.dsex ?? state.stats.dsex, h.dsex_change);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${BASE_URL}/dse-today`,
        url: `${BASE_URL}/dse-today`,
        name: TITLE,
        headline: head?.en ?? TITLE,
        description: DESCRIPTION,
        inLanguage: ["en", "bn"],
        isPartOf: { "@id": BASE_URL },
        primaryImageOfPage: OG_IMAGE,
        ...(day ? { dateModified: day } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Market today", item: `${BASE_URL}/dse-today` },
        ],
      },
    ],
  };

  return (
    <PersonalCodesProvider>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader
        eyebrow={
          <T
            en={`Dhaka Stock Exchange${dayWords ? ` · ${dayWords.en}` : ""}`}
            bn={`ঢাকা স্টক এক্সচেঞ্জ${dayWords ? ` · ${dayWords.bn}` : ""}`}
          />
        }
        title={<T en="Market today" bn="আজকের শেয়ার বাজার" />}
        lead={<T en="How the DSE did today and what it means, in plain words." bn="আজ ডিএসই কেমন গেল আর তার মানে কী, সহজ ভাষায়।" />}
      />

      <div className="mk-stack">
        {state.mood && (
          <DayHeadline
            mood={state.mood}
            stats={state.stats}
            dsex={h.dsex}
            dsexChange={h.dsex_change}
            summaryEn={state.summary_en}
            summaryBn={state.summary_bn}
          />
        )}

        <IndexCard
          dsex={h.dsex ?? state.stats.dsex}
          dsexChange={h.dsex_change}
          dsexPct={h.dsex_change_pct ?? state.stats.dsex_change_pct}
          dses={h.dses}
          dsesChange={h.dses_change}
          ds30={h.ds30}
          ds30Change={h.ds30_change}
          history={state.history?.index ?? []}
          yearHigh={state.stats.year_high}
          yearLow={state.stats.year_low}
        />

        <FourAnswers
          questions={state.now?.questions ?? []}
          stats={state.stats}
          since={state.since_yesterday}
          turnoverVsYesterdayPct={h.turnover_change_pct}
        />

        <div className="mk-pair">
          <SectorsCard sectors={state.now?.sectors ?? []} since={state.since_yesterday} />
          <TopMovers movers={today.movers} />
        </div>

        <CompanyNotices digest={notices} />
      </div>

      <LookForShares />

      <PageGuide
        title="About this page"
        titleBn="এই পেজ সম্পর্কে"
        intro={[
          <>
            This page is <b>the Dhaka Stock Exchange&apos;s day in plain words</b>: whether the market rose or fell
            and how investors feel, where the DSEX, DSES and DS30 indices stand, four simple answers about the
            market, which sectors moved, the shares that rose, fell and traded most, and what companies told DSE.
          </>,
          <>
            DSE trades Sunday to Thursday from 10:00 AM to 2:30 PM. During trading the page shows the latest
            trades; after the close it moves to DSE&apos;s official closing prices. It describes the market, not
            single shares: to find or check a share, use the pages linked above.
          </>,
        ]}
        introBn={[
          <>
            এই পেজে <b>ঢাকা স্টক এক্সচেঞ্জের দিনটি সহজ ভাষায়</b>: বাজার বাড়ল না কমল আর বিনিয়োগকারীরা কেমন বোধ করছেন,
            ডিএসইএক্স, ডিএসইএস আর ডিএস30 সূচক কোথায়, বাজার নিয়ে চারটি সহজ প্রশ্নের উত্তর, কোন সেক্টর কতটা নড়েছে, কোন
            শেয়ারের দাম সবচেয়ে বেশি বেড়েছে, কমেছে বা লেনদেন হয়েছে, আর কোম্পানিগুলো ডিএসইকে কী জানিয়েছে।
          </>,
          <>
            ডিএসইতে রবিবার থেকে বৃহস্পতিবার সকাল 10টা থেকে দুপুর 2:30 পর্যন্ত লেনদেন হয়। লেনদেন চলার সময় এই পেজ সর্বশেষ
            লেনদেনের দাম দেখায়, বাজার বন্ধের পর ডিএসইর দিনের শেষ দামে চলে যায়। এখানে পুরো বাজারের কথা বলা হয়, আলাদা শেয়ারের
            নয়: শেয়ার খুঁজতে বা যাচাই করতে ওপরের পেজগুলো দেখুন।
          </>,
        ]}
        faq={[
          {
            q: "What is the DSEX index?",
            a: "DSEX is DSE's broad index, covering almost every listed company weighted by the value of shares that can be traded. DS30 tracks the 30 largest, most traded companies, and DSES tracks Shariah-based companies. A 1% move in DSEX means the average listed share, weighted by size, moved about 1%.",
            qBn: "ডিএসইএক্স সূচক কী?",
            aBn: "ডিএসইএক্স ডিএসইর প্রধান সূচক। এতে প্রায় সব তালিকাভুক্ত কোম্পানি থাকে, বাজারে লেনদেনযোগ্য শেয়ারের মূল্য অনুযায়ী ওজন দিয়ে। ডিএস30 সবচেয়ে বড় ও বেশি লেনদেন হওয়া 30টি কোম্পানির হিসাব রাখে, আর ডিএসইএস শরিয়াহভিত্তিক কোম্পানির। ডিএসইএক্স 1% বদলালে বোঝায়, আকার অনুযায়ী গড় শেয়ারের দাম প্রায় 1% বদলেছে।",
          },
          {
            q: "What are DSE's trading hours?",
            a: "The Dhaka Stock Exchange trades Sunday to Thursday, 10:00 AM to 2:30 PM Bangladesh time, with a short pre-open and post-close session around it. It is closed on Friday, Saturday and government holidays.",
            qBn: "ডিএসইতে কখন লেনদেন হয়?",
            aBn: "ঢাকা স্টক এক্সচেঞ্জে রবিবার থেকে বৃহস্পতিবার, বাংলাদেশ সময় সকাল 10টা থেকে দুপুর 2:30 পর্যন্ত লেনদেন হয়। এর আগে ও পরে অল্প সময়ের প্রি-ওপেন ও পোস্ট-ক্লোজ সেশন থাকে। শুক্রবার, শনিবার আর সরকারি ছুটির দিনে লেনদেন বন্ধ থাকে।",
          },
          {
            q: "How do you decide the market's mood?",
            a: "From four plain checks after every trading day: how many shares rose against how many fell, where DSEX sits between this year's low and high, how many shares cost less than their usual price for their profit, and how much money changed hands against a normal day. The cut-offs are listed under “How we decide” on this page.",
            qBn: "বাজারের অবস্থা কীভাবে ঠিক করা হয়?",
            aBn: "প্রতিটি লেনদেনের দিনের পর চারটি সহজ যাচাই থেকে: কতগুলো শেয়ারের দাম বেড়েছে আর কতগুলোর কমেছে, এ বছরের সর্বনিম্ন আর সর্বোচ্চের মাঝে ডিএসইএক্স কোথায়, মুনাফার তুলনায় কতগুলো শেয়ারের দাম স্বাভাবিকের চেয়ে কম, আর স্বাভাবিক দিনের তুলনায় কত টাকার লেনদেন হয়েছে। সীমাগুলো এই পেজের “আমরা কীভাবে ঠিক করি” অংশে দেওয়া আছে।",
          },
          {
            q: "How are today's top gainers and losers chosen?",
            a: "By the percentage change from yesterday's closing price to today's price. DSE caps a single day's move at ±10% for most shares, so a top gainer is often sitting on its upper limit.",
            qBn: "আজকের সবচেয়ে বেশি বাড়া ও কমা শেয়ার কীভাবে বাছাই হয়?",
            aBn: "গতকালের শেষ দাম থেকে আজকের দামের শতাংশ পরিবর্তন ধরে। বেশির ভাগ শেয়ারের দাম ডিএসই এক দিনে সর্বোচ্চ ±10% বদলাতে দেয়, তাই সবচেয়ে বেশি বাড়া শেয়ার প্রায়ই দিনের সর্বোচ্চ সীমায় থাকে।",
          },
          {
            q: "Is this investment advice?",
            a: "No. This page describes the market. Before you buy or sell a share, read that share's own page.",
            qBn: "এটা কি বিনিয়োগ পরামর্শ?",
            aBn: "না। এই পেজে শুধু বাজারের অবস্থা বলা হয়। কোনো শেয়ার কেনা বা বেচার আগে সেই শেয়ারের নিজের পেজ পড়ুন।",
          },
        ]}
      />

      <p className="mk-disclaimer">
        <T
          en="This is educational information, not investment advice."
          bn="এগুলো শিক্ষামূলক তথ্য, বিনিয়োগ পরামর্শ নয়।"
        />
      </p>
    </PersonalCodesProvider>
  );
}
