import type { Metadata } from "next";
import Link from "next/link";
import { getTop20 } from "@/lib/api";
import { formatDate } from "@/lib/formatters";
import Top20Deck from "@/components/top20/Top20Deck";
import PageHeader from "@/components/ui/PageHeader";
import { T, TBlock } from "@/components/i18n/T";
import { bnDate } from "@/lib/bn";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";
const PAGE_URL = `${BASE_URL}/dse-trending-stocks`;

export const metadata: Metadata = {
  title: "DSE Trending Stocks — This Week's Top Movers",
  description:
    "The 20 strongest-performing Dhaka Stock Exchange stocks over the last 7 trading days. Updated daily and ranked by price momentum, relative strength vs DSEX, volume conviction, and trend quality.",
  keywords: [
    "DSE trending stocks",
    "trending stocks Bangladesh",
    "trending shares DSE",
    "DSE top movers this week",
    "best performing DSE stocks",
    "DSE momentum stocks",
    "Dhaka Stock Exchange trending stocks",
    "DSE weekly movers",
    "hot stocks DSE",
    "top 20 DSE stocks",
    "DSE stock movers",
    "best stocks to buy DSE",
  ],
  alternates: { canonical: "/dse-trending-stocks" },
  openGraph: {
    title: "DSE Trending Stocks — This Week's Top Movers",
    description:
      "The 20 strongest Dhaka Stock Exchange stocks, ranked daily by 7-day momentum, relative strength vs DSEX, and volume conviction. Updated after every market close.",
    url: PAGE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DSE Trending Stocks — Top Movers This Week",
    description:
      "The 20 strongest DSE stocks ranked by 7-day market data. Updated daily.",
  },
};

