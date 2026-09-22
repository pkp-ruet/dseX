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
import PageGuide from "@/components/seo/PageGuide";
import PageHeader from "@/components/ui/PageHeader";

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
  const title = `${s.sector} Sector — DSE Share Prices, P/E, Dividend Yield & Rankings`;
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
      `${s.sector} share price DSE`,
      `${s.sector} sector share list`,
      `${s.sector} companies in Bangladesh stock market`,
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
        <PageHeader
          eyebrow="DSE Sector"
          title="Sector"
          bn="এই সেক্টরের সব কোম্পানি এক পাতায় — দাম, স্কোর আর তুলনা।"
        />
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

      <PageHeader
        eyebrow={
          <Link href="/sectors" className="hover:underline">
            DSE Sectors
          </Link>
        }
        title={s.sector}
        bn="এই সেক্টরের সব কোম্পানি এক পাতায় — দাম, স্কোর আর বাজারের সঙ্গে তুলনা।"
        actions={
          <span className="ms-page-date">
            {s.company_count} companies · {crore(s.total_mcap_mn)} · median score{" "}
            {s.median_score != null ? s.median_score.toFixed(1) : "—"}
          </span>
        }
      />

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

      <PageGuide
        title={`About the ${s.sector} sector on DSE`}
        intro={[
          <>
            The <b>{s.sector.toLowerCase()} sector of the Dhaka Stock Exchange</b> has {s.company_count} scored
            {s.company_count === 1 ? " company" : " companies"}
            {s.total_mcap_mn != null ? <> worth {crore(s.total_mcap_mn)} together</> : null}
            {data.market.company_count ? <>, out of {data.market.company_count} scored companies on the exchange</> : null}.
            The table above lists every one with its official closing share price, the day&apos;s change, EPS,
            dividend yield, P/E and fundamental score, sortable by any column. Companies that have not filed a
            recent annual report are marked and scored down.
          </>,
          <>
            {s.median_pe != null && data.market.median_pe != null ? (
              <>
                The sector&apos;s median P/E is <b>{s.median_pe.toFixed(1)}</b> against {data.market.median_pe.toFixed(1)} for the
                whole market, so the typical {s.sector.toLowerCase()} share is{" "}
                {s.median_pe < data.market.median_pe * 0.85
                  ? "priced well below"
                  : s.median_pe > data.market.median_pe * 1.15
                    ? "priced well above"
                    : "priced close to"}{" "}
                the market for each taka of profit.{" "}
              </>
            ) : null}
            {s.median_yield_pct != null ? (
              <>
                The median dividend yield is <b>{pct(s.median_yield_pct, 1)}</b>
                {data.market.median_yield_pct != null ? <> (market {pct(data.market.median_yield_pct, 1)})</> : null}.{" "}
              </>
            ) : null}
            {s.median_roe_pct != null ? <>Typical return on equity is {pct(s.median_roe_pct, 1)}. </> : null}
            {s.top_ranked ? (
              <>
                The highest-scoring company in the sector right now is{" "}
                <b>{s.top_ranked.company_name ?? s.top_ranked.trading_code}</b> ({s.top_ranked.trading_code}).
              </>
            ) : null}
          </>,
          <>
            Sector medians matter because they set the bar: a bank trading at a P/E of 6 is ordinary if every
            bank does, and cheap only if its peers trade at 9. Compare a company with its sector first, then with
            the market, and read the &ldquo;how this sector is scored&rdquo; note above for the rules that applied.
          </>,
        ]}
        bn={`ডিএসই-র ${s.sector} খাতের সব কোম্পানির দাম, আয় আর স্কোর এক টেবিলে — সেক্টরের মধ্যম মানের সাথে তুলনা করে দেখুন।`}
        faq={[
          {
            q: `How many ${s.sector.toLowerCase()} companies are listed on the Dhaka Stock Exchange?`,
            a: `TopStockBD scores ${s.company_count} ${s.sector.toLowerCase()} ${s.company_count === 1 ? "company" : "companies"} on DSE — every one that publishes annual accounts. Mutual funds and bonds are excluded from every sector.`,
          },
          {
            q: `Which ${s.sector.toLowerCase()} stock has the highest fundamental score?`,
            a: s.top_ranked
              ? `${s.top_ranked.company_name ?? s.top_ranked.trading_code} (${s.top_ranked.trading_code}) leads the sector on TopStockBD's five-pillar score right now. Scores are recomputed after every trading day, so check the table for the current order.`
              : "The table above is sorted by score by default; the top row is the current leader. Scores are recomputed after every trading day.",
          },
          {
            q: `Is the ${s.sector.toLowerCase()} sector cheap or expensive right now?`,
            a:
              s.median_pe != null && data.market.median_pe != null
                ? `Its median P/E is ${s.median_pe.toFixed(1)} versus ${data.market.median_pe.toFixed(1)} for the market — ${s.median_pe < data.market.median_pe * 0.85 ? "cheaper than the typical DSE share" : s.median_pe > data.market.median_pe * 1.15 ? "more expensive than the typical DSE share" : "about in line with the market"}. A low P/E can mean value or trouble, so read it with the score.`
                : "Compare the sector's median P/E and dividend yield with the market figures shown above: below-market P/E with an above-market yield usually reads as cheap, the reverse as expensive.",
          },
          {
            q: `How are ${s.sector.toLowerCase()} companies scored?`,
            a: data.scoring_note.en,
          },
        ]}
      />

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
          <p className="mt-3 text-xs font-semibold text-text-muted">
            <Link href="/sectors" className="text-primary underline">
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
