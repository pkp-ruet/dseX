import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_LISTS, type StockListsResponse } from "@/lib/stock-lists";
import { RESEARCH_LISTS } from "@/lib/research-lists";
import { getResearchLists, type ResearchListSummary } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Chip from "@/components/ui/Chip";
import { T } from "@/components/i18n/T";
import { Txt } from "@/components/research/ResearchText";
import { IconLock } from "@/components/ui/icons";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const TITLE = "DSE Stock Lists — Research Lists and Rankings";
const DESCRIPTION =
  "Six research lists that test every Dhaka Stock Exchange company against plain checks — dividends they can afford, cheap quality, rising profits, debt-free growth — plus four free rankings: top dividend yield, largest companies, most traded and best 1-year return.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE stock lists",
    "best stocks Bangladesh",
    "Dhaka Stock Exchange research",
    "dividend stocks Bangladesh",
    "undervalued stocks DSE",
    "debt free companies Bangladesh",
    "largest companies DSE",
    "most traded stocks DSE",
  ],
  alternates: { canonical: `${BASE_URL}/stock-insights` },
  openGraph: {
    title: `${TITLE} | TopStockBD`,
    description: DESCRIPTION,
    url: `${BASE_URL}/stock-insights`,
    type: "website",
  },
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/stock-insights`,
  },
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Stock Lists", item: `${BASE_URL}/stock-insights` },
    ],
  },
];

/** What each free ranking is sorted on, in plain words. */
const FREE_COPY: Record<keyof StockListsResponse, { en: string; bn: string }> = {
  top_dividend: {
    en: "Ranked by cash dividend yield",
    bn: "নগদ ডিভিডেন্ড ইল্ড অনুযায়ী সাজানো",
  },
  top_market_cap: {
    en: "Ranked by total market value",
    bn: "মোট বাজার মূলধন অনুযায়ী সাজানো",
  },
  top_volume: {
    en: "Ranked by the money traded on the last trading day",
    bn: "শেষ কার্যদিবসে কত টাকার লেনদেন হয়েছে, সেই অনুযায়ী সাজানো",
  },
  top_52w_return: {
    en: "Ranked by price change over a year",
    bn: "এক বছরে দামের পরিবর্তন অনুযায়ী সাজানো",
  },
};

/**
 * The stock-lists hub: ten lists, two kinds. Six Premium research lists
 * (fully locked — no stock names on this page either) and four free rankings.
 */
export default async function StockInsightsPage() {
  const research = await getResearchLists().catch(() => null);
  const live = new Map<string, ResearchListSummary>((research?.lists ?? []).map((l) => [l.slug, l]));

  return (
    <div className="page-narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <PageHeader
        eyebrow={<T en="Stock lists" bn="শেয়ারের তালিকা" />}
        title={<T en="Stock lists for the DSE" bn="ডিএসইর শেয়ারের তালিকা" />}
        lead={
          <T
            en="Six research lists that do the research for you, and four free rankings of the plain facts."
            bn="ছয়টি গবেষণা তালিকা, যেগুলো আপনার হয়ে খুঁটিয়ে দেখে, আর সহজ তথ্যের চারটি ফ্রি র‍্যাঙ্কিং।"
          />
        }
      />

      {/* Premium research lists */}
      <section id="research" className="rl-hub-section" aria-labelledby="rl-hub-research">
        <div className="rl-hub-head">
          <h2 id="rl-hub-research" className="rl-hub-h2">
            <T en="Research lists" bn="গবেষণা তালিকা" />
          </h2>
          <Chip tone="info" icon={<IconLock size={12} />}>
            <T en="Premium" bn="প্রিমিয়াম" />
          </Chip>
        </div>
        <p className="rl-hub-lead">
          <T
            en="Each list tests one idea in the open. Every rated company goes through the same plain checks, and every share that passes gets a research card with its own numbers and the one thing that could go wrong."
            bn="প্রতিটি তালিকা একটি ধারণা খোলাখুলি যাচাই করে। রেটিং পাওয়া প্রতিটি কোম্পানি একই সহজ যাচাইয়ের মধ্য দিয়ে যায়, আর যে শেয়ার পাস করে, তার জন্য থাকে একটি গবেষণা কার্ড: তার নিজের সংখ্যা আর যে একটি বিষয়ে ঝুঁকি আছে।"
          />
        </p>
        <div className="rl-hub">
          {RESEARCH_LISTS.map((def) => {
            const l = live.get(def.slug);
            return (
              <Link key={def.slug} prefetch={false} href={`/stock-insights/${def.slug}`} className="soft-card rl-hub-card">
                <h3 className="rl-hub-title">
                  <T en={def.shortName} bn={def.shortNameBn} />
                </h3>
                <Txt as="p" className="rl-hub-idea" en={def.hook} bn={def.hookBn} />
                {l && (
                  <div className="rl-hub-foot">
                    <span className="rl-hub-num nums">{l.passed}</span>
                    <Txt
                      className="rl-hub-of"
                      en={`pass all ${l.checks} checks, out of ${l.universe} companies`}
                      bn={`কোম্পানি ${l.checks}টি যাচাইয়েই পাস করেছে, মোট ${l.universe}টির মধ্যে`}
                    />
                  </div>
                )}
              </Link>
            );
          })}
          <Link prefetch={false} href="/screener" className="soft-card rl-hub-card">
            <h3 className="rl-hub-title">
              <T en="Build your own in the screener" bn="স্ক্রিনারে নিজের তালিকা বানান" />
            </h3>
            <Txt
              as="p"
              className="rl-hub-idea"
              en="Choose your own checks on dividend, price, profit, loans and sector. We tell you on the day a new share passes them."
              bn="ডিভিডেন্ড, দাম, মুনাফা, ঋণ আর সেক্টর নিয়ে নিজের শর্ত বেছে নিন। নতুন কোনো শেয়ার পাস করলে সেদিনই জানাব।"
            />
          </Link>
        </div>
      </section>

      {/* Free rankings */}
      <section className="rl-hub-section" aria-labelledby="rl-hub-free">
        <div className="rl-hub-head">
          <h2 id="rl-hub-free" className="rl-hub-h2">
            <T en="Free rankings" bn="ফ্রি র‍্যাঙ্কিং" />
          </h2>
        </div>
        <p className="rl-hub-lead">
          <T
            en="The top 20 on one plain number, refreshed every trading day. Each is a starting point, not a verdict on the company."
            bn="একটি সহজ সংখ্যার ভিত্তিতে সেরা 20টি, প্রতি কার্যদিবসে হালনাগাদ। এটি শুরু করার জায়গা, কোম্পানি নিয়ে রায় নয়।"
          />
        </p>
        <div className="rl-hub">
          {STOCK_LISTS.map((list) => (
            <Link key={list.slug} prefetch={false} href={`/stock-insights/${list.slug}`} className="soft-card rl-hub-card">
              <h3 className="rl-hub-title">
                <T en={list.shortName} bn={list.shortNameBn} />
              </h3>
              <Txt as="p" className="rl-hub-idea" en={FREE_COPY[list.apiKey].en} bn={FREE_COPY[list.apiKey].bn} />
            </Link>
          ))}
        </div>
      </section>

      <div className="ed-nav">
        <Link href="/dsestockranking" className="btn-primary">
          <T en="See the full rankings" bn="পুরো র‍্যাঙ্কিং দেখুন" />
        </Link>
        <Link href="/" className="btn-quiet">
          <T en="Back to home" bn="হোমে ফিরুন" />
        </Link>
      </div>
    </div>
  );
}
