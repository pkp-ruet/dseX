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
import { T } from "@/components/i18n/T";
import PageHeader from "@/components/ui/PageHeader";
import HubLinks from "@/components/layout/HubLinks";
import PageGuide from "@/components/seo/PageGuide";
import Link from "next/link";
import { bnDate } from "@/lib/bn";

const LEAD = (
  <T
    en="How the market closed on the last trading day: the index, the shares that rose and fell, and the day's news, on one page."
    bn="শেষ লেনদেনের দিনে বাজার কেমন গেল: সূচক, কোন শেয়ারের দাম বাড়ল বা কমল, আর দিনের খবর, এক পেজে।"
  />
);

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
        <PageHeader
          eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
          title={<T en="DSE today" bn="আজকের ডিএসই" />}
          lead={LEAD}
        />
        <ErrorState
          size="inline"
          title={<T en="We couldn't load today's market" bn="আজকের বাজারের তথ্য এখন লোড করা যাচ্ছে না" />}
          reload
          links={[{ href: "/market-analysis", label: <T en="Market analysis" bn="বাজার বিশ্লেষণ" /> }]}
        />
      </>
    );
  }

  const dateLabel = data.header.date ? formatDate(data.header.date) : null;
  const dateLabelBn = data.header.date ? bnDate(data.header.date) : null;

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

      <PageHeader
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="DSE today" bn="আজকের ডিএসই" />}
        lead={LEAD}
        actions={
          dateLabel ? (
            <span className="ms-page-date">
              <T en={`Last trading day · ${dateLabel}`} bn={`শেষ লেনদেনের দিন · ${dateLabelBn}`} />
            </span>
          ) : undefined
        }
      />

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

      <HubLinks group="today" exclude={["/dse-today"]} />

      <PageGuide
        title="About DSE today"
        titleBn="আজকের ডিএসই সম্পর্কে"
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
            A one-day list is a starting point, not a verdict. A share that tops the gainers today can still be a
            weak business. Open any code for its fundamental score and health check, or read the{" "}
            <Link href="/market-analysis">market analysis</Link> for what the day means in plain words. Bengali
            readers can follow the same day at <Link href="/share-bazar">আজকের শেয়ার বাজার</Link>.
          </>,
        ]}
        introBn={[
          <>
            এই পেজে <b>ঢাকা স্টক এক্সচেঞ্জের শেষ লেনদেনের দিন এক নজরে</b> দেখা যায়: ডিএসইএক্স, ডিএসইএস আর
            ডিএস30 সূচক কোথায় এবং কতটা বদলে শেষ হলো, কতগুলো শেয়ারের দাম বাড়ল আর কতগুলোর কমল, দিনের{" "}
            <b>সবচেয়ে বেশি বাড়া, সবচেয়ে বেশি কমা আর সবচেয়ে বেশি লেনদেন হওয়া শেয়ার</b>, কোন সেক্টর এগিয়ে আর কোনটি
            পিছিয়ে, প্রতিটি তালিকাভুক্ত শেয়ারের অফিসিয়াল সমাপনী দাম, আর সেদিন ডিএসই যে কোম্পানির ঘোষণা প্রকাশ
            করেছে{dateLabelBn ? <> (শেষ লেনদেনের দিন: {dateLabelBn})</> : null}।
          </>,
          <>
            ডিএসইতে রবিবার থেকে বৃহস্পতিবার সকাল 10টা থেকে দুপুর 2:30 পর্যন্ত লেনদেন হয়। এখানের দামগুলো
            এক্সচেঞ্জের অফিসিয়াল সমাপনী দাম, যা লেনদেন শেষ হওয়ার পর নেওয়া হয়। তাই এই পেজ একটি শেষ হওয়া দিনের
            ছবি দেখায়, চলমান দিনের নয়। দাম বাড়া ও কমার তালিকা সমাপনী দামের শতাংশ পরিবর্তন ধরে সাজানো। &ldquo;সবচেয়ে
            বেশি লেনদেন&rdquo; সাজানো হয় কত টাকার শেয়ার হাতবদল হয়েছে তা ধরে, যাতে বোঝা যায় আসল টাকা কোথায় গেছে।
          </>,
          <>
            এক দিনের তালিকা শুরু করার জায়গা, চূড়ান্ত মত নয়। আজ সবচেয়ে বেশি বাড়া শেয়ারও দুর্বল ব্যবসা হতে পারে।
            যেকোনো কোডে চাপ দিলে তার স্কোর আর আর্থিক অবস্থার যাচাই দেখবেন। দিনটির মানে সহজ ভাষায় জানতে{" "}
            <Link href="/market-analysis">বাজার বিশ্লেষণ</Link> পড়ুন, অথবা পুরো দিনের বিবরণ বাংলায় পড়ুন{" "}
            <Link href="/share-bazar">আজকের শেয়ার বাজার</Link> পেজে।
          </>,
        ]}
        faq={[
          {
            q: "What are DSE's trading hours?",
            a: "The Dhaka Stock Exchange trades Sunday to Thursday, 10:00 AM to 2:30 PM Bangladesh time, with a short pre-open and post-close session around it. It is closed on Friday, Saturday and government holidays.",
            qBn: "ডিএসইতে কখন লেনদেন হয়?",
            aBn: "ঢাকা স্টক এক্সচেঞ্জে রবিবার থেকে বৃহস্পতিবার, বাংলাদেশ সময় সকাল 10টা থেকে দুপুর 2:30 পর্যন্ত লেনদেন হয়। এর আগে ও পরে অল্প সময়ের প্রি-ওপেন ও পোস্ট-ক্লোজ সেশন থাকে। শুক্রবার, শনিবার আর সরকারি ছুটির দিনে লেনদেন বন্ধ থাকে।",
          },
          {
            q: "What is the DSEX index?",
            a: "DSEX is DSE's broad index, covering almost every listed company weighted by free-float market value. DS30 tracks the 30 largest, most liquid blue chips, and DSES tracks Shariah-compliant companies. A 1% move in DSEX means the average listed share, weighted by size, moved about 1%.",
            qBn: "ডিএসইএক্স সূচক কী?",
            aBn: "ডিএসইএক্স ডিএসইর প্রধান সূচক। এতে প্রায় সব তালিকাভুক্ত কোম্পানি থাকে, বাজারে লেনদেনযোগ্য শেয়ারের মূল্য অনুযায়ী ওজন দিয়ে। ডিএস30 সবচেয়ে বড় ও বেশি লেনদেন হওয়া 30টি কোম্পানির হিসাব রাখে, আর ডিএসইএস শরিয়াহসম্মত কোম্পানির। ডিএসইএক্স 1% বদলালে বোঝায়, আকার অনুযায়ী গড় শেয়ারের দাম প্রায় 1% বদলেছে।",
          },
          {
            q: "How are today's top gainers and losers chosen?",
            a: "By percentage change between yesterday's closing price and today's official close. DSE caps a single day's move at ±10% for most shares, so a top gainer is often sitting on its upper circuit limit.",
            qBn: "আজকের সবচেয়ে বেশি বাড়া ও কমা শেয়ার কীভাবে বাছাই হয়?",
            aBn: "গতকালের সমাপনী দাম থেকে আজকের অফিসিয়াল সমাপনী দামের শতাংশ পরিবর্তন ধরে। বেশির ভাগ শেয়ারের দাম ডিএসই এক দিনে সর্বোচ্চ ±10% বদলাতে দেয়, তাই সবচেয়ে বেশি বাড়া শেয়ার প্রায়ই দিনের সর্বোচ্চ সীমায় থাকে।",
          },
          {
            q: "Why is the price shown different from the live price in my app?",
            a: "During the session apps show the last traded price. This page shows DSE's official closing price, the weighted average of the final 30 minutes. That is the number DSE carries forward as the next day's reference price.",
            qBn: "আমার অ্যাপের লাইভ দামের সঙ্গে এখানের দাম আলাদা কেন?",
            aBn: "লেনদেন চলার সময় অ্যাপগুলো শেষ লেনদেনের দাম দেখায়। এই পেজ দেখায় ডিএসইর অফিসিয়াল সমাপনী দাম, যা শেষ 30 মিনিটের লেনদেনের ভারযুক্ত গড়। ডিএসই পরের দিনের ভিত্তি দাম হিসেবে এই সংখ্যাটিই ধরে।",
          },
        ]}
      />
    </>
  );
}