// Each FAQ in both languages; the FAQPage JSON-LD reads the English pair.
const FAQS: { q: string; a: string; qBn: string; aBn: string }[] = [
  {
    q: "What are DSE trending stocks?",
    a: "Trending Stocks is a daily list of 20 Dhaka Stock Exchange shares chosen only from the last 7 trading days of market data: price moves, strength against the DSEX index, and turnover. It is not a check of the business, and it does not use earnings, dividends or balance-sheet figures.",
    qBn: "ডিএসইর ট্রেন্ডিং শেয়ার কী?",
    aBn: "ট্রেন্ডিং শেয়ার হলো ঢাকা স্টক এক্সচেঞ্জের 20টি শেয়ারের একটি দৈনিক তালিকা, যা শুধু গত 7 লেনদেনের দিনের বাজারের তথ্য থেকে বাছাই করা: দামের ওঠানামা, ডিএসইএক্স সূচকের তুলনায় শক্তি, আর লেনদেনের পরিমাণ। এটি ব্যবসার যাচাই নয়; এতে মুনাফা, ডিভিডেন্ড বা ব্যালান্স শিটের কোনো সংখ্যা ব্যবহার হয় না।",
  },
  {
    q: "How is the trending stocks list calculated?",
    a: "Every share with price data on at least 5 of the last 7 trading days and an average daily turnover of ৳1 million or more is scored on five factors: 7-day price return (35%), strength against DSEX (25%), volume conviction, measured as 7-day against 30-day turnover (20%), trend quality, based on the share of up days with a penalty for choppy moves (15%), and a small bonus for sitting at a healthy point in the yearly range (5%). Each factor is standardised across all eligible shares and then combined. The 20 highest combined scores make the list.",
    qBn: "ট্রেন্ডিং তালিকা কীভাবে হিসাব করা হয়?",
    aBn: "গত 7 লেনদেনের দিনের অন্তত 5 দিনের দামের তথ্য আছে এবং গড় দৈনিক লেনদেন ৳10 লাখ বা তার বেশি, এমন প্রতিটি শেয়ারকে পাঁচটি বিষয়ে নম্বর দেওয়া হয়: 7 দিনের দামের পরিবর্তন (35%), ডিএসইএক্সের তুলনায় শক্তি (25%), 30 দিনের তুলনায় 7 দিনের লেনদেন কতটা বেড়েছে (20%), কত দিন দাম বেড়েছে আর ওঠানামা কতটা এলোমেলো (15%), আর বছরের দামের সীমার ভালো জায়গায় থাকার জন্য সামান্য বাড়তি নম্বর (5%)। প্রতিটি বিষয় সব যোগ্য শেয়ারের মধ্যে সমান মাপে এনে যোগ করা হয়। সবচেয়ে বেশি মোট নম্বরের 20টি শেয়ার তালিকায় আসে।",
  },
  {
    q: "How often is the trending stocks list updated?",
    a: "The list is recomputed every day after the DSE close, once the daily price data is in. The page then refreshes, so the newest list appears after each market close.",
    qBn: "ট্রেন্ডিং তালিকা কত ঘন ঘন হালনাগাদ হয়?",
    aBn: "প্রতিদিন ডিএসইর লেনদেন শেষে দিনের দামের তথ্য আসার পর তালিকাটি নতুন করে হিসাব করা হয়। এরপর পেজটি হালনাগাদ হয়, তাই প্রতিটি লেনদেনের দিন শেষে নতুন তালিকা দেখা যায়।",
  },
  {
    q: "Does the trending stocks list use fundamental analysis or a company score?",
    a: "No. This page is deliberately separate from our Stock Rankings on /dsestockranking, which check the business. Trending Stocks looks only at recent market behaviour (momentum, breadth and trading) to show what the market is rewarding right now.",
    qBn: "ট্রেন্ডিং তালিকায় কি কোম্পানির ব্যবসা বা স্কোর দেখা হয়?",
    aBn: "না। এই পেজ ইচ্ছে করেই /dsestockranking-এর র‍্যাঙ্কিং থেকে আলাদা, যেখানে ব্যবসা যাচাই করা হয়। ট্রেন্ডিং তালিকা শুধু সাম্প্রতিক বাজারের আচরণ দেখে, যেমন দামের গতি আর লেনদেন, যাতে বোঝা যায় বাজার এখন কোন শেয়ারকে এগিয়ে রাখছে।",
  },
  {
    q: "What is the difference between Trending Stocks and Popular Stocks?",
    a: "Popular Stocks ranks shares by how many times visitors to this site viewed them, which shows what readers are interested in. Trending Stocks ranks by what the market actually did over the last 7 trading days. The two often disagree, and that is useful in itself.",
    qBn: "ট্রেন্ডিং শেয়ার আর জনপ্রিয় শেয়ারের পার্থক্য কী?",
    aBn: "জনপ্রিয় শেয়ারের তালিকা সাজানো হয় এই সাইটের পাঠকেরা কোন শেয়ার কতবার দেখেছেন তা ধরে, যা পাঠকের আগ্রহ দেখায়। ট্রেন্ডিং তালিকা সাজানো হয় গত 7 লেনদেনের দিনে বাজারে আসলে কী হয়েছে তা ধরে। দুটি প্রায়ই মেলে না, আর সেটিও একটি দরকারি তথ্য।",
  },
  {
    q: "Can I use the trending stocks list as a buy list?",
    a: "No. Trending Stocks is a starting point for research, not a buy list. Momentum can reverse quickly on the DSE, especially around dividend record dates and category changes. Please check the business, your own appetite for risk and the recent news before you act.",
    qBn: "ট্রেন্ডিং তালিকা কি কেনার তালিকা হিসেবে ব্যবহার করা যায়?",
    aBn: "না। ট্রেন্ডিং তালিকা খোঁজখবর শুরু করার জায়গা, কেনার তালিকা নয়। ডিএসইতে দামের গতি দ্রুত উল্টে যেতে পারে, বিশেষ করে ডিভিডেন্ডের রেকর্ড ডেট আর ক্যাটাগরি বদলের আশপাশে। কিছু করার আগে কোম্পানির ব্যবসা, আপনার নিজের ঝুঁকি নেওয়ার সামর্থ্য আর সাম্প্রতিক খবর দেখে নিন।",
  },
  {
    q: "Why are some popular stocks not trending?",
    a: "The list leaves out shares with thin trading (under ৳1 million average daily turnover) and shares missing recent price data. A widely watched share that moved sideways without a rise in trading last week will not score well here, even if the business is strong.",
    qBn: "কিছু জনপ্রিয় শেয়ার ট্রেন্ডিং তালিকায় নেই কেন?",
    aBn: "যেসব শেয়ারের লেনদেন কম (গড় দৈনিক ৳10 লাখের নিচে) বা সাম্প্রতিক দামের তথ্য নেই, সেগুলো তালিকা থেকে বাদ যায়। অনেকে নজর রাখেন এমন একটি শেয়ারের দাম গত সপ্তাহে তেমন না নড়লে এবং লেনদেন না বাড়লে, ব্যবসা শক্তিশালী হলেও এখানে বেশি নম্বর পায় না।",
  },
  {
    q: "How do you handle penny stocks and pump candidates?",
    a: "The ৳1 million daily turnover floor removes the most obvious pump-and-dump candidates. The trend-quality factor also marks down choppy moves, so a single-day spike on otherwise erratic prices will not lift a share into the top ranks.",
    qBn: "খুব কম দামের শেয়ার বা হঠাৎ দাম চড়ানো শেয়ার কীভাবে সামলানো হয়?",
    aBn: "দৈনিক ৳10 লাখ লেনদেনের ন্যূনতম সীমা সবচেয়ে স্পষ্ট কৃত্রিমভাবে দাম চড়ানো শেয়ারগুলো বাদ দেয়। ওঠানামার মান যাচাইও এলোমেলো দামের নম্বর কমিয়ে দেয়, তাই এলোমেলো দামের মধ্যে এক দিনের হঠাৎ লাফ কোনো শেয়ারকে শীর্ষে তুলতে পারে না।",
  },
];

