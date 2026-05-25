import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STOCK_LISTS, getStockList, formatMetric, type StockListItem } from "@/lib/stock-lists";
import { getStockLists, getInsightScores, type ScoreItem } from "@/lib/api";
import InsightCard from "@/components/stock-insights/InsightCard";
import {
  filterInsightItems,
  generateStockInsight,
  getSectorInsights,
  getCurrentMonthYear,
  getCurrentMonthKeywords,
  type SectorSummary,
} from "@/lib/insight-utils";
import { getTier, TIER_LABELS, TIER_COLORS } from "@/lib/constants";

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
      type: "website",
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
        { "@type": "ListItem", position: 2, name: "Stock Insights", item: `${BASE_URL}/stock-insights` },
        { "@type": "ListItem", position: 3, name: displayName, item: `${BASE_URL}/stock-insights/${slug}` },
      ],
    },
  ];
}

// ── Sector page renderer ──────────────────────────────────────────────────────

function SectorCard({ rank, summary }: { rank: number; summary: SectorSummary }) {
  const tier = getTier(summary.avgScore);
  const tierColor = TIER_COLORS[tier];
  const tierLabel = TIER_LABELS[tier];
  const topTier = getTier(summary.topStock.score);
  const topColor = TIER_COLORS[topTier];

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-start gap-3">
        <span className="text-sm font-mono text-[var(--ink-muted)] w-6 shrink-0 pt-0.5">#{rank}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-[var(--ink)]">{summary.sector}</span>
            <span
              className="text-xs font-bold rounded-full px-2.5 py-0.5"
              style={{ color: tierColor, border: `1px solid ${tierColor}55`, background: `${tierColor}18` }}
            >
              {tierLabel} avg
            </span>
          </div>
          <p className="text-sm text-[var(--ink-muted)] mt-1">
            {summary.stockCount} stocks · {summary.strongBuyCount} Strong Buy
            {summary.avgEpsYoy != null && (
              <> · EPS {summary.avgEpsYoy >= 0 ? "▲" : "▼"} {Math.abs(summary.avgEpsYoy).toFixed(1)}% avg</>
            )}
          </p>
        </div>
        <span className="text-xl font-bold shrink-0" style={{ color: tierColor }}>
          {summary.avgScore.toFixed(1)}
        </span>
      </div>

      <p className="text-sm text-[var(--ink)] leading-relaxed border-l-2 border-[var(--primary)] pl-3">
        {summary.insight}
      </p>

      <div className="pt-2 border-t border-[var(--border)] space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--ink-muted)]">
          <span>Top stock:</span>
          <Link
            href={`/stock/${summary.topStock.trading_code}`}
            className="font-bold hover:opacity-80 transition-opacity"
            style={{ color: topColor }}
          >
            {summary.topStock.trading_code}
          </Link>
          {summary.topStock.ltp != null && <span className="text-[var(--ink)]">৳{summary.topStock.ltp.toFixed(1)}</span>}
          {summary.topStock.score != null && (
            <span className="font-semibold" style={{ color: topColor }}>Score {summary.topStock.score.toFixed(1)}</span>
          )}
        </div>
        <Link
          href={`/stock/${summary.topStock.trading_code}`}
          className="inline-block text-sm font-semibold text-[var(--primary)] hover:underline"
        >
          View full analysis →
        </Link>
      </div>
    </div>
  );
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

  // ── Insight mode ──────────────────────────────────────────────────────────
  if (def.insightMode) {
    const allItems = await getInsightScores().catch(() => [] as ScoreItem[]);

    // Sector page
    if (def.isSectorPage) {
      const sectors = getSectorInsights(allItems);
      const jsonLd = buildJsonLd(
        slug,
        displayTitle,
        def.description,
        sectors.map((s) => ({ trading_code: s.topStock.trading_code, company_name: s.topStock.company_name }))
      );

      return (
        <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <Breadcrumb shortName={def.shortName} slug={slug} />
          <HeroSection icon={def.icon} label={`${sectors.length} Sectors · ${def.metricLabel}`} title={displayTitle} />

          <section className="space-y-4">
            {sectors.length === 0 ? (
              <p className="text-sm text-[var(--ink-muted)] text-center py-8">Data unavailable — check back shortly.</p>
            ) : (
              sectors.map((summary, i) => (
                <SectorCard key={summary.sector} rank={i + 1} summary={summary} />
              ))
            )}
          </section>

          <DescriptionSection def={def} />
          <FaqSection faqs={def.faqs} />
          <NavButtons />
        </main>
      );
    }

    // Stock insight page
    const items = filterInsightItems(allItems, slug);
    const jsonLd = buildJsonLd(slug, displayTitle, def.description, items);

    return (
      <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Breadcrumb shortName={def.shortName} slug={slug} />
        <HeroSection
          icon={def.icon}
          label={`Top ${items.length} · ${def.metricLabel}`}
          title={displayTitle}
        />

        <section className="space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-[var(--ink-muted)] text-center py-8">Data unavailable — check back shortly.</p>
          ) : (
            items.map((item, i) => (
              <InsightCard
                key={item.trading_code}
                rank={i + 1}
                item={item}
                insight={generateStockInsight(item)}
              />
            ))
          )}
        </section>

        <DescriptionSection def={def} />
        <FaqSection faqs={def.faqs} />
        <NavButtons />
      </main>
    );
  }

  // ── Classic mode (existing table) ─────────────────────────────────────────
  const lists = await getStockLists().catch(() => null);
  const classicItems: StockListItem[] = lists && def.apiKey ? (lists[def.apiKey] ?? []) : [];

  const jsonLd = buildJsonLd(slug, def.displayName, def.description, classicItems);

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb shortName={def.shortName} slug={slug} />

      <section className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl sm:text-3xl" aria-hidden="true">{def.icon}</span>
          <span className="text-[0.65rem] sm:text-xs text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-2.5 py-0.5 uppercase tracking-wider">
            Top 20 · {def.metricLabel}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--ink)] leading-snug">{def.displayName}</h1>
      </section>

      <section className="sl-wrap">
        {classicItems.length === 0 ? (
          <p className="text-sm text-[var(--ink-muted)] text-center py-8">Data unavailable — check back shortly.</p>
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
                {classicItems.map((item, i) => (
                  <tr key={item.trading_code} className="sl-row">
                    <td className="sl-td sl-td-rank">{i + 1}</td>
                    <td className="sl-td sl-td-code">
                      <Link href={`/stock/${item.trading_code}`} className="sl-code-link" style={{ color: "#60A5FA" }}>
                        {item.trading_code}
                      </Link>
                      <span className="sl-code-sub">{item.company_name ?? ""}</span>
                    </td>
                    <td className="sl-td sl-td-num">{item.ltp != null ? item.ltp.toFixed(2) : "—"}</td>
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

      <DescriptionSection def={def} />
      <FaqSection faqs={def.faqs} />
      <NavButtons />
    </main>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function Breadcrumb({ shortName, slug }: { shortName: string; slug: string }) {
  return (
    <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-[var(--ink-muted)]">
      <Link href="/" className="hover:text-[var(--primary)] transition-colors shrink-0">Home</Link>
      <span aria-hidden="true" className="shrink-0">/</span>
      <Link href="/stock-insights" className="hover:text-[var(--primary)] transition-colors shrink-0">Stock Insights</Link>
      <span aria-hidden="true" className="shrink-0">/</span>
      <span className="text-[var(--ink)] font-medium truncate max-w-[200px] sm:max-w-none">{shortName}</span>
    </nav>
  );
}

function HeroSection({ icon, label, title }: { icon: string; label: string; title: string }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-3xl sm:text-4xl" aria-hidden="true">{icon}</span>
        <span className="text-xs sm:text-sm text-[var(--ink-muted)] border border-[var(--border)] rounded-full px-3 py-1 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-[var(--ink)] leading-snug">{title}</h1>
    </section>
  );
}

function DescriptionSection({ def }: { def: ReturnType<typeof getStockList> & object }) {
  if (!def) return null;
  return (
    <>
      <hr className="border-[var(--border)]" />
      <section className="space-y-5">
        <p className="text-[var(--ink)] leading-relaxed text-base">{def.description}</p>
        <p className="text-base text-[var(--ink-muted)] leading-relaxed border-l-2 border-[var(--primary)] pl-4">
          {def.intro}
        </p>
      </section>
    </>
  );
}

function FaqSection({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <>
      <hr className="border-[var(--border)]" />
      <section className="space-y-5">
        <h2 className="text-xl font-bold text-[var(--ink)]">Frequently Asked Questions</h2>
        <dl className="space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q}>
              <dt className="font-bold text-[var(--ink)] text-base">{faq.q}</dt>
              <dd className="mt-2 text-base text-[var(--ink-muted)] leading-relaxed">{faq.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

function NavButtons() {
  return (
    <>
      <hr className="border-[var(--border)]" />
      <div className="flex flex-wrap gap-3">
        <Link
          href="/stock-insights"
          className="px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--surface)] transition-colors"
        >
          ← All Stock Insights
        </Link>
        <Link
          href="/dsestockranking"
          className="px-5 py-2.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          View Full Rankings
        </Link>
      </div>
    </>
  );
}
