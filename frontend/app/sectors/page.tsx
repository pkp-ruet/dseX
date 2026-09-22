import type { Metadata } from "next";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import PageHeader from "@/components/ui/PageHeader";
import SectorCard from "@/components/sector/SectorCard";
import { getSectors } from "@/lib/api";
import { crore, pct } from "@/lib/formatters";
import ErrorState from "@/components/ui/ErrorState";
import PageGuide from "@/components/seo/PageGuide";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

const TITLE = "DSE Sectors — Sector-wise Share List, P/E & Dividend Yield";
const DESCRIPTION =
  "Every Dhaka Stock Exchange sector side by side: how many companies, combined market value, median score, median P/E, dividend yield and today's move — with a full page for each sector.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE sectors",
    "DSE sector wise stock list",
    "DSE sector wise share price",
    "DSE sector PE ratio",
    "which sector is best in Bangladesh share market",
    "bank sector DSE",
    "textile sector Bangladesh",
    "pharmaceuticals sector DSE",
    "DSE sector P/E",
    "best sector Bangladesh stock market",
    "Dhaka Stock Exchange sector performance",
  ],
  alternates: { canonical: "/sectors" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${BASE_URL}/sectors`,
    type: "website",
  },
};

function MarketStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border bg-surface-2 p-2.5 sm:p-3">
      <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-text-muted">
        {label}
      </span>
      <span className="text-base font-extrabold leading-none tabular-nums text-text-main sm:text-lg">
        {value}
      </span>
    </div>
  );
}

export default async function SectorsPage() {
  const data = await getSectors().catch(() => null);

  if (!data || data.sectors.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Dhaka Stock Exchange"
          title="Sectors"
          bn="কোম্পানি বাছার আগে পুরো সেক্টর দেখে নিন।"
        />
        <ErrorState
          size="inline"
          title="Couldn't load the sectors"
          bn="সেক্টরের তথ্য এখন লোড হচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।"
          reload
          links={[{ href: "/dsestockranking", label: "Stock rankings" }]}
        />
      </>
    );
  }

  const { market, sectors } = data;
  const largest = sectors[0] ?? null;
  const highestYield =
    [...sectors].filter((s) => s.median_yield_pct != null).sort((a, b) => (b.median_yield_pct ?? 0) - (a.median_yield_pct ?? 0))[0] ?? null;
  const strongest =
    [...sectors].filter((s) => s.median_score != null).sort((a, b) => (b.median_score ?? 0) - (a.median_score ?? 0))[0] ?? null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/sectors`,
        url: `${BASE_URL}/sectors`,
        name: TITLE,
        description: DESCRIPTION,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Sectors", item: `${BASE_URL}/sectors` },
        ],
      },
      {
        "@type": "ItemList",
        name: "DSE sectors",
        numberOfItems: sectors.length,
        itemListElement: sectors.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: s.sector,
          url: `${BASE_URL}/sector/${s.slug}`,
        })),
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
        eyebrow="Dhaka Stock Exchange"
        title="Sectors"
        bn="কোম্পানি বাছার আগে পুরো সেক্টর দেখে নিন।"
        actions={
          <span className="ms-page-date">
            {sectors.length} sectors · {market.company_count} scored companies
          </span>
        }
      />

      <section className="soft-card mb-6 p-4 sm:p-5">
        <p className="text-sm font-semibold text-text-main">
          Compare whole industries before picking a company. Every figure below is the median of
          the companies in that sector, so one giant listing can&apos;t drag the number around.
        </p>
        <Bn className="mt-2 text-base font-medium leading-[1.85] text-text-muted">
          কোম্পানি বাছার আগে পুরো সেক্টর দেখে নিন — প্রতিটি সংখ্যা সেই সেক্টরের মধ্যম মান।
        </Bn>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <MarketStat label="Market P/E" value={market.median_pe != null ? market.median_pe.toFixed(1) : "—"} />
          <MarketStat
            label="Market yield"
            value={market.median_yield_pct != null ? pct(market.median_yield_pct, 1) : "—"}
          />
          <MarketStat
            label="Median score"
            value={market.median_score != null ? market.median_score.toFixed(1) : "—"}
          />
          <MarketStat
            label="Market today"
            value={
              market.avg_change_pct != null
                ? `${market.avg_change_pct > 0 ? "+" : ""}${pct(market.avg_change_pct, 2)}`
                : "—"
            }
          />
        </div>
      </section>

      <div className="section-rule-modern">
        <span className="section-rule-text">Every Sector — Largest First</span>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sectors.map((s) => (
          <SectorCard key={s.slug} sector={s} />
        ))}
      </div>

      <p className="mb-8 text-xs font-semibold text-text-muted">
        Sectors with fewer than three scored companies are left out, because a median of one or
        two listings describes nothing. Mutual funds are not scored and so have no sector page.
        Looking for one company instead?{" "}
        <Link href="/stocks" className="text-primary underline">
          Browse all stocks A–Z
        </Link>
        .
      </p>

      <PageGuide
        title="About DSE sectors"
        intro={[
          <>
            The Dhaka Stock Exchange groups its listed companies into sectors — banks, insurance, textiles,
            pharmaceuticals, fuel and power, engineering, food, cement, telecom and more. This page puts all{" "}
            {sectors.length} scored sectors side by side, largest first by market value, so you can see{" "}
            <b>which part of the market is big, which is cheap, and which is moving</b> before you look at any
            single company.
          </>,
          <>
            Every figure is a <b>median</b>, not an average: the middle company&apos;s P/E, dividend yield, return on
            equity and score. A median cannot be dragged around by one giant like Grameenphone or one loss-maker,
            so it describes the typical company in the sector.{" "}
            {largest ? (
              <>
                Right now the largest sector by value is <b>{largest.sector}</b>
                {largest.total_mcap_mn != null ? <> at {crore(largest.total_mcap_mn)}</> : null}
              </>
            ) : null}
            {highestYield && highestYield.median_yield_pct != null ? (
              <>
                , and the highest typical dividend yield is in <b>{highestYield.sector}</b> at{" "}
                {pct(highestYield.median_yield_pct, 1)}
              </>
            ) : null}
            {strongest && strongest.median_score != null ? (
              <>
                ; the strongest median score belongs to <b>{strongest.sector}</b> ({strongest.median_score.toFixed(1)}/100)
              </>
            ) : null}
            .
          </>,
          <>
            Banks, non-bank financial institutions and insurers are scored with their own rules, because a
            lender&apos;s debt is its raw material and an insurer has no gross profit line; the sector page explains
            which rules applied. Open any sector for its full company table, today&apos;s gainers and losers, the
            best dividend payers and how it compares with the whole market.
          </>,
        ]}
        bn="একটা সেক্টরের সব কোম্পানি একসাথে দেখলে বোঝা যায় কোন খাত সস্তা, কোন খাত এগিয়ে।"
        faq={[
          {
            q: "How many sectors are there on the Dhaka Stock Exchange?",
            a: `DSE classifies listed securities into about 22 sectors, including mutual funds and corporate bonds. TopStockBD scores ${sectors.length} of them — every sector with at least three operating companies that publish annual accounts.`,
          },
          {
            q: "Which DSE sector is the largest?",
            a: largest
              ? `By combined market value it is ${largest.sector}${largest.total_mcap_mn != null ? ` at about ${crore(largest.total_mcap_mn)}` : ""}, with ${largest.company_count} scored companies. Rankings shift with prices, so the cards above are the live order.`
              : "Sector sizes change with prices; the cards above list every scored sector, largest first by combined market value.",
          },
          {
            q: "What does the sector P/E tell me?",
            a: `The median price-to-earnings ratio of the sector's companies: how many taka investors pay for one taka of annual profit. Compare it with the market P/E${market.median_pe != null ? ` (${market.median_pe.toFixed(1)} today)` : ""} — a sector far below it is priced for trouble or overlooked, a sector far above it is priced for growth.`,
          },
          {
            q: "Why are banks and insurance companies scored differently?",
            a: "A bank borrows to lend, so debt-to-equity and interest cover mean nothing for it; TopStockBD scores banks and NBFIs on their capital cushion and net interest margin instead. Insurers have no gross profit line, so net margin stands in. Each sector page states which rule set was used.",
          },
        ]}
      />
    </>
  );
}