const CONDITION_COPY: Record<string, { en: string; bn: string; word: string; wordBn: string }> = {
  rising: {
    word: "rising",
    wordBn: "বাড়ছে",
    en: "In a rising market, the list favours shares that confirm the move: strong 7-day returns with above-normal trading. These are the leaders pulling the DSEX higher.",
    bn: "বাজার বাড়তে থাকলে তালিকায় সেই শেয়ারগুলো এগিয়ে থাকে যেগুলো এই গতি নিশ্চিত করে: 7 দিনে ভালো দাম বৃদ্ধি আর স্বাভাবিকের চেয়ে বেশি লেনদেন। এরাই ডিএসইএক্সকে ওপরে টানছে।",
  },
  falling: {
    word: "falling",
    wordBn: "কমছে",
    en: "In a falling market, the list shows resilience: shares holding up while the DSEX slides, often with quiet buying visible in their trading.",
    bn: "বাজার কমতে থাকলে তালিকায় দেখা যায় কোন শেয়ার টিকে আছে: ডিএসইএক্স কমলেও যাদের দাম ধরে আছে, প্রায়ই লেনদেনে চুপচাপ কেনার চিহ্নসহ।",
  },
  sideways: {
    word: "flat",
    wordBn: "স্থির",
    en: "In a flat market, the list highlights shares where trading is rising even though the price has not moved yet. A clear rise in price is what would confirm them.",
    bn: "বাজার স্থির থাকলে তালিকায় সেই শেয়ারগুলো আসে যেগুলোর দাম এখনো না বাড়লেও লেনদেন বাড়ছে। দামের স্পষ্ট বৃদ্ধিই এগুলোকে নিশ্চিত করবে।",
  },
  unknown: {
    word: "unclear",
    wordBn: "অস্পষ্ট",
    en: "The market's direction could not be worked out today. The list still ranks the strongest 7-day moves among shares that trade well.",
    bn: "আজ বাজারের দিক বোঝা যায়নি। তবু ভালো লেনদেন হওয়া শেয়ারগুলোর মধ্যে গত 7 দিনের সবচেয়ে শক্তিশালী গতি তালিকায় সাজানো আছে।",
  },
};

