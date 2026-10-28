import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import { notFound } from "next/navigation";
import {
  STOCK_LISTS,
  classicLede,
  classicLine,
  formatMetric,
  getStockList,
  type StockListItem,
} from "@/lib/stock-lists";
import { getStockLists, getResearchList, type ResearchListDetail } from "@/lib/api";
import { RESEARCH_LISTS, getResearchListDef, DEEPER, type ResearchListDef } from "@/lib/research-lists";
import ResearchListView from "@/components/research/ResearchListView";
import { StorySpotlight, StoryRundown, type StoryEntryView } from "@/components/stock-insights/StoryEntries";
import { T } from "@/components/i18n/T";
import { formatDate } from "@/lib/formatters";
import { bnDate } from "@/lib/bn";

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
  // No catch: a throw lets ISR keep serving the last good page.
  const data = await getResearchList(def.slug);
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

  // No catch: a failed fetch rendered "the latest figures are not in yet" and
  // ISR cached it as the page; a throw keeps the last good page instead.
  const lists = await getStockLists();
  const items: StockListItem[] = lists[def.apiKey] ?? [];
  const entries: StoryEntryView[] = items.map((item, i) => {
    const line = classicLine(item, def);
    return {
      rank: i + 1,
      title: item.company_name?.trim() || item.trading_code,
      code: item.trading_code,
      href: `/stock/${item.trading_code}`,
      sector: item.sector,
      body: <T en={line.en} bn={line.bn} />,
      stat:
        item.metric_value != null
          ? {
              label: <T en={def.metricLabel} bn={def.metricLabelBn} />,
              value: (
                <T
                  en={formatMetric(item.metric_value, def.metricFormat)}
                  bn={formatMetric(item.metric_value, def.metricFormat, "bn")}
                />
              ),
            }
          : undefined,
    };
  });
  const lede = classicLede(def, items);
  const today = new Date().toISOString().slice(0, 10);

  const spotlight = entries.slice(0, 3);
  const rundown = entries.slice(3);

  const jsonLd = buildJsonLd(
    slug,
    def.displayName,
    def.description,
    items.map((item) => ({ trading_code: item.trading_code, company_name: item.company_name })),
  );

  return (
    <div className="page-narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <Crumbs here={<T en={def.shortName} bn={def.shortNameBn} />} />

      <PageHeader
        size="article"
        eyebrow={<T en="Free stock list" bn="ফ্রি শেয়ারের তালিকা" />}
        title={<T en={def.heading} bn={def.headingBn} />}
        lead={<T en={lede.en} bn={lede.bn} />}
      />
      <header>
        <div className="ed-byline">
          <span className="live">
            <T en="Live" bn="লাইভ" />
          </span>
          <span className="b-item">
            <T en={`Updated ${formatDate(today)}`} bn={`হালনাগাদ ${bnDate(today)}`} />
          </span>
          <span className="b-dot" aria-hidden="true" />
          <span className="b-item">
            <T en={`${entries.length} companies`} bn={`${entries.length}টি কোম্পানি`} />
          </span>
          <span className="b-dot" aria-hidden="true" />
          <span className="b-item">
            <T en="From official Dhaka Stock Exchange data" bn="ঢাকা স্টক এক্সচেঞ্জের অফিসিয়াল তথ্য থেকে" />
          </span>
        </div>
      </header>

      {/* Story body */}
      {entries.length === 0 ? (
        <p className="ed-empty">
          <T
            en="The latest figures are not in yet. Please check again in a moment."
            bn="সর্বশেষ তথ্য এখনো আসেনি। একটু পরে আবার দেখুন।"
          />
        </p>
      ) : (
        <>
          <div className="ed-section-label">
            <T en="The top three" bn="শীর্ষ তিনটি" />
          </div>
          <StorySpotlight entries={spotlight} />

          {rundown.length > 0 && (
            <>
              <div className="ed-section-label">
                <T en="The rest of the list" bn="তালিকার বাকিগুলো" />
              </div>
              <StoryRundown entries={rundown} />
            </>
          )}
        </>
      )}

      {/* Closing explainer */}
      <section className="ed-closer">
        <h2>
          <T en="How to read this list" bn="এই তালিকা কীভাবে পড়বেন" />
        </h2>
        <p className="first">
          <T en={def.intro} bn={def.introBn} />
        </p>
      </section>

      {/* FAQ */}
      <section className="ed-faq">
        <h2>
          <T en="Common questions" bn="সাধারণ প্রশ্ন" />
        </h2>
        <dl>
          {def.faqs.map((faq) => (
            <div key={faq.q} className="ed-faq-item">
              <dt>
                <T en={faq.q} bn={faq.qBn} />
              </dt>
              <dd>
                <T en={faq.a} bn={faq.aBn} />
              </dd>
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
        <span className="rl-deeper-eyebrow">
          <T en="Go deeper · Premium research list" bn="আরও গভীরে · প্রিমিয়াম গবেষণা তালিকা" />
        </span>
        <span className="rl-deeper-title">
          <T en={target.shortName} bn={target.shortNameBn} />
        </span>
        <span className="rl-deeper-desc">
          <T en={target.hook} bn={target.hookBn} />
        </span>
      </Link>
    );
  }
  return (
    <Link href="/stock-insights#research" className="soft-card rl-deeper">
      <span className="rl-deeper-eyebrow">
        <T en="Go deeper · Premium" bn="আরও গভীরে · প্রিমিয়াম" />
      </span>
      <span className="rl-deeper-title">
        <T en="Six research lists" bn="ছয়টি গবেষণা তালিকা" />
      </span>
      <span className="rl-deeper-desc">
        <T
          en="Each one tests every rated company against plain checks, and explains every share that passes with its own numbers and the one thing that could go wrong."
          bn="প্রতিটি তালিকা রেটিং পাওয়া সব কোম্পানিকে সহজ কিছু যাচাইয়ের মধ্য দিয়ে নেয়, আর যে শেয়ার পাস করে, তার নিজের সংখ্যা আর ঝুঁকির কথা খুলে বলে।"
        />
      </span>
    </Link>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Crumbs({ here }: { here: ReactNode }) {
  return (
    <nav aria-label="breadcrumb" className="ed-crumbs">
      <Link href="/">
        <T en="Home" bn="হোম" />
      </Link>
      <span className="sep" aria-hidden="true">/</span>
      <Link href="/stock-insights">
        <T en="Stock lists" bn="শেয়ারের তালিকা" />
      </Link>
      <span className="sep" aria-hidden="true">/</span>
      <span className="here">{here}</span>
    </nav>
  );
}

function NavButtons() {
  return (
    <div className="ed-nav">
      <Link href="/stock-insights" className="btn-quiet">
        <T en="← All stock lists" bn="← সব তালিকা" />
      </Link>
      <Link href="/dsestockranking" className="btn-primary">
        <T en="See the full rankings" bn="পুরো র‍্যাঙ্কিং দেখুন" />
      </Link>
    </div>
  );
}
