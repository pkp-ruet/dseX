import type { Metadata } from "next";
import Link from "next/link";
import { STOCK_LISTS, type StockListsResponse } from "@/lib/stock-lists";
import { RESEARCH_LISTS } from "@/lib/research-lists";
import { getResearchLists, type ResearchListSummary } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import Chip from "@/components/ui/Chip";
import Bn from "@/components/i18n/Bn";
import { Txt } from "@/components/research/ResearchText";
import { StockLangToggle } from "@/components/stock/LangToggle";
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

/** Each free ranking's Bengali name and what it is sorted on, in plain words. */
const FREE_COPY: Record<keyof StockListsResponse, { titleBn: string; en: string; bn: string }> = {
  top_dividend: {
    titleBn: "সবচেয়ে বেশি লভ্যাংশ",
    en: "Ranked by cash dividend yield",
    bn: "নগদ লভ্যাংশের হার অনুযায়ী সাজানো",
  },
  top_market_cap: {
    titleBn: "সবচেয়ে বড় কোম্পানি",
    en: "Ranked by total market value",
    bn: "মোট বাজারমূল্য অনুযায়ী সাজানো",
  },
  top_volume: {
    titleBn: "সবচেয়ে বেশি লেনদেন",
    en: "Ranked by money traded today",
    bn: "আজ কত টাকার লেনদেন হয়েছে, সেই অনুযায়ী সাজানো",
  },
  top_52w_return: {
    titleBn: "এক বছরে সবচেয়ে বেশি বেড়েছে",
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
        eyebrow="Stock lists"
        title="Stock lists for the DSE"
        bn="গবেষণা করা তালিকা আর সহজ র‍্যাঙ্কিং — যেটা দরকার, সেটা বেছে নিন।"
        lead="Six research lists that do the digging for you, and four free rankings of the plain facts."
        actions={<StockLangToggle size="sm" />}
      />

      {/* Premium research lists */}
      <section id="research" className="rl-hub-section" aria-labelledby="rl-hub-research">
        <div className="rl-hub-head">
          <h2 id="rl-hub-research" className="rl-hub-h2">Research lists</h2>
          <Chip tone="info" icon={<IconLock size={12} />}>Premium</Chip>
        </div>
        <p className="rl-hub-lead">
          Each list is one idea, tested in the open: every rated company goes through the same plain checks, and every
          stock that passes gets a research card with its own numbers and the one thing that could go wrong.
        </p>
        <div className="rl-hub">
          {RESEARCH_LISTS.map((def) => {
            const l = live.get(def.slug);
            return (
              <Link key={def.slug} prefetch={false} href={`/stock-insights/${def.slug}`} className="soft-card rl-hub-card">
                <h3 className="rl-hub-title">{def.shortName}</h3>
                <Bn className="rl-hub-title-bn">{def.shortNameBn}</Bn>
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
            <h3 className="rl-hub-title">Build your own in the screener</h3>
            <Bn className="rl-hub-title-bn">স্ক্রিনারে নিজের তালিকা বানান</Bn>
            <Txt
              as="p"
              className="rl-hub-idea"
              en="Pick your own checks — dividend, price, profit, loans, sector — and get told the day a new stock passes them."
              bn="নিজের শর্ত বেছে নিন — লভ্যাংশ, দাম, লাভ, ঋণ, খাত — নতুন কোনো শেয়ার পাস করলেই জানিয়ে দেব।"
            />
          </Link>
        </div>
      </section>

      {/* Free rankings */}
      <section className="rl-hub-section" aria-labelledby="rl-hub-free">
        <div className="rl-hub-head">
          <h2 id="rl-hub-free" className="rl-hub-h2">Free rankings</h2>
        </div>
        <p className="rl-hub-lead">
          The top 20 on one plain number, refreshed every trading day. A starting point — not a verdict on the company.
        </p>
        <div className="rl-hub">
          {STOCK_LISTS.map((list) => (
            <Link key={list.slug} prefetch={false} href={`/stock-insights/${list.slug}`} className="soft-card rl-hub-card">
              <h3 className="rl-hub-title">{list.shortName}</h3>
              <Bn className="rl-hub-title-bn">{FREE_COPY[list.apiKey].titleBn}</Bn>
              <Txt as="p" className="rl-hub-idea" en={FREE_COPY[list.apiKey].en} bn={FREE_COPY[list.apiKey].bn} />
            </Link>
          ))}
        </div>
      </section>

      <div className="ed-nav">
        <Link href="/dsestockranking" className="btn-primary">
          See the full leaderboard
        </Link>
        <Link href="/" className="btn-quiet">
          Back home
        </Link>
      </div>
    </div>
  );
}