// The five factors, in both languages, for the method table.
const FACTORS: { en: string; bn: string; weight: string; whatEn: string; whatBn: string }[] = [
  { en: "Price momentum (7 days)", bn: "দামের গতি (7 দিন)", weight: "35%",
    whatEn: "The 7-day return, capped at ±30% so one outlier cannot dominate",
    whatBn: "7 দিনের দামের পরিবর্তন, ±30%-এ সীমিত, যাতে একটি ব্যতিক্রম সব ছাপিয়ে না যায়" },
  { en: "Strength against DSEX", bn: "ডিএসইএক্সের তুলনায় শক্তি", weight: "25%",
    whatEn: "The share's 7-day return minus the DSEX's, which shows resilience",
    whatBn: "শেয়ারের 7 দিনের পরিবর্তন থেকে ডিএসইএক্সের পরিবর্তন বাদ দিয়ে, যা টিকে থাকার শক্তি দেখায়" },
  { en: "Volume conviction", bn: "লেনদেনের জোর", weight: "20%",
    whatEn: "Average turnover over 7 days against 30 days",
    whatBn: "30 দিনের তুলনায় 7 দিনের গড় লেনদেন" },
  { en: "Trend quality", bn: "ওঠানামার মান", weight: "15%",
    whatEn: "The share of up days, marked down for choppy moves",
    whatBn: "কত দিন দাম বেড়েছে, এলোমেলো ওঠানামায় নম্বর কমে" },
  { en: "Healthy point in the yearly range", bn: "বছরের সীমায় ভালো অবস্থান", weight: "5%",
    whatEn: "+1 between 60% and 90% of the yearly range, −1 above 95%",
    whatBn: "বছরের সীমার 60% থেকে 90%-এর মধ্যে +1, 95%-এর ওপরে −1" },
];

const RELATED: { href: string; en: string; bn: string; lineEn: string; lineBn: string }[] = [
  { href: "/dsestockranking", en: "DSE stock rankings", bn: "ডিএসই শেয়ার র‍্যাঙ্কিং",
    lineEn: "Our long-term score of the business behind every listed company.",
    lineBn: "প্রতিটি তালিকাভুক্ত কোম্পানির ব্যবসার দীর্ঘমেয়াদি স্কোর।" },
  { href: "/dse-popular-stocks", en: "DSE popular stocks", bn: "ডিএসইর জনপ্রিয় শেয়ার",
    lineEn: "The 20 DSE shares readers viewed most on TopStockBD this week.",
    lineBn: "এ সপ্তাহে TopStockBD-তে পাঠকেরা সবচেয়ে বেশি দেখেছেন এমন 20টি শেয়ার।" },
  { href: "/market-analysis", en: "Market analysis", bn: "বাজার বিশ্লেষণ",
    lineEn: "The whole market in plain words: direction, prices and what to watch.",
    lineBn: "সহজ ভাষায় পুরো বাজার: কোন দিকে যাচ্ছে, দাম কেমন, কী নজরে রাখবেন।" },
  { href: "/stocks", en: "All DSE stocks", bn: "ডিএসইর সব শেয়ার",
    lineEn: "A sortable table of every Dhaka Stock Exchange share.",
    lineBn: "ঢাকা স্টক এক্সচেঞ্জের প্রতিটি শেয়ারের সাজানো যায় এমন তালিকা।" },
];

