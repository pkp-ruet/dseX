import type { Metadata } from "next";
import Link from "next/link";
import Bn from "@/components/i18n/Bn";
import SectorCard from "@/components/sector/SectorCard";
import { getSectors } from "@/lib/api";
import { crore, pct } from "@/lib/formatters";
import ErrorState from "@/components/ui/ErrorState";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

const TITLE = "DSE Sectors — Compare Banks, Textile, Pharma and More";
const DESCRIPTION =
  "Every Dhaka Stock Exchange sector side by side: how many companies, combined market value, median score, median P/E, dividend yield and today's move — with a full page for each sector.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "DSE sectors",
    "DSE sector wise stock list",
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
    <div className="flex flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 sm:p-3">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-base font-extrabold leading-none tabular-nums text-[var(--text)] sm:text-lg">
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
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">Dhaka Stock Exchange</span>
            <span className="ms-page-h1-main">Sectors</span>
          </h1>
        </header>
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

      <header className="ms-pagehead">
        <h1 className="ms-page-h1">
          <span className="ms-page-kicker">Dhaka Stock Exchange</span>
          <span className="ms-page-h1-main">Sectors</span>
        </h1>
        <span className="ms-page-date">
          {sectors.length} sectors · {market.company_count} scored companies
        </span>
              <Bn className="page-h1-bn">কোম্পানি বাছার আগে পুরো সেক্টর দেখে নিন।</Bn>
</header>

      <section className="soft-card mb-6 p-4 sm:p-5">
        <p className="text-[0.9rem] font-semibold text-[var(--text)]">
          Compare whole industries before picking a company. Every figure below is the median of
          the companies in that sector, so one giant listing can&apos;t drag the number around.
        </p>
        <Bn className="mt-2 text-[0.92rem] font-medium leading-[1.85] text-[var(--text-muted)]">
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

      <p className="mb-8 text-[0.78rem] font-semibold text-[var(--text-muted)]">
        Sectors with fewer than three scored companies are left out, because a median of one or
        two listings describes nothing. Mutual funds are not scored and so have no sector page.
        Looking for one company instead?{" "}
        <Link href="/stocks" className="text-[var(--primary)] underline">
          Browse all stocks A–Z
        </Link>
        .
      </p>
    </>
  );
}
