import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSectorDetail, getSectorSlugs, ApiNotFoundError } from "@/lib/api";
import { crore, pct } from "@/lib/formatters";
import SectorHero from "@/components/sector/SectorHero";
import SectorVsMarket from "@/components/sector/SectorVsMarket";
import SectorHighlights from "@/components/sector/SectorHighlights";
import SectorStockTable from "@/components/sector/SectorStockTable";
import SectorScoringNote from "@/components/sector/SectorScoringNote";
import SectorCard from "@/components/sector/SectorCard";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

export const revalidate = 86400;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getSectorSlugs().catch(() => [] as string[]);
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getSectorDetail(slug).catch(() => null);
  if (!data) return {};

  const s = data.summary;
  const title = `${s.sector} Sector — DSE Stocks, P/E, Dividend Yield & Rankings`;
  const description =
    `All ${s.company_count} ${s.sector.toLowerCase()} companies on the Dhaka Stock Exchange, ranked by fundamental score. ` +
    `Median P/E ${s.median_pe != null ? s.median_pe.toFixed(1) : "n/a"}, median dividend yield ` +
    `${s.median_yield_pct != null ? `${s.median_yield_pct.toFixed(1)}%` : "n/a"}, with prices, ` +
    `7-day moves and how the sector compares to the whole market.`;

  return {
    title,
    description,
    keywords: [
      `${s.sector} sector DSE`,
      `${s.sector} stocks Bangladesh`,
      `best ${s.sector.toLowerCase()} stocks DSE`,
      `${s.sector} sector P/E`,
      `${s.sector} dividend yield`,
      "DSE sector analysis",
      "Dhaka Stock Exchange sectors",
    ],
    alternates: { canonical: `/sector/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/sector/${slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${s.sector} Sector — DSE`,
      description: `${s.company_count} companies, median score ${s.median_score ?? "—"}/100.`,
    },
  };
}

export default async function SectorPage({ params }: Props) {
  const { slug } = await params;

  let data;
  try {
    data = await getSectorDetail(slug);
  } catch (err) {
    if (err instanceof ApiNotFoundError) notFound();
    data = null;
  }

  if (!data) {
    return (
      <>
        <header className="ms-pagehead">
          <h1 className="ms-page-h1">
            <span className="ms-page-kicker">DSE Sector</span>
            <span className="ms-page-h1-main">Sector</span>
          </h1>
        </header>
        <div className="ms-card">
          <p className="ms-empty">
            We couldn&apos;t reach the sector data right now. Please refresh in a moment.
          </p>
        </div>
      </>
    );
  }

  const s = data.summary;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${BASE_URL}/sector/${slug}`,
        url: `${BASE_URL}/sector/${slug}`,
        name: `${s.sector} Sector — Dhaka Stock Exchange`,
        description:
          `All ${s.company_count} ${s.sector.toLowerCase()} companies listed on DSE, with median P/E, ` +
          `dividend yield and fundamental scores.`,
        inLanguage: "en",
        isPartOf: { "@id": BASE_URL },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
          { "@type": "ListItem", position: 2, name: "Sectors", item: `${BASE_URL}/sectors` },
          {
            "@type": "ListItem",
            position: 3,
            name: s.sector,
            item: `${BASE_URL}/sector/${slug}`,
          },
        ],
      },
      {
        "@type": "ItemList",
        name: `${s.sector} companies on DSE, by fundamental score`,
        numberOfItems: data.stocks.length,
        itemListElement: data.stocks.slice(0, 25).map((stock, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: stock.company_name || stock.trading_code,
          url: `${BASE_URL}/stock/${stock.trading_code}`,
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
          <span className="ms-page-kicker">
            <Link href="/sectors" className="hover:underline">
              DSE Sectors
            </Link>
          </span>
          <span className="ms-page-h1-main">{s.sector}</span>
        </h1>
        <span className="ms-page-date">
          {s.company_count} companies · {crore(s.total_mcap_mn)} · median score{" "}
          {s.median_score != null ? s.median_score.toFixed(1) : "—"}
        </span>
      </header>

      <SectorHero summary={s} />

      <SectorVsMarket
        rows={data.comparison}
        summary={s}
        marketCount={data.market.company_count}
      />

      <SectorHighlights
        gainers={data.gainers}
        losers={data.losers}
        weekLeaders={data.week_leaders}
        topDividend={data.top_dividend}
      />

      <SectorStockTable stocks={data.stocks} sectorName={s.sector} />

      <SectorScoringNote note={data.scoring_note} sectorName={s.sector} />

      {data.related_sectors.length > 0 && (
        <section className="mb-8">
          <div className="section-rule-modern">
            <span className="section-rule-text">Other Sectors</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.related_sectors.map((o) => (
              <SectorCard key={o.slug} sector={o} />
            ))}
          </div>
          <p className="mt-3 text-[0.78rem] font-semibold text-[var(--text-muted)]">
            <Link href="/sectors" className="text-[var(--primary)] underline">
              See all {data.market.sector_count} sectors
            </Link>{" "}
            · market median P/E {data.market.median_pe != null ? data.market.median_pe.toFixed(1) : "—"},
            yield {data.market.median_yield_pct != null ? pct(data.market.median_yield_pct, 1) : "—"}
          </p>
        </section>
      )}
    </>
  );
}
