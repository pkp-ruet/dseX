import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STOCK_LISTS, getStockList, type StockListItem } from "@/lib/stock-lists";
import { getStockLists, getInsightScores, type ScoreItem } from "@/lib/api";
import { StorySpotlight, StoryRundown } from "@/components/stock-insights/StoryEntries";
import {
  filterInsightItems,
  buildInsightEntries,
  buildClassicEntries,
  buildSectorEntries,
  generateLede,
  generateClassicLede,
  generateSectorLede,
  getSectorInsights,
  getCurrentMonthYear,
  getCurrentMonthKeywords,
  getUpdatedLabel,
  type StoryEntry,
} from "@/lib/insight-utils";

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

const MONTHLY_SLUGS = new Set(["best-stocks-this-month", "best-sector-this-month"]);

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return STOCK_LISTS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const def = getStockList(slug);
  if (!def) return {};

  const isMonthly = MONTHLY_SLUGS.has(slug);
  const monthYear = isMonthly ? ` — ${getCurrentMonthYear()}` : "";
  const title = `${def.displayName}${monthYear}`;
  const description = isMonthly
    ? def.description.replace("This Month", getCurrentMonthYear())
    : def.description;

  const extraKeywords = isMonthly ? getCurrentMonthKeywords() : [];

  return {
    title: `${title} | TopStockBD`,
    description,
    keywords: [...def.keywords, ...extraKeywords],
    alternates: { canonical: `${BASE_URL}/stock-insights/${slug}` },
    openGraph: {
      title: `${title} | TopStockBD`,
      description,
      url: `${BASE_URL}/stock-insights/${slug}`,
      type: "article",
    },
  };
}

function buildJsonLd(
  slug: string,
  displayName: string,
  description: string,
  items: { trading_code: string; company_name?: string | null }[]
) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: displayName,
      description,
      url: `${BASE_URL}/stock-insights/${slug}`,
      numberOfItems: items.length,
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${item.trading_code}${item.company_name ? ` — ${item.company_name}` : ""}`,
        url: `${BASE_URL}/stock/${item.trading_code}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Stock Lists", item: `${BASE_URL}/stock-insights` },
        { "@type": "ListItem", position: 3, name: displayName, item: `${BASE_URL}/stock-insights/${slug}` },
      ],
    },
  ];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function StockInsightPage({ params }: Props) {
  const { slug } = await params;
  const def = getStockList(slug);
  if (!def) notFound();

  const isMonthly = MONTHLY_SLUGS.has(slug);
  const monthYear = isMonthly ? getCurrentMonthYear() : null;
  const displayTitle = monthYear
    ? def.displayName.replace("This Month", monthYear)
    : def.displayName;

  let entries: StoryEntry[] = [];
  let lede = "";
  let kicker = "DSE Stock Lists";
  let unit = "companies";

  if (def.insightMode) {
    const allItems = await getInsightScores().catch(() => [] as ScoreItem[]);
    if (def.isSectorPage) {
      const sectors = getSectorInsights(allItems);
      entries = buildSectorEntries(sectors);
      lede = generateSectorLede(sectors);
      kicker = "Sector Watch";
      unit = "sectors";
    } else {
      const items = filterInsightItems(allItems, slug);
      entries = buildInsightEntries(items);
      lede = generateLede(slug, items);
      kicker = "The Shortlist";
    }
  } else {
    const lists = await getStockLists().catch(() => null);
    const classicItems: StockListItem[] = lists && def.apiKey ? (lists[def.apiKey] ?? []) : [];
    entries = buildClassicEntries(classicItems, def);
    lede = generateClassicLede(def, classicItems);
    kicker = "The Rankings";
  }

  const spotlight = entries.slice(0, 3);
  const rundown = entries.slice(3);

  const jsonLd = buildJsonLd(
    slug,
    displayTitle,
    def.description,
    entries.map((e) => ({ trading_code: e.code ?? e.title, company_name: e.title }))
  );

  return (
    <main className="ed-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Crumbs here={def.shortName} />

      {/* Masthead */}
      <header>
        <div className="ed-kicker">
          <span className="dot" aria-hidden="true" />
          {kicker}
        </div>
        <h1 className="ed-headline">{displayTitle}</h1>
        <p className="ed-dek">{lede}</p>
        <div className="ed-byline">
          <span className="live">Live</span>
          <span className="b-item">Updated {getUpdatedLabel()}</span>
          <span className="b-dot" aria-hidden="true" />
          <span className="b-item">
            {entries.length} {unit}
          </span>
          <span className="b-dot" aria-hidden="true" />
          <span className="b-item">From official Dhaka Stock Exchange filings</span>
        </div>
      </header>

      {/* Story body */}
      {entries.length === 0 ? (
        <p className="ed-empty">Fresh data is loading — check back in a moment.</p>
      ) : (
        <>
          <div className="ed-section-label">{def.isSectorPage ? "Leading sectors" : "The standouts"}</div>
          <StorySpotlight entries={spotlight} />

          {rundown.length > 0 && (
            <>
              <div className="ed-section-label">{def.isSectorPage ? "The rest of the field" : "Also making the cut"}</div>
              <StoryRundown entries={rundown} />
            </>
          )}
        </>
      )}

      {/* Closing explainer */}
      <section className="ed-closer">
        <h2>How to read this list</h2>
        <p className="first">{def.intro}</p>
      </section>

      {/* FAQ */}
      <section className="ed-faq">
        <h2>Common questions</h2>
        <dl>
          {def.faqs.map((faq) => (
            <div key={faq.q} className="ed-faq-item">
              <dt>{faq.q}</dt>
              <dd>{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <NavButtons />
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Crumbs({ here }: { here: string }) {
  return (
    <nav aria-label="breadcrumb" className="ed-crumbs">
      <Link href="/">Home</Link>
      <span className="sep" aria-hidden="true">/</span>
      <Link href="/stock-insights">Stock Lists</Link>
      <span className="sep" aria-hidden="true">/</span>
      <span className="here">{here}</span>
    </nav>
  );
}

function NavButtons() {
  return (
    <div className="ed-nav">
      <Link href="/stock-insights" className="ed-btn ed-btn-ghost">
        ← All stock lists
      </Link>
      <Link href="/dsestockranking" className="ed-btn ed-btn-primary">
        See full rankings
      </Link>
    </div>
  );
}
