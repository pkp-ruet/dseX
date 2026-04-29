import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STOCK_LISTS, getStockList, formatMetric, type StockListItem } from "@/lib/stock-lists";
import { getStockLists } from "@/lib/api";

export const revalidate = 3600;
export const dynamicParams = false;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.topstockbd.com";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return STOCK_LISTS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const def = getStockList(slug);
  if (!def) return {};
  return {
    title: `${def.displayName} | TopStockBD`,
    description: def.description,
    keywords: def.keywords,
    alternates: { canonical: `${BASE_URL}/stock-lists/${slug}` },
    openGraph: {
      title: `${def.displayName} | TopStockBD`,
      description: def.description,
      url: `${BASE_URL}/stock-lists/${slug}`,
      type: "website",
    },
  };
}

function buildJsonLd(slug: string, displayName: string, description: string, items: StockListItem[]) {
  return [
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: displayName,
      description,
      url: `${BASE_URL}/stock-lists/${slug}`,
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
        { "@type": "ListItem", position: 2, name: "Stock Lists", item: `${BASE_URL}/stock-lists` },
        { "@type": "ListItem", position: 3, name: displayName, item: `${BASE_URL}/stock-lists/${slug}` },
      ],
    },
  ];
}

export default async function StockListPage({ params }: Props) {
  const { slug } = await params;
  const def = getStockList(slug);
  if (!def) notFound();

  const lists = await getStockLists().catch(() => null);
  const items: StockListItem[] = lists ? (lists[def.apiKey] ?? []) : [];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(buildJsonLd(slug, def.displayName, def.description, items)),
        }}
      />

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-[var(--ink-muted)]">
        <Link href="/" className="hover:text-[var(--primary)] transition-colors">Home</Link>
        <span aria-hidden="true">/</span>
        <Link href="/stock-lists" className="hover:text-[var(--primary)] transition-colors">Stock Lists</Link>
        <span aria-hidden="true">/</span>
        <span className="text-[var(--ink)]">{def.shortName}</span>
      </nav>

      {/* Hero — compact title only */}
      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl" aria-hidden="true">{def.icon}</span>
          <span className="text-[0.65rem] sm:text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5 uppercase tracking-wider">
            Top 20 · {def.metricLabel}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug">
          {def.displayName}
        </h1>
      </section>

      {/* Table — minimal classic */}
      <section className="sl-wrap">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] text-center py-8">
            Data unavailable — check back shortly.
          </p>
        ) : (
          <div className="sl-table-wrap">
            <table className="sl-table">
              <thead className="sl-thead">
                <tr>
                  <th className="sl-th sl-th-rank">#</th>
                  <th className="sl-th">Code</th>
                  <th className="sl-th sl-th-num">LTP</th>
                  <th className="sl-th sl-th-num">{def.metricLabel}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.trading_code} className="sl-row">
                    <td className="sl-td sl-td-rank">{i + 1}</td>
                    <td className="sl-td sl-td-code">
                      <Link
                        href={`/stock/${item.trading_code}`}
                        className="sl-code-link"
                        style={{ color: "#60A5FA" }}
                      >
                        {item.trading_code}
                      </Link>
                      <span className="sl-code-sub">{item.company_name ?? ""}</span>
                    </td>
                    <td className="sl-td sl-td-num">
                      {item.ltp != null ? item.ltp.toFixed(2) : "—"}
                    </td>
                    <td className="sl-td sl-td-num" style={{ color: "#60A5FA", fontWeight: 600 }}>
                      {formatMetric(item.metric_value, def.metricFormat)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <hr className="border-[var(--border)]" />

      {/* Description + intro paragraphs (moved to bottom) */}
      <section className="space-y-5">
        <p className="text-[var(--ink-muted)] leading-relaxed text-sm">
          {def.description}
        </p>
        <p className="text-sm text-[var(--ink-muted)] leading-relaxed border-l-2 border-[var(--primary)] pl-4">
          {def.intro}
        </p>
      </section>

      <hr className="border-[var(--border)]" />

      {/* FAQs */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-[var(--ink)]">Frequently Asked Questions</h2>
        <dl className="space-y-5">
          {def.faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-medium text-[var(--ink)] text-sm">{faq.q}</dt>
              <dd className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <hr className="border-[var(--border)]" />

      {/* Navigation */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/stock-lists"
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
        >
          ← All Stock Lists
        </Link>
        <Link
          href="/dsestockranking"
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Full Rankings
        </Link>
      </div>

    </main>
  );
}
