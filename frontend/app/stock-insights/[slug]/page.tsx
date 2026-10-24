import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import { STOCK_LISTS, getStockList, type StockListItem } from "@/lib/stock-lists";
import { getStockLists, getResearchList, type ResearchListDetail } from "@/lib/api";
import { RESEARCH_LISTS, getResearchListDef, DEEPER, type ResearchListDef } from "@/lib/research-lists";
import ResearchListView from "@/components/research/ResearchListView";
import ErrorState from "@/components/ui/ErrorState";
import { StorySpotlight, StoryRundown } from "@/components/stock-insights/StoryEntries";
import { buildClassicEntries, generateClassicLede, getUpdatedLabel } from "@/lib/insight-utils";

export const revalidate = 86400;
export const dynamicParams = false;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return [...STOCK_LISTS, ...RESEARCH_LISTS].map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const research = getResearchListDef(slug);
  if (research) {
    return {
      title: research.seoTitle,
      description: research.description,
      keywords: research.keywords,
      alternates: { canonical: `${BASE_URL}/stock-insights/${slug}` },
      openGraph: {
        title: `${research.seoTitle} | TopStockBD`,
        description: research.description,
        url: `${BASE_URL}/stock-insights/${slug}`,
        type: "website",
      },
    };
  }
  const def = getStockList(slug);
  if (!def) return {};

  return {
    title: def.displayName,
    description: def.description,
    keywords: def.keywords,
    alternates: { canonical: `${BASE_URL}/stock-insights/${slug}` },
    openGraph: {
      title: `${def.displayName} | TopStockBD`,
      description: def.description,
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

function buildResearchJsonLd(def: ResearchListDef, data: ResearchListDetail) {
  const url = `${BASE_URL}/stock-insights/${def.slug}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: def.seoTitle,
      description: def.description,
      url,
      // Paywall markup: every stock on a research list is Premium (PremiumGate).
      isAccessibleForFree: false,
      hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".premium-locked" },
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: def.seoTitle,
      url,
      numberOfItems: data.stocks.length,
      itemListElement: data.stocks.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${s.code}${s.name ? ` — ${s.name}` : ""}`,
        url: `${BASE_URL}/stock/${s.code}`,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: def.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Stock Lists", item: `${BASE_URL}/stock-insights` },
        { "@type": "ListItem", position: 3, name: def.shortName, item: url },
      ],
    },
  ];
}

async function ResearchPage({ def }: { def: ResearchListDef }) {
  const data = await getResearchList(def.slug).catch(() => null);
  if (!data) {
    return <ErrorState reload />;
  }
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(buildResearchJsonLd(def, data)) }} />
      <ResearchListView data={data} def={def} />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default async function StockInsightPage({ params }: Props) {
  const { slug } = await params;
  const research = getResearchListDef(slug);
  if (research) return <ResearchPage def={research} />;
  const def = getStockList(slug);
  if (!def) notFound();

  const displayTitle = def.displayName;
  const lists = await getStockLists().catch(() => null);
  const items: StockListItem[] = lists?.[def.apiKey] ?? [];
  const entries = buildClassicEntries(items, def);
  const lede = generateClassicLede(def, items);

  const spotlight = entries.slice(0, 3);
  const rundown = entries.slice(3);

  const jsonLd = buildJsonLd(
    slug,
    displayTitle,
    def.description,
    entries.map((e) => ({ trading_code: e.code ?? e.title, company_name: e.title }))
  );

  return (
    <div className="page-narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Crumbs here={def.shortName} />

      <PageHeader
        size="article"
        eyebrow="Free stock list"
        title={displayTitle}
        bn="এই তালিকার প্রতিটি শেয়ার আসল হিসাব দেখে বাছা — সহজ ভাষায় কেন, তাও লেখা আছে।"
        lead={lede}
      />
      <header>
        <div className="ed-byline">
          <span className="live">Live</span>
          <span className="b-item">Updated {getUpdatedLabel()}</span>
          <span className="b-dot" aria-hidden="true" />
          <span className="b-item">
            {entries.length} companies
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
          <div className="ed-section-label">The standouts</div>
          <StorySpotlight entries={spotlight} />

          {rundown.length > 0 && (
            <>
              <div className="ed-section-label">Also making the cut</div>
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

      <DeeperLink slug={slug} />

      <NavButtons />
    </div>
  );
}

/** The way from a free list to the Premium research: the matching list when
 * there is one, else the research lists on the hub. */
function DeeperLink({ slug }: { slug: string }) {
  const target = DEEPER[slug] ? getResearchListDef(DEEPER[slug]) : undefined;
  if (target) {
    return (
      <Link href={`/stock-insights/${target.slug}`} className="soft-card rl-deeper">
        <span className="rl-deeper-eyebrow">Go deeper · Premium research list</span>
        <span className="rl-deeper-title">{target.shortName}</span>
        <span className="rl-deeper-desc">{target.description}</span>
      </Link>
    );
  }
  return (
    <Link href="/stock-insights#research" className="soft-card rl-deeper">
      <span className="rl-deeper-eyebrow">Go deeper · Premium</span>
      <span className="rl-deeper-title">Six research lists</span>
      <span className="rl-deeper-desc">
        Each one tests every rated company against plain checks and explains every stock that passes — with its own
        numbers and the one thing that could go wrong.
      </span>
    </Link>
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
      <Link href="/stock-insights" className="btn-quiet">
        ← All stock lists
      </Link>
      <Link href="/dsestockranking" className="btn-primary">
        See full rankings
      </Link>
    </div>
  );
}