function buildJsonLd(args: {
  asOfDate: string | null;
  generatedAt: string;
  items: { rank: number; trading_code: string; company_name: string | null }[];
}) {
  const now = new Date().toISOString();
  const datePublished = args.asOfDate ? `${args.asOfDate.slice(0, 10)}T00:00:00Z` : now;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": PAGE_URL,
        url: PAGE_URL,
        name: "DSE Trending Stocks — This Week's Top Movers",
        description:
          "The strongest Dhaka Stock Exchange stocks over the last 7 trading days, ranked by price momentum, relative strength vs DSEX, and volume conviction.",
        inLanguage: "en",
        datePublished,
        dateModified: args.generatedAt || now,
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Trending Stocks", item: PAGE_URL },
        ],
      },
      {
        "@type": "ItemList",
        name: "DSE Trending Stocks — 7-Day Momentum",
        description:
          "Twenty Dhaka Stock Exchange stocks ranked by a 7-day market-data composite: price momentum, relative strength vs DSEX, volume conviction, trend quality, and 52-week sweet-spot bonus.",
        numberOfItems: args.items.length,
        itemListOrder: "https://schema.org/ItemListOrderDescending",
        itemListElement: args.items.map((it) => ({
          "@type": "ListItem",
          position: it.rank,
          name: it.company_name ? `${it.company_name} (${it.trading_code})` : it.trading_code,
          url: `${BASE_URL}/stock/${it.trading_code}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}

const HEADER_EYEBROW = <T en="TopStockBD · DSE momentum" bn="TopStockBD · ডিএসইর গতি" />;
const HEADER_TITLE = <T en="Trending stocks" bn="ট্রেন্ডিং শেয়ার" />;
const HEADER_LEAD = (
  <T
    en="The strongest DSE shares of the last 7 trading days, ranked by momentum, strength against the DSEX and trading."
    bn="গত 7 লেনদেনের দিনে ডিএসইর সবচেয়ে শক্তিশালী শেয়ার, দামের গতি, ডিএসইএক্সের তুলনায় শক্তি আর লেনদেন দেখে সাজানো।"
  />
);

export default async function DseTrendingStocksPage() {
  // No catch on the main fetch: a throw lets ISR keep serving the last good
  // page; a rendered error state was cached as the page until the next purge.
  const data = await getTop20();

  const isoDate = data.as_of_date ? data.as_of_date.slice(0, 10) : null;
  const condition = data.market_condition || "unknown";
  const copy = CONDITION_COPY[condition] || CONDITION_COPY.unknown;
  const dsex = data.dsex_7d_change_pct;
  const dsexEn =
    dsex != null ? ` The DSEX is ${dsex >= 0 ? "up" : "down"} ${Math.abs(dsex).toFixed(2)}% over the same 7 days.` : "";
  const dsexBn =
    dsex != null ? ` একই 7 দিনে ডিএসইএক্স ${Math.abs(dsex).toFixed(2)}% ${dsex >= 0 ? "বেড়েছে" : "কমেছে"}।` : "";

  const jsonLd = buildJsonLd({
    asOfDate: data.as_of_date,
    generatedAt: data.generated_at,
    items: data.items,
  });

  const conditionClass =
    condition === "rising" ? "text-positive" : condition === "falling" ? "text-negative" : "text-text-muted";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div>
        <PageHeader
          eyebrow={HEADER_EYEBROW}
          title={HEADER_TITLE}
          lead={HEADER_LEAD}
          actions={
            isoDate ? (
              <span className="ms-page-date">
                <T en={`As of ${formatDate(isoDate)} · market `} bn={`${bnDate(isoDate)} পর্যন্ত · বাজার `} />
                <span className={`font-bold ${conditionClass}`}>
                  <T en={copy.word} bn={copy.wordBn} />
                </span>
              </span>
            ) : undefined
          }
        />

        {/* The deck */}
        <div className="mt-7">
          <Top20Deck items={data.items} />
        </div>

        {/* Methodology */}
        <section className="mt-12 page-narrow">
          <h2 className="text-2xl font-bold text-text-main mb-3">
            <T en="How we build the trending list" bn="ট্রেন্ডিং তালিকা কীভাবে তৈরি হয়" />
          </h2>
          <TBlock
            en={
              <>
                <p className="text-text-main leading-relaxed mb-4">
                  The trending list is built from market data only. It uses no earnings models and no check of the
                  business. Every share on the Dhaka Stock Exchange with price data on at least five of the last seven
                  trading days, and an average daily turnover of ৳1 million or more, is included. Bonds, debentures,
                  mutual funds and ETFs are left out automatically.
                </p>
                <p className="text-text-main leading-relaxed mb-4">
                  Each share is then scored on five factors. Every factor is standardised across all eligible shares,
                  so the size of one signal cannot drown out another. The weights below are fixed and do not change
                  with the market.
                </p>
              </>
            }
            bn={
              <>
                <p className="text-text-main leading-relaxed mb-4">
                  ট্রেন্ডিং তালিকা শুধু বাজারের তথ্য দিয়ে তৈরি। এতে মুনাফার কোনো হিসাব বা ব্যবসার যাচাই নেই। ঢাকা
                  স্টক এক্সচেঞ্জের যেসব শেয়ারের গত সাত লেনদেনের দিনের অন্তত পাঁচ দিনের দামের তথ্য আছে এবং গড়
                  দৈনিক লেনদেন ৳10 লাখ বা তার বেশি, সেগুলো হিসাবে আসে। বন্ড, ডিবেঞ্চার, মিউচুয়াল ফান্ড আর ইটিএফ
                  নিজে থেকেই বাদ যায়।
                </p>
                <p className="text-text-main leading-relaxed mb-4">
                  এরপর প্রতিটি শেয়ারকে পাঁচটি বিষয়ে নম্বর দেওয়া হয়। প্রতিটি বিষয় সব যোগ্য শেয়ারের মধ্যে সমান মাপে
                  আনা হয়, যাতে একটির আকার অন্যটিকে ছাপিয়ে না যায়। নিচের ভাগগুলো নির্দিষ্ট, বাজার বদলালেও বদলায় না।
                </p>
              </>
            }
          />

          <div className="mt-5 mb-6 rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-text-muted">
                    <T en="Factor" bn="বিষয়" />
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-text-muted">
                    <T en="Weight" bn="ভাগ" />
                  </th>
                  <th className="text-left px-4 py-2 font-semibold text-text-muted">
                    <T en="What it shows" bn="যা দেখায়" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {FACTORS.map((f) => (
                  <tr key={f.en} className="border-t border-border">
                    <td className="px-4 py-2 font-semibold">
                      <T en={f.en} bn={f.bn} />
                    </td>
                    <td className="px-4 py-2">{f.weight}</td>
                    <td className="px-4 py-2 text-text-muted">
                      <T en={f.whatEn} bn={f.whatBn} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TBlock
            en={
              <>
                <p className="text-text-main leading-relaxed mb-4">
                  Why these five, and not the 7-day return alone? The return alone rewards shares that are already
                  overheated and small shares being pushed up. Strength against the DSEX shows a share is beating the
                  wider market, not just rising with it. Volume conviction shows real money is behind the move. Trend
                  quality separates a steady climb on five days out of seven from a single 20% jump on an otherwise
                  flat line. The small yearly-range bonus favours moves that still have room, rather than shares
                  already pinned at their high.
                </p>
                <p className="text-text-main leading-relaxed">
                  Twenty is a deliberate number. With fewer, one sector tends to fill the list; with more, you have to
                  dig past noise. Twenty fits on one page, spreads across sectors and matches the size of a working
                  watchlist.
                </p>
              </>
            }
            bn={
              <>
                <p className="text-text-main leading-relaxed mb-4">
                  শুধু 7 দিনের দামের পরিবর্তন না দেখে এই পাঁচটি কেন? শুধু দামের পরিবর্তন দেখলে আগেই অতিরিক্ত বেড়ে
                  যাওয়া শেয়ার আর কৃত্রিমভাবে চড়ানো ছোট শেয়ার এগিয়ে যায়। ডিএসইএক্সের তুলনায় শক্তি দেখায় শেয়ারটি
                  বাজারের সঙ্গে শুধু ভাসছে না, বাজারকে ছাড়িয়ে যাচ্ছে। লেনদেনের জোর দেখায় এই গতির পেছনে আসল টাকা
                  আছে। ওঠানামার মান সাত দিনের পাঁচ দিন স্থির বৃদ্ধি আর সমতল দামের মধ্যে এক দিনের 20% লাফকে আলাদা
                  করে। বছরের সীমার বাড়তি নম্বর সেই গতিকে এগিয়ে রাখে যার এখনো বাড়ার জায়গা আছে।
                </p>
                <p className="text-text-main leading-relaxed">
                  বিশ সংখ্যাটি ভেবেচিন্তে বাছা। এর কম হলে একটি সেক্টর পুরো তালিকা দখল করে; বেশি হলে অপ্রয়োজনীয়
                  নাম ঘাঁটতে হয়। বিশটি শেয়ার এক পেজে ধরে, কয়েকটি সেক্টরে ছড়ায়, আর একটি কাজের ওয়াচলিস্টের আকারের
                  সঙ্গে মেলে।
                </p>
              </>
            }
          />
        </section>

        {/* Dynamic condition explainer */}
        <section className="mt-10 page-narrow">
          <h2 className="text-2xl font-bold text-text-main mb-3">
            <T en="What trending means on the DSE this week" bn="এ সপ্তাহে ডিএসইতে ট্রেন্ডিং মানে কী" />
          </h2>
          <p className="text-text-main leading-relaxed">
            <T
              en={`${copy.en} The list above reflects that.${dsexEn} The list is recomputed every day after the close, so the names change as the market changes: the same five factors, applied to fresh data.`}
              bn={`${copy.bn} ওপরের তালিকায় তা-ই দেখা যাচ্ছে।${dsexBn} প্রতিদিন লেনদেন শেষে তালিকাটি নতুন করে হিসাব হয়, তাই বাজার বদলালে নামও বদলায়: একই পাঁচটি বিষয়, নতুন তথ্যে।`}
            />
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-10 page-narrow">
          <h2 className="text-2xl font-bold text-text-main mb-4">
            <T en="Common questions" bn="সাধারণ প্রশ্ন" />
          </h2>
          <div className="space-y-2">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-border bg-surface px-4 py-3"
              >
                <summary className="cursor-pointer font-semibold text-text-main list-none flex items-center justify-between gap-3">
                  <span>
                    <T en={f.q} bn={f.qBn} />
                  </span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 text-lg leading-none text-text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-text-main leading-relaxed">
                  <T en={f.a} bn={f.aBn} />
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Related */}
        <section className="mt-10 page-narrow">
          <h2 className="text-2xl font-bold text-text-main mb-4">
            <T en="Related pages" bn="সম্পর্কিত পেজ" />
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {RELATED.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="block rounded-lg border border-border bg-surface p-4 hover:border-primary transition-colors"
              >
                <div className="font-semibold text-text-main">
                  <T en={r.en} bn={r.bn} />
                </div>
                <div className="text-sm text-text-muted mt-1">
                  <T en={r.lineEn} bn={r.lineBn} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <p className="mt-10 text-xs text-text-muted text-center page-narrow leading-relaxed">
          <T
            en="This page is for information only and is not investment advice. Short-term momentum does not promise future results. Please do your own research, and speak to a licensed adviser before making investment decisions on the Dhaka Stock Exchange."
            bn="এই পেজ শুধু তথ্যের জন্য, বিনিয়োগ পরামর্শ নয়। স্বল্প সময়ের দামের গতি ভবিষ্যতের ফলের নিশ্চয়তা দেয় না। ঢাকা স্টক এক্সচেঞ্জে বিনিয়োগের সিদ্ধান্তের আগে নিজে খোঁজখবর নিন, আর একজন লাইসেন্সপ্রাপ্ত পরামর্শকের সঙ্গে কথা বলুন।"
          />
        </p>
      </div>
    </>
  );
}
