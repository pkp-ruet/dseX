import type { Metadata } from "next";
import Link from "next/link";
import { flattenTiers, getMarketIndex, getScores } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import StocksTable from "@/components/stocks/StocksTable";
import { T } from "@/components/i18n/T";
import PageGuide from "@/components/seo/PageGuide";
import PageHeader from "@/components/ui/PageHeader";
import { bnDate } from "@/lib/bn";

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
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const [scores, marketIndex] = await Promise.all([
    getScores(),
    getMarketIndex().catch(() => null),
  ]);

  // Drop `signal` (reason text in two languages): StocksTable never reads it and
  // every row is serialized into the page HTML.
  const items = flattenTiers(scores).map(({ signal: _signal, ...i }) => i);
  const dateLabel = marketIndex?.date ? formatDate(marketIndex.date) : null;
  const dateLabelBn = marketIndex?.date ? bnDate(marketIndex.date) : null;
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
        eyebrow={<T en="Dhaka Stock Exchange" bn="ঢাকা স্টক এক্সচেঞ্জ" />}
        title={<T en="DSE latest share prices: all shares" bn="ডিএসইর সব শেয়ারের সর্বশেষ দাম" />}
        lead={
          <T
            en={`${items.length} companies${dateLabel ? ` · official close of ${dateLabel}` : ""} · tap any column heading to sort`}
            bn={`${items.length}টি কোম্পানি${dateLabelBn ? ` · ${dateLabelBn}-এর অফিশিয়াল সমাপনী দাম` : ""} · সাজাতে যেকোনো কলামের শিরোনামে চাপ দিন`}
          />
        }
      />
      <StocksTable items={items} />

      <PageGuide
        title="About this share price list"
        titleBn="এই শেয়ারদরের তালিকা সম্পর্কে"
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
        introBn={[
          <>
            এই টেবিলে আছে <b>ঢাকা স্টক এক্সচেঞ্জে তালিকাভুক্ত প্রতিটি কোম্পানির সর্বশেষ শেয়ারদর</b>
            {sectorCount ? <>, {sectorCount}টি সেক্টর মিলিয়ে</> : null}। দেখানো দামটি শেষ লেনদেনের দিনের
            {dateLabelBn ? <> ({dateLabelBn})</> : null} ডিএসইর অফিশিয়াল সমাপনী দাম। পরের দিনের শুরুর ভিত্তি আর ±10%
            সার্কিট সীমাও ডিএসই এই দাম থেকেই ধরে। ঢাকা সময় দুপুর 2:30-এ লেনদেন শেষ হলে এটি হালনাগাদ হয়, তাই এখানে যা
            দেখছেন তা চূড়ান্ত দাম, লেনদেনের মাঝের কোনো দাম নয়।
          </>,
          <>
            দামের পাশে আছে সেই সংখ্যাগুলো, যা সাধারণত একটি একটি করে খুঁজতে হয়: দিনের ওঠানামা, সর্বশেষ বার্ষিক
            প্রতিবেদনের ইপিএস, আজকের দামে ডিভিডেন্ড ইল্ড, ডিএসইর সেক্টর, আর 100-এর মধ্যে কোম্পানির স্কোর। যেকোনো
            কলামের শিরোনামে চাপ দিয়ে সাজালে একই টেবিল উত্তর দেয় &ldquo;আজ কোন শেয়ারের দাম সবচেয়ে কমেছে&rdquo;,
            &ldquo;কোনটি সবচেয়ে বেশি ডিভিডেন্ড দেয়&rdquo; বা &ldquo;মুনাফার তুলনায় কোন ব্যাংকের দাম সবচেয়ে কম&rdquo;।
          </>,
          <>
            প্রতিটি কোম্পানির কোডে চাপ দিলে খুলবে তার নিজের পেজ, সেখানে দামের চার্ট, পাঁচটি যাচাই, ডিভিডেন্ডের ইতিহাস
            আর খবর। পুরো বাজারের জন্য দেখুন <Link href="/dse-today">আজকের ডিএসই</Link> (সূচক, সবচেয়ে বেড়েছে আর
            কমেছে যেগুলো) অথবা সহজ ভাষায় <Link href="/market-analysis">বাজার বিশ্লেষণ</Link>।
          </>,
        ]}
        faq={[
          {
            q: "When is the DSE share price on this page updated?",
            a: "Once a day, after the Dhaka Stock Exchange closes at 2:30 PM Bangladesh time. The price shown is the official closing price (CLOSEP), not the last trade, so it matches the next day's opening reference and the circuit-breaker base.",
            qBn: "এই পেজে ডিএসইর শেয়ারদর কখন হালনাগাদ হয়?",
            aBn: "দিনে একবার, বাংলাদেশ সময় দুপুর 2:30-এ ঢাকা স্টক এক্সচেঞ্জ বন্ধ হওয়ার পর। দেখানো দামটি শেষ লেনদেনের দাম নয়, অফিশিয়াল সমাপনী দাম। তাই এটি পরের দিনের শুরুর ভিত্তি আর সার্কিট সীমার ভিত্তির সঙ্গে মেলে।",
          },
          {
            q: "Why does the price here differ from my broker app?",
            a: "Broker apps show the last traded price (LTP) during the session. DSE's official close is the weighted average of the final 30 minutes of trading, which is what this page shows. The two differ for roughly one share in seven on a normal day, usually by about 1%.",
            qBn: "এখানকার দাম আমার ব্রোকার অ্যাপের দাম থেকে আলাদা কেন?",
            aBn: "ব্রোকার অ্যাপ লেনদেন চলার সময় শেষ লেনদেনের দাম দেখায়। ডিএসইর অফিশিয়াল সমাপনী দাম হলো লেনদেনের শেষ 30 মিনিটের ভারিত গড়, আর এই পেজে সেটিই দেখানো হয়। সাধারণ দিনে প্রতি সাতটি শেয়ারের প্রায় একটিতে দুটি দাম আলাদা হয়, সাধারণত প্রায় 1%।",
          },
          {
            q: "What does the score column mean?",
            a: "It is TopStockBD's fundamental score out of 100, built from five checks on the company's published accounts: earnings quality, financial health, competitive strength, valuation and dividend sustainability. It describes business strength, not whether to buy today.",
            qBn: "স্কোরের কলাম কী বোঝায়?",
            aBn: "এটি 100-এর মধ্যে TopStockBD-এর স্কোর, কোম্পানির প্রকাশিত হিসাবের পাঁচটি যাচাই থেকে তৈরি: মুনাফার মান, আর্থিক অবস্থা, প্রতিযোগিতায় শক্তি, দাম আর ডিভিডেন্ড কতটা টেকসই। এটি ব্যবসা কতটা শক্তিশালী তা বলে, আজ কেনা উচিত কি না তা নয়।",
          },
          {
            q: "Why are some listed names missing from the list?",
            a: "Mutual funds, bonds, debentures and ETFs are not companies and cannot be scored on earnings, so they are left out. A newly listed company appears once its first annual report is available.",
            qBn: "তালিকাভুক্ত কিছু নাম এই তালিকায় নেই কেন?",
            aBn: "মিউচুয়াল ফান্ড, বন্ড, ডিবেঞ্চার আর ইটিএফ কোম্পানি নয়, তাই মুনাফা দিয়ে এদের স্কোর করা যায় না। এ কারণে এগুলো বাদ রাখা হয়েছে। নতুন তালিকাভুক্ত কোম্পানি তার প্রথম বার্ষিক প্রতিবেদন পাওয়ার পর এখানে আসে।",
          },
        ]}
      />
    </>
  );
}
