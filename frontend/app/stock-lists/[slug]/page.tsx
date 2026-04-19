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

      {/* Hero */}
      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl" aria-hidden="true">{def.icon}</span>
          <span className="text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5">
            Top 20 · {def.metricLabel}
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--ink)] leading-snug">
          {def.displayName}
        </h1>
        <p className="text-[var(--ink-muted)] leading-relaxed text-sm">
          {def.description}
        </p>
      </section>

      {/* Intro paragraph */}
      <p className="text-sm text-[var(--ink-muted)] leading-relaxed border-l-2 border-[var(--primary)] pl-4">
        {def.intro}
      </p>

      <hr className="border-[var(--border)]" />

      {/* Table */}
      <section>
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] text-center py-8">
            Data unavailable — check back shortly.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--surface)] border-b border-[var(--border)]">
                  <th className="text-left px-3 py-3 text-[var(--ink-muted)] font-medium w-10">#</th>
                  <th className="text-left px-3 py-3 text-[var(--ink-muted)] font-medium">Code</th>
                  <th className="text-left px-3 py-3 text-[var(--ink-muted)] font-medium">Company</th>
                  <th className="text-right px-3 py-3 text-[var(--ink-muted)] font-medium">LTP (৳)</th>
                  <th className="text-right px-3 py-3 text-[var(--ink-muted)] font-medium font-semibold">
                    {def.metricLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.trading_code}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface)] transition-colors"
                  >
                    <td className="px-3 py-3 text-[var(--ink-muted)] tabular-nums">{i + 1}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/stock/${item.trading_code}`}
                        className="font-mono font-semibold text-[var(--primary)] hover:underline"
                      >
                        {item.trading_code}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-[var(--ink)] max-w-[200px]">
                      <span className="truncate block" title={item.company_name ?? ""}>
                        {item.company_name ?? "—"}
                      </span>
                      {item.sector && (
                        <span className="text-xs text-[var(--ink-muted)]">{item.sector}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--ink)] tabular-nums">
                      {item.ltp != null ? item.ltp.toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-[var(--primary)] tabular-nums">
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
